import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

export default function SlideInView({
  children,
  delay = 0,
  duration = 500,
  style,
  from = 'bottom', // 'left', 'right', 'top', 'bottom'
  distance = 50,
}) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const translateStart = {
      left: [-distance, 0, 0],
      right: [distance, 0, 0],
      top: [0, -distance, 0],
      bottom: [0, distance, 0],
    }[from];

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        delay,
        useNativeDriver: true,
      }),
    ]).start();

    return () => {
      slideAnim.setValue(0);
      fadeAnim.setValue(0);
    };
  }, [slideAnim, fadeAnim, duration, delay, from, distance]);

  const transform = {
    left: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] }) }],
    right: [{ translateX: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
    top: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [-distance, 0] }) }],
    bottom: [{ translateY: slideAnim.interpolate({ inputRange: [0, 1], outputRange: [distance, 0] }) }],
  }[from];

  return (
    <Animated.View style={[{ opacity: fadeAnim, transform }, style]}>
      {children}
    </Animated.View>
  );
}