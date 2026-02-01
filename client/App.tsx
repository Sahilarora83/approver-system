import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, Platform, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Font from "expo-font";
import { Feather, Ionicons, MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator from "@/navigation/RootStackNavigator";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { Colors } from "@/constants/theme";

SplashScreen.preventAutoHideAsync();

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
  
  try {
    const { KeyboardProvider } = require("react-native-keyboard-controller");
    return (
      <KeyboardProvider>
        <AppContent />
      </KeyboardProvider>
    );
  } catch {
    return <AppContent />;
  }
}

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Font.loadAsync({
          ...Feather.font,
          ...Ionicons.font,
          ...MaterialIcons.font,
          ...MaterialCommunityIcons.font,
        });
      } catch (e) {
        console.warn("Error loading fonts:", e);
      } finally {
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <LoadingScreen />;
  }

  return (
    <View style={styles.root} onLayout={onLayoutRootView}>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AppWithKeyboard />
          </AuthProvider>
        </QueryClientProvider>
      </ErrorBoundary>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundRoot,
  },
});
