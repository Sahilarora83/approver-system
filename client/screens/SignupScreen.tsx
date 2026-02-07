import React, { useState, useCallback, useRef, useEffect, memo } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { debounce } from "lodash";
import { ThemedText } from "@/components/ThemedText";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type Role = "admin" | "participant";

// ✅ Email validation
const isValidEmail = (email: string) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// ✅ Name validation
const validateName = (name: string) => {
  if (!name.trim()) return "Name is required";
  if (name.trim().length < 2) return "Name must be at least 2 characters";
  if (name.length > 50) return "Name must be less than 50 characters";

  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(name)) {
    return "Name can only contain letters, spaces, hyphens, and apostrophes";
  }

  const dangerousPatterns = ['<script', 'javascript:', 'onerror='];
  if (dangerousPatterns.some(pattern => name.toLowerCase().includes(pattern))) {
    return "Invalid characters in name";
  }

  return null;
};

// ✅ Email validation
const validateEmail = (email: string) => {
  if (!email.trim()) return "Email is required";
  if (!isValidEmail(email.trim())) return "Please enter a valid email address";

  const disposableDomains = ["tempmail.com", "guerrillamail.com", "10minutemail.com"];
  const domain = email.split("@")[1]?.toLowerCase();
  if (disposableDomains.includes(domain)) {
    return "Disposable email addresses are not allowed";
  }

  return null;
};

// ✅ Password validation
const validatePassword = (password: string) => {
  if (password.length < 8) return "Password must be at least 8 characters";

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase || !hasLowerCase) {
    return "Password must contain both uppercase and lowercase letters";
  }
  if (!hasNumber) return "Password must contain at least one number";
  if (!hasSpecialChar) return "Password must contain at least one special character";

  const weakPasswords = ["password", "12345678", "qwerty123", "admin123"];
  if (weakPasswords.some(weak => password.toLowerCase().includes(weak))) {
    return "Password is too common";
  }

  return null;
};

// ✅ Password strength calculator
const calculatePasswordStrength = (password: string) => {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;

  if (score <= 2) return "weak";
  if (score <= 4) return "medium";
  return "strong";
};

// ✅ Sanitize errors
const sanitizeError = (error: any) => {
  const message = error?.message?.toLowerCase() || "";

  if (message.includes("already exists") || message.includes("duplicate")) {
    return "This email is already registered. Please sign in instead.";
  }
  if (message.includes("network") || message.includes("fetch")) {
    return "Connection error. Please check your internet.";
  }
  if (message.includes("timeout")) {
    return "Request timed out. Please try again.";
  }

  return "Signup failed. Please try again.";
};

const RoleTab = memo(function RoleTab({
  role, label, selected, onSelect, theme
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
        selected && { backgroundColor: theme.backgroundDefault, ...Shadows.sm }
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
  const passwordRef = useRef(""); // ✅ Don't store in state
  const confirmPasswordRef = useRef("");
  const [selectedRole, setSelectedRole] = useState<Role>("participant");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // ✅ Rate limiting
  const [attemptCount, setAttemptCount] = useState(0);
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null);
  const [lastAttemptTime, setLastAttemptTime] = useState(0);

  // ✅ Email availability
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  // ✅ Password strength
  const [passwordStrength, setPasswordStrength] = useState<"weak" | "medium" | "strong" | null>(null);

  // ✅ Terms acceptance
  const [termsAccepted, setTermsAccepted] = useState(false);

  // ✅ Input refs
  const nameInputRef = useRef<TextInput>(null);
  const emailInputRef = useRef<TextInput>(null);
  const passwordInputRef = useRef<TextInput>(null);
  const confirmPasswordInputRef = useRef<TextInput>(null);

  const roles: { key: Role; label: string }[] = [
    { key: "admin", label: "Admin" },
    { key: "participant", label: "Participant" },
  ];

  // ✅ Email availability check with debouncing
  const checkEmailAvailability = useCallback(
    debounce(async (email: string) => {
      if (!isValidEmail(email)) {
        setEmailAvailable(null);
        return;
      }

      setIsCheckingEmail(true);
      try {
        const res = await apiRequest("POST", "/api/auth/check-email", { email });
        const data = await res.json();
        setEmailAvailable(data.available);
      } catch (e) {
        setEmailAvailable(null);
      } finally {
        setIsCheckingEmail(false);
      }
    }, 500),
    []
  );

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

  const handleSignup = useCallback(async () => {
    let isMounted = true;

    // ✅ Check lockout
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingSeconds = Math.ceil((lockoutUntil - Date.now()) / 1000);
      setError(`Too many attempts. Try again in ${remainingSeconds}s`);
      return;
    }

    // ✅ Rate limiting
    const now = Date.now();
    const timeSinceLastAttempt = now - lastAttemptTime;

    if (timeSinceLastAttempt < 20000 && attemptCount >= 3) {
      setError("Please wait before trying again");
      return;
    }

    // ✅ Validation
    const nameError = validateName(name);
    if (nameError) {
      setError(nameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    if (emailAvailable === false) {
      setError("This email is already registered");
      return;
    }

    const passwordError = validatePassword(passwordRef.current);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (passwordRef.current !== confirmPasswordRef.current) {
      setError("Passwords do not match");
      return;
    }

    if (!termsAccepted) {
      setError("Please accept the Terms of Service and Privacy Policy");
      return;
    }

    setIsLoading(true);
    setError("");
    setLastAttemptTime(now);

    try {
      await signup(email.trim(), passwordRef.current, name.trim(), selectedRole);

      if (!isMounted) return;

      // ✅ Clear sensitive data
      passwordRef.current = "";
      confirmPasswordRef.current = "";
      setAttemptCount(0);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (!isMounted) return;

      const newCount = attemptCount + 1;
      setAttemptCount(newCount);

      // ✅ Exponential lockout
      if (newCount >= 3) {
        const lockDuration = Math.pow(2, newCount - 3) * 30000;
        const lockTime = Date.now() + lockDuration;
        setLockoutUntil(lockTime);
        setError(`Too many attempts. Locked for ${lockDuration / 1000}s`);
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
  }, [name, email, selectedRole, signup, attemptCount, lockoutUntil, lastAttemptTime, emailAvailable, termsAccepted]);

  const handleRoleSelect = useCallback((role: Role) => {
    setSelectedRole(role);
  }, []);

  const isButtonDisabled = isLoading || !!lockoutUntil || emailAvailable === false;

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <LinearGradient
        colors={[theme.primary + '15', 'transparent', theme.primary + '03']}
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
                ref={nameInputRef}
                label="FULL NAME"
                placeholder="John Doe"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                autoComplete="name"
                returnKeyType="next"
                onSubmitEditing={() => emailInputRef.current?.focus()}
                style={styles.input}
              />

              <View>
                <Input
                  ref={emailInputRef}
                  label="EMAIL ADDRESS"
                  placeholder="name@example.com"
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    checkEmailAvailability(text);
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordInputRef.current?.focus()}
                  style={styles.input}
                  rightIcon={
                    isCheckingEmail ? (
                      <ActivityIndicator size="small" />
                    ) : emailAvailable === false ? (
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    ) : emailAvailable === true ? (
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    ) : null
                  }
                />
                {emailAvailable === false && (
                  <ThemedText style={{ color: theme.error, fontSize: 12, marginTop: 4 }}>
                    Email already registered. Try signing in?
                  </ThemedText>
                )}
              </View>

              <View>
                <Input
                  ref={passwordInputRef}
                  label="PASSWORD"
                  placeholder="Min 8 characters"
                  onChangeText={(text) => {
                    passwordRef.current = text;
                    setPasswordStrength(calculatePasswordStrength(text));
                  }}
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="oneTimeCode"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
                  style={styles.input}
                />
                {passwordRef.current.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarContainer}>
                      <View style={[
                        styles.strengthBar,
                        passwordStrength === "weak" && { backgroundColor: "#EF4444", width: "33%" },
                        passwordStrength === "medium" && { backgroundColor: "#F59E0B", width: "66%" },
                        passwordStrength === "strong" && { backgroundColor: "#10B981", width: "100%" },
                      ]} />
                    </View>
                    <ThemedText style={[
                      styles.strengthText,
                      passwordStrength === "weak" && { color: "#EF4444" },
                      passwordStrength === "medium" && { color: "#F59E0B" },
                      passwordStrength === "strong" && { color: "#10B981" },
                    ]}>
                      {passwordStrength === "weak" && "Weak"}
                      {passwordStrength === "medium" && "Medium"}
                      {passwordStrength === "strong" && "Strong"}
                    </ThemedText>
                  </View>
                )}
              </View>

              <Input
                ref={confirmPasswordInputRef}
                label="CONFIRM PASSWORD"
                placeholder="Repeat password"
                onChangeText={(text) => {
                  confirmPasswordRef.current = text;
                }}
                secureTextEntry
                autoComplete="new-password"
                textContentType="oneTimeCode"
                returnKeyType="done"
                onSubmitEditing={handleSignup}
                style={styles.input}
              />

              {/* ✅ Terms & Privacy */}
              <View style={styles.termsContainer}>
                <Pressable
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  style={styles.checkboxContainer}
                >
                  <Ionicons
                    name={termsAccepted ? "checkbox" : "square-outline"}
                    size={24}
                    color={termsAccepted ? theme.primary : "#6B7280"}
                  />
                  <View style={styles.termsTextContainer}>
                    <ThemedText style={styles.termsText}>
                      I agree to the{" "}
                      <ThemedText
                        style={[styles.termsText, { color: theme.primary, fontWeight: "700" }]}
                        onPress={() => navigation.navigate("TermsOfService")}
                      >
                        Terms of Service
                      </ThemedText>
                      {" "}and{" "}
                      <ThemedText
                        style={[styles.termsText, { color: theme.primary, fontWeight: "700" }]}
                        onPress={() => navigation.navigate("PrivacyPolicy")}
                      >
                        Privacy Policy
                      </ThemedText>
                    </ThemedText>
                  </View>
                </Pressable>
              </View>

              {error ? (
                <Animated.View entering={FadeInDown}>
                  <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
                    {error}
                  </ThemedText>
                </Animated.View>
              ) : null}

              <Button
                onPress={handleSignup}
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
                  "JOIN NOW"
                )}
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24, flexGrow: 1 },
  header: { marginBottom: Spacing["2xl"], alignItems: "center" },
  title: { marginBottom: Spacing.xs, textAlign: "center", fontWeight: '900' },
  subtitle: { opacity: 0.6, textAlign: "center", letterSpacing: 0.5 },
  formSection: { width: '100%' },
  roleContainer: { flexDirection: "row", borderRadius: BorderRadius.lg, padding: 6, marginBottom: Spacing.xl, ...Shadows.sm },
  roleTab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: BorderRadius.md },
  roleText: { fontSize: 12, letterSpacing: 0.5 },
  form: { gap: Spacing.lg },
  input: { height: 56, borderRadius: BorderRadius.md },
  strengthContainer: { marginTop: 8 },
  strengthBarContainer: { height: 4, backgroundColor: "#374151", borderRadius: 2, overflow: "hidden" },
  strengthBar: { height: "100%", borderRadius: 2 },
  strengthText: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  termsContainer: { marginTop: 8 },
  checkboxContainer: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  termsTextContainer: { flex: 1 },
  termsText: { fontSize: 12, color: "#9CA3AF", lineHeight: 18 },
  error: { textAlign: "center", fontWeight: '600' },
  button: { marginTop: Spacing.md, height: 56, borderRadius: BorderRadius.md, ...Shadows.md },
  footer: { flexDirection: "row", justifyContent: "center", alignItems: 'center', marginTop: Spacing["2xl"] },
  footerText: { opacity: 0.5 },
});
