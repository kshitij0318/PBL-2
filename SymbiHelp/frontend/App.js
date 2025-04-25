// Remove fast-refresh import
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, Text, LogBox, StyleSheet, ActivityIndicator, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screen Imports
import SignUpScreen from './screens/SignUpScreen';
import SignInScreen from './screens/SignInScreen';
import AdminDashboard from './screens/AdminDashboard';
import HomeScreen from './screens/HomeScreen';
import LamazeBreathing from './screens/LamazeBreathing';
import BallBirthing from './screens/BallBirthing';
import YogaBirthing from './screens/YogaBirthing';
import Shiatsu from './screens/Shiatsu';
import TestScreen from './screens/TestScreen';
import ProgressScreen from './screens/ProgressScreen';
import PredictScreen from './screens/PredictScreen';
import ChatBotScreen from './screens/ChatBotScreen';

// Import AuthProvider and ThemeProvider
import { AuthProvider, useAuth } from './utils/AuthContext';
import { ThemeProvider, useTheme } from './utils/ThemeContext';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'AsyncStorage has been extracted from react-native',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Loading component
function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.lightBackground }]}>
      <ActivityIndicator size={36} color={theme.primary} />
      <Text style={[styles.loadingText, { color: theme.text }]}>Loading...</Text>
    </SafeAreaView>
  );
}

// Stack Navigator for screens reachable from Home tab
function HomeStackNavigator() {
  const { theme } = useTheme();
  return (
    <Stack.Navigator
      screenOptions={({ route }) => ({
        headerStyle: {
          backgroundColor: '#7A7FFC',
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerLeft: null,
        headerBackVisible: false,
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: '#f8f9fa',
        },
        headerShadowVisible: true,
        animation: 'slide_from_right',
        animationDuration: 200,
        gestureEnabled: true,
        gestureDirection: 'horizontal',
        fullScreenGestureEnabled: true,
        customAnimationOnGesture: true,
        animationTypeForReplace: 'push',
        presentation: 'card',
        orientation: 'portrait',
        animationType: 'slide',
        animationEnabled: true,
        freezeOnBlur: true,
        screenOrientation: 'portrait',
        statusBarAnimation: 'fade',
        statusBarColor: '#7A7FFC',
        statusBarStyle: 'light',
        statusBarTranslucent: true,
        statusBarHidden: false,
      })}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="LamazeBreathing" 
        component={LamazeBreathing} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="BallBirthing" 
        component={BallBirthing} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="YogaBirthing" 
        component={YogaBirthing} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="Shiatsu" 
        component={Shiatsu} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="Test" 
        component={TestScreen} 
        options={{ 
          title: 'SymbiHelp',
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }} 
      />
      <Stack.Screen 
        name="Predict" 
        component={PredictScreen} 
        options={{ 
          title: 'SymbiHelp',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
    </Stack.Navigator>
  );
}

// Main Bottom Tab Navigator
function MainTabNavigator() {
  const { theme } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'HomeTab') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'ProgressTab') {
            iconName = focused ? 'bar-chart' : 'bar-chart-outline';
          } else if (route.name === 'ChatBot') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          }
          return <Ionicons name={iconName} size={24} color={color} />;
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopColor: theme.cardBorder,
          paddingBottom: Platform.OS === 'ios' ? 5 : 0,
          height: Platform.OS === 'ios' ? 90 : 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
      })}
    >
      <Tab.Screen 
        name="HomeTab" 
        component={HomeStackNavigator} 
        options={{ title: 'Home' }} 
      />
      <Tab.Screen 
        name="ProgressTab" 
        component={ProgressScreen} 
        options={{ title: 'Progress' }} 
      />
      <Tab.Screen 
        name="ChatBot" 
        component={ChatBotScreen} 
        options={{ title: 'Chat' }} 
      />
    </Tab.Navigator>
  );
}

// Navigation component that handles auth state
function Navigation() {
  const { userInfo, loading } = useAuth();
  const { theme } = useTheme();

  if (loading) {
    return <LoadingScreen />;
  }

  console.log('[App.js Navigation] UserInfo:', userInfo);

  return (
    <NavigationContainer>
      <Suspense fallback={<LoadingScreen />}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.lightBackground,
            },
            animation: 'slide_from_right',
            animationDuration: 200,
            gestureEnabled: true,
            gestureDirection: 'horizontal',
            fullScreenGestureEnabled: true,
            customAnimationOnGesture: true,
            animationTypeForReplace: 'push',
            presentation: 'card',
            orientation: 'portrait',
            animationType: 'slide',
            animationEnabled: true,
            freezeOnBlur: true,
            screenOrientation: 'portrait',
            statusBarAnimation: 'fade',
            statusBarColor: theme.primary,
            statusBarStyle: 'light',
            statusBarTranslucent: true,
            statusBarHidden: false,
          }}
        >
          {!userInfo ? (
            <>
              <Stack.Screen name="SignIn" component={SignInScreen} />
              <Stack.Screen name="SignUp" component={SignUpScreen} />
            </>
          ) : userInfo.is_admin === true ? (
            <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
          ) : (
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
          )}
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>
  );
}

// Main App component
export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
});
