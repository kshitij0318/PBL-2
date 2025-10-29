import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function PrimaryButton({ children, onPress, style, loading, disabled, icon }) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, { backgroundColor: theme.primary, shadowColor: theme.shadowColor }, style]}
    >
      {loading ? (
        <ActivityIndicator color={theme.white} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.text, { color: theme.white }]}>{children}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
