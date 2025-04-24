// src/screens/ProgressScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar, TouchableOpacity } from 'react-native';
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

  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: theme.headerBackground }]}>
      <Text style={[styles.header, { color: theme.darkText }]}>Test History</Text>
      <Text style={[styles.subHeader, { color: theme.secondaryText }]}>
        Track your knowledge assessment progress
      </Text>
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
            <Ionicons name="cloud-offline-outline" size={60} color={theme.secondaryText} />
            <Text style={[styles.emptyText, { color: theme.darkText }]}>
              No test history found.
            </Text>
            <Text style={[styles.emptySubText, { color: theme.secondaryText }]}>
              Complete a knowledge assessment test to see your progress here.
            </Text>
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
