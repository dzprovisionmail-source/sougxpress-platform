# SougXpress Motion Guidelines

> Derived from: UI/UX Pro Max - Motion System
> Status: Reference Material

## 1. Animation Tiers

| Tier | Duration | Easing | Use Case |
| :--- | :--- | :--- | :--- |
| **Micro-interaction** | 150-250ms | `power1.out` / `quad.out` | Button press, icon hover, toggle switch. |
| **Standard Transition** | 300-450ms | `power2.out` | Card reveal, modal entry, list stagger. |
| **Complex Reveal** | 500-800ms | `expo.out` / `back.out` | Page transition, hero section entrance. |

## 2. Best Practices for Performance
- **Compositor Thread**: Animate only `opacity` and `transform` (scale, rotate, translate). Avoid animating `width`, `height`, or `top/left` which cause layout reflows.
- **Staggering**: When revealing lists, use a small stagger delay (0.02s - 0.05s) per item to create a "wave" effect without feeling sluggish.
- **Accessibility**: Respect the `prefers-reduced-motion` system setting. If enabled, replace complex animations with simple fades or disable them entirely.

## 3. Specific Patterns
- **Hover/Press**: Keep displacement under 4px. It should feel like a tactile response, not a movement.
- **Scroll Reveal**: Trigger animations when the element is 80-90% into the viewport.
- **Loading**: Use a shimmer (linear gradient sweep) instead of a simple pulse for skeleton screens.

---
*Last updated: 2026-07-10*
