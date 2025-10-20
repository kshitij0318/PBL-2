import React, { useMemo } from 'react'; // Import useMemo
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  // Image, // <-- Removed unused import
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../utils/AuthContext';
import { useTheme } from '../utils/ThemeContext';
import { techniques } from '../constants/techniquesData'; // <-- Import data

// themeColors constant removed <-- Removed unused constant

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

  // <-- Extracted welcome message logic for clarity and performance
  const welcomeName = useMemo(() => {
    return userInfo?.full_name?.split(' ')[0] 
      || userInfo?.email?.split('@')[0] 
      || 'User';
  }, [userInfo]);

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }]}>
      <View style={[
          styles.header, 
          { 
            backgroundColor: theme.headerBackground,
            borderBottomColor: theme.lightPrimary // <-- Added explicit border color
          }
      ]}>
        <View style={styles.headerRow}>
          <View style={styles.userSection}>
            <Ionicons name="person-circle-outline" size={32} color={theme.primary} />
            <Text style={[styles.welcomeText, { color: theme.darkText }]}>
              Welcome, {welcomeName} {/* <-- Use the new variable */}
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
                // <-- Accessibility improvements
                accessibilityLabel={item.name}
                accessibilityHint={item.description}
                accessibilityRole="button"
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
    // borderBottomColor is now set dynamically inline
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  // ... rest of your styles (they are great, no changes needed)
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
});