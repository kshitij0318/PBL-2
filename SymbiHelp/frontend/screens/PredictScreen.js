import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../utils/config';
import { useTheme } from '../utils/ThemeContext';
import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import Screen from '../components/Screen';
import { Title, Subtitle } from '../components/ThemedText';
import { useToast } from '../utils/ToastContext';
import Skeleton, { SkeletonBlock } from '../components/Skeleton';

// Remove local theme; use global theme via useTheme

const RiskMeter = ({ riskLevel }) => {
  const size = Dimensions.get('window').width * 0.6;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  let progress = 0;
  let color = '#28a745';
  
  // Convert risk level to lowercase for case-insensitive comparison
  const riskLevelLower = riskLevel?.toLowerCase() || '';
  
  if (riskLevelLower.includes('low')) {
    progress = 0.33;
    color = '#28a745';
  } else if (riskLevelLower.includes('medium') || riskLevelLower.includes('mid')) {
    progress = 0.66;
    color = '#ffc107';
  } else if (riskLevelLower.includes('high')) {
    progress = 1;
    color = '#dc3545';
  }

  const progressOffset = circumference - (progress * circumference);

  // Split risk level text into lines if it's too long
  const words = (riskLevel || '').split(' ');
  const firstLine = words.slice(0, Math.ceil(words.length / 2)).join(' ');
  const secondLine = words.slice(Math.ceil(words.length / 2)).join(' ');
  const shouldSplit = (riskLevel || '').length > 12;

  return (
    <View style={styles.riskMeterContainer}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E6E6E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress Circle */}
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
            <Text style={[styles.riskMeterValue, { color, fontSize: size * 0.12 }]} numberOfLines={1} adjustsFontSizeToFit>
              {firstLine}
            </Text>
            <Text style={[styles.riskMeterValue, { color, fontSize: size * 0.12, marginTop: -5 }]} numberOfLines={1} adjustsFontSizeToFit>
              {secondLine}
            </Text>
          </>
        ) : (
          <Text style={[styles.riskMeterValue, { color, fontSize: size * 0.15 }]} numberOfLines={1} adjustsFontSizeToFit>
            {riskLevel || 'Unknown'}
          </Text>
        )}
        <Text style={[styles.riskMeterPoints, { fontSize: size * 0.08 }]}>Risk Level</Text>
      </View>
    </View>
  );
};

export default function PredictScreen({ navigation }) {
  const { theme } = useTheme();
  const { show } = useToast();
  const [focused, setFocused] = useState(null);
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

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateInputs = () => {
    const requiredFields = ['Age', 'SystolicBP', 'DiastolicBP', 'BS', 'BodyTemp', 'HeartRate'];
    for (const field of requiredFields) {
      if (!formData[field] || isNaN(formData[field])) {
        Alert.alert('Error', `Please enter a valid number for ${field}`);
        return false;
      }
    }
    return true;
  };

  const handlePredict = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    try {
      // Get the user info from AsyncStorage
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
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          Age: parseInt(formData.Age),
          SystolicBP: parseInt(formData.SystolicBP),
          DiastolicBP: parseInt(formData.DiastolicBP),
          BS: parseInt(formData.BS),
          BodyTemp: parseFloat(formData.BodyTemp),
          HeartRate: parseInt(formData.HeartRate),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.prediction) {
        // Store the prediction data in the correct format
        setPrediction({
          Predicted_Risk: data.prediction,
          Recommendation: data.recommendation || 'No recommendations available'
        });
        
        // Show success message with recommendation
        show(`Prediction: ${data.prediction}`, { duration: 2500, type: 'success' });
      } else {
        show('Failed to get prediction', { duration: 2500, type: 'error' });
      }
    } catch (error) {
      console.error('Prediction error:', error);
      show('Connection error. Please try again later.', { duration: 2500, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Title>Health Risk Prediction</Title>
      <Subtitle>Enter your health metrics to get a personalized risk assessment</Subtitle>

      <Card style={{ marginBottom: 20 }}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'Age' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter your age"
              value={formData.Age}
              onChangeText={(value) => handleInputChange('Age', value)}
              onFocus={() => setFocused('Age')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical range: 18–50</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Systolic Blood Pressure</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'SystolicBP' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter systolic BP"
              value={formData.SystolicBP}
              onChangeText={(value) => handleInputChange('SystolicBP', value)}
              onFocus={() => setFocused('SystolicBP')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical range: 90–120 mmHg</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Diastolic Blood Pressure</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'DiastolicBP' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter diastolic BP"
              value={formData.DiastolicBP}
              onChangeText={(value) => handleInputChange('DiastolicBP', value)}
              onFocus={() => setFocused('DiastolicBP')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical range: 60–80 mmHg</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Blood Sugar</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'BS' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter blood sugar level"
              value={formData.BS}
              onChangeText={(value) => handleInputChange('BS', value)}
              onFocus={() => setFocused('BS')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical fasting: 70–100 mg/dL</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Body Temperature</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'BodyTemp' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter body temperature"
              value={formData.BodyTemp}
              onChangeText={(value) => handleInputChange('BodyTemp', value)}
              onFocus={() => setFocused('BodyTemp')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical range: 97–99°F (36.1–37.2°C)</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Heart Rate</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.lightBackground,
                  borderColor: focused === 'HeartRate' ? theme.primary : theme.lightPrimary,
                  color: theme.text,
                },
              ]}
              placeholder="Enter heart rate"
              value={formData.HeartRate}
              onChangeText={(value) => handleInputChange('HeartRate', value)}
              onFocus={() => setFocused('HeartRate')}
              onBlur={() => setFocused(null)}
              keyboardType="numeric"
            />
            <Text style={[styles.hint, { color: theme.placeholder }]}>Typical range: 60–100 bpm</Text>
          </View>

          <PrimaryButton onPress={handlePredict} loading={loading} fullWidth>
            Get Prediction
          </PrimaryButton>
      </Card>

        {loading && (
          <Card style={{ marginBottom: 12 }}>
            <Skeleton width={160} height={22} style={{ marginBottom: 14 }} />
            <Skeleton width={'100%'} height={140} radius={16} style={{ marginBottom: 16 }} />
            <SkeletonBlock lines={3} />
          </Card>
        )}

        {prediction && !loading && (
          <Card>
            <Title style={{ fontSize: 20, marginBottom: 15 }}>Prediction Results</Title>
            
            <RiskMeter riskLevel={prediction.Predicted_Risk} />
            
            <View style={styles.riskContainer}>
              <Text style={styles.riskLabel}>Risk Level:</Text>
              <Text style={[
                styles.riskValue,
                { 
                  color: prediction.Predicted_Risk?.toLowerCase().includes('high') 
                    ? '#dc3545' 
                    : prediction.Predicted_Risk?.toLowerCase().includes('medium') 
                      ? '#ffc107' 
                      : '#28a745' 
                }
              ]}>
                {prediction.Predicted_Risk || 'Unknown'}
              </Text>
            </View>
            <Subtitle style={{ marginBottom: 10 }}>Recommendations:</Subtitle>
            <Text style={[styles.recommendationText, { color: theme.text }]}>
              {prediction.Recommendation}
            </Text>
          </Card>
        )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // Container/layout comes from Screen and Card
  inputContainer: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    color: '#1E1E1E',
    marginBottom: 5,
  },
  input: {
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  hint: {
    fontSize: 12,
    marginTop: 6,
  },
  riskContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  riskLabel: {
    fontSize: 16,
    color: '#1E1E1E',
    marginRight: 10,
  },
  riskValue: {
    fontSize: 18,
    fontWeight: '600',
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E1E1E',
    marginBottom: 10,
  },
  recommendationText: {
    fontSize: 14,
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
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: undefined,
  },
  riskMeterPoints: {
    color: '#A0A0A0',
    marginTop: 8,
    textAlign: 'center',
  },
}); 