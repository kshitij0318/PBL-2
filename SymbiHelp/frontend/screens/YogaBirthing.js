import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const YogaBirthing = ({ navigation }) => {
  const [downloading, setDownloading] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  // This is the URL to a real PDF file - replace with your actual PDF link
  const pdfUrl = 'https://drive.google.com/file/d/1vDuKIRTyL5rLO8CyHB5f-HhZy2hB5ZJ6/view?usp=drive_link';
  const videoUrl = 'https://drive.google.com/file/d/1unF2kLWDVb8Y4Cip04LOVFFRERQ6aOf5/view?usp=drive_link';

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
      title: 'Cat-Cow Pose',
      description: 'Begin on your hands and knees, with your wrists directly under your shoulders and your knees under your hips. As you inhale, arch your back and lift your head and tailbone towards the ceiling. As you exhale, round your back and tuck your chin to your chest. Repeat this movement for 5-10 breaths.',
      scientific: 'This pose helps to stretch and strengthen the spine, improve posture, and increase flexibility in the back and neck. It also helps to relieve tension in the lower back and hips, which can be beneficial during pregnancy and labor.',
      advantages: 'Regular practice of the Cat-Cow pose can help to reduce back pain, improve posture, and increase flexibility, making it easier to maintain good posture during labor.',
      image: require('../assets/Yoga/Step1.jpg'),
    },
    {
      title: 'Child\'s Pose',
      description: 'Kneel on the floor and sit back on your heels. Lower your torso to the floor and extend your arms in front of you. Rest your forehead on the floor and breathe deeply.',
      scientific: 'The Child\'s Pose is a gentle stretch for the back, hips, and thighs. It helps to relieve tension and stress, and can be a calming pose during labor.',
      advantages: 'This pose can help to reduce stress and anxiety, and provide a sense of calm and relaxation during labor.',
      image: require('../assets/Yoga/Step2.jpg'),
    },
    {
      title: 'Squat',
      description: 'Stand with your feet hip-width apart. Lower your body into a squat position, keeping your back straight and your knees aligned with your toes. Hold this position for 30 seconds to 1 minute.',
      scientific: 'Squats help to strengthen the legs and pelvic floor muscles, which are important for supporting the baby during pregnancy and labor. They also help to improve balance and stability.',
      advantages: 'Regular practice of squats can help to prepare the body for labor by strengthening the muscles needed for pushing and supporting the baby.',
      image: require('../assets/Yoga/Step3.jpg'),
    },
    {
      title: 'Butterfly Pose',
      description: 'Sit on the floor with your knees bent and the soles of your feet together. Gently press your knees towards the floor and hold this position for 30 seconds to 1 minute.',
      scientific: 'The Butterfly Pose helps to stretch the inner thighs and groin, which can be beneficial for opening the hips and preparing for labor.',
      advantages: 'This pose can help to increase flexibility in the hips and groin, making it easier to find comfortable positions during labor.',
      image: require('../assets/Yoga/Step4.jpg'),
    },
    {
      title: 'Pigeon Pose',
      description: 'Start in a plank position and bring your right knee forward, placing it behind your right wrist. Extend your left leg behind you and lower your body to the floor. Hold this position for 30 seconds to 1 minute, then switch sides.',
      scientific: 'The Pigeon Pose helps to stretch the hip flexors and glutes, which can be tight during pregnancy. It also helps to improve hip mobility and reduce tension in the lower back.',
      advantages: 'Regular practice of the Pigeon Pose can help to reduce hip and lower back pain, and improve hip mobility, making it easier to find comfortable positions during labor.',
      image: require('../assets/Yoga/Step5.jpg'),
    }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#7A7FFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yoga Birthing</Text>
      </View>
      <ScrollView style={styles.scrollContainer}>
        <Text style={styles.subheading}>
          A series of yoga poses designed to help prepare the body for labor and delivery, promoting flexibility, strength, and relaxation.
        </Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.stepContainer}>
            <Text style={styles.title}>{step.title}</Text>
            {step.image && <Image source={step.image} style={styles.image} />}
            <Text style={styles.description}>{step.description}</Text>
            
            <Text style={styles.sectionHeader}>Scientific Rationale:</Text>
            <Text style={styles.sectionText}>{step.scientific}</Text>
            
            <Text style={styles.sectionHeader}>Advantages:</Text>
            <Text style={styles.sectionText}>{step.advantages}</Text>
          </View>
        ))}
        
        <View style={styles.buttonContainer}>
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
        
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  subheading: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 25,
    color: '#546e7a',
    paddingHorizontal: 20,
    lineHeight: 24
  },
  stepContainer: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1b5e20',
    textAlign: 'center'
  },
  description: {
    fontSize: 16,
    marginBottom: 15,
    color: '#37474f',
    lineHeight: 24
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
    height: 220,
    borderRadius: 10,
    marginBottom: 15,
    resizeMode: 'cover'
  },
  buttonContainer: {
    marginVertical: 20,
  },
  downloadButton: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 27,
    alignItems: 'center',
    marginVertical: 10,
    height: 54,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginHorizontal: 20,
    flexDirection: 'row',
  },
  videoButton: {
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 27,
    alignItems: 'center',
    marginVertical: 10,
    height: 54,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    marginHorizontal: 20,
    flexDirection: 'row',
  },
  buttonIcon: {
    marginRight: 10,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  spacer: {
    height: 20
  }
});

export default YogaBirthing;