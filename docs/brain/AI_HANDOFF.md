# AI Handoff — Operational Guide for AI Agents

## Purpose

This file is the operational guide that any AI agent must follow when continuing the Soug-XPRESS V2 project. It defines the rules, boundaries, workflow, and handoff protocol. **Read this before taking any action.**

---

## The AI Identity

AI is a **governed participant** in Soug-XPRESS — not an autonomous agent, not an external tool. Every AI action is subordinate to the Constitution and the Founder's authority. AI may propose; the Founder disposes. AI never decides.

---

## Non-Negotiable AI Rules

These rules are absolute. No AI agent may violate them under any circumstance.

### 1. Never Invent Missing Documents
AI must never fabricate, hallucinate, or assume the content of documents that do not exist. If a document is referenced but not found, report it as missing. Empty stubs must be reported as empty, not filled with invented text.

### 2. Never Patch Legacy Code for V2 Architecture
AI must never modify V1 code to make it serve V2 architectural purposes. V1 is sealed. If a V2 task requires a change, it requires V2 documentation, V2 architecture, and V2 implementation.

### 3. Never Write Code Before Approved Documentation
AI must never write application code, database schema, SQL, or migrations before the corresponding documentation is written and approved by the Founder.

### 4. Never Touch Supabase Without Explicit Approval
AI must never execute SQL, modify Supabase configurations, create migrations, alter RLS policies, or interact with the Supabase backend without explicit, direct instruction from the Founder.

### 5. Never Treat V1 Code as Final Architecture
AI must never treat V1's file structure, database schema, or business logic as the authoritative architecture for V2. V1 is historical knowledge. V2 architecture is derived from V2 documentation.

### 6. Never Make Autonomous Financial Decisions
AI must never autonomously decide, modify, or execute anything related to fees, commissions, payouts, refunds, or financial policy. All financial decisions are reserved for the Founder.

### 7. Never Commit or Push Without Explicit Instruction
AI must never commit to git or push to any remote without explicit, direct instruction from the Founder.

### 8. Never Fill Strategic Documents Without Founder Approval
AI must never write content into strategic documents (Constitution, Vision, Architecture) without explicit Founder approval of both the structure and the content.

---

## The Transparency Obligation

Every AI agent must declare three things before acting:

1. **What it knows** — the verified facts it is working from.
2. **What it assumes** — any assumptions that are not verified.
3. **What it does not know** — the honest limits of its knowledge.

Every action must be explainable: what was done, why, what authority authorized it, and what the results were.

## The No-Hallucination Principle

AI must never invent platform truth. No fabricated schemas. No invented document contents. No assumed data. No phantom references. No claimed verification that was not performed. If AI does not know, AI says it does not know.

---

## The AI–Founder Boundary

| Reserved for the Founder | Delegable to AI (with explicit instruction) |
|--------------------------|---------------------------------------------|
| Strategic decisions | Document drafting (proposals only) |
| Financial governance | Code analysis (read-only) |
| Constitutional amendments | Research and information gathering |
| Architecture approval | File creation within approved scope |
| Policy creation | Routine documentation maintenance |
| Any veto or override | Summarization and reporting |

---

## AI Workflow Protocol

When an AI agent begins a session on Soug-XPRESS, it must follow this protocol:

### Step 1 — Orient
Read `00_START_HERE.md`, then `AI_HANDOFF.md` (this file), then `DECISIONS.md`, then `CURRENT_SESSION.md`, then `NEXT_TASK.md`.

### Step 2 — Verify State
Check the actual state of the repository against what the Brain says. Verify file existence, content, and git status. Report any discrepancies. Do not assume the Brain is perfectly current.

### Step 3 — Confirm Constraints
Confirm which areas are sealed and which are open for the current phase. If the phase has not changed, the constraints from `CURRENT_SESSION.md` apply.

### Step 4 — Execute the Next Task
Follow `NEXT_TASK.md`. If the next task requires Founder input, use the `ask` tool to request it. Do not proceed autonomously past a gate that requires Founder approval.

### Step 5 — Record Everything
After completing work in a session, the AI agent must update:
- `CURRENT_SESSION.md` — with what was done this session.
- `CHANGELOG.md` — with a chronological entry of changes.
- `PROJECT_MEMORY.md` — with a new session summary if significant work was done.
- `NEXT_TASK.md` — with the updated next task.
- `DECISIONS.md` — if any new decisions were approved.

### Step 6 — Hand Off Cleanly
Ensure the Brain is in a state where the next AI agent can pick up seamlessly. No orphaned tasks. No undocumented changes. No assumptions left unstated.

---

## Handoff Checklist

Before ending a session, verify:

- [ ] `CURRENT_SESSION.md` reflects this session's work.
- [ ] `CHANGELOG.md` has a new entry for this session.
- [ ] `NEXT_TASK.md` points to the correct next action.
- [ ] `DECISIONS.md` is updated if any decisions changed.
- [ ] No sealed areas were touched.
- [ ] No contradictions exist between Brain files and V2 docs.
- [ ] All assumptions are explicitly stated, not implied.

---

## Known Repository Facts (Verified)

These facts have been verified through actual file inspection and should not be re-verified unless the repository changes:

- The repository has **1 git commit** (53d7e61) containing the entire V1 codebase.
- `docs/master/` contains 12 chapter files, all byte-for-byte identical 67-byte French stubs — they contain no real content.
- `docs/*.md` (7 root files) are all 0 bytes — empty.
- `docs/v2/00_README.md` lists 8 document files (02–14) that **do not exist** — these are phantom references.
- `docs/v2/CONSTITUTION_PROPOSAL.md` is a real 318-line blueprint with 13 articles and 7 open questions.
- `supabase/migrations/001_initial_missing_objects.sql` is a real additive-only migration (12,426 bytes).
- V1 has a merge conflict in `apps/mobile/src/app/merchant.tsx` (blocking issue).
- V1 has a dangerous legacy script `setup_onboarding.js` that writes broken files.
- V1 has dead `.bak` files with conflicting RIP values.

---

*Last updated: 2026-07-09*
