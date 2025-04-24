import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { useFocusEffect } from '@react-navigation/native';

const themeColors = {
  primary: '#7A7FFC',
  lightPrimary: '#E8E9FF',
  lightBackground: '#F0F4FF',
  white: '#FFFFFF',
  text: '#333',
  darkText: '#1E1E1E',
  placeholder: '#A0A0A0',
  messageBackground: '#F5F5F5',
  userMessageBackground: '#7A7FFC',
  timestamp: '#888888',
  headerBackground: '#7A7FFC',
};

const Message = ({ text, isUser, timestamp }) => (
  <View style={[
    styles.messageContainer,
    isUser ? styles.userMessage : styles.botMessage
  ]}>
    {isUser ? (
      <>
        <Text style={styles.userMessageText}>{text}</Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </>
    ) : (
      <>
        <Markdown
          style={{
            body: styles.botMessageText,
            bullet: styles.botMessageText,
            link: [styles.botMessageText, { textDecorationLine: 'underline' }],
            strong: [styles.botMessageText, { fontWeight: 'bold' }],
          }}
        >
          {text}
        </Markdown>
        <Text style={styles.timestamp}>{timestamp}</Text>
      </>
    )}
  </View>
);

export default function ChatBotScreen({ navigation }) {
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm your pregnancy care assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

  useFocusEffect(
    React.useCallback(() => {
      const timeoutId = setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollToEnd({ animated: true });
        }
      }, 100);
      return () => clearTimeout(timeoutId);
    }, [messages])
  );

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setInputText('');
    Keyboard.dismiss();

    // Add user message to chat
    setMessages(prev => [...prev, { text: userMessage, isUser: true, timestamp }]);

    setIsLoading(true);
    try {
      const response = await fetch('https://symbihelp.onrender.com/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        const botTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, { text: data.response, isUser: false, timestamp: botTimestamp }]);
      } else {
        const errorTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        setMessages(prev => [...prev, {
          text: "I'm sorry, I couldn't process your request at the moment. Please try again.",
          isUser: false,
          timestamp: errorTimestamp
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorTimestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setMessages(prev => [...prev, {
        text: "I'm sorry, I'm having trouble connecting. Please check your connection and try again.",
        isUser: false,
        timestamp: errorTimestamp
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color={themeColors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat Assistant</Text>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.messagesOuterContainer}>
          <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            contentContainerStyle={styles.messagesContent}
            onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: false })}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {messages.map((message, index) => (
              <Message 
                key={index} 
                text={message.text} 
                isUser={message.isUser} 
                timestamp={message.timestamp}
              />
            ))}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={themeColors.primary} />
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Type your message..."
            placeholderTextColor={themeColors.placeholder}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxHeight={80}
            onFocus={() => {
              setTimeout(() => {
                scrollViewRef.current.scrollToEnd({ animated: true });
              }, 200);
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!inputText.trim() || isLoading) && styles.sendButtonDisabled
            ]}
            onPress={handleSend}
            disabled={!inputText.trim() || isLoading}
          >
            <Ionicons
              name="send"
              size={24}
              color={inputText.trim() && !isLoading ? themeColors.white : themeColors.placeholder}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: themeColors.headerBackground,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: themeColors.headerBackground,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: themeColors.white,
  },
  container: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  messagesOuterContainer: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
  },
  messagesContainer: {
    flex: 1,
    padding: 15,
  },
  messagesContent: {
    paddingBottom: 10,
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 5,
    padding: 12,
    borderRadius: 15,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: themeColors.userMessageBackground,
    borderTopRightRadius: 4,
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.messageBackground,
    borderTopLeftRadius: 4,
  },
  userMessageText: {
    color: themeColors.white,
    fontSize: 16,
    marginBottom: 4,
  },
  botMessageText: {
    color: themeColors.text,
    fontSize: 16,
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 11,
    color: themeColors.timestamp,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  inputContainer: {
    backgroundColor: themeColors.white,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  input: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingTop: 10,
    paddingBottom: 10,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 80,
    color: themeColors.text,
    minHeight: 40,
  },
  sendButton: {
    backgroundColor: themeColors.primary,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: themeColors.lightPrimary,
  },
}); 