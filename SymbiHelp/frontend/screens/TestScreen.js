// src/screens/TestScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScoreDisplay from '../components/ScoreDisplay';
import { saveScore } from '../utils/ProgressManager';

const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  error: '#dc3545',
  success: '#28a745',
  disabled: '#B0B0B0',
  cardBorder: '#E0E5F0',
  correct: '#28a745',
  incorrect: '#dc3545',
};

// Test questions bank
const questionsBank = [
  {
    question: "Which breathing technique is recommended during early labor?",
    options: [
      "Holding breath for long periods",
      "Slow, deep breathing",
      "Rapid, shallow breathing",
      "Random breathing patterns"
    ],
    correctAnswer: 1,
    explanation: "Slow, deep breathing helps manage contractions and reduces stress during early labor."
  },
  {
    question: "What is the purpose of using a birthing ball?",
    options: [
      "To bounce for entertainment",
      "To support different labor positions",
      "To exercise during labor",
      "To rest on between contractions"
    ],
    correctAnswer: 1,
    explanation: "Birthing balls help support various labor positions and can aid in the baby's descent."
  },
  {
    question: "Which yoga pose can help with back pain during labor?",
    options: [
      "Headstand",
      "Cat-Cow Pose",
      "Warrior Pose",
      "Tree Pose"
    ],
    correctAnswer: 1,
    explanation: "Cat-Cow Pose helps relieve back pain and promotes flexibility during labor."
  },
  {
    question: "What is the main benefit of Lamaze breathing?",
    options: [
      "To make you sleepy",
      "To help manage contractions",
      "To speed up labor",
      "To slow down labor"
    ],
    correctAnswer: 1,
    explanation: "Lamaze breathing techniques help manage contractions and reduce pain perception."
  },
  {
    question: "When should you start practicing comfort techniques?",
    options: [
      "Only during labor",
      "During pregnancy",
      "After labor begins",
      "In the delivery room"
    ],
    correctAnswer: 1,
    explanation: "Practicing comfort techniques during pregnancy helps you become familiar with them before labor."
  },
  {
    question: "What is the recommended position for early labor?",
    options: [
      "Lying flat on your back",
      "Standing or walking",
      "Sitting in a chair",
      "Lying on your side"
    ],
    correctAnswer: 1,
    explanation: "Standing or walking during early labor can help the baby descend and may shorten labor duration."
  },
  {
    question: "Which technique can help with relaxation during labor?",
    options: [
      "Watching TV",
      "Progressive muscle relaxation",
      "Reading a book",
      "Listening to music only"
    ],
    correctAnswer: 1,
    explanation: "Progressive muscle relaxation helps release tension and promotes relaxation during labor."
  },
  {
    question: "What is the purpose of counterpressure during labor?",
    options: [
      "To speed up labor",
      "To relieve back pain",
      "To slow down labor",
      "To measure contractions"
    ],
    correctAnswer: 1,
    explanation: "Counterpressure applied to the lower back can help relieve back pain during contractions."
  },
  {
    question: "Which breathing pattern is used during active labor?",
    options: [
      "Regular breathing",
      "Patterned breathing",
      "Holding breath",
      "Shallow breathing"
    ],
    correctAnswer: 1,
    explanation: "Patterned breathing helps manage stronger contractions during active labor."
  },
  {
    question: "What is the benefit of water therapy during labor?",
    options: [
      "To speed up labor",
      "To provide pain relief and relaxation",
      "To slow down labor",
      "To measure baby's position"
    ],
    correctAnswer: 1,
    explanation: "Water therapy can provide pain relief, relaxation, and may help with labor progress."
  },
  {
    question: "Which position is recommended for pushing?",
    options: [
      "Lying flat on your back",
      "Semi-reclining or squatting",
      "Standing straight",
      "Lying on your stomach"
    ],
    correctAnswer: 1,
    explanation: "Semi-reclining or squatting positions can help with effective pushing during the second stage of labor."
  },
  {
    question: "What is the purpose of perineal massage?",
    options: [
      "To speed up labor",
      "To prepare the perineum for stretching",
      "To slow down labor",
      "To measure baby's position"
    ],
    correctAnswer: 1,
    explanation: "Perineal massage can help prepare the perineum for stretching during birth and may reduce tearing."
  },
  {
    question: "Which technique can help with back labor?",
    options: [
      "Lying flat on your back",
      "Pelvic tilts and hip circles",
      "Standing straight",
      "Lying on your stomach"
    ],
    correctAnswer: 1,
    explanation: "Pelvic tilts and hip circles can help with back labor by encouraging the baby to rotate."
  },
  {
    question: "What is the purpose of visualization during labor?",
    options: [
      "To speed up labor",
      "To promote relaxation and focus",
      "To slow down labor",
      "To measure contractions"
    ],
    correctAnswer: 1,
    explanation: "Visualization techniques can help promote relaxation and focus during labor."
  },
  {
    question: "Which breathing technique is used during the pushing stage?",
    options: [
      "Holding breath",
      "Open glottis pushing",
      "Rapid breathing",
      "Shallow breathing"
    ],
    correctAnswer: 1,
    explanation: "Open glottis pushing (breathing while pushing) is recommended to prevent unnecessary strain."
  },
  {
    question: "What is the purpose of acupressure during labor?",
    options: [
      "To speed up labor",
      "To relieve pain and promote labor progress",
      "To slow down labor",
      "To measure baby's position"
    ],
    correctAnswer: 1,
    explanation: "Acupressure can help relieve pain and may promote labor progress when applied to specific points."
  },
  {
    question: "Which position can help with posterior baby?",
    options: [
      "Lying flat on your back",
      "Hands and knees position",
      "Standing straight",
      "Lying on your stomach"
    ],
    correctAnswer: 1,
    explanation: "The hands and knees position can help encourage a posterior baby to rotate to an anterior position."
  },
  {
    question: "What is the purpose of vocalization during labor?",
    options: [
      "To speed up labor",
      "To release tension and manage pain",
      "To slow down labor",
      "To measure contractions"
    ],
    correctAnswer: 1,
    explanation: "Vocalization can help release tension and manage pain during labor contractions."
  },
  {
    question: "Which technique can help with anxiety during labor?",
    options: [
      "Avoiding support people",
      "Mindfulness and meditation",
      "Watching TV",
      "Reading a book"
    ],
    correctAnswer: 1,
    explanation: "Mindfulness and meditation techniques can help manage anxiety during labor."
  },
  {
    question: "What is the purpose of a birth plan?",
    options: [
      "To guarantee a specific birth experience",
      "To communicate preferences and inform decisions",
      "To control the birth process",
      "To avoid medical interventions"
    ],
    correctAnswer: 1,
    explanation: "A birth plan helps communicate preferences and informs decision-making during labor and birth."
  }
];

const { width } = Dimensions.get('window');

// Fisher-Yates Shuffle function
function shuffleArray(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }
  return array;
}

export default function TestScreen({ navigation }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [answeredQuestions, setAnsweredQuestions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];

  // Initialize test with random questions
  const startTest = () => {
    setIsLoading(true);
    const shuffledQuestions = [...questionsBank].sort(() => 0.5 - Math.random());
    const processedQuestions = shuffledQuestions.slice(0, 15).map(q => {
      // Create options array with correct flag
      const optionsToShuffle = q.options.map((optionText, index) => ({
        text: optionText,
        isCorrect: index === q.correctAnswer
      }));
      // Shuffle the options
      const shuffledOptions = shuffleArray(optionsToShuffle);
      // Return the question object with shuffled options
      return { ...q, shuffledOptions }; // Keep original structure + add shuffledOptions
    });

    setSelectedQuestions(processedQuestions);
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setAnsweredQuestions(new Set());
    setIsLoading(false);
  };

  // Handle answer selection
  const handleAnswerSelect = (selectedOptionIndex) => {
    if (answeredQuestions.has(currentQuestion)) return;
    
    setSelectedAnswer(selectedOptionIndex);
    setShowExplanation(true);
    setAnsweredQuestions(prev => new Set([...prev, currentQuestion]));

    // Check correctness based on the isCorrect flag in the shuffled option
    if (selectedQuestions[currentQuestion].shuffledOptions[selectedOptionIndex].isCorrect) {
      setScore(score + 1);
    }

    // Animate the fade effect
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Handle next question
  const handleNextQuestion = () => {
    const nextQuestionIndex = currentQuestion + 1;
    if (nextQuestionIndex < 15) {
      setCurrentQuestion(nextQuestionIndex);
      setSelectedAnswer(null);
      setShowExplanation(false);
      fadeAnim.setValue(0);
    } else {
      console.log(`[TestScreen] End of test. Final score: ${score}. Saving...`);
      saveScore(score, 15)
        .then(() => {
          console.log('[TestScreen] Score saved successfully via handleNextQuestion.');
        })
        .catch(err => {
          console.error('[TestScreen] Error saving score via handleNextQuestion:', err);
        })
        .finally(() => {
          setShowScore(true);
        });
    }
  };

  // Start the test immediately when component mounts
  useEffect(() => {
    startTest();
  }, []);

  // Show loading spinner while questions are being initialized
  if (isLoading || selectedQuestions.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={styles.loadingText}>Loading Questions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Show score screen
  if (showScore) {
    return <ScoreDisplay 
      score={score} 
      total={15} 
      navigation={navigation}
      onRetake={startTest}
    />;
  }

  // Validate current question exists
  if (!selectedQuestions[currentQuestion]) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Error: Question not found</Text>
          <TouchableOpacity style={styles.retryButton} onPress={startTest}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getOptionStyle = (index) => {
    if (!showExplanation) return styles.optionButton;
    
    const option = selectedQuestions[currentQuestion].shuffledOptions[index];
    const isCorrectOption = option.isCorrect;
    const isSelectedOption = index === selectedAnswer;

    if (isCorrectOption) {
      // Style for the correct option (always green background/border when explanation shown)
      return [styles.optionButton, styles.correctOption];
    }
    
    if (isSelectedOption && !isCorrectOption) {
      // Style for the incorrect option *that the user selected* (red background/border)
      return [styles.optionButton, styles.incorrectOption];
    }
    
    // Default style for other options when explanation is shown (no specific background/border)
    return styles.optionButton;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Test</Text>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentQuestion + 1}/15
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentQuestion + 1) / 15) * 100}%` }
              ]} 
            />
          </View>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>
            {selectedQuestions[currentQuestion].question}
          </Text>

          <View style={styles.optionsContainer}>
            {selectedQuestions[currentQuestion].shuffledOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={getOptionStyle(index)}
                onPress={() => handleAnswerSelect(index)}
                disabled={showExplanation}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionText,
                    showExplanation && option.isCorrect && styles.correctText,
                    showExplanation && index === selectedAnswer && !option.isCorrect && styles.incorrectText,
                  ]}>
                    {option.text}
                  </Text>
                  {showExplanation && (
                    <Ionicons
                      name={option.isCorrect ? "checkmark-circle" : "close-circle"}
                      size={24}
                      color={option.isCorrect ? themeColors.correct : themeColors.incorrect}
                    />
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {showExplanation && (
            <Animated.View 
              style={[
                styles.explanationContainer,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.explanationTitle}>Explanation:</Text>
              <Text style={styles.explanationText}>
                {selectedQuestions[currentQuestion].explanation}
              </Text>
              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNextQuestion}
              >
                <Text style={styles.nextButtonText}>
                  {currentQuestion < 14 ? 'Next Question' : 'See Results'}
                </Text>
                <Ionicons name="arrow-forward" size={20} color={themeColors.white} />
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    color: themeColors.darkText,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorText: {
    fontSize: 18,
    color: themeColors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    padding: 12,
  },
  retryButtonText: {
    color: themeColors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    backgroundColor: themeColors.white,
    borderBottomWidth: 1,
    borderBottomColor: themeColors.cardBorder,
  },
  backButton: {
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: themeColors.darkText,
    marginBottom: 8,
  },
  progressContainer: {
    marginTop: 4,
  },
  progressText: {
    fontSize: 16,
    color: themeColors.primary,
    fontWeight: '600',
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: themeColors.lightPrimary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: themeColors.primary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 10,
  },
  questionCard: {
    backgroundColor: themeColors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  questionText: {
    fontSize: 17,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 12,
    lineHeight: 24,
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    backgroundColor: themeColors.white,
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    color: themeColors.text,
    flex: 1,
    marginRight: 8,
  },
  correctOption: {
    backgroundColor: themeColors.success + '20',
    borderColor: themeColors.success,
  },
  incorrectOption: {
    backgroundColor: themeColors.incorrect + '20',
    borderColor: themeColors.incorrect,
  },
  correctText: {
    color: themeColors.success,
    fontWeight: '600',
  },
  incorrectText: {
    color: themeColors.incorrect,
    fontWeight: '600',
  },
  explanationContainer: {
    backgroundColor: themeColors.lightPrimary + 'E0',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  explanationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: themeColors.darkText,
    marginBottom: 4,
  },
  explanationText: {
    fontSize: 13,
    color: themeColors.text,
    lineHeight: 18,
    marginBottom: 10,
  },
  nextButton: {
    backgroundColor: themeColors.primary,
    borderRadius: 8,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: themeColors.white,
    fontSize: 15,
    fontWeight: '600',
    marginRight: 8,
  },
});