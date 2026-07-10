# 04 — TYPOGRAPHY

> **STATUS:** PERMANENT ARCHITECTURE
> Principle: Multilingual Legibility (Arabic & Latin)

---

## 1. Font Families

Soug-XPRESS V2 uses a dual-font strategy to ensure excellence in both Arabic and Latin scripts.

- **Arabic Primary**: `Cairo` or `IBM Plex Sans Arabic`. Chosen for its modern, clean, and highly legible geometric structure.
- **Latin Primary**: `Inter` or `IBM Plex Sans`. A neutral, high-performance sans-serif that complements the Arabic primary.
- **Monospace**: `IBM Plex Mono`. Used for IDs, financial data, and technical logs in the Founder OS.

---

## 2. Type Scale (Fluid)

The type scale is based on a **Major Second (1.125)** ratio to ensure clear hierarchy on mobile devices.

| Token | Size (px/pt) | Weight | Usage |
|---|---|---|---|
| `font-size-xs` | 12 | Regular | Captions, legal, timestamps |
| `font-size-sm` | 14 | Medium | Secondary body, labels |
| `font-size-base`| 16 | Regular | Primary body text |
| `font-size-md` | 18 | SemiBold | Sub-headings, large buttons |
| `font-size-lg` | 20 | Bold | Section headers |
| `font-size-xl` | 24 | Bold | Primary headers |
| `font-size-2xl`| 32 | ExtraBold | Display, hero titles |

---

## 3. RTL Specifics

- **Line Height**: Arabic script requires slightly larger line-heights (1.6 - 1.8) compared to Latin (1.4 - 1.5) to prevent overlapping of diacritics.
- **Letter Spacing**: Letter-spacing (kerning) is generally **zero** for Arabic, as characters are connected.
- **Alignment**: Default alignment is **Right** for Arabic and **Left** for French/English.

---

## 4. Financial Data Display

Financial values in Soug-XPRESS must be:
- **Tabular Numbers**: Use fonts with monospaced numbers to ensure columns of prices align perfectly in the Merchant Terminal and Founder OS.
- **Emphasis**: Currency symbols should be slightly smaller than the numerical value.

---

*Last updated: 2026-07-10*
