"""
Mandate Model Context Protocol (MCP) Server.
Enables AI agent frameworks (Claude Desktop, Cursor, Antigravity, AutoGen, CrewAI, LangChain)
to safely spend money under cryptographic owner mandates.

SECURITY INVARIANT:
The MCP Server holds ONLY an agent-scoped API key. It NEVER holds or accepts PayPal credentials.
"""
import os
import sys
import json
import logging
from typing import Dict, Any, Optional

# Add parent SDK path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "sdk", "python")))
from mandate_sdk import (
    MandateClient,
    IntentBlockedError,
    MandateError
)

logging.basicConfig(level=logging.INFO, stream=sys.stderr, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("mandate.mcp")

MANDATE_BASE_URL = os.environ.get("MANDATE_BASE_URL", "http://localhost:8000")
MANDATE_API_KEY = os.environ.get("MANDATE_API_KEY", "mnd_agent_demo_key")

_client: Optional[MandateClient] = None


def get_client() -> MandateClient:
    global _client
    if _client is None:
        _client = MandateClient(api_key=MANDATE_API_KEY, base_url=MANDATE_BASE_URL)
    return _client


TOOLS = [
    {
        "name": "mandate_request_payment",
        "description": (
            "Request a payment against a Mandate policy. Evaluates deterministic rules (R1-R10) and AI risk scorer. "
            "Returns decision (APPROVED, BLOCKED, ESCALATED), escrow ID, and rule details."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {
                "mandate_id": {"type": "string", "description": "Governing mandate ID"},
                "counterparty": {"type": "string", "description": "Seller agent handle or merchant ID"},
                "amount_minor": {"type": "integer", "description": "Amount in integer minor units (e.g., 5000 = $50.00)"},
                "currency": {"type": "string", "description": "ISO currency code (default: USD)", "default": "USD"},
                "merchant_category": {"type": "string", "description": "Category (e.g., freelance_design, software_services)"},
                "description": {"type": "string", "description": "Commercial description of goods/services requested"},
                "source_context": {"type": "string", "description": "Optional conversation or quote context"}
            },
            "required": ["mandate_id", "counterparty", "amount_minor", "description"]
        }
    },
    {
        "name": "mandate_get_intent_status",
        "description": "Check the decision, escrow status, and rule evaluation details for an existing payment intent.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "intent_id": {"type": "string", "description": "Unique Payment Intent ID"}
            },
            "required": ["intent_id"]
        }
    },
    {
        "name": "mandate_get_balance",
        "description": "Query the real-time budget, spent to date, remaining limit, and velocity constraints for a mandate.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "mandate_id": {"type": "string", "description": "Governing mandate ID"}
            },
            "required": ["mandate_id"]
        }
    },
    {
        "name": "mandate_submit_deliverable",
        "description": "Seller agent submits work deliverable (content reference, asset URI, or hash) to trigger AI arbitration inspection.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "escrow_id": {"type": "string", "description": "Target Escrow Contract ID"},
                "content_ref": {"type": "string", "description": "File URI, SHA-256 hash, or text deliverable"},
                "submission_notes": {"type": "string", "description": "Optional notes from seller explaining submission"}
            },
            "required": ["escrow_id", "content_ref"]
        }
    }
]


def handle_tool_call(name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    client = get_client()

    try:
        if name == "mandate_request_payment":
            res = client.request_payment(
                mandate_id=arguments["mandate_id"],
                counterparty=arguments["counterparty"],
                amount_minor=int(arguments["amount_minor"]),
                currency=arguments.get("currency", "USD"),
                merchant_category=arguments.get("merchant_category", "general_commerce"),
                description=arguments["description"],
                source_context=arguments.get("source_context")
            )
            return {
                "intent_id": res.intent_id,
                "decision": res.decision,
                "amount_minor": res.amount_minor,
                "currency": res.currency,
                "escrow_id": res.escrow_id,
                "risk_score": res.risk_score,
                "is_approved": res.is_approved,
                "is_blocked": res.is_blocked,
                "blocking_reasons": res.blocking_reasons,
                "reasons": [{"rule": r.rule, "name": r.name, "passed": r.passed, "detail": r.detail} for r in res.reasons]
            }

        elif name == "mandate_get_intent_status":
            res = client.get_intent_status(intent_id=arguments["intent_id"])
            return {
                "intent_id": res.intent_id,
                "decision": res.decision,
                "amount_minor": res.amount_minor,
                "escrow_id": res.escrow_id,
                "reasons": [{"rule": r.rule, "passed": r.passed, "detail": r.detail} for r in res.reasons]
            }

        elif name == "mandate_get_balance":
            res = client.get_mandate_balance(mandate_id=arguments["mandate_id"])
            return {
                "mandate_id": res.mandate_id,
                "currency": res.currency,
                "max_total_minor": res.max_total_minor,
                "spent_to_date_minor": res.spent_to_date_minor,
                "remaining_budget_minor": res.remaining_budget_minor,
                "max_per_transaction_minor": res.max_per_transaction_minor,
                "daily_limit_minor": res.daily_limit_minor,
                "is_active": res.is_active
            }

        elif name == "mandate_submit_deliverable":
            res = client.submit_deliverable(
                escrow_id=arguments["escrow_id"],
                content_ref=arguments["content_ref"],
                submission_notes=arguments.get("submission_notes")
            )
            return {
                "deliverable_id": res.deliverable_id,
                "escrow_id": res.escrow_id,
                "sha256": res.sha256,
                "status": res.status
            }

        else:
            return {"error": f"Unknown tool: {name}"}

    except IntentBlockedError as ibe:
        return {
            "error": "INTENT_BLOCKED",
            "message": str(ibe),
            "reasons": ibe.reasons,
            "risk_score": ibe.risk_score
        }
    except MandateError as me:
        return {"error": me.__class__.__name__, "message": str(me)}
    except Exception as exc:
        return {"error": "INTERNAL_ERROR", "message": str(exc)}


def run_stdio_server():
    """Runs standard MCP stdio JSON-RPC server loop."""
    logger.info("Starting Mandate MCP Server (connected to %s)...", MANDATE_BASE_URL)

    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue

        try:
            req = json.loads(line)
        except Exception:
            continue

        req_id = req.get("id")
        method = req.get("method")
        params = req.get("params", {})

        if method == "initialize":
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {
                        "name": "mandate-mcp-server",
                        "version": "1.0.0"
                    }
                }
            }
        elif method == "tools/list":
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {"tools": TOOLS}
            }
        elif method == "tools/call":
            tool_name = params.get("name", "")
            tool_args = params.get("arguments", {})
            result_obj = handle_tool_call(tool_name, tool_args)
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "result": {
                    "content": [
                        {
                            "type": "text",
                            "text": json.dumps(result_obj, indent=2)
                        }
                    ]
                }
            }
        else:
            resp = {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not found."
                }
            }

        sys.stdout.write(json.dumps(resp) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    run_stdio_server()
