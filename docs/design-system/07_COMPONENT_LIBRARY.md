# 07 — COMPONENT LIBRARY

> **STATUS:** PERMANENT ARCHITECTURE
> Identity: Reusable UI Building Blocks

---

## 1. Introduction: Atomic Design Principles

The Soug-XPRESS V2 Component Library is built on Atomic Design principles, ensuring modularity, reusability, and consistency across all platform interfaces. Each component is a self-contained unit, designed to be accessible, RTL-compatible, and optimized for mobile-first, dark-mode-first environments.

---

## 2. Core Components

### 2.1. Buttons

Buttons are primary interaction elements. They trigger actions and navigate users.

| Variant | Purpose | States | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Primary** | Main call to action | Default, Hover, Pressed, Disabled, Loading | `aria-label`, sufficient contrast | Text alignment, icon mirroring |
| **Secondary** | Less prominent actions | Default, Hover, Pressed, Disabled, Loading | `aria-label`, sufficient contrast | Text alignment, icon mirroring |
| **Ghost** | Minimal visual impact | Default, Hover, Pressed, Disabled, Loading | `aria-label`, sufficient contrast | Text alignment, icon mirroring |
| **Icon Button** | Action represented by icon | Default, Hover, Pressed, Disabled, Loading | `aria-label` is mandatory | Icon mirroring |

### 2.2. Cards

Cards are flexible containers for grouping related content and actions.

| Variant | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Basic Card** | General content display | Product listings, news items | Semantic structure (`article`, `section`) | Content flow (right-to-left) |
| **Interactive Card** | Clickable content | Storefronts, user profiles | `role="button"` or `<a>` tag | Content flow (right-to-left) |

### 2.3. Inputs

Input fields allow users to enter data.

| Type | Purpose | States | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Text Input** | Single-line text entry | Default, Focused, Error, Disabled, Filled | `label` with `for`, `aria-describedby` | Text alignment (right), placeholder position |
| **Text Area** | Multi-line text entry | Default, Focused, Error, Disabled, Filled | `label` with `for`, `aria-describedby` | Text alignment (right), placeholder position |
| **Dropdown (Select)** | Predefined choice selection | Default, Open, Disabled | `label` with `for`, `aria-expanded` | Icon mirroring, menu direction |
| **Search Bar** | Search functionality | Default, Focused, Active (with results) | `aria-label`, `role="search"` | Icon mirroring, text alignment |

### 2.4. Chips & Badges

Small, informative elements.

| Component | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Chip** | Categorization, filtering | Tags, selected filters | `aria-label` for dismissible | Text flow, close icon position |
| **Badge** | Status, count | Notifications, new items | `aria-live` for dynamic updates | Position relative to parent |

### 2.5. Tables & Lists

Structured display of data.

| Component | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Table** | Tabular data | Financial reports, product inventory | `<th>`, `scope`, `aria-sort` | Column order (right-to-left) |
| **List** | Vertical content display | Settings, menu items | Semantic list (`<ul>`, `<ol>`) | Text flow |

### 2.6. Empty States & Loading States

Provide feedback during data fetching or when content is unavailable.

| State | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Empty State** | No content to display | Search results, empty carts | Clear message, optional illustration | Text flow |
| **Loading State** | Data is being fetched | Initial load, data refresh | Skeleton loaders, spinners | Animation direction |
| **Skeleton Loader** | Placeholder for content | Content loading | `aria-busy="true"` | Animation direction |

### 2.7. Dialogs & Modals

Overlay components for critical information or user input.

| Component | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Dialog** | Critical user input, confirmation | Delete confirmation, form submission | `role="dialog"`, focus management | Text flow, button order |
| **Bottom Sheet** | Contextual actions on mobile | Share options, filters | `role="dialog"`, focus management | Content flow |
| **Toast** | Transient feedback | Success/error notifications | `role="status"`, `aria-live="polite"` | Position (top-right/left) |

### 2.8. Status Indicators

Visual cues for status or presence.

| Component | Purpose | Usage | Accessibility | RTL Behavior |
|---|---|---|---|---|
| **Dot Indicator** | Simple status | Online/offline, new message | `aria-label` for status | Position relative to element |
| **Progress Bar** | Task progress | Uploads, loading | `aria-valuenow`, `aria-valuemin`, `aria-valuemax` | Direction of progress (right-to-left) |

---

*Last updated: 2026-07-10*
