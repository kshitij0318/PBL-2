import 'react-native-gesture-handler';
import 'react-native-screens';
import 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

// Ignore specific warnings
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'AsyncStorage has been extracted from react-native',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
  'Unknown event handler property',
  'onStartShouldSetResponder',
  'onResponderTerminationRequest',
  'onResponderGrant',
  'onResponderMove',
  'onResponderRelease',
  'onResponderTerminate',
]);

import App from './App';

console.log('[index.js] App is starting...');

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);

console.log('[index.js] App component registered');
