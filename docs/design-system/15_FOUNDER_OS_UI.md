# 15 — FOUNDER OS UI

> **STATUS:** PERMANENT ARCHITECTURE
> Identity: The Governance Kernel

---

## 1. Design Objective

The Founder Operating System (FOS) is the most critical interface in the platform. Its design must prioritize **observability, precision, and authority**. It is not a "consumer app"; it is a high-performance command center.

---

## 2. Layout Architecture

### 2.1. The "Command Sidebar"
- **Position**: Left-aligned (mirrored to Right for Arabic).
- **Content**: High-level navigation: Dashboard, Governance, Finance, Participants, AI Agents, Logs.
- **Visual**: Semi-transparent (Glassmorphism) over the `bg-base` to indicate depth.

### 2.2. The "City Heartbeat" Dashboard
- **Real-time widgets**: Active orders, delivery heatmaps, and financial velocity.
- **Visual Language**: Uses `brand-primary` for positive trends and `status-error` for system alerts.

---

## 3. Specialized Components

### 3.1. The Policy Controller
A specialized UI pattern for modifying platform constants (e.g., changing the commission rate from 10% to 12%).
- **Pattern**: `Current Value` → `New Value` → `Rationale (Required)` → `Execute (Founder Veto Protected)`.

### 3.2. The Immutable Audit Log
A dense, monospaced list of every state change in the platform.
- **Features**: Filter by Actor (Human/AI), Timestamp, and Severity.
- **Visual**: Uses `bg-elevated` for log entries to separate them from the main UI.

---

## 4. AI Agent Management Interface

A dedicated section to observe and govern the AI participants.
- **Agent Pulse**: Shows the current "thinking" or task status of the platform AI.
- **Boundary Controls**: Visual toggles to enable/disable specific AI capabilities.
- **Transparency Panel**: Displays the "Reasoning" behind AI-suggested actions.

---

## 5. Security & Intervention

### 5.1. The "Panic Button" (Emergency Stop)
A high-visibility component in the FOS that allows the Founder to pause specific workflows (e.g., "Pause all new orders in Ain Sefra") during a crisis.
- **Visual**: Pulsing `status-error` border.

---

*Last updated: 2026-07-10*
