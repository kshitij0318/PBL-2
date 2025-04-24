import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { API_URL } from '../utils/config';

const handleLogin = async () => {
  try {
    setIsLoading(true);
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
    // ... rest of the code ...
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to login. Please try again.');
  } finally {
    setIsLoading(false);
  }
}; 