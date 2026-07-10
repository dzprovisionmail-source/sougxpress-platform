# SougXpress Accessibility Standards

> Derived from: UI/UX Pro Max - Accessibility Audit
> Status: Reference Material

## 1. Visual Standards
- **Color Contrast**: Maintain a minimum ratio of 4.5:1 for normal text and 3:1 for large text.
- **Color + Meaning**: Never use color as the only way to convey information (e.g., use an error icon alongside a red border).
- **Focus Indicators**: All interactive elements must have a highly visible focus ring or state for keyboard/switch users.

## 2. Screen Reader Optimization (Mobile)
- **Accessibility Labels**: Every icon-only button must have an `accessibilityLabel` (e.g., "Close", "Back", "Search").
- **Roles & Traits**: Assign correct `accessibilityRole` (button, link, header) to help users understand the element's purpose.
- **Live Regions**: Use `accessibilityLiveRegion` to announce dynamic content updates like "Order placed" or "Error occurred".

## 3. Interaction Standards
- **Touch Target Size**: Minimum 44x44pt. This is non-negotiable for primary actions.
- **Gesture Alternatives**: Every gesture-based action (like swipe to delete) must have a visible button alternative for users with motor impairments.
- **Text Scaling**: Ensure the UI supports system-wide font scaling (Dynamic Type) without breaking the layout.

---
*Last updated: 2026-07-10*
