import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function Card({ children, style }) {
  const { theme } = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }, style]}>
      {children}
    </View>
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
