import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';

export function DefaultToast({ type = 'info', message, onClose }) {
  const { theme } = useTheme();
  const iconByType = {
    success: 'checkmark-circle',
    error: 'alert-circle',
    info: 'information-circle',
  };
  const colorByType = {
    success: theme.success,
    error: theme.error,
    info: theme.primary,
  };

  const color = colorByType[type] || theme.primary;

  return (
    <View style={[styles.container, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }]}>
      <Ionicons name={iconByType[type] || iconByType.info} size={22} color={color} style={styles.icon} />
      <Text style={[styles.text, { color: theme.darkText }]} numberOfLines={3}>
        {message}
      </Text>
      <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="close" size={20} color={theme.secondaryText} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  icon: { marginRight: 10 },
  text: { flex: 1, fontSize: 14, fontWeight: '500' },
  closeBtn: { marginLeft: 8 },
});


