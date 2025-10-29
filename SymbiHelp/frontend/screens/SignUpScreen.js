import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signUp } = useAuth();
  const { theme } = useTheme();

  const handleSignUp = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(name, email, password);
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: theme.lightBackground }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.darkText }]}>Create Account</Text>
          <Text style={[styles.subtitle, { color: theme.placeholder }]}>Sign up to get started</Text>
        </View>

        <Card style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.darkText }]}>Full Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.lightBackground, color: theme.text }]}
              placeholder="Enter your full name"
              placeholderTextColor={theme.placeholder}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.darkText }]}>Email</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.lightBackground, color: theme.text }]}
              placeholder="Enter your email"
              placeholderTextColor={theme.placeholder}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.darkText }]}>Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.lightBackground }] }>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.placeholder}
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={[styles.label, { color: theme.darkText }]}>Confirm Password</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.lightBackground }] }>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Confirm your password"
                placeholderTextColor={theme.placeholder}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={24}
                  color={theme.placeholder}
                />
              </TouchableOpacity>
            </View>
          </View>

          <PrimaryButton onPress={handleSignUp} loading={loading} style={{ marginTop: 6 }}>
            {loading ? 'Creating...' : 'Sign Up'}
          </PrimaryButton>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: theme.placeholder }]}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
              <Text style={[styles.footerLink, { color: theme.primary }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F4FF',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1E1E1E',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#A0A0A0',
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#1E1E1E',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4FF',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    padding: 12,
  },
  button: {
    backgroundColor: '#7A7FFC',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    color: '#A0A0A0',
    fontSize: 14,
  },
  footerLink: {
    color: '#7A7FFC',
    fontSize: 14,
    fontWeight: '600',
  },
});