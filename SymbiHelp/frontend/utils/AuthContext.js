import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';
import NotificationService from './NotificationService';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load saved user info on app start
  useEffect(() => {
    checkAuthToken();
  }, []);

  const checkAuthToken = async () => {
    try {
      const jsonValue = await AsyncStorage.getItem('userInfo');
      if (jsonValue != null) {
        const parsedValue = JSON.parse(jsonValue);
        // Verify if the token is still valid
        if (parsedValue.token) {
          setUserInfo(parsedValue);
        } else {
          // If token is invalid, clear storage
          await AsyncStorage.removeItem('userInfo');
          setUserInfo(null);
        }
      } else {
        setUserInfo(null);
      }
    } catch (error) {
      console.error('Error reading auth token:', error);
      setUserInfo(null);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In
  const signIn = async (email, password) => {
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();
      console.log('[AuthContext] API Response:', data); // Log API response

      if (data.status === 'success') {
        const userInfo = {
          token: data.token,
          ...data.user,
        };
        console.log('[AuthContext] UserInfo to be set:', userInfo); // Log userInfo object
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        setUserInfo(userInfo);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.message || 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.'
      };
    }
  };

  // Handle Sign Up
  const signUp = async (fullName, email, password) => {
    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const userInfo = {
          token: data.token,
          ...data.user,
        };
        await AsyncStorage.setItem('userInfo', JSON.stringify(userInfo));
        setUserInfo(userInfo);
        return { success: true };
      } else {
        return { 
          success: false, 
          error: data.message || 'Registration failed'
        };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { 
        success: false, 
        error: 'Network error. Please try again.'
      };
    }
  };

  // Handle Sign Out
  const signOut = async () => {
    try {
      // Unregister push token before signing out
      const token = userInfo?.token;
      if (token) {
        try {
          const pushToken = await NotificationService.getStoredToken();
          if (pushToken) {
            await fetch(`${API_URL}/notifications/unregister-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              body: JSON.stringify({ push_token: pushToken }),
            });
          }
        } catch (error) {
          console.error('Error unregistering push token:', error);
          // Continue with sign out even if token unregistration fails
        }
      }

      await AsyncStorage.removeItem('userInfo');
      await AsyncStorage.removeItem('expoPushToken');
      setUserInfo(null);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      userInfo,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 