# 04 — RLS / SECURITY POLICIES

> **STATUS:** PERMANENT ARCHITECTURE — V2 SECURITY MODEL
> Derived from: Constitution Article VI (Platform Governance) & Article XI (Non-Negotiable Rules)

---

## 1. Security as Governance

In Soug-XPRESS V2, security is not just about preventing hacks; it is the **enforcement of the Platform Constitution** at the data layer. Row-Level Security (RLS) is the mechanism that ensures every participant stays within their constitutional role.

---

## 2. The Supremacy of the Founder

### 2.1. The Sovereign Access Rule
The Founder (and authorized delegates) must have **absolute observability**. No RLS policy can block the Founder from viewing any data in the platform. This is a non-negotiable rule derived from Constitution Article XI.7.

### 2.2. The Founder Operating System Kernel
The Founder Operating System operates with a "System Role" that bypasses standard participant restrictions but remains subject to the auditability mandate.

---

## 3. Role-Based Access Control (RBAC)

The platform recognizes four primary roles, each with strictly defined boundaries:

| Role | Access Principle |
|---|---|
| **Founder** | Universal Read/Write (via FOS) |
| **Merchant** | Own data, own products, own orders only |
| **Delivery** | Assigned orders and profile data only |
| **Customer** | Own profile, own orders, public marketplace data only |

---

## 4. Policy Design Principles

### 4.1. Default Deny
The database must operate on a **Default Deny** basis. If an explicit RLS policy does not grant access, access is refused.

### 4.2. Ownership-Based Access
Access to private data (e.g., a customer's address or a merchant's revenue) must be tied to the `user_id` or `merchant_id` of the record.

### 4.3. Transactional Visibility
- **Customers** can only see their own orders.
- **Merchants** can only see orders placed with their shop.
- **Delivery Agents** can only see details of orders currently assigned to them.

---

## 5. AI Security Constraints

### 5.1. Governed AI Access
AI agents (Governed Participants) access the database through specific service roles. They are subject to the same RLS policies as human operators, plus additional "Self-Binding" constraints:
- AI cannot modify financial constants (fees, commissions).
- AI cannot delete audit logs.
- AI cannot override Founder-level flags.

---

## 6. Implementation Gate

1. **Schema First**: RLS policies are only implemented after the database schema in `03_DATABASE_SCHEMA.md` is frozen.
2. **Audit Requirement**: Every policy must be testable and its execution visible in the governance logs of the Founder Operating System.
3. **No Legacy Bypass**: V2 security policies must not be weakened to accommodate V1 code patterns.

---

*Last updated: 2026-07-09*
