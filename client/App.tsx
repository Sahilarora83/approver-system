import React from "react";
import { StyleSheet, Platform } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";

function AppContent() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={styles.root}>
        <NavigationContainer>
          <RootStackNavigator />
        </NavigationContainer>
        <StatusBar style="auto" />
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

function AppWithKeyboard() {
  if (Platform.OS === "web") {
    return <AppContent />;
  }
  
  const { KeyboardProvider } = require("react-native-keyboard-controller");
  
  return (
    <KeyboardProvider>
      <AppContent />
    </KeyboardProvider>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppWithKeyboard />
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
