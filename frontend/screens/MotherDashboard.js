import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Switch,
  FlatList,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { ResponsiveText, ResponsiveButton, ResponsiveCard, ResponsiveInput } from '../utils/ResponsiveComponents';
import { useToast } from '../utils/ToastContext';

const { width, height } = Dimensions.get('window');

export default function MotherDashboard({ navigation }) {
  const { userInfo, signOut } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const { showToast } = useToast();
  
  // State for due date
  const [dueDate, setDueDate] = useState('');
  const [dueDateLoading, setDueDateLoading] = useState(false);
  const [dueDateSaved, setDueDateSaved] = useState(false);
  
  // State for birthdate
  const [birthdate, setBirthdate] = useState('');
  const [birthdateLoading, setBirthdateLoading] = useState(false);
  const [birthdateSaved, setBirthdateSaved] = useState(false);
  const [calculatedAge, setCalculatedAge] = useState('');
  
  // State for health data form
  const [healthData, setHealthData] = useState({
    Age: '',
    SystolicBP: '',
    DiastolicBP: '',
    BS: '',
    BodyTemp: '',
    HeartRate: '',
  });
  const [healthDataLoading, setHealthDataLoading] = useState(false);
  
  // State for consent
  const [consentShared, setConsentShared] = useState(false);
  
  // State for health logs
  const [healthLogs, setHealthLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // State for profile data
  const [profileData, setProfileData] = useState(null);
  
  // State for upcoming appointments
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);
  
  // State for assigned nurse - explicitly set to false initially
  const [hasAssignedNurse, setHasAssignedNurse] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    loadProfileData();
    loadHealthLogs();
    loadConsentFromStorage();
    // Don't load appointments until we know if nurse is assigned
    // This will be called after profile data loads
  }, []);

  // Load appointments when hasAssignedNurse becomes true
  useEffect(() => {
    if (hasAssignedNurse && userInfo?.token) {
      console.log('hasAssignedNurse is true, loading appointments...');
      loadUpcomingAppointments();
    }
  }, [hasAssignedNurse, userInfo?.token]);

  // Refresh appointments when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      if (hasAssignedNurse && userInfo?.token) {
        console.log('Screen focused, refreshing appointments...');
        loadUpcomingAppointments();
      }
    });
    return unsubscribe;
  }, [navigation, hasAssignedNurse, userInfo?.token]);

  // Calculate age from birthdate
  const calculateAge = (birthdateStr) => {
    if (!birthdateStr) return '';
    try {
      const birth = new Date(birthdateStr);
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
      }
      return age.toString();
    } catch (error) {
      console.error('Error calculating age:', error);
      return '';
    }
  };

  const loadProfileData = async () => {
    try {
      setProfileLoading(true);
      const token = userInfo?.token;
      if (!token) {
        setHasAssignedNurse(false);
        setUpcomingAppointments([]);
        setProfileLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/get-mother-profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setProfileData(data.profile);
          // Explicitly check for true value
          const hasNurse = data.profile.has_assigned_nurse === true || data.profile.has_assigned_nurse === 1;
          setHasAssignedNurse(hasNurse);
          // Don't call loadUpcomingAppointments here - let useEffect handle it
          // This avoids race condition with state update
          if (!hasNurse) {
            setUpcomingAppointments([]); // Clear appointments if no nurse
          }
          if (data.profile.due_date) {
            setDueDate(data.profile.due_date);
            setDueDateSaved(true); // Mark as already saved if it exists
          }
          if (data.profile.birthdate) {
            setBirthdate(data.profile.birthdate);
            setBirthdateSaved(true); // Mark as already saved if it exists
            const age = calculateAge(data.profile.birthdate);
            setCalculatedAge(age);
            setHealthData(prev => ({ ...prev, Age: age }));
          }
        } else {
          setHasAssignedNurse(false);
          setUpcomingAppointments([]);
        }
      } else {
        setHasAssignedNurse(false);
        setUpcomingAppointments([]);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setHasAssignedNurse(false);
      setUpcomingAppointments([]);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadHealthLogs = async () => {
    setLogsLoading(true);
    try {
      const token = userInfo?.token;
      if (!token) return;

      const response = await fetch(`${API_URL}/get-health-logs`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setHealthLogs(data.logs);
        }
      }
    } catch (error) {
      console.error('Error loading health logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadConsentFromStorage = async () => {
    try {
      // First try to load from backend
      const token = userInfo?.token;
      if (token) {
        const response = await fetch(`${API_URL}/get-mother-profile`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'success' && data.profile.share_consent !== undefined) {
            setConsentShared(data.profile.share_consent);
            saveConsentToStorage(data.profile.share_consent);
            return;
          }
        }
      }

      // Fallback to local storage
      const consent = await AsyncStorage.getItem('mother_consent_shared');
      if (consent !== null) {
        setConsentShared(JSON.parse(consent));
      }
    } catch (error) {
      console.error('Error loading consent from storage:', error);
      // Fallback to local storage
      try {
        const consent = await AsyncStorage.getItem('mother_consent_shared');
        if (consent !== null) {
          setConsentShared(JSON.parse(consent));
        }
      } catch (fallbackError) {
        console.error('Error loading consent from fallback storage:', fallbackError);
      }
    }
  };

  const saveConsentToStorage = async (value) => {
    try {
      await AsyncStorage.setItem('mother_consent_shared', JSON.stringify(value));
    } catch (error) {
      console.error('Error saving consent to storage:', error);
    }
  };

  const handleDueDateUpdate = async () => {
    if (!dueDate) {
      Alert.alert('Error', 'Please enter a due date');
      return;
    }

    if (dueDateSaved) {
      Alert.alert('Info', 'Due date has already been saved for this session. You can only save it once per login.');
      return;
    }

    setDueDateLoading(true);
    try {
      const token = userInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }

      console.log('Sending due date update request to:', `${API_URL}/update-due-date`);
      console.log('Request body:', { due_date: dueDate });

      const response = await fetch(`${API_URL}/update-due-date`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ due_date: dueDate }),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Due date updated successfully!');
        setDueDateSaved(true); // Mark as saved
        loadProfileData(); // Refresh profile data
      } else {
        Alert.alert('Error', data.message || 'Failed to update due date');
      }
    } catch (error) {
      console.error('Error updating due date:', error);
      Alert.alert('Error', `Failed to update due date: ${error.message}`);
    } finally {
      setDueDateLoading(false);
    }
  };

  const handleBirthdateUpdate = async () => {
    if (!birthdate) {
      Alert.alert('Error', 'Please enter a valid birthdate');
      return;
    }

    setBirthdateLoading(true);
    try {
      const token = userInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }

      console.log('Sending birthdate update request to:', `${API_URL}/update-birthdate`);
      console.log('Request body:', { birthdate: birthdate });

      const response = await fetch(`${API_URL}/update-birthdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ birthdate }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Birthdate updated successfully!');
        setBirthdateSaved(true);
        // Calculate and set age
        const age = calculateAge(birthdate);
        setCalculatedAge(age);
        setHealthData(prev => ({ ...prev, Age: age }));
        loadProfileData(); // Refresh profile data
      } else {
        Alert.alert('Error', data.message || 'Failed to update birthdate');
      }
    } catch (error) {
      console.error('Error updating birthdate:', error);
      Alert.alert('Error', `Failed to update birthdate: ${error.message}`);
    } finally {
      setBirthdateLoading(false);
    }
  };

  const handleHealthDataSubmit = async () => {
    // Validate required fields (excluding Age since it's auto-calculated)
    const requiredFields = ['SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate'];
    for (const field of requiredFields) {
      if (!healthData[field] || isNaN(healthData[field])) {
        Alert.alert('Error', `Please enter a valid number for ${field}`);
        return;
      }
    }

    // Validate age if not already calculated
    if (!healthData.Age || isNaN(healthData.Age)) {
      Alert.alert('Error', 'Please set your birthdate first to calculate age automatically');
      return;
    }

    setHealthDataLoading(true);
    try {
      const token = userInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }

      const requestBody = {
        health_data: {
          Age: parseInt(healthData.Age),
          SystolicBP: parseInt(healthData.SystolicBP),
          DiastolicBP: parseInt(healthData.DiastolicBP),
          BS: parseInt(healthData.BS),
          BodyTemp: parseFloat(healthData.BodyTemp),
          HeartRate: parseInt(healthData.HeartRate),
        },
        consent_shared: consentShared,
      };

      console.log('Sending health data update request to:', `${API_URL}/update-health-log`);
      console.log('Request body:', requestBody);

      const response = await fetch(`${API_URL}/update-health-log`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error text:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.status === 'success') {
        Alert.alert('Success', 'Health data saved successfully!');
        // Clear form
        setHealthData({
          Age: '',
          SystolicBP: '',
          DiastolicBP: '',
          BS: '',
          BodyTemp: '',
          HeartRate: '',
        });
        // Refresh health logs
        loadHealthLogs();
      } else {
        Alert.alert('Error', data.message || 'Failed to save health data');
      }
    } catch (error) {
      console.error('Error saving health data:', error);
      Alert.alert('Error', `Failed to save health data: ${error.message}`);
    } finally {
      setHealthDataLoading(false);
    }
  };

  const handleConsentToggle = async (value) => {
    try {
      const token = userInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        return;
      }

      const response = await fetch(`${API_URL}/update-consent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ consent: value }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setConsentShared(value);
          saveConsentToStorage(value);
          Alert.alert(
            'Success', 
            value ? 'Your health data is now shared with nurses for better care.' : 'Your health data is now private.'
          );
        } else {
          Alert.alert('Error', data.message || 'Failed to update consent');
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('Error updating consent:', error);
      Alert.alert('Error', 'Failed to update consent. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderHealthLogItem = ({ item }) => (
    <View style={styles.logItem}>
      <View style={styles.logHeader}>
        <Text style={styles.logDate}>{formatDate(item.timestamp)}</Text>
        <View style={styles.consentIndicator}>
          <Ionicons 
            name={item.consent_shared ? "checkmark-circle" : "close-circle"} 
            size={16} 
            color={item.consent_shared ? theme.success : theme.error} 
          />
          <Text style={[styles.consentText, { color: item.consent_shared ? theme.success : theme.error }]}>
            {item.consent_shared ? 'Shared' : 'Private'}
          </Text>
        </View>
      </View>
      <View style={styles.logData}>
        <Text style={styles.logDataText}>Age: {item.data.Age}</Text>
        <Text style={styles.logDataText}>BP: {item.data.SystolicBP}/{item.data.DiastolicBP}</Text>
        <Text style={styles.logDataText}>Blood Sugar: {item.data.BS}</Text>
        <Text style={styles.logDataText}>Temp: {item.data.BodyTemp}°F</Text>
        <Text style={styles.logDataText}>Heart Rate: {item.data.HeartRate} bpm</Text>
      </View>
    </View>
  );

  const handleLogout = async () => {
    console.log('[MotherDashboard] Logging out...');
    await signOut();
    // Navigation will automatically handle redirect due to userInfo change
  };

  const loadUpcomingAppointments = async () => {
    try {
      const token = userInfo?.token;
      if (!token) {
        console.log('No token available for loading appointments');
        return;
      }
      if (!hasAssignedNurse) {
        console.log('No assigned nurse, skipping appointment load');
        setUpcomingAppointments([]);
        return;
      }

      console.log('Loading upcoming appointments...');
      const response = await fetch(`${API_URL}/get-appointments`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Filter to show only upcoming appointments
          const now = new Date();
          const upcoming = (data.appointments || []).filter(apt => {
            // Use date_time if approved, otherwise use requested_date
            const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
            return aptDate >= now && apt.status !== 'cancelled';
          }).sort((a, b) => {
            const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
            const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
            return dateA - dateB;
          });
          console.log(`Loaded ${upcoming.length} upcoming appointments`);
          setUpcomingAppointments(upcoming);
        } else {
          console.error('Failed to load appointments:', data.message);
          setUpcomingAppointments([]);
        }
      } else {
        console.error('Failed to load upcoming appointments:', response.status, response.statusText);
        setUpcomingAppointments([]);
      }
    } catch (error) {
      console.error('Error loading upcoming appointments:', error);
      setUpcomingAppointments([]);
    }
  };

  const handleRescheduleResponse = async (appointmentId, action) => {
    try {
      const token = userInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token missing');
        return;
      }

      const response = await fetch(`${API_URL}/respond-to-reschedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: appointmentId,
          action: action,
        }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        if (action === 'accept') {
          Alert.alert('Success', 'Reschedule request accepted successfully!');
        } else {
          // Show the rejection popup message
          Alert.alert(
            'Reschedule Rejected',
            'Sorry for the inconvenience caused. Please feel free to book an appointment for your convenient time on the same day or another date as per your availability.',
            [
              {
                text: 'Book New Appointment',
                onPress: () => navigation.navigate('AppointmentScheduling'),
                style: 'default',
              },
              {
                text: 'OK',
                style: 'cancel',
              },
            ]
          );
        }
        // Reload appointments to reflect the change
        loadUpcomingAppointments();
      } else {
        Alert.alert('Error', data.message || 'Failed to respond to reschedule request');
      }
    } catch (error) {
      console.error('Error responding to reschedule:', error);
      Alert.alert('Error', 'Failed to respond to reschedule request. Please try again.');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && (
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={theme.background}
          />
        )}
        
        {/* Modern Header */}
        <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
          <View style={styles.headerContent}>
            <View style={[styles.profileIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.welcomeSection}>
              <ResponsiveText size="sm" color={theme.textSecondary} style={styles.welcomeText}>
                Welcome back,
              </ResponsiveText>
              <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.userName}>
                {userInfo?.full_name?.split(' ')[0] || 'Mother'}
              </ResponsiveText>
            </View>
          </View>
          <TouchableOpacity onPress={handleLogout} style={[styles.logoutButton, { backgroundColor: theme.backgroundSecondary }]}>
            <Ionicons name="log-out-outline" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            {/* Upcoming Appointments Section - Only show if nurse is assigned */}
            {!profileLoading && hasAssignedNurse === true && (
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.cardTitle}>
                    Upcoming Appointments
                  </ResponsiveText>
                  <View style={styles.cardHeaderActions}>
                    <TouchableOpacity 
                      onPress={() => navigation.navigate('AppointmentScheduling')}
                      style={[styles.requestButton, { backgroundColor: theme.primary }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                      <Text style={[styles.requestButtonText, { color: '#FFFFFF' }]}>Request</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={loadUpcomingAppointments} 
                      style={[styles.refreshButton, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {upcomingAppointments.length > 0 ? (
                  upcomingAppointments.slice(0, 3).map((appointment) => {
                    const displayDate = appointment.date_time || appointment.requested_date;
                    const statusColors = {
                      'approved': theme.success,
                      'pending': theme.warning,
                      'reschedule_requested': '#FF9800',
                      'cancelled': theme.error
                    };
                    return (
                      <View key={appointment.id} style={styles.appointmentItem}>
                        <View style={styles.appointmentHeader}>
                          <Ionicons 
                            name="time-outline" 
                            size={18} 
                            color={theme.primary} 
                            style={styles.appointmentIcon}
                          />
                          <View style={styles.appointmentDetails}>
                            <Text style={[styles.appointmentDate, { color: theme.text }]}>
                              {formatDate(displayDate)}
                              {appointment.status === 'approved' && appointment.date_time ? ' (Approved)' : 
                               appointment.status === 'pending' ? ' (Requested)' : 
                               appointment.status === 'reschedule_requested' ? ' (Reschedule Requested)' : ''}
                            </Text>
                            <View style={styles.appointmentStatusBadge}>
                              <Text style={[
                                styles.appointmentStatus, 
                                { color: statusColors[appointment.status] || theme.text }
                              ]}>
                                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('_', ' ')}
                              </Text>
                            </View>
                          </View>
                        </View>
                        {appointment.notes && (
                          <Text style={[styles.appointmentNotes, { color: theme.textSecondary }]}>
                            {appointment.notes}
                          </Text>
                        )}
                        {appointment.reschedule_notes && (
                          <Text style={[styles.appointmentNotes, { color: '#FF9800', fontStyle: 'italic' }]}>
                            Nurse Note: {appointment.reschedule_notes}
                          </Text>
                        )}
                        {appointment.status === 'reschedule_requested' && (
                          <View style={styles.rescheduleActions}>
                            <ResponsiveButton
                              variant="success"
                              onPress={() => handleRescheduleResponse(appointment.id, 'accept')}
                              style={styles.rescheduleButton}
                              leftIcon="checkmark-circle-outline"
                            >
                              Accept
                            </ResponsiveButton>
                            <ResponsiveButton
                              variant="outline"
                              onPress={() => handleRescheduleResponse(appointment.id, 'reject')}
                              style={styles.rescheduleButton}
                              leftIcon="close-circle-outline"
                            >
                              Reject
                            </ResponsiveButton>
                          </View>
                        )}
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="calendar-outline" size={48} color={theme.placeholder} />
                    <ResponsiveText size="base" color={theme.text} style={styles.emptyText}>
                      No upcoming appointments
                    </ResponsiveText>
                    <ResponsiveButton
                      variant="primary"
                      onPress={() => navigation.navigate('AppointmentScheduling')}
                      style={{ marginTop: 12 }}
                    >
                      Request Appointment
                    </ResponsiveButton>
                  </View>
                )}
                {upcomingAppointments.length > 3 && (
                  <TouchableOpacity 
                    onPress={() => navigation.navigate('AppointmentScheduling')}
                    style={styles.viewAllButton}
                  >
                    <Text style={[styles.viewAllText, { color: theme.primary }]}>
                      View All Appointments ({upcomingAppointments.length})
                    </Text>
                  </TouchableOpacity>
                )}
              </ResponsiveCard>
            )}
            
            {!profileLoading && hasAssignedNurse === false && (
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.emptyState}>
                  <Ionicons name="medical-outline" size={48} color={theme.placeholder} />
                  <ResponsiveText size="base" weight="bold" color={theme.text} style={styles.emptyText}>
                    No Nurse Assigned
                  </ResponsiveText>
                  <ResponsiveText size="sm" color={theme.textSecondary} style={[styles.emptyText, { marginTop: 8 }]}>
                    Please contact an administrator to assign a nurse before scheduling appointments.
                  </ResponsiveText>
                </View>
              </ResponsiveCard>
            )}

            {/* Main Content */}

              {/* Due Date Section */}
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.cardTitle}>
                    Due Date
                  </ResponsiveText>
                </View>
                <View style={styles.inputGroup}>
                  <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                    Expected Due Date
                  </ResponsiveText>
                  <ResponsiveInput
                    placeholder="YYYY-MM-DD"
                    value={dueDate}
                    onChangeText={setDueDate}
                    leftIcon="calendar"
                    editable={!dueDateSaved}
                    style={styles.inputWrapper}
                  />
                </View>
                <ResponsiveButton
                  variant={dueDateSaved ? "success" : "primary"}
                  onPress={handleDueDateUpdate}
                  disabled={dueDateLoading || dueDateSaved}
                  loading={dueDateLoading}
                  style={styles.primaryButton}
                >
                  {dueDateSaved ? "Due Date Saved ✓" : "Update Due Date"}
                </ResponsiveButton>
              </ResponsiveCard>

              {/* Birthdate Section */}
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                  <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.cardTitle}>
                    Birth Date
                  </ResponsiveText>
                </View>
                <View style={styles.inputGroup}>
                  <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                    Your Birth Date
                  </ResponsiveText>
                  <ResponsiveInput
                    placeholder="YYYY-MM-DD"
                    value={birthdate}
                    onChangeText={setBirthdate}
                    leftIcon="calendar"
                    editable={!birthdateSaved}
                    style={styles.inputWrapper}
                  />
                  {calculatedAge && (
                    <ResponsiveText size="xs" color={theme.textTertiary} style={{ marginTop: 4 }}>
                      Your age is calculated as: {calculatedAge} years
                    </ResponsiveText>
                  )}
                </View>
                <ResponsiveButton
                  variant={birthdateSaved ? "success" : "primary"}
                  onPress={handleBirthdateUpdate}
                  disabled={birthdateLoading || birthdateSaved}
                  loading={birthdateLoading}
                  style={styles.primaryButton}
                >
                  {birthdateSaved ? "Birthdate Saved ✓" : "Update Birthdate"}
                </ResponsiveButton>
              </ResponsiveCard>

              {/* Health Data Section */}
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="medical-outline" size={24} color={theme.primary} />
                  <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.cardTitle}>
                    Health Data Log
                  </ResponsiveText>
                </View>
                
                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Age {calculatedAge && '(Auto-calculated)'}
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder={birthdateSaved ? "Auto-calculated" : "Set birthdate first"}
                      value={healthData.Age}
                      leftIcon="person"
                      editable={false}
                      keyboardType="numeric"
                      style={[styles.inputWrapper, !birthdateSaved && styles.disabledInput]}
                    />
                  </View>

                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Blood Sugar
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder="mg/dL"
                      value={healthData.BS}
                      onChangeText={(value) => setHealthData(prev => ({ ...prev, BS: value }))}
                      leftIcon="water"
                      keyboardType="numeric"
                      style={styles.inputWrapper}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Systolic BP
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder="Systolic"
                      value={healthData.SystolicBP}
                      onChangeText={(value) => setHealthData(prev => ({ ...prev, SystolicBP: value }))}
                      leftIcon="heart"
                      keyboardType="numeric"
                      style={styles.inputWrapper}
                    />
                  </View>

                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Diastolic BP
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder="Diastolic"
                      value={healthData.DiastolicBP}
                      onChangeText={(value) => setHealthData(prev => ({ ...prev, DiastolicBP: value }))}
                      leftIcon="heart"
                      keyboardType="numeric"
                      style={styles.inputWrapper}
                    />
                  </View>
                </View>

                <View style={styles.inputRow}>
                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Body Temperature
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder="°F"
                      value={healthData.BodyTemp}
                      onChangeText={(value) => setHealthData(prev => ({ ...prev, BodyTemp: value }))}
                      leftIcon="thermometer"
                      keyboardType="numeric"
                      style={styles.inputWrapper}
                    />
                  </View>

                  <View style={styles.inputGroupHalf}>
                    <ResponsiveText size="sm" weight="medium" color={theme.textSecondary} style={styles.inputLabel}>
                      Heart Rate
                    </ResponsiveText>
                    <ResponsiveInput
                      placeholder="bpm"
                      value={healthData.HeartRate}
                      onChangeText={(value) => setHealthData(prev => ({ ...prev, HeartRate: value }))}
                      leftIcon="heart"
                      keyboardType="numeric"
                      style={styles.inputWrapper}
                    />
                  </View>
                </View>

                {/* Consent Toggle */}
                <View style={styles.consentContainer}>
                  <View style={styles.consentRow}>
                    <View style={styles.consentInfo}>
                      <Ionicons name="people" size={20} color={theme.primary} />
                      <View style={styles.consentText}>
                        <ResponsiveText size="sm" weight="semibold" color={theme.text} style={styles.consentTitle}>
                          Share with Nurses
                        </ResponsiveText>
                        <ResponsiveText size="xs" color={theme.textSecondary} style={styles.consentDescription}>
                          Allow nurses to view your health data for better care
                        </ResponsiveText>
                      </View>
                    </View>
                    <Switch
                      value={consentShared}
                      onValueChange={handleConsentToggle}
                      trackColor={{ false: theme.border, true: theme.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>

                <ResponsiveButton
                  variant="primary"
                  onPress={handleHealthDataSubmit}
                  disabled={healthDataLoading}
                  loading={healthDataLoading}
                  style={styles.primaryButton}
                >
                  Save Health Data
                </ResponsiveButton>
              </ResponsiveCard>

              {/* Navigation Buttons - Mobile Optimized */}
              <View style={styles.navigationGrid}>
                <ResponsiveButton
                  variant="primary"
                  onPress={() => navigation.navigate('PregnancyTimeline')}
                  leftIcon="calendar-outline"
                  style={styles.navButton}
                  textStyle={styles.navButtonText}
                >
                  Pregnancy Timeline
                </ResponsiveButton>

                {hasAssignedNurse === true && (
                  <ResponsiveButton
                    variant="primary"
                    onPress={() => navigation.navigate('AppointmentScheduling')}
                    leftIcon="calendar"
                    style={styles.navButton}
                    textStyle={styles.navButtonText}
                  >
                    Schedule Appointment
                  </ResponsiveButton>
                )}

                <ResponsiveButton
                  variant="primary"
                  onPress={() => navigation.navigate('ChatBot')}
                  leftIcon="chatbubble-outline"
                  style={styles.navButton}
                  textStyle={styles.navButtonText}
                >
                  AI Assistant
                </ResponsiveButton>
              </View>

              {/* Health History Section */}
              <ResponsiveCard variant="elevated" style={styles.card}>
                <View style={styles.cardHeader}>
                  <Ionicons name="list-outline" size={24} color={theme.primary} />
                  <ResponsiveText size="lg" weight="bold" color={theme.text} style={styles.cardTitle}>
                    Health History
                  </ResponsiveText>
                  <TouchableOpacity onPress={loadHealthLogs} style={styles.refreshButton}>
                    <Ionicons name="refresh-outline" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>
            
                {logsLoading ? (
                  <ActivityIndicator size="large" color={theme.primary} style={styles.loading} />
                ) : healthLogs.length > 0 ? (
                  <FlatList
                    data={healthLogs}
                    renderItem={renderHealthLogItem}
                    keyExtractor={(item) => item.id.toString()}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Ionicons name="document-outline" size={48} color={theme.textTertiary} />
                    <ResponsiveText size="base" color={theme.text} style={styles.emptyText}>
                      No health data logged yet. Start by adding your health information above.
                    </ResponsiveText>
                  </View>
                )}
              </ResponsiveCard>
            </View>
        </ScrollView>
        
        {/* Floating Forum Button */}
        <TouchableOpacity
          style={[styles.forumButton, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('Forum')}
          activeOpacity={0.8}
        >
          <Ionicons name="people-circle-outline" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingVertical: Platform.OS === 'web' ? 16 : 12,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: Platform.OS === 'web' ? 50 : 44,
    height: Platform.OS === 'web' ? 50 : 44,
    borderRadius: Platform.OS === 'web' ? 25 : 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 15 : 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  welcomeSection: {
    flex: 1,
  },
  welcomeText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  userName: {
    marginTop: Platform.OS === 'web' ? 2 : 4,
    fontSize: Platform.OS === 'web' ? 20 : 18,
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
  },
  forumButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    borderRadius: 28,
    padding: 14,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      elevation: 4,
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 4,
    }),
  },
  content: {
    flex: 1,
    paddingHorizontal: Platform.OS === 'web' ? 20 : 16,
    paddingBottom: Platform.OS === 'web' ? 20 : 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 20 : 16,
    marginBottom: Platform.OS === 'web' ? 16 : 12,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
    } : {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.04,
      shadowRadius: 8,
      elevation: 2,
    }),
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 20 : 16,
    flexWrap: Platform.OS === 'web' ? 'nowrap' : 'wrap',
  },
  cardTitle: {
    marginLeft: Platform.OS === 'web' ? 12 : 10,
    flex: 1,
    fontSize: Platform.OS === 'web' ? undefined : 16,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.OS === 'web' ? 8 : 6,
  },
  requestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Platform.OS === 'web' ? 14 : 14,
    paddingVertical: Platform.OS === 'web' ? 8 : 10,
    borderRadius: 8,
    gap: Platform.OS === 'web' ? 6 : 6,
    minHeight: Platform.OS === 'web' ? undefined : 40,
    justifyContent: 'center',
  },
  requestButtonText: {
    fontSize: Platform.OS === 'web' ? 14 : 14,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  refreshButton: {
    padding: Platform.OS === 'web' ? 10 : 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: Platform.OS === 'web' ? 40 : 40,
    minHeight: Platform.OS === 'web' ? 40 : 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputGroup: {
    marginBottom: Platform.OS === 'web' ? 16 : 14,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroupHalf: {
    flex: 1,
    marginRight: 8,
  },
  inputLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 14,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: Platform.OS === 'web' ? 8 : 8,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
    paddingHorizontal: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    color: '#1E1E1E',
    paddingVertical: Platform.OS === 'web' ? undefined : 4,
  },
  disabledInput: {
    opacity: 0.5,
  },
  disabledTextInput: {
    color: '#9CA3AF',
  }, 
  primaryButton: {
    marginTop: Platform.OS === 'web' ? 8 : 12,
    minHeight: Platform.OS === 'web' ? undefined : 50,
    paddingVertical: Platform.OS === 'web' ? undefined : 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  consentContainer: {
    marginTop: Platform.OS === 'web' ? 16 : 12,
    padding: Platform.OS === 'web' ? 16 : 14,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  consentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  consentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  consentText: {
    marginLeft: 12,
    flex: 1,
  },
  consentTitle: {
    marginBottom: 4,
  },
  consentDescription: {
    lineHeight: 20,
  },
  navigationGrid: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: Platform.OS === 'web' ? 'wrap' : 'nowrap',
    justifyContent: Platform.OS === 'web' ? 'space-between' : 'stretch',
    marginBottom: Platform.OS === 'web' ? 16 : 16,
    gap: Platform.OS === 'web' ? 0 : 12,
  },
  navButton: {
    width: Platform.OS === 'web' ? (width - 60) / 3 : '100%',
    marginBottom: Platform.OS === 'web' ? 12 : 12,
    minWidth: Platform.OS === 'web' ? 0 : undefined,
    minHeight: Platform.OS === 'web' ? undefined : 52,
    paddingVertical: Platform.OS === 'web' ? undefined : 14,
    paddingHorizontal: Platform.OS === 'web' ? undefined : 20,
  },
  navButtonText: {
    fontSize: Platform.OS === 'web' ? 15 : 15,
    fontWeight: Platform.OS === 'web' ? '600' : '600',
    letterSpacing: Platform.OS === 'web' ? 0.2 : 0.3,
  },
  logItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  logDate: {
    fontSize: Platform.OS === 'web' ? 12 : 13,
    color: '#666',
    fontWeight: '500',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  consentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  consentText: {
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  logData: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  logDataText: {
    fontSize: Platform.OS === 'web' ? 13 : 14,
    color: '#1E1E1E',
    marginRight: Platform.OS === 'web' ? 16 : 12,
    marginBottom: Platform.OS === 'web' ? 4 : 6,
    fontWeight: '500',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  loading: {
    marginVertical: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 14 : 15,
    color: '#666',
    marginTop: Platform.OS === 'web' ? 12 : 12,
    lineHeight: Platform.OS === 'web' ? 20 : 22,
    paddingHorizontal: Platform.OS === 'web' ? undefined : 16,
  },
  appointmentItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  appointmentIcon: {
    marginRight: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: Platform.OS === 'web' ? 15 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 4 : 6,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  appointmentStatusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#E8E9FF',
  },
  appointmentStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  appointmentNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
  },
  rescheduleActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  rescheduleButton: {
    flex: 1,
    marginTop: 0,
  },
  viewAllButton: {
    paddingVertical: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    marginTop: 8,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
