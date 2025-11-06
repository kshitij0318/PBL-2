import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Animated, StyleSheet, Text, View, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const NotificationContext = createContext();

// Notification types with enhanced styling and icons
const NOTIFICATION_CONFIG = {
  success: {
    backgroundColor: '#10B981',
    borderColor: '#059669',
    icon: 'checkmark-circle',
    iconColor: '#ffffff',
  },
  error: {
    backgroundColor: '#EF4444',
    borderColor: '#DC2626',
    icon: 'alert-circle',
    iconColor: '#ffffff',
  },
  warning: {
    backgroundColor: '#F59E0B',
    borderColor: '#D97706',
    icon: 'warning',
    iconColor: '#ffffff',
  },
  info: {
    backgroundColor: '#3B82F6',
    borderColor: '#2563EB',
    icon: 'information-circle',
    iconColor: '#ffffff',
  },
  forum: {
    backgroundColor: '#8B5CF6',
    borderColor: '#7C3AED',
    icon: 'chatbubbles',
    iconColor: '#ffffff',
  },
  admin: {
    backgroundColor: '#F97316',
    borderColor: '#EA580C',
    icon: 'shield-checkmark',
    iconColor: '#ffffff',
  },
  realtime: {
    backgroundColor: '#06B6D4',
    borderColor: '#0891B2',
    icon: 'flash',
    iconColor: '#ffffff',
  },
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [nextId, setNextId] = useState(0);

  const notify = useCallback((message, type = 'info', options = {}) => {
    const id = nextId;
    setNextId(prev => prev + 1);

    const notification = {
      id,
      message,
      type,
      timestamp: Date.now(),
      duration: options.duration || (type === 'error' ? 5000 : 3000),
      persistent: options.persistent || false,
      action: options.action || null,
      ...options
    };

    setNotifications(prev => [...prev, notification]);

    // Auto-dismiss after duration (unless persistent)
    if (!notification.persistent) {
      setTimeout(() => {
        dismissNotification(id);
      }, notification.duration);
    }

    return id; // Return ID so caller can dismiss manually if needed
  }, [nextId]);

  const dismissNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Enhanced notify functions for different contexts
  const notifySuccess = useCallback((message, options) => notify(message, 'success', options), [notify]);
  const notifyError = useCallback((message, options) => notify(message, 'error', options), [notify]);
  const notifyWarning = useCallback((message, options) => notify(message, 'warning', options), [notify]);
  const notifyInfo = useCallback((message, options) => notify(message, 'info', options), [notify]);
  const notifyForum = useCallback((message, options) => notify(message, 'forum', options), [notify]);
  const notifyAdmin = useCallback((message, options) => notify(message, 'admin', options), [notify]);
  const notifyRealtime = useCallback((message, options) => notify(message, 'realtime', options), [notify]);

  const value = {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo,
    notifyForum,
    notifyAdmin,
    notifyRealtime,
    dismissNotification,
    dismissAll,
    notifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      <View style={{ flex: 1 }}>
        {children}
        <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
      </View>
    </NotificationContext.Provider>
  );
}

// Individual Notification Item Component
function NotificationItem({ notification, onDismiss }) {
  const slideAnim = useRef(new Animated.Value(300)).current; // Start from right
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const config = NOTIFICATION_CONFIG[notification.type] || NOTIFICATION_CONFIG.info;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    // Exit animation
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss(notification.id);
    });
  };

  return (
    <Animated.View
      style={[
        styles.notificationItem,
        {
          backgroundColor: config.backgroundColor,
          borderLeftColor: config.borderColor,
          transform: [{ translateX: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Ionicons 
            name={config.icon} 
            size={20} 
            color={config.iconColor} 
            style={styles.notificationIcon}
          />
          <Text style={styles.notificationText}>{notification.message}</Text>
        </View>
        
        {notification.action && (
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={notification.action.onPress}
          >
            <Text style={styles.actionText}>{notification.action.label}</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <TouchableOpacity 
        style={styles.dismissButton}
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color={config.iconColor} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// Notification Container Component
function NotificationContainer({ notifications, onDismiss }) {
  // Limit to 3 notifications on screen at once for mobile
  const visibleNotifications = notifications.slice(-3);

  return (
    <View style={styles.notificationContainer}>
      {visibleNotifications.map((notification, index) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onDismiss={onDismiss}
          style={{ marginTop: index > 0 ? 8 : 0 }}
        />
      ))}
    </View>
  );
}

export function useNotify() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotify must be used within NotificationProvider');
  return ctx;
}

// Enhanced notification hook with role-based utilities
export function useRoleNotifications() {
  const { notify, notifySuccess, notifyError, notifyWarning, notifyForum, notifyAdmin, notifyRealtime } = useNotify();

  const notifyForumActivity = useCallback((type, message, options = {}) => {
    const configs = {
      'new_post': { message: `📝 ${message}`, type: 'forum' },
      'new_comment': { message: `💬 ${message}`, type: 'forum' },
      'new_like': { message: `❤️ ${message}`, type: 'info' },
      'moderation_alert': { message: `🚨 ${message}`, type: 'admin' },
    };
    
    const config = configs[type] || { message, type: 'info' };
    return notify(config.message, config.type, { ...options, duration: 4000 });
  }, [notify]);

  const notifyAdminAction = useCallback((action, message, options = {}) => {
    const actionConfig = {
      'user_banned': '🚫',
      'user_muted': '🔇',
      'content_flagged': '🏴',
      'content_approved': '✅',
      'user_warned': '⚠️',
    };
    
    const emoji = actionConfig[action] || '🔧';
    return notifyAdmin(`${emoji} ${message}`, { ...options, duration: 4000 });
  }, [notifyAdmin]);

  const notifyNurseAssignment = useCallback((message, options = {}) => {
    return notifyRealtime(`👩‍⚕️ ${message}`, { ...options, duration: 5000 });
  }, [notifyRealtime]);

  const notifyMotherUpdate = useCallback((message, options = {}) => {
    return notifyRealtime(`🤱 ${message}`, { ...options, duration: 5000 });
  }, [notifyRealtime]);

  return {
    notify,
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyForum,
    notifyAdmin,
    notifyRealtime,
    notifyForumActivity,
    notifyAdminAction,
    notifyNurseAssignment,
    notifyMotherUpdate,
  };
}

// Mobile-first responsive styles
const styles = StyleSheet.create({
  notificationContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25, // Account for status bar
    right: 16,
    left: 16,
    zIndex: 9999,
    pointerEvents: 'box-none', // Allow touches to pass through container
  },
  
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    borderRadius: 12,
    borderLeftWidth: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 60,
    maxWidth: screenWidth - 32,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
    } : {
      elevation: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    }),
  },
  
  notificationContent: {
    flex: 1,
    paddingRight: 8,
  },
  
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  
  notificationIcon: {
    marginRight: 8,
    marginTop: 1, // Align with text baseline
  },
  
  notificationText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#ffffff',
    fontWeight: '500',
  },
  
  actionButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
  },
  
  actionText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },
  
  dismissButton: {
    padding: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    width: 28,
    height: 28,
  },
});

// Enhanced legacy compatibility
export const useNotification = useNotify;


