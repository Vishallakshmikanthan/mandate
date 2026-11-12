/**
 * Mandate TypeScript SDK - Types and Interfaces
 */

export interface RuleReason {
  rule: string;
  name: string;
  passed: boolean;
  detail: string;
}

export interface RequestPaymentParams {
  mandateId: string;
  counterparty: string;
  amountMinor: number;
  currency?: string;
  merchantCategory?: string;
  description?: string;
  sourceContext?: string;
  raiseOnBlocked?: boolean;
}

export interface PaymentIntentResult {
  intentId: string;
  mandateId: string;
  counterparty: string;
  amountMinor: number;
  currency: string;
  decision: "APPROVED" | "BLOCKED" | "ESCALATED";
  riskScore: number;
  reasons: RuleReason[];
  escrowId?: string | null;
  paypalOrderId?: string | null;
  paypalApprovalUrl?: string | null;
  flags: string[];
  isApproved: boolean;
  isBlocked: boolean;
  isEscalated: boolean;
  blockingReasons: string[];
}

export interface MandateBalanceResult {
  mandateId: string;
  currency: string;
  maxTotalMinor: number;
  spentToDateMinor: number;
  remainingBudgetMinor: number;
  maxPerTransactionMinor: number;
  dailyLimitMinor: number;
  isActive: boolean;
}

export interface SubmitDeliverableParams {
  contentRef: string;
  submissionNotes?: string;
}

export interface DeliverableResult {
  deliverableId: string;
  escrowId: string;
  sha256?: string | null;
  status: string;
  createdAt: string;
}

export interface MandateClientOptions {
  apiKey: string;
  baseUrl?: string;
  timeoutMs?: number;
}

