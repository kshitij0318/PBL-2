import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Animated,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, BarChart } from 'react-native-chart-kit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'react-native';
import { useTheme } from '../utils/ThemeContext';
import { useAuth } from '../utils/AuthContext';
import { API_URL } from '../utils/config';
import GamificationManager from '../utils/GamificationManager';
import ChartWrapper from '../components/ChartWrapper';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  success: '#28a745',
  warning: '#ffc107',
  error: '#dc3545',
  info: '#17a2b8',
};

const { width: screenWidth } = Dimensions.get('window');

export default function PregnancyTimeline({ navigation }) {
  const { theme } = useTheme();
  const { userInfo } = useAuth();
  
  // State for timeline data
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(null);
  
  // State for pregnancy week data
  const [pregnancyWeekData, setPregnancyWeekData] = useState(null);
  const [currentWeek, setCurrentWeek] = useState(1);
  
  // State for gamification
  const [gamificationData, setGamificationData] = useState(null);
  const [showGamification, setShowGamification] = useState(false);
  
  // State for UI
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [showWeekDetails, setShowWeekDetails] = useState(false);
  
  // State for firecracker animation
  const [showFirecrackers, setShowFirecrackers] = useState(false);
  const [firecrackerMessage, setFirecrackerMessage] = useState('');
  const firecrackerAnimations = useRef(
    Array.from({ length: 20 }, () => ({
      scale: new Animated.Value(0),
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(0),
      translateX: new Animated.Value(0),
      rotation: new Animated.Value(0),
    }))
  ).current;
  
  // Ref for week selector scroll view
  const weekScrollViewRef = useRef(null);

  useEffect(() => {
    loadTimelineData();
    loadPregnancyWeekData();
    loadGamificationData();
  }, []);
  
  // Scroll to current week when data loads
  useEffect(() => {
    if (weekScrollViewRef.current && currentWeek && pregnancyWeekData) {
      const weeks = Object.keys(pregnancyWeekData.weeks).map(Number).sort((a, b) => a - b);
      const weekIndex = weeks.indexOf(currentWeek);
      if (weekIndex >= 0) {
        setTimeout(() => {
          weekScrollViewRef.current?.scrollTo({
            x: weekIndex * 62 - (screenWidth - 62) / 2,
            animated: true,
          });
        }, 300);
      }
    }
  }, [currentWeek, pregnancyWeekData]);

  const loadTimelineData = async () => {
    setTimelineLoading(true);
    setTimelineError(null);
    
    try {
      const token = userInfo?.token;
      if (!token) {
        setTimelineError('Authentication token missing');
        return;
      }

      const response = await fetch(`${API_URL}/get-timeline`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setTimelineData(data.timeline);
          setCurrentWeek(data.timeline.current_week);
          setSelectedWeek(data.timeline.current_week);
        } else {
          setTimelineError(data.message);
        }
      } else {
        const errorData = await response.json();
        setTimelineError(errorData.message || 'Failed to load timeline data');
      }
    } catch (error) {
      console.error('Error loading timeline data:', error);
      setTimelineError('Network error. Please try again.');
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadPregnancyWeekData = async () => {
    try {
      // Try to load from local assets first (more reliable)
      try {
        const localData = require('../assets/pregnancy_timeline_data.json');
        setPregnancyWeekData(localData);
        return;
      } catch (localError) {
        // If local file doesn't exist, try fetching from GitHub
        console.log('Local pregnancy timeline data not found, trying remote...');
      }
      
      // Fallback to remote data
      const response = await fetch('https://raw.githubusercontent.com/kshitij0318/PBL-2/main/frontend/assets/pregnancy_timeline_data.json');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPregnancyWeekData(data);
    } catch (error) {
      console.error('Error loading pregnancy week data:', error);
      // Set empty data structure to prevent crashes
      setPregnancyWeekData({
        weeks: {}
      });
    }
  };

  const loadGamificationData = async () => {
    try {
      if (userInfo?.id) {
        const data = await GamificationManager.getProgressSummary(userInfo.id);
        setGamificationData(data);
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    }
  };

  const triggerFirecrackers = (message) => {
    setFirecrackerMessage(message);
    setShowFirecrackers(true);
    
    // Animate all firecrackers
    const animations = firecrackerAnimations.map((anim, index) => {
      const angle = (index * 360) / firecrackerAnimations.length;
      const distance = 200 + Math.random() * 100;
      const translateX = Math.cos((angle * Math.PI) / 180) * distance;
      const translateY = Math.sin((angle * Math.PI) / 180) * distance;
      
      return Animated.parallel([
        Animated.spring(anim.scale, {
          toValue: 1,
          tension: 50,
          friction: 3,
          useNativeDriver: true,
        }),
        Animated.timing(anim.opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateY, {
          toValue: translateY,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.translateX, {
          toValue: translateX,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(anim.rotation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]);
    });
    
    Animated.parallel(animations).start(() => {
      // Fade out after animation
      setTimeout(() => {
        Animated.parallel(
          firecrackerAnimations.map(anim =>
            Animated.timing(anim.opacity, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            })
          )
        ).start(() => {
          setShowFirecrackers(false);
          // Reset animations
          firecrackerAnimations.forEach(anim => {
            anim.scale.setValue(0);
            anim.opacity.setValue(0);
            anim.translateY.setValue(0);
            anim.translateX.setValue(0);
            anim.rotation.setValue(0);
          });
        });
      }, 1500);
    });
  };

  const handleWeeklyCheckin = async () => {
    try {
      if (userInfo?.id && timelineData) {
        const updatedData = await GamificationManager.recordWeeklyCheckin(
          userInfo.id, 
          timelineData.current_week
        );
        
        if (updatedData) {
          setGamificationData(await GamificationManager.getProgressSummary(userInfo.id));
          triggerFirecrackers(`Weekly Check-in Complete! 🎉\nYou've earned 5 points!`);
        }
      }
    } catch (error) {
      console.error('Error recording weekly check-in:', error);
      Alert.alert('Error', 'Failed to record weekly check-in. Please try again.');
    }
  };

  const handleMilestoneReached = async (milestoneType) => {
    try {
      if (userInfo?.id && timelineData) {
        const updatedData = await GamificationManager.recordMilestone(
          userInfo.id,
          milestoneType,
          timelineData.current_week
        );
        
        if (updatedData) {
          setGamificationData(await GamificationManager.getProgressSummary(userInfo.id));
          triggerFirecrackers(`Milestone Reached! 🎯\nCongratulations! You've earned 15 points!`);
        }
      }
    } catch (error) {
      console.error('Error recording milestone:', error);
      Alert.alert('Error', 'Failed to record milestone. Please try again.');
    }
  };

  const renderProgressBar = () => {
    if (!timelineData) return null;

    const progress = (timelineData.current_week / timelineData.total_weeks) * 100;
    
    return (
      <View style={styles.progressSection}>
        <Text style={[styles.progressTitle, { color: theme.darkText }]}>
          Pregnancy Progress
        </Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { 
                  width: `${progress}%`,
                  backgroundColor: theme.primary 
                }
              ]} 
            />
          </View>
          <Text style={[styles.progressText, { color: theme.primary }]}>
            Week {timelineData.current_week} of {timelineData.total_weeks}
          </Text>
        </View>
        <Text style={[styles.dueDateText, { color: theme.placeholder }]}>
          Due Date: {new Date(timelineData.due_date).toLocaleDateString()}
        </Text>
      </View>
    );
  };

  const renderHealthCharts = () => {
    if (!timelineData?.health_trends || timelineData.health_trends.length === 0) {
      return (
        <View style={[styles.section, { backgroundColor: theme.white }]}>
          <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
            Health Trends
          </Text>
          <View style={styles.emptyChartContainer}>
            <Ionicons name="analytics-outline" size={48} color={theme.placeholder} />
            <Text style={[styles.emptyText, { color: theme.placeholder }]}>
              No health data available yet. Start logging your health information to see trends.
            </Text>
          </View>
        </View>
      );
    }

    const healthData = timelineData.health_trends.slice(-7);
    const chartData = {
      labels: healthData.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          data: healthData.map(item => item.systolic_bp || 0),
          color: (opacity = 1) => `rgba(122, 127, 252, ${opacity})`,
          strokeWidth: 3,
        },
        {
          data: healthData.map(item => item.diastolic_bp || 0),
          color: (opacity = 1) => `rgba(40, 167, 69, ${opacity})`,
          strokeWidth: 3,
        }
      ]
    };

    const bloodSugarData = {
      labels: healthData.map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: healthData.map(item => item.blood_sugar || 0)
      }]
    };

    // Calculate min/max for better chart scaling
    const allBPValues = [...healthData.map(d => d.systolic_bp || 0), ...healthData.map(d => d.diastolic_bp || 0)];
    const allSugarValues = healthData.map(d => d.blood_sugar || 0);
    const bpMin = Math.max(0, Math.min(...allBPValues) - 10);
    const bpMax = Math.max(...allBPValues) + 10;
    const sugarMin = Math.max(0, Math.min(...allSugarValues) - 5);
    const sugarMax = Math.max(...allSugarValues) + 5;

    return (
      <View style={[styles.section, { backgroundColor: theme.white }]}>
        <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
          Health Trends
        </Text>
        
        {/* Blood Pressure Chart */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartLabel, { color: theme.darkText }]}>
              Blood Pressure (Systolic/Diastolic)
            </Text>
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#7A7FFC' }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>Systolic</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#28a745' }]} />
                <Text style={[styles.legendText, { color: theme.text }]}>Diastolic</Text>
              </View>
            </View>
          </View>
          <ChartWrapper>
            <LineChart
              data={chartData}
              width={screenWidth - (Platform.OS === 'web' ? 72 : 64)}
              height={Platform.OS === 'web' ? 220 : 200}
              chartConfig={{
                backgroundColor: '#F8F9FA',
                backgroundGradientFrom: '#F8F9FA',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
                style: {
                  borderRadius: 16,
                },
                propsForDots: {
                  r: '5',
                  strokeWidth: '2',
                  stroke: '#FFFFFF',
                },
                propsForBackgroundLines: {
                  strokeDasharray: '5, 5',
                  stroke: '#E0E0E0',
                  strokeWidth: 1,
                },
              }}
              bezier
              style={styles.chart}
              withVerticalLines={true}
              withHorizontalLines={true}
              withInnerLines={true}
              withOuterLines={false}
              fromZero={false}
            />
          </ChartWrapper>
          <View style={styles.chartStats}>
            <Text style={[styles.chartStatText, { color: theme.textSecondary }]}>
              Range: {bpMin}-{bpMax} mmHg
            </Text>
          </View>
        </View>

        {/* Blood Sugar Chart */}
        <View style={[styles.chartCard, { marginTop: 20 }]}>
          <View style={styles.chartHeader}>
            <Text style={[styles.chartLabel, { color: theme.darkText }]}>
              Blood Sugar Levels
            </Text>
          </View>
          <ChartWrapper>
            <BarChart
              data={bloodSugarData}
              width={screenWidth - (Platform.OS === 'web' ? 72 : 64)}
              height={Platform.OS === 'web' ? 220 : 200}
              chartConfig={{
                backgroundColor: '#F8F9FA',
                backgroundGradientFrom: '#F8F9FA',
                backgroundGradientTo: '#FFFFFF',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 193, 7, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity * 0.7})`,
                style: {
                  borderRadius: 16,
                },
                propsForBackgroundLines: {
                  strokeDasharray: '5, 5',
                  stroke: '#E0E0E0',
                  strokeWidth: 1,
                },
              }}
              style={styles.chart}
              withVerticalLines={true}
              withHorizontalLines={true}
              withInnerLines={true}
              withOuterLines={false}
              fromZero={true}
              showValuesOnTopOfBars={true}
            />
          </ChartWrapper>
          <View style={styles.chartStats}>
            <Text style={[styles.chartStatText, { color: theme.textSecondary }]}>
              Range: {sugarMin}-{sugarMax} mg/dL
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderWeekSelector = () => {
    if (!pregnancyWeekData) return null;

    const weeks = Object.keys(pregnancyWeekData.weeks).map(Number).sort((a, b) => a - b);
    
    return (
      <View style={[styles.section, { backgroundColor: theme.white }]}>
        <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
          Select Week (Current: Week {currentWeek})
        </Text>
        <View style={styles.weekSelectorContainer}>
          {/* Left fade indicator */}
          <View style={[styles.scrollFade, styles.scrollFadeLeft]} pointerEvents="none" />
          
          <ScrollView 
            ref={weekScrollViewRef}
            horizontal 
            showsHorizontalScrollIndicator={false} 
            style={styles.weekSelector}
            contentContainerStyle={styles.weekSelectorContent}
            decelerationRate="fast"
            snapToInterval={62}
            snapToAlignment="center"
          >
            {weeks.map(week => {
              const isCurrentWeek = week === currentWeek;
              const isSelected = selectedWeek === week;
              return (
                <TouchableOpacity
                  key={week}
                  style={[
                    styles.weekButton,
                    { 
                      backgroundColor: isSelected ? theme.primary : isCurrentWeek ? theme.lightPrimary : theme.lightBackground,
                      borderColor: isSelected ? theme.primary : isCurrentWeek ? theme.primary : theme.lightPrimary,
                      borderWidth: isCurrentWeek ? 2 : 1,
                      ...(Platform.OS === 'web' ? {} : {
                        shadowColor: isSelected ? theme.primary : '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: isSelected ? 0.3 : 0.1,
                        shadowRadius: 4,
                        elevation: isSelected ? 6 : 2,
                      }),
                    }
                  ]}
                  onPress={() => setSelectedWeek(week)}
                >
                  {isCurrentWeek && !isSelected && (
                    <View style={styles.currentWeekIndicator}>
                      <Ionicons name="radio-button-on" size={8} color={theme.primary} />
                    </View>
                  )}
                  <Text style={[
                    styles.weekButtonText,
                    { 
                      color: isSelected ? theme.white : isCurrentWeek ? theme.primary : theme.darkText,
                      fontWeight: isCurrentWeek ? '700' : '600',
                      fontSize: Platform.OS === 'web' ? 16 : 15,
                    }
                  ]}>
                    {week}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          
          {/* Right fade indicator */}
          <View style={[styles.scrollFade, styles.scrollFadeRight]} pointerEvents="none" />
        </View>
        
        {/* Scroll hint */}
        <View style={styles.scrollHint}>
          <Ionicons name="chevron-back" size={16} color={theme.placeholder} />
          <Text style={[styles.scrollHintText, { color: theme.placeholder }]}>
            Swipe to browse weeks
          </Text>
          <Ionicons name="chevron-forward" size={16} color={theme.placeholder} />
        </View>
        
        {/* Week Range Indicator */}
        <View style={styles.weekRangeContainer}>
          <View style={styles.weekRangeBar}>
            <View style={[styles.weekRangeFill, { 
              width: `${(currentWeek / 40) * 100}%`,
              backgroundColor: theme.primary 
            }]} />
          </View>
          <Text style={[styles.weekRangeText, { color: theme.textSecondary }]}>
            {currentWeek} / 40 weeks
          </Text>
        </View>
      </View>
    );
  };

  const getBabySizeVisual = (week) => {
    const weekNum = parseInt(week);
    
    // Early weeks (1-12): Use fruit/vegetable comparisons with emojis
    const earlyWeekComparisons = {
      1: { size: 8, label: 'Poppy Seed', emoji: '🌱', useImage: false },
      2: { size: 10, label: 'Sesame Seed', emoji: '🌱', useImage: false },
      3: { size: 12, label: 'Poppy Seed', emoji: '🌱', useImage: false },
      4: { size: 15, label: 'Poppy Seed', emoji: '🌱', useImage: false },
      5: { size: 20, label: 'Apple Seed', emoji: '🍎', useImage: false },
      6: { size: 25, label: 'Sweet Pea', emoji: '🫛', useImage: false },
      7: { size: 30, label: 'Blueberry', emoji: '🫐', useImage: false },
      8: { size: 40, label: 'Kidney Bean', emoji: '🫘', useImage: false },
      9: { size: 50, label: 'Grape', emoji: '🍇', useImage: false },
      10: { size: 60, label: 'Kumquat', emoji: '🍊', useImage: false },
      11: { size: 70, label: 'Fig', emoji: '🫒', useImage: false },
      12: { size: 80, label: 'Lime', emoji: '🍋', useImage: false },
    };
    
    // Later weeks (13-40): Use actual baby images
    // Baby development images - using a reliable source URL pattern
    // You can replace these URLs with your own baby development images
    const getBabyImageUrl = (week) => {
      // Baby development image URLs
      // Replace these with your actual baby development images
      // Suggested: Store images in assets folder or use a CDN
      // Format: week_13.png, week_14.png, etc. or use a URL pattern
      
      // Option 1: Use local assets (recommended for production)
      // Uncomment and adjust path when you have images:
      // try {
      //   return require(`../assets/baby_images/week_${week}.png`);
      // } catch {
      //   return null;
      // }
      
      // Option 2: Use a CDN or image service
      // For now, return null to use React Native component-based visualization
      // In production, replace with actual baby development ultrasound/fetal images
      // Example: return `https://your-cdn.com/baby-images/week-${week}.jpg`;
      
      return null; // Will use component-based visualization
    };
    
    // Size data for all weeks (in mm)
    // These are approximate fetal sizes based on medical standards
    const sizeData = {
      13: { size: 90, length: '7.4cm' },
      14: { size: 100, length: '8.7cm' },
      15: { size: 110, length: '10.1cm' },
      16: { size: 120, length: '11.6cm' },
      17: { size: 130, length: '13.0cm' },
      18: { size: 140, length: '14.2cm' },
      19: { size: 150, length: '15.3cm' },
      20: { size: 160, length: '16.4cm' },
      21: { size: 170, length: '17.5cm' },
      22: { size: 180, length: '19.0cm' },
      23: { size: 190, length: '20.3cm' },
      24: { size: 200, length: '21.0cm' },
      25: { size: 220, length: '22.0cm' },
      26: { size: 230, length: '23.0cm' },
      27: { size: 240, length: '24.0cm' },
      28: { size: 250, length: '25.0cm' },
      29: { size: 260, length: '26.0cm' },
      30: { size: 270, length: '27.0cm' },
      31: { size: 280, length: '28.0cm' },
      32: { size: 290, length: '29.0cm' },
      33: { size: 300, length: '30.0cm' },
      34: { size: 310, length: '31.0cm' },
      35: { size: 320, length: '32.0cm' },
      36: { size: 330, length: '33.0cm' },
      37: { size: 340, length: '34.0cm' },
      38: { size: 350, length: '35.0cm' },
      39: { size: 360, length: '36.0cm' },
      40: { size: 370, length: '37.0cm' },
    };
    
    if (weekNum <= 12) {
      return earlyWeekComparisons[weekNum] || { size: 50, label: 'Baby', emoji: '👶', useImage: false };
    } else {
      const data = sizeData[weekNum] || { size: 200, length: '20.0cm' };
      return {
        ...data,
        useImage: true,
        imageUrl: getBabyImageUrl(weekNum),
        // Use the length from sizeData
        sizeCm: data.length || (data.size / 10).toFixed(1) + 'cm',
      };
    }
  };

  // Baby Image Component with error handling
  const BabyImageDisplay = ({ visual, week, theme }) => {
    const [imageError, setImageError] = React.useState(false);
    const weekNum = parseInt(week);
    
    // For weeks 13-40, show baby visualization
    if (visual.useImage) {
      // Try to load actual image if URL is provided
      if (visual.imageUrl && !imageError) {
        return (
          <View style={styles.babyImageContainer}>
            <Image
              source={{ uri: visual.imageUrl }}
              style={styles.babyImage}
              resizeMode="contain"
              onError={(error) => {
                console.log('Image load error:', error);
                setImageError(true);
              }}
            />
            <View style={styles.babyImageOverlay}>
              <Text style={[styles.babySizeLabel, { color: theme.primary }]}>
                Week {week}
              </Text>
              <Text style={[styles.babySizeText, { color: theme.text }]}>
                {visual.sizeCm}
              </Text>
            </View>
          </View>
        );
      }
      
      // Component-based baby visualization (when no image URL or image failed)
      // Size increases with week progression
      const babySize = Math.min(60 + (weekNum - 13) * 2, 120); // Scales from 60 to 120
      const outerSize = Math.min(80 + (weekNum - 13) * 2.5, 140); // Scales from 80 to 140
      
      return (
        <View style={styles.babyVisualizationContainer}>
          {/* Outer circle representing growth */}
          <View style={[
            styles.babyVisualizationOuter,
            {
              width: outerSize,
              height: outerSize,
              borderRadius: outerSize / 2,
              backgroundColor: theme.primary + '20',
            }
          ]} />
          
          {/* Inner circle representing baby */}
          <View style={[
            styles.babyVisualizationInner,
            {
              width: babySize,
              height: babySize,
              borderRadius: babySize / 2,
              backgroundColor: theme.primary + '40',
            }
          ]}>
            <Text style={styles.babyVisualizationEmoji}>
              👶
            </Text>
          </View>
          
          {/* Overlay with info */}
          <View style={styles.babyImageOverlay}>
            <Text style={[styles.babySizeLabel, { color: theme.primary }]}>
              Week {week}
            </Text>
            <Text style={[styles.babySizeText, { color: theme.text }]}>
              {visual.sizeCm}
            </Text>
          </View>
        </View>
      );
    }
    
    // For weeks 1-12, show emoji comparison
    return (
      <>
        <Text style={styles.babySizeEmoji}>
          {visual.emoji || '👶'}
        </Text>
        <Text style={[styles.babySizeLabel, { color: theme.primary }]}>
          {visual.label}
        </Text>
        <Text style={[styles.babySizeText, { color: theme.text }]}>
          {visual.size}mm
        </Text>
      </>
    );
  };

  const renderBabySizeVisualizer = (week) => {
    const visual = getBabySizeVisual(week);
    const maxSize = 370; // Maximum size at week 40
    const sizePercentage = (visual.size / maxSize) * 100;
    
    return (
      <View style={styles.babyVisualizerContainer}>
        <Text style={[styles.babyVisualizerTitle, { color: theme.darkText }]}>
          Baby Size Visualizer
        </Text>
        <View style={styles.babyVisualizerContent}>
          <View style={styles.babySizeCircle}>
            <BabyImageDisplay visual={visual} week={week} theme={theme} />
          </View>
          
          <View style={styles.sizeComparisonBar}>
            <View style={[styles.sizeBarFill, { 
              width: `${sizePercentage}%`,
              backgroundColor: theme.primary 
            }]} />
          </View>
          <Text style={[styles.sizeComparisonText, { color: theme.textSecondary }]}>
            Week {week} of 40 • {visual.useImage ? visual.sizeCm : `${(visual.size / 10).toFixed(1)}cm`}
          </Text>
        </View>
      </View>
    );
  };

  const renderWeekDetails = () => {
    if (!pregnancyWeekData || !selectedWeek) return null;

    const weekData = pregnancyWeekData.weeks[selectedWeek];
    if (!weekData) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.white }]}>
        <View style={styles.weekHeader}>
          <Text style={[styles.weekTitle, { color: theme.darkText }]}>
            Week {weekData.week}: {weekData.title}
          </Text>
          <TouchableOpacity
            style={styles.milestoneButton}
            onPress={() => handleMilestoneReached(weekData.title)}
          >
            <Ionicons name="trophy-outline" size={20} color={theme.success} />
            <Text style={[styles.milestoneButtonText, { color: theme.success }]}>
              Mark Milestone
            </Text>
          </TouchableOpacity>
        </View>

        {/* Baby Size Visualizer */}
        {renderBabySizeVisualizer(selectedWeek)}

        <View style={styles.babyInfo}>
          <Text style={[styles.babyInfoTitle, { color: theme.text }]}>Baby Development</Text>
          <Text style={[styles.babyInfoText, { color: theme.text }]}>
            {weekData.baby_development}
          </Text>
          <View style={styles.babyStats}>
            <Text style={[styles.babyStat, { color: theme.primary }]}>
              Size: {weekData.baby_size}
            </Text>
            <Text style={[styles.babyStat, { color: theme.primary }]}>
              Weight: {weekData.baby_weight}
            </Text>
          </View>
        </View>

        <View style={styles.milestonesSection}>
          <Text style={[styles.milestonesTitle, { color: theme.text }]}>Key Milestones</Text>
          {weekData.milestones.map((milestone, index) => (
            <View key={index} style={styles.milestoneItem}>
              <Ionicons name="checkmark-circle" size={16} color={theme.success} />
              <Text style={[styles.milestoneText, { color: theme.text }]}>{milestone}</Text>
            </View>
          ))}
        </View>

        <View style={styles.tipsSection}>
          <Text style={[styles.tipsTitle, { color: theme.text }]}>Tips for This Week</Text>
          {weekData.tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons name="bulb-outline" size={16} color={theme.warning} />
              <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
            </View>
          ))}
        </View>

        <View style={styles.healthFocusSection}>
          <Text style={[styles.healthFocusTitle, { color: theme.text }]}>Health Focus</Text>
          {weekData.health_focus.map((focus, index) => (
            <View key={index} style={styles.healthFocusItem}>
              <Ionicons name="heart-outline" size={16} color={theme.error} />
              <Text style={[styles.healthFocusText, { color: theme.text }]}>{focus}</Text>
            </View>
          ))}
        </View>

        {weekData.risk_factors && weekData.risk_factors.length > 0 && (
          <View style={styles.riskSection}>
            <Text style={[styles.riskTitle, { color: theme.error }]}>Risk Factors to Watch</Text>
            {weekData.risk_factors.map((risk, index) => (
              <View key={index} style={styles.riskItem}>
                <Ionicons name="warning-outline" size={16} color={theme.error} />
                <Text style={[styles.riskText, { color: theme.text }]}>{risk}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderGamification = () => {
    if (!gamificationData) return null;

    return (
      <View style={[styles.section, { backgroundColor: theme.white }]}>
        <View style={styles.gamificationHeader}>
          <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
            Your Progress
          </Text>
          <TouchableOpacity
            style={styles.gamificationToggle}
            onPress={() => setShowGamification(!showGamification)}
          >
            <Ionicons 
              name={showGamification ? "chevron-up" : "chevron-down"} 
              size={24} 
              color={theme.primary} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.progressSummary}>
          <View style={styles.progressItem}>
            <Text style={[styles.progressNumber, { color: theme.primary }]}>
              {gamificationData.level}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.text }]}>Level</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressNumber, { color: theme.success }]}>
              {gamificationData.totalPoints}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.text }]}>Points</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressNumber, { color: theme.warning }]}>
              {gamificationData.badgesCount}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.text }]}>Badges</Text>
          </View>
          <View style={styles.progressItem}>
            <Text style={[styles.progressNumber, { color: theme.info }]}>
              {gamificationData.streak}
            </Text>
            <Text style={[styles.progressLabel, { color: theme.text }]}>Streak</Text>
          </View>
        </View>

        {showGamification && (
          <View style={styles.gamificationDetails}>
            <Text style={[styles.gamificationSubtitle, { color: theme.text }]}>
              Next Level: {gamificationData.nextLevelPoints} points needed
            </Text>
            
            <TouchableOpacity
              style={[styles.checkinButton, { backgroundColor: theme.success }]}
              onPress={handleWeeklyCheckin}
            >
              <Ionicons name="checkmark-circle" size={20} color={theme.white} />
              <Text style={styles.checkinButtonText}>Complete Weekly Check-in</Text>
            </TouchableOpacity>

            {gamificationData.recentAchievements && gamificationData.recentAchievements.length > 0 && (
              <View style={styles.achievementsSection}>
                <Text style={[styles.achievementsTitle, { color: theme.text }]}>
                  Recent Achievements
                </Text>
                {gamificationData.recentAchievements.map((achievement, index) => (
                  <View key={index} style={styles.achievementItem}>
                    <Ionicons name="star" size={16} color={theme.warning} />
                    <Text style={[styles.achievementText, { color: theme.text }]}>
                      {achievement.reason} (+{achievement.points} pts)
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  if (timelineLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>
            Loading your pregnancy timeline...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (timelineError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={64} color={theme.error} />
          <Text style={[styles.errorTitle, { color: theme.darkText }]}>
            Unable to Load Timeline
          </Text>
          <Text style={[styles.errorText, { color: theme.text }]}>
            {timelineError}
          </Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.primary }]}
            onPress={loadTimelineData}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderFirecrackers = () => {
    if (!showFirecrackers) return null;

    return (
      <Modal
        visible={showFirecrackers}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowFirecrackers(false)}
      >
        <View style={styles.firecrackerContainer}>
          <View style={styles.firecrackerMessageContainer}>
            <Text style={styles.firecrackerMessage}>{firecrackerMessage}</Text>
          </View>
          {firecrackerAnimations.map((anim, index) => {
            const rotate = anim.rotation.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '360deg'],
            });

            return (
              <Animated.View
                key={index}
                style={[
                  styles.firecracker,
                  {
                    transform: [
                      { translateX: anim.translateX },
                      { translateY: anim.translateY },
                      { scale: anim.scale },
                      { rotate },
                    ],
                    opacity: anim.opacity,
                  },
                ]}
              >
                <Text style={styles.firecrackerEmoji}>🎆</Text>
              </Animated.View>
            );
          })}
        </View>
      </Modal>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={Platform.OS === 'web' ? 24 : 22} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.title, { color: theme.darkText }]}>
              Pregnancy Timeline
            </Text>
          </View>

          {/* Progress Bar */}
          {renderProgressBar()}

          {/* Gamification Section */}
          {renderGamification()}

          {/* Health Charts */}
          {renderHealthCharts()}

          {/* Week Selector */}
          {renderWeekSelector()}

          {/* Week Details */}
          {renderWeekDetails()}
        </View>
      </ScrollView>
      
      {/* Firecrackers Animation */}
      {renderFirecrackers()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  title: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: 'bold',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.3,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: Platform.OS === 'web' ? 18 : 17,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 15 : 14,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  progressSection: {
    marginBottom: 20,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  progressContainer: {
    marginBottom: 10,
  },
  progressBar: {
    height: 8,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  dueDateText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    textAlign: 'center',
    marginTop: Platform.OS === 'web' ? 4 : 6,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  chartCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: Platform.OS === 'web' ? 16 : 14,
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  chartHeader: {
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  chartLabel: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 10 : 8,
    color: '#1E1E1E',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  chartLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 8 : 6,
    marginHorizontal: Platform.OS === 'web' ? 0 : -6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Platform.OS === 'web' ? 8 : 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: Platform.OS === 'web' ? 13 : 12,
    fontWeight: '500',
  },
  chart: {
    marginVertical: Platform.OS === 'web' ? 8 : 6,
    borderRadius: 16,
  },
  chartStats: {
    marginTop: Platform.OS === 'web' ? 8 : 6,
    alignItems: 'center',
  },
  chartStatText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
  },
  emptyChartContainer: {
    alignItems: 'center',
    paddingVertical: Platform.OS === 'web' ? 40 : 32,
    paddingHorizontal: 20,
  },
  weekSelectorContainer: {
    position: 'relative',
    marginBottom: Platform.OS === 'web' ? 15 : 12,
  },
  weekSelector: {
    marginHorizontal: Platform.OS === 'web' ? 0 : -16,
    paddingHorizontal: Platform.OS === 'web' ? 0 : 16,
  },
  scrollFade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    zIndex: 1,
    pointerEvents: 'none',
  },
  scrollFadeLeft: {
    left: 0,
    background: Platform.OS === 'web' 
      ? 'linear-gradient(to right, rgba(255,255,255,1), rgba(255,255,255,0))'
      : undefined,
    backgroundColor: Platform.OS === 'web' ? undefined : 'rgba(255,255,255,0.9)',
  },
  scrollFadeRight: {
    right: 0,
    background: Platform.OS === 'web'
      ? 'linear-gradient(to left, rgba(255,255,255,1), rgba(255,255,255,0))'
      : undefined,
    backgroundColor: Platform.OS === 'web' ? undefined : 'rgba(255,255,255,0.9)',
  },
  scrollHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Platform.OS === 'web' ? 8 : 6,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
  },
  scrollHintText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontStyle: 'italic',
  },
  weekButton: {
    width: Platform.OS === 'web' ? 50 : 52,
    height: Platform.OS === 'web' ? 50 : 52,
    borderRadius: Platform.OS === 'web' ? 25 : 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Platform.OS === 'web' ? 12 : 10,
    borderWidth: 2,
    minWidth: Platform.OS === 'web' ? 50 : 52,
  },
  weekButtonText: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  weekTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
  },
  milestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: themeColors.lightBackground,
  },
  milestoneButtonText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  babyInfo: {
    marginBottom: 20,
  },
  babyInfoTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 8 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  babyInfoText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    lineHeight: Platform.OS === 'web' ? 20 : 19,
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  babyStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  babyStat: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  milestonesSection: {
    marginBottom: 20,
  },
  milestonesTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  milestoneText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    flex: 1,
    lineHeight: Platform.OS === 'web' ? 20 : 19,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  tipsSection: {
    marginBottom: 20,
  },
  tipsTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tipText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    flex: 1,
    lineHeight: Platform.OS === 'web' ? 20 : 19,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  healthFocusSection: {
    marginBottom: 20,
  },
  healthFocusTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  healthFocusItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  healthFocusText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    flex: 1,
    lineHeight: Platform.OS === 'web' ? 20 : 19,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  riskSection: {
    marginBottom: 20,
  },
  riskTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  riskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  riskText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    flex: 1,
    lineHeight: Platform.OS === 'web' ? 20 : 19,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  gamificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  gamificationToggle: {
    padding: 4,
  },
  progressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  progressItem: {
    alignItems: 'center',
  },
  progressNumber: {
    fontSize: Platform.OS === 'web' ? 24 : 22,
    fontWeight: 'bold',
    marginBottom: Platform.OS === 'web' ? 4 : 6,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  progressLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  gamificationDetails: {
    borderTopWidth: 1,
    borderTopColor: themeColors.lightBackground,
    paddingTop: 15,
  },
  gamificationSubtitle: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    textAlign: 'center',
    marginBottom: Platform.OS === 'web' ? 15 : 12,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  checkinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    borderRadius: 8,
    marginBottom: Platform.OS === 'web' ? 15 : 12,
    minHeight: Platform.OS === 'web' ? undefined : 48,
  },
  checkinButtonText: {
    color: themeColors.white,
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.2,
  },
  achievementsSection: {
    marginTop: 15,
  },
  achievementsTitle: {
    fontSize: Platform.OS === 'web' ? 16 : 15,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 12 : 10,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  achievementText: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    marginLeft: Platform.OS === 'web' ? 8 : 10,
    flex: 1,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: Platform.OS === 'web' ? 16 : 14,
    fontStyle: 'italic',
    padding: Platform.OS === 'web' ? 20 : 16,
    lineHeight: Platform.OS === 'web' ? 24 : 20,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  babyVisualizerContainer: {
    marginBottom: 24,
    padding: 20,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: themeColors.lightPrimary,
  },
  babyVisualizerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  babyVisualizerContent: {
    alignItems: 'center',
  },
  babySizeCircle: {
    width: Platform.OS === 'web' ? 140 : 160,
    height: Platform.OS === 'web' ? 140 : 160,
    borderRadius: Platform.OS === 'web' ? 70 : 80,
    backgroundColor: themeColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'web' ? 16 : 14,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
    } : {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    }),
    borderWidth: 3,
    borderColor: themeColors.lightPrimary,
    overflow: 'hidden',
  },
  babyImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyImage: {
    width: '100%',
    height: '100%',
    borderRadius: Platform.OS === 'web' ? 70 : 80,
  },
  babyVisualizationContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyVisualizationOuter: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  babyVisualizationInner: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(122, 127, 252, 0.3)',
    } : {
      shadowColor: '#7A7FFC',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    }),
  },
  babyVisualizationEmoji: {
    fontSize: Platform.OS === 'web' ? 40 : 36,
  },
  babyImageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    paddingHorizontal: Platform.OS === 'web' ? 8 : 10,
    borderBottomLeftRadius: Platform.OS === 'web' ? 70 : 80,
    borderBottomRightRadius: Platform.OS === 'web' ? 70 : 80,
    alignItems: 'center',
  },
  sizeComparisonInfo: {
    marginBottom: Platform.OS === 'web' ? 8 : 6,
    paddingHorizontal: Platform.OS === 'web' ? 12 : 10,
    paddingVertical: Platform.OS === 'web' ? 6 : 8,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 8,
  },
  sizeComparisonLabel: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  babySizeEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  babySizeLabel: {
    fontSize: Platform.OS === 'web' ? 14 : 13,
    fontWeight: '600',
    marginBottom: Platform.OS === 'web' ? 4 : 6,
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  babySizeText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    fontWeight: '500',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  sizeComparisonBar: {
    width: '100%',
    height: 8,
    backgroundColor: themeColors.lightPrimary,
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  sizeBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  sizeComparisonText: {
    fontSize: 12,
    textAlign: 'center',
  },
  weekSelectorContent: {
    paddingRight: Platform.OS === 'web' ? 16 : 20,
    paddingLeft: Platform.OS === 'web' ? 0 : 4,
    alignItems: 'center',
  },
  currentWeekIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  weekRangeContainer: {
    marginTop: 16,
  },
  weekRangeBar: {
    width: '100%',
    height: 6,
    backgroundColor: themeColors.lightPrimary,
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  weekRangeFill: {
    height: '100%',
    borderRadius: 3,
  },
  weekRangeText: {
    fontSize: Platform.OS === 'web' ? 12 : 11,
    textAlign: 'center',
    fontWeight: '600',
    letterSpacing: Platform.OS === 'web' ? undefined : 0.1,
  },
  firecrackerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  firecrackerMessageContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 20,
    padding: Platform.OS === 'web' ? 24 : 20,
    marginBottom: 40,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 8px 24px rgba(0, 0, 0, 0.3)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  firecrackerMessage: {
    fontSize: Platform.OS === 'web' ? 20 : 18,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#1E1E1E',
    lineHeight: Platform.OS === 'web' ? 28 : 24,
  },
  firecracker: {
    position: 'absolute',
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  firecrackerEmoji: {
    fontSize: 32,
  },
});
