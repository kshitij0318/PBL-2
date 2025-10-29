import React from 'react';
import { SafeAreaView, ScrollView, View, StyleSheet, StatusBar } from 'react-native';
import { useTheme } from '../utils/ThemeContext';

export default function Screen({ children, scrollable = true, contentStyle, style, statusBarLight = false }) {
  const { theme, isDarkMode } = useTheme();
  const Container = scrollable ? ScrollView : View;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.lightBackground }, style]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.lightBackground}
      />
      <Container style={[styles.content, contentStyle]} showsVerticalScrollIndicator={false}>
        {children}
      </Container>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});


