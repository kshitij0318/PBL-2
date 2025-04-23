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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';

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
};

const Message = ({ text, isUser }) => (
  <View style={[
    styles.messageContainer,
    isUser ? styles.userMessage : styles.botMessage
  ]}>
    {isUser ? (
      <Text style={styles.userMessageText}>{text}</Text>
    ) : (
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
    )}
  </View>
);

export default function ChatBotScreen() {
  const [messages, setMessages] = useState([
    {
      text: "Hello! I'm your pregnancy care assistant. How can I help you today?",
      isUser: false,
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollViewRef = useRef();

  const handleSend = async () => {
    if (!inputText.trim()) return;

    const userMessage = inputText.trim();
    setInputText('');
    Keyboard.dismiss();

    // Add user message to chat
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);

    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: userMessage }),
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        setMessages(prev => [...prev, { text: data.response, isUser: false }]);
      } else {
        setMessages(prev => [...prev, {
          text: "I'm sorry, I couldn't process your request at the moment. Please try again.",
          isUser: false
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        text: "I'm sorry, I'm having trouble connecting. Please check your connection and try again.",
        isUser: false
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollViewRef.current.scrollToEnd({ animated: true })}
      >
        {messages.map((message, index) => (
          <Message key={index} text={message.text} isUser={message.isUser} />
        ))}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={themeColors.primary} />
          </View>
        )}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxHeight={100}
        />
        <TouchableOpacity
          style={styles.sendButton}
          onPress={handleSend}
          disabled={!inputText.trim() || isLoading}
        >
          <Ionicons
            name="send"
            size={24}
            color={inputText.trim() && !isLoading ? themeColors.primary : themeColors.placeholder}
          />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: themeColors.messageBackground,
  },
  userMessageText: {
    color: themeColors.white,
    fontSize: 16,
  },
  botMessageText: {
    color: themeColors.text,
    fontSize: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: themeColors.white,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  input: {
    flex: 1,
    backgroundColor: themeColors.lightBackground,
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100,
  },
  sendButton: {
    padding: 8,
  },
}); 