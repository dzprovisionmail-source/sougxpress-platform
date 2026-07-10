# 07 — DESIGN SYSTEM

> **STATUS:** PERMANENT ARCHITECTURE — V2 VISUAL LANGUAGE
> Derived from: Constitution Article VII (Architectural Principles), Article II (Purpose & Identity), Article IV (Founder Operating System), and 06_USER_EXPERIENCE_JOURNEYS.md

---

## 1. Introduction: The Governed Visual Language

The Soug-XPRESS V2 Design System is the single source of truth for all visual and interactive elements across the entire platform. It ensures consistency, accessibility, and reflects the core principles of the Constitution: **governance, clarity, and local relevance**. This system is designed to serve all user roles: Customer, Merchant, Delivery, and the Founder Operating System (FOS).

---

## 2. Core Principles

### 2.1. Clarity & Purpose
Every visual element serves a clear purpose. Design is functional, not merely decorative. Information hierarchy is paramount.

### 2.2. Local-First & Cultural Relevance
The design system must accommodate and celebrate the local culture of Ain Sefra, with a strong emphasis on Arabic-first presentation and Right-to-Left (RTL) compatibility.

### 2.3. Observability & Controllability
For the Founder Operating System, the UI must facilitate immediate observability of platform state and direct controllability over key governance levers.

### 2.4. Accessibility by Design
All components and patterns are built with accessibility in mind, ensuring usability for all participants, regardless of ability or device.

---

## 3. Visual Foundations

### 3.1. Colors

Soug-XPRESS V2 utilizes a palette that balances professionalism with local vibrancy. Colors are semantically named to reflect their purpose (e.g., `primary-brand`, `success-state`, `warning-alert`).

| Category | Usage | Example (Hex) |
|---|---|---|
| **Primary Brand** | Core identity, primary actions | `#007BFF` (Blue) |
| **Accent** | Secondary actions, highlights | `#28A745` (Green) |
| **Neutral** | Text, backgrounds, borders | `#343A40` (Dark Gray) |
| **Feedback** | Success, error, warning, info | `#DC3545` (Red for Error) |

### 3.2. Typography

Readability is key. A clear, legible font family is chosen to support both Latin and Arabic scripts, with a consistent scale for headings, body text, and UI elements.

| Type Scale | Font Family | Weight | Size (px) | Line Height |
|---|---|---|---|---|
| **Display** | Localized Sans-serif | Bold | 48 | 1.2 |
| **Heading 1** | Localized Sans-serif | Bold | 32 | 1.3 |
| **Body Text** | Localized Sans-serif | Regular | 16 | 1.5 |
| **Caption** | Localized Sans-serif | Regular | 12 | 1.4 |

### 3.3. Spacing

A consistent 8-point grid system is used for all spacing (margins, paddings, component gaps) to ensure visual harmony and predictable layouts.

| Token | Value (px) | Usage |
|---|---|---|
| `spacing-xs` | 4 | Smallest gaps, inline elements |
| `spacing-sm` | 8 | Standard component spacing |
| `spacing-md` | 16 | Section padding, larger gaps |
| `spacing-lg` | 24 | Major section separation |

---

## 4. Components & Patterns

### 4.1. Atomic Design Approach
Components are built following an Atomic Design methodology, starting from atoms (buttons, inputs) to molecules (forms, cards) and organisms (headers, footers).

### 4.2. Founder Operating System Specific Components
Beyond standard UI elements, the FOS requires specialized components for governance:
- **Audit Trail Viewer**: Displays immutable logs of all platform actions.
- **Policy Editor**: Interface for the Founder to modify fees, rules, and parameters.
- **Override Switch**: Clearly indicates and executes Founder-level interventions.
- **City Heartbeat Dashboard**: Visualizes real-time commercial activity and key metrics.

### 4.3. Icons

A consistent icon set is used to convey meaning quickly and efficiently. Icons must support both LTR and RTL contexts where applicable (e.g., arrow directions).

### 4.4. Motion & Animation
Subtle, purposeful animations are used to guide user attention and provide feedback, avoiding unnecessary distractions.

---

## 5. Layout & Responsiveness

### 5.1. Responsive Grid System
The layout adapts seamlessly across various screen sizes (mobile, tablet, desktop) using a flexible grid system.

### 5.2. Right-to-Left (RTL) Behavior
All layouts, text alignment, and component mirroring must natively support RTL languages (e.g., Arabic). This is a foundational requirement, not an afterthought.

### 5.3. Dark Mode
A comprehensive dark mode theme is provided, ensuring optimal readability and reduced eye strain in low-light conditions.

---

## 6. Accessibility (A11Y)

### 6.1. WCAG Compliance
All UI elements aim for WCAG 2.1 AA compliance, covering aspects like color contrast, keyboard navigation, and screen reader support.

### 6.2. Semantic HTML & ARIA
Proper semantic HTML5 elements and ARIA attributes are used to enhance the experience for assistive technologies.

---

## 7. Evolution & Governance

### 7.1. Documentation-First
Any new component or pattern must be documented within this Design System before implementation.

### 7.2. Versioning
The Design System will be versioned alongside the platform, with clear guidelines for updates and deprecations.

### 7.3. Founder Approval
Major changes to the visual language, especially those impacting the Founder Operating System, require explicit Founder approval.

---

*Last updated: 2026-07-09*
