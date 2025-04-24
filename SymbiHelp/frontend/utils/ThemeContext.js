// src/utils/ThemeContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Theme colors
export const lightTheme = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  secondaryText: '#666',
  placeholder: '#A0A0A0',
  cardBorder: '#E0E5F0',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  cardBackground: '#FFFFFF',
  headerBackground: '#FFFFFF',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#E0E5F0',
  shadowColor: '#000000',
};

export const darkTheme = {
  primary: '#7A7FFC',
  lightPrimary: '#2A2D4D',
  lightBackground: '#121212',
  white: '#1E1E1E',
  text: '#E0E0E0',
  darkText: '#FFFFFF',
  secondaryText: '#A0A0A0',
  placeholder: '#666666',
  cardBorder: '#2A2A2A',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
  cardBackground: '#1E1E1E',
  headerBackground: '#1E1E1E',
  tabBarBackground: '#1E1E1E',
  tabBarBorder: '#2A2A2A',
  shadowColor: '#000000',
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Load saved theme preference
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('themePreference');
      if (savedTheme !== null) {
        setIsDarkMode(savedTheme === 'dark');
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

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}; 