// src/components/ScoreDisplay.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // For icons

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  secondaryText: '#666',
  placeholder: '#A0A0A0',
  success: '#28a745', // Green for score
};

const ScoreDisplay = ({ score, total = 15, navigation, onRetake }) => {
  const handleReturnHome = () => {
    // Navigate to the root HomeMain screen and reset the navigation stack
    navigation.reset({
      index: 0,
      routes: [{ name: 'HomeMain' }],
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.scoreTitle}>Test Completed!</Text>
        <Text style={styles.scoreText}>Your Score: {score}/{total}</Text>
        
        {/* Button to Retake Test */}
        <TouchableOpacity
          style={styles.buttonPrimary}
          onPress={onRetake}
          activeOpacity={0.7}
        >
          <Ionicons name="refresh-outline" size={20} color={themeColors.white} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Retake Test</Text>
        </TouchableOpacity>

        {/* Button to View Progress */}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={() => navigation.navigate('ProgressTab')}
          activeOpacity={0.7}
        >
          <Ionicons name="bar-chart-outline" size={20} color={themeColors.primary} style={styles.buttonIcon} />
          <Text style={styles.buttonTextSecondary}>View Progress</Text>
        </TouchableOpacity>

        {/* Button to Return Home */}
        <TouchableOpacity
          style={styles.buttonSecondary}
          onPress={handleReturnHome}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={20} color={themeColors.primary} style={styles.buttonIcon} />
          <Text style={styles.buttonTextSecondary}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center', // Center items horizontally
    padding: 30,
  },
  scoreTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 15,
  },
  scoreText: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 40,
    color: themeColors.primary, // Use primary color for score
  },
  buttonPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginVertical: 10,
    width: '80%', // Set a width for buttons
  },
  buttonSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: themeColors.white,
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 15,
    marginVertical: 10,
    width: '80%', // Consistent width
    borderWidth: 1,
    borderColor: themeColors.primary,
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: themeColors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ScoreDisplay;
