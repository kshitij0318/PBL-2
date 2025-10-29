import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export function Title({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[styles.title, { color: theme.darkText }, style]}>{children}</Text>;
}

export function Subtitle({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[styles.subtitle, { color: theme.secondaryText }, style]}>{children}</Text>;
}

export function Body({ children, style }) {
  const { theme } = useTheme();
  return <Text style={[styles.body, { color: theme.text }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
  },
});


