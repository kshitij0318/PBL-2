import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MeditationScreen = () => {
  const meditationTechniques = [
    {
      title: 'Breathing Meditation',
      description: 'Focus on your breath to calm your mind and reduce stress',
      icon: 'leaf-outline',
      duration: '5-10 minutes'
    },
    {
      title: 'Body Scan',
      description: 'Progressive relaxation through body awareness',
      icon: 'body-outline',
      duration: '10-15 minutes'
    },
    {
      title: 'Loving Kindness',
      description: 'Cultivate compassion for yourself and others',
      icon: 'heart-outline',
      duration: '10-20 minutes'
    },
    {
      title: 'Mindful Walking',
      description: 'Meditation in motion for grounding and awareness',
      icon: 'footsteps-outline',
      duration: '15-30 minutes'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Meditation & Mindfulness</Text>
        <Text style={styles.subtitle}>Find peace and calm during your pregnancy journey</Text>
      </View>

      <View style={styles.content}>
        {meditationTechniques.map((technique, index) => (
          <TouchableOpacity key={index} style={styles.techniqueCard}>
            <View style={styles.iconContainer}>
              <Ionicons name={technique.icon} size={32} color="#7A7FFC" />
            </View>
            <View style={styles.techniqueInfo}>
              <Text style={styles.techniqueTitle}>{technique.title}</Text>
              <Text style={styles.techniqueDescription}>{technique.description}</Text>
              <Text style={styles.techniqueDuration}>{technique.duration}</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#A0A0A0" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.tipsSection}>
        <Text style={styles.tipsTitle}>Meditation Tips</Text>
        <Text style={styles.tipText}>• Find a quiet, comfortable space</Text>
        <Text style={styles.tipText}>• Start with short sessions (5-10 minutes)</Text>
        <Text style={styles.tipText}>• Focus on your breath when your mind wanders</Text>
        <Text style={styles.tipText}>• Be patient and kind to yourself</Text>
        <Text style={styles.tipText}>• Practice regularly, even for just a few minutes</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
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
    marginRight: 15,
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 5,
  },
  techniqueDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    lineHeight: 20,
  },
  techniqueDuration: {
    fontSize: 12,
    color: '#7A7FFC',
    fontWeight: '500',
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

export default MeditationScreen; 