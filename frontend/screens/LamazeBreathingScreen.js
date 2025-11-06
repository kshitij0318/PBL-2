import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const LamazeBreathingScreen = () => {
  const breathingTechniques = [
    {
      title: 'Slow Breathing',
      description: 'Deep, slow breaths to promote relaxation and reduce stress',
      icon: 'leaf-outline',
      steps: ['Inhale slowly for 4 counts', 'Hold for 4 counts', 'Exhale slowly for 6 counts']
    },
    {
      title: 'Patterned Breathing',
      description: 'Rhythmic breathing patterns for labor management',
      icon: 'repeat-outline',
      steps: ['Inhale through nose for 3 counts', 'Exhale through mouth for 3 counts', 'Repeat rhythmically']
    },
    {
      title: 'Cleansing Breath',
      description: 'Deep breath to release tension and center yourself',
      icon: 'refresh-outline',
      steps: ['Take a deep breath in', 'Hold briefly', 'Exhale completely with a sigh']
    },
    {
      title: 'Light Breathing',
      description: 'Quick, shallow breaths for active labor',
      icon: 'flash-outline',
      steps: ['Breathe in and out quickly', 'Keep mouth relaxed', 'Focus on rhythm']
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lamaze Breathing Techniques</Text>
        <Text style={styles.subtitle}>Master breathing for labor and relaxation</Text>
      </View>

      <View style={styles.content}>
        {breathingTechniques.map((technique, index) => (
          <TouchableOpacity key={index} style={styles.techniqueCard}>
            <View style={styles.iconContainer}>
              <Ionicons name={technique.icon} size={32} color="#7A7FFC" />
            </View>
            <View style={styles.techniqueInfo}>
              <Text style={styles.techniqueTitle}>{technique.title}</Text>
              <Text style={styles.techniqueDescription}>{technique.description}</Text>
              <View style={styles.stepsContainer}>
                {technique.steps.map((step, stepIndex) => (
                  <Text key={stepIndex} style={styles.stepText}>• {step}</Text>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Breathing Tips</Text>
        <Text style={styles.tipText}>• Practice regularly before labor begins</Text>
        <Text style={styles.tipText}>• Focus on your breath, not the pain</Text>
        <Text style={styles.tipText}>• Keep your jaw and shoulders relaxed</Text>
        <Text style={styles.tipText}>• Use breathing during contractions</Text>
        <Text style={styles.tipText}>• Stay hydrated to support breathing</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  header: {
    padding: 20,
    backgroundColor: '#7A7FFC',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#E8E9FF',
    textAlign: 'center',
  },
  content: {
    padding: 20,
  },
  techniqueCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    alignSelf: 'center',
  },
  techniqueInfo: {
    alignItems: 'center',
  },
  techniqueTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  techniqueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    lineHeight: 20,
    textAlign: 'center',
  },
  stepsContainer: {
    width: '100%',
  },
  stepText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 5,
    lineHeight: 20,
  },
  tipsSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    margin: 20,
    borderRadius: 15,
  },
  tipsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 15,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default LamazeBreathingScreen; 