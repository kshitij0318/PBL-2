import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { API_URL } from '../utils/config';

const fetchUserProfile = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(`${API_URL}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    // ... rest of the code ...
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to fetch profile. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

const updateProfile = async () => {
  try {
    setIsLoading(true);
    const response = await fetch(`${API_URL}/profile/update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(profileData),
    });
    // ... rest of the code ...
  } catch (error) {
    console.error('Error:', error);
    setError('Failed to update profile. Please try again.');
  } finally {
    setIsLoading(false);
  }
}; 