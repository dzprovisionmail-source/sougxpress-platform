# Next Task

## The Immediate Next Task

**Founder decision on schema drift and Constitution approval.**

The 13 migration files have now passed both static validation (previous session) and runtime validation (this session). All critical SQL bugs have been corrected. The runtime validation report has been created and all changes have been committed and pushed to `origin/main`. The migrations are ready for deployment to live Supabase upon Founder authorization.

Meanwhile, the Constitution proposal at `docs/v2/CONSTITUTION_PROPOSAL.md` remains awaiting Founder approval.

## What This Means — Step by Step

### Step 1 — Runtime Migration Test

**COMPLETED.** All 13 migrations executed successfully in an isolated PostgreSQL 16 environment. The runtime validation report at `docs/validation/RUNTIME_VALIDATION_REPORT.md` documents full verification of all database objects (25 tables, 23 foreign keys, 12 functions, 23 triggers, 62 RLS policies, 57 custom indexes, seed data, and financial settings).

### Step 2 — Resolve Runtime Issues

**COMPLETED.** No runtime issues were found. All migrations executed without SQL errors. The runtime verdict is **PASSED**.

### Step 3 — Founder Decision on Schema Drift

The validation report documents 70 schema drift points between implemented migrations and the V2 documentation (`03_DATABASE_SCHEMA.md`, `03b_DATABASE_SCHEMA_ADDENDUM.md`). The Founder must decide: keep the current implementation, migrate to the documented schema, or revise the documentation to match the implementation.

### Step 4 — Await Founder Approval on Constitution

The Constitution proposal at `docs/v2/CONSTITUTION_PROPOSAL.md` still awaits Founder approval of structure and answers to 7 open questions.

## What Must NOT Happen

- Do **not** deploy to live Supabase without explicit Founder authorization.
- Do **not** request production credentials.
- Do **not** delete or recreate existing production data.
- Do **not** rename roles or business entities unless the Constitution and Brain clearly require it.
- Do **not** write Constitution chapter content before the blueprint is approved.
- Do **not** write any application code.
- Do **not** correct the 70 schema drift points without explicit Founder instruction.

## The Updated Development Sequence

```
Static validation PASSED
    ↓
Runtime migration test PASSED
    ↓
Founder decision on schema drift (migrations vs docs)
    ↓
Constitution blueprint approval + answers to 7 questions
    ↓
Constitution chapters (one by one)
    ↓
Vision document (formal, derived from Constitution)
    ↓
Architecture document (formal, derived from Vision)
    ↓
Founder Operating System design
    ↓
Application implementation (last)
```

Each arrow is a gate. No stage begins until the previous stage is approved or validated.

## If You Are a New AI Agent Reading This

Your next action is:

1. Read `00_START_HERE.md`, `AI_HANDOFF.md`, and `CURRENT_SESSION.md`.
2. Present the runtime validation results and schema drift report to the Founder for decision.
3. Do not proceed to Constitution drafting until the Founder approves the blueprint.

---

*Last updated: 2026-07-11*
