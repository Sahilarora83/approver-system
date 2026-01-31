import React, { useState, useCallback, memo } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius } from "@/constants/theme";

type Role = "admin" | "participant" | "verifier";

const RoleTab = memo(function RoleTab({
  role,
  label,
  selected,
  onSelect,
  theme,
}: {
  role: Role;
  label: string;
  selected: boolean;
  onSelect: (role: Role) => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={() => onSelect(role)}
      style={[
        styles.roleTab,
        selected && { backgroundColor: theme.backgroundDefault },
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.roleText,
          selected && { color: theme.primary, fontWeight: "600" },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
});

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>("participant");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const roles: { key: Role; label: string }[] = [
    { key: "admin", label: "Admin" },
    { key: "participant", label: "Participant" },
    { key: "verifier", label: "Verifier" },
  ];

  const handleLogin = useCallback(async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  }, [email, password, login]);

  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole(role);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing["3xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h1" style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Sign in to manage your events and tickets
          </ThemedText>
        </View>

        <View style={[styles.roleContainer, { backgroundColor: theme.backgroundSecondary }]}>
          {roles.map((role) => (
            <RoleTab
              key={role.key}
              role={role.key}
              label={role.label}
              selected={selectedRole === role.key}
              onSelect={handleRoleSelect}
              theme={theme}
            />
          ))}
        </View>

        <View style={styles.form}>
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
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />

          {error ? (
            <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
              {error}
            </ThemedText>
          ) : null}

          <Button onPress={handleLogin} disabled={isLoading} style={styles.button}>
            {isLoading ? <ActivityIndicator color="#fff" size="small" /> : "Sign In"}
          </Button>
        </View>

        <View style={styles.footer}>
          <ThemedText type="body" style={styles.footerText}>
            Don't have an account?{" "}
          </ThemedText>
          <Pressable onPress={() => navigation.navigate("Signup")}>
            <ThemedText type="link">Sign Up</ThemedText>
          </Pressable>
        </View>
      </ScrollView>
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
