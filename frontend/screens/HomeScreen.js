import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { 
  ResponsiveText, 
  ResponsiveButton, 
  ResponsiveCard, 
  ResponsiveHeader,
  ResponsiveSpacing 
} from '../utils/ResponsiveComponents';

const { width, height } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const { userInfo, signOut } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  // Techniques data with modern healthcare colors
  const techniques = [
    {
      id: 'lamaze',
      name: 'Lamaze Breathing',
      icon: 'leaf-outline',
      screen: 'LamazeBreathing',
      description: 'Master breathing techniques for labor',
      color: theme.primary,
      bgColor: theme.accentLight,
    },
    {
      id: 'ball',
      name: 'Ball Birthing',
      icon: 'basketball-outline',
      screen: 'BallBirthing',
      description: 'Use birthing ball exercises for comfort',
      color: '#FF6B6B',
      bgColor: '#FFE5E5',
    },
    {
      id: 'yoga',
      name: 'Yoga Birthing',
      icon: 'body-outline',
      screen: 'YogaBirthing',
      description: 'Practice pregnancy-safe yoga poses',
      color: '#10B981',
      bgColor: '#D1FAE5',
    },
    {
      id: 'shiatsu',
      name: 'Shiatsu',
      icon: 'hand-left-outline',
      screen: 'Shiatsu',
      description: 'Learn pressure point techniques',
      color: '#F59E0B',
      bgColor: '#FEF3C7',
    },
    {
      id: 'test',
      name: 'Assessment Test',
      icon: 'help-circle-outline',
      screen: 'Test',
      description: 'Take a test to assess your knowledge',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
    },
    {
      id: 'predict',
      name: 'Risk Prediction',
      icon: 'analytics-outline',
      screen: 'Predict',
      description: 'Predict potential health risks',
      color: '#3B82F6',
      bgColor: '#DBEAFE',
    },
  ];

  // Add Patient Tracking for nurses
  if (userInfo?.role === 'nurse') {
    techniques.push({
      id: 'patient-tracking',
      name: 'Patient Tracking',
      icon: 'people-outline',
      screen: 'PatientTracking',
      description: 'Assign and track mothers',
      color: '#EF4444',
      bgColor: '#FEE2E2',
    });
  }

  // Add ChatBot for non-nurse users only (nurses get floating button)
  if (userInfo?.role !== 'nurse') {
    techniques.push({
      id: 'chatbot',
      name: 'AI Assistant',
      icon: 'chatbubble-outline',
      screen: 'ChatBot',
      description: 'Get instant help and answers',
      color: '#06B6D4',
      bgColor: '#CFFAFE',
    });
  }

  // Add Community Forum for mothers and nurses
  if (userInfo?.role === 'mother' || userInfo?.role === 'nurse' || userInfo?.is_admin) {
    techniques.push({
      id: 'forum',
      name: 'Community Forum',
      icon: 'people-circle-outline',
      screen: 'Forum',
      description: 'Ask questions and share experiences',
      color: '#10B981',
      bgColor: '#D1FAE5',
    });
  }

  const renderTechniqueCard = (item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.cardWrapper}
      onPress={() => navigation.navigate(item.screen)}
      activeOpacity={0.7}
    >
      <ResponsiveCard 
        style={[styles.techniqueCard, { backgroundColor: item.bgColor }]}
        variant="elevated"
      >
        <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
          <Ionicons name={item.icon} size={20} color="#FFFFFF" />
        </View>
        <ResponsiveText size="lg" weight="semibold" style={styles.cardTitle}>
          {item.name}
        </ResponsiveText>
        <ResponsiveText size="sm" color={theme.textSecondary} style={styles.cardDescription}>
          {item.description}
        </ResponsiveText>
      </ResponsiveCard>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.safeArea}>
        {Platform.OS !== 'web' && <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} backgroundColor={theme.background} />}
        
        {/* Modern Header */}
        <View style={[styles.header, { backgroundColor: theme.surface }]}>
          <View style={styles.headerContent}>
            <View style={[styles.profileIcon, { backgroundColor: theme.primary }]}>
              <Ionicons name="person" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.welcomeSection}>
              <ResponsiveText size="sm" color={theme.textSecondary}>
                Welcome back,
              </ResponsiveText>
              <ResponsiveText size="xl" weight="bold" color={theme.text}>
                {userInfo?.full_name?.split(' ')[0] || userInfo?.email?.split('@')[0] || 'User'}
              </ResponsiveText>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={20}
                color={theme.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.backgroundSecondary }]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Content */}
        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={userInfo?.role === 'nurse' ? styles.scrollContentWithBottomBar : undefined}
        >
          <View style={styles.contentContainer}>
            {/* Search Section - Only show for non-nurse users */}
            {userInfo?.role !== 'nurse' && (
              <ResponsiveCard style={styles.searchCard} variant="elevated">
                <View style={styles.searchContent}>
                  <View style={styles.searchTextContainer}>
                    <ResponsiveText size="lg" weight="semibold" color={theme.text}>
                      Looking for desired doctor?
                    </ResponsiveText>
                    <ResponsiveText size="sm" color={theme.textSecondary} style={{ marginTop: 4 }}>
                      Find the best healthcare professionals
                    </ResponsiveText>
                  </View>
                  <ResponsiveButton
                    variant="primary"
                    size="medium"
                    onPress={() => navigation.navigate('Predict')}
                    style={styles.searchButton}
                  >
                    Search for
                  </ResponsiveButton>
                </View>
              </ResponsiveCard>
            )}

            {/* Section Header */}
            <View style={styles.sectionHeader}>
              <ResponsiveText size="2xl" weight="bold" color={theme.text}>
                {userInfo?.role === 'nurse' ? 'Nurse Dashboard' : 'Find your doctor'}
              </ResponsiveText>
              <ResponsiveText size="sm" color={theme.textSecondary} style={{ marginTop: 4 }}>
                {userInfo?.role === 'nurse' 
                  ? 'Manage your assigned mothers and track their health' 
                  : 'Explore various techniques and tools'
                }
              </ResponsiveText>
            </View>

            {/* Techniques Grid */}
            <View style={styles.grid}>
              {techniques.map(renderTechniqueCard)}
            </View>

            {/* Quick Actions - Only show in scroll for non-nurse users */}
            {userInfo?.role !== 'nurse' && (
              <View style={styles.quickActionsSection}>
                <ResponsiveText size="lg" weight="semibold" color={theme.text} style={styles.sectionTitle}>
                  Quick Actions
                </ResponsiveText>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity 
                    style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
                    onPress={() => navigation.navigate('Profile')}
                  >
                    <Ionicons name="person-outline" size={24} color={theme.primary} />
                    <ResponsiveText size="sm" weight="medium" color={theme.text} style={{ marginTop: 8 }}>
                      Profile
                    </ResponsiveText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
                    onPress={() => navigation.navigate('Progress')}
                  >
                    <Ionicons name="trending-up-outline" size={24} color={theme.primary} />
                    <ResponsiveText size="sm" weight="medium" color={theme.text} style={{ marginTop: 8 }}>
                      Progress
                    </ResponsiveText>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.quickActionCard, { backgroundColor: theme.surface }]}
                    onPress={() => navigation.navigate('AppointmentScheduling')}
                  >
                    <Ionicons name="calendar-outline" size={24} color={theme.primary} />
                    <ResponsiveText size="sm" weight="medium" color={theme.text} style={{ marginTop: 8 }}>
                      Appointments
                    </ResponsiveText>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Fixed Quick Actions Bar at Bottom - Only for nurses */}
        {userInfo?.role === 'nurse' && (
          <View style={[styles.fixedQuickActions, { backgroundColor: theme.surface, borderTopColor: '#E5E7EB' }]}>
            <TouchableOpacity 
              style={[styles.fixedQuickActionButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Predict')}
              activeOpacity={0.7}
            >
              <Ionicons name="analytics-outline" size={22} color="#FFFFFF" />
              <ResponsiveText size="xs" weight="semibold" color="#FFFFFF" style={styles.fixedQuickActionText}>
                Risk Prediction
              </ResponsiveText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.fixedQuickActionButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Profile')}
              activeOpacity={0.7}
            >
              <Ionicons name="person-outline" size={22} color="#FFFFFF" />
              <ResponsiveText size="xs" weight="semibold" color="#FFFFFF" style={styles.fixedQuickActionText}>
                Profile
              </ResponsiveText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.fixedQuickActionButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('AppointmentScheduling')}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
              <ResponsiveText size="xs" weight="semibold" color="#FFFFFF" style={styles.fixedQuickActionText}>
                Appointments
              </ResponsiveText>
            </TouchableOpacity>
          </View>
        )}

        {/* Floating AI Assistant Button - Only for nurses */}
        {userInfo?.role === 'nurse' && (
          <TouchableOpacity
            style={[styles.floatingChatButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('ChatBot')}
            activeOpacity={0.8}
          >
            <Ionicons name="chatbubble-ellipses" size={28} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  welcomeSection: {
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  scrollContentWithBottomBar: {
    paddingBottom: 100, // Extra padding for fixed Quick Actions bar
  },
  searchCard: {
    marginTop: 20,
    marginBottom: 24,
  },
  searchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchTextContainer: {
    flex: 1,
  },
  searchButton: {
    marginLeft: 16,
  },
  sectionHeader: {
    marginBottom: 20,
    marginTop: 8,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 32,
  },
  cardWrapper: {
    width: '50%',
    paddingHorizontal: 6,
    marginBottom: 20,
  },
  techniqueCard: {
    padding: 14,
    minHeight: 130,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    marginBottom: 6,
  },
  cardDescription: {
    lineHeight: 18,
    fontSize: 12,
  },
  quickActionsSection: {
    marginTop: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fixedQuickActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12, // Account for safe area on iOS
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 999, // Below floating button but above content
  },
  fixedQuickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginHorizontal: 4,
    borderRadius: 12,
    minHeight: 60,
  },
  fixedQuickActionText: {
    marginTop: 4,
    textAlign: 'center',
  },
  floatingChatButton: {
    position: 'absolute',
    bottom: 85, // Position above the Quick Actions bar (which is ~75px tall)
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1000, // Ensure it's above other elements
  },
});