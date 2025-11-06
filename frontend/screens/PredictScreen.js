import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';
import { useTheme } from '../utils/ThemeContext';
import {
  ResponsiveText,
  ResponsiveButton,
  ResponsiveCard,
  ResponsiveInput,
} from '../utils/ResponsiveComponents';

export default function PredictScreen({ navigation, route }) {
  const { theme, isDarkMode } = useTheme();

  // derive themeColors for static styles below
  const themeColors = {
    background: theme?.background ?? '#FAFAFA',
    lightBackground: theme?.lightBackground ?? '#F5F7FB',
    white: theme?.white ?? '#FFFFFF',
    primary: theme?.primary ?? '#2563EB',
    text: theme?.text ?? '#111827',
    textSecondary: theme?.textSecondary ?? '#6B7280',
    placeholder: theme?.placeholder ?? '#9CA3AF',
    darkText: theme?.darkText ?? '#0F172A',
    lightPrimary: theme?.lightPrimary ?? '#E8EEF9',
    success: theme?.success ?? '#16A34A',
    warning: theme?.warning ?? '#F59E0B',
    error: theme?.error ?? '#DC2626',
  };

  // styles use themeColors, so build inside component
  const styles = StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: themeColors.lightBackground,
    },
    container: {
      flex: 1,
      backgroundColor: themeColors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: 20,
    },
    content: {
      padding: 20,
    },
    title: {
      fontSize: 28,
      fontWeight: '700',
      color: themeColors.darkText,
      marginBottom: 10,
    },
    subtitle: {
      fontSize: 16,
      color: themeColors.placeholder,
      marginBottom: 20,
    },
    backButton: {
      backgroundColor: themeColors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 10,
      marginBottom: 20,
      alignSelf: 'flex-start',
    },
    backButtonText: {
      color: themeColors.white,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 8,
    },
    form: {
      backgroundColor: themeColors.white,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
    },
    inputContainer: {
      marginBottom: 15,
    },
    label: {
      fontSize: 16,
      color: themeColors.darkText,
      marginBottom: 5,
    },
    input: {
      backgroundColor: themeColors.lightBackground,
      borderRadius: 10,
      padding: 12,
      fontSize: 16,
      color: themeColors.text,
      borderWidth: 1,
      borderColor: themeColors.lightPrimary,
    },
    predictButton: {
      backgroundColor: themeColors.primary,
      borderRadius: 10,
      padding: 15,
      alignItems: 'center',
      marginTop: 10,
    },
    predictButtonText: {
      color: themeColors.white,
      fontSize: 16,
      fontWeight: '600',
    },
    resultContainer: {
      backgroundColor: themeColors.white,
      borderRadius: 15,
      padding: 20,
      marginTop: 20,
    },
    resultTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: themeColors.darkText,
      marginBottom: 15,
    },
    riskContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 15,
    },
    riskLabel: {
      fontSize: 16,
      color: themeColors.darkText,
      marginRight: 10,
    },
    riskValue: {
      fontSize: 18,
      fontWeight: '600',
    },
    recommendationTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.darkText,
      marginBottom: 10,
    },
    recommendationText: {
      fontSize: 14,
      color: themeColors.text,
      lineHeight: 20,
    },
    riskMeterContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      marginVertical: 20,
      position: 'relative',
    },
    riskMeterTextContainer: {
      position: 'absolute',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 10,
    },
    riskMeterValue: {
      fontWeight: '700',
      textAlign: 'center',
      includeFontPadding: false,
    },
    riskMeterPoints: {
      color: themeColors.placeholder,
      marginTop: 8,
      textAlign: 'center',
    },
    // New styles for mother data integration
    motherDataSection: {
      backgroundColor: themeColors.white,
      borderRadius: 15,
      padding: 20,
      marginBottom: 20,
    },
    motherInfoHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    motherInfoTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: themeColors.darkText,
      marginLeft: 12,
    },
    toggleContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    toggleButton: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      borderRadius: 8,
      flex: 0.48,
      alignItems: 'center',
    },
    toggleButtonText: {
      fontSize: 14,
      fontWeight: '500',
    },
    healthTrendsSection: {
      marginTop: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: '#E0E0E0',
    },
    healthTrendsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: themeColors.darkText,
      marginBottom: 16,
    },
    chartContainer: {
      marginBottom: 20,
    },
    chartTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: themeColors.text,
      marginBottom: 8,
    },
    chartPlaceholder: {
      backgroundColor: themeColors.lightBackground,
      borderRadius: 8,
      padding: 20,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 100,
    },
    chartPlaceholderText: {
      fontSize: 14,
      color: themeColors.placeholder,
      marginTop: 8,
      textAlign: 'center',
    },
  });

  // RiskMeter uses styles & theme; define it here so it can access styles and themeColors
  const RiskMeter = ({ riskLevel }) => {
    const size = Dimensions.get('window').width * 0.6;
    const strokeWidth = 16;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;

    let progress = 0;
    let color = themeColors.success;

    const riskLevelLower = (riskLevel || '').toLowerCase();

    if (riskLevelLower.includes('low')) {
      progress = 0.33;
      color = themeColors.success;
    } else if (riskLevelLower.includes('medium') || riskLevelLower.includes('mid')) {
      progress = 0.66;
      color = themeColors.warning;
    } else if (riskLevelLower.includes('high')) {
      progress = 1;
      color = themeColors.error;
    }

    const progressOffset = circumference - progress * circumference;

    // split text if too long
    const words = (riskLevel || '').split(' ');
    const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
    const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
    const shouldSplit = (riskLevel || '').length > 12;

    return (
      <View style={styles.riskMeterContainer}>
        <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E6E6E6"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>

        <View style={[styles.riskMeterTextContainer, { width: size * 0.7 }]}>
          {shouldSplit ? (
            <>
              <Text
                style={[styles.riskMeterValue, { color, fontSize: size * 0.12 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {firstLine}
              </Text>
              <Text
                style={[styles.riskMeterValue, { color, fontSize: size * 0.12, marginTop: -5 }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {secondLine}
              </Text>
            </>
          ) : (
            <Text
              style={[styles.riskMeterValue, { color, fontSize: size * 0.15 }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {riskLevel || 'Unknown'}
            </Text>
          )}
          <Text style={[styles.riskMeterPoints, { fontSize: size * 0.08 }]}>Risk Level</Text>
        </View>
      </View>
    );
  };

  // Form state
  const [formData, setFormData] = useState({
    Age: '',
    SystolicBP: '',
    DiastolicBP: '',
    BS: '',
    BodyTemp: '',
    HeartRate: '',
  });

  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);

  // Mother-related states
  const [selectedMother, setSelectedMother] = useState(route?.params?.selectedMother || null);
  const [useMotherData, setUseMotherData] = useState(route?.params?.useMotherData || false);
  const [importDataMode, setImportDataMode] = useState(route?.params?.importDataMode || false);
  const [assignedMothers, setAssignedMothers] = useState([]);
  const [showMotherSelector, setShowMotherSelector] = useState(false);
  const [showHealthTrends, setShowHealthTrends] = useState(false);

  // prefill if using mother
  useEffect(() => {
    if (useMotherData && selectedMother && selectedMother.latest_health_log) {
      const logData = selectedMother.latest_health_log;
      setFormData({
        Age: logData.Age?.toString() ?? '',
        SystolicBP: logData.SystolicBP?.toString() ?? '',
        DiastolicBP: logData.DiastolicBP?.toString() ?? '',
        BS: logData.BS?.toString() ?? '',
        BodyTemp: logData.BodyTemp?.toString() ?? '',
        HeartRate: logData.HeartRate?.toString() ?? '',
      });
    }
  }, [useMotherData, selectedMother]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateInputs = () => {
    const requiredFields = ['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate'];
    for (const field of requiredFields) {
      if (formData[field] === '' || formData[field] === null || formData[field] === undefined || isNaN(formData[field])) {
        Alert.alert('Error', `Please enter a valid number for ${field}`);
        return false;
      }
    }
    return true;
  };

  const handleImportData = async () => {
    if (!validateInputs()) return;
    if (!selectedMother) {
      Alert.alert('Error', 'No mother selected for data import');
      return;
    }

    setLoading(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) {
        Alert.alert('Error', 'You need to be logged in to use this feature');
        setLoading(false);
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const token = userInfo.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/nurse/import-health-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mother_id: selectedMother.id,
          health_data: {
            Age: parseInt(formData.Age),
            SystolicBP: parseInt(formData.SystolicBP),
            DiastolicBP: parseInt(formData.DiastolicBP),
            BS: parseInt(formData.BS),
            BodyTemp: parseFloat(formData.BodyTemp),
            HeartRate: parseInt(formData.HeartRate),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status === 'success') {
        Alert.alert('Success', 'Health data imported successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', data.message || 'Failed to import health data');
      }
    } catch (err) {
      console.error('Import error:', err);
      Alert.alert('Error', 'Failed to import health data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      const userInfoString = await AsyncStorage.getItem('userInfo');
      if (!userInfoString) {
        Alert.alert('Error', 'You need to be logged in to use this feature');
        setLoading(false);
        return;
      }

      const userInfo = JSON.parse(userInfoString);
      const token = userInfo.token;
      if (!token) {
        Alert.alert('Error', 'Authentication token is missing. Please log in again.');
        setLoading(false);
        return;
      }

      const response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Age: parseInt(formData.Age),
          SystolicBP: parseInt(formData.SystolicBP),
          DiastolicBP: parseInt(formData.DiastolicBP),
          BS: parseInt(formData.BS),
          BodyTemp: parseFloat(formData.BodyTemp),
          HeartRate: parseInt(formData.HeartRate),
          use_mother_data: useMotherData,
          mother_id: selectedMother?.id || null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Prediction response:', data);

      if (data.status === 'success' && data.prediction) {
        setPrediction({
          Predicted_Risk: data.prediction,
          Recommendation: data.recommendation || 'No recommendations available',
        });

        Alert.alert(
          'Prediction Complete',
          `Risk Level: ${data.prediction}\n\n${data.recommendation || 'No recommendations available'}`,
          [
            { text: 'View History', onPress: () => navigation.navigate('Progress') },
            { text: 'OK', style: 'cancel' },
          ]
        );
      } else {
        console.error('Prediction failed:', data);
        Alert.alert('Error', data.message || 'Failed to get prediction');
      }
    } catch (err) {
      console.error('Prediction error:', err);
      Alert.alert('Error', 'Failed to connect to prediction service. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && (
          <StatusBar
            barStyle={isDarkMode ? 'light-content' : 'dark-content'}
            backgroundColor={themeColors.background}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
            bounces={true}
          >
            <View style={styles.content}>
              <ResponsiveText size="2xl" weight="bold" color={themeColors.text} style={styles.title}>
                {importDataMode ? 'Import Health Data' : 'Health Risk Prediction'}
              </ResponsiveText>
              <ResponsiveText size="base" color={themeColors.textSecondary} style={styles.subtitle}>
                {importDataMode
                  ? 'Enter health metrics to import for the assigned mother'
                  : 'Enter your health metrics to get a personalized risk assessment'}
              </ResponsiveText>

              {/* Back to Home Button */}
              <TouchableOpacity
                style={[styles.backButton, { backgroundColor: themeColors.primary }]}
                onPress={() => navigation.navigate('Home')}
              >
                <Ionicons name="arrow-back" size={20} color={themeColors.white} />
                <ResponsiveText size="sm" weight="semibold" color={themeColors.white} style={styles.backButtonText}>
                  Back to Home
                </ResponsiveText>
              </TouchableOpacity>

              {/* Mother Data Toggle for Nurses */}
              {useMotherData && selectedMother && (
                <ResponsiveCard variant="elevated" style={styles.motherDataSection}>
                  <View style={styles.motherInfoHeader}>
                    <Ionicons name="person-circle" size={24} color={themeColors.primary} />
                    <ResponsiveText size="base" weight="semibold" color={themeColors.text} style={styles.motherInfoTitle}>
                      Using data for: {selectedMother.full_name}
                    </ResponsiveText>
                  </View>

                  <View style={styles.toggleContainer}>
                    <ResponsiveButton variant="primary" onPress={() => setUseMotherData(false)} style={styles.toggleButton}>
                      Switch to Manual Input
                    </ResponsiveButton>

                    <ResponsiveButton variant="outline" onPress={() => setShowHealthTrends(!showHealthTrends)} style={styles.toggleButton}>
                      {showHealthTrends ? 'Hide' : 'Show'} Health Trends
                    </ResponsiveButton>
                  </View>

                  {/* Health Trends Charts */}
                  {showHealthTrends && selectedMother.health_trends && selectedMother.health_trends.length > 0 && (
                    <View style={styles.healthTrendsSection}>
                      <ResponsiveText size="lg" weight="bold" color={themeColors.text} style={styles.healthTrendsTitle}>
                        Health Trends Over Time
                      </ResponsiveText>

                      {/* Blood Pressure Chart */}
                      {selectedMother.health_trends.some(trend => trend.systolic_bp || trend.diastolic_bp) && (
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Blood Pressure Trends</Text>
                          <View style={styles.chartPlaceholder}>
                            <Ionicons name="trending-up" size={48} color={themeColors.primary} />
                            <Text style={styles.chartPlaceholderText}>Blood pressure data visualization</Text>
                          </View>
                        </View>
                      )}

                      {/* Blood Sugar Chart */}
                      {selectedMother.health_trends.some(trend => trend.blood_sugar) && (
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Blood Sugar Trends</Text>
                          <View style={styles.chartPlaceholder}>
                            <Ionicons name="trending-up" size={48} color={themeColors.primary} />
                            <Text style={styles.chartPlaceholderText}>Blood sugar data visualization</Text>
                          </View>
                        </View>
                      )}

                      {/* Heart Rate Chart */}
                      {selectedMother.health_trends.some(trend => trend.heart_rate) && (
                        <View style={styles.chartContainer}>
                          <Text style={styles.chartTitle}>Heart Rate Trends</Text>
                          <View style={styles.chartPlaceholder}>
                            <Ionicons name="trending-up" size={48} color={themeColors.primary} />
                            <Text style={styles.chartPlaceholderText}>Heart rate data visualization</Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </ResponsiveCard>
              )}

              {/* Manual Input Toggle for Nurses */}
              {useMotherData && !selectedMother && (
                <View style={styles.toggleContainer}>
                  <TouchableOpacity
                    style={[styles.toggleButton, { backgroundColor: themeColors.primary }]}
                    onPress={() => setUseMotherData(false)}
                  >
                    <Text style={[styles.toggleButtonText, { color: themeColors.white }]}>Use Manual Input</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Form Card */}
              <ResponsiveCard variant="elevated" style={styles.form}>
                <ResponsiveInput
                  label="Age"
                  placeholder="Enter your age"
                  value={formData.Age}
                  onChangeText={(value) => handleInputChange('Age', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveInput
                  label="Systolic Blood Pressure"
                  placeholder="Enter systolic BP"
                  value={formData.SystolicBP}
                  onChangeText={(value) => handleInputChange('SystolicBP', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveInput
                  label="Diastolic Blood Pressure"
                  placeholder="Enter diastolic BP"
                  value={formData.DiastolicBP}
                  onChangeText={(value) => handleInputChange('DiastolicBP', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveInput
                  label="Blood Sugar"
                  placeholder="Enter blood sugar level"
                  value={formData.BS}
                  onChangeText={(value) => handleInputChange('BS', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveInput
                  label="Body Temperature"
                  placeholder="Enter body temperature"
                  value={formData.BodyTemp}
                  onChangeText={(value) => handleInputChange('BodyTemp', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveInput
                  label="Heart Rate"
                  placeholder="Enter heart rate"
                  value={formData.HeartRate}
                  onChangeText={(value) => handleInputChange('HeartRate', value)}
                  keyboardType="numeric"
                  style={styles.inputContainer}
                />

                <ResponsiveButton
                  variant="primary"
                  onPress={importDataMode ? handleImportData : handlePredict}
                  disabled={loading}
                  loading={loading}
                  style={styles.predictButton}
                >
                  {importDataMode ? 'Import Health Data' : 'Get Prediction'}
                </ResponsiveButton>
              </ResponsiveCard>

              {/* Prediction Result */}
              {prediction && (
                <ResponsiveCard variant="elevated" style={styles.resultContainer}>
                  <ResponsiveText size="lg" weight="bold" color={themeColors.text} style={styles.resultTitle}>
                    Prediction Results
                  </ResponsiveText>

                  <RiskMeter riskLevel={prediction.Predicted_Risk} />

                  <View style={styles.riskContainer}>
                    <ResponsiveText size="base" weight="medium" color={themeColors.text} style={styles.riskLabel}>
                      Risk Level:
                    </ResponsiveText>
                    <ResponsiveText
                      size="base"
                      weight="bold"
                      color={
                        prediction.Predicted_Risk?.toLowerCase().includes('high')
                          ? themeColors.error
                          : prediction.Predicted_Risk?.toLowerCase().includes('medium')
                          ? themeColors.warning
                          : themeColors.success
                      }
                      style={styles.riskValue}
                    >
                      {prediction.Predicted_Risk || 'Unknown'}
                    </ResponsiveText>
                  </View>

                  <ResponsiveText size="base" weight="semibold" color={themeColors.text} style={styles.recommendationTitle}>
                    Recommendations:
                  </ResponsiveText>
                  <ResponsiveText size="sm" color={themeColors.textSecondary} style={styles.recommendationText}>
                    {prediction.Recommendation}
                  </ResponsiveText>
                </ResponsiveCard>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
