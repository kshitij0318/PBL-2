// src/utils/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dimensions, Platform } from 'react-native';

// Get screen dimensions for responsive design
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Responsive breakpoints
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
  large: 1200,
};

// Device type detection
export const getDeviceType = () => {
  if (screenWidth < BREAKPOINTS.tablet) return 'mobile';
  if (screenWidth < BREAKPOINTS.desktop) return 'tablet';
  return 'desktop';
};

// Responsive utilities
export const responsive = {
  // Responsive font sizes (mobile-first)
  fontSize: {
    xs: screenWidth < BREAKPOINTS.tablet ? 11 : 12,
    sm: screenWidth < BREAKPOINTS.tablet ? 13 : 14,
    base: screenWidth < BREAKPOINTS.tablet ? 15 : 16,
    lg: screenWidth < BREAKPOINTS.tablet ? 17 : 18,
    xl: screenWidth < BREAKPOINTS.tablet ? 19 : 20,
    '2xl': screenWidth < BREAKPOINTS.tablet ? 23 : 24,
    '3xl': screenWidth < BREAKPOINTS.tablet ? 29 : 30,
    '4xl': screenWidth < BREAKPOINTS.tablet ? 35 : 36,
  },
  // Responsive spacing (mobile-first)
  spacing: {
    xs: screenWidth < BREAKPOINTS.tablet ? 4 : 6,
    sm: screenWidth < BREAKPOINTS.tablet ? 8 : 12,
    base: screenWidth < BREAKPOINTS.tablet ? 16 : 20,
    lg: screenWidth < BREAKPOINTS.tablet ? 24 : 32,
    xl: screenWidth < BREAKPOINTS.tablet ? 32 : 48,
    '2xl': screenWidth < BREAKPOINTS.tablet ? 48 : 64,
  },
  // Touch target sizes (minimum 44pt on iOS, 48dp on Android)
  touchTarget: {
    minimum: Platform.OS === 'ios' ? 44 : 48,
    comfortable: Platform.OS === 'ios' ? 48 : 56,
    large: Platform.OS === 'ios' ? 56 : 64,
  },
  // Screen dimensions
  screen: {
    width: screenWidth,
    height: screenHeight,
    isSmall: screenWidth < BREAKPOINTS.tablet,
    isLarge: screenWidth >= BREAKPOINTS.desktop,
  }
};

// Modern healthcare app theme inspired by reference design
export const lightTheme = {
  // Primary teal/green color scheme from reference
  primary: '#20B2AA', // Teal
  primaryDark: '#1A9B94',
  primaryLight: '#4DD0C1',
  secondary: '#FF6B6B', // Coral accent
  secondaryDark: '#FF5252',
  secondaryLight: '#FF8A80',
  
  // Background colors - clean whites and light grays
  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',
  backgroundTertiary: '#F1F3F4',
  
  // Surface colors
  surface: '#FFFFFF',
  surfaceSecondary: '#F8F9FA',
  card: '#FFFFFF',
  
  // Text colors - modern grays
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textMuted: '#D1D5DB',
  textInverse: '#FFFFFF',
  
  // Border colors
  border: '#E5E7EB',
  borderSecondary: '#D1D5DB',
  borderFocus: '#20B2AA',
  
  // Status colors - healthcare appropriate
  success: '#10B981', // Green
  successLight: '#D1FAE5',
  error: '#EF4444', // Red
  errorLight: '#FEE2E2',
  warning: '#F59E0B', // Amber
  warningLight: '#FEF3C7',
  info: '#3B82F6', // Blue
  infoLight: '#DBEAFE',
  
  // Interactive colors
  interactive: '#20B2AA',
  interactiveHover: '#1A9B94',
  interactivePressed: '#17A2B8',
  
  // Shadow colors - subtle and modern
  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  shadowStrong: 'rgba(0, 0, 0, 0.12)',
  
  // Additional healthcare-specific colors
  accent: '#20B2AA',
  accentLight: '#E0F7FA',
  accentDark: '#1A9B94',
  
  // Card and component colors
  cardBackground: '#FFFFFF',
  cardBorder: '#E5E7EB',
  cardShadow: 'rgba(0, 0, 0, 0.04)',
  
  // Button colors
  buttonPrimary: '#20B2AA',
  buttonSecondary: '#F8F9FA',
  buttonText: '#FFFFFF',
  buttonTextSecondary: '#6B7280',
  
  // Input colors
  inputBackground: '#F8F9FA',
  inputBorder: '#E5E7EB',
  inputFocus: '#20B2AA',
  inputText: '#1A1A1A',
  inputPlaceholder: '#9CA3AF',
};

export const darkTheme = {
  // Primary teal/green color scheme for dark mode
  primary: '#20B2AA', // Teal
  primaryDark: '#1A9B94',
  primaryLight: '#4DD0C1',
  secondary: '#FF6B6B', // Coral accent
  secondaryDark: '#FF5252',
  secondaryLight: '#FF8A80',
  
  // Background colors - dark grays
  background: '#0F0F0F',
  backgroundSecondary: '#1A1A1A',
  backgroundTertiary: '#2A2A2A',
  
  // Surface colors
  surface: '#1A1A1A',
  surfaceSecondary: '#2A2A2A',
  card: '#1A1A1A',
  
  // Text colors
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textTertiary: '#808080',
  textMuted: '#4D4D4D',
  textInverse: '#0F0F0F',
  
  // Border colors
  border: '#2A2A2A',
  borderSecondary: '#404040',
  borderFocus: '#20B2AA',
  
  // Status colors
  success: '#10B981',
  successLight: '#064E3B',
  error: '#EF4444',
  errorLight: '#7F1D1D',
  warning: '#F59E0B',
  warningLight: '#78350F',
  info: '#3B82F6',
  infoLight: '#1E3A8A',
  
  // Interactive colors
  interactive: '#20B2AA',
  interactiveHover: '#1A9B94',
  interactivePressed: '#17A2B8',
  
  // Shadow colors
  shadow: '#000000',
  shadowLight: 'rgba(0, 0, 0, 0.3)',
  shadowMedium: 'rgba(0, 0, 0, 0.5)',
  shadowStrong: 'rgba(0, 0, 0, 0.7)',
  
  // Additional healthcare-specific colors
  accent: '#20B2AA',
  accentLight: '#0D4F4A',
  accentDark: '#1A9B94',
  
  // Card and component colors
  cardBackground: '#1A1A1A',
  cardBorder: '#2A2A2A',
  cardShadow: 'rgba(0, 0, 0, 0.3)',
  
  // Button colors
  buttonPrimary: '#20B2AA',
  buttonSecondary: '#2A2A2A',
  buttonText: '#FFFFFF',
  buttonTextSecondary: '#B3B3B3',
  
  // Input colors
  inputBackground: '#2A2A2A',
  inputBorder: '#404040',
  inputFocus: '#20B2AA',
  inputText: '#FFFFFF',
  inputPlaceholder: '#808080',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  console.log('[ThemeContext] ThemeProvider rendering, isDarkMode:', isDarkMode);

  useEffect(() => {
    console.log('[ThemeContext] useEffect triggered');
    // Load saved theme preference
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      console.log('[ThemeContext] Loading theme preference');
      const savedTheme = await AsyncStorage.getItem('themePreference');
      console.log('[ThemeContext] Saved theme preference:', savedTheme);
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
        console.log('[ThemeContext] Set isDarkMode to:', savedTheme === 'dark');
      }
    } catch (error) {
      console.error('Error loading theme preference:', error);
    }
  };

  const toggleTheme = async () => {
    try {
      const newTheme = !isDarkMode;
      setIsDarkMode(newTheme);
      await AsyncStorage.setItem('themePreference', newTheme ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  };

  const theme = isDarkMode ? darkTheme : lightTheme;
  
  console.log('[ThemeContext] Computed theme:', theme);

  // Enhanced theme value with responsive utilities
  const enhancedTheme = {
    ...theme,
    responsive,
    breakpoints: BREAKPOINTS,
    deviceType: getDeviceType(),
    // Helper functions for responsive design
    isSmallScreen: () => responsive.screen.isSmall,
    isLargeScreen: () => responsive.screen.isLarge,
    // Responsive style generators
    responsiveStyle: (mobileStyle, tabletStyle, desktopStyle) => {
      if (responsive.screen.width < BREAKPOINTS.tablet) return mobileStyle;
      if (responsive.screen.width < BREAKPOINTS.desktop) return tabletStyle || mobileStyle;
      return desktopStyle || tabletStyle || mobileStyle;
    },
    // Safe area helpers
    safeArea: {
      top: Platform.OS === 'ios' ? 44 : 24,
      bottom: Platform.OS === 'ios' ? 34 : 0,
    }
  };

  // Ensure theme is always defined
  if (!theme) {
    console.error('[ThemeContext] Theme is undefined, using lightTheme as fallback');
    return (
      <ThemeContext.Provider value={{ 
        theme: { ...lightTheme, responsive, breakpoints: BREAKPOINTS }, 
        isDarkMode: false, 
        toggleTheme 
      }}>
        {children}
      </ThemeContext.Provider>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme: enhancedTheme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  // Ensure theme is always defined
  if (!context.theme) {
    console.warn('[useTheme] Theme is undefined, using lightTheme as fallback');
    return {
      ...context,
      theme: { ...lightTheme, responsive, breakpoints: BREAKPOINTS }
    };
  }
  
  return context;
};

// Hook for responsive utilities
export const useResponsive = () => {
  const { theme } = useTheme();
  return {
    responsive,
    breakpoints: BREAKPOINTS,
    deviceType: getDeviceType(),
    isSmallScreen: responsive.screen.isSmall,
    isLargeScreen: responsive.screen.isLarge,
    responsiveStyle: theme.responsiveStyle,
  };
};

// Common responsive styles helper
export const createResponsiveStyles = (styles) => {
  return typeof styles === 'function' ? styles(responsive) : styles;
}; 