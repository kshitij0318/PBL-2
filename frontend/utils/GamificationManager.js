import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from './config';

class GamificationManager {
  constructor() {
    this.badges = {
      first_week: { name: 'First Week', description: 'Completed your first week of pregnancy tracking', icon: '🌟', points: 10 },
      weekly_checkin: { name: 'Weekly Check-in', description: 'Completed weekly health check-in', icon: '✅', points: 5 },
      milestone_reached: { name: 'Milestone Reached', description: 'Reached a pregnancy milestone', icon: '🎯', points: 15 },
      trimester_complete: { name: 'Trimester Complete', description: 'Completed a trimester', icon: '🏆', points: 25 },
      healthy_trends: { name: 'Healthy Trends', description: 'Maintained healthy trends for 4 weeks', icon: '📈', points: 20 },
      risk_awareness: { name: 'Risk Aware', description: 'Completed health risk assessment', icon: '⚠️', points: 10 },
      nutrition_expert: { name: 'Nutrition Expert', description: 'Logged nutrition data for 7 days', icon: '🥗', points: 15 },
      exercise_enthusiast: { name: 'Exercise Enthusiast', description: 'Completed exercise routine for 5 days', icon: '💪', points: 15 },
      mindfulness_master: { name: 'Mindfulness Master', description: 'Completed meditation sessions for 7 days', icon: '🧘', points: 20 },
      birth_preparation: { name: 'Birth Ready', description: 'Completed birth preparation checklist', icon: '👶', points: 30 }
    };
  }

  // Get user's gamification data
  async getUserData(userId) {
    try {
      const key = `gamification_${userId}`;
      const data = await AsyncStorage.getItem(key);
      return data ? JSON.parse(data) : this.getDefaultUserData();
    } catch (error) {
      console.error('Error getting gamification data:', error);
      return this.getDefaultUserData();
    }
  }

  // Get default user data structure
  getDefaultUserData() {
    return {
      userId: null,
      totalPoints: 0,
      level: 1,
      badges: [],
      weeklyCheckins: [],
      milestones: [],
      lastCheckin: null,
      streak: 0,
      achievements: []
    };
  }

  // Save user's gamification data
  async saveUserData(userId, data) {
    try {
      const key = `gamification_${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving gamification data:', error);
    }
  }

  // Award points to user
  async awardPoints(userId, points, reason) {
    try {
      const userData = await this.getUserData(userId);
      userData.totalPoints += points;
      
      // Calculate new level (every 100 points = 1 level)
      userData.level = Math.floor(userData.totalPoints / 100) + 1;
      
      // Add achievement
      userData.achievements.push({
        id: Date.now(),
        type: 'points',
        points: points,
        reason: reason,
        timestamp: new Date().toISOString()
      });

      await this.saveUserData(userId, userData);
      
      // Update backend
      await this.updateBackend(userId, 'points_awarded', { points, reason });
      
      return userData;
    } catch (error) {
      console.error('Error awarding points:', error);
      return null;
    }
  }

  // Award badge to user
  async awardBadge(userId, badgeKey) {
    try {
      const userData = await this.getUserData(userId);
      const badge = this.badges[badgeKey];
      
      if (!badge) {
        throw new Error(`Badge ${badgeKey} not found`);
      }

      // Check if badge already awarded
      if (userData.badges.some(b => b.key === badgeKey)) {
        return userData;
      }

      // Award badge and points
      userData.badges.push({
        key: badgeKey,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        points: badge.points,
        awardedAt: new Date().toISOString()
      });

      // Award points for badge
      await this.awardPoints(userId, badge.points, `Badge: ${badge.name}`);

      await this.saveUserData(userId, userData);
      
      // Update backend
      await this.updateBackend(userId, 'badge_awarded', { badgeKey, badgeName: badge.name });
      
      return userData;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return null;
    }
  }

  // Record weekly check-in
  async recordWeeklyCheckin(userId, weekNumber) {
    try {
      const userData = await this.getUserData(userId);
      const today = new Date().toISOString().split('T')[0];
      
      // Check if already checked in this week
      const existingCheckin = userData.weeklyCheckins.find(
        checkin => checkin.weekNumber === weekNumber
      );
      
      if (existingCheckin) {
        return userData; // Already checked in
      }

      // Record check-in
      userData.weeklyCheckins.push({
        weekNumber: weekNumber,
        date: today,
        timestamp: new Date().toISOString()
      });

      // Update streak
      userData.streak += 1;
      userData.lastCheckin = today;

      // Award points for check-in
      await this.awardPoints(userId, 5, `Weekly check-in for week ${weekNumber}`);

      // Check for weekly check-in badge
      if (userData.weeklyCheckins.length === 1) {
        await this.awardBadge(userId, 'first_week');
      }

      // Check for streak badges
      if (userData.streak === 4) {
        await this.awardBadge(userId, 'healthy_trends');
      }

      await this.saveUserData(userId, userData);
      
      // Update backend
      await this.updateBackend(userId, 'weekly_checkin', { weekNumber });
      
      return userData;
    } catch (error) {
      console.error('Error recording weekly check-in:', error);
      return null;
    }
  }

  // Record milestone reached
  async recordMilestone(userId, milestoneType, weekNumber) {
    try {
      const userData = await this.getUserData(userId);
      
      // Check if milestone already recorded
      const existingMilestone = userData.milestones.find(
        m => m.type === milestoneType && m.weekNumber === weekNumber
      );
      
      if (existingMilestone) {
        return userData; // Already recorded
      }

      // Record milestone
      userData.milestones.push({
        type: milestoneType,
        weekNumber: weekNumber,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      });

      // Award points for milestone
      await this.awardPoints(userId, 15, `Milestone: ${milestoneType} at week ${weekNumber}`);

      // Check for milestone badge
      if (userData.milestones.length === 1) {
        await this.awardBadge(userId, 'milestone_reached');
      }

      // Check for trimester completion
      if (weekNumber === 12 || weekNumber === 26 || weekNumber === 40) {
        await this.awardBadge(userId, 'trimester_complete');
      }

      await this.saveUserData(userId, userData);
      
      // Update backend
      await this.updateBackend(userId, 'milestone_reached', { milestoneType, weekNumber });
      
      return userData;
    } catch (error) {
      console.error('Error recording milestone:', error);
      return null;
    }
  }

  // Get user's progress summary
  async getProgressSummary(userId) {
    try {
      const userData = await this.getUserData(userId);
      
      return {
        totalPoints: userData.totalPoints,
        level: userData.level,
        badgesCount: userData.badges.length,
        weeklyCheckinsCount: userData.weeklyCheckins.length,
        milestonesCount: userData.milestones.length,
        streak: userData.streak,
        nextLevelPoints: (userData.level * 100) - userData.totalPoints,
        recentAchievements: userData.achievements.slice(-5).reverse()
      };
    } catch (error) {
      console.error('Error getting progress summary:', error);
      return null;
    }
  }

  // Update backend with gamification data
  async updateBackend(userId, action, data) {
    try {
      const token = await this.getAuthToken();
      if (!token) return;

      const response = await fetch(`${API_URL}/update-gamification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          user_id: userId,
          ...data
        }),
      });

      if (!response.ok) {
        console.warn('Failed to update backend gamification data');
      }
    } catch (error) {
      console.error('Error updating backend gamification:', error);
    }
  }

  // Get auth token from storage
  async getAuthToken() {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo) {
        const parsed = JSON.parse(userInfo);
        return parsed.token;
      }
      return null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Reset user's gamification data (for testing)
  async resetUserData(userId) {
    try {
      const key = `gamification_${userId}`;
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error resetting gamification data:', error);
      return false;
    }
  }
}

export default new GamificationManager();
