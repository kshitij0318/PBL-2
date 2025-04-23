import React, { useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const BallBirthing = ({ navigation }) => {
    const [downloading, setDownloading] = useState(false);
    
    const videoUrl = 'https://drive.google.com/file/d/1unF2kLWDVb8Y4Cip04LOVFFRERQ6aOf5/view?usp=drive_link';

    const handleVideoOpen = async () => {
        try {
            setDownloading(true);
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
            setDownloading(false);
        }
    };

    const steps = [
        {
            title: 'Hip Tilt Exercise',
            description: 'The mother sits comfortably on the birthing ball with feet flat on the ground, gently tilting her pelvis forward and backward. This technique is beneficial in the latent and early active phase of labor to encourage pelvic opening and comfort. It can be done for 5-10 minutes between contractions.',
            scientific: 'Hip tilts promote optimal fetal positioning by encouraging anterior rotation of the baby and reducing lower back strain.',
            advantages: 'Helps alleviate back pain, improves posture, and facilitates gentle stretching of the pelvic muscles.',
             image: require('../assets/BallBirthing/Step1.jpg')
        },
        
        {
            title: 'Hip Circles',
            description: 'In this exercise, the mother sits upright on the birthing ball and moves her hips in circular motions, first clockwise and then counter clockwise. She should maintain slow and controlled movements. Recommended during the active phase of labor to enhance pelvic mobility and relieve tension. Can be performed for 10-15 minutes between contractions.',
            scientific: 'Encourages loosening of pelvic ligaments and improves circulation to the uterus, aiding in effective contractions.',
            advantages: 'Eases lower back discomfort, promotes relaxation, and helps in fetal descent.',
            image: require('../assets/BallBirthing/Step2.jpg')
        },
        {
            title: 'Figure-of-Eight Movements',
            description: 'The mother sits on the birthing ball and gently moves her hips in a figure-of-eight motion. This helps create space in the pelvis and ensures a rhythmic motion for relaxation. Most effective in the active and transition phases of labor to keep contractions steady and facilitate fetal descent. Can be practiced for 10 minutes between contractions.',
            scientific: 'Enhances sacral mobility and helps engage the baby deeper into the birth canal.',
            advantages: 'Provides a soothing rhythmic movement, reduces stress, and aids in labor progression.',
            image: require('../assets/BallBirthing/Step3.jpg')
        },
        {
            title: 'Cat-Cow Pose with the Ball',
            description: 'For this pose, the mother kneels on a mat and leans forward onto the birthing ball, placing her hands on top for support. She then alternates between arching her back (cow pose) and rounding her spine (cat pose), synchronizing movements with deep breathing. Ideal for the latent and early active phases to reduce back tension and optimize fetal positioning. It can be done for 5-7 minutes between contractions.',
            scientific: 'Encourages spinal flexibility, relieves lower back pressure, and helps the baby rotate into an optimal anterior position.',
            advantages: 'Alleviates pressure on the spine, promotes relaxation, and improves blood flow to the uterus.',
            image: require('../assets/BallBirthing/Step4.jpg')
        },
        {
            title: 'Gentle Bouncing on the Ball',
            description: 'The mother sits upright on the birthing ball and performs gentle bouncing motions to promote pelvic relaxation and rhythmic movement. Beneficial in the early and active phases of labor to stimulate contractions and enhance baby\'s descent. Can be done for 5 minutes at a time, resting between contractions.',
            scientific: 'Encourages the baby to settle deeper into the pelvis, increases blood circulation, and enhances endorphin release for natural pain relief.',
            advantages: 'Supports comfort, reduces labor anxiety, and promotes a natural progression of labor.',
            image: require('../assets/BallBirthing/Step5.jpg')
        },
        {
            title: 'Forward Leaning on the Ball',
            description: 'The mother leans forward onto the birthing ball while in a kneeling position, allowing her upper body to rest on the ball. She gently sways side to side to maintain flexibility. Recommended in all phases of labor, particularly during contractions to relieve back pain. Can be maintained for 5-10 minutes as needed.',
            scientific: 'Encourages gravity-assisted fetal descent and relieves lower back strain.',
            advantages: 'Helps distribute labor pain, reduces pressure on the spine, and promotes relaxation.',
            image: require('../assets/BallBirthing/Step6.jpg')
        }
    ];

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.heading}>Ball Birthing Techniques</Text>
            <Text style={styles.subheading}>
                A powerful, natural way to enhance comfort, relaxation, and labor progression while effectively managing pain.
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
            
            {/* Video Button */}
            <TouchableOpacity 
                style={styles.videoButton} 
                onPress={handleVideoOpen}
                disabled={downloading}
            >
                <Ionicons name="play-circle-outline" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>
                    {downloading ? 'Opening...' : 'Watch Demonstration Video'}
                </Text>
            </TouchableOpacity>

            {/* Navigation button */}
            <TouchableOpacity 
                style={styles.navigationButton} 
                onPress={() => navigation.navigate('Home')}
            >
                <Ionicons name="home-outline" size={24} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.buttonText}>Back to Home</Text>
            </TouchableOpacity>
            
            <View style={styles.spacer} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8f9fa',
        paddingHorizontal: 16
    },
    heading: {
        fontSize: 28,
        fontWeight: 'bold',
        textAlign: 'center',
        marginVertical: 20,
        color: '#2e7d32',
        marginTop: 30
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
    videoButton: {
        backgroundColor: '#2196F3',
        padding: 15,
        borderRadius: 27,
        alignItems: 'center',
        marginVertical: 15,
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
    navigationButton: {
        backgroundColor: '#dc3545',
        padding: 15,
        borderRadius: 27,
        alignItems: 'center',
        marginBottom: 30,
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

export default BallBirthing;