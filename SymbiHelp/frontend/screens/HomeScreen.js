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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
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
      <LinearGradient
        colors={[theme.primary, isDarkMode ? '#4c4fdb' : '#9aa0ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroHeaderRow}>
          <View style={styles.userSection}>
            <Ionicons name="person-circle-outline" size={34} color={theme.white} />
            <View>
              <Text style={[styles.heroHello, { color: theme.white }]}>Hello</Text>
              <Text style={[styles.heroName, { color: theme.white }]}>{welcomeName}</Text>
            </View>
          </View>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}); toggleTheme(); }}
            >
              <Ionicons
                name={isDarkMode ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.white}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}); handleSignOut(); }}
            >
              <Ionicons name="log-out-outline" size={22} color={theme.white} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.quickRow}>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}); navigation.navigate('Predict'); }}
          >
            <Ionicons name="pulse" size={22} color={theme.primary} />
            <Text style={styles.quickText}>Predict</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}); navigation.navigate('CommunityForum'); }}
          >
            <Ionicons name="people" size={22} color={theme.primary} />
            <Text style={styles.quickText}>Community</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            activeOpacity={0.85}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(()=>{}); navigation.navigate('ProgressTab'); }}
          >
            <Ionicons name="bar-chart" size={22} color={theme.primary} />
            <Text style={styles.quickText}>Progress</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
  hero: {
    paddingTop: 22,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroHeaderRow: {
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
  heroHello: { fontSize: 12, opacity: 0.9, marginLeft: 10 },
  heroName: { fontSize: 20, fontWeight: '700', marginLeft: 10 },
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
  quickRow: {
    flexDirection: 'row',
    marginTop: 14,
  },
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginRight: 10,
  },
  quickText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#2A2A2A',
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