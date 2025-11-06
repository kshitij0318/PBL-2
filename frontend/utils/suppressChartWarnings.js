import { Platform } from 'react-native';

/**
 * Suppresses React Native responder prop warnings from react-native-chart-kit
 * on web platform. This should be called early in the app lifecycle.
 */
export const setupChartWarningSuppression = () => {
  if (Platform.OS === 'web' && typeof console !== 'undefined') {
    // Only set up if not already set up
    if (!console._originalWarn) {
      console._originalWarn = console.warn;
      
      const responderPropNames = [
        'onResponderTerminate',
        'onResponderGrant',
        'onResponderRelease',
        'onResponderMove',
        'onResponderStart',
        'onResponderEnd',
        'onStartShouldSetResponder',
        'onMoveShouldSetResponder',
        'onResponderReject',
      ];
      
      console.warn = (...args) => {
        // Check all arguments for warnings to suppress
        const message = args[0];
        const allArgs = args.join(' ');
        const allArgsLower = allArgs.toLowerCase();
        
        // Check if this is a React Native responder warning
        const isResponderWarning = responderPropNames.some(prop => {
          const propLower = prop.toLowerCase();
          
          return (
            (typeof message === 'string' && (
              message.includes(prop) ||
              message.toLowerCase().includes(propLower) ||
              allArgsLower.includes(propLower)
            )) &&
            (allArgsLower.includes('unknown event handler property') ||
             allArgsLower.includes('it will be ignored') ||
             allArgsLower.includes('event handler'))
          );
        });
        
        // Check for React Native Web deprecation warnings
        const isDeprecationWarning = 
          (allArgsLower.includes('is deprecated') && (
            allArgsLower.includes('pointerevents') ||
            allArgsLower.includes('tintcolor') ||
            allArgsLower.includes('usenativedriver')
          ));
        
        // Suppress known warnings
        if (isResponderWarning || isDeprecationWarning) {
          return;
        }
        
        // Call original warn for other messages
        if (console._originalWarn) {
          console._originalWarn.apply(console, args);
        }
      };
    }
  }
};

// Auto-setup when module loads (for web)
if (Platform.OS === 'web') {
  setupChartWarningSuppression();
}

