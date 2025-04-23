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

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  error: '#dc3545',
  success: '#28a745',
  warning: '#ffc107',
};

const RiskMeter = ({ riskLevel }) => {
  const size = Dimensions.get('window').width * 0.6;
  const strokeWidth = 16;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  let progress = 0;
  let color = themeColors.success;
  
  // Convert risk level to lowercase for case-insensitive comparison
  const riskLevelLower = riskLevel?.toLowerCase() || '';
  
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
      const response = await fetch('http://127.0.0.1:5000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
        setPrediction(data.prediction);
      } else {
        Alert.alert('Error', data.message || 'Failed to get prediction');
      }
    } catch (error) {
      console.error('Prediction error:', error);
      Alert.alert('Error', 'Failed to connect to prediction service. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Health Risk Prediction</Text>
        <Text style={styles.subtitle}>
          Enter your health metrics to get a personalized risk assessment
        </Text>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your age"
              value={formData.Age}
              onChangeText={(value) => handleInputChange('Age', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Systolic Blood Pressure</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter systolic BP"
              value={formData.SystolicBP}
              onChangeText={(value) => handleInputChange('SystolicBP', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Diastolic Blood Pressure</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter diastolic BP"
              value={formData.DiastolicBP}
              onChangeText={(value) => handleInputChange('DiastolicBP', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Blood Sugar</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter blood sugar level"
              value={formData.BS}
              onChangeText={(value) => handleInputChange('BS', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Body Temperature</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter body temperature"
              value={formData.BodyTemp}
              onChangeText={(value) => handleInputChange('BodyTemp', value)}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Heart Rate</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter heart rate"
              value={formData.HeartRate}
              onChangeText={(value) => handleInputChange('HeartRate', value)}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={styles.predictButton}
            onPress={handlePredict}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={themeColors.white} />
            ) : (
              <Text style={styles.predictButtonText}>Get Prediction</Text>
            )}
          </TouchableOpacity>
        </View>

        {prediction && (
          <View style={styles.resultContainer}>
            <Text style={styles.resultTitle}>Prediction Results</Text>
            
            <RiskMeter riskLevel={prediction.Predicted_Risk} />
            
            <View style={styles.riskContainer}>
              <Text style={styles.riskLabel}>Risk Level:</Text>
              <Text style={[
                styles.riskValue,
                { 
                  color: prediction.Predicted_Risk?.toLowerCase().includes('high') 
                    ? themeColors.error 
                    : prediction.Predicted_Risk?.toLowerCase().includes('medium') 
                      ? themeColors.warning 
                      : themeColors.success 
                }
              ]}>
                {prediction.Predicted_Risk || 'Unknown'}
              </Text>
            </View>
            <Text style={styles.recommendationTitle}>Recommendations:</Text>
            <Text style={styles.recommendationText}>{prediction.Recommendation || 'No recommendations available'}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: themeColors.placeholder,
    marginBottom: 30,
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
    textAlign: 'center',
    includeFontPadding: false,
    lineHeight: undefined,
  },
  riskMeterPoints: {
    color: themeColors.placeholder,
    marginTop: 8,
    textAlign: 'center',
  },
}); 