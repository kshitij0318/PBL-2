import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';

// Theme colors
const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333', // Main text color
  darkText: '#1E1E1E', // For titles
  secondaryText: '#666', // Lighter text
  placeholder: '#A0A0A0',
};

export default function EarlyLabor({ navigation }) {
  // Function to handle image upload (placeholder)
  const handleUpload = () => {
    console.log("Upload button pressed");
    // Implement image picking logic here
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Stage 1: Early Labor</Text>
        
        <Text style={styles.description}>
          Early labor is the beginning phase of childbirth. It is characterized by mild contractions
          that help soften and thin the cervix. This stage can last for hours or even days.
        </Text>

        {/* Card for Signs */}
        <View style={styles.card}>
          <Text style={styles.subTitle}>Signs of Early Labor:</Text>
          <Text style={styles.listItem}>• Mild, irregular contractions</Text>
          <Text style={styles.listItem}>• Light vaginal bleeding (bloody show)</Text>
          <Text style={styles.listItem}>• Water breaking (amniotic sac rupture)</Text>
          <Text style={styles.listItem}>• Backache and cramps</Text>
        </View>

        {/* Card for What to Do */}
        <View style={styles.card}>
          <Text style={styles.subTitle}>What to Do During Early Labor:</Text>
          <Text style={styles.listItem}>• Stay hydrated and eat light meals</Text>
          <Text style={styles.listItem}>• Practice breathing techniques</Text>
          <Text style={styles.listItem}>• Try to relax or take a warm bath</Text>
          <Text style={styles.listItem}>• Contact a healthcare provider if necessary</Text>
        </View>

        {/* Upload Button - Styled like primary action buttons */}
        <TouchableOpacity style={styles.actionButton} onPress={handleUpload} activeOpacity={0.7}>
          <Text style={styles.actionButtonText}>Upload Reference Image</Text>
        </TouchableOpacity>

        {/* Back button removed - header provides navigation */}
        {/* <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.buttonText}>Back to Dashboard</Text>
        </TouchableOpacity> */}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.lightBackground, // Use light background
  },
  container: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20, // Add vertical padding
  },
  title: {
    fontSize: 24, // Adjusted size
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: themeColors.darkText, // Use dark text for title
  },
  description: {
    fontSize: 16,
    textAlign: 'left', // Justify can sometimes look odd on mobile
    marginBottom: 25,
    color: themeColors.secondaryText, // Use secondary text color
    lineHeight: 24,
  },
  card: {
    backgroundColor: themeColors.white, // White background for cards
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderColor: '#E0E5F0',
    borderWidth: 1,
    // Removed elevation/shadow for flatter design
  },
  subTitle: {
    fontSize: 18,
    fontWeight: '600', // Semi-bold
    color: themeColors.primary, // Use primary color for subtitles
    marginBottom: 15,
  },
  listItem: {
    fontSize: 16,
    color: themeColors.text, // Use standard text color
    lineHeight: 26, // Increased line height for readability
    marginBottom: 8, // Add space between items
  },
  image: {
    width: '100%',
    height: 200, // Adjusted height
    borderRadius: 15,
    marginBottom: 10,
    backgroundColor: themeColors.placeholder, // Placeholder background if image fails
  },
  imageCaption: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 25,
    color: themeColors.secondaryText,
  },
  actionButton: {
    height: 55,
    borderRadius: 15,
    backgroundColor: themeColors.primary, // Use primary theme color
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10, // Add space above button
    marginBottom: 20, // Add space below button
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: themeColors.white,
  },
  // Back button style removed as button is removed
});
