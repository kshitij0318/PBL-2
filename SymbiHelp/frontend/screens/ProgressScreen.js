// src/screens/ProgressScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, SafeAreaView, ActivityIndicator } from 'react-native';
import { getHistory } from '../utils/ProgressManager';
import { Ionicons } from '@expo/vector-icons';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  secondaryText: '#666',
  cardBorder: '#E0E5F0',
  success: '#28a745', // Green for score
};

const ProgressScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const loadedHistory = await getHistory();
        // Ensure history is sorted, newest first
        setHistory(loadedHistory.sort((a, b) => new Date(b.date) - new Date(a.date)));
      } catch (error) {
        console.error("Failed to load history:", error);
        // Optionally show an error message to the user
      } finally {
        setLoading(false);
      }
    };
    loadHistory();
  }, []);

  const renderHistoryItem = ({ item }) => (
    <View style={styles.historyItemCard}>
      <Ionicons name="receipt-outline" size={24} color={themeColors.primary} style={styles.itemIcon} />
      <View style={styles.itemDetails}>
        <Text style={styles.dateText}>
          {new Date(item.date).toLocaleDateString('en-IN', { 
            day: 'numeric', month: 'short', year: 'numeric' 
          })}
        </Text>
        <Text style={styles.scoreText}>
          Score: {item.score}/{item.total || 15} {/* Default to 15 if total missing */}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safeAreaLoading}>
        <ActivityIndicator size={0.8} color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading History...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={history}
        keyExtractor={(item, index) => `${item.date}-${index}`} // More robust key
        renderItem={renderHistoryItem}
        ListHeaderComponent={() => <Text style={styles.header}>Test History</Text>} // Header within FlatList
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={60} color={themeColors.secondaryText} />
            <Text style={styles.emptyText}>No test history found.</Text>
            <Text style={styles.emptySubText}>Complete a test to see your progress here.</Text>
          </View>
        )}
        contentContainerStyle={styles.listContentContainer}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  safeAreaLoading: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.secondaryText,
  },
  listContentContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40, // Add padding at the bottom
    flexGrow: 1, // Ensure empty component can center
  },
  header: {
    fontSize: 24, // Larger header
    fontWeight: 'bold',
    marginBottom: 25,
    color: themeColors.darkText,
    textAlign: 'center',
  },
  historyItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.white,
    padding: 18, // Increased padding
    borderRadius: 15,
    marginBottom: 12,
    borderColor: themeColors.cardBorder,
    borderWidth: 1,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemDetails: {
    flex: 1, // Allow details to take remaining space
  },
  dateText: {
    fontSize: 15,
    color: themeColors.secondaryText,
    marginBottom: 4, // Space between date and score
  },
  scoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.primary, // Use primary color for score
  },
  emptyContainer: {
    flex: 1, // Take up remaining space
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.secondaryText,
    marginTop: 15,
    textAlign: 'center',
  },
   emptySubText: {
    fontSize: 14,
    color: themeColors.placeholder,
    marginTop: 8,
    textAlign: 'center',
  }
});

export default ProgressScreen;
