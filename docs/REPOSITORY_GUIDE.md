# Repository Guide — SougXpress Platform

> **STATUS:** PERMANENT GOVERNANCE
> Identity: Rules for Repository Consistency and Integrity

---

## 1. Repository Identity

The **SougXpress Platform** repository is the official, active, and single source of truth for all platform development, documentation, and infrastructure.

| Field | Value |
| :--- | :--- |
| **Official Name** | SougXpress Platform |
| **GitHub Repository** | `dzprovisionmail-source/sougxpress-platform` |
| **Primary Branch** | `main` |
| **Legacy Reference** | `dzprovisionmail-source/Soug-XPRESS.` (Historical only) |

---

## 2. Directory Architecture

The repository follows a strict modular structure. Every root directory has a defined purpose and ownership.

| Directory | Ownership | Purpose |
| :--- | :--- | :--- |
| `apps/mobile/` | Mobile Team | Official React Native / Expo application. |
| `docs/` | Architecture/Product | Philosophical, architectural, and design sources of truth. |
| `supabase/` | Backend/Infra | Database migrations, RLS policies, and seed data. |
| `planning/` | Project Management | Backlog, epics, sprints, and release tracking. |
| `packages/` | Core/Design | Shared coded packages and design system implementation. |
| `tooling/` | DevOps/DX | Scripts, CI/CD, linting, and development utilities. |

---

## 3. Governance Rules

### 3.1. Single Source of Truth
- All new development must target this repository.
- The legacy repository is read-only and must never be modified.
- Documentation in `docs/` overrides code in case of conflict.

### 3.2. Path and Naming Standards
- The official mobile path is `apps/mobile`. Never use `apps/mobile-v2` or other temporary names.
- Use `SougXpress` (no hyphen) as the official platform display name.
- Use `sougxpress` (lowercase, no hyphen) for technical identifiers, slugs, and package names.

### 3.3. Documentation Integrity
- All Markdown links must be relative and resolve within the repository.
- Cross-references to the legacy repository are allowed only in historical records (e.g., `MIGRATION_MANIFEST.md`).
- Every major milestone requires a consistency audit to ensure no obsolete references are reintroduced.

### 3.4. Security and Cleanliness
- **Secrets:** Never commit `.env` files, real credentials, or private keys. Use `.env.example` for templates.
- **Exclusions:** The repository must never track `node_modules`, build outputs, local caches, or temporary artifacts.
- **Git History:** Maintain a clean, logical commit history. Avoid force-pushing to protected branches.

---

## 4. Agent and Developer Instructions

1. **Verify Context:** Before starting any task, ensure you are working in the `sougxpress-platform` repository.
2. **Follow the DNA:** Every change must inherit from the foundations defined in `docs/foundation/`.
3. **Commit Separately:** Each logical task must be its own commit with a clear, descriptive message.
4. **Audit on Handoff:** Ensure the repository is synchronized and consistent before ending a session.

---

*Last updated: 2026-07-10 — Manus AI*
