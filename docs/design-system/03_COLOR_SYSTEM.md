# 03 — COLOR SYSTEM

> **STATUS:** PERMANENT ARCHITECTURE
> Optimized for: Dark Mode First & High Contrast

---

## 1. Semantic Palette

Soug-XPRESS V2 uses a semantic color system. Developers and designers must use **tokens**, never raw hex codes.

### 1.1. Core Brand Colors
| Token | Hex (Dark) | Purpose |
|---|---|---|
| `brand-primary` | `#00E5FF` | The "Electric Blue" of the OS. Primary actions. |
| `brand-secondary`| `#7C4DFF` | Deep Purple. Secondary branding and AI accents. |
| `brand-accent` | `#FFAB40` | Warm Orange. Social commerce and highlights. |

### 1.2. Functional / Feedback Colors
| Token | Hex | Purpose |
|---|---|---|
| `status-success` | `#00C853` | Completed orders, successful payments. |
| `status-error` | `#D50000` | Failed actions, critical alerts. |
| `status-warning` | `#FFD600` | Pending actions, warnings. |
| `status-info` | `#2979FF` | Informational messages. |

---

## 2. Neutral Palette (Dark Mode First)

The background system is built on deep blacks and greys to ensure depth and hierarchy.

| Token | Hex | Usage |
|---|---|---|
| `bg-base` | `#000000` | Pure black for OLED efficiency. |
| `bg-surface` | `#121212` | Primary surface for cards and containers. |
| `bg-elevated` | `#1E1E1E` | Secondary elevation for modals and popovers. |
| `border-subtle` | `#2C2C2C` | Subtle dividers and component borders. |

---

## 3. Typography Colors

| Token | Hex | Usage |
|---|---|---|
| `text-primary` | `#FFFFFF` | Main headings and body text. |
| `text-secondary` | `#B0B0B0` | Captions, labels, and secondary info. |
| `text-disabled` | `#4F4F4F` | Non-interactive or disabled states. |
| `text-on-brand` | `#000000` | Text on primary brand buttons. |

---

## 4. Accessibility & Contrast

- **Minimum Contrast**: All text/background combinations must meet **WCAG 2.1 AA** (4.5:1).
- **Target Contrast**: For critical governance information in the Founder OS, we target **WCAG AAA** (7:1).
- **Color-Blindness**: Information must never be conveyed by color alone. Icons or text labels must accompany status colors.

---

*Last updated: 2026-07-10*
