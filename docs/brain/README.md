# The Soug-XPRESS Project Brain — README

## What This Is

The `docs/brain/` directory is the **permanent knowledge base and AI handoff system** for Soug-XPRESS V2. It is designed so that any future AI agent can read these files and continue the project without re-reading transcripts, re-discovering context, or re-making decisions that are already locked.

This is not a collection of specifications. It is a **living memory** that persists across sessions, across AI agents, and across team changes. If the project is paused for months and a new agent resumes it, this Brain tells that agent everything it needs to know.

## The 8 Files

| File | Role |
|------|------|
| `00_START_HERE.md` | **Entry point.** Orientation, philosophy, sealed areas, navigation map. Read this first. |
| `README.md` | This file. How to use the Brain. |
| `PROJECT_MEMORY.md` | Cross-session history. What has happened from the beginning to now. |
| `CURRENT_SESSION.md` | What is happening right now. Active phase, active constraints, blocking items. |
| `NEXT_TASK.md` | The precise next action. What to do after reading the Brain. |
| `DECISIONS.md` | Approved and pending decisions. The locked record of what is decided. |
| `CHANGELOG.md` | Chronological audit trail of every significant change. |
| `AI_HANDOFF.md` | Operational guide for AI agents: rules, boundaries, workflow, handoff protocol. |
| `MODULAR_ARCHITECTURE_DEFINITION.md` | Définition de l'architecture modulaire de Soug-XPRESS V2. |
| `NAMING_CONVENTIONS_AND_REUSABLE_COMPONENTS.md` | Conventions de nommage et composants réutilisables. |
| `COMMUNICATION_AND_DEPENDENCY_MAP.md` | Carte de communication et de dépendance. |
| `IMPLEMENTATION_ROADMAP.md` | Feuille de route d'implémentation de production. |

## How to Use This Brain

### If You Are a New AI Agent

1. **Read `00_START_HERE.md` completely.** It orients you to the project, the philosophy, the sealed areas, and what must not be touched.
2. **Read `AI_HANDOFF.md` before doing anything.** It defines your operational rules, boundaries, and the handoff protocol you must follow.
3. **Read `DECISIONS.md`** to understand what is already decided. Do not re-decide what is approved or frozen.
4. **Read `CURRENT_SESSION.md`** to understand the active phase and constraints.
5. **Read `NEXT_TASK.md`** to know the precise next action.
6. **Read `PROJECT_MEMORY.md`** for full historical context if you need it.
7. **Check `CHANGELOG.md`** if you need to know what changed and when.

### If You Are the Founder

- `DECISIONS.md` shows what is locked and what is pending your approval.
- `NEXT_TASK.md` tells you what action awaits your decision.
- `CHANGELOG.md` shows what has changed across all sessions.

### If You Are a Human Contributor

- `00_START_HERE.md` orients you to the project.
- `AI_HANDOFF.md` explains how AI agents are governed — useful for understanding AI-generated work.
- `PROJECT_MEMORY.md` gives you the full history.

## The Golden Rule

**When in doubt, read `00_START_HERE.md`.**

If you are ever uncertain about what to do, what the project is, or what the rules are, go back to the entry point. It will orient you and point you to the correct file.

## Relationship to Other Documentation

| Location | Authority | Status |
|----------|-----------|--------|
| `docs/brain/` | Project memory — operational guide | **Active** (this directory) |
| `docs/v2/CONSTITUTION_PROPOSAL.md` | Constitution blueprint — Tier 0 candidate | Proposed — awaiting Founder approval |
| `docs/v2/00_README.md` | V2 strategy index — subordinate to Constitution | Active — will be superseded by Constitution |
| `docs/master/` | Legacy documentation stubs — empty | Sealed — zero authority |
| `docs/*.md` (root) | V1-era documentation — 0 bytes | Sealed — zero authority |
| `supabase/` | V1 database migration | Sealed — historical reference only |
| `apps/` | V1 application code | Sealed — historical reference only |

The Brain does not override the Constitution. The Constitution, once ratified, will be the supreme authority. The Brain is the operational memory that ensures every agent works from the same understanding.

## Constraints

The Project Brain is the operational memory that ensures every agent works from the same understanding. The following constraints are active for this session:

- No application code modified (`apps/`)
- No commits or pushes without explicit instruction

---

*Last updated: 2026-07-09*
*Brain version: 2.0*
