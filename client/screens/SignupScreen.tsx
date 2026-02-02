import React, { useState, useCallback, memo } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type Role = "admin" | "participant";

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
      onPress={() => {
        onSelect(role);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
      style={[
        styles.roleTab,
        selected && {
          backgroundColor: theme.backgroundDefault,
          ...Shadows.sm
        },
      ]}
    >
      <ThemedText
        type="small"
        style={[
          styles.roleText,
          selected && { color: theme.primary, fontWeight: "700" },
          !selected && { opacity: 0.6 }
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
});

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
  ];

  const handleSignup = useCallback(async () => {
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
  }, [name, email, password, confirmPassword, selectedRole, signup]);

  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole(role);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <LinearGradient
        colors={[theme.primary + '15', 'transparent', theme.primary + '03']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing["xl"], paddingBottom: insets.bottom + Spacing["2xl"] },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.header}>
          <ThemedText type="h1" style={styles.title}>
            Create Account
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Join the global event community
          </ThemedText>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(800).springify()} style={styles.formSection}>
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
              label="FULL NAME"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
              style={styles.input}
            />
            <Input
              label="EMAIL ADDRESS"
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
            />
            <Input
              label="PASSWORD"
              placeholder="Min 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
            />
            <Input
              label="CONFIRM PASSWORD"
              placeholder="Repeat password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoComplete="new-password"
              style={styles.input}
            />

            {error ? (
              <Animated.View entering={FadeInDown}>
                <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                  {error}
                </ThemedText>
              </Animated.View>
            ) : null}

            <Button
              onPress={handleSignup}
              disabled={isLoading}
              style={styles.button}
              textStyle={{ fontWeight: '800', letterSpacing: 1 }}
            >
              {isLoading ? <ActivityIndicator color="#fff" size="small" /> : "JOIN NOW"}
            </Button>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(800).springify()} style={styles.footer}>
          <ThemedText type="body" style={styles.footerText}>
            Already have an account?{" "}
          </ThemedText>
          <Pressable onPress={() => {
            navigation.goBack();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}>
            <ThemedText type="link" style={{ fontWeight: '700' }}>Sign In</ThemedText>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    flexGrow: 1,
  },
  header: {
    marginBottom: Spacing["2xl"],
    alignItems: "center",
  },
  title: {
    marginBottom: Spacing.xs,
    textAlign: "center",
    fontWeight: '900',
  },
  subtitle: {
    opacity: 0.6,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  formSection: {
    width: '100%',
  },
  roleContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.lg,
    padding: 6,
    marginBottom: Spacing.xl,
    ...Shadows.sm,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: BorderRadius.md,
  },
  roleText: {
    fontSize: 12,
    letterSpacing: 0.5,
  },
  form: {
    gap: Spacing.lg,
  },
  input: {
    height: 56,
    borderRadius: BorderRadius.md,
  },
  error: {
    textAlign: "center",
    fontWeight: '600',
  },
  button: {
    marginTop: Spacing.md,
    height: 56,
    borderRadius: BorderRadius.md,
    ...Shadows.md,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: 'center',
    marginTop: Spacing["2xl"],
  },
  footerText: {
    opacity: 0.5,
  },
});
