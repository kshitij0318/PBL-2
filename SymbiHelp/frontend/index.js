import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Log that the app is starting
console.log('App is starting...');

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'AsyncStorage has been extracted from react-native',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

import App from './App';

// Log that the App component is being registered
console.log('Registering App component...');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

// Log that the App component has been registered
console.log('App component registered successfully');
