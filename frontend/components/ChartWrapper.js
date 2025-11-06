import React, { useEffect } from 'react';
import { setupChartWarningSuppression } from '../utils/suppressChartWarnings';

/**
 * Wrapper component for react-native-chart-kit charts that ensures
 * React Native responder prop warnings are suppressed on web platform.
 * 
 * The suppression is primarily handled at the app level, but this wrapper
 * ensures it's initialized when charts are rendered.
 */
export const ChartWrapper = ({ children }) => {
  useEffect(() => {
    // Ensure suppression is set up (idempotent)
    setupChartWarningSuppression();
  }, []);
  
  return <>{children}</>;
};

export default ChartWrapper;

