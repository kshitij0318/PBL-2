// src/navigation/AppNavigator.js
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import TestScreen from '../screens/TestScreen';
import ProgressScreen from '../screens/ProgressScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerStyle: {
          backgroundColor: '#4CAF50',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: '500',
          fontSize: 18,
        },
        headerBackTitleVisible: false,
      }}
    >
      <Stack.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          title: 'Birth Process Guide',
          headerTitleStyle: {
            fontSize: 24,
            fontWeight: 'bold',
          }
        }}
      />
      <Stack.Screen 
        name="Test" 
        component={TestScreen} 
        options={{ 
          title: 'Assessment',
          presentation: 'modal',
          animation: 'slide_from_bottom'
        }}
      />
      <Stack.Screen 
        name="Progress" 
        component={ProgressScreen} 
        options={{ 
          title: 'Progress History',
          headerBackButtonMenuEnabled: true
        }}
      />
    </Stack.Navigator>
  );
}

export default AppNavigator;
