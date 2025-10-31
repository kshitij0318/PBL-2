import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import { Animated, Easing } from 'react-native';

const ToastContext = createContext();

export function ToastProvider({ children, renderDefault }) {
  const [queue, setQueue] = useState([]);
  const [current, setCurrent] = useState(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const position = useRef(new Animated.Value(30)).current;

  const show = useCallback((message, options = {}) => {
    setQueue(prev => [...prev, { id: Date.now().toString(), message, options }]);
  }, []);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(position, { toValue: 30, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => setCurrent(null));
  }, [opacity, position]);

  useEffect(() => {
    if (current || queue.length === 0) return;
    const next = queue[0];
    setCurrent(next);
    setQueue(prev => prev.slice(1));

    opacity.setValue(0);
    position.setValue(30);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(position, { toValue: 0, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();

    const duration = next.options.duration ?? 2500;
    const timer = setTimeout(() => hide(), duration);
    return () => clearTimeout(timer);
  }, [current, queue, opacity, position, hide]);

  const value = { show };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Portal */}
      <Animated.View
        pointerEvents={current ? 'auto' : 'none'}
        style={{
          position: 'absolute',
          bottom: 40,
          left: 20,
          right: 20,
          opacity,
          transform: [{ translateY: position }],
        }}
      >
        {current ? (current.options.render ? current.options.render(current.message, hide) : renderDefault?.(current.message, hide)) : null}
      </Animated.View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}


