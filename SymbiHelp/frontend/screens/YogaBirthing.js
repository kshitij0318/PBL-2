import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function YogaBirthing({ navigation }) {
  const [downloading, setDownloading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // This is the URL to a real PDF file - replace with your actual PDF link
  const pdfUrl = 'https://drive.google.com/file/d/1wizUsx63JTEcqIBuIdL8ImW6aovgRKYY/view?usp=sharing';
  const videoUrl = 'https://drive.google.com/file/d/1vo5fC3uGvk5OzgPmMpcAZUbFAsXkz74U/view?usp=drive_link';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Check if the device can open the URL
      const supported = await Linking.canOpenURL(pdfUrl);
      
      if (supported) {
        // Open URL with system browser or PDF viewer
        await Linking.openURL(pdfUrl);
        Alert.alert('Success', 'Document opened successfully');
      } else {
        Alert.alert('Error', 'Cannot open the PDF on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'There was a problem opening the document');
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  const handleVideoOpen = async () => {
    try {
      setVideoLoading(true);
      const supported = await Linking.canOpenURL(videoUrl);
      
      if (supported) {
        await Linking.openURL(videoUrl);
      } else {
        Alert.alert('Error', 'Cannot open the video on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'There was a problem opening the video');
      console.error(error);
    } finally {
      setVideoLoading(false);
    }
  };

  const steps = [
    {
      title: 'Deep Breathing (Pranayama)',
      description: 'The mother sits comfortably with her back straight and shoulders relaxed. She inhales deeply through her nose, expanding her abdomen, holds the breath for a few seconds, and then exhales slowly through her mouth. She focuses on making her exhalation longer than her inhalation. This technique is beneficial in all stages of labor to promote relaxation and manage pain. It can be practiced for 5-10 minutes between contractions.',
      whentouse: 'Useful throughout all phases of labor, especially during contractions in the latent and active phase. Can be practiced for 5-10 minutes between contractions.',
      scientific: 'Regulates oxygen supply, reduces stress hormones, and enhances relaxation by stimulating the parasympathetic nervous system.',
      advantages: 'Reduces anxiety, lowers blood pressure, increases oxygen flow to the baby, and helps manage pain during contractions.',
      image: require('../assets/Yoga/Step1.jpg')
    },
    {
      title: 'Cat-Cow Pose',
      description: 'For this pose, the mother is on all fours, alternating between arching her back (cow pose) and rounding it (cat pose) while synchronizing with deep breaths',
      whentouse: 'Recommended in the latent and early active phase to ease lower back discomfort and encourage fetal movement. Can be done for 5-7 minutes between contractions',
      scientific: 'Encourages fetal rotation into an optimal anterior position, improves spinal flexibility, and reduces lower back tension.',
      advantages: 'Relieves back pain, improves posture, and helps the baby settle into the optimal position for birth.',
      image: require('../assets/Yoga/Step2.jpg')
    },
    {
      title: 'Supported Squat',
      description: 'The mother stands with her feet shoulder-width apart, holding onto a stable surface for support. She slowly lowers into a deep squat, keeping her back straight. She holds for 30 seconds to 1 minute, breathing deeply. This technique is beneficial in the active phase of labor to encourage pelvic opening and fetal descent. It can be practiced for 3-5 minutes between contractions.',
      whentouse: 'Effective during the active phase of labor to open the pelvis and encourage descent. Can be performed for 5-10 minutes between contractions.',
      scientific: 'Squatting widens the pelvic outlet by up to 30%, aiding in fetal descent and reducing labor duration.',
      advantages: 'Promotes natural gravity-assisted birth, reduces strain on the lower back, and enhances uterine contractions.',
      image: require('../assets/Yoga/Step3.jpg')
    },
    {
      title: 'Butterfly Pose',
      description: 'The mother sits on the floor with the soles of her feet together, gently pressing the knees toward the floor while maintaining an upright posture.',
      whentouse: 'Effective in the latent and early active phases of labor. Can be maintained for 5-10 minutes between contractions to open the pelvis.',
      scientific: 'Stretches the inner thighs, improves circulation in the pelvic region, and prepares the hips for labor.',
      advantages: 'Enhances flexibility, reduces pelvic tension, and promotes relaxation.',
      image: require('../assets/Yoga/Step4.jpg')
    },
    {
      title: 'Forward Leaning Pose',
      description: 'The mother stands with feet hip-width apart, bending forward to rest her hands on a stable surface or a birthing ball. She gently sways side to side',
      whentouse: 'Beneficial in all phases of labor, particularly during contractions. Can be maintained for 5-10 minutes as needed.',
      scientific: 'Uses gravity to encourage fetal descent and relieves pressure from the lower back." Advantages: "Eases tension in the lower back and pelvis, promotes fetal positioning, and helps manage contractions effectively.',
      advantages: 'Reduces back pain, encourages optimal fetal positioning, and provides a comfortable position during contractions.',
      image: require('../assets/Yoga/Step5.jpg')
    }
  ];

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => navigation.navigate('HomeMain')}
        >
          <Ionicons name="arrow-back" size={24} color="#2e7d32" />
        </TouchableOpacity>
        <Text style={styles.title}>Yoga During the Birthing Process</Text>
      </View>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Yoga can help ease discomfort, promote relaxation, and encourage optimal fetal positioning during labor.
          Below are key yoga poses beneficial for the birthing process.
        </Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.section}>
            <Text style={styles.stepTitle}>{step.title}</Text>
            {step.image && <Image source={step.image} style={styles.image} />}
            <Text style={styles.stepDescription}>{step.description}</Text>
            
            <Text style={styles.sectionHeader}>When to Use:</Text>
            <Text style={styles.sectionText}>{step.whentouse}</Text>
            
            <Text style={styles.sectionHeader}>Scientific Rationale:</Text>
            <Text style={styles.sectionText}>{step.scientific}</Text>
            
            <Text style={styles.sectionHeader}>Advantages:</Text>
            <Text style={styles.sectionText}>{step.advantages}</Text>
          </View>
        ))}

        <View style={styles.buttonContainer}>
          {/* Download Button */}
          <TouchableOpacity 
            style={styles.downloadButton} 
            onPress={handleDownload}
            disabled={downloading}
          >
            <Ionicons name="document-text-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              {downloading ? 'Opening...' : 'Download PDF'}
            </Text>
          </TouchableOpacity>

          {/* Video Button */}
          <TouchableOpacity 
            style={styles.videoButton} 
            onPress={handleVideoOpen}
            disabled={videoLoading}
          >
            <Ionicons name="play-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              {videoLoading ? 'Opening...' : 'Watch Demonstration Video'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Extra padding view to ensure content is visible */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#e8f5e9', // Light green background
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 10,
    backgroundColor: '#e8f5e9',
  },
  backButton: {
    padding: 10,
    marginRight: 10,
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1b5e20', // Darker green
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    flex: 1,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#37474f', // Dark gray
    lineHeight: 24,
    letterSpacing: 0.25,
    paddingHorizontal: 10,
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#c8e6c9', // Light green border
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e7d32', // Medium green
    letterSpacing: 0.25,
  },
  stepDescription: {
    fontSize: 16,
    color: '#37474f', // Dark gray
    marginBottom: 15,
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 15,
    marginBottom: 5,
    color: '#2e7d32'
  },
  sectionText: {
    fontSize: 15,
    color: '#546e7a',
    marginBottom: 10,
    lineHeight: 22,
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 15,
  },
  buttonContainer: {
    marginVertical: 20,
  },
  downloadButton: {
    marginVertical: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginHorizontal: 20,
    flexDirection: 'row',
  },
  videoButton: {
    marginVertical: 10,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    marginHorizontal: 20,
    flexDirection: 'row',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  buttonIcon: {
    marginRight: 8,
  },
  bottomSpacer: {
    height: 30,
  },
});