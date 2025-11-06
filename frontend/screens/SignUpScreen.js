import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveCard, 
  ResponsiveInput 
} from '../utils/ResponsiveComponents';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('mother');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showNurseCredentialModal, setShowNurseCredentialModal] = useState(false);
  const [nurseCredential, setNurseCredential] = useState('');
  const { signUp } = useAuth();
  const { theme } = useTheme();

  const handleRoleSelection = (selectedRole) => {
    if (selectedRole === 'nurse') {
      // Show credential modal for nurse
      setShowNurseCredentialModal(true);
    } else {
      setRole(selectedRole);
    }
  };

  const handleNurseCredentialSubmit = () => {
    if (nurseCredential.trim() === 'nurse_hid') {
      setRole('nurse');
      setShowNurseCredentialModal(false);
      setNurseCredential('');
    } else {
      Alert.alert('Invalid Credential', 'Please enter the correct nurse credential to sign up as a nurse.');
    }
  };

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(name, email, password, role, role === 'nurse' ? 'nurse_hid' : null);
      if (!result.success) {
        Alert.alert('Error', result.error);
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && <StatusBar barStyle={theme.isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View style={[styles.logoContainer, { backgroundColor: theme.primary }]}>
                <Ionicons name="heart" size={32} color="#FFFFFF" />
              </View>
              <ResponsiveText size="3xl" weight="bold" color={theme.text} style={styles.welcomeText}>
                Create Account
              </ResponsiveText>
              <ResponsiveText size="lg" color={theme.textSecondary} style={styles.subtitleText}>
                Join us to start your journey
              </ResponsiveText>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <ResponsiveCard variant="elevated" style={styles.form}>
                  {/* Full Name Input */}
                  <ResponsiveInput
                    label="Full Name"
                    placeholder="Enter your full name"
                    value={name}
                    onChangeText={setName}
                    leftIcon="person-outline"
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={styles.inputGroup}
                  />

                  {/* Email Input */}
                  <ResponsiveInput
                    label="Email Address"
                    placeholder="Enter your email"
                    value={email}
                    onChangeText={setEmail}
                    leftIcon="mail-outline"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.inputGroup}
                  />

                  {/* Password Input */}
                  <ResponsiveInput
                    label="Password"
                    placeholder="Enter your password (min 6 characters)"
                    value={password}
                    onChangeText={setPassword}
                    leftIcon="lock-closed-outline"
                    rightIcon={showPassword ? "eye-outline" : "eye-off-outline"}
                    onRightIconPress={() => setShowPassword(!showPassword)}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.inputGroup}
                  />

                  {/* Confirm Password Input */}
                  <ResponsiveInput
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    leftIcon="lock-closed-outline"
                    rightIcon={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                    onRightIconPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={styles.inputGroup}
                  />

                  {/* Role Selection */}
                  <View style={styles.inputGroup}>
                    <ResponsiveText size="base" weight="semibold" color={theme.text} style={styles.inputLabel}>
                      Select Your Role
                    </ResponsiveText>
                    <View style={styles.roleContainer}>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          { borderColor: theme.primary },
                          role === 'mother' && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => handleRoleSelection('mother')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="person-outline"
                          size={20}
                          color={role === 'mother' ? '#FFFFFF' : theme.primary}
                        />
                        <ResponsiveText 
                          size="sm" 
                          weight="semibold" 
                          color={role === 'mother' ? '#FFFFFF' : theme.primary}
                          style={styles.roleButtonText}
                        >
                          Mother
                        </ResponsiveText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.roleButton,
                          { borderColor: theme.primary },
                          role === 'nurse' && { backgroundColor: theme.primary }
                        ]}
                        onPress={() => handleRoleSelection('nurse')}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="medical-outline"
                          size={20}
                          color={role === 'nurse' ? '#FFFFFF' : theme.primary}
                        />
                        <ResponsiveText 
                          size="sm" 
                          weight="semibold" 
                          color={role === 'nurse' ? '#FFFFFF' : theme.primary}
                          style={styles.roleButtonText}
                        >
                          Nurse
                        </ResponsiveText>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Sign Up Button */}
                  <ResponsiveButton
                    variant="primary"
                    size="large"
                    onPress={handleSignUp}
                    disabled={loading}
                    loading={loading}
                    style={styles.signUpButton}
                  >
                    Create Account
                  </ResponsiveButton>

                  {/* Sign In Link */}
                  <View style={styles.signInContainer}>
                    <ResponsiveText size="base" color={theme.textSecondary}>
                      Already have an account?{' '}
                    </ResponsiveText>
                    <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
                      <ResponsiveText size="base" weight="semibold" color={theme.primary}>
                        Sign In
                      </ResponsiveText>
                    </TouchableOpacity>
                  </View>
                </ResponsiveCard>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>

      {/* Nurse Credential Verification Modal */}
      <Modal
        visible={showNurseCredentialModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowNurseCredentialModal(false);
          setNurseCredential('');
        }}
      >
        <View style={styles.modalOverlay}>
          <ResponsiveCard variant="elevated" style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ResponsiveText size="xl" weight="bold" color={theme.text}>
                Nurse Verification
              </ResponsiveText>
              <TouchableOpacity
                onPress={() => {
                  setShowNurseCredentialModal(false);
                  setNurseCredential('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            
            <ResponsiveText size="base" color={theme.textSecondary} style={styles.modalDescription}>
              Please enter your nurse credential to sign up as a nurse.
            </ResponsiveText>

            <View style={styles.inputGroup}>
              <ResponsiveInput
                label="Nurse Credential"
                placeholder="Enter nurse credential"
                value={nurseCredential}
                onChangeText={setNurseCredential}
                leftIcon="key-outline"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.modalInput}
              />
            </View>

            <View style={styles.modalActions}>
              <ResponsiveButton
                variant="outline"
                onPress={() => {
                  setShowNurseCredentialModal(false);
                  setNurseCredential('');
                }}
                style={styles.modalButton}
              >
                Cancel
              </ResponsiveButton>
              <ResponsiveButton
                variant="primary"
                onPress={handleNurseCredentialSubmit}
                disabled={!nurseCredential.trim()}
                style={styles.modalButton}
              >
                Verify
              </ResponsiveButton>
            </View>
          </ResponsiveCard>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
  },
  logoContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    textAlign: 'center',
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  form: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    padding: 14,
    borderWidth: 2,
    backgroundColor: '#F8F9FA',
  },
  roleButtonText: {
    marginLeft: 6,
  },
  signUpButton: {
    marginTop: 8,
    marginBottom: 20,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalCloseButton: {
    padding: 4,
  },
  modalDescription: {
    marginBottom: 20,
    lineHeight: 20,
  },
  modalInput: {
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
  },
});