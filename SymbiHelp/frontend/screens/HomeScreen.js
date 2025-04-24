import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
};

// Techniques data
const techniques = [
  {
    id: 'lamaze',
    name: 'Lamaze Breathing',
    icon: 'person-outline',
    screen: 'LamazeBreathing',
    description: 'Master breathing techniques for labor',
    color: '#FF9EAA',
  },
  {
    id: 'ball',
    name: 'Ball Birthing',
    icon: 'basketball-outline',
    screen: 'BallBirthing',
    description: 'Use birthing ball exercises for comfort',
    color: '#94B8FF',
  },
  {
    id: 'yoga',
    name: 'Yoga Birthing',
    icon: 'body-outline',
    screen: 'YogaBirthing',
    description: 'Practice pregnancy-safe yoga poses',
    color: '#98E5BE',
  },
  {
    id: 'shiatsu',
    name: 'Shiatsu',
    icon: 'hand-left-outline',
    screen: 'Shiatsu',
    description: 'Learn pressure point techniques',
    color: '#FFB992',
  },
  {
    id: 'test',
    name: 'Assessment Test',
    icon: 'help-circle-outline',
    screen: 'Test',
    description: 'Take a test to assess your knowledge',
    color: '#B292FF',
  },
  {
    id: 'predict',
    name: 'Risk Prediction',
    icon: 'analytics-outline',
    screen: 'Predict',
    description: 'Predict potential health risks',
    color: '#7A7FFC',
  },
];

export default function HomeScreen({ navigation }) {
  const { userInfo, signOut } = useAuth();
  const { theme, isDarkMode, toggleTheme } = useTheme();

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation will be handled automatically by the auth state change
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
      <View style={[styles.header, { backgroundColor: theme.headerBackground }]}>
        <View style={styles.headerRow}>
          <View style={styles.userSection}>
            <Ionicons name="person-circle-outline" size={32} color={theme.primary} />
            <Text style={[styles.welcomeText, { color: theme.darkText }]}>
              Welcome, {userInfo?.full_name?.split(' ')[0] || userInfo?.email?.split('@')[0] || 'User'}
            </Text>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.lightPrimary }]}
              onPress={toggleTheme}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: theme.lightPrimary }]}
              onPress={handleSignOut}
            >
              <Ionicons name="log-out-outline" size={22} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.contentContainer}>
          <Text style={[styles.sectionTitle, { color: theme.darkText }]}>
            Techniques
          </Text>
          <View style={styles.grid}>
            {techniques.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.cardWrapper}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.7}
              >
                <View style={[styles.card, { backgroundColor: item.color }]}>
                  <View style={styles.iconContainer}>
                    <Ionicons name={item.icon} size={28} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>
                    {item.name}
                  </Text>
                  <Text style={styles.cardDescription}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  welcomeText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
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
    padding: 16,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  cardWrapper: {
    width: '50%',
    padding: 8,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    height: 180,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.9,
    lineHeight: 18,
  },
});

