import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Pressable, KeyboardAvoidingView, Platform, Keyboard, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurView } from "expo-blur";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const COLORS = {
  background: "#121421",
  card: "#1C1F35",
  primary: "#3D5CFF",
  text: "#FFFFFF",
  textSecondary: "#A0A4B8",
  accent: "#10B981",
  error: "#FF4B4B",
  inputBg: "#2A2D3E",
};

export default function RegisterEventScreen({ route, navigation }: any) {
  const { eventLink: routeLink } = route?.params || {};
  const [manualLink, setManualLink] = useState("");
  const eventLink = routeLink || manualLink;

  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);
  const [isConsented, setIsConsented] = useState(false);

  useEffect(() => {
    if (user) {
      const initialData: Record<string, string> = { ...formData };
      initialData['name'] = user.name;
      initialData['email'] = user.email;
      setFormData(initialData);
    }
  }, [user]);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["/api/events/public", eventLink],
    enabled: !!eventLink,
  }) as { data: any; isLoading: boolean };

  const { data: registrationStatusData, isLoading: statusLoading } = useQuery({
    queryKey: ["registration-status", event?.id, user?.email],
    queryFn: async () => {
      if (!event?.id || !user?.email) return { registration: null };
      try {
        const url = `/api/events/${event.id}/registration-status?email=${encodeURIComponent(user.email)}`;
        const res = await apiRequest("GET", url);
        return await res.json();
      } catch (error) {
        return { registration: null };
      }
    },
    enabled: !!event?.id && !!user?.email,
    staleTime: 5000,
  }) as { data: any; isLoading: boolean };

  const existingRegistration = registrationStatusData?.registration;
  const registrationStatus = existingRegistration?.status ? String(existingRegistration.status).toLowerCase() : "none";
  const isPending = registrationStatus === "pending";
  const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
  const isRejected = registrationStatus === "rejected";
  const isAlreadyRegistered = isPending || isApproved || isRejected;

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/events/public/${eventLink}/register`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      setRegistrationResult(data);
      queryClient.invalidateQueries({ queryKey: ["registration-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events/public", eventLink] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    onError: (err: any) => {
      setError(err.message || "Registration failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleRegister = () => {
    const requiredFields = (event?.formFields || []).filter((f: any) => f.required);
    for (const field of requiredFields) {
      if (!formData[field.id]?.trim() && !formData[field.label.toLowerCase()]?.trim()) {
        setError(`Please fill in ${field.label}`);
        return;
      }
    }
    if (!isConsented) {
      setError("Please consent to the terms to continue.");
      return;
    }
    setError("");
    registerMutation.mutate({
      name: formData.name || user?.name || "",
      email: formData.email || user?.email || "",
      phone: formData.phone || "",
      formData,
    });
  };

  const handleBack = () => navigation.goBack();

  if (eventLoading || statusLoading) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ThemedView>
    );
  }

  if (isAlreadyRegistered && !success) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, {
            backgroundColor: isPending ? 'rgba(255, 165, 0, 0.1)' :
              isApproved ? 'rgba(16, 185, 129, 0.1)' :
                'rgba(255, 75, 75, 0.1)'
          }]}>
            <Feather
              name={isPending ? "clock" : isApproved ? "check-circle" : "x-circle"}
              size={64}
              color={isPending ? "#FFA500" : COLORS.accent}
            />
          </View>
          <ThemedText style={styles.successTitle}>
            {isPending ? "Application Pending" : isApproved ? "Already Registered!" : "Registration Rejected"}
          </ThemedText>
          <ThemedText style={styles.successSubtitle}>
            {isPending
              ? `Your request to join ${event?.title} is under review.`
              : isApproved
                ? `You're already registered for ${event?.title}.`
                : `Your registration for ${event?.title} was not approved.`
            }
          </ThemedText>
          <Button onPress={() => navigation.navigate("ParticipantMain")} style={styles.viewTicketButton}>
            Go to Home
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (success && registrationResult) {
    const isPendingNew = registrationResult.status === 'pending';
    return (
      <ThemedView style={[styles.container, { backgroundColor: COLORS.background }]}>
        <View style={styles.successContainer}>
          <View style={[styles.successIcon, { backgroundColor: isPendingNew ? 'rgba(255, 165, 0, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
            <Feather name={isPendingNew ? "clock" : "check-circle"} size={64} color={isPendingNew ? "#FFA500" : COLORS.accent} />
          </View>
          <ThemedText style={styles.successTitle}>{isPendingNew ? "Application Submitted!" : "Registration Complete!"}</ThemedText>
          <Button onPress={() => navigation.navigate("ParticipantMain")} style={styles.viewTicketButton}>
            Go to Home
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (!eventLink) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: COLORS.background, padding: 20, justifyContent: 'center' }]}>
        <ThemedText type="h2" style={{ textAlign: 'center', marginBottom: 20 }}>Invalid Registration Link</ThemedText>
        <Button onPress={handleBack}>Go Back</Button>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Feather name="x" size={24} color="#FFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>Register</ThemedText>
        <View style={{ width: 44 }} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.formContainer}>
            <ThemedText style={styles.sectionHeading}>Your Info</ThemedText>
            <View style={styles.profileSnippet}>
              <View style={styles.avatarLarge}><ThemedText style={styles.avatarInitial}>{user?.name?.[0] || 'U'}</ThemedText></View>
              <View style={styles.profileInfo}>
                <ThemedText style={styles.profileName}>{user?.name}</ThemedText>
                <ThemedText style={styles.profileEmail}>{user?.email}</ThemedText>
              </View>
            </View>
            <View style={styles.formFields}>
              {(event?.formFields || []).map((field: any) => (
                <View key={field.id} style={styles.inputGroup}>
                  <ThemedText style={styles.inputLabel}>{field.label}{field.required ? " *" : ""}</ThemedText>
                  <Input
                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                    value={formData[field.id] || (field.id === 'email' ? user?.email : field.id === 'name' ? user?.name : "")}
                    onChangeText={(text) => setFormData({ ...formData, [field.id]: text })}
                    editable={field.id !== 'email' && field.id !== 'name'}
                    style={styles.customInput}
                  />
                </View>
              ))}
              <Pressable style={styles.consentRow} onPress={() => setIsConsented(!isConsented)}>
                <View style={[styles.checkboxMock, isConsented && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]}>
                  {isConsented && <Feather name="check" size={14} color="#FFF" />}
                </View>
                <ThemedText style={styles.consentText}>I consent to the organizers collecting my info. *</ThemedText>
              </Pressable>
            </View>
            {error ? <ThemedText style={styles.errorTextSnippet}>{error}</ThemedText> : null}
            <Button onPress={handleRegister} disabled={registerMutation.isPending} style={styles.requestButton}>
              {registerMutation.isPending ? <ActivityIndicator color="#000" size="small" /> : "Request to Join"}
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  formContainer: { paddingHorizontal: 24, paddingTop: 20 },
  sectionHeading: { fontSize: 24, fontWeight: '900', color: '#FFF', marginBottom: 20 },
  profileSnippet: { flexDirection: 'row', alignItems: 'center', marginBottom: 32 },
  avatarLarge: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FF8A8A', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  avatarInitial: { fontSize: 22, fontWeight: '700', color: '#FFF' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  profileEmail: { fontSize: 14, color: COLORS.textSecondary, marginTop: 2 },
  formFields: { gap: 20 },
  inputGroup: { gap: 8 },
  inputLabel: { fontSize: 14, fontWeight: '700', color: '#FFF', marginLeft: 4 },
  customInput: { fontSize: 16, color: '#FFF', paddingHorizontal: 16, height: 54, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#1C1F35' },
  consentRow: { flexDirection: 'row', marginTop: 10, gap: 12 },
  checkboxMock: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#3D4256', marginTop: 2 },
  consentText: { flex: 1, fontSize: 13, color: '#A0A4B8', lineHeight: 18 },
  requestButton: { backgroundColor: '#FFF', height: 56, borderRadius: 14, marginTop: 40 },
  errorTextSnippet: { color: '#FF4B4B', fontSize: 14, textAlign: 'center', marginTop: 20 },
  successContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32 },
  successIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: "center", marginBottom: 12 },
  successSubtitle: { fontSize: 16, color: COLORS.textSecondary, textAlign: "center", lineHeight: 24, marginBottom: 40 },
  viewTicketButton: { width: '100%', height: 54 },
});
