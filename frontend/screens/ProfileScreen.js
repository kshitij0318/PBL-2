import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Alert,
  TextInput,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../utils/AuthContext';
import { API_URL } from '../utils/config';
import { 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveCard 
} from '../utils/ResponsiveComponents';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  error: '#dc3545',
  success: '#28a745',
};

export default function ProfileScreen({ navigation }) {
  const [userInfo, setUserInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { signOut, userInfo: authUserInfo } = useAuth();

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userInfoString = await AsyncStorage.getItem('userInfo');
      
      if (!userInfoString) {
        setError('User information not found. Please log in again.');
        setLoading(false);
        return;
      }
      
      const userData = JSON.parse(userInfoString);
      setUserInfo(userData);
      setEditName(userData.full_name || '');
      setEditEmail(userData.email || '');
      
      // Fetch latest profile data from server
      if (userData.token) {
        try {
          // Use general profile endpoint that works for all roles
          const endpoint = userData.role === 'mother' 
            ? `${API_URL}/get-mother-profile` 
            : `${API_URL}/get-profile`;
          
          const response = await fetch(endpoint, {
            headers: {
              'Authorization': `Bearer ${userData.token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.profile) {
              const updatedUser = { ...userData, ...data.profile };
              setUserInfo(updatedUser);
              setEditName(updatedUser.full_name || '');
              setEditEmail(updatedUser.email || '');
            }
          } else {
            // Silently fail - use cached data
            console.warn('Failed to fetch profile from server, using cached data');
          }
        } catch (e) {
          // Silently fail - use cached data
          console.warn('Error fetching profile from server, using cached data:', e);
        }
      }
      
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation will be handled by the auth state change
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  const handleEditProfile = () => {
    setIsEditing(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim() || !editEmail.trim()) {
      Alert.alert('Error', 'Please fill in name and email fields');
      return;
    }

    // Validate password if new password is provided
    if (newPassword || confirmPassword || currentPassword) {
      if (!currentPassword) {
        Alert.alert('Error', 'Please enter your current password to change password');
        return;
      }
      if (!newPassword) {
        Alert.alert('Error', 'Please enter a new password');
        return;
      }
      if (newPassword.length < 6) {
        Alert.alert('Error', 'New password must be at least 6 characters long');
        return;
      }
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New password and confirm password do not match');
        return;
      }
    }

    setSaving(true);
    try {
      const token = userInfo?.token || authUserInfo?.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token missing');
        return;
      }

      const requestBody = {
        full_name: editName.trim(),
        email: editEmail.trim(),
      };

      // Only include password fields if user wants to change password
      if (newPassword && currentPassword) {
        requestBody.current_password = currentPassword;
        requestBody.new_password = newPassword;
        requestBody.confirm_password = confirmPassword;
      }

      const response = await fetch(`${API_URL}/update-profile`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      if (data.status === 'success') {
        const updatedUser = { 
          ...userInfo, 
          full_name: editName.trim(), 
          email: editEmail.trim(),
          ...(data.user || {})
        };
        setUserInfo(updatedUser);
        setIsEditing(false);
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Profile updated successfully!');
        // Update AsyncStorage
        await AsyncStorage.setItem('userInfo', JSON.stringify(updatedUser));
        // Reload profile to get latest data
        loadUserProfile();
      } else {
        Alert.alert('Error', data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditName(userInfo?.full_name || '');
    setEditEmail(userInfo?.email || '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setIsEditing(false);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={themeColors.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={themeColors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadUserProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={themeColors.white} />
        </TouchableOpacity>
        <ResponsiveText size="xl" weight="bold" color={themeColors.white} style={styles.headerTitle}>
          Profile
        </ResponsiveText>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.container}>
        <ResponsiveCard variant="elevated" style={styles.profileHeaderCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatarContainer, { backgroundColor: themeColors.lightPrimary }]}>
              <Ionicons name="person" size={50} color={themeColors.primary} />
            </View>
            <ResponsiveText size="2xl" weight="bold" color={themeColors.darkText} style={styles.userName}>
              {userInfo?.full_name || 'User'}
            </ResponsiveText>
            <ResponsiveText size="base" color={themeColors.placeholder} style={styles.userEmail}>
              {userInfo?.email || ''}
            </ResponsiveText>
            {userInfo?.role && (
              <View style={[styles.roleBadge, { backgroundColor: themeColors.lightPrimary }]}>
                <Ionicons 
                  name={userInfo.role === 'nurse' ? 'medical' : userInfo.role === 'admin' ? 'shield' : 'person'} 
                  size={14} 
                  color={themeColors.primary} 
                />
                <ResponsiveText size="sm" weight="semibold" color={themeColors.primary} style={styles.roleBadgeText}>
                  {userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)}
                </ResponsiveText>
              </View>
            )}
          </View>
        </ResponsiveCard>

        <ResponsiveCard variant="elevated" style={styles.section}>
          <ResponsiveText size="lg" weight="bold" color={themeColors.darkText} style={styles.sectionTitle}>
            Account Information
          </ResponsiveText>
          
          {isEditing ? (
            <>
              <View style={styles.editItem}>
                <Ionicons name="person-outline" size={20} color={themeColors.primary} />
                <TextInput
                  style={styles.editInput}
                  placeholder="Full Name"
                  value={editName}
                  onChangeText={setEditName}
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.editItem}>
                <Ionicons name="mail-outline" size={20} color={themeColors.primary} />
                <TextInput
                  style={styles.editInput}
                  placeholder="Email"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.passwordSection}>
                <ResponsiveText size="sm" weight="semibold" color={themeColors.text} style={styles.passwordSectionTitle}>
                  Change Password (Optional)
                </ResponsiveText>
                
                <View style={styles.editItem}>
                  <Ionicons name="lock-closed-outline" size={20} color={themeColors.primary} />
                  <TextInput
                    style={styles.editInput}
                    placeholder="Current Password"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.editItem}>
                  <Ionicons name="lock-open-outline" size={20} color={themeColors.primary} />
                  <TextInput
                    style={styles.editInput}
                    placeholder="New Password (min 6 characters)"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
                
                <View style={styles.editItem}>
                  <Ionicons name="lock-open-outline" size={20} color={themeColors.primary} />
                  <TextInput
                    style={styles.editInput}
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              <View style={styles.editActions}>
                <TouchableOpacity 
                  style={[styles.editButton, styles.cancelButton]} 
                  onPress={handleCancelEdit}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editButton, styles.saveButton]} 
                  onPress={handleSaveProfile}
                  disabled={saving || !editName.trim() || !editEmail.trim()}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color={themeColors.white} />
                  ) : (
                    <Text style={styles.saveButtonText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoItem}>
                <Ionicons name="mail-outline" size={20} color={themeColors.primary} />
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>{userInfo?.email || 'Not provided'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={20} color={themeColors.primary} />
                <Text style={styles.infoLabel}>Name:</Text>
                <Text style={styles.infoValue}>{userInfo?.full_name || 'Not provided'}</Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="calendar-outline" size={20} color={themeColors.primary} />
                <Text style={styles.infoLabel}>Member since:</Text>
                <Text style={styles.infoValue}>
                  {userInfo?.created_at 
                    ? new Date(userInfo.created_at).toLocaleDateString() 
                    : 'Unknown'}
                </Text>
              </View>
              
              <View style={styles.infoItem}>
                <Ionicons name="lock-closed-outline" size={20} color={themeColors.primary} />
                <Text style={styles.infoLabel}>Password:</Text>
                {userInfo?.role === 'nurse' ? (
                  <View style={styles.passwordDisplayRow}>
                    <Text style={styles.infoValue}>••••••••</Text>
                    <TouchableOpacity
                      style={styles.eyeButton}
                      onPress={() => {
                        // Note: We can't show the actual password as it's hashed
                        // This is just for UI consistency - password can be changed in edit mode
                        Alert.alert('Password', 'Your password is securely stored. Use "Edit Profile" to change it.');
                      }}
                    >
                      <Ionicons name="eye-outline" size={18} color={themeColors.primary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.infoValue}>••••••••</Text>
                )}
              </View>
            </>
          )}
        </ResponsiveCard>

        <ResponsiveCard variant="elevated" style={styles.section}>
          <ResponsiveText size="lg" weight="bold" color={themeColors.darkText} style={styles.sectionTitle}>
            Actions
          </ResponsiveText>
          
          {!isEditing && (
            <ResponsiveButton
              variant="primary"
              onPress={handleEditProfile}
              leftIcon="create-outline"
              style={styles.actionButton}
            >
              Edit Profile
            </ResponsiveButton>
          )}
          
          <ResponsiveButton
            variant="primary"
            onPress={() => {
              try {
                navigation.navigate('Progress');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Could not navigate to Progress screen.');
              }
            }}
            leftIcon="stats-chart-outline"
            style={styles.actionButton}
          >
            View Progress
          </ResponsiveButton>
          
          <ResponsiveButton
            variant="primary"
            onPress={() => {
              try {
                navigation.navigate('Test');
              } catch (error) {
                console.error('Navigation error:', error);
                Alert.alert('Error', 'Could not navigate to Assessment screen.');
              }
            }}
            leftIcon="help-circle-outline"
            style={styles.actionButton}
          >
            Take Assessment
          </ResponsiveButton>
        </ResponsiveCard>

        <ResponsiveButton
          variant="danger"
          onPress={handleSignOut}
          leftIcon="log-out-outline"
          style={styles.signOutButton}
        >
          Sign Out
        </ResponsiveButton>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColors.primary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.lightBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.text,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.lightBackground,
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  profileHeaderCard: {
    margin: 16,
    marginBottom: 0,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 20,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 8,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: themeColors.placeholder,
  },
  section: {
    margin: 16,
    marginTop: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: themeColors.text,
    marginLeft: 10,
    width: 100,
  },
  infoValue: {
    fontSize: 16,
    color: themeColors.darkText,
    flex: 1,
  },
  actionButton: {
    marginBottom: 10,
  },
  signOutButton: {
    margin: 16,
    marginTop: 0,
  },
  editItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  editInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: themeColors.darkText,
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 12,
  },
  passwordSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  passwordSectionTitle: {
    marginBottom: 12,
    color: themeColors.text,
  },
  passwordDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  cancelButtonText: {
    color: themeColors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: themeColors.primary,
  },
  saveButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
}); 