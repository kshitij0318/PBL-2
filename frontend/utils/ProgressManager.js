// src/utils/ProgressManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';

export const saveTestResult = async (score, riskLevel, details) => {
  try {
    const userInfoJson = await AsyncStorage.getItem('userInfo');
    if (!userInfoJson) {
      throw new Error('No authentication token found');
    }
    
    const userInfo = JSON.parse(userInfoJson);
    if (!userInfo.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/test-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userInfo.token}`
      },
      body: JSON.stringify({
        score,
        risk_level: riskLevel,
        details
      })
    });

    if (!response.ok) {
      throw new Error('Failed to save test result');
    }

    return await response.json();
  } catch (error) {
    console.error('Error saving test result:', error);
    throw error;
  }
};

export const getTestHistory = async () => {
  try {
    const userInfoJson = await AsyncStorage.getItem('userInfo');
    if (!userInfoJson) {
      throw new Error('No authentication token found');
    }
    
    const userInfo = JSON.parse(userInfoJson);
    if (!userInfo.token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_URL}/test-results`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userInfo.token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch test history');
    }

    const data = await response.json();
    return data.test_results;
  } catch (error) {
    console.error('Error loading test history:', error);
    return [];
  }
};

export const saveScore = async (score, total = 15, topics = {}) => {
  console.log('[ProgressManager] Attempting to save score...', { score, total });
  try {
    const userInfoJson = await AsyncStorage.getItem('userInfo');
    if (!userInfoJson) {
      console.error('[ProgressManager] saveScore: No userInfo found in AsyncStorage.');
      throw new Error('No authentication token found');
    }
    
    const userInfo = JSON.parse(userInfoJson);
    if (!userInfo.token) {
      console.error('[ProgressManager] saveScore: No token found in userInfo.');
      throw new Error('No authentication token found');
    }
    console.log('[ProgressManager] saveScore: Sending score to backend...');
    const response = await fetch(`${API_URL}/test-scores`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userInfo.token}`
      },
      body: JSON.stringify({
        score,
        total,
        topics
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ProgressManager] saveScore: Failed API call. Status: ${response.status}, Response: ${errorText}`);
      throw new Error('Failed to save test score');
    }

    const result = await response.json();
    console.log('[ProgressManager] saveScore: Score saved successfully.', result);
    return result;
  } catch (error) {
    console.error('[ProgressManager] saveScore: Error caught.', error);
    throw error;
  }
};

export const getHistory = async () => {
  console.log('[ProgressManager] Attempting to get history...');
  try {
    const userInfoJson = await AsyncStorage.getItem('userInfo');
    if (!userInfoJson) {
      console.error('[ProgressManager] getHistory: No userInfo found in AsyncStorage.');
      throw new Error('No authentication token found');
    }
    
    const userInfo = JSON.parse(userInfoJson);
    if (!userInfo.token) {
      console.error('[ProgressManager] getHistory: No token found in userInfo.');
      throw new Error('No authentication token found');
    }

    console.log(`[ProgressManager] getHistory: Fetching test scores from: ${API_URL}/test-scores`);
    // console.log(`[ProgressManager] getHistory: Using token: ${userInfo.token.substring(0, 10)}...`); // Keep token logging commented unless needed

    const response = await fetch(`${API_URL}/test-scores`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${userInfo.token}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ProgressManager] getHistory: Failed API call. Status: ${response.status}, Response: ${errorText}`);
      throw new Error(`Failed to fetch test scores: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`[ProgressManager] getHistory: Successfully fetched ${data.test_scores?.length || 0} test scores.`);
    if (!data.test_scores || data.test_scores.length === 0) {
      console.log('[ProgressManager] getHistory: Backend returned empty test_scores array.');
    }
    return data.test_scores.map(score => ({
      date: score.test_date,
      score: score.score,
      total: score.max_score
    }));
  } catch (error) {
    console.error('[ProgressManager] getHistory: Error caught.', error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('[ProgressManager] getHistory: Network error. Could not connect.');
    }
    throw error;
  }
};
