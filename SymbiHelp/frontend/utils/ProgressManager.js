// src/utils/ProgressManager.js
import AsyncStorage from '@react-native-async-storage/async-storage';

export const saveScore = async (score) => {
  try {
    const entry = {
      date: new Date().toISOString(),
      score: score,
      total: 15
    };
    const history = await getHistory();
    const newHistory = [entry, ...history];
    await AsyncStorage.setItem('testHistory', JSON.stringify(newHistory));
  } catch (error) {
    console.error('Error saving score:', error);
  }
};

export const getHistory = async () => {
  try {
    const jsonValue = await AsyncStorage.getItem('testHistory');
    return jsonValue ? JSON.parse(jsonValue) : [];
  } catch (error) {
    console.error('Error loading history:', error);
    return [];
  }
};
