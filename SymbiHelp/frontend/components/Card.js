import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function Card({ children, style, pressable = false, onPress }) {
  const { theme } = useTheme();
  const Container = pressable ? TouchableOpacity : View;
  return (
    <Container
      activeOpacity={pressable ? 0.85 : 1}
      onPress={pressable ? onPress : undefined}
      style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }, style]}
    >
      {children}
    </Container>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
});
