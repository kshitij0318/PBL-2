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
  Dimensions,
} from 'react-native';
import { useAuth } from '../utils/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../utils/ThemeContext';
import PrimaryButton from '../components/PrimaryButton';
import Card from '../components/Card';

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const handleSignIn = async () => {
    console.log('Step 1: Validating input fields...');
    if (!email || !password) {
      console.log('Validation failed: Email or password is empty');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    console.log('Input validation passed');

    console.log('Step 2: Initiating sign-in process...');
    setLoading(true);
    try {
      console.log(`Attempting to sign in with email: ${email}`);
      const result = await signIn(email, password);
      if (!result.success) {
        console.log(`Sign-in failed: ${result.error}`);
        Alert.alert('Error', result.error);
      } else {
        console.log('Step 3: Sign-in successful');
      }
    } catch (error) {
      console.log(`Step 3: Sign-in error - ${error.message}`);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      console.log('Step 4: Sign-in process completed');
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
        <View style={styles.contentContainer}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.darkText }]}>Welcome to SymbiHelp</Text>
            <Text style={[styles.subtitle, { color: theme.placeholder }]}>Sign in to continue</Text>
          </View>

          <Card style={styles.form}>
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

            <PrimaryButton onPress={handleSignIn} loading={loading} style={{ marginTop: 6 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </PrimaryButton>

            <View style={styles.footer}>
              <Text style={[styles.footerText, { color: theme.placeholder }]}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                <Text style={[styles.footerLink, { color: theme.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Card>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: Dimensions.get('window').height - 100,
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 440,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 15,
    marginBottom: 8,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#000',
  },
  eyeIcon: {
    padding: 12,
  },
  // Primary button uses shared component
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  footerText: {
    fontSize: 14,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: '600',
  }
});