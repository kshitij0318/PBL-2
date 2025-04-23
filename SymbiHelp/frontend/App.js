// Remove fast-refresh import
import React, { Suspense } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, View, Text, LogBox, StyleSheet, ActivityIndicator, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screen Imports
import SignUpScreen from './screens/SignUpScreen';
import SignInScreen from './screens/SignInScreen';
import HomeScreen from './screens/HomeScreen';
import EarlyLabor from './screens/EarlyLabor';
import LamazeBreathing from './screens/LamazeBreathing';
import BallBirthing from './screens/BallBirthing';
import YogaBirthing from './screens/YogaBirthing';
import Shiatsu from './screens/Shiatsu';
import TestScreen from './screens/TestScreen';
import ProgressScreen from './screens/ProgressScreen';
import PredictScreen from './screens/PredictScreen';
import ChatBotScreen from './screens/ChatBotScreen';

// Import AuthProvider
import { AuthProvider, useAuth } from './utils/AuthContext';

// Theme Colors
const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  grey: '#A0A0A0',
  darkText: '#1E1E1E',
};

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
  return (
    <SafeAreaView style={styles.loadingContainer}>
      <ActivityIndicator size={36} color={themeColors.primary} />
      <Text style={styles.loadingText}>Loading...</Text>
    </SafeAreaView>
  );
}

// Stack Navigator for screens reachable from Home tab
function HomeStackNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: themeColors.primary,
        },
        headerTintColor: themeColors.white,
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
        contentStyle: {
          backgroundColor: themeColors.lightBackground,
        },
        headerShadowVisible: false,
        headerBackVisible: true,
        headerBackTitle: '',
        headerBackImageSource: null,
        headerBackImage: () => (
          <Ionicons name="chevron-back" size={24} color={themeColors.white} />
        ),
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
        statusBarColor: themeColors.primary,
        statusBarStyle: 'light',
        statusBarTranslucent: true,
        statusBarHidden: false,
      }}
    >
      <Stack.Screen 
        name="HomeMain" 
        component={HomeScreen} 
        options={{ 
          title: 'Guide',
          headerTitleStyle: {
            fontSize: 20,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="EarlyLabor" 
        component={EarlyLabor} 
        options={{ 
          title: 'Early Labor',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="LamazeBreathing" 
        component={LamazeBreathing} 
        options={{ 
          title: 'Lamaze Breathing',
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
          title: 'Ball Birthing',
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
          title: 'Yoga Birthing',
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
          title: 'Shiatsu',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          }
        }} 
      />
      <Stack.Screen 
        name="Predict" 
        component={PredictScreen} 
        options={{ 
          title: 'Health Risk Prediction',
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
          title: 'Assessment Test',
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
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.grey,
        tabBarStyle: {
          backgroundColor: themeColors.white,
          borderTopColor: 'transparent',
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

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Suspense fallback={<LoadingScreen />}>
        <Stack.Navigator 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: themeColors.lightBackground,
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
            statusBarColor: themeColors.primary,
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
          ) : (
            <Stack.Screen name="MainApp" component={MainTabNavigator} />
          )}
        </Stack.Navigator>
      </Suspense>
    </NavigationContainer>
  );
}

// Main App Component
export default function App() {
  return (
    <AuthProvider>
      <Navigation />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: themeColors.lightBackground,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: themeColors.darkText,
  },
});
