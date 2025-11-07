import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

// Create the auth context
const AuthContext = createContext();

// Auth provider component
export const AuthProvider = ({ children }) => {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true); // Start with loading true

  // Load user info from AsyncStorage on app start
  useEffect(() => {
    loadUserInfo();
  }, []);

  const loadUserInfo = async () => {
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (userInfoString) {
        const userData = JSON.parse(userInfoString);
        setUserInfo(userData);
        console.log('AuthContext: Loaded userInfo from AsyncStorage:', userData);
      } else {
        console.log('AuthContext: No userInfo found in AsyncStorage');
      }
    } catch (error) {
      console.error('AuthContext: Error loading userInfo from AsyncStorage:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign In
  const signIn = async (email, password) => {
    setLoading(true);
    try {
      // Add timeout to fetch request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 401 && response.status !== 400) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const userData = {
          token: data.token,
          email: data.user.email,
          full_name: data.user.full_name,
          role: data.user.role,
          is_admin: data.user.is_admin,
          id: data.user.id,
        };
        setUserInfo(userData);
        // Store userInfo in AsyncStorage
        await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
        console.log('AuthContext: Stored userInfo in AsyncStorage:', userData);
        console.log('AuthContext: User role:', data.user.role);
        console.log('AuthContext: User is_admin:', data.user.is_admin);
        return { 
          success: true, 
          role: data.user.role, 
          is_admin: data.user.is_admin,
          user: userData
        };
      } else {
        return { 
          success: false, 
          error: data.message || 'Login failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      } else if (error.message?.includes('Network request failed')) {
        errorMessage = `Cannot connect to server at ${API_URL}. Please ensure the backend is running and accessible.`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return { 
        success: false, 
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Up
  const signUp = async (fullName, email, password, role = 'mother', nurseCredential = null) => {
    setLoading(true);
    try {
      const requestBody = {
        email: email,
        password: password,
        full_name: fullName,
        role: role,
      };
      
      // Include nurse credential if provided
      if (role === 'nurse' && nurseCredential) {
        requestBody.nurse_credential = nurseCredential;
      }
      
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const userData = {
          token: data.token,
          email: data.user.email,
          full_name: data.user.full_name,
          role: data.user.role,
          is_admin: data.user.is_admin,
          id: data.user.id,
        };
        setUserInfo(userData);
        // Store userInfo in AsyncStorage
        await AsyncStorage.setItem('userInfo', JSON.stringify(userData));
        console.log('AuthContext: Stored userInfo in AsyncStorage:', userData);
        console.log('AuthContext: User role:', data.user.role);
        console.log('AuthContext: User is_admin:', data.user.is_admin);
        return { 
          success: true,
          user: userData
        };
      } else {
        return { 
          success: false, 
          error: data.message || 'Registration failed. Please try again.'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: 'Network error. Please check your connection and try again.'
      };
    } finally {
      setLoading(false);
    }
  };

  // Handle Sign Out
  const signOut = async () => {
    setUserInfo(null);
    await AsyncStorage.removeItem('userInfo');
    console.log('AuthContext: Cleared userInfo from AsyncStorage');
  };

  // Function to manually restore user session (for testing purposes)
  const restoreUserSession = async () => {
    return { success: false, error: 'No valid session found' };
  };

  return (
    <AuthContext.Provider value={{
      userInfo,
      loading,
      signIn,
      signUp,
      signOut,
      restoreUserSession,
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