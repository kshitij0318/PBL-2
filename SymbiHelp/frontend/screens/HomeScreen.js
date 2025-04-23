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
    id: 'breathing',
    name: 'Breathing',
    icon: 'heart-outline',
    screen: 'LamazeBreathing',
    description: 'Learn effective breathing techniques to manage contractions and stay relaxed during labor.',
    color: '#FF9EAA',
  },
  {
    id: 'movement',
    name: 'Movement',
    icon: 'body-outline',
    screen: 'BallBirthing',
    description: 'Discover comfortable positions and movements that can help ease labor pain.',
    color: '#94B8FF',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    icon: 'leaf-outline',
    screen: 'YogaBirthing',
    description: 'Practice gentle yoga poses designed specifically for labor comfort and preparation.',
    color: '#98E5BE',
  },
  {
    id: 'shiatsu',
    name: 'Shiatsu',
    icon: 'hand-left-outline',
    screen: 'Shiatsu',
    description: 'Learn pressure point techniques for pain relief and relaxation during labor.',
    color: '#FFB992',
  },
  {
    id: 'predict',
    name: 'Health Risk Prediction',
    icon: 'analytics-outline',
    screen: 'Predict',
    description: 'Get a personalized health risk assessment based on your current health metrics.',
    color: '#7A7FFC',
  },
  {
    id: 'test',
    name: 'Assessment Test',
    icon: 'checkmark-circle-outline',
    screen: 'Test',
    description: 'Take an assessment to track your understanding and progress through the techniques.',
    color: '#B292FF',
  },
];

export default function HomeScreen({ navigation }) {
  const { userInfo, signOut } = useAuth();

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
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.header}>
          <View style={styles.profileSection}>
            <View style={styles.profileInfo}>
              <View style={styles.profileImageContainer}>
                {userInfo?.picture ? (
                  <Image 
                    source={{ uri: userInfo.picture }} 
                    style={styles.profileImage} 
                  />
                ) : (
                  <View style={styles.profileImagePlaceholder}>
                    <Text style={styles.profileImageText}>
                      {userInfo?.name ? userInfo.name.charAt(0).toUpperCase() : 'U'}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.profileTextContainer}>
                <Text style={styles.welcomeText}>Welcome back,</Text>
                <Text style={styles.userNameText}>
                  {userInfo?.name || 'User'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.mainContent}>
          <View style={styles.headerSection}>
            <Text style={styles.sectionTitle}>Labor Comfort Techniques</Text>
            <Text style={styles.sectionDescription}>
              Explore these evidence-based techniques to help manage labor pain and enhance your birthing experience.
            </Text>
          </View>

          <View style={styles.techniquesGrid}>
            {techniques.map((technique) => (
              <TouchableOpacity
                key={technique.id}
                style={styles.techniqueCard}
                onPress={() => navigation.navigate(technique.screen)}
                activeOpacity={0.8}
              >
                <View style={[styles.cardContent, { backgroundColor: technique.color }]}>
                  <View style={styles.techniqueIconContainer}>
                    <Ionicons 
                      name={technique.icon} 
                      size={32} 
                      color={themeColors.white} 
                    />
                  </View>
                  <Text style={styles.techniqueName}>
                    {technique.name}
                  </Text>
                  <Text style={styles.techniqueDescription}>
                    {technique.description}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.signOutButton}
            onPress={handleSignOut}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={themeColors.white} />
            <Text style={styles.signOutButtonText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: themeColors.white,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImageContainer: {
    marginRight: 12,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  profileImagePlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: themeColors.lightPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: themeColors.primary,
  },
  profileTextContainer: {
    flex: 1,
  },
  welcomeText: {
    fontSize: 13,
    color: themeColors.placeholder,
    marginBottom: 2,
  },
  userNameText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.darkText,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 12,
  },
  headerSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: themeColors.placeholder,
    lineHeight: 20,
  },
  techniquesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    paddingBottom: 20,
  },
  techniqueCard: {
    width: '50%',
    padding: 6,
    marginBottom: 12,
  },
  cardContent: {
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    aspectRatio: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  techniqueIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 4,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
    color: themeColors.white,
    marginBottom: 6,
    textAlign: 'center',
  },
  techniqueDescription: {
    fontSize: 12,
    color: themeColors.white,
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.9,
    paddingHorizontal: 4,
  },
  signOutButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 10,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  signOutButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

