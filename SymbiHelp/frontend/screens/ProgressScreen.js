// src/screens/ProgressScreen.js
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar, TouchableOpacity, Image } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getHistory } from '../utils/ProgressManager';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';

const ProgressScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { theme, isDarkMode } = useTheme();
  const { userInfo } = useAuth();

  const loadHistory = useCallback(async () => {
    console.log('[ProgressScreen] loadHistory called.');
    if (!userInfo?.token) {
      console.log('[ProgressScreen] No token found in userInfo, skipping fetch.');
      setError('Authentication required. Please log in.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setError(null);
      console.log('[ProgressScreen] Calling getHistory...');
      const loadedHistory = await getHistory();
      console.log('[ProgressScreen] getHistory returned:', loadedHistory);
      setHistory(loadedHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
      console.log('[ProgressScreen] History state updated.');
    } catch (error) {
      console.error("[ProgressScreen] Error in loadHistory:", error);
      if (error.message === 'No authentication token found') {
        navigation.replace('SignIn');
      } else if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        setError("Network error: Could not connect to the server. Please check your internet connection.");
      } else {
        setError(error.message || "Failed to load test history. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }, [userInfo, navigation]);

  useFocusEffect(
    useCallback(() => {
      console.log('[ProgressScreen] Screen focused. Running loadHistory.');
      loadHistory();
    }, [loadHistory])
  );

  const getScoreColor = (score, total) => {
    const percentage = (score / total) * 100;
    if (percentage >= 80) {
      return '#4CAF50';  // Green for high scores
    } else if (percentage >= 60) {
      return '#FF9800';  // Orange for medium scores
    } else {
      return '#F44336';  // Red for low scores
    }
  };

  const renderHistoryItem = ({ item }) => (
    <View style={[styles.historyItemCard, { 
      backgroundColor: theme.cardBackground,
      borderColor: theme.cardBorder,
    }]}>
      <Ionicons name="receipt-outline" size={24} color={theme.primary} style={styles.itemIcon} />
      <View style={styles.itemDetails}>
        <Text style={[styles.dateText, { color: theme.secondaryText }]}>
          {new Date(item.date).toLocaleDateString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric' 
          })}
        </Text>
        <Text style={[styles.scoreText, { color: getScoreColor(item.score, item.total) }]}>
          Score: {item.score}/{item.total}
        </Text>
      </View>
    </View>
  );

  const { streak, totalDaysActive, totalTests, topBadge } = useMemo(() => {
    if (!history || history.length === 0) {
      return { streak: 0, totalDaysActive: 0, totalTests: 0, topBadge: null };
    }
    const days = new Set(history.map(h => new Date(h.date).toDateString()));
    const totalDays = days.size;
    const sortedDays = Array.from(days).map(d => new Date(d)).sort((a,b) => b - a);
    let s = 0;
    let cursor = new Date();
    cursor.setHours(0,0,0,0);
    for (let i = 0; i < sortedDays.length; i++) {
      const d = new Date(sortedDays[i]);
      d.setHours(0,0,0,0);
      if (d.toDateString() === cursor.toDateString()) {
        s += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else if (i === 0 && d.toDateString() === new Date(new Date().setDate(new Date().getDate()-1)).toDateString()) {
        // No activity today but yesterday active: streak counts from yesterday
        s += 1;
        cursor = new Date(new Date().setDate(new Date().getDate()-2));
      } else {
        break;
      }
    }
    const tests = history.length;
    const badge = s >= 7 ? { label: '7‑Day Streak', icon: 'flame' } : s >= 3 ? { label: '3‑Day Streak', icon: 'flame-outline' } : tests >= 10 ? { label: '10 Tests', icon: 'trophy-outline' } : null;
    return { streak: s, totalDaysActive: totalDays, totalTests: tests, topBadge: badge };
  }, [history]);

  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBackground }]}>
      <View style={styles.metricsRow}>
        <View style={[styles.metricCard, { borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }]}>
          <Ionicons name="flame" size={20} color={theme.primary} />
          <Text style={[styles.metricValue, { color: theme.darkText }]}>{streak}d</Text>
          <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>Streak</Text>
        </View>
        <View style={[styles.metricCard, { borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }]}>
          <Ionicons name="calendar" size={20} color={theme.primary} />
          <Text style={[styles.metricValue, { color: theme.darkText }]}>{totalDaysActive}</Text>
          <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>Active days</Text>
        </View>
        <View style={[styles.metricCard, { borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }]}>
          <Ionicons name="trophy" size={20} color={theme.primary} />
          <Text style={[styles.metricValue, { color: theme.darkText }]}>{totalTests}</Text>
          <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>Tests</Text>
        </View>
      </View>
      {topBadge && (
        <View style={[styles.badgeContainer, { borderColor: theme.cardBorder, backgroundColor: theme.cardBackground }]}>
          <Ionicons name={topBadge.icon} size={18} color={theme.primary} />
          <Text style={[styles.badgeText, { color: theme.darkText }]}>{topBadge.label}</Text>
        </View>
      )}
      <Text style={[styles.header, { color: theme.darkText }]}>Test History</Text>
      <Text style={[styles.subHeader, { color: theme.secondaryText }]}>Track your knowledge assessment progress</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.lightBackground}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading History...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.lightBackground}
        />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={60} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.darkText }]}>
            {error}
          </Text>
          <Text style={[styles.errorSubText, { color: theme.secondaryText }]}>
            {error.includes("Network error") 
              ? "Please check your internet connection and try again."
              : "Please try again later or contact support if the problem persists."}
          </Text>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={() => {
              setLoading(true);
              setError(null);
              loadHistory();
            }}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.lightBackground}
      />
      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.date}-${index}`}
        renderItem={renderHistoryItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Image source={require('../assets/icon.png')} style={{ width: 88, height: 88, opacity: 0.9 }} />
            <Text style={[styles.emptyText, { color: theme.darkText }]}>No test history yet</Text>
            <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>Complete a knowledge test to see your progress here.</Text>
            <TouchableOpacity 
              style={[styles.retryButton, { backgroundColor: theme.primary, marginTop: 16 }]}
              onPress={() => navigation.navigate('Test')}
            >
              <Text style={styles.retryButtonText}>Start a Test</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={styles.listContentContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  listContentContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    padding: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 6,
  },
  metricLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 10,
  },
  badgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subHeader: {
    fontSize: 16,
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemDetails: {
    flex: 1,
  },
  dateText: {
    fontSize: 14,
    marginBottom: 4,
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubText: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default ProgressScreen;
