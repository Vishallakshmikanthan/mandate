import logging
from typing import Dict, Any
from sqlalchemy.orm import Session
from app.agents.buyer import BuyerAgent
from app.agents.seller import SellerAgent
from app.core.stream_broadcaster import emit_timeline_event
from app.core.policy_engine import evaluate_policy_rules, compute_deterministic_verdict
from app.core.risk_scorer import score_intent_risk, apply_tighten_only_rule
from app.core.arbiter import evaluate_deliverable_arbitration
from app.core.escrow_machine import transition_escrow_state
from app.core.audit import log_audit_event
from app.paypal.orders import (
    create_paypal_order,
    authorize_paypal_order,
    capture_paypal_authorization,
    void_paypal_authorization
)
from app.paypal.client import get_paypal_client
from app.models.mandate import Mandate
from app.models.intent import PaymentIntent
from app.models.escrow import Escrow
from app.models.deliverable import Deliverable
from app.models.arbiter import ArbiterVerdictRecord
from app.models.counterparty import Counterparty
from app.schemas.escrow import EscrowState
from app.config import settings
from app.core.cost_control import cost_controller

logger = logging.getLogger("mandate.orchestrator")


class AgentOrchestrator:
    """
    Orchestrates autonomous multi-turn negotiation, gateway evaluation,
    escrow funding, delivery, and AI arbitration between agents.
    """

    def __init__(self, db: Session, scenario_name: str = "custom"):
        self.db = db
        self.scenario_name = scenario_name

    async def run_scenario(self, mandate_id: str, mode: str = "honest") -> Dict[str, Any]:
        """
        Run end-to-end commerce scenario:
        - mode="honest": Scenario A (Happy Path)
        - mode="malicious": Scenario B (Prompt Injection Attack)
        - mode="lazy": Scenario C (Bad Delivery Dispute)
        """
        mandate = self.db.query(Mandate).filter(Mandate.id == mandate_id).first()
        if not mandate:
            raise ValueError(f"Mandate {mandate_id} not found.")

        buyer = BuyerAgent(agent_id=mandate.agent_id, mandate_id=mandate.id)
        seller = SellerAgent(agent_id="seller_agent_acme", mode=mode)
        session_key = f"orch_{self.scenario_name}_{mandate_id}"

        # ----------------------------------------------------------------------
        # Turn 1: Buyer Inquires
        # ----------------------------------------------------------------------
        cost_controller.increment_and_check_turns(session_key)
        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="AGENT_INQUIRY",
            actor="buyer_agent",
            step="1. Negotiation Inquiry",
            summary="Buyer agent reaches out to seller for logo design package.",
            status="INFO",
            data={"target_budget": "$120.00", "currency": "USD"}
        )

        inquiry = buyer.formulate_initial_offer("Logo Design Package (3 concepts + vectors)", 12000)

        # ----------------------------------------------------------------------
        # Turn 2: Seller Quotes / Injects
        # ----------------------------------------------------------------------
        cost_controller.increment_and_check_turns(session_key)
        quote = seller.respond_to_inquiry(inquiry)

        seller_status = "DANGER" if quote["is_injection"] else "INFO"
        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="AGENT_QUOTE",
            actor="seller_agent",
            step="2. Seller Response",
            summary=f"Seller responds: {quote['message'][:80]}...",
            status=seller_status,
            data={"price_minor": quote["price_minor"], "is_injection": quote["is_injection"]}
        )

        # ----------------------------------------------------------------------
        # Turn 3: Buyer submits Payment Intent to Mandate Gateway
        # ----------------------------------------------------------------------
        cost_controller.increment_and_check_turns(session_key)
        intent_amount = quote["price_minor"]
        intent_source = quote["message"]

        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="INTENT_SUBMITTED",
            actor="buyer_agent",
            step="3. Payment Intent",
            summary=f"Buyer forwards payment intent for ${intent_amount/100:.2f} to Mandate Gateway.",
            status="INFO",
            data={"counterparty": seller.agent_id, "amount_minor": intent_amount}
        )

        # ----------------------------------------------------------------------
        # Stage 4: Mandate Gateway Evaluation (Policy Engine + Risk Scorer)
        # ----------------------------------------------------------------------
        # Ensure counterparty exists and is verified
        counterparty_record = self.db.query(Counterparty).filter(
            (Counterparty.handle == seller.agent_id) | (Counterparty.id == seller.agent_id)
        ).first()
        if not counterparty_record:
            from datetime import datetime, timezone
            counterparty_record = Counterparty(
                handle=seller.agent_id,
                paypal_merchant_id="SANDBOX_MERCHANT_ACME",
                paypal_email="seller-acme@example.com",
                status="VERIFIED",
                verified_at=datetime.now(timezone.utc)
            )
            self.db.add(counterparty_record)
            self.db.commit()
            self.db.refresh(counterparty_record)

        # Evaluate deterministic policy engine
        rule_results = evaluate_policy_rules(
            policy=mandate.policy,
            mandate_signature=mandate.signature,
            mandate_status=mandate.status,
            signing_key=settings.MANDATE_SIGNING_KEY,
            amount_minor=intent_amount,
            currency="USD",
            counterparty=seller.agent_id,
            merchant_category="freelance_design",
            spent_to_date_minor=0,
            rolling_24h_spend_minor=0,
            txns_in_last_hour=0,
            counterparty_record=counterparty_record,
            mandate_public_key=getattr(mandate, "public_key", None),
            mandate_algorithm=getattr(mandate, "signature_algorithm", "ed25519"),
        )
        deterministic_verdict = compute_deterministic_verdict(rule_results)

        # Evaluate LLM Risk Scorer
        risk_output = await score_intent_risk(
            counterparty=seller.agent_id,
            merchant_category="freelance_design",
            amount_minor=intent_amount,
            currency="USD",
            description="Logo Design Package",
            source_context=intent_source
        )

        # Enforce tighten-only rule
        final_decision, decision_reason = apply_tighten_only_rule(
            deterministic_verdict=deterministic_verdict,
            risk_recommendation=risk_output.recommendation,
            risk_score=risk_output.risk_score
        )

        # Persist Intent in DB
        intent = PaymentIntent(
            mandate_id=mandate.id,
            counterparty=seller.agent_id,
            merchant_category="freelance_design",
            amount_minor=intent_amount,
            currency="USD",
            description="Logo Design Package",
            source_context=intent_source,
            decision=final_decision,
            decision_reasons=[r.model_dump() for r in rule_results],
            risk_score=risk_output.risk_score
        )
        self.db.add(intent)
        self.db.commit()
        self.db.refresh(intent)

        # Log intent evaluation to hash-chained audit trail
        log_audit_event(
            db=self.db,
            actor="gateway",
            event="INTENT_EVALUATED",
            payload={
                "intent_id": intent.id,
                "mandate_id": mandate.id,
                "amount_minor": intent_amount,
                "decision": final_decision,
                "risk_score": risk_output.risk_score,
                "flags": risk_output.flags,
                "reason": decision_reason
            }
        )

        # Broadcast Gateway Decision
        gw_status = "SUCCESS" if final_decision == "APPROVED" else ("DANGER" if final_decision == "BLOCKED" else "WARNING")
        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="GATEWAY_DECISION",
            actor="gateway",
            step="4. Mandate Firewall Decision",
            summary=f"Mandate Gateway verdict: {final_decision}. {decision_reason}",
            status=gw_status,
            data={
                "decision": final_decision,
                "risk_score": risk_output.risk_score,
                "flags": risk_output.flags,
                "rule_failures": [r.rule for r in rule_results if not r.passed]
            }
        )

        # ----------------------------------------------------------------------
        # If BLOCKED: Zero PayPal calls made. Finished.
        # ----------------------------------------------------------------------
        if final_decision == "BLOCKED":
            escrow = Escrow(
                intent_id=intent.id,
                state=EscrowState.BLOCKED.value,
                spec={"criteria": ["Includes 3 logo variants", "Includes scalable vector SVGs"]}
            )
            self.db.add(escrow)
            self.db.commit()

            log_audit_event(
                db=self.db,
                actor="gateway",
                event="ESCROW_BLOCKED",
                payload={
                    "escrow_id": escrow.id,
                    "intent_id": intent.id,
                    "reason": decision_reason
                }
            )

            cost_controller.reset_session(session_key)
            return {
                "scenario": self.scenario_name,
                "intent_id": intent.id,
                "decision": final_decision,
                "risk_score": risk_output.risk_score,
                "flags": risk_output.flags,
                "escrow_state": EscrowState.BLOCKED.value,
                "paypal_calls_made": False,
                "message": "Attack stopped cold by Mandate Gateway. Zero PayPal calls made. Zero funds lost."
            }

        # ----------------------------------------------------------------------
        # Stage 5: PayPal Orders v2 Escrow Authorization
        # ----------------------------------------------------------------------
        escrow = Escrow(
            intent_id=intent.id,
            state=EscrowState.ORDER_CREATED.value,
            spec={
                "criteria": [
                    "Includes 3 logo variants",
                    "Includes scalable vector SVGs",
                    "Includes PNG transparent exports"
                ]
            }
        )
        self.db.add(escrow)
        self.db.commit()

        # Create PayPal Order with seller payee routing and return URLs
        order_res = await create_paypal_order(
            intent_id=intent.id,
            amount_minor=intent_amount,
            currency="USD",
            description="Mandate Escrow: Logo Design",
            payee_email=counterparty_record.paypal_email if counterparty_record else None,
            payee_merchant_id=counterparty_record.paypal_merchant_id if counterparty_record else None,
            return_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}?approved=true",
            cancel_url=f"{settings.FRONTEND_ORIGIN}/app/escrows/{escrow.id}?cancelled=true",
            escrow_id=escrow.id,
            db=self.db
        )
        escrow.paypal_order_id = order_res["order_id"]
        self.db.commit()

        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="PAYPAL_ORDER_CREATED",
            actor="paypal",
            step="5. PayPal Order Created",
            summary=f"Created PayPal Order {order_res['order_id']} with intent: AUTHORIZE.",
            status="INFO",
            data=order_res
        )

        # Gated buyer approval: simulated approval ONLY runs when simulation mode is true
        client = get_paypal_client()
        if not client.simulation_mode:
            await emit_timeline_event(
                scenario=self.scenario_name,
                event_type="WAITING_BUYER_APPROVAL",
                actor="paypal",
                step="5b. Waiting for Buyer Approval",
                summary=f"Waiting for human buyer approval at PayPal: {order_res.get('approve_url')}",
                status="WARNING",
                data={
                    "order_id": order_res["order_id"],
                    "approve_url": order_res.get("approve_url"),
                    "escrow_id": escrow.id
                }
            )
            return {
                "scenario": self.scenario_name,
                "intent_id": intent.id,
                "escrow_id": escrow.id,
                "paypal_order_id": order_res["order_id"],
                "approve_url": order_res.get("approve_url"),
                "status": "WAITING_FOR_BUYER_APPROVAL",
                "message": f"Real PayPal Order created. Please complete approval at {order_res.get('approve_url')} then call /approval-return."
            }

        # In simulation mode, transition to BUYER_APPROVED then FUNDS_HELD
        await transition_escrow_state(
            db=self.db,
            escrow=escrow,
            new_state=EscrowState.BUYER_APPROVED.value,
            actor="buyer_agent",
            reason="Buyer sandbox session approved authorization hold.",
            scenario=self.scenario_name
        )

        auth_res = await authorize_paypal_order(
            order_id=escrow.paypal_order_id,
            intent_id=intent.id,
            amount_minor=intent_amount,
            escrow_id=escrow.id,
            db=self.db
        )
        escrow.paypal_authorization_id = auth_res["authorization_id"]
        if auth_res.get("hold_expires_at"):
            try:
                from datetime import datetime
                exp_str = auth_res["hold_expires_at"].replace("Z", "+00:00")
                escrow.hold_expires_at = datetime.fromisoformat(exp_str)
            except Exception:
                pass
        self.db.commit()

        await transition_escrow_state(
            db=self.db,
            escrow=escrow,
            new_state=EscrowState.FUNDS_HELD.value,
            actor="paypal",
            reason=f"Funds held in PayPal escrow (Auth ID: {auth_res['authorization_id']}).",
            metadata=auth_res,
            scenario=self.scenario_name
        )

        # ----------------------------------------------------------------------
        # Stage 6: Seller Delivers Asset
        # ----------------------------------------------------------------------
        delivery = seller.generate_deliverable()
        deliverable = Deliverable(
            escrow_id=escrow.id,
            content_ref=delivery["content_ref"],
            submission_notes=delivery["submission_notes"]
        )
        self.db.add(deliverable)
        self.db.commit()

        await transition_escrow_state(
            db=self.db,
            escrow=escrow,
            new_state=EscrowState.DELIVERED.value,
            actor="seller_agent",
            reason=f"Seller submitted deliverable assets: {delivery['submission_notes'][:60]}...",
            scenario=self.scenario_name
        )

        # ----------------------------------------------------------------------
        # Stage 7: AI Arbiter Inspection
        # ----------------------------------------------------------------------
        await transition_escrow_state(
            db=self.db,
            escrow=escrow,
            new_state=EscrowState.UNDER_ARBITRATION.value,
            actor="arbiter",
            reason="AI Arbiter inspecting deliverable against contract specifications.",
            scenario=self.scenario_name
        )

        verdict_output = await evaluate_deliverable_arbitration(
            spec=escrow.spec,
            content_ref=delivery["content_ref"],
            submission_notes=delivery["submission_notes"]
        )

        verdict_rec = ArbiterVerdictRecord(
            escrow_id=escrow.id,
            verdict=verdict_output.verdict,
            confidence=verdict_output.confidence,
            criteria_results=[c.model_dump() for c in verdict_output.criteria_results],
            explanation=verdict_output.explanation,
            partial_ratio=verdict_output.partial_ratio,
            model="arbiter-core-v1"
        )
        self.db.add(verdict_rec)
        self.db.commit()

        arbiter_status = "SUCCESS" if verdict_output.verdict == "PASS" else "WARNING"
        await emit_timeline_event(
            scenario=self.scenario_name,
            event_type="ARBITER_VERDICT",
            actor="arbiter",
            step="7. Arbiter Verdict",
            summary=f"Arbiter verdict: {verdict_output.verdict} (Confidence: {verdict_output.confidence:.2f}). {verdict_output.explanation}",
            status=arbiter_status,
            data=verdict_output.model_dump()
        )

        # ----------------------------------------------------------------------
        # Stage 8: Settlement (Capture or Void)
        # ----------------------------------------------------------------------
        if verdict_output.verdict == "PASS":
            cap_res = await capture_paypal_authorization(
                authorization_id=escrow.paypal_authorization_id,
                intent_id=intent.id,
                amount_minor=intent_amount,
                currency="USD",
                final_capture=True,
                escrow_id=escrow.id,
                db=self.db
            )
            escrow.paypal_capture_id = cap_res.get("capture_id")
            self.db.commit()

            await transition_escrow_state(
                db=self.db,
                escrow=escrow,
                new_state=EscrowState.RELEASED.value,
                actor="paypal",
                reason=f"Arbiter PASS. PayPal captured ${intent_amount/100:.2f} (Capture ID: {escrow.paypal_capture_id}).",
                metadata=cap_res,
                scenario=self.scenario_name
            )
        else:
            # Void/Refund on FAIL or DISPUTE
            void_res = await void_paypal_authorization(
                authorization_id=escrow.paypal_authorization_id,
                intent_id=intent.id,
                amount_minor=intent_amount,
                escrow_id=escrow.id,
                db=self.db
            )
            await transition_escrow_state(
                db=self.db,
                escrow=escrow,
                new_state=EscrowState.REFUNDED.value,
                actor="paypal",
                reason=f"Arbiter {verdict_output.verdict}. PayPal authorization voided. Funds restored to buyer.",
                metadata=void_res,
                scenario=self.scenario_name
            )

        cost_controller.reset_session(session_key)
        return {
            "scenario": self.scenario_name,
            "intent_id": intent.id,
            "escrow_id": escrow.id,
            "state": escrow.state,
            "paypal_order_id": escrow.paypal_order_id,
            "paypal_authorization_id": escrow.paypal_authorization_id,
            "paypal_capture_id": escrow.paypal_capture_id,
            "verdict": verdict_output.verdict,
            "explanation": verdict_output.explanation
        }
