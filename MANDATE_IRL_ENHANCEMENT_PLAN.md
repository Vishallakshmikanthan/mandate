# MANDATE: IRL Enhancement Plan (for AI coding agents)

**Goal:** turn Mandate from a hackathon demo (simulated PayPal, mock LLM, mock dashboard, no auth) into a system that can safely run a real pilot with real sandbox users, real seller payees, and real LLM decisions.

**Audience:** AI coding agents (Cursor, Windsurf, Claude Code). Humans supervise.
**Repo:** `mandate-main/` (FastAPI backend in `backend/app`, Next.js frontend in `frontend/`).

---

## 0. How to use this file (agent protocol)

1. Work **one task at a time**, in ID order. Do not start a phase until the previous phase's exit criteria pass.
2. Before editing, **read every file listed under "Files"** and confirm the problem exists as described. If the code differs from this document, trust the code and note the difference.
3. After editing, run the task's **Verify** commands. A task is done only when its acceptance criteria are met and all tests pass.
4. Never weaken an invariant (section 1) to make a test pass.
5. Items tagged **VERIFY** depend on PayPal behavior that must be checked against the live docs at developer.paypal.com (Orders v2, Payments v2, Webhooks) before implementing. Do not guess endpoint fields.
6. Do not add placeholder code, TODO stubs, or fake data. If something cannot be built yet, say so in the report and stop.
7. One commit per task. Message format: `P2-04: lock escrow rows during state transitions`.
8. End every task with a short report: what changed, files touched, tests added, anything unresolved.

---

## 1. Invariants (never break)

1. Deterministic rules (R1–R10) have final authority. The LLM can only tighten (ALLOW → ESCALATE → BLOCK), never loosen.
2. Fail closed: any LLM, network, parser, signature, or webhook-verification failure blocks or escalates.
3. The buyer agent never holds PayPal credentials. Its only payment capability is submitting an intent to the gateway.
4. No PayPal call happens for a BLOCKED intent.
5. All money amounts are integer minor units.
6. Every decision and state change is written to the hash-chained audit log.
7. Counterparty-supplied text (messages, deliverables) is untrusted data: delimited in prompts, never executed as instructions.
8. Every PayPal mutation carries a deterministic idempotency key.

---

## 2. Verified current state (from code review)

| # | Finding | Where |
|---|---|---|
| F1 | `.gitignore` has `lib/`, so `frontend/lib/` (`demo-store`, `money`, `motion`, ~22 imports) is missing from the repo; a clean frontend build likely fails | `.gitignore`, `frontend/app/**`, `frontend/components/**` |
| F2 | Most dashboard pages read `demoStore` (client-side mock); only mandate builder, red-team view, audit view call the API; login is a `setTimeout` | `frontend/app/app/**`, `frontend/app/(auth)/login/page.tsx` |
| F3 | No authentication or ownership; CORS is `"*"` with credentials; signing key has a hardcoded default in 3 places | `backend/app/main.py`, `config.py`, `.env.example`, `docker-compose.yml` |
| F4 | PayPal order has no payee; `counterparty` is a free-text string; buyer approval is faked by the orchestrator | `paypal/orders.py`, `agents/orchestrator.py` |
| F5 | Webhook signature check returns `True` when `PAYPAL_WEBHOOK_ID` is unset; auth events never match an escrow (resource id is the authorization id, order id is only read for "checkout" events); event is marked processed before handling | `paypal/webhooks.py`, `api/webhooks.py` |
| F6 | `httpx.AsyncClient().sleep(...)` does not exist, so the first 5xx retry raises `AttributeError` | `paypal/client.py` |
| F7 | No row locking; state change commits before audit write; budget counters are read-then-write (race); counters use `intent.decision == "APPROVED"` so human-approved escalations are never counted and voided/refunded escrows are never released; `hold_expires_at` never persisted; nothing sets `EXPIRED` | `core/escrow_machine.py`, `api/intents.py`, `api/escrows.py`, `core/audit.py` |
| F8 | Default LLM is a keyword mock; `anthropic` listed in `.env.example` but no provider; no retry/schema-repair; Arbiter sees only a text `content_ref`, runs once; verdict model name hardcoded `arbiter-core-v1` | `llm/provider.py`, `core/arbiter.py`, `api/escrows.py` |
| F9 | Red-team "21/21" is measured on attacks written alongside the regex and mock; `_red_team_cache` is pre-seeded with 21/21; prefilter is English-only and any hit hard-blocks (false-positive risk) | `api/scenarios.py`, `core/risk_scorer.py`, `agents/attacker.py` |

---

# PHASE 1: Honest and runnable

**Exit criteria:** fresh `git clone` builds and runs; CI green; no fake data presented as real; README states what is simulated.

### P1-01 Fix the ignored `lib/` directory
- **Files:** `.gitignore`, `frontend/lib/*`
- **Do:** change `lib/` and `lib64/` to `/backend/lib/` and `/backend/lib64/` (or `backend/.venv` only). Recreate `frontend/lib/money.ts` (`formatMoney` and any other exports used), `frontend/lib/motion.ts*`, and `frontend/lib/demo-store.ts` by inspecting every `@/lib/...` import to infer required exports.
- **Accept:** `git clone` into a temp dir, then `cd frontend && npm ci && npm run build` passes.
- **Verify:** `grep -rn "@/lib/" frontend | sed 's/.*@\/lib\///' | sort -u` all resolve to tracked files (`git ls-files frontend/lib`).

### P1-02 Replace mock `demoStore` with real API calls
- **Files:** `frontend/lib/api.ts` (new), `frontend/next.config.js`, all pages under `frontend/app/app/`
- **Do:**
  1. Create a typed API client using `NEXT_PUBLIC_API_URL`; add a Next rewrite so `/api/*` proxies to the backend (components already fetch relative `/api/...`).
  2. Subscribe to `/api/stream` (SSE) for live events.
  3. Rewrite payments, payment detail, escrows, escrow detail, approvals, disputes, mandates, scenarios pages to use backend data.
  4. For pages with no backend endpoint (agents, notifications, billing, settings): either add a minimal real endpoint or remove the page from navigation. No hardcoded fake rows.
  5. Keep `demoStore` only behind `NEXT_PUBLIC_DEMO_MODE=true`, with a visible "Demo data" ribbon (`DemoRibbon` exists).
- **Accept:** with backend running and an empty DB, pages show empty states, not fake data; running a scenario updates pages live.
- **Verify:** `npm run build`; manual run of scenarios A, B, C from the UI.

### P1-03 Gate the fake login
- **Files:** `frontend/app/(auth)/**`
- **Do:** until Phase 3 auth exists, show login only when `NEXT_PUBLIC_DEMO_MODE=true`; otherwise show "Authentication not configured" and block `/app`.
- **Accept:** no pre-filled credentials in production mode.

### P1-04 Fix PayPal retry bug
- **Files:** `backend/app/paypal/client.py`, `backend/tests/test_paypal_client.py` (new)
- **Do:** replace `httpx.AsyncClient().sleep` with `await asyncio.sleep(backoff)`. Retry only on network errors, 429 and 5xx. Do not retry 4xx. Add jitter. Reuse one `httpx.AsyncClient`.
- **Accept:** tests with a mocked transport prove: 5xx then 200 succeeds; repeated 5xx raises after `max_retries`; 400 does not retry; the same `PayPal-Request-Id` is sent on every retry.

### P1-05 Remove pre-seeded red-team results
- **Files:** `backend/app/api/scenarios.py`, `frontend/components/RedTeamView.tsx`
- **Do:** initialise `_red_team_cache` empty (`last_run: null`, zero counts). Persist results of each run to a `redteam_runs` table. The stats endpoint returns "not run yet" until a run exists. Confirm the route the frontend calls (`/api/scenarios/redteam/stats`) actually exists and matches.
- **Accept:** fresh DB shows "No runs yet", not 100%.

### P1-06 Record the real model name
- **Files:** `llm/provider.py`, `api/escrows.py`, `models/arbiter.py`
- **Do:** add `model_name` to each provider (`mock` for the mock). Store it, plus prompt version, in verdicts and in risk-score audit payloads.

### P1-07 Secrets and CORS
- **Files:** `config.py`, `main.py`, `.env.example`, `docker-compose.yml`
- **Do:**
  1. Add `APP_ENV` (`demo` | `dev` | `prod`). In non-demo envs, refuse to start if `MANDATE_SIGNING_KEY` is the default or under 32 bytes.
  2. Remove the key from `docker-compose.yml`; read from env/secret.
  3. CORS: explicit allowed origins from `FRONTEND_ORIGIN`; remove `"*"`.
  4. `/api/health` must not leak secrets.
- **Accept:** `APP_ENV=prod` with the default key exits with a clear error.

### P1-08 README honesty section
- **Do:** add "What is simulated vs real" (PayPal simulation mode, mock LLM, demo data). Remove any claim that cannot be reproduced from a fresh clone. Update test counts from an actual run.

---

# PHASE 2: Real money path

**Exit criteria:** a real sandbox buyer approves, a real sandbox seller payee receives funds, all states reconcile via webhooks, no budget or double-capture races.

### P2-01 Verified counterparties and payee
- **Files:** `models/counterparty.py` (new), `core/policy_engine.py`, `paypal/orders.py`, `schemas/*`, Alembic migration
- **Do:**
  1. Table `counterparties(id, handle, paypal_merchant_id, paypal_email, status, verified_at)`.
  2. R5 passes only if the counterparty exists, is `VERIFIED`, and is allow-listed (handle or id).
  3. `create_paypal_order` sets the payee on the purchase unit. **VERIFY:** how payee is specified in Orders v2 (merchant ID vs email) and whether paying a third-party seller requires PayPal marketplace/partner onboarding. If it does, document the sandbox path and the production prerequisite in `docs/compliance.md`.
- **Accept:** intent to an unverified counterparty is blocked at R5; the created order contains the seller payee; unit tests for both.

### P2-02 Real buyer approval flow
- **Files:** `paypal/orders.py`, `api/escrows.py`, `agents/orchestrator.py`, frontend escrow page
- **Do:**
  1. Order creation sets return/cancel URLs (**VERIFY** current Orders v2 field names for experience context).
  2. New `GET /api/escrows/{id}/approval-return`: fetch the order from PayPal, require status `APPROVED`, then call authorize, persist `authorization_id` and `hold_expires_at`, transition to `FUNDS_HELD`.
  3. Show the approval URL in the UI with a "Waiting for buyer approval" state.
  4. Orchestrator's simulated approval runs only when `PAYPAL_SIMULATION_MODE=true`.
- **Accept:** in sandbox mode a human buyer completes approval in PayPal and the escrow reaches `FUNDS_HELD` without any simulated step.

### P2-03 Webhooks: fail closed, match correctly, retry-safe
- **Files:** `paypal/webhooks.py`, `api/webhooks.py`, `models/webhook.py`
- **Do:**
  1. If not in simulation mode and `PAYPAL_WEBHOOK_ID` is unset: refuse to start (prod) or reject webhooks (dev). Never return `True` by default.
  2. Resolve the escrow per event type: `CHECKOUT.ORDER.APPROVED` → `resource.id`; authorization and capture events → the related order id in `resource.supplementary_data.related_ids` (**VERIFY** exact shape), falling back to matching `paypal_authorization_id` / `paypal_capture_id`.
  3. Record the event and apply its effect **in one DB transaction**; on exception roll back so PayPal's retry is processed. Add `status` (`RECEIVED`/`PROCESSED`/`FAILED`) to `webhook_events`.
  4. Handle capture completed, capture denied, authorization voided, and order approved. Unknown events are stored and ignored.
  5. Reconciler: background task that, for escrows stuck in `ORDER_CREATED`/`BUYER_APPROVED`/`FUNDS_HELD` beyond N minutes, polls PayPal for status and corrects state.
- **Accept:** replaying the same payload twice changes state once; a failing handler leaves the event unprocessed; a mismatched signature returns 401; tests cover all.

### P2-04 Locking and transactional audit
- **Files:** `core/escrow_machine.py`, `core/audit.py`, `api/escrows.py`, `api/intents.py`
- **Do:**
  1. Add `get_escrow_for_update(db, id)` using `SELECT ... FOR UPDATE` on Postgres and `BEGIN IMMEDIATE` on SQLite. Add a `version` integer column with optimistic checks as a portable second guard.
  2. `transition_escrow_state` and `log_audit_event` must share one transaction (add a `commit=False` parameter; commit once at the end of the operation).
  3. Audit append must be serialised: unique constraint on `prev_hash` with retry on conflict.
  4. `/arbitrate`, `/human-decision`, `/deliver` return 409 if the escrow is not in the expected state (idempotent re-calls do not double-act).
- **Accept:** test fires 10 concurrent `/arbitrate` calls on one escrow, expects exactly one capture call and a single terminal state; audit chain verifies afterwards.

### P2-05 Spend ledger (fixes budget races and leaks)
- **Files:** `models/spend_ledger.py` (new), `api/intents.py`, `api/mandates.py`, `api/escrows.py`, `core/policy_engine.py`
- **Do:**
  1. Table `spend_ledger(id, mandate_id, intent_id, amount_minor, kind RESERVE|COMMIT|RELEASE, created_at)`.
  2. Lock the mandate row, compute R3/R4/R8 from the ledger, and write a `RESERVE` entry in the same transaction as the APPROVED decision.
  3. ESCALATED does not reserve until a human approves, then reserve (re-checking R2–R4, R8 at that moment).
  4. On `RELEASED`: `COMMIT`. On `REFUNDED`, `EXPIRED`, rejected escalation: `RELEASE`. On partial: commit captured amount, release the rest.
  5. `spent_to_date` shown in the UI comes from the ledger.
- **Accept:** test submits 20 concurrent intents of $50 against a $200 total budget; at most 4 are approved. Voiding an escrow frees budget. A human-approved escalation consumes budget.

### P2-06 Idempotency and crash-safe PayPal actions
- **Files:** `paypal/orders.py`, `models/paypal_action.py` (new)
- **Do:**
  1. Table `paypal_actions(id, escrow_id, action, request_id, request_body, response_body, status, created_at)`.
  2. Request id = `{intent_id}-{action}-{amount_minor}`. Check the table before calling; after a crash, resume from the stored record instead of re-calling.
  3. Partial release: capture the partial amount with the final-capture option so the remainder is released, instead of a separate void after capture (**VERIFY** the `final_capture` behavior in Payments v2).
  4. Never mark a state terminal before PayPal confirms the action.
- **Accept:** simulated crash between PayPal call and DB commit, followed by retry, produces one capture.

### P2-07 Hold expiry
- **Files:** `main.py` (lifespan), `core/expiry.py` (new), `paypal/orders.py`
- **Do:** persist `hold_expires_at` from the authorize response. Background loop (every 60 s): warn at configurable thresholds, then move expired escrows to `EXPIRED` and release the reserved budget. Optionally support re-authorization. **VERIFY** the honor period and total validity of authorizations.
- **Accept:** with a short test expiry, an escrow expires, the ledger releases, and the UI shows a countdown and the expired state.

---

# PHASE 3: Trustworthy decisions and access control

**Exit criteria:** no unauthenticated write endpoint; production-grade persistence; real LLMs with verified output handling.

### P3-01 Postgres, migrations, shared stream
- **Files:** `db.py`, `alembic/` (new), `core/stream_broadcaster.py`, `docker-compose.yml`
- **Do:** Postgres as default for non-demo; Alembic migrations replace `create_all` outside demo; Redis pub/sub for the SSE broadcaster so multiple workers share events. Add Postgres + Redis to compose.
- **Accept:** `alembic upgrade head` on empty DB works; two backend replicas both stream events.

### P3-02 Authentication and ownership
- **Files:** `api/*`, `models/user.py`, `models/api_key.py` (new), `core/auth.py` (new)
- **Do:**
  1. Human users: password (argon2) or OAuth login, short-lived session tokens.
  2. Agent API keys: stored hashed, scoped (`intents:create`, `escrows:deliver`, `intents:read`), bound to one `agent_id`/mandate.
  3. Owner scoping on every query (mandates, intents, escrows, audit).
  4. Human-only endpoints: create/revoke mandate, `/human-decision`, counterparty management.
  5. Seller deliver endpoint requires a key bound to that escrow's counterparty.
  6. Rate limits per key; request size limits.
- **Accept:** test iterates all routes and asserts 401/403 without proper credentials; a user cannot read another user's mandate.

### P3-03 Asymmetric mandate signatures
- **Files:** `core/mandate_signing.py`, `models/mandate.py`, frontend mandate builder
- **Do:** owner key pair (Ed25519): the client signs the canonical policy; the server stores the public key and signature and verifies on every use (R1). Keep HMAC only for `APP_ENV=demo`. Add `key_id` and rotation support. Server-side secrets come from a secret manager or KMS in prod.
- **Accept:** a policy edited directly in the DB fails R1; a mandate signed by another user's key fails.

### P3-04 Audit anchoring
- **Files:** `core/audit.py`, `api/audit.py`, `core/checkpoint.py` (new)
- **Do:** periodically produce a signed checkpoint (head hash, count, timestamp) and publish it outside the DB (object storage with immutability, or a public log). `/api/audit/verify` also compares against the latest external checkpoint.
- **Accept:** rewriting the entire chain in the DB is detected by checkpoint mismatch.

### P3-05 Real LLM providers and robust parsing
- **Files:** `llm/provider.py`, `core/risk_scorer.py`, `core/arbiter.py`, `llm/prompts/*`
- **Do:**
  1. Add an Anthropic provider (and keep Gemini/OpenAI), all behind `complete_json`. Use the provider's native structured/JSON output where available.
  2. Timeouts, one schema-repair retry, then fail closed. Log token usage and latency per call.
  3. Prompt files carry a version string that is recorded in the audit log.
  4. Arbiter self-consistency: two independent runs at temperature 0; any disagreement on verdict → `NEEDS_HUMAN`; for PARTIAL use the lower ratio.
  5. Risk Scorer prefilter: Unicode NFKC normalisation, strip zero-width characters, multilingual patterns, and split into strong patterns (hard BLOCK) vs weak patterns (raise score toward ESCALATE) to cut false positives. The LLM result can still only tighten.
  6. `MockLLMProvider` is allowed only when `APP_ENV` is `demo` or in tests.
- **Accept:** contract tests with fixtures verify schema validity and the tighten-only rule; malformed model output fails closed; a prod config with no API key refuses to start.

### P3-06 Real deliverables
- **Files:** `api/escrows.py`, `models/deliverable.py`, `core/deliverable_store.py` (new), `core/arbiter.py`
- **Do:** file upload endpoint with size/type allow-list, stored by SHA-256 (hash recorded in the audit log). Extract text, accept images for vision-capable models, read zip manifests. Anything the arbiter cannot inspect → `NEEDS_HUMAN`. Wrap all content as untrusted data in prompts. Add a virus-scan hook point.
- **Accept:** uploading an unsupported binary yields `NEEDS_HUMAN`; the verdict references the stored hash.

---

# PHASE 4: Prove it

**Exit criteria:** published, reproducible evidence of security and correctness.

### P4-01 Held-out red-team evaluation
- **Files:** `scenarios/redteam_dev.jsonl`, `scenarios/redteam_heldout.jsonl`, `scenarios/benign.jsonl`, `scripts/eval_redteam.py`
- **Do:**
  1. 100+ attack cases (direct, indirect via deliverable, multilingual, obfuscated, authority spoofing, amount splitting, replay) and 100+ benign look-alikes. Tune on the dev split only; the held-out split is never used for tuning.
  2. The script runs against the full pipeline with a live LLM and outputs JSON + a markdown table: block rate, escalate rate, false-positive rate, per-layer attribution (rules vs prefilter vs LLM).
  3. CI runs the mock-LLM version on every push; a nightly job runs the live version.
- **Accept:** README quotes only numbers from the latest script output, with the model name and date.

### P4-02 Test coverage that matches the risks
- **Do:** add
  - sandbox integration tests (`@pytest.mark.sandbox`, skipped without credentials) for create → approve → authorize → capture/void,
  - concurrency tests (budget race, double arbitrate, duplicate webhooks),
  - webhook replay and bad-signature tests,
  - auth matrix tests (every route),
  - migration tests.
- **Accept:** coverage threshold enforced in CI (start at 80% for `core/` and `paypal/`).

### P4-03 Observability and cost control
- **Do:** structured JSON logs with request/escrow/intent ids; metrics (decisions by type, PayPal latency/errors, LLM latency/tokens/cost, stuck escrows); error tracking; alerts for webhook failures, stuck escrows, expiry within 24 h, audit verification failure. Per-mandate daily LLM cost cap and per-scenario turn caps.

### P4-04 CI hardening
- **Do:** add ruff, type checking, frontend typecheck + build, Docker image builds, secret scanning (gitleaks), dependency audit. CI must pass from a fresh clone.

---

# PHASE 5: Adoption and pilot

### P5-01 SDK and MCP server
- **Files:** `sdk/python/`, `sdk/typescript/`, `mcp/`
- **Do:** thin clients exposing `request_payment`, `get_intent_status`, `get_mandate_balance`, `submit_deliverable`. MCP server exposes the same as tools; it holds only a scoped agent API key, never PayPal credentials. Include a quickstart showing an agent framework calling it in under 20 lines.
- **Accept:** an example agent makes a payment request end to end through the SDK; a BLOCKED intent surfaces the reasons to the agent.

### P5-02 Pilot runbook
- **Files:** `docs/pilot.md`
- **Do:** one narrow use case (for example: an agent hires a freelancer for under $100, human approval above $50). Include onboarding steps for owner, seller, and agent; a kill-switch drill; an incident checklist (stuck escrow, webhook outage, LLM outage); success metrics.

### P5-03 Compliance notes
- **Files:** `docs/compliance.md`
- **Do:** state plainly that this is not legal advice. Cover: PayPal remains the party holding funds (Mandate never custodies money); questions for counsel about escrow, money transmission, marketplace/partner onboarding, KYC of sellers, data retention of prompts and deliverables, and privacy. List what must be true before any live-money pilot.

### P5-04 (Optional, larger) Beyond PayPal merchants
- **Do:** evaluate single-use virtual cards behind the same gateway, with mandate checks at card-authorization time. Write a design doc only; do not implement without a compliance review.

---

## 3. Global definition of done (IRL-ready)

- [ ] Fresh clone: backend tests pass, frontend builds, CI green.
- [ ] Real sandbox buyer approval → real seller payee → capture or void, with every state confirmed by webhook or reconciler.
- [ ] No unauthenticated write endpoint; no default secrets accepted outside demo mode; CORS restricted.
- [ ] Concurrency tests show no double-capture and no budget bypass.
- [ ] Spend ledger releases on refund/void/expiry and counts human-approved escalations.
- [ ] Mandates signed with owner keys; audit chain anchored externally.
- [ ] Live-LLM held-out red-team results published with false-positive rate.
- [ ] Every UI page uses real data or is clearly labeled demo.
- [ ] README separates what is real from what is simulated.
- [ ] Pilot runbook and compliance notes exist and were reviewed by a human.

---

## 4. Prompt template (paste into your coding agent, one task at a time)

```
You are working in the Mandate repo. Read MANDATE_IRL_ENHANCEMENT_PLAN.md sections 0, 1 and 2,
then implement task <TASK-ID> exactly as written.

Rules:
- Read every file listed for the task before editing; if the code differs from the plan, trust the code and tell me.
- Do not weaken any invariant in section 1.
- For items marked VERIFY, check the current PayPal docs before coding and cite what you found.
- Add the tests named in the acceptance criteria and run the Verify commands.
- No placeholders, no fake data, no unrelated refactors.
- Finish with: files changed, tests added/passing, anything unresolved.
```
