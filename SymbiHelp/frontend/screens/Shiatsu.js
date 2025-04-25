import React, { useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Shiatsu = ({ navigation }) => {
    const [downloading, setDownloading] = useState(false);
    const [videoLoading, setVideoLoading] = useState(false);
    const pdfUrl = 'https://drive.google.com/file/d/1vDuKIRTyL5rLO8CyHB5f-HhZy2hB5ZJ6/view?usp=drive_link';
    const videoUrl = 'https://drive.google.com/file/d/1unF2kLWDVb8Y4Cip04LOVFFRERQ6aOf5/view?usp=drive_link';

    const handleDownload = async () => {
        try {
            setDownloading(true);
            const supported = await Linking.canOpenURL(pdfUrl);

            if (supported) {
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
            title: 'Preparation and Positioning',
            description: 'Begin by creating a relaxing environment. Dim the lights and ensure the room temperature is comfortable. The mother should be in a comfortable position, either sitting or lying down, with proper support for her back and neck.',
            scientific: 'Proper positioning promotes relaxation and ensures even distribution of pressure during Shiatsu, allowing effective stimulation of specific acupressure points to promote relaxation and facilitating the flow of chi.',
            advantages: 'This initial step helps the mother feel secure and comfortable, reducing muscle tension and enhancing the effectiveness of the technique. ',
            image: require('../assets/Shiatsu/Step1.jpg'),
        },
        {
            title: 'Applying Pressure to GB21',
            description: 'Locate the GB21 acupressure point, situated at the highest point of the shoulder, midway between the neck and shoulder joint. Using your thumbs, apply firm, circular pressure for 1-2 minutes. Remind the mother to breathe deeply during this process Apply this technique during uterine contractions in the latent and active phases of the first stage of labour to reduce upper body tension and assist with relaxation',
            scientific: 'Stimulating GB21 helps release endorphins, the body\'s natural painkillers, and relaxes the upper body, which is especially beneficial in relieving labour-related tension. It also unblocks stagnant chi in the upper meridians, promoting energy flow. ',
            advantages: 'This step helps reduce shoulder and neck tension, promoting relaxation and better posture during labour. ',
            image: require('../assets/Shiatsu/Step2.jpg'),
        },
        {
            title: 'Stimulation of BL32',
            description: 'Locate the BL32 acupressure point in the sacral area, about two finger-widths from the spine. Apply gentle pressure in a circular motion for 1-2 minutes.',
            scientific: 'BL32 is known to help stimulate uterine contractions and alleviate lower back pain by enhancing the flow of chi in the pelvic region. ',
            advantages: 'By focusing on BL32, you can provide pain relief and support the progression of labour. ',
            image: require('../assets/Shiatsu/Step3.jpg'),
        },
        {
            title: 'Pressing LI4',
            description: 'locate the LI4 acupressure point, found in the webbing between the thumb and index finger. Apply firm pressure using your thumb for 1-2 minutes on each hand, alternating as needed. Stimulate this point during uterine contractions in the active and transition phases of the first stage of labour to help reduce pain intensity and enhance relaxation. ',
            scientific: 'LI4 is a powerful point for pain relief and relaxation. Stimulating this point helps unblock chi in the upper body and promotes the body\'s natural ability to manage labour pain. ',
            advantages: 'This step not only reduces pain perception but also promotes a sense of calm and control for the mother. ',
            image: require('../assets/Shiatsu/Step4.jpg'),
        },
        {
            title: 'Focusing on SP6',
            description: 'locate the SP6 acupressure point, located three finger-widths above the inner ankle bone along the shin. Apply steady pressure with your thumb for 1-2 minutes on each leg. Stimulate this point during relaxation phases between contractions in the latent, active, and transition phases of the first stage of labour to encourage cervical dilation and prepare for the next contraction',
            scientific: 'SP6 is known to aid in inducing labour, promoting cervical dilation, and reducing labour duration by stimulating chi flow in the lower body. ',
            advantages: 'This step supports the natural progression of labour while reducing discomfort for the mother. ',
            image: require('../assets/Shiatsu/Step5.jpg'),
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
                <Text style={styles.headerTitle}>Shiatsu</Text>
            </View>
            <ScrollView style={styles.scrollContainer}>
                <Text style={styles.subheading}>
                    A traditional Japanese acupressure technique that helps manage labor pain and promote relaxation through targeted pressure points.
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

export default Shiatsu;