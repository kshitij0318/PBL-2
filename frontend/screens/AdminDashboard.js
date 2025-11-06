import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../utils/ThemeContext';
import { PieChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL, apiRequest } from '../utils/config';
import { useAuth } from '../utils/AuthContext';
import { useRoleNotifications } from '../utils/NotificationContext';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions, Platform, StatusBar, SafeAreaView } from 'react-native';

const REFRESH_INTERVAL = 30000;
const { width } = Dimensions.get('window');

const AdminDashboard = ({ navigation, route }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Get user info from auth context (primary) or route params (fallback)
  const { userInfo: contextUserInfo, signOut } = useAuth();
  const userInfo = route.params?.userInfo || contextUserInfo || {};
  const { theme, isDarkMode } = useTheme();
  const [error, setError] = useState(null);
  const [timePeriod, setTimePeriod] = useState('week');
  const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'assignments' | 'moderation'
  const [chatters, setChatters] = useState([]);
  const [mothers, setMothers] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [allAppointments, setAllAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [assignmentsView, setAssignmentsView] = useState('assignments'); // 'assignments' | 'appointments'
  const [appointmentSortBy, setAppointmentSortBy] = useState('date'); // 'date' | 'nurse' | 'status'
  const [appointmentStatusFilter, setAppointmentStatusFilter] = useState('all'); // 'all' | 'pending' | 'approved' | 'reschedule_requested'
  const { 
    notifySuccess, 
    notifyError, 
    notifyWarning, 
    notifyAdminAction, 
    notifyRealtime 
  } = useRoleNotifications();

  // Forum management states
  const [forumAnalytics, setForumAnalytics] = useState(null);
  const [forumPosts, setForumPosts] = useState([]);
  const [forumComments, setForumComments] = useState([]);
  const [forumView, setForumView] = useState('analytics'); // 'analytics' | 'posts' | 'comments' | 'users'
  const [postFilter, setPostFilter] = useState('all'); // 'all' | 'flagged' | 'deleted'
  const [commentFilter, setCommentFilter] = useState('all'); // 'all' | 'flagged'
  const [forumLoading, setForumLoading] = useState(false);

  // Forum management functions (memoized to prevent unnecessary re-renders)
  const fetchChatters = useCallback(async () => {
        try {
          const res = await fetch(`${API_URL}/admin/forum/active-chatters`, {
            headers: { 'Authorization': `Bearer ${userInfo.token}` }
          });
          const data = await res.json();
          if (data.status === 'success') setChatters(data.chatters || []);
        } catch (e) {
          console.error('Failed loading chatters', e);
          notifyError('Failed to load chatters');
        }
  }, [userInfo?.token, notifyError]);

  const fetchForumAnalytics = useCallback(async () => {
    try {
      setForumLoading(true);
      const res = await fetch(`${API_URL}/admin/forum/analytics?period=${timePeriod}`, {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setForumAnalytics(data.analytics);
      }
    } catch (e) {
      notifyError('Failed to load forum analytics');
    } finally {
      setForumLoading(false);
    }
  }, [userInfo?.token, timePeriod, notifyError]);

  const fetchForumPosts = useCallback(async () => {
    try {
      setForumLoading(true);
      // Map frontend filter to backend status parameter
      let statusParam = 'all';
      if (postFilter === 'flagged') {
        statusParam = 'flagged';
      }
      
      const res = await fetch(`${API_URL}/admin/forum/posts?status=${statusParam}&limit=50`, {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setForumPosts(data.posts || []);
      } else {
        console.error('Failed to load posts:', data.message);
        notifyError(data.message || 'Failed to load posts');
      }
    } catch (e) {
      console.error('Error fetching posts:', e);
      notifyError('Failed to load posts');
    } finally {
      setForumLoading(false);
    }
  }, [userInfo?.token, postFilter, notifyError]);

  const fetchForumComments = useCallback(async () => {
    try {
      setForumLoading(true);
      const res = await fetch(`${API_URL}/admin/forum/comments?status=${commentFilter}&limit=50`, {
        headers: { 'Authorization': `Bearer ${userInfo.token}` }
      });
      const data = await res.json();
      if (data.status === 'success') {
        setForumComments(data.comments || []);
      }
    } catch (e) {
      notifyError('Failed to load comments');
    } finally {
      setForumLoading(false);
    }
  }, [userInfo?.token, commentFilter, notifyError]);

  // Consolidated moderation data loading effect
  useEffect(() => {
    if (activeTab === 'moderation' && userInfo?.token) {
      // Load forum data based on current view
      if (forumView === 'analytics') {
        fetchForumAnalytics();
      } else if (forumView === 'posts') {
        fetchForumPosts();
      } else if (forumView === 'comments') {
        fetchForumComments();
      } else if (forumView === 'users') {
        fetchChatters();
      }
    }
  }, [activeTab, forumView, userInfo?.token, fetchForumAnalytics, fetchForumPosts, fetchForumComments, fetchChatters]);

  const fetchAdminStats = async () => {
    try {
      if (!userInfo?.token) {
        // If no token, sign out the user
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
        return;
      }

      const [statsResponse, testResultsResponse] = await Promise.all([
        fetch(`${API_URL}/admin/stats?period=${timePeriod}`, {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
        fetch(`${API_URL}/admin/test-results`, {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
      ]);

      const statsData = await statsResponse.json();
      const testResultsData = await testResultsResponse.json();

      if (statsResponse.status === 401) {
        // Token is invalid or expired
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
        return;
      }

      if (statsResponse.status === 403) {
        // User is not authorized
        Alert.alert(
          'Access Denied',
          'You do not have permission to access the admin dashboard.',
          [{
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }]
        );
        return;
      }

      if (!statsResponse.ok) {
        throw new Error(statsData.message || 'Failed to fetch admin stats');
      }

      if (statsData.status === 'success') {
        setStats(statsData.data);
      } else {
        throw new Error(statsData.message || 'Failed to fetch admin stats');
      }

      if (testResultsData.status === 'success') {
        setTestResults(testResultsData.test_results || []);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      if (error.message !== 'Failed to fetch admin stats') {
        Alert.alert('Error', 'Failed to load admin dashboard. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAssignmentsData = async () => {
    try {
      setAssignmentsLoading(true);
      setError(null);

      if (!userInfo?.token) {
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
        return;
      }

      const [mothersResponse, nursesResponse] = await Promise.all([
        fetch(`${API_URL}/admin/mothers`, {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        }),
        fetch(`${API_URL}/admin/nurses`, {
          headers: {
            'Authorization': `Bearer ${userInfo.token}`,
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })
      ]);

      // Check for 401 Unauthorized
      if (mothersResponse.status === 401 || nursesResponse.status === 401) {
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: 'SignIn' }],
        });
        return;
      }

      // Check for 403 Forbidden
      if (mothersResponse.status === 403 || nursesResponse.status === 403) {
        Alert.alert(
          'Access Denied',
          'You do not have permission to access this resource.',
          [{
            text: 'OK',
            onPress: () => navigation.navigate('Home')
          }]
        );
        return;
      }

      const mothersData = await mothersResponse.json();
      const nursesData = await nursesResponse.json();

      if (mothersData.status === 'success') {
        setMothers(mothersData.mothers || []);
      } else {
        throw new Error(mothersData.message || 'Failed to fetch mothers data');
      }

      if (nursesData.status === 'success') {
        setNurses(nursesData.nurses || []);
      } else {
        throw new Error(nursesData.message || 'Failed to fetch nurses data');
      }
    } catch (error) {
      console.error('Error fetching assignments data:', error);
      Alert.alert(
        'Error',
        error.message || 'An error occurred while fetching assignments data.'
      );
      setError(error.message || 'An error occurred while fetching assignments data.');
    } finally {
      setAssignmentsLoading(false);
    }
  };

  const assignMotherToNurse = async (motherId, nurseId) => {
    try {
      const response = await fetch(`${API_URL}/admin/assign-mother`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mother_id: motherId, nurse_id: nurseId }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        // Refresh assignments data
        await fetchAssignmentsData();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error assigning mother to nurse:', error);
      return { success: false, message: 'Failed to assign mother to nurse.' };
    }
  };

  const removeAssignment = async (motherId, nurseId) => {
    try {
      const response = await fetch(`${API_URL}/admin/remove-assignment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ mother_id: motherId, nurse_id: nurseId }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        // Refresh assignments data
        await fetchAssignmentsData();
        return { success: true, message: data.message };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
      return { success: false, message: 'Failed to remove assignment.' };
    }
  };

  const fetchAllAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const response = await fetch(`${API_URL}/get-appointments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userInfo.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Get all appointments and enrich with user info
          const appointments = data.appointments || [];
          const enriched = await Promise.all(appointments.map(async (apt) => {
            try {
              const [motherRes, nurseRes] = await Promise.all([
                fetch(`${API_URL}/admin/mothers`, {
                  headers: { 'Authorization': `Bearer ${userInfo.token}` }
                }),
                fetch(`${API_URL}/admin/nurses`, {
                  headers: { 'Authorization': `Bearer ${userInfo.token}` }
                })
              ]);
              
              const motherData = await motherRes.json();
              const nurseData = await nurseRes.json();
              
              const mother = motherData.mothers?.find(m => m.id === apt.mother_id);
              const nurse = nurseData.nurses?.find(n => n.id === apt.nurse_id);
              
              return {
                ...apt,
                mother_name: mother?.full_name || 'Unknown',
                nurse_name: nurse?.full_name || 'Unknown',
              };
            } catch (e) {
              return apt;
            }
          }));
          
          // Sort by date
          enriched.sort((a, b) => new Date(a.date_time) - new Date(b.date_time));
          setAllAppointments(enriched);
        }
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

// Check admin status and load data
useFocusEffect(
  useCallback(() => {
    console.log('User Info:', userInfo); // Debug log
    
    // If userInfo is not loaded yet, don't do anything
    if (!userInfo || Object.keys(userInfo).length === 0) {
      console.log('User info not loaded yet, waiting...');
      return;
    }
    
    // Check if user is admin - check both isAdmin and role properties
    const isUserAdmin = userInfo && (userInfo.isAdmin === true || userInfo.role === 'admin' || userInfo.is_admin === true);
    console.log('Is user admin?', isUserAdmin, { isAdmin: userInfo.isAdmin, role: userInfo.role, is_admin: userInfo.is_admin }); // Debug log
    
    if (!isUserAdmin) {
      console.log('User is not admin, showing access denied'); // Debug log
      Alert.alert(
        'Access Denied',
        'You do not have permission to access the admin dashboard.',
        [{ 
          text: 'OK', 
          onPress: () => {
            console.log('Navigating to Home'); // Debug log
            navigation.navigate('Home');
          } 
        }]
      );
      return;
    }
    
    console.log('Setting isAdmin to true'); // Debug log
    setIsAdmin(true);
    
    const loadData = async () => {
      try {
        console.log('Loading admin data...'); // Debug log
        await fetchAdminStats();
        if (activeTab === 'assignments') {
          await fetchAssignmentsData();
          await fetchAllAppointments();
        }
      } catch (error) {
        console.error('Error loading admin data:', error);
        Alert.alert(
          'Error',
          error.message || 'Failed to load admin data. Please try again.'
        );
      } finally {
        console.log('Finished loading, setting loading to false'); // Debug log
        setLoading(false);
        setRefreshing(false);
      }
    };
    
    loadData();
    
    // Set up refresh interval
    const intervalId = setInterval(loadData, REFRESH_INTERVAL);
    
    return () => {
      console.log('Cleaning up interval'); // Debug log
      clearInterval(intervalId);
    };
  }, [timePeriod, activeTab, userInfo, navigation]) // Added navigation to dependencies
);

// Show loading state if user info is still loading or checking admin status
if (!userInfo || Object.keys(userInfo).length === 0 || !isAdmin) {
  console.log('Rendering loading state', { 
    hasUserInfo: !!userInfo, 
    userInfoKeys: userInfo ? Object.keys(userInfo) : [],
    isAdmin 
  });
  
  return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#0000ff" />
      <Text style={{ marginTop: 10 }}>Verifying access...</Text>
      {userInfo && (
        <>
          <Text style={{ marginTop: 10, color: '#666' }}>User ID: {userInfo.id || 'N/A'}</Text>
          <Text style={{ marginTop: 5, color: '#666' }}>Role: {userInfo.role || 'N/A'}</Text>
          <Text style={{ marginTop: 5, color: '#666' }}>isAdmin: {String(userInfo.isAdmin || userInfo.is_admin || false)}</Text>
          <Text style={{ marginTop: 5, color: '#666' }}>Token: {userInfo.token ? 'Present' : 'Missing'}</Text>
        </>
      )}
    </View>
  );
}

  const handleLogout = async () => {
    console.log('[AdminDashboard] Logging out...');
    await signOut();
    // Navigation will automatically handle redirect due to userInfo change
  };

  const renderStatsCard = (title, value, iconName, color) => (
    <View style={[styles.statsCard, { 
      backgroundColor: theme.surface,
      borderColor: theme.border,
      shadowColor: theme.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      elevation: 3
    }]}>
      <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
        <Ionicons name={iconName} size={28} color={color} />
      </View>
      <Text style={[styles.statsValue, { color: theme.text, marginTop: 12 }]}>{value}</Text>
      <Text style={[styles.statsTitle, { color: theme.textSecondary, marginTop: 4 }]}>{title}</Text>
    </View>
  );

  const renderRecentActivity = () => {
    return (
      <View>
        {/* Test Results from Nurses */}
        <View style={styles.recentActivityContainer}>
          <View style={styles.recentActivityHeader}>
            <Ionicons name="medical-outline" size={24} color="#7A7FFC" />
            <Text style={styles.sectionTitle}>Past Tests by Nurses</Text>
          </View>
          {testResults.length === 0 ? (
            <Text style={{ color: '#666666', textAlign: 'center', fontSize: 14 }}>
              No test results available
            </Text>
          ) : (
            testResults.map((result, index) => (
              <View key={result.id || index} style={styles.activityItem}>
                <View style={styles.activityUserInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {result.user_name ? result.user_name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityUserName, { color: theme.text }]}>{result.user_name}</Text>
                    <Text style={[styles.activityEmail, { color: theme.textSecondary }]}>{result.user_email}</Text>
                    <Text style={[styles.activityDate, { color: theme.textSecondary, marginTop: 4 }]}>
                      Performed by: {result.performed_by}
                    </Text>
                    <Text style={[styles.activityDate, { color: theme.textSecondary }]}>
                      {new Date(result.test_date).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.activityDate, { 
                      color: result.user_role === 'nurse' ? theme.success : theme.info,
                      fontSize: 11,
                      marginTop: 2,
                      fontWeight: '600'
                    }]}>
                      Role: {result.user_role}
                    </Text>
                  </View>
                </View>
                <View style={styles.activityScore}>
                  <Text style={styles.activityScoreText}>
                    {result.score}/{result.max_score || 15}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
        
        {/* Recent Test Activity */}
        {stats?.recent_activity && stats.recent_activity.length > 0 && (
          <View style={[styles.recentActivityContainer, {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.08,
            shadowRadius: 8,
            elevation: 3
          }]}>
            <View style={styles.recentActivityHeader}>
              <Ionicons name="time-outline" size={24} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Test Activity</Text>
            </View>
            {stats.recent_activity.map((activity, index) => (
              <View key={index} style={styles.activityItem}>
                <View style={styles.activityUserInfo}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userInitial}>
                      {activity.user_name ? activity.user_name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                  <View style={styles.activityInfo}>
                    <Text style={[styles.activityUserName, { color: theme.text }]}>{activity.user_name}</Text>
                    <Text style={[styles.activityDate, { color: theme.textSecondary }]}>
                      {new Date(activity.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={styles.activityScore}>
                  <Text style={styles.activityScoreText}>
                    {activity.score}/{activity.max_score}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderAssignmentsTab = () => {
    return (
      <View style={styles.assignmentsContainer}>
        {/* View Selector */}
        <View style={[styles.viewSelector, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { 
                backgroundColor: assignmentsView === 'assignments' ? theme.primary : 'transparent',
                borderColor: theme.border
              },
              assignmentsView === 'assignments' && { borderColor: theme.primary }
            ]}
            onPress={() => setAssignmentsView('assignments')}
          >
            <Text style={[
              styles.viewButtonText,
              { 
                color: assignmentsView === 'assignments' ? theme.textInverse : theme.text 
              }
            ]}>
              Assignments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewButton,
              { 
                backgroundColor: assignmentsView === 'appointments' ? theme.primary : 'transparent',
                borderColor: theme.border
              },
              assignmentsView === 'appointments' && { borderColor: theme.primary }
            ]}
            onPress={() => setAssignmentsView('appointments')}
          >
            <Text style={[
              styles.viewButtonText,
              { 
                color: assignmentsView === 'appointments' ? theme.textInverse : theme.text 
              }
            ]}>
              All Appointments
            </Text>
          </TouchableOpacity>
        </View>

        {assignmentsView === 'assignments' ? renderAssignmentsView() : renderAppointmentsView()}
      </View>
    );
  };

  const renderAssignmentsView = () => {
    if (assignmentsLoading) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 10, color: theme.text }}>Loading assignments...</Text>
        </View>
      );
    }

    const assignedMothers = mothers.filter(m => m.assigned_nurse);
    const unassignedMothers = mothers.filter(m => !m.assigned_nurse);

    return (
      <View style={styles.assignmentsContainer}>
        <View style={styles.assignmentsStats}>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{unassignedMothers.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Unassigned</Text>
          </View>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{assignedMothers.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Assigned</Text>
          </View>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{mothers.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Total Mothers</Text>
          </View>
        </View>

        <ScrollView>
          {/* Nurses Section */}
          <View style={styles.assignmentsSection}>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Nurses</Text>
            {nurses.map((nurse) => {
              const nurseMothers = mothers.filter(m => 
                m.assigned_nurse && m.assigned_nurse.id === nurse.id
              );
              return (
                <View key={nurse.id} style={[styles.nurseCard, { backgroundColor: theme.surface }]}>
                  <View style={styles.nurseHeader}>
                    <Ionicons name="medical" size={20} color={theme.primary} />
                    <Text style={[styles.nurseName, { color: theme.text }]}>{nurse.full_name}</Text>
                    <Text style={[styles.nursePatientCount, { color: theme.textSecondary }]}>{nurseMothers.length} patients</Text>
                  </View>
                  {nurseMothers.length > 0 && (
                    <View style={styles.patientList}>
                      {nurseMothers.map((mother) => (
                        <View key={mother.id} style={[styles.patientItem, { borderBottomColor: theme.border }]}>
                          <Text style={[styles.patientName, { color: theme.text }]}>{mother.full_name}</Text>
                          <TouchableOpacity
                            style={styles.removePatientButton}
                            onPress={() => removeAssignment(mother.id, nurse.id)}
                          >
                            <Ionicons name="close-circle" size={20} color={theme.error} />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Unassigned Mothers */}
          {unassignedMothers.length > 0 && (
            <View style={styles.assignmentsSection}>
              <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Unassigned Mothers</Text>
              {unassignedMothers.map((mother) => (
                <View key={mother.id} style={[styles.assignmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={styles.assignmentInfo}>
                    <Text style={[styles.motherName, { color: theme.text }]}>{mother.full_name}</Text>
                    <Text style={[styles.motherEmail, { color: theme.textSecondary }]}>{mother.email}</Text>
                    {mother.due_date && (
                      <Text style={[styles.dueDate, { color: theme.textSecondary }]}>
                        Due Date: {new Date(mother.due_date).toLocaleDateString()}
                      </Text>
                    )}
                    <View style={styles.consentStatus}>
                      <Ionicons
                        name={mother.share_consent ? 'checkmark-circle' : 'close-circle'}
                        size={16}
                        color={mother.share_consent ? '#4CAF50' : '#dc3545'}
                      />
                      <Text style={[
                        styles.consentText,
                        { color: mother.share_consent ? '#4CAF50' : '#dc3545' }
                      ]}>
                        {mother.share_consent ? 'Consent Given' : 'No Consent'}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.assignmentActions, { borderTopColor: theme.border }]}>
                    <Text style={[styles.unassignedText, { color: theme.text }]}>Assign to:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.nurseSelector}>
                      {nurses.map((nurse) => (
                        <TouchableOpacity
                          key={nurse.id}
                          style={[styles.nurseOption, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}
                          onPress={() => assignMotherToNurse(mother.id, nurse.id)}
                        >
                          <Text style={[styles.nurseOptionText, { color: theme.text }]}>{nurse.full_name}</Text>
                          <Text style={[styles.nurseOptionCount, { color: theme.textSecondary }]}>
                            {nurse.assigned_mothers_count || 0} assigned
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderAppointmentsView = () => {

    if (appointmentsLoading) {
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ marginTop: 10, color: theme.text }}>Loading appointments...</Text>
        </View>
      );
    }

    // Filter by status
    let filtered = allAppointments;
    if (appointmentStatusFilter !== 'all') {
      filtered = allAppointments.filter(apt => apt.status === appointmentStatusFilter);
    }

    // Sort appointments
    const sorted = [...filtered].sort((a, b) => {
      if (appointmentSortBy === 'date') {
        const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
        const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
        return dateB - dateA; // Most recent first
      } else if (appointmentSortBy === 'nurse') {
        return (a.nurse_name || '').localeCompare(b.nurse_name || '');
      } else if (appointmentSortBy === 'status') {
        return (a.status || '').localeCompare(b.status || '');
      }
      return 0;
    });

    const now = new Date();
    const upcoming = sorted.filter(apt => {
      const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
      return aptDate >= now && apt.status !== 'cancelled';
    });
    const past = sorted.filter(apt => {
      const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
      return aptDate < now || apt.status === 'cancelled';
    });

    return (
      <ScrollView>
        {/* Filter and Sort Controls */}
        <View style={[styles.filterContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.text, fontSize: 12 }]}>Filter by Status:</Text>
            <View style={styles.filterButtons}>
              {['all', 'pending', 'approved', 'reschedule_requested'].map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.filterButton,
                    { 
                      backgroundColor: appointmentStatusFilter === status ? theme.primary : theme.backgroundSecondary,
                      borderColor: theme.border,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      minWidth: 70,
                      marginRight: 6,
                      marginBottom: 6
                    },
                    appointmentStatusFilter === status && { borderColor: theme.primary }
                  ]}
                  onPress={() => setAppointmentStatusFilter(status)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { 
                      color: appointmentStatusFilter === status ? theme.textInverse : theme.text,
                      fontSize: 11
                    }
                  ]}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <View style={styles.filterRow}>
            <Text style={[styles.filterLabel, { color: theme.text, fontSize: 12 }]}>Sort by:</Text>
            <View style={styles.filterButtons}>
              {['date', 'nurse', 'status'].map((sort) => (
                <TouchableOpacity
                  key={sort}
                  style={[
                    styles.filterButton,
                    { 
                      backgroundColor: appointmentSortBy === sort ? theme.primary : theme.backgroundSecondary,
                      borderColor: theme.border,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      minWidth: 60,
                      marginRight: 6,
                      marginBottom: 6
                    },
                    appointmentSortBy === sort && { borderColor: theme.primary }
                  ]}
                  onPress={() => setAppointmentSortBy(sort)}
                >
                  <Text style={[
                    styles.filterButtonText,
                    { 
                      color: appointmentSortBy === sort ? theme.textInverse : theme.text,
                      fontSize: 11
                    }
                  ]}>
                    {sort.charAt(0).toUpperCase() + sort.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.appointmentsStats}>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{upcoming.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Upcoming</Text>
          </View>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{past.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Past</Text>
          </View>
          <View style={[styles.assignmentStatCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.assignmentStatValue, { color: theme.text }]}>{allAppointments.length}</Text>
            <Text style={[styles.assignmentStatLabel, { color: theme.textSecondary }]}>Total</Text>
          </View>
        </View>

        {upcoming.length > 0 && (
          <View style={styles.assignmentsSection}>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Upcoming Appointments</Text>
            {upcoming.map((apt) => (
              <View key={apt.id} style={[styles.appointmentCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.appointmentCardHeader}>
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.appointmentDate, { color: theme.text }]}>
                    {(apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date)).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {!apt.date_time && apt.status === 'pending' && ' (Requested)'}
                    {apt.status === 'approved' && apt.date_time && ' (Approved)'}
                    {apt.status === 'reschedule_requested' && ' (Reschedule Requested)'}
                  </Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <View style={styles.appointmentRow}>
                    <Ionicons name="person-outline" size={16} color={theme.primary} />
                    <Text style={[styles.appointmentText, { color: theme.text }]}>
                      Mother: {apt.mother_name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.appointmentRow}>
                    <Ionicons name="medical-outline" size={16} color={theme.primary} />
                    <Text style={[styles.appointmentText, { color: theme.text }]}>
                      Nurse: {apt.nurse_name || 'Unknown'}
                    </Text>
                  </View>
                  <View style={styles.appointmentRow}>
                    <Ionicons name="flag-outline" size={16} color={theme.primary} />
                    <Text style={[
                      styles.appointmentStatus,
                      { 
                        color: apt.status === 'approved' ? theme.success : 
                               apt.status === 'pending' ? theme.warning : 
                               apt.status === 'reschedule_requested' ? '#FF9800' : theme.text 
                      }
                    ]}>
                      Status: {apt.status.charAt(0).toUpperCase() + apt.status.slice(1).replace('_', ' ')}
                    </Text>
                  </View>
                  {apt.requested_date && apt.date_time && new Date(apt.requested_date).getTime() !== new Date(apt.date_time).getTime() && (
                    <View style={styles.appointmentRow}>
                      <Ionicons name="time-outline" size={16} color={theme.primary} />
                      <Text style={[styles.appointmentText, { color: theme.textSecondary }]}>
                        Originally requested: {new Date(apt.requested_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  )}
                  {apt.updated_at && (
                    <View style={styles.appointmentRow}>
                      <Ionicons name="time-outline" size={16} color={theme.primary} />
                      <Text style={[styles.appointmentText, { color: theme.textSecondary }]}>
                        Last updated: {new Date(apt.updated_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </Text>
                    </View>
                  )}
                </View>
                {apt.notes && (
                  <View style={[styles.appointmentNotes, { borderTopColor: theme.border }]}>
                    <Text style={[styles.appointmentNotesLabel, { color: theme.text }]}>Notes:</Text>
                    <Text style={[styles.appointmentNotesText, { color: theme.textSecondary }]}>{apt.notes}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {past.length > 0 && (
          <View style={styles.assignmentsSection}>
            <Text style={[styles.sectionHeaderText, { color: theme.text }]}>Past Appointments</Text>
            {past.slice(0, 10).map((apt) => (
              <View key={apt.id} style={[styles.appointmentCard, { backgroundColor: theme.surface, borderColor: theme.border, opacity: 0.7 }]}>
                <View style={styles.appointmentCardHeader}>
                  <Ionicons name="calendar-outline" size={20} color={theme.primary} />
                  <Text style={[styles.appointmentDate, { color: theme.text }]}>
                    {new Date(apt.date_time).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={styles.appointmentInfo}>
                  <Text style={[styles.appointmentText, { color: theme.text }]}>
                    {apt.mother_name || 'Unknown'} with {apt.nurse_name || 'Unknown'}
                  </Text>
                  <Text style={[styles.appointmentStatus, { color: theme.textSecondary }]}>
                    {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {allAppointments.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.textTertiary} />
            <Text style={{ color: theme.text, marginTop: 16, fontSize: 16 }}>
              No appointments found
            </Text>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderTimePeriodSelector = () => (
    <View style={styles.timePeriodContainer}>
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
        ]}>Year</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabSelector = () => (
    <View style={[styles.tabContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border }]}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'stats' && [styles.selectedTab, {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }],
          { backgroundColor: 'transparent' }
        ]}
        onPress={() => setActiveTab('stats')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'stats' ? theme.primary : theme.textSecondary },
          activeTab === 'stats' && styles.selectedTabText,
        ]}>Statistics</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'assignments' && [styles.selectedTab, {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }],
          { backgroundColor: 'transparent' }
        ]}
        onPress={() => setActiveTab('assignments')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'assignments' ? theme.primary : theme.textSecondary },
          activeTab === 'assignments' && styles.selectedTabText,
        ]}>Assignments</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.tabButton,
          activeTab === 'moderation' && [styles.selectedTab, {
            backgroundColor: theme.surface,
            shadowColor: theme.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }],
          { backgroundColor: 'transparent' }
        ]}
        onPress={() => setActiveTab('moderation')}
      >
        <Text style={[
          styles.tabText,
          { color: activeTab === 'moderation' ? theme.primary : theme.textSecondary },
          activeTab === 'moderation' && styles.selectedTabText,
        ]}>Community Moderation</Text>
      </TouchableOpacity>
    </View>
  );


  

  const warnUser = async (userId) => {
    const res = await fetch(`${API_URL}/admin/forum/warn-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, reason: 'inappropriate_language' })
    });
    await fetchChatters();
    if (res.ok) notifyAdminAction('user_warned', 'User warned'); else notifyError('Failed to warn user');
  };

  const muteUser = async (userId, minutes = 60) => {
    const res = await fetch(`${API_URL}/admin/forum/mute-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, minutes })
    });
    await fetchChatters();
    if (res.ok) notifyAdminAction('user_muted', `User muted for ${minutes}m`); else notifyError('Failed to mute user');
  };

  const banUser = async (userId) => {
    const res = await fetch(`${API_URL}/admin/forum/ban-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    await fetchChatters();
    if (res.ok) notifyAdminAction('user_banned', 'User banned'); else notifyError('Failed to ban user');
  };

  const unbanUser = async (userId) => {
    const res = await fetch(`${API_URL}/admin/forum/unban-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    await fetchChatters();
    if (res.ok) notifySuccess('User unbanned'); else notifyError('Failed to unban user');
  };

  const unmuteUser = async (userId) => {
    const res = await fetch(`${API_URL}/admin/forum/unmute-user`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    await fetchChatters();
    if (res.ok) notifySuccess('User unmuted'); else notifyError('Failed to unmute user');
  };


  const flagPost = async (postId, reason = 'inappropriate') => {
    const res = await fetch(`${API_URL}/admin/forum/flag-post/${postId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      notifyAdminAction('content_flagged', 'Post flagged');
      fetchForumPosts();
    } else {
      notifyError('Failed to flag post');
    }
  };

  const unflagPost = async (postId) => {
    const res = await fetch(`${API_URL}/admin/forum/unflag-post/${postId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      notifyAdminAction('content_approved', 'Post unflagged');
      fetchForumPosts();
    } else {
      notifyError('Failed to unflag post');
    }
  };

  const flagComment = async (commentId, reason = 'inappropriate') => {
    const res = await fetch(`${API_URL}/admin/forum/flag-comment/${commentId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    if (res.ok) {
      notifyAdminAction('content_flagged', 'Comment flagged');
      fetchForumComments();
    } else {
      notifyError('Failed to flag comment');
    }
  };

  const unflagComment = async (commentId) => {
    const res = await fetch(`${API_URL}/admin/forum/unflag-comment/${commentId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' }
    });
    if (res.ok) {
      notifyAdminAction('content_unflagged', 'Comment unflagged');
      fetchForumComments();
    } else {
      notifyError('Failed to unflag comment');
    }
  };

  const deleteComment = async (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await fetch(`${API_URL}/api/forum/comments/${commentId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${userInfo.token}`, 'Content-Type': 'application/json' }
            });
            if (res.ok) {
              notifySuccess('Comment deleted');
              fetchForumComments();
            } else {
              notifyError('Failed to delete comment');
            }
          }
        }
      ]
    );
  };

  const deletePost = async (postId) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const res = await fetch(`${API_URL}/api/forum/posts/${postId}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${userInfo.token}` }
            });
            if (res.ok) {
              notifySuccess('Post deleted');
              fetchForumPosts();
            } else {
              notifyError('Failed to delete post');
            }
          }
        }
      ]
    );
  };


  // Forum management UI components
  const renderForumViewSelector = () => (
    <View style={styles.forumViewContainer}>
      <View style={styles.forumViewButtonsContainer}>
        {[
          { key: 'analytics', label: 'Analytics', icon: 'analytics-outline' },
          { key: 'posts', label: 'Posts', icon: 'document-text-outline' },
          { key: 'comments', label: 'Comments', icon: 'chatbubble-outline' },
          { key: 'users', label: 'Users', icon: 'people-outline' }
        ].map((view) => (
          <TouchableOpacity
            key={view.key}
            style={[
              styles.forumViewButton,
              { 
                backgroundColor: forumView === view.key ? theme.primary : theme.surface,
                borderColor: forumView === view.key ? theme.primary : theme.border,
                width: '48%',
                shadowColor: forumView === view.key ? theme.primary : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: forumView === view.key ? 0.2 : 0,
                shadowRadius: 4,
                elevation: forumView === view.key ? 3 : 1
              }
            ]}
            onPress={() => setForumView(view.key)}
          >
            <Ionicons 
              name={view.icon} 
              size={20} 
              color={forumView === view.key ? theme.textInverse : theme.text} 
            />
            <Text style={[
              styles.forumViewButtonText,
              { 
                color: forumView === view.key ? theme.textInverse : theme.text,
                fontSize: 13,
                fontWeight: forumView === view.key ? '600' : '500'
              }
            ]}>
              {view.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderForumAnalytics = () => (
    <View style={styles.forumContentContainer}>
      <Text style={[styles.forumSectionTitle, { color: theme.text, marginBottom: 20 }]}>Forum Analytics</Text>
      {forumAnalytics ? (
        <>
          <View style={styles.forumStatsGrid}>
            <View style={[styles.forumStatCard, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3
            }]}>
              <View style={[styles.forumStatIconContainer, { backgroundColor: `${theme.success}15` }]}>
                <Ionicons name="document-text" size={28} color={theme.success} />
              </View>
              <Text style={[styles.forumStatNumber, { color: theme.text, marginTop: 12 }]}>{forumAnalytics.total_posts}</Text>
              <Text style={[styles.forumStatLabel, { color: theme.textSecondary, marginTop: 4 }]}>Total Posts</Text>
              <Text style={[styles.forumStatSubLabel, { color: theme.textTertiary, marginTop: 6 }]}>
                +{forumAnalytics.posts_this_period} this {forumAnalytics.period}
              </Text>
            </View>
            <View style={[styles.forumStatCard, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3
            }]}>
              <View style={[styles.forumStatIconContainer, { backgroundColor: `${theme.info}15` }]}>
                <Ionicons name="chatbubbles" size={28} color={theme.info} />
              </View>
              <Text style={[styles.forumStatNumber, { color: theme.text, marginTop: 12 }]}>{forumAnalytics.total_comments}</Text>
              <Text style={[styles.forumStatLabel, { color: theme.textSecondary, marginTop: 4 }]}>Total Comments</Text>
              <Text style={[styles.forumStatSubLabel, { color: theme.textTertiary, marginTop: 6 }]}>
                +{forumAnalytics.comments_this_period} this {forumAnalytics.period}
              </Text>
            </View>
            <View style={[styles.forumStatCard, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3
            }]}>
              <View style={[styles.forumStatIconContainer, { backgroundColor: `${theme.warning}15` }]}>
                <Ionicons name="flag" size={28} color={theme.warning} />
              </View>
              <Text style={[styles.forumStatNumber, { color: theme.text, marginTop: 12 }]}>
                {forumAnalytics.flagged_posts + forumAnalytics.flagged_comments}
              </Text>
              <Text style={[styles.forumStatLabel, { color: theme.textSecondary, marginTop: 4 }]}>Flagged Content</Text>
              <Text style={[styles.forumStatSubLabel, { color: theme.textTertiary, marginTop: 6 }]}>
                {forumAnalytics.flagged_posts} posts, {forumAnalytics.flagged_comments} comments
              </Text>
            </View>
            <View style={[styles.forumStatCard, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 3
            }]}>
              <View style={[styles.forumStatIconContainer, { backgroundColor: '#9C27B015' }]}>
                <Ionicons name="people" size={28} color="#9C27B0" />
              </View>
              <Text style={[styles.forumStatNumber, { color: theme.text, marginTop: 12 }]}>{forumAnalytics.active_users}</Text>
              <Text style={[styles.forumStatLabel, { color: theme.textSecondary, marginTop: 4 }]}>Active Users</Text>
              <Text style={[styles.forumStatSubLabel, { color: theme.textTertiary, marginTop: 6 }]}>This {forumAnalytics.period}</Text>
            </View>
          </View>
          
          {forumAnalytics.top_contributors.length > 0 && (
            <View style={[styles.topContributorsContainer, { 
              backgroundColor: theme.surface,
              borderColor: theme.border,
              shadowColor: theme.shadow,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
              elevation: 3
            }]}>
              <Text style={[styles.forumSectionTitle, { color: theme.text, marginBottom: 16 }]}>Top Contributors</Text>
              {forumAnalytics.top_contributors.map((contributor, index) => (
                <View key={contributor.user_id} style={[styles.contributorItem, { 
                  backgroundColor: theme.backgroundSecondary, 
                  borderColor: theme.border,
                  padding: Platform.OS === 'web' ? 16 : 12,
                  marginBottom: Platform.OS === 'web' ? 12 : 10,
                }]}>
                  <View style={[styles.contributorRank, { 
                    backgroundColor: theme.primary,
                    width: Platform.OS === 'web' ? 40 : 36,
                    height: Platform.OS === 'web' ? 40 : 36,
                    borderRadius: Platform.OS === 'web' ? 8 : 6,
                  }]}>
                    <Text style={[styles.contributorRankText, { 
                      color: theme.textInverse,
                      fontSize: Platform.OS === 'web' ? 14 : 12,
                    }]}>#{index + 1}</Text>
                  </View>
                  <View style={[styles.contributorInfo, { 
                    marginLeft: Platform.OS === 'web' ? 12 : 10,
                    flex: 1,
                  }]}>
                    <Text style={[styles.contributorName, { 
                      color: theme.text,
                      fontSize: Platform.OS === 'web' ? 16 : 14,
                      fontWeight: '600',
                      marginBottom: Platform.OS === 'web' ? 4 : 2,
                    }]}>{contributor.name}</Text>
                    <Text style={[styles.contributorRole, { 
                      color: theme.textSecondary,
                      fontSize: Platform.OS === 'web' ? 13 : 12,
                    }]}>{contributor.role}</Text>
                  </View>
                  <View style={[styles.contributorStats, {
                    alignItems: Platform.OS === 'web' ? 'flex-end' : 'flex-start',
                    marginLeft: Platform.OS === 'web' ? 0 : 8,
                  }]}>
                    <Text style={[styles.contributorStatText, { 
                      color: theme.textSecondary,
                      fontSize: Platform.OS === 'web' ? 13 : 11,
                      textAlign: Platform.OS === 'web' ? 'right' : 'left',
                    }]}>
                      {contributor.posts || contributor.posts_count || 0} posts, {contributor.comments || contributor.comments_count || 0} comments
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      ) : (
        <ActivityIndicator size="large" color={theme.primary} />
      )}
              </View>
  );

  const renderForumPosts = () => (
    <View style={styles.forumContentContainer}>
      <View style={styles.forumContentHeader}>
        <Text style={[styles.forumSectionTitle, { color: theme.text }]}>Posts Management</Text>
        <View style={styles.forumFilterContainer}>
          {['all', 'flagged'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.forumFilterButton,
                { 
                  backgroundColor: postFilter === filter ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border
                },
                postFilter === filter && { borderColor: theme.primary }
              ]}
              onPress={() => setPostFilter(filter)}
            >
              <Text style={[
                styles.forumFilterButtonText,
                { 
                  color: postFilter === filter ? theme.textInverse : theme.text 
                }
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
            </View>
      </View>
      
      <ScrollView style={styles.forumItemsList} showsVerticalScrollIndicator={false}>
        {forumPosts.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="document-text-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.text, marginTop: 12, fontSize: 14 }}>
              {postFilter === 'all' ? 'No posts found' : 'No flagged posts'}
            </Text>
          </View>
        ) : (
          forumPosts.map((post) => (
          <View key={post.id} style={[styles.forumPostCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.forumPostHeader}>
              <View style={styles.forumPostAuthor}>
                <View style={[styles.forumPostAvatar, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.forumPostAvatarText, { color: theme.textInverse }]}>
                    {post.author_name?.charAt(0) || 'A'}
                  </Text>
                </View>
                <View>
                  <Text style={[styles.forumPostAuthorName, { color: theme.text }]}>
                    {post.is_anonymous ? `Anonymous ${post.author_role}` : post.author_name}
                  </Text>
                  <Text style={[styles.forumPostDate, { color: theme.textSecondary }]}>
                    {new Date(post.created_at).toLocaleDateString()}
                  </Text>
                </View>
              </View>
              <View style={styles.forumPostActions}>
                {post.is_flagged ? (
                  <TouchableOpacity 
                    style={styles.forumActionButtonSuccess}
                    onPress={() => unflagPost(post.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#FFF" />
              </TouchableOpacity>
                ) : (
                  <TouchableOpacity 
                    style={styles.forumActionButtonWarning}
                    onPress={() => flagPost(post.id)}
                  >
                    <Ionicons name="flag" size={16} color="#FFF" />
              </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={styles.forumActionButtonDanger}
                  onPress={() => deletePost(post.id)}
                >
                  <Ionicons name="trash" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
            <Text style={[styles.forumPostContent, { color: theme.text }]}>{post.content}</Text>
            <View style={styles.forumPostStats}>
              <Text style={[styles.forumPostStat, { color: theme.textSecondary }]}>♥ {post.like_count}</Text>
              {post.is_flagged && (
                <View style={[styles.forumPostFlag, { backgroundColor: theme.warningLight }]}>
                  <Ionicons name="flag" size={12} color={theme.warning} />
                  <Text style={[styles.forumPostFlagText, { color: theme.warning }]}>Flagged</Text>
                </View>
              )}
            </View>
          </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderForumComments = () => (
    <View style={styles.forumContentContainer}>
      <View style={styles.forumContentHeader}>
        <Text style={[styles.forumSectionTitle, { color: theme.text }]}>Comments Management</Text>
        <View style={styles.forumFilterContainer}>
          {['all', 'flagged'].map((filter) => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.forumFilterButton,
                { 
                  backgroundColor: commentFilter === filter ? theme.primary : theme.backgroundSecondary,
                  borderColor: theme.border
                },
                commentFilter === filter && { borderColor: theme.primary }
              ]}
              onPress={() => setCommentFilter(filter)}
            >
              <Text style={[
                styles.forumFilterButtonText,
                { 
                  color: commentFilter === filter ? theme.textInverse : theme.text 
                }
              ]}>
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <ScrollView style={styles.forumItemsList} showsVerticalScrollIndicator={false}>
        {forumComments.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="chatbubbles-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.text, marginTop: 12, fontSize: 14 }}>
              {commentFilter === 'all' ? 'No comments found' : 'No flagged comments'}
            </Text>
          </View>
        ) : (
          forumComments.map((comment) => (
            <View key={comment.id} style={[styles.forumCommentCard, { backgroundColor: theme.surface, borderLeftColor: theme.primary }]}>
              <View style={styles.forumCommentHeader}>
                <View style={styles.forumCommentAuthor}>
                  <View style={[styles.forumPostAvatar, { backgroundColor: theme.primary }]}>
                    <Text style={[styles.forumPostAvatarText, { color: theme.textInverse }]}>
                      {comment.author_name?.charAt(0) || 'A'}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={[styles.forumCommentAuthorName, { color: theme.text }]}>
                      {comment.is_anonymous ? `Anonymous ${comment.author_role}` : comment.author_name}
                    </Text>
                    <Text style={[styles.forumCommentDate, { color: theme.textSecondary }]}>
                      {new Date(comment.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View style={[styles.forumPostActions, { marginLeft: 8 }]}>
                  {comment.is_flagged ? (
                    <TouchableOpacity 
                      style={styles.forumActionButtonSuccess}
                      onPress={() => unflagComment(comment.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark" size={16} color="#FFF" />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={styles.forumActionButtonWarning}
                      onPress={() => flagComment(comment.id)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="flag" size={16} color="#FFF" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity 
                    style={styles.forumActionButtonDanger}
                    onPress={() => deleteComment(comment.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="trash" size={16} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
              <Text style={[styles.forumCommentContent, { color: theme.text }]}>{comment.content}</Text>
              <View style={styles.forumCommentPostContainer}>
                <Text style={[styles.forumCommentPost, { color: theme.textSecondary }]}>
                  On post: {comment.post_content}
                </Text>
                {comment.is_flagged && (
                  <View style={[styles.forumPostFlag, { backgroundColor: theme.warningLight }]}>
                    <Ionicons name="flag" size={12} color={theme.warning} />
                    <Text style={[styles.forumPostFlagText, { color: theme.warning }]}>Flagged</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderForumUsers = () => (
    <View style={styles.forumContentContainer}>
      <Text style={[styles.forumSectionTitle, { color: theme.text }]}>User Management</Text>
      <ScrollView style={styles.forumItemsList} showsVerticalScrollIndicator={false}>
        {chatters.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={48} color={theme.textTertiary} />
            <Text style={{ color: theme.text, marginTop: 12, fontSize: 14 }}>
              No active users found
            </Text>
          </View>
        ) : (
          chatters.map((c) => (
          <View key={c.user_id} style={[styles.forumUserCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.forumUserInfo}>
              <View style={[styles.forumUserAvatar, { backgroundColor: theme.primary }]}>
                <Text style={[styles.forumUserAvatarText, { color: theme.textInverse }]}>
                  {c.full_name?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.forumUserDetails}>
                <Text style={[styles.forumUserName, { color: theme.text }]}>{c.full_name} ({c.role})</Text>
                <Text style={[styles.forumUserEmail, { color: theme.textSecondary }]}>{c.email}</Text>
                <Text style={[styles.forumUserStats, { color: theme.textSecondary }]}>
                  {c.posts} posts • {c.comments} comments
                </Text>
                {c.is_muted && (
                  <Text style={[styles.forumUserStatus, { color: theme.warning }]}>
                    🔇 Muted until {c.muted_until || 'N/A'}
                  </Text>
                )}
                {c.is_banned && (
                  <Text style={[styles.forumUserBanned, { color: theme.error }]}>🚫 Banned</Text>
                )}
              </View>
            </View>
            <View style={styles.forumUserActions}>
              <TouchableOpacity 
                onPress={() => warnUser(c.user_id)} 
                style={styles.forumUserActionWarn}
              >
                <Text style={styles.forumUserActionText}>Warn</Text>
              </TouchableOpacity>
              {c.is_muted ? (
                <TouchableOpacity 
                  onPress={() => unmuteUser(c.user_id)} 
                  style={styles.forumUserActionUnmute}
                >
                  <Text style={styles.forumUserActionText}>Unmute</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => muteUser(c.user_id, 60)} 
                  style={styles.forumUserActionMute}
                >
                  <Text style={styles.forumUserActionText}>Mute</Text>
                </TouchableOpacity>
              )}
              {c.is_banned ? (
                <TouchableOpacity 
                  onPress={() => unbanUser(c.user_id)} 
                  style={styles.forumUserActionUnban}
                >
                  <Text style={styles.forumUserActionText}>Unban</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  onPress={() => banUser(c.user_id)} 
                  style={styles.forumUserActionBan}
                >
                  <Text style={styles.forumUserActionText}>Ban</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          ))
        )}
      </ScrollView>
    </View>
  );

  const renderModerationTab = () => (
    <View style={styles.forumModerationContainer}>
      <View style={styles.forumModerationHeader}>
        <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Forum Management</Text>
      </View>
      
      {renderForumViewSelector()}
      
      {forumLoading ? (
        <View style={styles.forumLoadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.forumLoadingText, { color: theme.text }]}>Loading...</Text>
        </View>
      ) : (
        <>
          {forumView === 'analytics' && renderForumAnalytics()}
          {forumView === 'posts' && renderForumPosts()}
          {forumView === 'comments' && renderForumComments()}
          {forumView === 'users' && renderForumUsers()}
        </>
      )}
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
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading Admin Dashboard...
            </Text>
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
          
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
            <Text style={[styles.errorText, { color: theme.text }]}>Error</Text>
            <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>{error}</Text>
            <TouchableOpacity 
              style={[styles.errorButton, { backgroundColor: theme.primary }]}
              onPress={() => setError(null)}
            >
              <Text style={[styles.errorButtonText, { color: theme.textInverse }]}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />}
        
        {/* Modern Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.profileIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="shield" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.welcomeSection}>
              <Text style={[styles.headerTitle, { color: theme.text }]}>Admin Dashboard</Text>
              <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
                Monitor and analyze user activity
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="log-out-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {renderTabSelector()}

            {activeTab === 'stats' ? (
              <>
                {renderTimePeriodSelector()}

                {stats && (
                  <Text style={[styles.timePeriodLabel, { color: theme.textSecondary }]}>
                    Showing stats for: {stats.time_period === 'week' ? 'Last 7 Days' : stats.time_period === 'month' ? 'Last 30 Days' : 'Last Year'}
                  </Text>
                )}

                <View style={styles.statsContainer}>
                  {renderStatsCard('Total Users', stats?.total_users || 0, 'people-outline', theme.primary)}
                  {renderStatsCard('Average Score', `${stats?.average_score ?? 'N/A'} / 15`, 'stats-chart-outline', theme.secondary)}
                  {renderStatsCard('Total Tests', stats?.total_tests || 0, 'document-text-outline', theme.warning)}
                </View>

                {renderRecentActivity()}
              </>
            ) : activeTab === 'assignments' ? (
              renderAssignmentsTab()
            ) : (
              renderModerationTab()
            )}
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeSection: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  logoutButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timePeriodContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  timePeriodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectedTimePeriod: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timePeriodText: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedTimePeriodText: {
    fontWeight: '700',
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
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    // backgroundColor, borderColor, and shadow will be set inline with theme
  },
  statsCardContent: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be set inline with theme
  },
  statsValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: '#1E1E1E', // Dark text for readability on white background
  },
  statsTitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#666666', // Dark gray for better readability
    fontWeight: '500',
  },
  recentActivityContainer: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    // backgroundColor, borderColor, and shadow will be set inline with theme
  },
  recentActivityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
    color: '#1E1E1E', // Dark text for readability on white background
  },
  activityItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)', // Dark border for white background
  },
  activityUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E9FF', // Light primary color for white background
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitial: {
    fontSize: 14,
    fontWeight: '700',
    color: '#7A7FFC', // Primary color for readability
  },
  activityInfo: {
    flex: 1,
  },
  activityUserName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  activityDate: {
    fontSize: 12,
    marginLeft: 44,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  activityScore: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  activityScoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 6,
    marginBottom: 24,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  tabButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor and shadow will be set inline with theme
  },
  selectedTab: {
    // backgroundColor and shadow will be set inline with theme
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  selectedTabText: {
    fontWeight: '700',
    // color will be set inline with theme
  },
  // Assignment styles
  assignmentsContainer: {
    flex: 1,
  },
  assignmentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  assignmentsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  appointmentsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    marginHorizontal: 4,
  },
  assignmentStatCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    // backgroundColor and colors will be set inline with theme
  },
  assignmentStatValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
    // color will be set inline with theme
  },
  assignmentStatLabel: {
    fontSize: 12,
    textAlign: 'center',
    // color will be set inline with theme
  },
  assignmentsList: {
    flex: 1,
  },
  assignmentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  assignmentInfo: {
    marginBottom: 12,
  },
  motherName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    // color will be set inline with theme
  },
  motherEmail: {
    fontSize: 14,
    marginBottom: 4,
    // color will be set inline with theme
  },
  dueDate: {
    fontSize: 14,
    marginBottom: 8,
    // color will be set inline with theme
  },
  consentStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  activityEmail: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginTop: 2,
  },
  activityNurse: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.6,
    marginTop: 2,
  },
  riskLevel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  assignmentActions: {
    borderTopWidth: 1,
    paddingTop: 12,
    // borderTopColor will be set inline with theme
  },
  assignedInfo: {
    alignItems: 'flex-start',
  },
  assignedTo: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '500',
    marginBottom: 4,
  },
  assignedDate: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
    marginBottom: 8,
  },
  removeButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  removeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  unassignedInfo: {
    alignItems: 'flex-start',
  },
  unassignedText: {
    fontSize: 14,
    marginBottom: 8,
    // color will be set inline with theme
  },
  nurseSelector: {
    width: '100%',
  },
  selectNurseLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginBottom: 8,
  },
  nurseOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 120,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  nurseOptionText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
    // color will be set inline with theme
  },
  nurseOptionCount: {
    fontSize: 10,
    // color will be set inline with theme
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
    marginTop: 16,
    // color will be set inline with theme
  },
  nurseCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  nurseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nurseName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    flex: 1,
  },
  nursePatientCount: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.7,
  },
  patientList: {
    marginTop: 8,
  },
  patientItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  patientName: {
    fontSize: 14,
    // color will be set inline with theme
  },
  removePatientButton: {
    padding: 4,
  },
  assignmentsSection: {
    marginBottom: 20,
  },
  
  // Forum Management Styles
  forumModerationContainer: {
    flex: 1,
  },
  forumModerationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  forumViewContainer: {
    marginBottom: 20,
  },
  forumViewButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  forumViewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 12,
    minHeight: 48,
    // backgroundColor, borderColor, width, and shadow will be set inline with theme
  },
  forumViewButtonActive: {
    // backgroundColor will be set inline with theme
  },
  forumViewButtonText: {
    fontSize: 13,
    marginLeft: 8,
    // color and fontWeight will be set inline with theme
  },
  forumViewButtonTextActive: {
    // color will be set inline with theme
  },
  forumContentContainer: {
    flex: 1,
  },
  forumLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  forumLoadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 10,
  },
  forumSectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 20,
    // color will be set inline with theme
  },
  forumStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  forumStatCard: {
    width: '48%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 16,
    marginRight: '2%',
    marginBottom: 12,
    alignItems: 'center',
  },
  forumStatNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 8,
  },
  forumStatLabel: {
    fontSize: 12,
    color: '#FFFFFF',
    marginTop: 4,
    textAlign: 'center',
  },
  forumStatSubLabel: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 2,
    textAlign: 'center',
  },
  topContributorsContainer: {
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    // backgroundColor, borderColor, and shadow will be set inline with theme
  },
  contributorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    // backgroundColor, borderColor, borderWidth, borderRadius, padding, marginBottom will be set inline
  },
  contributorRank: {
    justifyContent: 'center',
    alignItems: 'center',
    // width, height, borderRadius, backgroundColor will be set inline
  },
  contributorRankText: {
    fontWeight: '700',
    // color and fontSize will be set inline
  },
  contributorInfo: {
    flex: 1,
    // marginLeft will be set inline
  },
  contributorName: {
    fontWeight: '600',
    // color, fontSize, marginBottom will be set inline
  },
  contributorRole: {
    // color and fontSize will be set inline
  },
  contributorStats: {
    alignItems: 'flex-end',
  },
  contributorStatText: {
    // color and fontSize will be set inline
  },
  forumContentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  forumFilterContainer: {
    flexDirection: 'row',
  },
  forumFilterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginLeft: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  forumFilterButtonActive: {
    backgroundColor: '#FFFFFF',
    borderColor: '#FFFFFF',
  },
  forumFilterButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  forumFilterButtonTextActive: {
    color: '#4A90E2',
  },
  forumItemsList: {
    flex: 1,
    maxHeight: 400,
  },
  forumPostCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  forumPostHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  forumPostAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forumPostAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    // backgroundColor will be set inline with theme
  },
  forumPostAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  forumPostAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  forumPostDate: {
    fontSize: 12,
    marginTop: 2,
    // color will be set inline with theme
  },
  forumPostActions: {
    flexDirection: 'row',
  },
  forumActionButtonWarning: {
    backgroundColor: '#FF9800',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  forumActionButtonSuccess: {
    backgroundColor: '#4CAF50',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  forumActionButtonDanger: {
    backgroundColor: '#F44336',
    padding: 8,
    borderRadius: 6,
    marginLeft: 8,
  },
  forumPostContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    // color will be set inline with theme
  },
  forumPostStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forumPostStat: {
    fontSize: 12,
    // color will be set inline with theme
  },
  forumPostFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  forumPostFlagText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  forumCommentCard: {
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 16 : 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    // backgroundColor and borderLeftColor will be set inline with theme
  },
  forumCommentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  forumCommentAuthor: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forumCommentAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  forumCommentDate: {
    fontSize: 12,
    marginTop: 2,
    // color will be set inline with theme
  },
  forumCommentFlag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  forumCommentFlagText: {
    color: '#FF6B35',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  forumCommentContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
    // color will be set inline with theme
  },
  forumCommentPostContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    flexWrap: 'wrap',
  },
  forumCommentPost: {
    fontSize: 12,
    fontStyle: 'italic',
    flex: 1,
    marginRight: 8,
    // color will be set inline with theme
  },
  forumUserCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  forumUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  forumUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  forumUserAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  forumUserDetails: {
    flex: 1,
  },
  forumUserName: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  forumUserEmail: {
    fontSize: 12,
    marginTop: 2,
    // color will be set inline with theme
  },
  forumUserStats: {
    fontSize: 12,
    marginTop: 4,
    // color will be set inline with theme
  },
  forumUserStatus: {
    color: '#FFC107',
    fontSize: 11,
    marginTop: 4,
  },
  forumUserBanned: {
    color: '#FF5252',
    fontSize: 11,
    marginTop: 4,
    fontWeight: '600',
  },
  forumUserActions: {
    flexDirection: 'row',
  },
  forumUserActionWarn: {
    backgroundColor: '#17a2b8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  forumUserActionMute: {
    backgroundColor: '#FFC107',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  forumUserActionUnmute: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  forumUserActionBan: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  forumUserActionUnban: {
    backgroundColor: '#28a745',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 6,
  },
  forumUserActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  viewSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  viewButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  viewButtonActive: {
    // backgroundColor will be set inline with theme
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    // color will be set inline with theme
  },
  viewButtonTextActive: {
    // color will be set inline with theme
  },
  filterContainer: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    // color will be set inline with theme
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  filterButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    // backgroundColor, borderColor, marginRight, and marginBottom will be set inline with theme
  },
  filterButtonActive: {
    // backgroundColor will be set inline with theme
  },
  filterButtonText: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    // color will be set inline with theme
  },
  filterButtonTextActive: {
    fontWeight: '600',
    // color will be set inline with theme
  },
  appointmentCard: {
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    // backgroundColor and borderColor will be set inline with theme
  },
  appointmentCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  appointmentDate: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
    flexWrap: 'wrap',
    // color will be set inline with theme
  },
  appointmentInfo: {
    marginTop: 8,
  },
  appointmentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
    flexWrap: 'wrap',
  },
  appointmentText: {
    fontSize: 13,
    marginLeft: 8,
    flex: 1,
    flexWrap: 'wrap',
    // color will be set inline with theme
  },
  appointmentStatus: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  appointmentNotes: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  appointmentNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  appointmentNotesText: {
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.9)',
    fontStyle: 'italic',
  },
});

export default AdminDashboard;