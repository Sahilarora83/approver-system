import React from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, BorderRadius } from "@/constants/theme";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {

  const handleRestart = async () => {
    try {
      await reloadAppAsync();
    } catch (restartError) {
      console.error("Failed to restart app:", restartError);
      resetError();
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="warning-outline" size={48} color="#EF4444" />
      </View>

      <ThemedText style={styles.title}>OOPS!</ThemedText>
      <ThemedText style={styles.subtitle}>Something went wrong.</ThemedText>

      <ThemedText style={styles.message}>
        We encountered an unexpected error.{"\n"}Please try restarting the app.
      </ThemedText>

      <Pressable style={styles.button} onPress={handleRestart}>
        <ThemedText style={styles.buttonText}>Restart App</ThemedText>
      </Pressable>

      {__DEV__ && (
        <View style={styles.devBox}>
          <ThemedText style={styles.devText}>{error.toString()}</ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    backgroundColor: "#111827",
  },
  iconContainer: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    justifyContent: "center", alignItems: "center",
    marginBottom: 24,
    borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)"
  },
  title: {
    fontSize: 32, fontWeight: "900", color: "#FFF",
    marginBottom: 8, letterSpacing: 1
  },
  subtitle: {
    fontSize: 18, color: "#9CA3AF", fontWeight: "600",
    marginBottom: 24
  },
  message: {
    textAlign: "center", color: "#6B7280",
    marginBottom: 40, lineHeight: 22
  },
  button: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 32, paddingVertical: 16,
    borderRadius: 16,
    width: "100%", alignItems: "center",
    shadowColor: "#6366F1", shadowOpacity: 0.3, shadowRadius: 10,
    elevation: 4
  },
  buttonText: {
    color: "#FFF", fontSize: 16, fontWeight: "bold"
  },
  devBox: {
    marginTop: 40, padding: 16, backgroundColor: "#000",
    borderRadius: 8, width: "100%"
  },
  devText: { color: "#EF4444", fontFamily: "monospace", fontSize: 12 }
});
