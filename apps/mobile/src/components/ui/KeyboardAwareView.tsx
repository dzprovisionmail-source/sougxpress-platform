import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface KeyboardAwareViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollable?: boolean;
  keyboardVerticalOffset?: number;
  behavior?: "height" | "position" | "padding";
  keyboardShouldPersistTaps?: "always" | "never" | "handled";
  showsVerticalScrollIndicator?: boolean;
  keyboardDismissMode?: "none" | "on-drag" | "interactive";
}

/**
 * Shared keyboard boundary for forms and bottom actions.
 * Android uses resize so content remains scrollable instead of being panned
 * under the IME; iOS keeps the standard padding behavior.
 */
export const KeyboardAwareView: React.FC<KeyboardAwareViewProps> = ({
  children,
  style,
  contentContainerStyle,
  scrollable = false,
  keyboardVerticalOffset,
  behavior,
  keyboardShouldPersistTaps = "handled",
  showsVerticalScrollIndicator = false,
  keyboardDismissMode = "on-drag",
}) => {
  const insets = useSafeAreaInsets();
  const offset = keyboardVerticalOffset ?? (Platform.OS === "ios" ? insets.top : 0);
  const bottomInset = Math.max(insets.bottom, 16);

  return (
    <KeyboardAvoidingView
      behavior={behavior ?? (Platform.OS === "ios" ? "padding" : "height")}
      keyboardVerticalOffset={offset}
      style={[styles.flex, style]}
    >
      {scrollable ? (
        <ScrollView
          keyboardShouldPersistTaps={keyboardShouldPersistTaps}
          showsVerticalScrollIndicator={showsVerticalScrollIndicator}
          keyboardDismissMode={keyboardDismissMode}
          contentContainerStyle={[{ paddingBottom: bottomInset, flexGrow: 1 }, contentContainerStyle]}
        >
          {children}
        </ScrollView>
      ) : (
        children
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
});

export default KeyboardAwareView;
