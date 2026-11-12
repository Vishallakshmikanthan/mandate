"use client";

import React, { useState } from "react";
import { GlassCard } from "@/components/glass/GlassCard";
import {
  Settings,
  Sun,
  Moon,
  Key,
  Lock,
  Globe,
  AlertTriangle,
  Check,
  Copy,
  Plus,
  Trash2,
  Sparkles,
  RotateCcw,
} from "lucide-react";
import { demoStore } from "@/lib/demo-store";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"appearance" | "paypal" | "keys" | "webhooks" | "danger">("appearance");
  const [isDark, setIsDark] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);

  // PayPal credentials state
  const [clientId, setClientId] = useState("AYSq3RDGsmBLJE-otTkBtM-jBRd1TCQwFf9RG6Ht3LvKW3iEBqnWiZaFixPJFFrEWfcd6KTVwsAcEkDM");
  const [clientSecret, setClientSecret] = useState("••••••••••••••••••••••••••••••••");
  const [testingPayPal, setTestingPayPal] = useState(false);
  const [paypalSuccess, setPaypalSuccess] = useState<boolean | null>(null);

  // API Keys state
  const [apiKeys, setApiKeys] = useState([
    { id: "key_1", name: "Production Agent Gateway", key: "mk_live_9f81••••a3f9", created: "2026-11-01" },
    { id: "key_2", name: "Staging Testbed", key: "mk_test_12a4••••e8b1", created: "2026-11-08" },
  ]);
  const [newKeyModal, setNewKeyModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("light");
    }
  };

  const testPayPalConnection = () => {
    setTestingPayPal(true);
    setPaypalSuccess(null);
    setTimeout(() => {
      setTestingPayPal(false);
      setPaypalSuccess(true);
      setTimeout(() => setPaypalSuccess(null), 3000);
    }, 1000);
  };

  const handleCreateKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    const randomHex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
    const rawKey = `mk_live_${randomHex}`;
    setGeneratedKey(rawKey);
    setApiKeys([
      {
        id: `key_${Date.now()}`,
        name: newKeyName,
        key: `mk_live_${randomHex.slice(0, 4)}••••${randomHex.slice(-4)}`,
        created: new Date().toISOString().slice(0, 10),
      },
      ...apiKeys,
    ]);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      <div className="pb-4 border-b border-white/[0.08]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400">
          Environment & Credentials
        </span>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-1">
          Settings & Integrations
        </h1>
        <p className="text-xs text-neutral-400 mt-1">
          Configure PayPal API sandbox keys, LLM safety thresholds, theme, and webhooks.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-2">
        {[
          { id: "appearance", label: "Appearance & Theme", icon: Sun },
          { id: "paypal", label: "PayPal Connection", icon: Lock },
          { id: "keys", label: "API Keys", icon: Key },
          { id: "webhooks", label: "Webhooks", icon: Globe },
          { id: "danger", label: "Danger Zone", icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? "bg-white/[0.12] text-white border border-white/[0.2]"
                  : "text-neutral-400 hover:text-white"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab: Appearance */}
      {activeTab === "appearance" && (
        <GlassCard className="p-6 space-y-6">
          <h3 className="text-sm font-semibold text-white">Appearance & Accessibility</h3>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div>
              <span className="text-xs font-semibold text-white block">Theme Mode</span>
              <span className="text-[11px] text-neutral-400">
                Choose between Deep-Space Dark (default) or Modern Polished Light theme
              </span>
            </div>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-white flex items-center gap-2"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-indigo-300" />}
              <span>{isDark ? "Dark Theme" : "Light Theme"}</span>
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div>
              <span className="text-xs font-semibold text-white block">Reduce Motion</span>
              <span className="text-[11px] text-neutral-400">
                Disables heavy parallax and 3D tilt effects for accessibility
              </span>
            </div>
            <input
              type="checkbox"
              checked={reduceMotion}
              onChange={(e) => setReduceMotion(e.target.checked)}
              className="w-5 h-5 accent-cyan-400 rounded cursor-pointer"
            />
          </div>
        </GlassCard>
      )}

      {/* Tab: PayPal Connection */}
      {activeTab === "paypal" && (
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">PayPal Orders v2 Sandbox Integration</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Mandate uses PayPal OAuth2 tokens to create authorization holds and capture payments.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-mono text-[11px]">
              Sandbox Connected
            </span>
          </div>

          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-mono text-neutral-300 mb-1.5">Client Secret</label>
              <input
                type="password"
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs font-mono text-neutral-200 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={testPayPalConnection}
                disabled={testingPayPal}
                className="px-4 py-2 rounded-xl brand-gradient-bg text-black font-semibold text-xs transition-transform hover:scale-105 disabled:opacity-50"
              >
                {testingPayPal ? "Authenticating with PayPal..." : "Test Sandbox API Handshake"}
              </button>

              {paypalSuccess && (
                <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 animate-in fade-in">
                  <Check className="w-4 h-4" /> OAuth Token Generated (HTTP 200 OK)
                </span>
              )}
            </div>
          </div>
        </GlassCard>
      )}

      {/* Tab: API Keys */}
      {activeTab === "keys" && (
        <GlassCard className="p-6 space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
            <div>
              <h3 className="text-sm font-semibold text-white">Gateway API Keys</h3>
              <p className="text-xs text-neutral-400 mt-0.5">
                Authenticate autonomous agents when submitting payment intents.
              </p>
            </div>
            <button
              onClick={() => setNewKeyModal(true)}
              className="px-3.5 py-1.5 rounded-xl brand-gradient-bg text-black font-semibold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Generate Key
            </button>
          </div>

          <div className="space-y-3">
            {apiKeys.map((k) => (
              <div
                key={k.id}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs font-mono"
              >
                <div>
                  <span className="font-semibold text-white block">{k.name}</span>
                  <span className="text-neutral-400 text-[11px] mt-0.5 block">{k.key}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-neutral-500 text-[10px]">Created {k.created}</span>
                  <button
                    onClick={() => setApiKeys(apiKeys.filter((item) => item.id !== k.id))}
                    className="p-1 text-neutral-500 hover:text-rose-400"
                    title="Revoke key"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* New Key Modal */}
          {newKeyModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
              <div className="w-full max-w-md rounded-2xl bg-[#0D1220] border border-white/[0.16] p-6 shadow-2xl space-y-4">
                <h3 className="text-base font-semibold text-white">Generate Gateway API Key</h3>
                <form onSubmit={handleCreateKey} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-neutral-300 mb-1.5">
                      Key Description
                    </label>
                    <input
                      type="text"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      placeholder="e.g. Buyer Bot Production Key"
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white"
                      required
                    />
                  </div>

                  {generatedKey && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs font-mono space-y-1">
                      <span className="font-bold text-white block">Copy this key now. It won&apos;t be shown again:</span>
                      <div className="p-2 rounded bg-black/60 select-all break-all text-white font-bold">
                        {generatedKey}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewKeyModal(false);
                        setGeneratedKey(null);
                        setNewKeyName("");
                      }}
                      className="px-4 py-2 rounded-xl bg-white/[0.06] text-xs text-neutral-300"
                    >
                      {generatedKey ? "Done" : "Cancel"}
                    </button>
                    {!generatedKey && (
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl brand-gradient-bg text-black font-semibold text-xs"
                      >
                        Create Key
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* Tab: Webhooks */}
      {activeTab === "webhooks" && (
        <GlassCard className="p-6 space-y-4">
          <h3 className="text-sm font-semibold text-white">Webhook Delivery Endpoints</h3>
          <p className="text-xs text-neutral-400">
            Mandate broadcasts HTTP POST callbacks for state machine updates (order creation, authorization holds, arbiter verdicts).
          </p>
          <div>
            <label className="block text-xs font-mono text-neutral-300 mb-1.5">Endpoint URL</label>
            <input
              type="url"
              defaultValue="https://api.yourdomain.com/webhooks/mandate"
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs font-mono text-white"
            />
          </div>
          <button className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-mono text-white border border-white/[0.1]">
            Send Test Ping Webhook
          </button>
        </GlassCard>
      )}

      {/* Tab: Danger Zone */}
      {activeTab === "danger" && (
        <GlassCard className="p-6 border-rose-500/30 space-y-5">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="text-sm font-semibold text-white">Danger Zone</h3>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <div>
              <span className="text-xs font-semibold text-white block">Pause All Agents</span>
              <span className="text-[11px] text-neutral-400">
                Immediately revokes all active spending mandates and halts agents.
              </span>
            </div>
            <button
              onClick={() => demoStore.pauseAllAgents()}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
            >
              Trigger Network Freeze
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/[0.08]">
            <div>
              <span className="text-xs font-semibold text-white block">Reset Demo Workspace</span>
              <span className="text-[11px] text-neutral-400">
                Restores sample agents, mandates, and scenario data to initial state.
              </span>
            </div>
            <button
              onClick={() => {
                demoStore.resetAll();
                window.location.reload();
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-mono text-white flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset State</span>
            </button>
          </div>
        </GlassCard>
      )}
    </div>
  );
}

