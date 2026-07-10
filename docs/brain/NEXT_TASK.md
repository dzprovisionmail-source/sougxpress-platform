# Next Task

## The Immediate Next Task

**Wait for Founder approval of the Constitution blueprint, the Architecture documents, and the Design System document.**

The Constitution proposal at `docs/v2/CONSTITUTION_PROPOSAL.md` contains a structure and chapter hierarchy (13 articles + Preamble + Closing). The next task is to advance this blueprint toward Founder approval, then write chapters one by one.

## What This Means — Step by Step

### Step 1 — Await Founder Approval
The Founder must approve the blueprint's structure and chapter hierarchy, and answer the 7 open questions (language, numbering, glossary, README relationship, protected articles, versioning, AI self-binding).

### Step 2 — Incorporate Founder Feedback
If the Founder requests structural changes, update the blueprint. If the Founder answers the 7 questions, record the answers in `DECISIONS.md`.

### Step 3 — Finalize the Blueprint
Once the Founder approves the structure and answers the questions, the blueprint is frozen. Record this as a decision in `DECISIONS.md`.

### Step 4 — Write Chapters One by One
Only after blueprint approval, write one chapter at a time. Each chapter requires per-chapter Founder approval before the next begins. The reading order is:

```
Preamble → I → II → III → IV → V → VI → VII → VIII → IX → X → XI → XII → XIII → Closing
```

## What Must NOT Happen

- Do **not** write Constitution chapter content before the blueprint is approved.
- Do **not** write any application code.
- Do **not** design any database schema.
- Do **not** generate any SQL.
- Do **not** touch Supabase.
- Do **not** commit or push without explicit Founder instruction.

## The Sequence After the Constitution

Once the Constitution is ratified, the full development sequence is:

```
Constitution ratified
    ↓
Vision document (formal, derived from Constitution)
    ↓
Architecture document (formal, derived from Vision)
    ↓
Founder Operating System design
    ↓
Database schema (derived from architecture)
    ↓
RLS / Security policies (after schema is frozen)
    ↓
Application implementation (last)
```

Each arrow is a gate. No stage begins until the previous stage is approved by the Founder.

## If You Are a New AI Agent Reading This

Your next action is:

1. Read `00_START_HERE.md` and `AI_HANDOFF.md`.
2. Review the core philosophical foundation in `docs/foundation/`.
3. Review the complete Design System documentation in `docs/design-system/`.
4. Check `DECISIONS.md` for the status of the Constitution blueprint and the frozen architecture.
5. If the blueprint and architecture are approved, proceed to drafting Constitution chapters one by one.
6. If awaiting approval, ask the Founder for feedback on the complete Foundation and Design System.

Do not proceed to any implementation work. The project is in documentation-first mode.

---

*Last updated: 2026-07-10*
