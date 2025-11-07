import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveCard, 
  ResponsiveInput 
} from '../utils/ResponsiveComponents';

const { width, height } = Dimensions.get('window');

export default function SignInScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const { theme } = useTheme();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    const result = await signIn(email, password);
    setIsLoading(false);
    
    if (result.success) {
      const { user } = result;
      if (user?.is_admin || user?.role === 'admin') {
        navigation.reset({ index: 0, routes: [{ name: 'AdminDashboard' }] });
        return;
      }
      if (user?.role === 'mother') {
        navigation.reset({ index: 0, routes: [{ name: 'MotherDashboard' }] });
        return;
      }
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } else {
      Alert.alert('Error', result.error);
    }
  };

  return (
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
                <Ionicons name="medical" size={32} color="#FFFFFF" />
              </View>
              <ResponsiveText size="3xl" weight="bold" color={theme.text} style={styles.welcomeText}>
                Welcome Back
              </ResponsiveText>
              <ResponsiveText size="lg" color={theme.textSecondary} style={styles.subtitleText}>
                Sign in to continue your healthcare journey
              </ResponsiveText>
            </View>

            {/* Form Section */}
            <View style={styles.formContainer}>
              <ResponsiveCard style={styles.form} variant="elevated">
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
                  placeholder="Enter your password"
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

                {/* Sign In Button */}
                <ResponsiveButton
                  variant="primary"
                  size="large"
                  onPress={handleSignIn}
                  disabled={isLoading}
                  style={styles.signInButton}
                >
                  {isLoading ? 'Signing In...' : 'Sign In'}
                </ResponsiveButton>

                {/* Sign Up Link */}
                <View style={styles.signUpContainer}>
                  <ResponsiveText size="base" color={theme.textSecondary}>
                    Don't have an account?{' '}
                  </ResponsiveText>
                  <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                    <ResponsiveText size="base" weight="semibold" color={theme.primary}>
                      Sign Up
                    </ResponsiveText>
                  </TouchableOpacity>
                </View>
              </ResponsiveCard>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  welcomeText: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  formContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 40,
  },
  form: {
    padding: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  signInButton: {
    marginTop: 8,
    marginBottom: 24,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
});