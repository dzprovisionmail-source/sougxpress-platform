# 14 — DELIVERY & FINANCE MODEL

> **STATUS:** PERMANENT ARCHITECTURE — V2 ECONOMIC ENGINE
> Derived from: Constitution Article VI (Platform Governance) & Article XI (Non-Negotiable Rules)

---

## 1. The Economic Engine of the City

The Delivery and Finance Model is the heartbeat of Soug-XPRESS. It governs how value is created, distributed, and protected within the urban commerce ecosystem. This model is **governed by policy**, not hardcoded in logic.

---

## 2. Financial Governance Principles

### 2.1. Precision & Integrity
- **Sub-unit Storage**: All currency is stored in the smallest possible unit (e.g., cents/centimes) to ensure zero rounding errors.
- **Immutable Ledger**: Every financial movement (payment, fee, payout, refund) is recorded in an immutable transaction ledger.

### 2.2. Founder Financial Sovereignty
The Founder has the **absolute authority** to:
- Set and modify platform commission rates.
- Set and modify delivery fee structures.
- Authorize or veto payouts and refunds.
- Override any automated financial calculation.

---

## 3. Revenue & Fee Structure

The platform operates on a transparent fee model:

| Fee Type | Description | Governance |
|---|---|---|
| **Platform Commission** | A percentage of the merchant's sale. | Set by Founder policy. |
| **Delivery Fee** | Paid by the customer for logistics. | Set by Founder policy (fixed or distance-based). |
| **Service Fee** | Small flat fee per transaction for platform maintenance. | Set by Founder policy. |

---

## 4. Delivery Logistics Model

### 4.1. The Logistics Kernel
Delivery is treated as a governed workflow.
- **Dispatch Logic**: Orders are assigned based on proximity, rating, and efficiency.
- **Observability**: The Founder must be able to see the real-time status of every active delivery.

### 4.2. Delivery Agent Payouts
- Payouts are calculated based on completed deliveries.
- The platform maintains a "Digital Wallet" for each agent, observable via the Delivery Command terminal.

---

## 5. Non-Negotiable Financial Rules

1. **No Autonomous AI Financial Decisions**: AI can suggest fee changes or identify fraud, but it **cannot** execute financial policy changes or payouts without Founder approval (Constitution Article XI.4).
2. **Transparency Mandate**: Every participant must see a clear breakdown of fees before committing to a transaction.
3. **Auditability**: The financial record must be capable of a full audit at any time.

---

## 6. Implementation Gate

1. **Policy First**: Financial constants are stored in a `governance_config` table, not in application code.
2. **Separation of Concerns**: The finance logic is isolated from the marketplace UI to ensure integrity.
3. **No V1 Legacy**: V1's hardcoded financial rules are discarded in favor of this dynamic, policy-driven model.

---

*Last updated: 2026-07-09*
