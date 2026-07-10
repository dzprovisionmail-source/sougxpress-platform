# Decisions — The Locked Record

## Purpose

This file records every approved decision in Soug-XPRESS V2. Decisions marked **APPROVED** are binding. Decisions marked **FROZEN** are locked and require explicit Founder amendment to change. Proposed but unapproved decisions are listed under Pending.

---

## Approved Decisions

### D-001 — Soug-XPRESS Is Not a Delivery App
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** Soug-XPRESS is not a delivery application. Delivery is one workflow within the platform, not its identity.
- **Rationale:** V1 was built as a delivery app, limiting its scope and architecture. V2 reframes the platform as an operating system for urban commerce.

### D-002 — Soug-XPRESS V2 Is an AI-Powered Urban Commerce Operating System
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** Soug-XPRESS V2 is an AI-Powered Urban Commerce Operating System. This is the platform's identity.
- **Rationale:** The strategic pivot from "application" to "operating system" reflects the ambition to govern an entire city's commercial ecosystem. AI is a governed participant that amplifies the Founder's governance.

### D-003 — Documentation Is the Highest Authority Over Code
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** Documentation is the highest authority over code. No code is written before approved documentation. The Constitution sits above all documentation.
- **Rationale:** V1 was built code-first, leading to undocumented decisions and hardcoded constants. V2 enforces documentation-first engineering.

### D-004 — V1 Is Historical Knowledge Only
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** V1 is sealed as historical reference. Its code has zero authority over V2. V2 may reuse ideas but must not blindly copy code.
- **Rationale:** V1 was a prototype with architectural issues. Its value is in validated business rules and UX patterns, not code structure.

### D-005 — Founder Operating System Replaces the Admin Panel Concept
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** The old "Admin Panel" concept is replaced by the Founder Operating System — the strategic brain and governance kernel of the platform.
- **Rationale:** An admin panel is a feature inside an app. The Founder Operating System is the kernel. Governance must be designed first, not bolted on.
- **Note:** This decision updates the terminology in `docs/v2/00_README.md`, which previously used "Founder Control Center." The approved term is "Founder Operating System."

### D-006 — Database Comes After Platform Architecture
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** The database schema is derived from the platform architecture, not the reverse. No database design begins until architecture is approved.
- **Rationale:** V1 built the database early, producing a schema that reflected app needs rather than platform governance.

### D-007 — Application Implementation Comes Last
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** Application implementation (mobile and web clients) is the final stage — after Constitution, Vision, Architecture, Founder Operating System, Database, and RLS/Security.
- **Rationale:** Building the app first forces all other layers to adapt to the app. Building it last ensures every layer below is deliberate and governed.

### D-008 — Project Brain Established as Permanent Knowledge Base
- **Status:** APPROVED
- **Date:** 2026-07-09
- **Decision:** The `docs/brain/` directory is the permanent AI handoff and project memory system. It contains 8 files that any future AI agent must read to continue the project.
- **Rationale:** Without a persistent memory, each new session risks contradicting prior decisions or re-discovering context. The Brain ensures continuity.

### D-009 — Architecture Foundation Frozen
- **Status:** FROZEN
- **Date:** 2026-07-09
- **Decision:** The 5 core architecture documents (`02_DATABASE_FOUNDATION.md`, `04_RLS_POLICIES.md`, `05_SOCIAL_COMMERCE_STRATEGY.md`, `06_USER_EXPERIENCE_JOURNEYS.md`, `14_DELIVERY_AND_FINANCE_MODEL.md`) are frozen as the permanent architecture of Soug-XPRESS V2.
- **Rationale:** Founder explicitly instructed to freeze these documents as the current foundation before proceeding to the Design System.

---

## Pending Decisions (Awaiting Founder Approval)

### P-001 — Constitution Blueprint Approval
- **Status:** PENDING
- **Date proposed:** 2026-07-09
- **Proposal:** The 13-article Constitution blueprint at `docs/v2/CONSTITUTION_PROPOSAL.md` is proposed for approval.
- **Awaiting:** Founder approval of structure and chapter hierarchy.

### P-002 through P-008 — Constitution Open Questions
- **Status:** PENDING
- **Date proposed:** 2026-07-09
- **Proposals:** The 7 open questions in the Constitution proposal:
  1. **Language:** Arabic, English, French, or bilingual?
  2. **Numbering:** Roman numerals (Article I) or Arabic numerals (Article 1)?
  3. **Glossary:** Separate appendix or inline definitions?
  4. **README relationship:** Mark `docs/v2/00_README.md` as subordinate or revise it to reference the Constitution?
  5. **Protected Articles:** Which articles require heightened deliberation before amendment?
  6. **Versioning:** Semantic versioning (v1.0.0) or simple versioning (v1, v2)?
  7. **AI Self-Binding:** Should the Constitution explicitly bind AI agents to refuse violating actions?
- **Awaiting:** Founder answers before chapter writing begins.

---

## Decision Principles

- **Evidence before decision:** Verify before concluding. Never assume.
- **Reversibility:** Every decision remains reversible until explicitly frozen.
- **Recording:** Every significant decision is documented here with rationale and date.
- **Founder override:** The Founder can override any decision at any tier.
- **No silent decisions:** If something was decided, it is recorded here. If it is not recorded here, it was not decided.

---

*This file is updated only when a decision is approved, frozen, or amended by the Founder.*
