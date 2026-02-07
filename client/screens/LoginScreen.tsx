import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView, TextInput } from "react-native";
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

// ✅ Email validation
const isValidEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// ✅ Sanitize errors
const sanitizeError = (error: any) => {
  const message = error?.message?.toLowerCase() || "";

  if (message.includes("user") || message.includes("password")) {
    return "Invalid email or password";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Connection error. Please check your internet.";
  }
  if (message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  return "Login failed. Please try again.";
};

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

export default function LoginScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const passwordRef = useRef(""); // ✅ Don't store password in state
  const [selectedRole, setSelectedRole] = useState<Role>("participant");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Rate limiting
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);

  // ✅ Input refs for keyboard navigation
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);

  // ✅ Cleanup lockout timer
  useEffect(() => {
    if (!lockoutUntil) return;

    const timer = setInterval(() => {
      if (Date.now() >= lockoutUntil) {
        setLockoutUntil(null);
        setAttemptCount(0);
        setError("");
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutUntil]);

  const roles: { key: Role; label: string }[] = [
    { key: "admin", label: "Admin" },
    { key: "participant", label: "Participant" },
  ];

  const handleLogin = useCallback(async () => {
    let isMounted = true;

    // ✅ Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${remainingSeconds}s`);
      return;
    }

    // ✅ Validation
    if (!email.trim() || !passwordRef.current.trim()) {
      setError("Please fill in all fields");
      return;
    }

    if (!isValidEmail(email.trim())) {
      setError("Please enter a valid email address");
      return;
    }

    if (passwordRef.current.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email.trim(), passwordRef.current, selectedRole);

      if (!isMounted) return;

      // ✅ Clear password immediately after successful login
      passwordRef.current = "";
      setAttemptCount(0);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (!isMounted) return;

      const newCount = attemptCount + 1;
      setAttemptCount(newCount);

      // ✅ Rate limiting: Lock after 5 failed attempts
      if (newCount >= 5) {
        const lockTime = Date.now() + 30000; // 30 seconds
        setLockoutUntil(lockTime);
        setError("Too many failed attempts. Locked for 30 seconds.");
      } else {
        setError(sanitizeError(err));
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      if (isMounted) {
        setIsLoading(false);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [email, selectedRole, login, attemptCount, lockoutUntil]);

  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole(role);
  }, []);

  const isButtonDisabled = isLoading || !!lockoutUntil;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <LinearGradient
        colors={[theme.primary + '20', 'transparent', theme.primary + '05']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { flexGrow: 1, paddingBottom: insets.bottom + Spacing["3xl"] }
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ height: insets.top + Spacing["3xl"] }} />
          <Animated.View entering={FadeInUp.duration(800).springify()} style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
              <ThemedText style={styles.logoText}>G</ThemedText>
            </View>
            <ThemedText type="h1" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText type="body" style={styles.subtitle}>
              Sign in to your account
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
                ref={emailInputRef}
                label="EMAIL ADDRESS"
                placeholder="name@example.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                style={styles.input}
              />
              <Input
                ref={passwordInputRef}
                label="PASSWORD"
                placeholder="••••••••"
                onChangeText={(text) => {
                  passwordRef.current = text;
                }}
                secureTextEntry
                autoComplete="password"
                textContentType="oneTimeCode" // ✅ Prevents autofill leaks
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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
                onPress={handleLogin}
                disabled={isButtonDisabled}
                style={[
                  styles.button,
                  isButtonDisabled && { opacity: 0.5 }
                ]}
                textStyle={{ fontWeight: '800', letterSpacing: 1 }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : lockoutUntil ? (
                  `Locked (${Math.ceil((lockoutUntil - Date.now()) / 1000)}s)`
                ) : (
                  "SIGN IN"
                )}
              </Button>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(400).duration(800).springify()} style={styles.footer}>
            <ThemedText type="body" style={styles.footerText}>
              New here?{" "}
            </ThemedText>
            <Pressable onPress={() => {
              navigation.navigate("Signup");
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }}>
              <ThemedText type="link" style={{ fontWeight: '700' }}>Create Account</ThemedText>
            </Pressable>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1, justifyContent: 'center' },
  header: { marginBottom: Spacing["3xl"], alignItems: "center" },
  logoCircle: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg, ...Shadows.md },
  logoText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  title: { marginBottom: Spacing.xs, textAlign: "center", fontWeight: '900' },
  subtitle: { opacity: 0.6, textAlign: "center", letterSpacing: 0.5 },
  formSection: { width: '100%' },
  roleContainer: { flexDirection: "row", borderRadius: BorderRadius.lg, padding: 6, marginBottom: Spacing.xl, ...Shadows.sm },
  roleTab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: BorderRadius.md },
  roleText: { fontSize: 12, letterSpacing: 0.5 },
  form: { gap: Spacing.xl },
  input: { height: 56, borderRadius: BorderRadius.md },
  error: { textAlign: "center", fontWeight: '600' },
  button: { marginTop: Spacing.md, height: 56, borderRadius: BorderRadius.md, ...Shadows.md },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: 'center', marginTop: Spacing["3xl"] },
  footerText: { opacity: 0.5 },
});
