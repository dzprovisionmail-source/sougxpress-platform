# 22 — MICRO-INTERACTIONS

> **STATUS:** PERMANENT ARCHITECTURE
> Identity: Subtle Feedback & Enhanced Usability

---

## 1. Introduction: The Language of Motion

Micro-interactions are small, subtle animations and visual feedbacks that enhance the user experience by providing immediate, intuitive responses to user actions. In Soug-XPRESS V2, they are meticulously designed to reinforce the platform's governance principles, ensuring clarity, responsiveness, and a premium feel, while adhering to Arabic-first (RTL) and dark-mode-first considerations.

---

## 2. General Principles of Motion

### 2.1. Purposeful & Minimal
Every animation must serve a clear purpose (e.g., provide feedback, indicate status, guide attention). Excessive or gratuitous animations are strictly avoided to maintain focus and performance.

### 2.2. Performance-Optimized
Animations are primarily driven by CSS `transform` and `opacity` properties to ensure smooth, GPU-accelerated performance, especially on mobile devices.

### 2.3. Consistent Timing & Easing

| Interaction Type | Duration (ms) | Easing Function | Purpose |
|---|---|---|---|
| **Micro-feedback** (Button press, toggle) | 100-150 | `ease-out` | Immediate response, tactile feel |
| **UI Transitions** (Modal open/close, tab switch) | 200-300 | `ease-in-out` | Smooth, non-jarring state changes |
| **Complex Animations** (Onboarding, data loading) | 400-600 | `cubic-bezier` | Engaging, guided user attention |

### 2.4. Respect for User Preferences
The system must respect the `prefers-reduced-motion` media query, offering a simplified experience for users who prefer less motion.

---

## 3. Key Micro-Interaction Patterns

### 3.1. Button Press

When a button is pressed, it provides immediate visual feedback:
- **Effect**: A subtle scale down (e.g., `scale(0.98)`) or a background color change.
- **Duration**: 100ms, `ease-out`.
- **RTL**: Behavior is identical, ensuring consistent feedback regardless of text direction.

### 3.2. Ripple Effect

Used for touch feedback on certain interactive elements (e.g., list items, cards) to indicate a successful tap.
- **Effect**: A radial ink ripple originating from the touch point.
- **Duration**: 300ms, `ease-in-out`.
- **RTL**: Originates from the touch point, independent of text direction.

### 3.3. Swipe Gestures

Common in mobile interfaces for actions like dismissing notifications or navigating carousels.
- **Effect**: Smooth horizontal translation of the element.
- **Feedback**: Visual cues (e.g., an icon appearing behind the swiped item) indicate the action.
- **RTL**: Swipe direction is mirrored (e.g., swipe left to dismiss in LTR becomes swipe right to dismiss in RTL).

### 3.4. Loading Indicators

Provide feedback during asynchronous operations, preventing user uncertainty.
- **Spinners**: Used for short, indeterminate loading states (e.g., button submission).
- **Skeleton Loaders**: Used for longer, determinate loading states, mimicking the structure of the content to be loaded.
- **Effect**: Subtle, continuous animation for spinners; pulsating or shimmering effect for skeletons.
- **RTL**: Animations are direction-agnostic or mirrored if they imply direction.

### 3.5. Pull to Refresh

A standard mobile gesture for refreshing content lists.
- **Effect**: A subtle pull-down animation revealing a loading spinner or icon.
- **Feedback**: Haptic feedback on release.
- **RTL**: Behavior is identical.

### 3.6. Success & Error Feedback

Immediate visual confirmation for critical actions.
- **Toasts**: Transient, non-blocking messages appearing from the top or bottom of the screen.
- **Effect**: Slide-in/slide-out animation.
- **RTL**: Positioned consistently (e.g., top-right for LTR, top-left for RTL) or centrally.

### 3.7. Empty State Animations

When a list or section has no content, a subtle animation can make the empty state more engaging.
- **Effect**: Gentle fade-in of an illustration or message.
- **Purpose**: Reduces perceived emptiness, guides user to next action.

### 3.8. Card Hover (Web/Desktop Only)

For web-based interfaces (e.g., Founder OS dashboard), hover states provide interactive feedback.
- **Effect**: Subtle elevation (box-shadow), slight scale increase, or background highlight.
- **Duration**: 150ms, `ease-out`.
- **RTL**: Behavior is identical.

### 3.9. Navigation Motion

Transitions between screens or views.
- **Effect**: Horizontal slide for primary navigation, vertical slide for modals/bottom sheets.
- **RTL**: Horizontal slides are mirrored (e.g., slide left to enter new screen in LTR becomes slide right to enter in RTL).

---

*Last updated: 2026-07-10*
