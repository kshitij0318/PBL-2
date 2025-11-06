import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { API_URL } from '../utils/config';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
};

export default function PatientTracking({ navigation }) {
  const { userInfo } = useAuth();
  const { theme } = useTheme();
  
  // State for data
  const [assignedMothers, setAssignedMothers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('patients'); // 'patients' | 'appointments'
  const [appointments, setAppointments] = useState([]);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  useEffect(() => {
    loadData();
    if (userInfo?.role === 'nurse') {
      loadAppointments();
    }
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading assigned mothers data...');
      
      // Only load assigned mothers for nurses - they can no longer see all mothers
      const assignedMothersResponse = await fetch(`${API_URL}/nurse/assigned-mothers`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${userInfo?.token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Assigned mothers response status:', assignedMothersResponse.status);

      if (assignedMothersResponse.ok) {
        const assignedMothersData = await assignedMothersResponse.json();
        console.log('Assigned mothers data:', assignedMothersData);
        if (assignedMothersData.status === 'success') {
          console.log('Raw assigned mothers from API:', assignedMothersData.assigned_mothers);
          console.log('Each assigned mother structure:', assignedMothersData.assigned_mothers.map(m => ({
            id: m.id,
            full_name: m.full_name,
            assigned_at: m.assigned_at
          })));
          setAssignedMothers(assignedMothersData.assigned_mothers);
          console.log('Set assignedMothers:', assignedMothersData.assigned_mothers);
        }
      } else {
        const errorData = await assignedMothersResponse.json();
        console.error('Error loading assigned mothers:', errorData);
        setError(errorData.message || 'Failed to load assigned mothers data.');
      }
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    if (userInfo?.role === 'nurse') {
      await loadAppointments();
    }
    setRefreshing(false);
  };

  const loadAppointments = async () => {
    try {
      setAppointmentsLoading(true);
      const token = userInfo?.token;
      if (!token) return;

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
          // Filter to show all upcoming appointments (approved and pending)
          const now = new Date();
          const upcoming = (data.appointments || []).filter(apt => {
            // Use date_time if approved, otherwise use requested_date
            const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
            return aptDate >= now && apt.status !== 'cancelled';
          }).sort((a, b) => {
            // Sort chronologically by date/time
            const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
            const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
            return dateA - dateB;
          });
          setAppointments(upcoming);
        }
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setAppointmentsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeSlot = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return themeColors.success;
      case 'cancelled': return themeColors.error;
      case 'pending': return themeColors.warning;
      default: return themeColors.text;
    }
  };

  // Nurses can no longer assign or remove mothers - only admins can do this
  const showAssignmentInfo = () => {
    Alert.alert(
      'Assignment Management',
      'Only administrators can assign or remove mother-nurse assignments. Please contact an administrator if you need changes to your patient assignments.',
      [{ text: 'OK' }]
    );
  };

  const navigateToRiskPrediction = (mother) => {
    navigation.navigate('Predict', { 
      selectedMother: mother,
      useMotherData: true 
    });
  };

  const navigateToImportData = (mother) => {
    navigation.navigate('Predict', { 
      selectedMother: mother,
      importDataMode: true 
    });
  };


  const renderMotherItem = ({ item }) => {
    console.log('renderMotherItem called with:', { item: item.id, itemType: item.type });

    return (
      <View style={[styles.motherCard, { backgroundColor: theme.white }]}>
        <View style={styles.motherInfo}>
          <View style={styles.motherHeader}>
            <Text style={[styles.motherName, { color: theme.darkText }]}>
              {item.full_name}
            </Text>
            <View style={styles.consentBadge}>
              <Ionicons 
                name={item.share_consent ? 'checkmark-circle' : 'close-circle'} 
                size={16} 
                color={item.share_consent ? themeColors.success : themeColors.error} 
              />
              <Text style={[styles.consentText, { 
                color: item.share_consent ? themeColors.success : themeColors.error 
              }]}>
                {item.share_consent ? 'Consent' : 'No Consent'}
              </Text>
            </View>
          </View>
          
          <Text style={[styles.motherEmail, { color: theme.text }]}>
            {item.email}
          </Text>
          
          {item.due_date && (
            <Text style={[styles.dueDate, { color: theme.text }]}>
              Due Date: {new Date(item.due_date).toLocaleDateString()}
            </Text>
          )}

          <View style={[styles.assignedInfo, { backgroundColor: themeColors.lightPrimary }]}>
            <Ionicons name="person" size={14} color={themeColors.primary} />
            <Text style={[styles.assignedText, { color: theme.text }]}>
              Assigned to you on {new Date(item.assigned_at).toLocaleDateString()}
            </Text>
          </View>
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.viewButton, { backgroundColor: themeColors.primary }]}
            onPress={() => navigateToRiskPrediction(item)}
          >
            <Ionicons name="analytics" size={16} color={themeColors.white} />
            <Text style={[styles.buttonText, { color: themeColors.white }]}>
              View Risk
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.importButton, { backgroundColor: themeColors.success }]}
            onPress={() => navigateToImportData(item)}
          >
            <Ionicons name="download" size={16} color={themeColors.white} />
            <Text style={[styles.buttonText, { color: themeColors.white }]}>
              Import Data
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ title, count }) => (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
        {title}
      </Text>
      {count > 0 && (
        <View style={[styles.sectionBadge, { backgroundColor: themeColors.primary }]}>
          <Text style={styles.sectionBadgeText}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading patient data...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderAppointmentItem = ({ item }) => {
    // Find the mother for this appointment
    const mother = assignedMothers.find(m => m.id === item.mother_id);
    const displayDateTime = item.date_time || item.requested_date;
    const dateObj = new Date(displayDateTime);
    
    return (
      <View style={[styles.appointmentCard, { backgroundColor: themeColors.white }]}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <View style={[styles.appointmentIconContainer, { backgroundColor: themeColors.lightPrimary }]}>
              <Ionicons name="calendar" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={[styles.appointmentDate, { color: themeColors.darkText }]}>
                {dateObj.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
              <View style={styles.timeSlotContainer}>
                <Ionicons name="time-outline" size={14} color={themeColors.primary} />
                <Text style={[styles.timeSlot, { color: themeColors.primary }]}>
                  {formatTimeSlot(displayDateTime)}
                </Text>
              </View>
              {mother && (
                <View style={styles.motherInfoContainer}>
                  <Ionicons name="person-outline" size={14} color={themeColors.text} />
                  <Text style={[styles.appointmentMother, { color: themeColors.text }]}>
                    {mother.full_name}
                  </Text>
                </View>
              )}
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status === 'approved' ? 'Approved' : 
               item.status === 'pending' ? 'Pending' :
               item.status === 'reschedule_requested' ? 'Reschedule' :
               item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>
        {item.notes && (
          <View style={styles.notesContainer}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={14} color={themeColors.text} />
              <Text style={[styles.notesLabel, { color: themeColors.text }]}>
                Mother's Notes:
              </Text>
            </View>
            <Text style={[styles.appointmentNotes, { color: themeColors.darkText }]}>
              {item.notes}
            </Text>
          </View>
        )}
        {item.reschedule_notes && (
          <View style={[styles.notesContainer, { backgroundColor: themeColors.warning + '10' }]}>
            <View style={styles.notesHeader}>
              <Ionicons name="alert-circle-outline" size={14} color={themeColors.warning} />
              <Text style={[styles.notesLabel, { color: themeColors.warning }]}>
                Reschedule Notes:
              </Text>
            </View>
            <Text style={[styles.appointmentNotes, { color: themeColors.darkText }]}>
              {item.reschedule_notes}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Count pending requests for badge
  const pendingRequestsCount = appointments.filter(apt => 
    apt.status === 'pending' || apt.status === 'reschedule_requested'
  ).length;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}> 
      {/* Improved Header */}
      <View style={[styles.header, { backgroundColor: themeColors.white }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: themeColors.darkText }]}>
            Patient Tracking
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Improved Tab Selector */}
      {userInfo?.role === 'nurse' && (
        <View style={[styles.tabContainer, { backgroundColor: themeColors.white }]}>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'patients' && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab('patients')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'patients' && styles.tabTextActive
            ]}>
              Patients
            </Text>
            {activeTab === 'patients' && (
              <View style={[styles.tabIndicator, { backgroundColor: themeColors.primary }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tabButton,
              activeTab === 'appointments' && styles.tabButtonActive
            ]}
            onPress={() => setActiveTab('appointments')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              activeTab === 'appointments' && styles.tabTextActive
            ]}>
              Next Appointments
            </Text>
            {activeTab === 'appointments' && (
              <View style={[styles.tabIndicator, { backgroundColor: themeColors.primary }]} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.tabButtonRequest}
            onPress={() => navigation.navigate('NurseAppointments')}
            activeOpacity={0.7}
          >
            <View style={styles.tabIconContainer}>
              <Ionicons name="clipboard-outline" size={18} color={themeColors.primary} />
              {pendingRequestsCount > 0 && (
                <View style={[styles.badge, { backgroundColor: themeColors.primary }]}>
                  <Text style={styles.badgeText}>{pendingRequestsCount}</Text>
                </View>
              )}
            </View>
            <Text style={[styles.tabTextRequest, { color: themeColors.primary }]}>
              Manage Requests
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'patients' ? (
        <FlatList
        data={(() => {
          const flatListData = [
            { type: 'header', title: 'Your Assigned Patients', count: assignedMothers.length },
            ...assignedMothers.map(mother => ({ ...mother, type: 'assigned' }))
          ];
          console.log('FlatList data structure:');
          console.log('- Total items:', flatListData.length);
          console.log('- Headers:', flatListData.filter(item => item.type === 'header').map(h => ({ title: h.title, count: h.count })));
          console.log('- Assigned mothers:', flatListData.filter(item => item.type === 'assigned').map(m => ({ id: m.id, name: m.full_name, type: m.type })));
          return flatListData;
        })()}
        keyExtractor={(item, index) => item.type === 'header' ? `header-${index}` : `mother-${item.id}`}
        renderItem={({ item }) => {
          if (item.type === 'header') {
            return renderSectionHeader({ title: item.title, count: item.count });
          }
          return renderMotherItem({ item });
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.primary]}
            tintColor={theme.primary}
          />
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        bounces={true}
        removeClippedSubviews={false}
      />
      ) : (
        appointmentsLoading && appointments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.text }]}>
              Loading appointments...
            </Text>
          </View>
        ) : (
          <FlatList
            data={appointments}
            keyExtractor={(item) => `appointment-${item.id}`}
            renderItem={renderAppointmentItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[theme.primary]}
                tintColor={theme.primary}
              />
            }
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={true}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color={themeColors.placeholder} />
                <Text style={[styles.emptyText, { color: themeColors.darkText, fontWeight: '600' }]}>
                  No Upcoming Appointments
                </Text>
                <Text style={[styles.emptySubtext, { color: themeColors.text, marginTop: 8 }]}>
                  All scheduled appointments will appear here
                </Text>
              </View>
            )}
          />
        )
      )}

      {error && (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: themeColors.error }]}>
            {error}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadData}
          >
            <Text style={[styles.retryButtonText, { color: themeColors.white }]}>
              Retry
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 100, // Extra padding at bottom for better scrolling
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  sectionBadgeText: {
    color: themeColors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  motherCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  motherInfo: {
    marginBottom: 16,
  },
  motherHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  motherName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  consentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  consentText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  motherEmail: {
    fontSize: 14,
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  assignedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  assignedText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  assignButton: {
    marginHorizontal: 0,
  },
  viewButton: {
    flex: 0.48,
  },
  infoButton: {
    flex: 0.48,
  },
  importButton: {
    flex: 0.48,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: themeColors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E8E9FF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
    minHeight: 44,
    justifyContent: 'center',
  },
  tabButtonActive: {
    // Active state handled by indicator
  },
  tabButtonRequest: {
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderRadius: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: themeColors.placeholder,
  },
  tabTextActive: {
    color: themeColors.primary,
    fontWeight: '700',
  },
  tabTextRequest: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: themeColors.white,
  },
  badgeText: {
    color: themeColors.white,
    fontSize: 10,
    fontWeight: '700',
  },
  appointmentCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  appointmentInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  appointmentIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  appointmentDate: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    color: themeColors.darkText,
  },
  timeSlotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeSlot: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  motherInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  appointmentMother: {
    fontSize: 14,
    marginLeft: 6,
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginLeft: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  notesContainer: {
    marginTop: 12,
    paddingTop: 12,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: '#E9ECEF',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 10,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  appointmentNotes: {
    fontSize: 14,
    lineHeight: 20,
    color: themeColors.darkText,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
});
