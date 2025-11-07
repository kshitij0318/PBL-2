// src/screens/ProgressScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { getHistory } from '../utils/ProgressManager';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';
import { ResponsiveText, ResponsiveButton } from '../utils/ResponsiveComponents';

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
      backgroundColor: theme.surface,
      borderColor: theme.border,
    }]}>
      <Ionicons name="receipt-outline" size={24} color={theme.primary} style={styles.itemIcon} />
      <View style={styles.itemDetails}>
        <ResponsiveText size="sm" color={theme.textSecondary} style={styles.dateText}>
          {new Date(item.date).toLocaleDateString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric' 
          })}
        </ResponsiveText>
        <ResponsiveText size="base" weight="semibold" color={getScoreColor(item.score, item.total)} style={styles.scoreText}>
          Score: {item.score}/{item.total}
        </ResponsiveText>
      </View>
    </View>
  );

  const renderHeader = () => (
    <View style={[styles.headerContainer, { backgroundColor: theme.background }]}>
      <ResponsiveText size="2xl" weight="bold" color={theme.text} style={styles.header}>
        Test History
      </ResponsiveText>
      <ResponsiveText size="base" color={theme.textSecondary} style={styles.subHeader}>
        Track your knowledge assessment progress
      </ResponsiveText>
    </View>
  );

  const renderNavigationHeader = () => (
    <View style={[styles.navigationHeader, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <View style={styles.headerTitleContainer}>
        <ResponsiveText size="lg" weight="bold" color={theme.text}>
          Progress Tracking
        </ResponsiveText>
        <ResponsiveText size="sm" color={theme.textSecondary}>
          View your test history
        </ResponsiveText>
      </View>
      <View style={styles.headerSpacer} />
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          {Platform.OS !== 'web' && (
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={theme.background}
            />
          )}
          
          {renderNavigationHeader()}
          
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ResponsiveText size="base" color={theme.textSecondary} style={styles.loadingText}>
              Loading History...
            </ResponsiveText>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.safeArea}>
          {Platform.OS !== 'web' && (
            <StatusBar
              barStyle={isDarkMode ? 'light-content' : 'dark-content'}
              backgroundColor={theme.background}
            />
          )}
          
          {renderNavigationHeader()}
          
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={60} color={theme.error} />
            <ResponsiveText size="lg" weight="semibold" color={theme.text} style={styles.errorText}>
              {error}
            </ResponsiveText>
            <ResponsiveText size="sm" color={theme.textSecondary} style={styles.errorSubText}>
              {error.includes("Network error") 
                ? "Please check your internet connection and try again."
                : "Please try again later or contact support if the problem persists."}
            </ResponsiveText>
            <ResponsiveButton
              variant="primary"
              onPress={() => {
                setLoading(true);
                setError(null);
                loadHistory();
              }}
              style={styles.retryButton}
            >
              Retry
            </ResponsiveButton>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && (
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.background}
          />
        )}
        
        {renderNavigationHeader()}
        
        <FlatList
          data={history}
          keyExtractor={(item, index) => `${item.date}-${index}`}
          renderItem={renderHistoryItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Ionicons name="cloud-offline-outline" size={60} color={theme.textSecondary} />
              <ResponsiveText size="lg" weight="semibold" color={theme.text} style={styles.emptyText}>
                No test history found.
              </ResponsiveText>
              <ResponsiveText size="sm" color={theme.textSecondary} style={styles.emptySubText}>
                Complete a knowledge assessment test to see your progress here.
              </ResponsiveText>
            </View>
          )}
          contentContainerStyle={styles.listContentContainer}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  navigationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerSpacer: {
    width: 40, // Same width as back button for centering
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
  },
  listContentContainer: {
    flexGrow: 1,
  },
  headerContainer: {
    padding: 20,
  },
  header: {
    marginBottom: 8,
  },
  subHeader: {
    // ResponsiveText handles font sizing
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
    marginBottom: 4,
  },
  scoreText: {
    // ResponsiveText handles font sizing and weight
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    marginTop: 40,
  },
  emptyText: {
    marginTop: 15,
    textAlign: 'center',
  },
  emptySubText: {
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
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubText: {
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
  },
});

export default ProgressScreen;
