import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';
import { useAuth } from '../utils/AuthContext';

const REFRESH_INTERVAL = 30000;

const AdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('week');
  const { theme, isDarkMode } = useTheme();
  const { userInfo, signOut } = useAuth();

  const fetchAdminStats = async () => {
    if (!userInfo || !userInfo.token) {
        console.error('No user info or token found, skipping fetch.');
        setError('Authentication token not found. Please log in again.');
        setLoading(false);
        return;
    }
    try {
      setError(null);

      const response = await fetch(`${API_URL}/admin/stats?period=${timePeriod}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        throw new Error(`Failed to fetch admin stats (${response.status})`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        setStats(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch admin stats');
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      setError(error.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchAdminStats();
  }, [timePeriod, userInfo]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      console.log('[AdminDashboard] Refreshing stats...');
      fetchAdminStats();
    }, REFRESH_INTERVAL);

    return () => clearInterval(intervalId);
  }, [fetchAdminStats]);

  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
      <TouchableOpacity
        style={[
          styles.timePeriodButton,
          timePeriod === 'week' && styles.selectedTimePeriod,
          { backgroundColor: theme.cardBackground }
        ]}
        onPress={() => setTimePeriod('week')}
      >
        <Text style={[
          styles.timePeriodText,
          timePeriod === 'week' && styles.selectedTimePeriodText,
          { color: timePeriod === 'week' ? theme.primary : theme.secondaryText }
        ]}>Week</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.timePeriodButton,
          timePeriod === 'month' && styles.selectedTimePeriod,
          { backgroundColor: theme.cardBackground }
        ]}
        onPress={() => setTimePeriod('month')}
      >
        <Text style={[
          styles.timePeriodText,
          timePeriod === 'month' && styles.selectedTimePeriodText,
          { color: timePeriod === 'month' ? theme.primary : theme.secondaryText }
        ]}>Month</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.timePeriodButton,
          timePeriod === 'year' && styles.selectedTimePeriod,
          { backgroundColor: theme.cardBackground }
        ]}
        onPress={() => setTimePeriod('year')}
      >
        <Text style={[
          styles.timePeriodText,
          timePeriod === 'year' && styles.selectedTimePeriodText,
          { color: timePeriod === 'year' ? theme.primary : theme.secondaryText }
        ]}>Year</Text>
      </TouchableOpacity>
    </View>
  );

  const renderStatsCard = (title, value, icon, color) => (
    <View style={[styles.statsCard, { backgroundColor: theme.cardBackground }]}>
      <View style={[styles.iconContainer, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statsValue, { color: theme.darkText }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: theme.secondaryText }]}>{title}</Text>
    </View>
  );

  const renderRecentActivity = () => {
    if (!stats || !stats.recent_activity) return null;

    return (
      <View style={[styles.recentActivityContainer, { backgroundColor: theme.cardBackground }]}>
        <Text style={[styles.sectionTitle, { color: theme.darkText }]}>Recent Activity</Text>
        {stats.recent_activity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <Text style={[styles.activityUserName, { color: theme.darkText }]}>
                {activity.user_name}
              </Text>
              <Text style={[styles.activityDate, { color: theme.secondaryText }]}>
                {new Date(activity.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={styles.activityScore}>
              <Text style={[styles.activityScoreText, { color: theme.primary }]}>
                {activity.score}/{activity.max_score}
              </Text>
            </View>
          </View>
        ))}
      </View>
    );
  };

  const handleLogout = async () => {
    console.log('[AdminDashboard] Logging out...');
    await signOut();
    // Navigation will automatically handle redirect due to userInfo change
  };

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
            Loading Admin Dashboard...
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
          <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.error }]}>Error Loading Data</Text>
          <Text style={[styles.errorMessage, { color: theme.secondaryText }]}>{error}</Text>
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
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.darkText }]}>Admin Dashboard</Text>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={26} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {renderTimePeriodSelector()}

        {stats && (
          <Text style={[styles.timePeriodLabel, { color: theme.secondaryText }]}>
            Showing stats for: {stats.time_period === 'week' ? 'Last 7 Days' : stats.time_period === 'month' ? 'Last 30 Days' : 'Last Year'}
          </Text>
        )}

        <View style={styles.statsContainer}>
          {renderStatsCard('Total Users', stats?.total_users || 0, 'people-outline', '#4CAF50')}
          {renderStatsCard('Average Score', `${stats?.average_score ?? 'N/A'} / 15`, 'stats-chart-outline', '#2196F3')}
          {renderStatsCard('Total Tests', stats?.total_tests || 0, 'document-text-outline', '#FF9800')}
        </View>

        {renderRecentActivity()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 5,
  },
  timePeriodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  timePeriodButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  selectedTimePeriod: {
    borderColor: '#7A7FFC',
  },
  timePeriodText: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedTimePeriodText: {
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 5,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statsValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statsTitle: {
    fontSize: 12,
    textAlign: 'center',
  },
  recentActivityContainer: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
  },
  activityScore: {
    marginLeft: 10,
    alignItems: 'flex-end',
  },
  activityScoreText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  timePeriodLabel: {
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    textAlign: 'center',
  }
});

export default AdminDashboard; 