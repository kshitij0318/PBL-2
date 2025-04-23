import { Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Theme Colors
const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  grey: '#A0A0A0',
  darkText: '#1E1E1E',
};

// Common screen options
export const commonScreenOptions = {
  headerStyle: {
    backgroundColor: themeColors.primary,
  },
  headerTintColor: themeColors.white,
  headerTitleStyle: {
    fontWeight: '600',
    fontSize: 18,
  },
  headerBackTitleVisible: false,
  contentStyle: {
    backgroundColor: themeColors.lightBackground,
  },
  headerShadowVisible: false,
  headerBackVisible: true,
  headerBackTitle: '',
  headerBackImageSource: null,
  headerBackImage: () => (
    <Ionicons name="chevron-back" size={24} color={themeColors.white} />
  ),
  animation: Platform.OS === 'ios' ? 'default' : 'none',
  animationDuration: 200,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  fullScreenGestureEnabled: true,
  customAnimationOnGesture: true,
  animationTypeForReplace: 'push',
  presentation: 'card',
  orientation: 'portrait',
  animationType: 'slide',
  animationEnabled: true,
  freezeOnBlur: true,
  screenOrientation: 'portrait',
  statusBarAnimation: 'fade',
  statusBarColor: themeColors.primary,
  statusBarStyle: 'light',
  statusBarTranslucent: true,
  statusBarHidden: false,
};

// Tab navigator options
export const tabNavigatorOptions = {
  headerShown: false,
  tabBarActiveTintColor: themeColors.primary,
  tabBarInactiveTintColor: themeColors.grey,
  tabBarStyle: {
    backgroundColor: themeColors.white,
    borderTopColor: 'transparent',
    paddingBottom: Platform.OS === 'ios' ? 5 : 0,
    height: Platform.OS === 'ios' ? 90 : 60,
  },
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '500',
  },
};

// Stack navigator options
export const stackNavigatorOptions = {
  headerShown: false,
  contentStyle: {
    backgroundColor: themeColors.lightBackground,
  },
  animation: Platform.OS === 'ios' ? 'default' : 'none',
  animationDuration: 200,
  gestureEnabled: true,
  gestureDirection: 'horizontal',
  fullScreenGestureEnabled: true,
  customAnimationOnGesture: true,
  animationTypeForReplace: 'push',
  presentation: 'card',
  orientation: 'portrait',
  animationType: 'slide',
  animationEnabled: true,
  freezeOnBlur: true,
  screenOrientation: 'portrait',
  statusBarAnimation: 'fade',
  statusBarColor: themeColors.primary,
  statusBarStyle: 'light',
  statusBarTranslucent: true,
  statusBarHidden: false,
}; 