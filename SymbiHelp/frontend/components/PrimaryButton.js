import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View, Animated } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function PrimaryButton({
  children,
  onPress,
  style,
  loading,
  disabled,
  icon,
  variant = 'primary', // 'primary' | 'outline' | 'ghost'
  size = 'md', // 'sm' | 'md' | 'lg'
  fullWidth = false,
  rightIcon,
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 50,
      bounciness: 5,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 5,
    }).start();
  };

  const handlePress = () => {
    onPress && onPress();
  };
  const { theme } = useTheme();
  const bgByVariant = {
    primary: theme.primary,
    outline: 'transparent',
    ghost: 'transparent',
  };
  const borderByVariant = {
    primary: 'transparent',
    outline: theme.primary,
    ghost: 'transparent',
  };
  const textByVariant = {
    primary: theme.white,
    outline: theme.primary,
    ghost: theme.primary,
  };
  const paddingYBySize = { sm: 10, md: 14, lg: 18 };
  const fontBySize = { sm: 14, md: 16, lg: 18 };

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        style={[
          styles.button,
          {
            backgroundColor: bgByVariant[variant] || theme.primary,
            borderColor: borderByVariant[variant] || 'transparent',
            borderWidth: variant === 'outline' ? 1.5 : 0,
            paddingVertical: paddingYBySize[size] ?? 14,
            shadowColor: theme.shadowColor,
            width: fullWidth ? '100%' : undefined,
          },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textByVariant[variant] || theme.white} />
        ) : (
          <View style={styles.content}>
            {icon}
            <Text style={[styles.text, { color: textByVariant[variant] || theme.white, fontSize: fontBySize[size] ?? 16 }]}>{children}</Text>
            {rightIcon}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
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
