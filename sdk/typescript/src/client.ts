/**
 * Mandate TypeScript SDK - Client Implementation
 */
import {
  MandateClientOptions,
  RequestPaymentParams,
  PaymentIntentResult,
  MandateBalanceResult,
  SubmitDeliverableParams,
  DeliverableResult,
  RuleReason
} from "./types";
import {
  MandateError,
  IntentBlockedError,
  AuthenticationError,
  PermissionDeniedError,
  ResourceNotFoundError
} from "./errors";

export class MandateClient {
  private apiKey: string;
  private baseUrl: string;
  private timeoutMs: number;

  constructor(options: MandateClientOptions) {
    if (!options.apiKey) {
      throw new AuthenticationError("API key is required to initialize MandateClient.");
    }
    this.apiKey = options.apiKey.trim();
    this.baseUrl = (options.baseUrl || "http://localhost:8000").replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs || 30000;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "mandate-typescript-sdk/1.0.0",
          ...(options.headers || {})
        }
      });

      if (response.status === 401) {
        throw new AuthenticationError();
      } else if (response.status === 403) {
        const body = await response.text();
        throw new PermissionDeniedError(`Access forbidden: ${body}`);
      } else if (response.status === 404) {
        const body = await response.text();
        throw new ResourceNotFoundError(`Resource not found: ${body}`);
      } else if (!response.ok) {
        const body = await response.text();
        throw new MandateError(`Gateway error (${response.status}): ${body}`);
      }

      return (await response.json()) as T;
    } catch (err: any) {
      if (err instanceof MandateError) throw err;
      if (err.name === "AbortError") {
        throw new MandateError(`Request to Mandate Gateway timed out after ${this.timeoutMs}ms.`);
      }
      throw new MandateError(`Network failure communicating with Mandate: ${err.message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  private mapPaymentIntent(data: any): PaymentIntentResult {
    const reasons: RuleReason[] = (data.decision_reasons || []).map((r: any) => ({
      rule: r.rule || "",
      name: r.name || "",
      passed: Boolean(r.passed),
      detail: r.detail || ""
    }));

    const blockingReasons = reasons.filter((r) => !r.passed).map((r) => r.detail);

    return {
      intentId: data.id,
      mandateId: data.mandate_id,
      counterparty: data.counterparty,
      amountMinor: data.amount_minor,
      currency: data.currency,
      decision: data.decision,
      riskScore: data.risk_score || 0.0,
      reasons,
      escrowId: data.escrow_id || null,
      paypalOrderId: data.paypal_order_id || null,
      paypalApprovalUrl: data.paypal_approval_url || null,
      flags: data.flags || [],
      isApproved: data.decision === "APPROVED",
      isBlocked: data.decision === "BLOCKED",
      isEscalated: data.decision === "ESCALATED",
      blockingReasons
    };
  }

  /**
   * Submit a payment intent to the Mandate Gateway.
   * Evaluates deterministic rules (R1-R10) and LLM risk scorer.
   */
  async requestPayment(params: RequestPaymentParams): Promise<PaymentIntentResult> {
    const payload = {
      mandate_id: params.mandateId,
      counterparty: params.counterparty,
      amount_minor: params.amountMinor,
      currency: params.currency || "USD",
      merchant_category: params.merchantCategory || "general_commerce",
      description: params.description || "",
      source_context: params.sourceContext
    };

    const data = await this.request<any>("/api/intents", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const result = this.mapPaymentIntent(data);

    if (params.raiseOnBlocked && result.isBlocked) {
      throw new IntentBlockedError(
        `Payment intent blocked: ${result.blockingReasons.join("; ")}`,
        result.blockingReasons,
        result.riskScore
      );
    }

    return result;
  }

  /**
   * Check status and verdict of an existing payment intent.
   */
  async getIntentStatus(intentId: string): Promise<PaymentIntentResult> {
    const data = await this.request<any>(`/api/intents/${intentId}`);
    return this.mapPaymentIntent(data);
  }

  /**
   * Retrieve remaining balance and policy limits for a mandate.
   */
  async getMandateBalance(mandateId: string): Promise<MandateBalanceResult> {
    const data = await this.request<any>(`/api/mandates/${mandateId}`);
    const policy = data.policy || {};

    return {
      mandateId: data.id,
      currency: policy.currency || "USD",
      maxTotalMinor: policy.max_total_minor || 0,
      spentToDateMinor: data.spent_to_date_minor || 0,
      remainingBudgetMinor: data.remaining_budget_minor || 0,
      maxPerTransactionMinor: policy.max_per_transaction_minor || 0,
      dailyLimitMinor: policy.daily_limit_minor || 0,
      isActive: data.status === "ACTIVE"
    };
  }

  /**
   * Submit work deliverable against an escrow contract.
   */
  async submitDeliverable(
    escrowId: string,
    params: SubmitDeliverableParams
  ): Promise<DeliverableResult> {
    const payload = {
      content_ref: params.contentRef,
      submission_notes: params.submissionNotes
    };

    const data = await this.request<any>(`/api/escrows/${escrowId}/deliver`, {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const deliverables = data.deliverables || [];
    const latest = deliverables[deliverables.length - 1] || {};

    return {
      deliverableId: latest.id || "",
      escrowId: data.id,
      sha256: latest.sha256 || null,
      status: data.state,
      createdAt: latest.created_at || ""
    };
  }
}

