import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LamazeBreathing({ navigation }) {
  const [downloading, setDownloading] = useState(false);

  // Video demonstration link from the document
  const videoUrl = 'https://drive.google.com/file/d/1uhH5TPdjmvWKf-j06EWCcCWRyhE2qjIy/view?usp=drive_link';
  
  // PDF download link
  const pdfUrl = 'https://drive.google.com/file/d/18-za2XfnFFE1eTJFTwqZ3Li5OJBJzeYx/view?usp=sharing';

  const handleDownload = async () => {
    try {
      setDownloading(true);
      
      // Instead of downloading directly, we'll open the PDF in browser/PDF viewer
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

  const openVideo = async () => {
    try {
      const supported = await Linking.canOpenURL(videoUrl);
      
      if (supported) {
        await Linking.openURL(videoUrl);
      } else {
        Alert.alert('Error', 'Cannot open the video on this device');
      }
    } catch (error) {
      Alert.alert('Error', 'There was a problem opening the video');
      console.error(error);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#7A7FFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Lamaze Breathing</Text>
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.description}>
          Lamaze breathing is a controlled breathing technique used during labor
          to help manage pain, reduce stress, and promote relaxation. It involves
          a series of slow, deep, and rhythmic breaths that synchronize with
          contractions, allowing the mother to stay focused and maintain a sense
          of control.
        </Text>

        {/* Introduction */}
        <View style={styles.section}>
          <Text style={styles.sectionText}>
            Lamaze breathing is primarily used to help the mother stay relaxed and
            manage pain during labor. Most expectant mothers perceive it as a useful
            tool for pain relief and relaxation. A common misconception is that it
            completely eliminates labor pain, when in reality, it helps manage
            discomfort. Pregnant woman's attitude toward Lamaze breathing is most
            influenced by the support and education she receives. Healthcare
            professionals encourage a positive perception by integrating it with
            other pain management techniques.
          </Text>
        </View>

        {/* Step 1 */}
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 1: Preparation for Breathing</Text>
          <Text style={styles.stepDescription}>
            Start by preparing the mother for breathing exercises.
            Ensure she is in a calm environment. Assist her in sitting comfortably
            with her back supported. Place one hand on her chest and the other on
            her belly. Encourage her to breathe in deeply through her nose and out
            through her mouth. This is the foundational position.
          </Text>
          <Image 
            source={require('../assets/Lamaze/Step1.jpg')} 
            style={styles.image}
            resizeMode="cover" 
          />
          <Text style={styles.scientificRationale}>
            <Text style={styles.boldText}>Scientific Rationale:</Text> Deep breathing activates the parasympathetic
            nervous system, reducing stress hormones like cortisol and increasing
            oxygen supply to the uterus and fetus. It prepares the mother for
            relaxation during labour.
          </Text>
        </View>

        {/* Step 2 */}
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 2: Slow, Deep Breathing (First Stage-Latent Phase)</Text>
          <Text style={styles.stepDescription}>
            During the first stage of labour in the latent phase, guide the mother
            to use slow, deep breaths. Instruct her to breathe in through her nose
            for a count of four, feeling her belly rise, and exhale slowly through
            her mouth for a count of six. Each time she exhales, focus on relaxing
            different body part during contractions. Practice this rhythm with her.
          </Text>
          <Image 
            source={require('../assets/Lamaze/Step2.jpg')} 
            style={styles.image}
            resizeMode="cover" 
          />
          <Text style={styles.scientificRationale}>
            <Text style={styles.boldText}>Scientific Rationale:</Text> This technique enhances oxygenation, reduces
            maternal anxiety, and conserves energy, which is crucial in the early
            stages of labour.
          </Text>
          <Text style={styles.advantages}>
            <Text style={styles.boldText}>Advantages for Nurses:</Text> It also helps establish trust and a sense of
            calmness between the nurse and the mother, fostering effective
            communication.
          </Text>
        </View>

        {/* Step 3 */}
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 3: Light Breathing (First Stage-Active Phase)</Text>
          <Text style={styles.stepDescription}>
            During the active phase of labour teach the mother to keep the breathing
            as slow as possible, but speed it up as the intensity of the contraction
            increases. As contractions intensify, encourage the mother switch to
            shallow breathing both in and out through your mouth about one breath
            per second matching the rhythm of her contractions.
            
            As the intensity of the contraction decreases, slow the breathing and go
            back to breathing in with the nose and out with the mouth. Remind the
            mothers to keep her shoulders and jaw relaxed.
          </Text>
          <Image 
            source={require('../assets/Lamaze/Step3.jpg')} 
            style={styles.image}
            resizeMode="cover" 
          />
          <Text style={styles.scientificRationale}>
            <Text style={styles.boldText}>Scientific Rationale:</Text> Light breathing prevents hyperventilation,
            stabilizes maternal heart rate, and maintains oxygen delivery to the
            fetus.
          </Text>
          <Text style={styles.advantages}>
            <Text style={styles.boldText}>Advantages for Nurses:</Text> It allows nurses to assess the mother's breathing
            and provide real-time adjustments, ensuring optimal comfort.
          </Text>
        </View>

        {/* Step 4 */}
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 4: Patterned Breathing (Transition Phase)</Text>
          <Text style={styles.stepDescription}>
            During the transition phase, contractions become more frequent and
            intense. Focus the attention of the mother on one thing — a picture,
            your partner, even a spot on the wall or close your eyes.
            
            Begin with quick or light breaths, "hee-hoo" as the contraction
            intensifies, teach the mother a patterned 'heehee-hoo' breathing
            technique. Demonstrate by taking two short breaths followed by a longer
            exhale. Guide the mother to use a patterned breathing technique called
            'Pant-Pant-Blow':
            
            • Take two short, quick breaths through the mouth (pant-pant).
            • Follow with one long exhale through pursed lips (blow).
            
            Encourage her to synchronize this pattern with each contraction.
            
            As the contraction eases, take cleansing breath and rest between two
            contractions.
          </Text>
          <Image 
            source={require('../assets/Lamaze/Step4.jpg')} 
            style={styles.image}
            resizeMode="cover" 
          />
          <Text style={styles.scientificRationale}>
            <Text style={styles.boldText}>Scientific Rationale:</Text> This breathing pattern helps prevent
            hyperventilation, promotes oxygenation to the uterus and baby, and
            distracts the mother from the intensity of contractions.
          </Text>
          <Text style={styles.advantages}>
            <Text style={styles.boldText}>Advantages:</Text> It provides a rhythm for the mother to focus on, reducing
            panic and aiding in pain management.
          </Text>
        </View>

        {/* Step 5 */}
        <View style={styles.section}>
          <Text style={styles.stepTitle}>Step 5: Breathing During Pushing (Second Stage)</Text>
          <Text style={styles.stepDescription}>
            During the second stage, collaborate with the healthcare team to guide
            the mother. Encourage her to take a deep breath, hold it, and push for
            about 10 seconds during contractions. When the contraction is over,
            relax and take two calming breaths. Exhale and repeat as guided by the
            midwife.
          </Text>
          <Image 
            source={require('../assets/Lamaze/Step5.jpg')} 
            style={styles.image}
            resizeMode="cover" 
          />
          <Text style={styles.scientificRationale}>
            <Text style={styles.boldText}>Scientific Rationale:</Text> This technique enhances the use of abdominal
            muscles and increases intra-abdominal pressure, facilitating effective
            pushing.
          </Text>
          <Text style={styles.advantages}>
            <Text style={styles.boldText}>Advantages for Nurses:</Text> By coaching the mother through this stage, nurses
            can ensure efficient pushing, reducing maternal fatigue and improving
            delivery outcomes.
          </Text>
        </View>

        {/* Conclusion */}
        <View style={styles.section}>
          <Text style={styles.conclusionTitle}>Conclusion</Text>
          <Text style={styles.conclusionText}>
            Lamaze breathing techniques are evidence-based practices that empower
            mothers and improve their childbirth experience. This non-invasive
            technique adapts seamlessly across different labor stages, effectively
            reducing anxiety and discomfort without medication or intervention,
            leading to better birth outcomes. For nursing students and labour room
            nurses, mastering these techniques enables you to provide superior care
            and guidance. Regular practice and application in clinical settings will
            enhance your confidence and effectiveness in supporting mothers.
          </Text>
        </View>

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
            onPress={openVideo}
          >
            <Ionicons name="play-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
            <Text style={styles.buttonText}>
              Watch Demonstration Video
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.spacer} />
      </ScrollView>
    </View>
  );
}

// Styles
const styles = StyleSheet.create({
  mainContainer: {
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
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  description: {
    fontSize: 16,
    color: '#546e7a',
    marginBottom: 20,
    lineHeight: 24,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  section: {
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
  sectionText: {
    fontSize: 16,
    color: '#37474f',
    lineHeight: 24,
    letterSpacing: 0.25,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1b5e20',
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 16,
    marginBottom: 15,
    color: '#37474f',
    lineHeight: 24,
  },
  image: {
    width: '100%',
    height: 220,
    borderRadius: 10,
    marginVertical: 15,
    resizeMode: 'cover',
  },
  scientificRationale: {
    fontSize: 15,
    color: '#546e7a',
    marginBottom: 10,
    lineHeight: 22,
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
  },
  advantages: {
    fontSize: 15,
    color: '#546e7a',
    marginTop: 10,
    lineHeight: 22,
    backgroundColor: '#f1f8e9',
    padding: 12,
    borderRadius: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2e7d32',
  },
  conclusionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1b5e20',
    textAlign: 'center',
  },
  conclusionText: {
    fontSize: 16,
    color: '#37474f',
    lineHeight: 24,
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
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonIcon: {
    marginRight: 4,
  },
  spacer: {
    height: 20,
  },
});