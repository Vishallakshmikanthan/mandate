"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { fetchEscrow, arbitrateEscrow, humanDecisionEscrow, approvalReturnEscrow, subscribeToStream } from "@/lib/api";
import { EscrowItem } from "@/lib/demo-store";
import { formatMoney } from "@/lib/money";

export default function EscrowDetailPage() {
  const params = useParams();
  const escrowId = (params?.id as string) || "";
  const [escrow, setEscrow] = useState<EscrowItem | any>(null);
  const [loading, setLoading] = useState(true);
  const [isArbitrating, setIsArbitrating] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const steps = [
    { num: 1, label: "Intent received", state: "INTENT_RECEIVED" },
    { num: 2, label: "Order created", state: "ORDER_CREATED" },
    { num: 3, label: "Buyer approved", state: "BUYER_APPROVED" },
    { num: 4, label: "Funds held", state: "FUNDS_HELD" },
    { num: 5, label: "Delivered", state: "DELIVERED" },
    { num: 6, label: "Arbitration", state: "UNDER_ARBITRATION" },
    { num: 7, label: "Released", state: "RELEASED" },
  ];

  const getActiveStep = (state: string): number => {
    switch (state) {
      case "INTENT_RECEIVED": return 1;
      case "ORDER_CREATED": return 2;
      case "BUYER_APPROVED": return 3;
      case "FUNDS_HELD": return 4;
      case "DELIVERED": return 5;
      case "UNDER_ARBITRATION":
      case "NEEDS_HUMAN": return 6;
      case "RELEASED":
      case "PARTIALLY_RELEASED":
      case "SETTLED": return 7;
      case "REFUNDED":
      case "VOIDED": return 6;
      default: return 4;
    }
  };

  const loadEscrow = async () => {
    if (!escrowId) return;
    try {
      const data = await fetchEscrow(escrowId);
      setEscrow(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEscrow();
    const unsub = subscribeToStream(() => {
      loadEscrow();
    });

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("approved") === "true" || searchParams.has("token")) {
        handleCompleteApproval();
      }
    }

    return unsub;
  }, [escrowId]);

  const handleCompleteApproval = async () => {
    if (!escrowId) return;
    setIsApproving(true);
    setActionMessage(null);
    try {
      const res = await approvalReturnEscrow(escrowId);
      setEscrow((prev: any) => ({ ...prev, ...res }));
      setActionMessage("Buyer approval verified. Funds are now held in escrow (FUNDS_HELD).");
    } catch (err: any) {
      setActionMessage(`Approval verification: ${err.message}`);
    } finally {
      setIsApproving(false);
    }
  };

  const handleRunArbiter = async () => {
    if (!escrowId) return;
    setIsArbitrating(true);
    setActionMessage(null);
    try {
      const res = await arbitrateEscrow(escrowId);
      setEscrow((prev: any) => ({ ...prev, ...res }));
      setActionMessage(`AI Arbiter completed evaluation: ${res.verdict?.verdict || "Evaluated"}`);
    } catch (err: any) {
      setActionMessage(`Arbitration error: ${err.message}`);
    } finally {
      setIsArbitrating(false);
    }
  };

  const handleHumanDecision = async (action: "APPROVE" | "REJECT") => {
    if (!escrowId) return;
    try {
      const res = await humanDecisionEscrow(escrowId, action, "Manual human decision via dashboard");
      setEscrow((prev: any) => ({ ...prev, ...res }));
      setActionMessage(`Human decision '${action}' recorded successfully.`);
    } catch (err: any) {
      setActionMessage(`Human decision error: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center text-xs text-neutral-400 font-mono">
        Loading escrow details...
      </div>
    );
  }

  if (!escrow) {
    return (
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-12 text-center space-y-4">
        <h2 className="text-xl font-semibold text-white">Escrow Not Found</h2>
        <p className="text-xs text-neutral-400">
          The requested escrow ID does not exist or has not been created yet.
        </p>
        <Link
          href="/app/escrows"
          className="inline-block px-4 py-2 rounded-full text-xs font-semibold bg-white text-neutral-900 hover:bg-neutral-100"
        >
          Return to escrows
        </Link>
      </div>
    );
  }

  const activeStep = getActiveStep(escrow.state);
  const amountMinor = escrow.amount_minor || escrow.spec?.amount_minor || 12000;
  const isSettled = escrow.state === "RELEASED" || escrow.state === "SETTLED";
  const isVoided = escrow.state === "REFUNDED" || escrow.state === "VOIDED";
  const isExpired = escrow.state === "EXPIRED";

  const formatExpiry = (expiresAtStr?: string) => {
    if (!expiresAtStr) return null;
    const exp = new Date(expiresAtStr).getTime();
    const now = Date.now();
    const diffMs = exp - now;
    if (diffMs <= 0) return "Hold Expired";
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${mins}m left`;
    return `${mins}m left`;
  };

  const latestVerdict = escrow.verdicts && escrow.verdicts.length > 0 ? escrow.verdicts[escrow.verdicts.length - 1] : escrow.verdict;
  const criteriaResults = latestVerdict?.criteria_results || [
    { criterion: "Deliverable matches contract specifications", met: isSettled },
    { criterion: "Files delivered within agreed timeframe", met: !isVoided },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Action Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/app/escrows" className="text-xs text-neutral-400 hover:text-white transition">
              ← Escrows
            </Link>
            <span className="text-neutral-600">/</span>
            <span className="text-xs text-neutral-400 font-mono">{escrow.id}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-light text-white tracking-tight">
            {formatMoney(amountMinor)} escrow hold
          </h1>
        </div>

        {/* Action Buttons on Right */}
        <div className="flex items-center gap-3">
          <span className={`px-3.5 py-1.5 rounded-full text-xs font-mono border ${
            isExpired
              ? "text-amber-400 bg-amber-400/10 border-amber-400/30"
              : isSettled
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
              : isVoided
              ? "text-rose-300 bg-rose-500/10 border-rose-500/30"
              : "text-neutral-300 bg-white/[0.04] border-white/[0.08]"
          }`}>
            {escrow.state}
          </span>

          <button
            onClick={() => handleHumanDecision(isSettled ? "REJECT" : "APPROVE")}
            disabled={isExpired}
            className="px-4 py-2 rounded-full text-xs font-normal text-neutral-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Human {isSettled ? "refund" : "override release"}
          </button>

          <button
            onClick={handleRunArbiter}
            disabled={isArbitrating || isSettled || isVoided || isExpired}
            className={`px-5 py-2 rounded-full text-xs font-semibold transition shadow-sm ${
              isSettled
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : isVoided
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                : isExpired
                ? "bg-amber-500/20 text-amber-300 border border-amber-500/40 cursor-not-allowed"
                : "bg-white text-neutral-900 hover:bg-neutral-100"
            }`}
          >
            {isArbitrating ? "Arbitrating..." : isSettled ? "Released ✓" : isVoided ? "Voided" : isExpired ? "Hold Expired" : "Run arbiter"}
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-xs font-mono text-cyan-300">
          {actionMessage}
        </div>
      )}

      {/* Expired State Alert Banner */}
      {isExpired && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <h3 className="text-sm font-medium text-amber-200">PayPal Authorization Hold Expired</h3>
            </div>
            <p className="text-xs text-neutral-300">
              The 29-day authorization hold has elapsed without settlement. The reserved budget of {formatMoney(amountMinor)} has been automatically released back to the buyer mandate.
            </p>
          </div>
          <div className="text-xs font-mono text-amber-300 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40">
            BUDGET RESTORED
          </div>
        </div>
      )}

      {/* Waiting for Buyer Approval Banner */}
      {(escrow.state === "ORDER_CREATED" || escrow.state === "BUYER_APPROVED") && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h3 className="text-sm font-medium text-amber-200">Waiting for buyer approval</h3>
            </div>
            <p className="text-xs text-neutral-300">
              The PayPal authorization order has been created. A human buyer must review and approve the hold.
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <a
              href={escrow.approve_url || `https://www.sandbox.paypal.com/checkoutnow?token=${escrow.paypal_order_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 sm:flex-initial text-center px-4 py-2 rounded-full text-xs font-semibold bg-amber-400 text-neutral-950 hover:bg-amber-300 transition shadow-sm"
            >
              Approve on PayPal ↗
            </a>
            <button
              onClick={handleCompleteApproval}
              disabled={isApproving}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-xs font-medium bg-white/[0.08] hover:bg-white/[0.15] text-white border border-white/[0.15] transition"
            >
              {isApproving ? "Checking..." : "Confirm approved"}
            </button>
          </div>
        </div>
      )}

      {/* 7-Step Horizontal Stepper */}
      <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-5 space-y-4">
        <div className="relative pt-2 pb-1">
          {/* Progress bar line */}
          <div className="absolute top-[18px] left-6 right-6 h-[2px] bg-white/[0.1] -z-0">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
            />
          </div>

          <div className="flex items-center justify-between relative z-10">
            {steps.map((st) => {
              const isPassed = st.num < activeStep;
              const isCurrent = st.num === activeStep;
              return (
                <div key={st.num} className="flex flex-col items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono transition-all ${
                      isPassed
                        ? "bg-white text-neutral-900 font-bold"
                        : isCurrent
                        ? "bg-white text-neutral-900 font-bold ring-4 ring-white/20"
                        : "bg-[#142225] border border-white/[0.2] text-neutral-400"
                    }`}
                  >
                    {isPassed ? "✓" : st.num}
                  </div>
                  <span
                    className={`text-xs ${
                      isPassed || isCurrent ? "text-neutral-200 font-medium" : "text-neutral-400"
                    }`}
                  >
                    {st.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Middle Row: 2 Cards (Money Flow on Left, Arbiter Verdict on Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Money Flow Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[220px] space-y-6">
          <div className="space-y-4">
            <span className="text-xs text-neutral-400 font-normal">Money flow</span>

            {/* 3 Connected Stage Boxes */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <div className="flex-1 rounded-xl bg-[#0f191b]/90 border border-white/[0.06] p-4 text-center space-y-1">
                <span className="text-xs text-neutral-300 block">Buyer agent</span>
                <span className="font-mono text-sm text-white font-medium">{formatMoney(amountMinor)}</span>
              </div>

              <div className="text-neutral-400 font-mono text-xs tracking-widest">-------</div>

              <div className="flex-1 rounded-xl bg-[#0f191b]/95 border border-white/40 p-4 text-center space-y-1 shadow-[0_0_20px_rgba(255,255,255,0.1)]">
                <span className="text-xs text-neutral-200 block font-medium">PayPal hold</span>
                <span className="text-xs text-neutral-300 block">{escrow.state}</span>
              </div>

              <div className="text-neutral-400 font-mono text-xs tracking-widest">-------</div>

              <div className="flex-1 rounded-xl bg-[#0f191b]/90 border border-white/[0.06] p-4 text-center space-y-1">
                <span className="text-xs text-neutral-300 block">Seller</span>
                <span className="text-xs text-neutral-400 block">
                  {isSettled ? "Paid " + formatMoney(amountMinor) : isVoided ? "Refunded" : "Awaiting release"}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-normal">
              PayPal Order: <span className="font-mono text-neutral-300">{escrow.paypal_order_id || "Simulated"}</span> · 
              Auth ID: <span className="font-mono text-neutral-300">{escrow.paypal_authorization_id || "None"}</span>
            </p>
            {escrow.hold_expires_at && (
              <p className="text-xs text-neutral-400 font-normal">
                Hold Expiry: <span className="font-mono text-amber-300">{formatExpiry(escrow.hold_expires_at)}</span>
                <span className="text-neutral-500 ml-1">({new Date(escrow.hold_expires_at).toLocaleDateString()})</span>
              </p>
            )}
          </div>
        </div>

        {/* Right: Arbiter verdict Card */}
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 flex flex-col justify-between min-h-[220px] space-y-6">
          <div className="space-y-3">
            <span className="text-xs text-neutral-400 font-normal">
              Arbiter verdict {latestVerdict ? `· ${latestVerdict.verdict}` : "· Pending"}
            </span>

            <div className="space-y-2 pt-1">
              {criteriaResults.map((cr: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between py-1 text-xs">
                  <span className="text-neutral-200">{cr.criterion || cr.text}</span>
                  <span
                    className={`px-3 py-0.5 rounded-full text-[11px] font-medium ${
                      cr.met
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                    }`}
                  >
                    {cr.met ? "Met" : "Not met"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-xs text-neutral-400 font-normal block">
              Confidence score: {latestVerdict ? `${((latestVerdict.confidence || 0.88) * 100).toFixed(0)}%` : "N/A"}
            </span>
            <div className="w-full h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all"
                style={{ width: `${((latestVerdict?.confidence || 0.88) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Deliverables section if any */}
      {escrow.deliverables && escrow.deliverables.length > 0 && (
        <div className="rounded-2xl bg-[#142225]/85 backdrop-blur-xl border border-white/[0.08] p-6 space-y-3">
          <span className="text-xs text-neutral-400 font-normal">Submitted Deliverables</span>
          <div className="space-y-2">
            {escrow.deliverables.map((d: any) => (
              <div key={d.id} className="p-3 rounded-xl bg-[#0f191b]/90 border border-white/[0.06] text-xs space-y-1">
                <span className="font-mono text-neutral-300 font-medium">{d.content_ref}</span>
                {d.submission_notes && <p className="text-neutral-400">{d.submission_notes}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
