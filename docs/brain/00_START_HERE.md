# 00 — START HERE

> **This is the mandatory entry point for every AI agent, contributor, or operator who touches Soug-XPRESS.**
> Read this file completely before doing anything else. Then follow the navigation map at the bottom.

---

## What Soug-XPRESS Is

Soug-XPRESS is an **AI-Powered Urban Commerce Operating System** — a platform designed to digitize, connect, and govern the entire commercial ecosystem of a city. It is not a delivery app. It is not a single marketplace. It is an operating system for urban commerce, first deploying in **Ain Sefra, Algeria**, and designed to scale to any city, any country.

## What V2 Means

V2 is the current generation. It represents a strategic pivot from V1's application-centric prototype to a documentation-first operating system. V2 defines the platform's Constitution, Vision, Architecture, Founder Operating System, Business Model, Database, and Application — **in that order** — before any code is written for each layer.

## Why V1 Is Historical Knowledge Only

V1 was a working prototype built as a delivery application. It contains valuable knowledge — validated business rules, UX patterns, and financial constants. But V1 was never architected as an operating system. Its code reflects an app-centric mindset.

**V1 is sealed.** Its code has zero authority over V2 decisions. V2 may reuse ideas and validated patterns from V1, but must not blindly copy V1 code. Where V1 and V2 conflict, V2 documentation wins. V1 is a reference library, not a blueprint.

## Why the Founder Operating System Is the Center

The **Founder Operating System** is the strategic brain of the platform. It replaces the old concept of an "Admin Panel" — a secondary dashboard bolted onto an application. In V2, governance is not a feature; it is the foundation. Every workflow must be **observable, controllable, and governable** by the Founder. No feature ships unless the Founder can see it, measure it, and override it.

The Founder is the sovereign authority. The Founder Operating System is the kernel through which that sovereignty is exercised.

## The Current Phase

**Phase 0 — Foundation and Brain Construction.** The project is in documentation-first mode. No application code is being modified. No SQL is being generated. No Supabase migrations are being created. The focus is on building the permanent project memory (this Brain) and the Platform Constitution.

## Where We Stopped

The Project Brain has been established and committed. A Constitution proposal blueprint exists at `docs/v2/CONSTITUTION_PROPOSAL.md` (structure and chapter hierarchy only — no chapter content written). The Founder has been asked to approve the blueprint and answer 7 open questions. The next action is to await that approval, then draft Constitution chapters one by one.

## What Must Not Be Touched

| Sealed Area | Reason |
|-------------|--------|
| `apps/mobile/` | No React Native modifications until application phase |
| `apps/web/` | No web client modifications until application phase |
| `supabase/` | No Supabase modifications, SQL, or migrations until database phase |
| V1 code (all) | Historical reference only — zero authority, no patching |
| Git | No commits or pushes without explicit Founder instruction (this Brain commit was an explicit instruction) |

## What the Next Task Is

After the Brain is published, the next task is to **draft the Constitution** — the Founder must approve the blueprint at `docs/v2/CONSTITUTION_PROPOSAL.md`, answer the 7 open questions, then chapters are written one at a time with per-chapter approval.

See `NEXT_TASK.md` for the precise next action.

---

## Project Philosophy in One Breath

Soug-XPRESS V2 turns a city's commerce into a governed, observable, and scalable digital ecosystem. Documentation governs code. The Founder governs the platform. AI serves the Founder. V1 is knowledge, not architecture. The Constitution is supreme.

---

## Navigation Map

Read in this order on first encounter:

| Order | File | Purpose |
|-------|------|---------|
| 1 | `00_START_HERE.md` | **You are here.** Orientation, philosophy, rules. |
| 2 | `README.md` | How to use this Brain directory. |
| 3 | `PROJECT_MEMORY.md` | Full cross-session history — what has happened. |
| 4 | `CURRENT_SESSION.md` | What is happening right now and active constraints. |
| 5 | `NEXT_TASK.md` | The precise next action to take. |
| 6 | `DECISIONS.md` | Approved and pending decisions — the locked record. |
| 7 | `CHANGELOG.md` | Chronological record of all changes. |
| 8 | `AI_HANDOFF.md` | Operational guide for any AI agent continuing this project. |

---

*Last updated: 2026-07-09*
