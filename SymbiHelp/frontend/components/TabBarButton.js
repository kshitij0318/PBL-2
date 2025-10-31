import React, { useRef } from 'react';
import { Animated, TouchableWithoutFeedback, View } from 'react-native';

export default function TabBarButton({ children, onPress, accessibilityState }) {
  const scale = useRef(new Animated.Value(1)).current;
  const focused = accessibilityState?.selected;

  const pressIn = () => {
    Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  };
  const pressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={pressIn}
      onPressOut={pressOut}
      onPress={onPress}
      accessibilityState={accessibilityState}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View style={{ paddingTop: 2, paddingBottom: 2, opacity: focused ? 1 : 0.9 }}>
          {children}
        </View>
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}


