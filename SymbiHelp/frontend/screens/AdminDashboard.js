import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ActivityIndicator, StatusBar, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';
import { useAuth } from '../utils/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const REFRESH_INTERVAL = 30000;
const { width } = Dimensions.get('window');

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
      <LinearGradient
        colors={[theme.cardBackground, theme.cardBackground]}
        style={styles.timePeriodGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <TouchableOpacity
          style={[
            styles.timePeriodButton,
            timePeriod === 'week' && styles.selectedTimePeriod,
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
          ]}
          onPress={() => setTimePeriod('year')}
        >
          <Text style={[
            styles.timePeriodText,
            timePeriod === 'year' && styles.selectedTimePeriodText,
            { color: timePeriod === 'year' ? theme.primary : theme.secondaryText }
          ]}>Year</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  const renderStatsCard = (title, value, icon, color) => (
    <LinearGradient
      colors={[color + '20', color + '10']}
      style={styles.statsCard}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={[styles.iconContainer, { backgroundColor: color + '30' }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.statsValue, { color: theme.darkText }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: theme.secondaryText }]}>{title}</Text>
    </LinearGradient>
  );

  const renderRecentActivity = () => {
    if (!stats || !stats.recent_activity) return null;

    return (
      <LinearGradient
        colors={[theme.cardBackground, theme.cardBackground]}
        style={styles.recentActivityContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.recentActivityHeader}>
          <Text style={[styles.sectionTitle, { color: theme.darkText }]}>Recent Activity</Text>
          <Ionicons name="time-outline" size={20} color={theme.primary} />
        </View>
        {stats.recent_activity.map((activity, index) => (
          <View key={index} style={styles.activityItem}>
            <View style={styles.activityInfo}>
              <View style={styles.activityUserInfo}>
                <View style={[styles.userAvatar, { backgroundColor: theme.primary + '20' }]}>
                  <Text style={[styles.userInitial, { color: theme.primary }]}>
                    {activity.user_name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={[styles.activityUserName, { color: theme.darkText }]}>
                  {activity.user_name}
                </Text>
              </View>
              <Text style={[styles.activityDate, { color: theme.secondaryText }]}>
                {new Date(activity.date).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </Text>
            </View>
            <View style={[styles.activityScore, { backgroundColor: theme.primary + '15' }]}>
              <Text style={[styles.activityScoreText, { color: theme.primary }]}>
                {activity.score}/{activity.max_score}
              </Text>
            </View>
          </View>
        ))}
      </LinearGradient>
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
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: theme.darkText }]}>Admin Dashboard</Text>
            <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
              Monitor and analyze user activity
            </Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.primary + '15' }]}>
            <Ionicons name="log-out-outline" size={24} color={theme.primary} />
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
    marginBottom: 24,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePeriodContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  timePeriodGradient: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 16,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedTimePeriod: {
    backgroundColor: 'rgba(122, 127, 252, 0.1)',
  },
  timePeriodText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectedTimePeriodText: {
    fontWeight: '600',
  },
  timePeriodLabel: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
  },
  statsTitle: {
    fontSize: 13,
    textAlign: 'center',
  },
  recentActivityContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  recentActivityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  activityUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 16,
    fontWeight: '600',
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 4,
  },
  activityDate: {
    fontSize: 12,
  },
  activityScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  activityScoreText: {
    fontSize: 15,
    fontWeight: '600',
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