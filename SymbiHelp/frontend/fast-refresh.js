// This file enables Fast Refresh in your React Native app
// It should be imported at the top of your App.js file

import { LogBox } from 'react-native';

// Ignore specific warnings that might interfere with Fast Refresh
LogBox.ignoreLogs([
  'ViewPropTypes will be removed',
  'ColorPropType will be removed',
  'AsyncStorage has been extracted from react-native',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// Enable Fast Refresh
if (__DEV__) {
  try {
    const { enableFastRefresh } = require('react-refresh');
    enableFastRefresh();
  } catch (error) {
    console.log('Fast Refresh not available:', error.message);
  }
}

// This is a no-op function that can be imported to ensure Fast Refresh is enabled
export function enableFastRefresh() {
  // This function is intentionally empty
  // It's just a marker to ensure this file is included in the bundle
} 