import React, { useState } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type Role = "admin" | "participant" | "verifier";

export default function SignupScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { signup } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("participant");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const roles: { key: Role; label: string }[] = [
    { key: "admin", label: "Admin" },
    { key: "participant", label: "Participant" },
    { key: "verifier", label: "Verifier" },
  ];

  const handleSignup = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await signup(email.trim(), password, name.trim(), selectedRole);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Signup failed. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
      >
        <View style={styles.header}>
          <ThemedText type="h1" style={styles.title}>
            Create Account
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Join to create events or register for tickets
          </ThemedText>
        </View>

        <View style={[styles.roleContainer, { backgroundColor: theme.backgroundSecondary }]}>
          {roles.map((role) => (
            <Pressable
              key={role.key}
              onPress={() => setSelectedRole(role.key)}
              style={[
                styles.roleTab,
                selectedRole === role.key && {
                  backgroundColor: theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={[
                  styles.roleText,
                  selectedRole === role.key && { color: theme.primary, fontWeight: "600" },
                ]}
              >
                {role.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>

        <View style={styles.form}>
          <Input
            label="Full Name"
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoComplete="name"
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
          />
          <Input
            label="Confirm Password"
            placeholder="Confirm your password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
          />

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
              {error}
            </ThemedText>
          ) : null}

          <Button onPress={handleSignup} disabled={isLoading} style={styles.button}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : "Create Account"}
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={styles.footerText}>
            Already have an account?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.goBack()}>
            <ThemedText type="link">Sign In</ThemedText>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing["2xl"],
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing["3xl"],
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  subtitle: {
    opacity: 0.7,
    textAlign: "center",
  },
  roleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.md,
    padding: Spacing.xs,
    marginBottom: Spacing["2xl"],
  },
  roleTab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.sm,
  },
  roleText: {
    fontWeight: "500",
  },
  form: {
    gap: Spacing.lg,
  },
  error: {
    textAlign: "center",
  },
  button: {
    marginTop: Spacing.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing["3xl"],
  },
  footerText: {
    opacity: 0.7,
  },
});
