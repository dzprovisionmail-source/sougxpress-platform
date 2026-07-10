# 02 — DATABASE FOUNDATION

> **STATUS:** PERMANENT ARCHITECTURE — V2 FOUNDATION
> Derived from: Constitution Article VII (Architectural Principles) & Article IV (Founder Operating System)

---

## 1. The Database as a Governance Asset

In Soug-XPRESS V2, the database is not merely a storage layer for an application; it is the **system of record for urban governance**. Every row, every constraint, and every relationship is a reflection of the Platform Constitution.

### 1.1. Governance-First Schema
The schema is designed to ensure that every commercial action in the city is **observable, controllable, and governable** by the Founder. If a transaction cannot be governed, it cannot be stored.

### 1.2. Technology Independence
While the current implementation uses Supabase (PostgreSQL), the architectural foundation is technology-agnostic. The database must satisfy the principles of the Constitution regardless of the underlying engine.

---

## 2. Core Architectural Pillars

### 2.1. Single Source of Truth (SSOT)
Every fact about the platform (users, products, orders, financial constants) has exactly one authoritative location. Redundancy is permitted only for performance (caching) and must never become the source of truth.

### 2.2. Auditability by Design
Every state change in the database must be auditable.
- **Created/Updated timestamps** on every table.
- **Actor attribution**: Every change must be linked to an identity (Human or AI).
- **Soft deletes**: Data is never destroyed; it is marked as inactive to preserve the historical record of the city's commerce.

### 2.3. The "City-Agnostic" Core
No city-specific data (e.g., "Ain Sefra") is hardcoded into the schema structure. The database is a multi-tenant-ready kernel where the city is a configuration, not a limitation.

---

## 3. Data Integrity & Constraints

### 3.1. Relational Integrity
Foreign key constraints are mandatory. The database enforces the commercial ecosystem's logic at the storage level, preventing orphaned records or impossible states (e.g., an order without a merchant).

### 3.2. Financial Precision
All financial values (prices, fees, commissions) must be stored using high-precision types (e.g., `numeric` or `integer` in cents/sub-units) to prevent rounding errors. Floating-point types are strictly forbidden for currency.

---

## 4. Relationship to Founder Operating System

The database is the **kernel memory** of the Founder Operating System.
- **Observability**: The schema must support complex analytical queries for the Founder.
- **Controllability**: The schema must include "override" fields that allow the Founder to bypass standard logic (e.g., manual fee adjustments, account freezes).

---

## 5. Evolution Rules

1. **Documentation Before Migration**: No SQL migration is created until the schema change is documented in `03_DATABASE_SCHEMA.md` and approved.
2. **Additive-Only**: Schema changes should prioritize adding columns/tables over destructive modifications to ensure backward compatibility.
3. **Sealed V1**: The V2 database foundation has zero dependency on V1 schema patterns. It is a clean-slate design based on the V2 Constitution.

---

*Last updated: 2026-07-09*
