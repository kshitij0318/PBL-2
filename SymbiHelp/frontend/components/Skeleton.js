import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function Skeleton({ width = '100%', height = 16, style, radius = 8 }) {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.lightPrimary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonBlock({ lines = 3, lineHeight = 14, gap = 10 }) {
  return (
    <View>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={lineHeight} style={{ marginBottom: i === lines - 1 ? 0 : gap }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
  },
});


