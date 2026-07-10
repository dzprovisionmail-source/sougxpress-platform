# SougXpress Mobile Best Practices (React Native)

> Derived from: UI/UX Pro Max - React Native Stack
> Status: Reference Material for apps/mobile/

## 1. Component Architecture
- **Functional Components**: Use hooks-based functional components for all new UI.
- **Small & Focused**: Split large screens into smaller, reusable components (Atomic Design).
- **TypeScript**: Mandatory type safety for props, state, and navigation parameters.

## 2. Styling & Layout
- **StyleSheet Optimization**: Always use `StyleSheet.create` to ensure styles are sent across the bridge only once.
- **Avoid Inline Styles**: Never use inline style objects in render functions to prevent unnecessary re-renders.
- **Flexbox Mastery**: Use `flexDirection`, `alignItems`, and `justifyContent` for all layouts. Avoid absolute positioning unless strictly necessary for overlays.
- **Responsive Design**: Use `useWindowDimensions` or percentage-based scaling instead of fixed pixel values to support varied Android screen sizes.

## 3. List Performance (Critical)
- **FlatList for Large Data**: Always use `FlatList` or `SectionList` for lists over 50 items.
- **Stable Keys**: Use `keyExtractor` with unique, stable IDs (never use array index).
- **Memoization**: Wrap list items in `React.memo` and use `useCallback` for event handlers to maintain 60 FPS during scrolling.

## 4. Interaction & Touch
- **Pressable**: Prefer the `Pressable` component over `TouchableOpacity` for more granular control over touch states.
- **Haptic Feedback**: Use subtle haptics for successful primary actions.
- **Keyboard Handling**: Use `KeyboardAvoidingView` and appropriate `keyboardType` (email, phone-pad, etc.) for all forms.

## 5. Animation (Reanimated)
- **UI Thread**: Run all animations on the UI thread using `react-native-reanimated`.
- **Gesture Handler**: Use `react-native-gesture-handler` for native-feeling interactions like swiping or pinching.

---
*Last updated: 2026-07-10*
