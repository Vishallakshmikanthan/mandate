# MANDATE: UI/UX and Frontend Specification

**Companion to:** MANDATE_Implementation_Plan.md
**Team:** VibeSync (Vishal & Sneha)
**Goal:** Make Mandate look and feel like a real, funded SaaS product: glassmorphism, parallax, scroll-driven storytelling, clean information hierarchy, and zero rough edges. Judges should think "this is a company", not "this is a hackathon project".

---

## 1. Design Philosophy

1. **Trust through clarity.** Mandate is a financial safety product. The UI must feel calm, precise, and secure. Beauty supports credibility; it never gets in the way of reading a number or a decision.
2. **Show the invisible.** The product's magic (rules firing, risk scoring, escrow states) is invisible by default. Every screen makes that logic visible and animated.
3. **Motion with meaning.** Animation explains cause and effect (a payment being blocked, money moving into a hold). No decorative motion that doesn't communicate.
4. **One primary action per screen.** Clear hierarchy, generous whitespace, obvious next step.
5. **Dark-first, light-supported.** A deep-space dark theme is the hero look; light theme is a polished alternative.

**Brand personality:** precise, protective, futuristic, calm.
**Tagline:** *Agents can spend money. Mandate makes sure they can't spend it wrongly.*

---

## 2. Visual Design System

### 2.1 Color tokens (dark theme, default)

| Token | Value | Use |
|---|---|---|
| `--bg-base` | `#070A12` | Page background |
| `--bg-elevated` | `#0D1220` | Sections, sidebars |
| `--glass-fill` | `rgba(255,255,255,0.06)` | Glass cards |
| `--glass-fill-strong` | `rgba(255,255,255,0.10)` | Hovered/active glass |
| `--glass-border` | `rgba(255,255,255,0.14)` | 1px glass edges |
| `--text-primary` | `#F4F6FB` | Headings, key numbers |
| `--text-secondary` | `#A8B0C5` | Body, labels |
| `--text-muted` | `#6B7490` | Hints, timestamps |
| `--brand-1` | `#6C7BFF` | Primary (indigo-blue) |
| `--brand-2` | `#22D3EE` | Secondary (cyan) |
| `--brand-3` | `#A78BFA` | Accent (violet) |
| `--success` | `#34D399` | Approved, released |
| `--warning` | `#FBBF24` | Escalated, pending |
| `--danger` | `#F87171` | Blocked, failed |
| `--info` | `#60A5FA` | Informational |

**Brand gradient:** `linear-gradient(135deg, #6C7BFF 0%, #22D3EE 50%, #A78BFA 100%)`
**Aurora background blobs:** 3 large blurred radial gradients (indigo, cyan, violet) at 25-35% opacity, slowly drifting.

### 2.2 Light theme overrides

| Token | Value |
|---|---|
| `--bg-base` | `#F6F8FD` |
| `--glass-fill` | `rgba(255,255,255,0.65)` |
| `--glass-border` | `rgba(20,30,60,0.10)` |
| `--text-primary` | `#0B1020` |
| `--text-secondary` | `#4A546E` |

Respect `prefers-color-scheme`; user toggle persists in localStorage.

### 2.3 Glassmorphism recipe

```css
.glass {
  background: var(--glass-fill);
  backdrop-filter: blur(18px) saturate(160%);
  -webkit-backdrop-filter: blur(18px) saturate(160%);
  border: 1px solid var(--glass-border);
  border-radius: 20px;
  box-shadow:
    0 1px 0 0 rgba(255,255,255,0.08) inset,   /* top highlight */
    0 20px 50px -20px rgba(0,0,0,0.55);        /* depth */
}
.glass:hover { background: var(--glass-fill-strong); }
```

Rules:
- Glass only works over color. Always place cards above aurora blobs or gradient meshes.
- Max 2 nested glass levels (page glass, card glass). Never stack three.
- Add a subtle noise texture overlay (2-3% opacity) to avoid banding.
- Text on glass must pass **WCAG AA contrast**; use `--glass-fill-strong` or a darker tint behind dense text.
- Provide a fallback for browsers without `backdrop-filter` (solid `--bg-elevated` at 92% opacity).
- Performance: limit blurred elements visible at once (about 8); avoid animating blur radius.

### 2.4 Typography

| Role | Font | Weight | Size (desktop) |
|---|---|---|---|
| Display / Hero | Inter Display or Satoshi/Plus Jakarta Sans | 700-800 | 72/80px, tracking -0.03em |
| H1 | same | 700 | 48px |
| H2 | same | 600 | 32px |
| H3 | same | 600 | 22px |
| Body | Inter | 400 | 16px / 1.6 |
| Small / labels | Inter | 500 | 13px |
| Mono (IDs, JSON, amounts) | JetBrains Mono | 500 | 13-14px |

Use `font-variant-numeric: tabular-nums` on all money and counters. Gradient text on hero keywords only (one phrase per screen).

### 2.5 Spacing, radius, elevation

- 4px base grid. Section padding: 120px desktop / 72px mobile.
- Radius: 12px (inputs), 20px (cards), 28px (hero panels), 999px (pills).
- Max content width: 1200px; dashboard fluid with 280px sidebar.
- Elevation via shadow + border brightness, not heavy opacity.

### 2.6 Iconography
Lucide icons, 1.5px stroke, 20px default. Status icons: shield-check, shield-alert, lock, unlock, scale (arbiter), bot, receipt, activity.

### 2.7 Status color language (consistent everywhere)

| State | Color | Icon |
|---|---|---|
| APPROVED / RELEASED | green | check-circle |
| FUNDS_HELD | cyan | lock |
| ESCALATED / PENDING | amber | clock / user-check |
| BLOCKED / REFUNDED | red | shield-alert / undo |
| UNDER_ARBITRATION | violet | scale |

---

## 3. Motion and Animation System

### 3.1 Tooling

| Need | Library |
|---|---|
| Smooth inertial scrolling | **Lenis** |
| Scroll-triggered timelines, pinning, parallax | **GSAP + ScrollTrigger** |
| Component enter/exit, layout, gestures, page transitions | **Framer Motion** |
| Number counters, micro-sequences | Framer Motion `animate` / `useSpring` |
| Optional 3D hero object | Three.js / React Three Fiber (stretch) |
| Lottie for small illustrative loops | `lottie-react` (optional) |

### 3.2 Motion tokens

| Token | Value |
|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` |
| `--ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` |
| `--spring-soft` | stiffness 120, damping 18 |
| `--dur-fast` | 150ms (hover, press) |
| `--dur-base` | 400ms (cards, modals) |
| `--dur-slow` | 800ms (section reveals) |
| `--stagger` | 60-90ms between siblings |

### 3.3 Animation catalogue

| Name | Behavior | Where |
|---|---|---|
| **Aurora drift** | Blurred gradient blobs translate and scale slowly (30-45s loops) | Global background |
| **Fade-up reveal** | Opacity 0→1, y 32→0, ease-out, staggered | Every section heading and card |
| **Parallax layers** | Background, midground, foreground move at 0.2x / 0.5x / 1x scroll speed | Hero, footer CTA |
| **Pinned storytelling** | Section pins while 3-4 steps animate in sequence as you scroll | "How it works" |
| **Horizontal scroll rail** | Vertical scroll drives horizontal card movement | Feature showcase |
| **Counter roll** | Numbers count up when entering viewport | Stats strip, dashboard KPIs |
| **Magnetic buttons** | Primary CTA subtly follows the cursor within 80px | Hero CTA |
| **Tilt cards** | 3D tilt (max 6 degrees) with glare highlight following the cursor | Pricing, feature cards |
| **Gradient border sweep** | Rotating conic-gradient border on hover/focus | Primary cards, input focus |
| **Scroll progress bar** | Thin gradient bar at top | Landing page |
| **Navbar morph** | Transparent → glass pill after 40px scroll, shrinks height | Navbar |
| **Page transitions** | Shared-layout cross-fade + 8px slide | Route changes |
| **Skeleton shimmer** | Gradient sweep on loading placeholders | All data fetches |
| **Toast spring** | Slide-in with spring from bottom-right | Notifications |
| **Block shockwave** | Red radial pulse and shake (6px, 300ms) on BLOCKED event | Attack scenario |
| **Money flow** | Animated particles travel along an SVG path buyer → PayPal hold → seller/refund | Escrow detail, demo |

### 3.4 Reduced motion
`@media (prefers-reduced-motion: reduce)`: disable parallax, pinning, tilt, aurora drift, and magnetic effects; keep simple opacity fades (150ms). Provide an in-app "Reduce motion" toggle in Settings.

### 3.5 Performance budget
- Animate only `transform` and `opacity`.
- `will-change: transform` only on actively animating layers; remove after.
- Lazy-initialize ScrollTrigger sections via IntersectionObserver.
- Target 60fps on a mid-range laptop; Lighthouse Performance ≥ 85, LCP < 2.5s, CLS < 0.1.
- Compress hero media (WebP/AVIF, or mp4/webm loops under 1.5 MB).

---

## 4. Information Architecture and Routes

### 4.1 Public (marketing) routes

| Route | Page | Purpose |
|---|---|---|
| `/` | Landing page | Story, trust, conversion |
| `/how-it-works` | Deep-dive | Three-layer protection explained |
| `/security` | Security and threat model | Credibility for judges |
| `/pricing` | Pricing | SaaS realism (mock tiers) |
| `/demo` | Interactive public demo | One-click run of scenarios, no sign-up needed |
| `/docs` | Documentation hub | API and integration guide |
| `/about` | Team and mission | VibeSync (Vishal & Sneha) |
| `/legal/terms`, `/legal/privacy` | Legal stubs | SaaS completeness |

### 4.2 Auth routes

| Route | Page |
|---|---|
| `/login` | Email + password (or magic link / Google) |
| `/signup` | Account creation |
| `/forgot-password` | Request reset |
| `/reset-password?token=` | Set new password |
| `/verify-email` | Confirmation state |
| `/onboarding` | 4-step setup wizard (see 6.2) |

### 4.3 App (authenticated) routes: `/app/*`

| Route | Page |
|---|---|
| `/app` | Overview dashboard |
| `/app/agents` | Agent registry list |
| `/app/agents/new` | Register agent |
| `/app/agents/[id]` | Agent detail (mandate, activity, spend) |
| `/app/mandates` | Mandates list |
| `/app/mandates/new` | Mandate builder (wizard) |
| `/app/mandates/[id]` | Mandate detail and edit/revoke |
| `/app/payments` | All payment intents (table) |
| `/app/payments/[id]` | Intent detail: rule-by-rule decision |
| `/app/escrows` | Escrow list (kanban/table toggle) |
| `/app/escrows/[id]` | Escrow detail with state diagram and money flow |
| `/app/approvals` | Human approval queue |
| `/app/disputes` | Arbiter verdicts and overrides |
| `/app/audit` | Audit log and chain verification |
| `/app/red-team` | Attack simulator (stretch) |
| `/app/scenarios` | Scripted scenario runner (demo mode) |
| `/app/settings` | Profile, theme, motion, API keys, PayPal connection, webhooks |
| `/app/settings/billing` | Mock billing |
| `/app/notifications` | Notification center |

### 4.4 System routes
`/404` (animated lost-agent illustration), `/500`, `/maintenance`, `/403`.

### 4.5 Navigation structure

**Marketing navbar:** Logo · Product ▾ (How it works, Security, Demo) · Pricing · Docs · [Log in] · [Get started] (primary)
**App sidebar (grouped):**
- Overview
- **Control:** Agents, Mandates
- **Money:** Payments, Escrows, Approvals (badge with count), Disputes
- **Trust:** Audit log, Red-team
- **Demo:** Scenarios
- Footer: Settings, theme toggle, user menu

**Top bar (app):** Breadcrumbs · global search (`Cmd/Ctrl+K` command palette) · environment pill ("Sandbox") · notifications bell · avatar menu.

---

## 5. Landing Page (`/`) Section-by-Section

### 5.0 Global
- Lenis smooth scroll, scroll progress bar, aurora background fixed behind everything, noise overlay.
- Navbar morphs into a glass pill on scroll.

### 5.1 Hero (100vh, parallax)

```
┌──────────────────────────────────────────────────────────────┐
│ [logo]  Product▾  Pricing  Docs         [Log in] [Get started]│
│                                                              │
│            ● Built on PayPal + AI                            │
│                                                              │
│       Agents can spend money.                                │
│       Mandate makes sure they                                │
│       can't spend it ⟨wrongly⟩.      (gradient on "wrongly") │
│                                                              │
│   A financial firewall and AI-arbitrated escrow for          │
│   autonomous agents.                                         │
│                                                              │
│     [ Start free ]   [ ▶ Watch 90s demo ]                    │
│                                                              │
│   ┌───────────── floating glass dashboard preview ─────────┐ │
│   │  timeline • BLOCKED banner • escrow state              │ │
│   └────────────────────────────────────────────────────────┘ │
│        ⌄ scroll                                              │
└──────────────────────────────────────────────────────────────┘
```

**Animation:**
- Headline words reveal one by one (mask slide-up, 70ms stagger).
- Dashboard preview floats in with slight 3D rotation (rotateX 12°→0°) as you scroll; scales from 0.92 to 1.
- Parallax: aurora blobs (0.2x), floating glass chips like "Payment blocked · $900" and "Funds held · $120" (0.6x, different speeds), dashboard (1x).
- Cursor-reactive glow behind the dashboard preview.

### 5.2 Trust strip
"Built with" logos row (PayPal sandbox, chosen AI provider, hosting). Use only logos you are permitted to display; otherwise text labels. Infinite marquee, pauses on hover.

### 5.3 Problem section ("The silent risk")
Three glass cards fade up in sequence:
1. "Agents can be tricked." (prompt injection)
2. "Payments are irreversible." (money gone)
3. "Nobody verifies the work." (pay first, hope later)

Scroll interaction: a red vignette slowly intensifies as the user scrolls through this section, then clears at the next section.

### 5.4 How it works (pinned scrollytelling, the signature section)

Section pins for roughly 400vh. As the user scrolls, a central animated diagram progresses through 4 steps while the left-side copy swaps:

| Step | Copy | Visual |
|---|---|---|
| 1. Set a mandate | "Define what your agent may spend, where, and when." | JSON policy builds line by line, a signature seal stamps |
| 2. Every payment is checked | "Ten deterministic rules and an AI risk scorer." | Intent card passes through rule gates that light up green; one turns red |
| 3. Funds are held, not sent | "PayPal holds the money in escrow." | Money particles flow into a lock icon labelled PayPal Hold |
| 4. AI verifies, then releases | "The Arbiter checks delivery against the spec." | Scale icon, checklist ticks, funds split to seller or return to buyer |

A vertical step indicator on the right fills as progress advances.

### 5.5 Live attack demo (interactive, conversion driver)
A glass terminal panel: "Try to break it." The visitor clicks **[Send malicious instruction]**. The panel animates: injected message appears → agent attempts payment → gateway rules cascade → red **BLOCKED** shockwave with reasons. Works without sign-up (backed by the replay mode so it never fails).

### 5.6 Feature showcase (horizontal scroll rail)
Vertical scroll moves a row of large glass cards horizontally (pinned):
Signed Mandates · Policy Engine · Risk Scorer · PayPal Escrow · AI Arbiter · Hash-chained Audit Log · Human Approvals · Red-team Mode.
Each card has a mini animated illustration and tilt-on-hover.

### 5.7 Stats strip
Four counters that roll up on entry: rules per payment (10), layers of defense (3), PayPal calls made only after approval (100%), audit events hash-chained (every one). Use only real, defensible numbers; swap in measured attack-suite results when available.

### 5.8 Dashboard showcase (parallax tabs)
Tabbed glass frame (Overview / Escrows / Audit) with product screenshots or live-rendered components. Tabs cross-fade; the frame tilts slightly with the cursor.

### 5.9 Use cases
Three cards: Freelance marketplace payments · Procurement agents for small business · Parent-controlled student agents. Hover reveals a short example mandate.

### 5.10 Security section
Split layout: left copy ("Fail closed. Always."), right an animated defense-in-depth diagram (concentric rings that light up inward). Link to `/security`.

### 5.11 Testimonial / team slot
Hackathon-appropriate: "Built by VibeSync" with short team blurbs, or a quote-style card about the design philosophy. Do not fabricate customer testimonials.

### 5.12 Pricing teaser
Three mock tiers (Sandbox free, Pro, Enterprise) clearly labelled as illustrative. Tilt cards, "Most popular" glow on the middle tier.

### 5.13 FAQ
Accordion with animated height and rotating chevron. Questions: What is a mandate? What if the AI is wrong? Does Mandate hold my money? Which PayPal APIs are used? Is this production ready?

### 5.14 Final CTA (parallax footer)
Large gradient headline "Give your agents a spending limit they can't talk their way around." Aurora intensifies, floating glass shapes drift at different speeds. Buttons: [Start free] [View on GitHub].

### 5.15 Footer
Product, Resources, Legal columns, theme toggle, GitHub link, "Built for the Build What's Next with PayPal and AI hackathon".

---

## 6. User Journeys (How the Website Is Traversed)

### 6.1 Visitor → Customer (primary funnel)

```
Landing (/) 
  ├─► scroll story → try attack demo → "Start free"
  ├─► /demo (full interactive run, no account)
  ├─► /how-it-works, /security (credibility)
  └─► /signup → verify email → /onboarding → /app (first mandate created)
```

### 6.2 Onboarding wizard (`/onboarding`)

Full-screen glass card centered, progress dots at top, animated step transitions (slide + fade), "Back" and "Continue" buttons, Skip allowed on optional steps.

| Step | Content | Validation |
|---|---|---|
| 1. Welcome | Name, use case select (Freelance, Procurement, Personal, Just exploring) | Name 2-60 chars; use case required |
| 2. Connect PayPal Sandbox | Button to link sandbox business account, or "Use demo credentials" | Must either connect or choose demo |
| 3. Register first agent | Agent name, description, type (Buyer/Seller) | Name 3-40 chars |
| 4. Create first mandate | Pick a template (Student budget, Small business, Custom) with live JSON preview | Template required |
| Finish | Confetti-free subtle success: checkmark draw animation, "Run your first scenario" CTA | n/a |

Persist progress server-side so refresh doesn't lose state.

### 6.3 Core in-app loop

```
/app (overview) 
  → Agents → Register agent 
  → Mandates → Mandate builder → Sign & activate 
  → Scenarios → Run attack scenario → watch live timeline 
  → Payments → open intent → see rule-by-rule decision 
  → Escrows → open escrow → arbitrate → released/refunded 
  → Audit → verify chain integrity
```

### 6.4 Approval flow
Escalated payment → toast + bell badge + `/app/approvals` count → open card → see reasons and risk score → **Approve** / **Reject** (with required reason) → timeline updates live.

### 6.5 Returning user
Login → `/app` with "Since you were last here" summary card (new blocks, pending approvals, expiring holds).

### 6.6 Kill switch
Persistent red "Pause all agents" button in the top bar (confirmation modal with type-to-confirm "PAUSE"). Instantly revokes active mandates and animates every agent chip to a paused state.

---

## 7. App Screens (Layout and Behavior)

### 7.1 App shell
- Left sidebar (280px, glass, collapsible to 72px icon rail with tooltip labels).
- Top bar (64px, glass, blurs content scrolling beneath).
- Content area with max-width 1400px, 32px padding, page transition on route change.
- Command palette (`Cmd/Ctrl+K`): jump to any page, run scenario, create mandate, search payments by ID.

### 7.2 Overview (`/app`)

```
┌ KPI row (4 glass cards, counters roll) ───────────────────────┐
│ Protected volume │ Payments blocked │ Funds in escrow │ Pending approvals │
└───────────────────────────────────────────────────────────────┘
┌ Live activity timeline (left, 60%) ─┐ ┌ Risk gauge + mini chart ┐
│ ● 12:01 Intent approved $120        │ │  radial gauge (avg risk)│
│ ● 12:02 Funds held (PayPal)         │ │  7-day blocked vs       │
│ ● 12:04 BLOCKED injection attempt   │ │  approved sparkline     │
└─────────────────────────────────────┘ └─────────────────────────┘
┌ Active escrows (cards with state pill + hold countdown) ──────┐
└───────────────────────────────────────────────────────────────┘
┌ Quick actions: New mandate · Run scenario · Register agent ───┐
```
Live updates via SSE; new timeline items slide in from the top with a brief highlight.

### 7.3 Agents list and detail
- List: glass table or card grid toggle; columns: name, type, mandate, status pill, 7-day spend sparkline.
- Detail: header with status and pause/resume, tabs (Activity, Mandate, Spend, Settings). Spend donut chart by merchant category.
- Empty state: illustration of a sleeping bot, "Register your first agent", primary button.

### 7.4 Mandate builder (`/app/mandates/new`), a 5-step wizard with live preview

Layout: form on left, **live JSON + human-readable summary** on right (glass panel), sticky.

| Step | Fields |
|---|---|
| 1. Basics | Mandate name, assign agent, currency, expiry date |
| 2. Limits | Per-transaction cap, daily limit, total budget (sliders with numeric input) |
| 3. Who and what | Allowed counterparties (tag input), blocked counterparties, allowed categories (multi-select chips) |
| 4. Safety | Time window (dual-handle slider), max txns/hour, escalate-above threshold, require escrow toggle |
| 5. Review and sign | Summary, signature preview, "Sign and activate" button with seal animation |

The right panel plain-English sentence updates live: *"This agent may spend up to $200 per transaction and $500 total, only with seller_agent_acme, in freelance_design, between 06:00 and 22:00 UTC. Anything over $100 needs your approval."*

A **Simulate** button lets the user test a hypothetical payment against the draft mandate and see rules pass or fail before activating.

### 7.5 Payments table (`/app/payments`)
- Sticky header, glass rows, filters (status, agent, date range, amount), search, column sort, pagination or infinite scroll, CSV export.
- Row click opens a **slide-over drawer** (right side) with the rule-by-rule decision; "Open full page" link.

### 7.6 Payment detail (decision view)
- Top: amount, counterparty, status pill, timestamp.
- **Rule checklist:** ten rows animate in sequentially (check or cross, detail text).
- **Risk gauge:** semicircle gauge with needle animating to score; flags as chips.
- **Source context:** the message that triggered the payment, with suspicious phrases highlighted in red.
- Footer: PayPal order/authorization IDs (copy buttons) if created.

### 7.7 Escrow detail (`/app/escrows/[id]`)
- **State diagram:** horizontal stepper (Held → Delivered → Arbitration → Released/Refunded) with current node glowing; completed nodes show check.
- **Money flow canvas:** animated particles Buyer → PayPal Hold → Seller (or back).
- **Hold-expiry countdown ring.**
- Tabs: Spec (acceptance criteria), Deliverable, Arbiter verdict (per-criterion pass/fail with evidence), Timeline, Raw PayPal data.
- Actions (contextual): Submit deliverable (seller view), Run arbiter, Human override (with reason).

### 7.8 Approvals queue
Card stack; each card shows amount, reasons, risk score, and two buttons. Keyboard shortcuts (A approve, R reject, J/K navigate). Swipe gesture on mobile.

### 7.9 Disputes
List of arbiter verdicts with confidence meter; filter "Needs human". Detail shows criteria evidence side by side with the deliverable.

### 7.10 Audit log
- Virtualized table, filter by actor/event/date, search.
- **Verify chain** button runs an animation: blocks link together left to right, each lighting green; a broken link (if any) turns red and stops.
- Export JSON.

### 7.11 Scenarios (`/app/scenarios`)
Three big glass cards (Happy Path, Prompt-Injection Attack, Bad Delivery) with a Run button each. Running opens a full-width live stage: left panel agent chat, center decision pipeline, right escrow/money flow, bottom timeline. Playback controls: play, pause, step, speed (1x/2x), "Live" vs "Replay" mode badge.

### 7.12 Red-team (stretch)
Attack library list, "Launch attack run" button, live counters (attempted / blocked / escalated / leaked = must be 0), per-layer bar chart, results table.

### 7.13 Settings
Tabs: Profile · Appearance (theme, reduce motion, density) · PayPal connection (status, test connection button) · API keys (create/revoke, copy-once modal) · Webhooks (URL, last delivery status, send test) · Danger zone (delete account with type-to-confirm).

---

## 8. Input Validation and Forms

### 8.1 Strategy
- **Schema-first:** Zod schemas on the frontend (React Hook Form + `zodResolver`), mirrored by Pydantic models on the backend. Backend is the source of truth; never trust the client.
- **Validate on blur, re-validate on change** once a field has errored. Never show errors before the user has interacted, except on submit.
- **Inline errors** below the field with an icon, red text, and `aria-describedby`; the first invalid field is focused on submit.
- Disable submit only while submitting (not for invalid state, which hides the reason); show loading spinner and prevent double-submit.
- All amounts are entered as decimals in UI, converted to integer minor units before sending.
- Preserve form data on error and on accidental navigation (unsaved-changes prompt).

### 8.2 Field rules

**Auth**
| Field | Rule |
|---|---|
| Email | Required, valid email format, max 254, lowercased and trimmed |
| Password | 10-72 chars, at least 1 letter and 1 number, not in common-password list; live strength meter (weak/ok/strong) |
| Confirm password | Must match |
| Name | 2-60 chars, letters, spaces, hyphens, apostrophes |
| Terms checkbox | Must be checked |

**Agent**
| Field | Rule |
|---|---|
| Name | 3-40 chars, unique per account, `[A-Za-z0-9 _-]` |
| Description | Optional, max 280 chars (live counter) |
| Type | Enum: buyer / seller |

**Mandate**
| Field | Rule |
|---|---|
| Name | 3-60 chars |
| Currency | Enum (USD default; limited list) |
| Per-transaction cap | > 0, ≤ total budget, max 2 decimals, upper bound 1,000,000 |
| Daily limit | ≥ per-transaction cap, ≤ total budget |
| Total budget | > 0, max 2 decimals |
| Escalate-above | > 0 and ≤ per-transaction cap |
| Allowed counterparties | Each 3-64 chars, unique, max 50 entries |
| Categories | At least 1 selected, from fixed list |
| Time window | Start ≠ end; UTC; show local-time equivalent hint |
| Max txns/hour | Integer 1-100 |
| Expiry | Future date, max 12 months ahead |

Cross-field validation messages must be specific: "Daily limit ($100.00) can't be lower than the per-transaction cap ($150.00)."

**Payment simulation**
| Field | Rule |
|---|---|
| Amount | > 0, 2 decimals max |
| Counterparty | Required |
| Category | Required |
| Description | 1-200 chars, plain text only (strip control characters) |

**Deliverable submission**
| Field | Rule |
|---|---|
| Text | 1-20,000 chars |
| File (optional) | Allowed types: txt, md, pdf, png, jpg, zip; max 10 MB; type verified server-side (not just by extension) |

**Human override**
| Field | Rule |
|---|---|
| Decision | Required |
| Reason | Required, 10-500 chars (audit trail needs it) |

**Dangerous actions:** type-to-confirm modals ("PAUSE", account name) with the confirm button disabled until the text matches exactly.

### 8.3 Security-related input handling
- Sanitize and escape all rendered user/agent text (never `dangerouslySetInnerHTML`); render agent messages as plain text with highlight spans built from a safe tokenizer.
- Rate-limit auth and API endpoints; show friendly "Too many attempts, try again in 30s" with a countdown.
- CSRF protection for cookie sessions; secure, httpOnly cookies; short-lived access tokens.
- API keys shown once, masked afterwards (`mk_live_••••a3f9`).
- Server error mapping: backend validation errors (HTTP 422) are mapped back to the matching fields.

### 8.4 Feedback states for every form
Idle → Focused → Valid (subtle green check, optional) → Invalid (red border, message) → Submitting (spinner, fields disabled) → Success (toast and redirect or inline success) → Failure (toast with retry, form data intact).

---

## 9. Component Library

| Component | Notes |
|---|---|
| `GlassCard` | Variants: default, strong, danger, success; optional gradient border sweep |
| `Button` | primary (gradient), secondary (glass), ghost, danger; sizes sm/md/lg; loading state; magnetic option |
| `Input`, `Textarea`, `Select`, `TagInput`, `Slider`, `DualSlider`, `Toggle`, `DatePicker`, `FileDrop` | All with label, hint, error, focus ring (brand gradient, 2px) |
| `StatusPill` | Colored dot + label per status language (2.7) |
| `Stat` | Label, big tabular number, delta chip, sparkline |
| `Timeline`, `TimelineItem` | Actor icon, time, expandable payload |
| `RuleChecklist` | Animated rows |
| `RiskGauge` | SVG semicircle, animated needle |
| `EscrowStepper`, `MoneyFlow` | SVG + particles |
| `DataTable` | Sort, filter, sticky header, virtualization, row actions |
| `Drawer`, `Modal`, `ConfirmModal` | Focus trap, ESC to close, animated |
| `Toast` | Stacked, auto-dismiss 5s, pause on hover |
| `CommandPalette` | `cmdk` based |
| `Tabs`, `Accordion`, `Tooltip`, `Popover`, `Dropdown` | Radix primitives for accessibility |
| `Skeleton` | Shimmer; shapes match final layout |
| `EmptyState` | Illustration, headline, helper text, primary action |
| `CodeBlock` | Mono, copy button, line highlighting |
| `ThemeToggle`, `MotionToggle` | Persisted |

Use **shadcn/ui + Radix** as the accessible base, restyled with the tokens above.

---

## 10. State Handling and Feedback

| State | Treatment |
|---|---|
| Loading (first load) | Skeletons matching layout, never a blank screen or lone spinner |
| Loading (action) | Button spinner + disabled; optimistic UI where safe (not for payments) |
| Empty | Illustrated empty state with one clear CTA |
| Error (recoverable) | Inline message + Retry button |
| Error (fatal) | Full-panel glass error with request ID for support and "Reload" |
| Offline / SSE disconnect | Amber banner "Live updates paused. Reconnecting…" with auto-retry and backoff |
| Success | Toast; for important milestones (mandate signed), an inline animated checkmark |
| Long operations (arbiter running) | Progress with named steps ("Reading deliverable… Checking criterion 2 of 4…") |
| Permission denied | Friendly 403 with link back |

---

## 11. Responsive Design

| Breakpoint | Behavior |
|---|---|
| ≥1280 | Full sidebar, multi-column dashboards |
| 768-1279 | Sidebar collapses to icon rail; two-column grids |
| <768 | Bottom tab bar (Overview, Payments, Escrows, Approvals, More); single column; drawers become bottom sheets; tables become stacked cards |

Mobile adjustments: reduce blur radius (12px) and disable heavy parallax and tilt for performance; pinned scrollytelling becomes simple stacked steps with fade-ins; touch targets ≥44px.

---

## 12. Accessibility (WCAG 2.2 AA target)

- Color contrast ≥ 4.5:1 for text (verify on glass surfaces).
- Full keyboard navigation, visible focus rings, logical tab order, skip-to-content link.
- ARIA live regions for toasts, timeline updates, and blocked events (`aria-live="polite"`; `assertive` for BLOCKED).
- Never rely on color alone: status always has icon + text.
- Reduced motion respected (see 3.4).
- Forms: labels tied to inputs, error summaries, `aria-invalid`.
- Charts have text alternatives and a "view as table" toggle.
- Screen-reader-friendly state diagram (ordered list with current step announced).

---

## 13. Copywriting and Microcopy

- Voice: confident, plain, never fear-mongering.
- Buttons: verbs ("Create mandate", "Run scenario", "Approve payment").
- Error example: "That mandate hasn't been signed yet. Sign it to activate your agent."
- Blocked message: "Blocked: this payment exceeds the per-transaction cap ($200.00) and the counterparty isn't on the allowlist."
- Empty state: "No payments yet. Run a scenario to see Mandate in action."
- Avoid jargon in UI labels; show technical detail (IDs, JSON) in expandable sections.

---

## 14. Frontend Technical Architecture

### 14.1 Stack
Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui + Radix · Framer Motion · GSAP + ScrollTrigger · Lenis · React Hook Form + Zod · TanStack Query (data fetching and cache) · Zustand (small UI state) · Recharts (charts) · cmdk · Lucide icons.

### 14.2 Folder layout
```
frontend/
├── app/
│   ├── (marketing)/
│   │   ├── page.tsx                  # landing
│   │   ├── how-it-works/ security/ pricing/ demo/ docs/ about/
│   ├── (auth)/ login/ signup/ forgot-password/ reset-password/ verify-email/
│   ├── onboarding/
│   ├── app/
│   │   ├── layout.tsx                # shell: sidebar + topbar
│   │   ├── page.tsx                  # overview
│   │   ├── agents/ mandates/ payments/ escrows/
│   │   ├── approvals/ disputes/ audit/ red-team/ scenarios/ settings/
│   ├── not-found.tsx  error.tsx  loading.tsx
├── components/
│   ├── ui/            # primitives (shadcn-based)
│   ├── glass/         # GlassCard, AuroraBackground, NoiseOverlay
│   ├── motion/        # Reveal, Parallax, PinnedSection, Counter, Magnetic, Tilt
│   ├── marketing/     # Hero, HowItWorks, AttackDemo, FeatureRail, ...
│   ├── app/           # Sidebar, Topbar, RuleChecklist, RiskGauge, EscrowStepper, MoneyFlow
│   └── forms/         # MandateWizard, AgentForm, ...
├── lib/
│   ├── api.ts         # typed fetch client
│   ├── schemas/       # Zod schemas
│   ├── sse.ts         # EventSource hook with reconnect
│   ├── money.ts       # decimal <-> minor units
│   └── motion.ts      # tokens and variants
├── hooks/             # useReducedMotion, useTheme, useLiveStream, useHotkeys
├── styles/            # globals.css (tokens, glass, aurora)
└── public/            # optimized media
```

### 14.3 Motion utilities (reusable)
- `<Reveal delay stagger direction>`: wraps children with a viewport-triggered fade-up.
- `<Parallax speed>`: moves a layer relative to scroll using GSAP or `useScroll` + `useTransform`.
- `<PinnedSection steps>`: GSAP ScrollTrigger pin with progress callback driving step state.
- `<Counter to duration>`: spring-based number roll.
- `<Tilt max glare>`: pointer-driven 3D tilt.
- `<Magnetic strength>`: pointer-attracted wrapper.
All utilities internally check `useReducedMotion()` and degrade gracefully.

### 14.4 Data and realtime
- TanStack Query for REST; invalidate on SSE events.
- `useLiveStream()` subscribes to `/api/stream`, auto-reconnects with exponential backoff, exposes connection state to the UI banner.
- Auth: httpOnly cookie session; route protection via middleware redirecting unauthenticated `/app/*` to `/login?next=`.

### 14.5 SEO and sharing (marketing pages)
Metadata and Open Graph images, semantic headings, sitemap, robots, fast LCP with `next/image`, fonts via `next/font`.

---

## 15. Demo-Mode UX (important for judges)

Judges may not want to create an account. Provide:
- **"Try the live demo" button** (landing, navbar, `/demo`) that opens `/app` in a pre-seeded **demo workspace** with sample agents, mandates, payments, and escrows, no sign-up.
- A persistent **"Demo workspace · Sandbox" ribbon** and a "Reset demo data" button.
- Guided tour (spotlight overlay, 6 steps) offered on first entry: Overview → Mandate → Run attack scenario → Payment decision → Escrow → Audit. Skippable, resumable.
- Clear labelling of Live vs Replay mode so the project stays honest.

---

## 16. Build Order for the Frontend

| Order | Deliverable |
|---|---|
| 1 | Design tokens, global CSS (aurora, glass, noise), Tailwind config, base primitives |
| 2 | App shell (sidebar, topbar, command palette), theme + motion toggles |
| 3 | Auth pages and onboarding wizard with validation |
| 4 | Mandate builder wizard with live preview and Simulate |
| 5 | Scenarios page with live stage (this is the demo core), SSE hook |
| 6 | Payment detail (rule checklist, risk gauge), Escrow detail (stepper, money flow) |
| 7 | Overview dashboard, payments table, audit log with chain animation |
| 8 | Landing page: hero, how-it-works pinned section, attack demo, feature rail |
| 9 | Remaining marketing pages, pricing, FAQ, footer |
| 10 | Polish: empty/error states, skeletons, responsive pass, accessibility pass, Lighthouse pass |

If time is short, protect: **Scenarios live stage, payment decision view, landing hero + how-it-works + attack demo**. Those three carry the demo video.

---

## 17. UI Acceptance Checklist

- [ ] Landing page loads under 2.5s LCP and scrolls smoothly at 60fps on a mid-range laptop
- [ ] Hero parallax, pinned how-it-works, and attack demo all work and respect reduced motion
- [ ] Every form validates inline with specific messages; backend 422s map to fields
- [ ] All routes in section 4 exist (stubs acceptable for stretch pages) with proper 404/500 handling
- [ ] Demo workspace works without sign-up
- [ ] BLOCKED event shows shockwave, reasons, and aria-live announcement
- [ ] Dark and light themes both pass contrast checks
- [ ] Mobile layout verified at 375px width
- [ ] No console errors; no layout shift on data load (skeletons match layout)
- [ ] Keyboard-only walkthrough of the core loop succeeds
- [ ] Screenshots and a short GIF captured for README and Devpost

---

*Design for trust. Animate for understanding. Ship for judges.*
