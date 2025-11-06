import React, { useEffect, useState, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  Alert, 
  Platform, 
  ScrollView, 
  Modal, 
  TextInput,
  ActivityIndicator,
  SafeAreaView
} from 'react-native';
import { Calendar, Agenda } from 'react-native-calendars';
import * as CalendarAPI from 'expo-calendar';
import { Ionicons } from '@expo/vector-icons';
import { API_URL } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../utils/AuthContext';
import { useToast } from '../utils/ToastContext';

const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  success: '#28a745',
  error: '#dc3545',
  warning: '#ffc107',
};

export default function AppointmentScheduling({ navigation }) {
  const { userInfo: authUserInfo } = useAuth();
  const { showToast } = useToast();
  const [selectedDate, setSelectedDate] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [calendarId, setCalendarId] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [showTimeModal, setShowTimeModal] = useState(false);
  const [selectedTime, setSelectedTime] = useState('');
  const [appointmentNotes, setAppointmentNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [hasAssignedNurse, setHasAssignedNurse] = useState(false);
  const [hasAssignedMothers, setHasAssignedMothers] = useState(false);
  const [checkingNurse, setCheckingNurse] = useState(true);

  useEffect(() => {
    (async () => {
      if (authUserInfo) {
        setUserInfo(authUserInfo);
      } else {
        const stored = await AsyncStorage.getItem('userInfo');
        if (stored) setUserInfo(JSON.parse(stored));
      }
      await checkAssignment();
      await ensureCalendar();
      // Wait a bit for userInfo to be set before fetching
      setTimeout(() => {
        fetchAppointments();
      }, 100);
    })();
  }, [authUserInfo]);

  const checkAssignment = async () => {
    try {
      setCheckingNurse(true);
      const token = userInfo?.token || authUserInfo?.token;
      const currentUser = userInfo || authUserInfo;
      if (!token) {
        setCheckingNurse(false);
        return;
      }

      // Check if user is a nurse
      if (currentUser?.role === 'nurse') {
        // For nurses: check if they have assigned mothers
        const res = await fetch(`${API_URL}/nurse/assigned-mothers`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          const hasMothers = (data.assigned_mothers || []).length > 0;
          setHasAssignedMothers(hasMothers);
          setHasAssignedNurse(true); // Set to true for nurses with assigned mothers
          if (!hasMothers) {
            showToast('No mothers assigned. Please contact an administrator.', 'warning');
            setTimeout(() => navigation.goBack(), 2000);
          }
        } else {
          setHasAssignedMothers(false);
          setHasAssignedNurse(false);
        }
      } else {
        // For mothers: check if they have assigned nurse
        const res = await fetch(`${API_URL}/get-mother-profile`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.status === 'success') {
          const hasNurse = data.profile.has_assigned_nurse || false;
          setHasAssignedNurse(hasNurse);
          if (!hasNurse) {
            showToast('No nurse assigned. Please contact an administrator.', 'warning');
            setTimeout(() => navigation.goBack(), 2000);
          }
        }
      }
    } catch (e) {
      console.error('Error checking assignment:', e);
    } finally {
      setCheckingNurse(false);
    }
  };

  // Refresh appointments when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Always refresh appointments when screen comes into focus
      if (userInfo || authUserInfo) {
        fetchAppointments();
        checkAssignment();
      }
    });
    return unsubscribe;
  }, [navigation, userInfo, authUserInfo]);

  const ensureCalendar = async () => {
    try {
      const { status } = await CalendarAPI.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;
      const calendars = await CalendarAPI.getCalendarsAsync(CalendarAPI.EntityTypes.EVENT);
      const existing = calendars.find(c => c.title === 'SymbiHelp Appointments');
      if (existing) {
        setCalendarId(existing.id);
        return;
      }
      const defaultSource = Platform.OS === 'ios' ? await CalendarAPI.getDefaultCalendarAsync() : { isLocalAccount: true, name: 'SymbiHelp' };
      const newCalId = await CalendarAPI.createCalendarAsync({
        title: 'SymbiHelp Appointments',
        color: themeColors.primary,
        entityType: CalendarAPI.EntityTypes.EVENT,
        sourceId: defaultSource?.sourceId || undefined,
        source: defaultSource?.source || undefined,
        accessLevel: CalendarAPI.CalendarAccessLevel.OWNER,
        ownerAccount: 'personal',
      });
      setCalendarId(newCalId);
    } catch (e) {
      // ignore calendar failures
    }
  };

  const fetchAppointments = async () => {
    try {
      const token = userInfo?.token || authUserInfo?.token;
      const currentUser = userInfo || authUserInfo;
      const userIsNurse = currentUser?.role === 'nurse';
      
      if (!token) {
        console.warn('No token available for fetching appointments');
        return;
      }
      
      console.log('Fetching appointments...');
      const res = await fetch(`${API_URL}/get-appointments`, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        } 
      });
      
      if (!res.ok) {
        console.error('Failed to fetch appointments:', res.status, res.statusText);
        return;
      }
      
      const data = await res.json();
      console.log('Appointments response:', data);
      
      if (data.status === 'success') {
        const allAppointments = data.appointments || [];
        console.log('Received appointments:', allAppointments.length);
        
        // For nurses: show only future appointments (approved and pending) for reference
        // For mothers: show all appointments
        const now = new Date();
        let filteredAppointments = allAppointments;
        
        if (userIsNurse) {
          // Nurses only see future appointments for reference
          filteredAppointments = allAppointments.filter(apt => {
            const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
            return aptDate >= now && apt.status !== 'cancelled';
          });
        } else {
          // Mothers see all appointments (upcoming and past)
          const upcoming = allAppointments.filter(apt => {
            const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
            return aptDate >= now && apt.status !== 'cancelled';
          });
          
          const past = allAppointments.filter(apt => {
            const aptDate = apt.date_time ? new Date(apt.date_time) : new Date(apt.requested_date);
            return aptDate < now || apt.status === 'cancelled';
          });
          
          filteredAppointments = [
            ...upcoming.sort((a, b) => {
              const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
              const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
              return dateA - dateB;
            }),
            ...past.sort((a, b) => {
              const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
              const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
              return dateB - dateA; // Reverse order for past
            })
          ];
        }
        
        // Sort chronologically (earliest first)
        const sortedAppointments = filteredAppointments.sort((a, b) => {
          const dateA = a.date_time ? new Date(a.date_time) : new Date(a.requested_date);
          const dateB = b.date_time ? new Date(b.date_time) : new Date(b.requested_date);
          return dateA - dateB;
        });
        
        console.log('Setting appointments:', sortedAppointments.length, 'isNurse:', userIsNurse);
        setAppointments(sortedAppointments);
      } else {
        console.error('Failed to fetch appointments:', data.message);
        setAppointments([]);
      }
    } catch (e) {
      console.error('Error fetching appointments:', e);
      setAppointments([]);
    }
  };

  const generateAvailableSlots = (dateString) => {
    const slots = [];
    const baseDate = new Date(dateString);
    
    // Generate slots from 9 AM to 5 PM, every 30 minutes
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const slotTime = new Date(baseDate);
        slotTime.setHours(hour, minute, 0, 0);
        
        // Skip past times for today
        if (slotTime <= new Date()) continue;
        
        const timeString = slotTime.toTimeString().slice(0, 5);
        slots.push({
          time: timeString,
          datetime: slotTime.toISOString(),
          display: `${timeString} - ${new Date(slotTime.getTime() + 30 * 60000).toTimeString().slice(0, 5)}`
        });
      }
    }
    return slots;
  };

  const scheduleForDateTime = async (isoDateTime, notes = '') => {
    if (!hasAssignedNurse) {
      showToast('No nurse assigned. Please contact an administrator.', 'error');
      return;
    }

    setLoading(true);
    try {
      const token = userInfo?.token || authUserInfo?.token;
      if (!token) {
        showToast('Not authenticated. Please log in again.', 'error');
        return;
      }

      // For mothers, the backend will auto-link to assigned nurse
      // Validate and ensure the date is in proper ISO format
      if (!isoDateTime || typeof isoDateTime !== 'string') {
        showToast('Invalid date selected. Please try again.', 'error');
        setLoading(false);
        return;
      }
      
      // Validate the date string
      const dateObj = new Date(isoDateTime);
      if (isNaN(dateObj.getTime())) {
        showToast('Invalid date selected. Please try again.', 'error');
        setLoading(false);
        return;
      }
      
      // Ensure it's in ISO format with Z timezone
      const formattedDate = dateObj.toISOString();
      console.log('Sending appointment request:', {
        original: isoDateTime,
        formatted: formattedDate,
        dateObj: dateObj.toString(),
        timestamp: dateObj.getTime()
      });
      
      const requestBody = {
        requested_date: formattedDate,
        notes: notes || ''
      };

      const res = await fetch(`${API_URL}/schedule-appointment`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(requestBody),
      });
      
      // Check if response is ok before parsing JSON
      if (!res.ok) {
        let errorMessage = 'Failed to schedule appointment';
        let errorData = null;
        try {
          errorData = await res.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // If JSON parsing fails, use status text
          errorMessage = res.statusText || `Server error (${res.status})`;
          console.error('Failed to parse error response:', e);
        }
        console.error('Appointment scheduling error:', {
          status: res.status,
          statusText: res.statusText,
          message: errorMessage,
          requestBody,
          errorData: errorData,
          errorDetails: errorData?.error_details,
          errorType: errorData?.error_type
        });
        // Show detailed error in console
        if (errorData?.error_details) {
          console.error('Detailed error from backend:', errorData.error_details);
        }
        // Show user-friendly message in toast
        const userFriendlyMessage = errorMessage.includes('Error:') 
          ? errorMessage.split('Error:')[1]?.trim() || errorMessage
          : errorMessage;
        showToast(userFriendlyMessage, 'error');
        setLoading(false);
        return;
      }
      
      const data = await res.json();
      if (data.status === 'success') {
        showToast('Appointment request sent successfully! Your nurse will review and confirm.', 'success');
        setShowTimeModal(false);
        setSelectedTime('');
        setAppointmentNotes('');
        fetchAppointments();
        // Navigate back after a short delay to show the toast
        setTimeout(() => {
          navigation.goBack();
        }, 1500);
        setAppointments(prev => [data.appointment, ...prev]);
      } else {
        // Check for specific error messages
        const errorMsg = data.message || 'Unable to request appointment';
        if (errorMsg.includes('consent')) {
          showToast('Please enable "Share with Nurses" in your dashboard first', 'error');
        } else {
          showToast(errorMsg, 'error');
        }
      }
    } catch (e) {
      console.error('Error scheduling appointment:', e);
      showToast('Failed to request appointment. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const addToDeviceCalendar = async (appt) => {
    try {
      if (!calendarId) return;
      const start = new Date(appt.date_time);
      const end = new Date(new Date(appt.date_time).getTime() + 30 * 60 * 1000);
      await CalendarAPI.createEventAsync(calendarId, {
        title: 'Midwife/Nurse Appointment',
        startDate: start,
        endDate: end,
        notes: appt.notes || '',
        alarms: [{ relativeOffset: -15 }],
      });
    } catch (e) {}
  };

  const handleRescheduleResponse = async (appointmentId, action) => {
    try {
      const currentUser = userInfo || authUserInfo;
      const token = currentUser?.token;
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
          showToast('Reschedule request accepted successfully!', 'success');
        } else {
          // Show the rejection popup message
          Alert.alert(
            'Reschedule Rejected',
            'Sorry for the inconvenience caused. Please feel free to book an appointment for your convenient time on the same day or another date as per your availability.',
            [
              {
                text: 'Book New Appointment',
                onPress: () => {
                  // Already on AppointmentScheduling screen, just refresh
                  fetchAppointments();
                },
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
        fetchAppointments();
      } else {
        showToast(data.message || 'Failed to respond to reschedule request', 'error');
      }
    } catch (error) {
      console.error('Error responding to reschedule:', error);
      showToast('Failed to respond to reschedule request. Please try again.', 'error');
    }
  };

  const onDayPress = day => {
    // Nurses can only view appointments, not book new ones
    if (isReadOnly) {
      // Silently do nothing - calendar is just for viewing appointments
      return;
    }
    setSelectedDate(day.dateString);
    const slots = generateAvailableSlots(day.dateString);
    setAvailableSlots(slots);
    setShowTimeModal(true);
  };

  const handleTimeSelection = (slot) => {
    setSelectedTime(slot.datetime);
    // slot.datetime is already in ISO format from generateAvailableSlots
    // Just pass it directly
    scheduleForDateTime(slot.datetime, appointmentNotes);
  };

  // Mark dates with appointments on the calendar
  const marked = useMemo(() => {
    const markedDates = {};
    
    // Mark selected date if any
    if (selectedDate) {
      markedDates[selectedDate] = { selected: true, selectedColor: themeColors.primary };
    }
    
    // Mark all upcoming appointments
    if (appointments && appointments.length > 0) {
      appointments.forEach(apt => {
        const dateValue = apt.date_time || apt.requested_date;
        if (!dateValue) return;
        
        let dateStr;
        if (dateValue instanceof Date) {
          dateStr = dateValue.toISOString().split('T')[0];
        } else if (typeof dateValue === 'string') {
          dateStr = dateValue.split('T')[0];
        } else {
          return;
        }
        
        // Only mark if not already selected (to avoid overriding selection)
        if (!markedDates[dateStr]) {
          markedDates[dateStr] = {
            marked: true,
            dotColor: themeColors.primary,
            selected: dateStr === selectedDate,
            selectedColor: themeColors.primary,
          };
        } else if (dateStr === selectedDate) {
          // If this date is selected, keep the selection and add marking
          markedDates[dateStr] = {
            ...markedDates[dateStr],
            marked: true,
            dotColor: themeColors.primary,
          };
        }
      });
    }
    
    return markedDates;
  }, [appointments, selectedDate, themeColors.primary]);

  // Group appointments by date for display
  const grouped = useMemo(() => {
    if (!appointments || appointments.length === 0) {
      console.log('No appointments to group');
      return {};
    }
    
    console.log('Grouping appointments:', appointments.length);
    const groupedResult = appointments.reduce((acc, a) => {
      try {
        // Use date_time if approved, otherwise use requested_date
        const dateValue = a.date_time || a.requested_date;
        if (!dateValue) {
          console.warn('Appointment missing date:', a);
          return acc;
        }
        
        // Handle both string and Date object formats
        let dateStr;
        if (typeof dateValue === 'string') {
          dateStr = dateValue.split('T')[0];
        } else {
          dateStr = new Date(dateValue).toISOString().split('T')[0];
        }
        
        if (dateStr) {
          acc[dateStr] = acc[dateStr] || [];
          acc[dateStr].push(a);
        } else {
          console.warn('Could not extract date string from:', dateValue);
        }
      } catch (error) {
        console.error('Error grouping appointment:', error, a);
      }
      return acc;
    }, {});
    
    console.log('Grouped appointments:', Object.keys(groupedResult).length, 'dates');
    return groupedResult;
  }, [appointments]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return themeColors.success;
      case 'confirmed': return themeColors.success;
      case 'cancelled': return themeColors.error;
      case 'pending': return themeColors.warning || '#ffc107';
      case 'reschedule_requested': return '#FF9800';
      default: return themeColors.text;
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return 'checkmark-circle';
      case 'confirmed': return 'checkmark-circle';
      case 'cancelled': return 'close-circle';
      case 'pending': return 'time';
      case 'reschedule_requested': return 'time-outline';
      default: return 'calendar';
    }
  };

  if (checkingNurse) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Checking nurse assignment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const currentUser = userInfo || authUserInfo;
  const isNurse = currentUser?.role === 'nurse';
  const canAccess = isNurse ? hasAssignedMothers : hasAssignedNurse;
  const isReadOnly = isNurse; // Nurses can only view, not book

  if (!canAccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Appointment Scheduling</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="medical-outline" size={64} color={themeColors.placeholder} />
          <Text style={styles.emptyText}>
            {isNurse ? 'No Mothers Assigned' : 'No Nurse Assigned'}
          </Text>
          <Text style={styles.emptySubtext}>
            {isNurse 
              ? 'Please contact an administrator to assign mothers before viewing appointments.'
              : 'Please contact an administrator to assign a nurse before scheduling appointments.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={themeColors.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Appointment Scheduling</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Ionicons name="information-circle-outline" size={20} color={themeColors.primary} />
          <Text style={styles.instructionsText}>
            {isReadOnly 
              ? 'View your scheduled appointments on the calendar and in the list below. Use "Manage Requests" to approve or reschedule appointments.'
              : 'Tap on a date to see available time slots and book an appointment'}
          </Text>
        </View>

        <Calendar
          onDayPress={isReadOnly ? () => {
            // Silently do nothing for nurses - calendar is just for viewing
          } : onDayPress}
          markedDates={marked}
          minDate={new Date().toISOString().split('T')[0]}
          markingType="dot"
          theme={{
            selectedDayBackgroundColor: themeColors.primary,
            todayTextColor: themeColors.primary,
            arrowColor: themeColors.primary,
            textDayFontWeight: '600',
            textMonthFontWeight: 'bold',
          }}
        />

        {/* Appointments List */}
        {appointments && appointments.length > 0 ? (
          <View style={styles.appointmentsSection}>
            <Text style={styles.appointmentsTitle}>
              {isReadOnly ? 'Scheduled Appointments' : 'Your Appointments'} ({appointments.length})
            </Text>
            {Object.keys(grouped).length > 0 ? (
              Object.keys(grouped).map(date => (
              <View key={date} style={styles.apptSection}>
                <Text style={styles.apptDate}>
                  {new Date(date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
                {grouped[date].map(item => {
                  const displayDateTime = item.date_time || item.requested_date;
                  const statusDisplay = item.status === 'approved' && item.date_time ? 'Approved' : 
                                       item.status === 'pending' ? 'Pending Review' :
                                       item.status === 'reschedule_requested' ? 'Reschedule Requested' :
                                       item.status.charAt(0).toUpperCase() + item.status.slice(1);
                  return (
                    <View key={item.id} style={styles.apptItem}>
                      <View style={styles.apptIconContainer}>
                        <Ionicons 
                          name={getStatusIcon(item.status)} 
                          size={20} 
                          color={getStatusColor(item.status)} 
                        />
                      </View>
                      <View style={styles.apptDetails}>
                        <View style={styles.apptTimeRow}>
                          <Ionicons name="time-outline" size={14} color={themeColors.primary} />
                          <Text style={styles.apptTime}>
                            {new Date(displayDateTime).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </Text>
                        </View>
                        {isReadOnly && item.mother_name && (
                          <View style={styles.apptMotherRow}>
                            <Ionicons name="person-outline" size={14} color={themeColors.text} />
                            <Text style={styles.apptMotherName}>
                              {item.mother_name}
                            </Text>
                          </View>
                        )}
                        <Text style={[styles.apptStatus, { color: getStatusColor(item.status) }]}>
                          {statusDisplay}
                        </Text>
                        {item.notes && (
                          <View style={styles.notesContainer}>
                            <View style={styles.notesHeader}>
                              <Ionicons name="document-text-outline" size={12} color={themeColors.text} />
                              <Text style={styles.notesLabel}>Mother's Notes:</Text>
                            </View>
                            <Text style={styles.apptNotes}>{item.notes}</Text>
                          </View>
                        )}
                        {item.reschedule_notes && (
                          <View style={[styles.notesContainer, { backgroundColor: themeColors.warning + '10' }]}>
                            <View style={styles.notesHeader}>
                              <Ionicons name="alert-circle-outline" size={12} color={themeColors.warning} />
                              <Text style={[styles.notesLabel, { color: themeColors.warning }]}>Reschedule Notes:</Text>
                            </View>
                            <Text style={[styles.apptNotes, { color: themeColors.darkText }]}>
                              {item.reschedule_notes}
                            </Text>
                          </View>
                        )}
                        {!isReadOnly && item.status === 'reschedule_requested' && (
                          <View style={styles.rescheduleActions}>
                            <TouchableOpacity
                              style={[styles.rescheduleAcceptButton, { backgroundColor: themeColors.success }]}
                              onPress={() => handleRescheduleResponse(item.id, 'accept')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" />
                              <Text style={styles.rescheduleButtonText}>Accept</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.rescheduleRejectButton, { borderColor: themeColors.error }]}
                              onPress={() => handleRescheduleResponse(item.id, 'reject')}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="close-circle-outline" size={18} color={themeColors.error} />
                              <Text style={[styles.rescheduleButtonText, { color: themeColors.error }]}>Reject</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            ))
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Appointments loaded but couldn't be grouped
                </Text>
                <Text style={styles.emptySubtext}>
                  Total: {appointments.length}, Grouped: {Object.keys(grouped).length}
                </Text>
              </View>
            )}
          </View>
        ) : null}

        {(!appointments || appointments.length === 0) && (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={themeColors.placeholder} />
            <Text style={styles.emptyText}>No appointments scheduled</Text>
            <Text style={styles.emptySubtext}>
              Select a date above to book your first appointment
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Time Selection Modal */}
      <Modal
        visible={showTimeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowTimeModal(false)}
              style={styles.modalCloseButton}
            >
              <Ionicons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select Time Slot
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <Text style={styles.modalDate}>
            {selectedDate && new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>

          <ScrollView style={styles.timeSlotsContainer}>
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Additional Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Any specific concerns or requests..."
                value={appointmentNotes}
                onChangeText={setAppointmentNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            <Text style={styles.slotsTitle}>Available Time Slots</Text>
            {availableSlots.map((slot, index) => (
              <TouchableOpacity
                key={index}
                style={styles.timeSlot}
                onPress={() => handleTimeSelection(slot)}
                disabled={loading}
              >
                <View style={styles.timeSlotContent}>
                  <Ionicons name="time-outline" size={20} color={themeColors.primary} />
                  <Text style={styles.timeSlotText}>{slot.display}</Text>
                  {loading && <ActivityIndicator size="small" color={themeColors.primary} />}
                </View>
              </TouchableOpacity>
            ))}

            {availableSlots.length === 0 && (
              <View style={styles.noSlotsContainer}>
                <Ionicons name="calendar-outline" size={48} color={themeColors.placeholder} />
                <Text style={styles.noSlotsText}>No available slots for this date</Text>
                <Text style={styles.noSlotsSubtext}>Please select another date</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  container: { 
    flex: 1, 
    backgroundColor: themeColors.lightBackground 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: { 
    padding: 8 
  },
  title: { 
    flex: 1, 
    textAlign: 'center', 
    fontSize: 18, 
    fontWeight: '600', 
    color: themeColors.darkText 
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: themeColors.lightPrimary,
    margin: 16,
    padding: 12,
    borderRadius: 10,
  },
  instructionsText: {
    marginLeft: 8,
    color: themeColors.darkText,
    fontSize: 14,
    flex: 1,
  },
  appointmentsSection: {
    margin: 16,
  },
  appointmentsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 16,
  },
  apptSection: { 
    paddingHorizontal: 16, 
    paddingTop: 12 
  },
  apptDate: { 
    fontWeight: '600', 
    marginBottom: 8, 
    color: themeColors.darkText,
    fontSize: 16,
  },
  apptItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: themeColors.white, 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  apptIconContainer: {
    marginRight: 12,
  },
  apptDetails: {
    flex: 1,
  },
  apptTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  apptTime: {
    fontSize: 16,
    fontWeight: '700',
    color: themeColors.darkText,
    marginLeft: 6,
  },
  apptMotherRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    marginTop: 4,
  },
  apptMotherName: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.text,
    marginLeft: 6,
  },
  apptStatus: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  notesContainer: {
    marginTop: 8,
    padding: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: themeColors.text,
    marginLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  apptNotes: {
    fontSize: 13,
    color: themeColors.darkText,
    lineHeight: 18,
  },
  rescheduleActions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  rescheduleAcceptButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  rescheduleRejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'transparent',
    gap: 6,
  },
  rescheduleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: themeColors.text,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.darkText,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: themeColors.placeholder,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.darkText,
  },
  modalDate: {
    fontSize: 16,
    fontWeight: '500',
    color: themeColors.primary,
    textAlign: 'center',
    padding: 16,
    backgroundColor: themeColors.white,
    marginBottom: 1,
  },
  timeSlotsContainer: {
    flex: 1,
    padding: 16,
  },
  notesContainer: {
    backgroundColor: themeColors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  notesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: themeColors.lightPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: themeColors.text,
    backgroundColor: themeColors.lightBackground,
    textAlignVertical: 'top',
  },
  slotsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 16,
  },
  timeSlot: {
    backgroundColor: themeColors.white,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeSlotContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  timeSlotText: {
    fontSize: 16,
    fontWeight: '500',
    color: themeColors.darkText,
    marginLeft: 12,
    flex: 1,
  },
  noSlotsContainer: {
    alignItems: 'center',
    padding: 32,
  },
  noSlotsText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.darkText,
    marginTop: 16,
    marginBottom: 8,
  },
  noSlotsSubtext: {
    fontSize: 14,
    color: themeColors.placeholder,
    textAlign: 'center',
  },
});


