import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './utils/suppressChartWarnings'; // Suppress chart warnings early

// Import AuthProvider and constants
import { AuthProvider, useAuth } from './utils/AuthContext';
import { getInitialRoute, ROUTE_NAMES, DEFAULT_ROUTE } from './utils/constants';
import { ThemeProvider } from './utils/ThemeContext';

// Screen Imports
import SplashScreen from './screens/SplashScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import HomeScreen from './screens/HomeScreen';
import MotherDashboard from './screens/MotherDashboard';
import AdminDashboard from './screens/AdminDashboard';
import TestScreen from './screens/TestScreen';
import ProgressScreen from './screens/ProgressScreen';
import ChatBotScreen from './screens/ChatBotScreen';
import PredictScreen from './screens/PredictScreen';
import ProfileScreen from './screens/ProfileScreen';
import MeditationScreen from './screens/MeditationScreen';
import PregnancyTimeline from './screens/PregnancyTimeline';
import BallBirthing from './screens/BallBirthing';
import LamazeBreathing from './screens/LamazeBreathing';
import Shiatsu from './screens/Shiatsu';
import YogaBirthing from './screens/YogaBirthing';
import PatientTracking from './screens/PatientTracking';
import AppointmentScheduling from './screens/AppointmentScheduling';
import NurseAppointments from './screens/NurseAppointments';
import ForumScreen from './screens/ForumScreen';
import { NotificationProvider } from './utils/NotificationContext';
import { ToastProvider } from './utils/ToastContext';

const Stack = createNativeStackNavigator();

// Unauthenticated Stack Navigator
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{ 
        headerShown: false,
        contentStyle: {
          backgroundColor: '#F0F4FF',
        },
      }}
      initialRouteName={DEFAULT_ROUTE}
    >
      <Stack.Screen
        name="Splash"
        component={SplashScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignIn"
        component={SignInScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="SignUp"
        component={SignUpScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

// Authenticated Stack Navigator
function AppStack() {
  const { userInfo, loading } = useAuth();
  
  // Show loading screen while checking auth state
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <Stack.Navigator
      screenOptions={{ 
        headerShown: false,
        contentStyle: {
          backgroundColor: '#F0F4FF',
        },
      }}
    >
      {/* Role-based initial screens */}
      {userInfo ? (
        userInfo.role === 'admin' || userInfo.is_admin ? (
          <Stack.Screen
            name="AdminDashboard"
            component={AdminDashboard}
          />
        ) : userInfo.role === 'mother' ? (
          <Stack.Screen
            name="MotherDashboard"
            component={MotherDashboard}
          />
        ) : (
          <Stack.Screen
            name="Home"
            component={HomeScreen}
          />
        )
      ) : (
        <Stack.Screen
          name="Auth"
          component={AuthStack}
        />
      )}
      
      {/* Common screens for all authenticated users */}
      <Stack.Screen
        name="Forum"
        component={ForumScreen}
        options={{ title: 'Community Forum' }}
      />
      <Stack.Screen
        name="Test"
        component={TestScreen}
        options={{ presentation: 'modal', title: 'Assessment' }}
      />
      <Stack.Screen
        name="Progress"
        component={ProgressScreen}
        options={{ title: 'Progress History' }}
      />
      <Stack.Screen
        name="ChatBot"
        component={ChatBotScreen}
        options={{ title: 'AI Assistant' }}
      />
      <Stack.Screen
        name="Predict"
        component={PredictScreen}
        options={{ title: 'Health Prediction' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
      <Stack.Screen
        name="Meditation"
        component={MeditationScreen}
        options={{ title: 'Meditation' }}
      />
      <Stack.Screen
        name="PregnancyTimeline"
        component={PregnancyTimeline}
        options={{ title: 'Pregnancy Timeline' }}
      />
      <Stack.Screen
        name="BallBirthing"
        component={BallBirthing}
        options={{ title: 'Ball Birthing' }}
      />
      <Stack.Screen
        name="LamazeBreathing"
        component={LamazeBreathing}
        options={{ title: 'Lamaze Breathing' }}
      />
      <Stack.Screen
        name="Shiatsu"
        component={Shiatsu}
        options={{ title: 'Shiatsu' }}
      />
      <Stack.Screen
        name="YogaBirthing"
        component={YogaBirthing}
        options={{ title: 'Yoga Birthing' }}
      />
      <Stack.Screen
        name="PatientTracking"
        component={PatientTracking}
        options={{ title: 'Patient Tracking' }}
      />
      <Stack.Screen
        name="AppointmentScheduling"
        component={AppointmentScheduling}
        options={{ title: 'Appointment Scheduling' }}
      />
      <Stack.Screen
        name="NurseAppointments"
        component={NurseAppointments}
        options={{ title: 'Appointment Requests' }}
      />
    </Stack.Navigator>
  );
}

function Navigation() {
  const { userInfo, loading } = useAuth();
  
  // Show splash screen while loading user info from AsyncStorage
  if (loading) {
    return (
      <NavigationContainer>
        <AuthStack />
      </NavigationContainer>
    );
  }
  
  return (
    <NavigationContainer>
      {userInfo ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NotificationProvider>
          <ToastProvider>
            <Navigation />
          </ToastProvider>
        </NotificationProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
