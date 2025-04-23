// src/screens/TestScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScoreDisplay from '../components/ScoreDisplay';

const themeColors = {
  primary: '#7A7FFC',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  error: '#dc3545',
  disabled: '#B0B0B0',
  cardBorder: '#E0E5F0',
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
    correctAnswer: 1
  },
  {
    question: "What is the purpose of using a birthing ball?",
    options: [
      "To bounce for entertainment",
      "To support different labor positions",
      "To exercise during labor",
      "To rest on between contractions"
    ],
    correctAnswer: 1
  },
  {
    question: "Which yoga pose can help with back pain during labor?",
    options: [
      "Headstand",
      "Cat-Cow Pose",
      "Warrior Pose",
      "Tree Pose"
    ],
    correctAnswer: 1
  },
  {
    question: "What is the main benefit of Lamaze breathing?",
    options: [
      "To make you sleepy",
      "To help manage contractions",
      "To speed up labor",
      "To slow down labor"
    ],
    correctAnswer: 1
  },
  {
    question: "When should you start practicing comfort techniques?",
    options: [
      "Only during labor",
      "During pregnancy",
      "After labor begins",
      "In the delivery room"
    ],
    correctAnswer: 1
  },
  {
    question: "Which position is NOT recommended during labor?",
    options: [
      "Walking",
      "Lying flat on back",
      "Squatting",
      "Side-lying"
    ],
    correctAnswer: 1
  },
  {
    question: "What is the purpose of Shiatsu during labor?",
    options: [
      "Entertainment",
      "Pain relief",
      "Exercise",
      "Distraction"
    ],
    correctAnswer: 1
  },
  {
    question: "How often should you change positions during labor?",
    options: [
      "Never",
      "Every 30-60 minutes",
      "Once every 4 hours",
      "Only when told"
    ],
    correctAnswer: 1
  },
  {
    question: "Which breathing pattern is used during intense contractions?",
    options: [
      "Normal breathing",
      "Pattern breathing",
      "Holding breath",
      "No breathing"
    ],
    correctAnswer: 1
  },
  {
    question: "What is the benefit of upright positions during labor?",
    options: [
      "More comfortable for caregivers",
      "Helps gravity assist labor",
      "Makes monitoring easier",
      "Reduces labor time"
    ],
    correctAnswer: 1
  },
  {
    question: "When using a birthing ball, what should you check first?",
    options: [
      "The color",
      "The stability and size",
      "The brand",
      "The texture"
    ],
    correctAnswer: 1
  },
  {
    question: "Which is a sign that you're breathing correctly?",
    options: [
      "Feeling dizzy",
      "Feeling relaxed",
      "Holding your breath",
      "Rapid breathing"
    ],
    correctAnswer: 1
  },
  {
    question: "What should you do between contractions?",
    options: [
      "Hold your breath",
      "Rest and relax",
      "Exercise intensely",
      "Practice breathing"
    ],
    correctAnswer: 1
  },
  {
    question: "Which comfort measure can help with back labor?",
    options: [
      "Lying still",
      "Counter-pressure",
      "Rapid walking",
      "Holding breath"
    ],
    correctAnswer: 1
  },
  {
    question: "What is the purpose of focused breathing?",
    options: [
      "To fall asleep",
      "To manage pain and anxiety",
      "To speed up labor",
      "To slow down labor"
    ],
    correctAnswer: 1
  },
  {
    question: "When should you stop using comfort techniques?",
    options: [
      "When they work well",
      "When you feel tired",
      "Never - use as needed",
      "After 1 hour"
    ],
    correctAnswer: 2
  },
  {
    question: "Which is NOT a benefit of movement during labor?",
    options: [
      "Pain relief",
      "Faster delivery",
      "Better positioning",
      "More interventions"
    ],
    correctAnswer: 3
  },
  {
    question: "What should you do if a technique isn't working?",
    options: [
      "Keep using it anyway",
      "Give up on all techniques",
      "Try a different one",
      "Take a long break"
    ],
    correctAnswer: 2
  }
];

export default function TestScreen({ navigation }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showScore, setShowScore] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);

  // Initialize test with random questions
  const startTest = () => {
    const shuffled = [...questionsBank].sort(() => 0.5 - Math.random());
    setSelectedQuestions(shuffled.slice(0, 15));
    setCurrentQuestion(0);
    setScore(0);
    setShowScore(false);
  };

  // Handle answer selection
  const handleAnswerSelect = (selectedOption) => {
    if (selectedOption === selectedQuestions[currentQuestion].correctAnswer) {
      setScore(score + 1);
    }

    if (currentQuestion < 14) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowScore(true);
    }
  };

  // Handle retaking the test
  const handleRetake = () => {
    startTest();
  };

  // Start the test immediately when component mounts
  React.useEffect(() => {
    startTest();
  }, []);

  if (showScore) {
    return <ScoreDisplay 
      score={score} 
      total={15} 
      navigation={navigation}
      onRetake={handleRetake}
    />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {selectedQuestions.length > 0 && (
          <>
            <View style={styles.header}>
              <Text style={styles.questionCount}>Question {currentQuestion + 1}/15</Text>
              <Text style={styles.headerText}>{selectedQuestions[currentQuestion].question}</Text>
            </View>

            <View style={styles.optionsContainer}>
              {selectedQuestions[currentQuestion].options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.optionButton}
                  onPress={() => handleAnswerSelect(index)}
                >
                  <Text style={styles.optionText}>{option}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  scrollContent: {
    padding: 20,
    flexGrow: 1,
  },
  header: {
    marginBottom: 30,
  },
  questionCount: {
    fontSize: 16,
    color: themeColors.primary,
    fontWeight: '600',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: themeColors.darkText,
    lineHeight: 30,
  },
  optionsContainer: {
    marginTop: 20,
  },
  optionButton: {
    backgroundColor: themeColors.white,
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: themeColors.cardBorder,
  },
  optionText: {
    fontSize: 16,
    color: themeColors.text,
    lineHeight: 24,
  }
});
