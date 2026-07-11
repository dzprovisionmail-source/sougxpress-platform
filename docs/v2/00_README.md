# Soug-XPRESS V2 Strategy

## Purpose

This directory contains the complete strategic documentation for the next generation of Soug-XPRESS.

This documentation is intentionally separated from the legacy documentation to allow a clean business-first redesign without affecting the current application.

## Principles

- Business before code
- Documentation before implementation
- Architecture before database
- Database before application
- Security by design
- Founder governability by design
- Hybrid rebuild (not rewrite, not patching)

## Strategic Order

V2 documentation must be produced and approved strictly in this order. No stage may begin before its predecessor is approved by the Founder.

1. **Vision** — the purpose, scope, and ambition of Soug-XPRESS as an AI-Powered Urban Commerce Operating System.
2. **Business Model** — the revenue streams, financial constants, and unit economics that govern every role.
3. **Founder Operating System** — the strategic brain of the platform; defined before any other workflow.
4. **Platform Architecture** — the system design that makes every workflow observable, controllable, and governable by the Founder.
5. **Database** — the schema derived from the architecture, not the reverse.
6. **RLS / Security** — row-level security and access policies defined after the schema is frozen.
7. **Application Implementation** — the mobile and web clients built to match the frozen database and security model.

## Hybrid Rebuild

V1 is historical knowledge only. It is not the architecture of V2.

- V2 may reuse ideas, business rules, constants, and validated UX patterns discovered in V1.
- V2 must not blindly copy legacy code.
- New implementation must follow V2 documentation, not V1 file structure.
- Where V1 and V2 conflict, V2 documentation wins.

## Founder Operating System Principle

The Founder Operating System is the strategic brain of Soug-XPRESS.

- Every workflow must be observable, controllable, and governable by the Founder.
- The Founder Operating System is not a secondary dashboard; it is the operating system of the platform.
- No feature ships unless the Founder can see it, measure it, and override it from the Founder Operating System.

## Anti-Agent Rules

- Never invent missing documents.
- Never fill strategic docs without explicit Founder approval.
- Never treat V1 code as final architecture.
- Never patch legacy files when the task belongs to V2 architecture.
- Never execute SQL, modify Supabase, or touch application code without explicit instruction.

## Documents

00_README.md

02_DATABASE_FOUNDATION.md

03_DATABASE_SCHEMA.md

03b_DATABASE_SCHEMA_ADDENDUM.md

03c_MARKET_INTERFACE_SCHEMA.md

04_RLS_POLICIES.md

05_SOCIAL_COMMERCE_STRATEGY.md

06_USER_EXPERIENCE_JOURNEYS.md

14_DELIVERY_AND_FINANCE_MODEL.md

---

Status:

Database Implementation Phase

No application code modified.

SQL generated.

Supabase migrations created.

No React Native refactoring.

The financial model described in this documentation is considered:

**MVP working assumption — pending business validation.**

---
*Last updated: 2026-07-11*
