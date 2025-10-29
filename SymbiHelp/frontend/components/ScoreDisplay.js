// src/components/ScoreDisplay.js
import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import PrimaryButton from './PrimaryButton';
import Card from './Card';

const ScoreDisplay = ({ score, total = 15, navigation, onRetake }) => {
  const { theme } = useTheme();

  const handleReturnHome = () => {
    navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
      <View style={styles.container}>
        <Card style={styles.card}>
          <Text style={[styles.scoreTitle, { color: theme.darkText }]}>Test Completed</Text>
          <Text style={[styles.scoreText, { color: theme.primary }]}>Your Score: {score}/{total}</Text>

          <View style={styles.buttonsRow}>
            <PrimaryButton onPress={onRetake} style={styles.flexButton}>
              <Ionicons name="refresh-outline" size={18} color={theme.white} style={{ marginRight: 8 }} />
              Retake
            </PrimaryButton>

            <PrimaryButton onPress={() => navigation.navigate('ProgressTab')} style={[styles.flexButton, styles.ghost]}>
              <Ionicons name="bar-chart-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
              View Progress
            </PrimaryButton>
          </View>

          <PrimaryButton onPress={handleReturnHome} style={[styles.fullWidthButton, styles.ghost]}>
            <Ionicons name="home-outline" size={18} color={theme.primary} style={{ marginRight: 8 }} />
            Return Home
          </PrimaryButton>
        </Card>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, alignItems: 'center', paddingVertical: 28 },
  scoreTitle: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  scoreText: { fontSize: 20, fontWeight: '600', marginBottom: 20 },
  buttonsRow: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', gap: 12, marginBottom: 14 },
  flexButton: { flex: 1, marginHorizontal: 6 },
  fullWidthButton: { width: '100%' },
  ghost: { backgroundColor: 'transparent', shadowOpacity: 0, borderWidth: 1 },
});

export default ScoreDisplay;
