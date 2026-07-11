# Next Task

## The Immediate Next Task

**Run the migration suite in a real isolated Supabase environment and update the Brain based on the results.**

The 13 migration files have passed static validation. All critical SQL bugs have been corrected. The GitHub Actions workflow (`migration-test.yml`) is created but has not yet been exercised in CI. The next step is to execute the migrations in an actual isolated Supabase (or equivalent PostgreSQL) environment to verify runtime correctness.

Meanwhile, the Constitution proposal at `docs/v2/CONSTITUTION_PROPOSAL.md` remains awaiting Founder approval.

## What This Means — Step by Step

### Step 1 — Runtime Migration Test
Execute all 13 migrations in a real isolated PostgreSQL/Supabase environment. The GitHub Actions workflow (`migration-test.yml`) is ready for CI execution. Manual execution via Docker is also possible.

### Step 2 — Resolve Runtime Issues
If any migration fails at runtime, diagnose and fix. Re-run until all 13 execute without error. Record results in `docs/validation/`.

### Step 3 — Founder Decision on Schema Drift
The validation report documents 70 schema drift points between implemented migrations and the V2 documentation (`03_DATABASE_SCHEMA.md`, `03b_DATABASE_SCHEMA_ADDENDUM.md`). The Founder must decide: keep the current implementation, migrate to the documented schema, or revise the documentation to match the implementation.

### Step 4 — Await Founder Approval on Constitution
The Constitution proposal at `docs/v2/CONSTITUTION_PROPOSAL.md` still awaits Founder approval of structure and answers to 7 open questions.

## What Must NOT Happen

- Do **not** deploy to live Supabase.
- Do **not** request production credentials.
- Do **not** delete or recreate existing production data.
- Do **not** rename roles or business entities unless the Constitution and Brain clearly require it.
- Do **not** write Constitution chapter content before the blueprint is approved.
- Do **not** write any application code.
- Do **not** commit or push without explicit Founder instruction.

## The Updated Development Sequence

```
Static validation PASSED
    ↓
Runtime migration test in isolated environment
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
2. Run the migrations in an isolated environment and record results.
3. Present the schema drift report to the Founder for decision.
4. Do not proceed to Constitution drafting until the Founder approves the blueprint.

---

*Last updated: 2026-07-11*
