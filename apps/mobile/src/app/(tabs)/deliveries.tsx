import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/contexts/ThemeContext';

export default function DeliveriesScreen() {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.bgBase }]}>
      <Text style={[styles.text, { color: colors.textPrimary }]}>Deliveries</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  text: { fontSize: 18, fontWeight: '600' },
});
