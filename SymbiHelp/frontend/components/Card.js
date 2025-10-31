import React, { useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import FadeInView from './FadeInView';

export default function Card({ children, style, pressable = false, onPress }) {
  const { theme } = useTheme();
  const Container = pressable ? TouchableOpacity : View;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (pressable) {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 5,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (pressable) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 5,
      }).start();
    }
  };

  return (
    <FadeInView>
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Container
          activeOpacity={pressable ? 0.85 : 1}
          onPress={pressable ? onPress : undefined}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder }, style]}
        >
          {children}
        </Container>
      </Animated.View>
    </FadeInView>
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
