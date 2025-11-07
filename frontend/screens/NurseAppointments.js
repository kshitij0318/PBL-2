import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../utils/config';
import { useAuth } from '../utils/AuthContext';
import { useToast } from '../utils/ToastContext';
// Using built-in date/time pickers - will use TextInput with date/time picker modals

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
  info: '#17a2b8',
};

export default function NurseAppointments({ navigation }) {
  const { userInfo } = useAuth();
  const { showToast } = useToast();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [rescheduleTime, setRescheduleTime] = useState(new Date());
  const [rescheduleNotes, setRescheduleNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAppointments();
  }, []);

  // Refresh appointments when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadAppointments();
    }, [])
  );

  const loadAppointments = async () => {
    try {
      setLoading(true);
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
          // Filter to show only pending and reschedule_requested appointments
          const pending = (data.appointments || []).filter(apt => 
            apt.status === 'pending' || apt.status === 'reschedule_requested'
          ).sort((a, b) => {
            const dateA = new Date(a.requested_date);
            const dateB = new Date(b.requested_date);
            return dateA - dateB;
          });
          setAppointments(pending);
        }
      }
    } catch (error) {
      console.error('Error loading appointments:', error);
      showToast('Failed to load appointments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleApprove = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedAppointment) return;
    
    setProcessing(true);
    try {
      const token = userInfo?.token;
      const response = await fetch(`${API_URL}/approve-appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        showToast('Appointment approved successfully!', 'success');
        setShowApproveModal(false);
        setSelectedAppointment(null);
        await loadAppointments();
      } else {
        showToast(data.message || 'Failed to approve appointment', 'error');
      }
    } catch (error) {
      console.error('Error approving appointment:', error);
      showToast('Failed to approve appointment', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = (appointment) => {
    setSelectedAppointment(appointment);
    // Set initial date/time to requested date or current date
    const requestedDate = appointment.requested_date ? new Date(appointment.requested_date) : new Date();
    setRescheduleDate(requestedDate);
    setRescheduleTime(requestedDate);
    setRescheduleNotes('');
    setShowRescheduleModal(true);
  };

  const confirmReschedule = async () => {
    if (!selectedAppointment) return;
    
    // Combine date and time
    const combinedDateTime = new Date(rescheduleDate);
    combinedDateTime.setHours(rescheduleTime.getHours());
    combinedDateTime.setMinutes(rescheduleTime.getMinutes());
    combinedDateTime.setSeconds(0);

    if (combinedDateTime <= new Date()) {
      Alert.alert('Error', 'Please select a future date and time');
      return;
    }

    setProcessing(true);
    try {
      const token = userInfo?.token;
      const response = await fetch(`${API_URL}/reschedule-appointment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointment_id: selectedAppointment.id,
          alternate_date: combinedDateTime.toISOString(),
          reschedule_notes: rescheduleNotes,
        }),
      });

      const data = await response.json();
      if (data.status === 'success') {
        showToast('Reschedule request sent successfully! The mother has been notified.', 'success');
        setShowRescheduleModal(false);
        setSelectedAppointment(null);
        setRescheduleNotes('');
        await loadAppointments();
      } else {
        showToast(data.message || 'Failed to request reschedule', 'error');
      }
    } catch (error) {
      console.error('Error requesting reschedule:', error);
      showToast('Failed to request reschedule', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const renderAppointmentCard = ({ item }) => {
    const statusColors = {
      'pending': themeColors.warning,
      'reschedule_requested': '#FF9800',
      'approved': themeColors.success,
    };

    // Get mother name if available
    const motherName = item.mother_name || 'Mother';

    return (
      <View style={styles.appointmentCard}>
        <View style={styles.appointmentHeader}>
          <View style={styles.appointmentInfo}>
            <View style={[styles.motherAvatar, { backgroundColor: themeColors.primary + '20' }]}>
              <Ionicons name="person" size={20} color={themeColors.primary} />
            </View>
            <View style={styles.appointmentDetails}>
              <Text style={styles.motherName}>{motherName}</Text>
              <Text style={styles.appointmentDate}>
                {formatDate(item.requested_date)}
              </Text>
              <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '20' }]}>
                <Text style={[styles.statusText, { color: statusColors[item.status] }]}>
                  {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('_', ' ')}
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {item.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesLabel}>Mother's Notes:</Text>
            <Text style={styles.notesText}>{item.notes}</Text>
          </View>
        )}

        {item.reschedule_notes && (
          <View style={styles.notesSection}>
            <Text style={[styles.notesLabel, { color: '#FF9800' }]}>Previous Reschedule Note:</Text>
            <Text style={styles.notesText}>{item.reschedule_notes}</Text>
          </View>
        )}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton]}
            onPress={() => handleApprove(item)}
            disabled={processing}
          >
            <Ionicons name="checkmark-circle" size={20} color={themeColors.white} />
            <Text style={styles.actionButtonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.rescheduleButton]}
            onPress={() => handleReschedule(item)}
            disabled={processing}
          >
            <Ionicons name="time-outline" size={20} color={themeColors.white} />
            <Text style={styles.actionButtonText}>Reschedule</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.darkText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Appointment Requests</Text>
        <View style={styles.headerRight} />
      </View>

      {loading && appointments.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading appointments...</Text>
        </View>
      ) : appointments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="calendar-outline" size={64} color={themeColors.placeholder} />
          <Text style={styles.emptyText}>No pending appointments</Text>
          <Text style={styles.emptySubtext}>All appointment requests have been processed</Text>
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Approve Confirmation Modal */}
      <Modal
        visible={showApproveModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowApproveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Approve Appointment</Text>
            {selectedAppointment && (
              <View style={styles.modalInfo}>
                <Text style={[styles.modalText, { fontWeight: '600', marginBottom: 4, fontSize: 16 }]}>
                  Mother: {selectedAppointment.mother_name || 'Unknown'}
                </Text>
                <Text style={styles.modalText}>
                  Requested Date: {formatDate(selectedAppointment.requested_date)}
                </Text>
                {selectedAppointment.notes && (
                  <Text style={styles.modalText}>
                    Notes: {selectedAppointment.notes}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.modalQuestion}>
              Approve this appointment request? The mother will be notified.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowApproveModal(false);
                  setSelectedAppointment(null);
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmApprove}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Reschedule Modal */}
      <Modal
        visible={showRescheduleModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRescheduleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
            <Text style={styles.modalTitle}>Request Reschedule</Text>
            {selectedAppointment && (
              <Text style={styles.modalText}>
                Original Request: {formatDate(selectedAppointment.requested_date)}
              </Text>
            )}

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Select Alternate Date</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
                <Text style={styles.pickerButtonText}>
                  {rescheduleDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Select Alternate Time</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={20} color={themeColors.primary} />
                <Text style={styles.pickerButtonText}>
                  {rescheduleTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.notesInputSection}>
              <Text style={styles.pickerLabel}>Reschedule Notes (Optional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Explain why reschedule is needed..."
                value={rescheduleNotes}
                onChangeText={setRescheduleNotes}
                multiline
                numberOfLines={4}
                placeholderTextColor={themeColors.placeholder}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowRescheduleModal(false);
                  setSelectedAppointment(null);
                  setRescheduleNotes('');
                }}
                disabled={processing}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={confirmReschedule}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color={themeColors.white} />
                ) : (
                  <Text style={styles.confirmButtonText}>Request Reschedule</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Date Picker */}
      {showDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDatePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Select Alternate Date</Text>
              {Platform.OS === 'ios' ? (
                <>
                  <View style={styles.pickerContainer}>
                    <Text style={styles.pickerDisplayText}>
                      {rescheduleDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </View>
                  <TextInput
                    style={styles.pickerInput}
                    placeholder="YYYY-MM-DD"
                    value={rescheduleDate.toISOString().split('T')[0]}
                    onChangeText={(text) => {
                      const date = new Date(text);
                      if (!isNaN(date.getTime()) && date >= new Date(new Date().setHours(0, 0, 0, 0))) {
                        setRescheduleDate(date);
                      }
                    }}
                    keyboardType="numeric"
                  />
                </>
              ) : (
                <View style={styles.pickerContainer}>
                  <TextInput
                    style={styles.pickerInput}
                    placeholder="YYYY-MM-DD"
                    value={rescheduleDate.toISOString().split('T')[0]}
                    onChangeText={(text) => {
                      const date = new Date(text);
                      if (!isNaN(date.getTime()) && date >= new Date(new Date().setHours(0, 0, 0, 0))) {
                        setRescheduleDate(date);
                      }
                    }}
                    keyboardType="numeric"
                  />
                </View>
              )}
              <View style={styles.pickerModalActions}>
                <TouchableOpacity
                  style={[styles.pickerModalButton, styles.cancelButton]}
                  onPress={() => setShowDatePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerModalButton, styles.confirmButton]}
                  onPress={() => {
                    setShowDatePicker(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <Modal
          visible={showTimePicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTimePicker(false)}
        >
          <View style={styles.pickerModalOverlay}>
            <View style={styles.pickerModalContent}>
              <Text style={styles.pickerModalTitle}>Select Alternate Time</Text>
              <View style={styles.pickerContainer}>
                <Text style={styles.pickerDisplayText}>
                  {rescheduleTime.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <TextInput
                style={styles.pickerInput}
                placeholder="HH:MM (24-hour format)"
                value={`${String(rescheduleTime.getHours()).padStart(2, '0')}:${String(rescheduleTime.getMinutes()).padStart(2, '0')}`}
                onChangeText={(text) => {
                  const [hours, minutes] = text.split(':').map(Number);
                  if (!isNaN(hours) && !isNaN(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
                    const newTime = new Date(rescheduleTime);
                    newTime.setHours(hours, minutes, 0, 0);
                    setRescheduleTime(newTime);
                  }
                }}
                keyboardType="numeric"
              />
              <View style={styles.pickerModalActions}>
                <TouchableOpacity
                  style={[styles.pickerModalButton, styles.cancelButton]}
                  onPress={() => setShowTimePicker(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pickerModalButton, styles.confirmButton]}
                  onPress={() => {
                    setShowTimePicker(false);
                  }}
                >
                  <Text style={styles.confirmButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.lightPrimary,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.darkText,
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: themeColors.text,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.darkText,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: themeColors.text,
    marginTop: 8,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  appointmentCard: {
    backgroundColor: themeColors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  appointmentInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  motherAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  appointmentDetails: {
    flex: 1,
  },
  motherName: {
    fontSize: 18,
    fontWeight: '700',
    color: themeColors.darkText,
    marginBottom: 6,
  },
  appointmentDate: {
    fontSize: 15,
    fontWeight: '500',
    color: themeColors.text,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notesSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: themeColors.lightPrimary,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: themeColors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: themeColors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  approveButton: {
    backgroundColor: themeColors.success,
  },
  rescheduleButton: {
    backgroundColor: themeColors.warning,
  },
  actionButtonText: {
    color: themeColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: themeColors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalScrollContent: {
    paddingBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 16,
  },
  modalInfo: {
    marginBottom: 16,
  },
  modalText: {
    fontSize: 14,
    color: themeColors.text,
    marginBottom: 8,
  },
  modalQuestion: {
    fontSize: 16,
    color: themeColors.darkText,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: themeColors.lightPrimary,
  },
  cancelButtonText: {
    color: themeColors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: themeColors.success,
  },
  confirmButtonText: {
    color: themeColors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 8,
    gap: 12,
  },
  pickerButtonText: {
    fontSize: 14,
    color: themeColors.darkText,
  },
  notesInputSection: {
    marginBottom: 24,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: themeColors.lightPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: themeColors.darkText,
    textAlignVertical: 'top',
    minHeight: 100,
  },
  pickerModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    backgroundColor: themeColors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  pickerModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 16,
  },
  pickerInput: {
    borderWidth: 1,
    borderColor: themeColors.lightPrimary,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: themeColors.darkText,
    marginBottom: 16,
  },
  pickerContainer: {
    marginVertical: 16,
  },
  pickerDisplayText: {
    fontSize: 16,
    color: themeColors.darkText,
    padding: 12,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 8,
    textAlign: 'center',
  },
  pickerModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  pickerModalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  pickerModalButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

