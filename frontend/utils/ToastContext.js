import React, { createContext, useContext, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    setToast({ message, type });
    
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(duration),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setToast(null);
    });
  }, [fadeAnim]);

  const hideToast = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setToast(null);
    });
  }, [fadeAnim]);

  const getToastConfig = (type) => {
    const configs = {
      success: {
        backgroundColor: '#4CAF50',
        icon: 'checkmark-circle',
        color: '#FFFFFF',
      },
      error: {
        backgroundColor: '#F44336',
        icon: 'close-circle',
        color: '#FFFFFF',
      },
      warning: {
        backgroundColor: '#FF9800',
        icon: 'warning',
        color: '#FFFFFF',
      },
      info: {
        backgroundColor: '#2196F3',
        icon: 'information-circle',
        color: '#FFFFFF',
      },
    };
    return configs[type] || configs.info;
  };

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-50, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.toast,
              { backgroundColor: getToastConfig(toast.type).backgroundColor },
            ]}
          >
            <Ionicons
              name={getToastConfig(toast.type).icon}
              size={24}
              color={getToastConfig(toast.type).color}
            />
            <Text style={[styles.toastText, { color: getToastConfig(toast.type).color }]}>
              {toast.message}
            </Text>
            <TouchableOpacity onPress={hideToast} style={styles.closeButton}>
              <Ionicons name="close" size={20} color={getToastConfig(toast.type).color} />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 50,
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 10,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  toastText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    marginLeft: 8,
    padding: 4,
  },
});

