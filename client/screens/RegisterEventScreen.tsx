import React, { useState } from "react";
import { StyleSheet, View, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function RegisterEventScreen({ route, navigation }: any) {
  const { eventLink } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [formData, setFormData] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<any>(null);

  const { data: event, isLoading: eventLoading } = useQuery({
    queryKey: ["/api/events/public", eventLink],
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", `/api/events/public/${eventLink}/register`, data);
      return response.json();
    },
    onSuccess: (data) => {
      setSuccess(true);
      setRegistrationResult(data);
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
      if (!formData[field.id]?.trim()) {
        setError(`Please fill in ${field.label}`);
        return;
      }
    }

    setError("");
    registerMutation.mutate({
      name: formData.name || "",
      email: formData.email || "",
      phone: formData.phone || "",
      formData,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (eventLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!event) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <Feather name="alert-circle" size={48} color={theme.error} />
        <ThemedText type="h3" style={styles.errorTitle}>
          Event Not Found
        </ThemedText>
        <ThemedText type="body" style={styles.errorText}>
          This event may have been removed or the link is invalid.
        </ThemedText>
      </ThemedView>
    );
  }

  if (success && registrationResult) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + Spacing["3xl"],
            paddingBottom: insets.bottom + Spacing["2xl"],
            paddingHorizontal: Spacing.lg,
            flexGrow: 1,
          }}
        >
          <View style={styles.successContainer}>
            <View style={[styles.successIcon, { backgroundColor: `${theme.success}15` }]}>
              <Feather name="check-circle" size={64} color={theme.success} />
            </View>
            <ThemedText type="h2" style={styles.successTitle}>
              Registration Complete!
            </ThemedText>
            <ThemedText type="body" style={styles.successText}>
              You're registered for {event.title}. Your ticket has been created.
            </ThemedText>

            <Button
              onPress={() => navigation.navigate("TicketView", { registrationId: registrationResult.id })}
              style={styles.viewTicketButton}
            >
              View My Ticket
            </Button>
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing["2xl"],
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={[styles.eventCard, { backgroundColor: theme.backgroundDefault }, Shadows.md]}>
          <ThemedText type="h2" style={styles.eventTitle}>
            {event.title}
          </ThemedText>
          {event.description ? (
            <ThemedText type="body" style={styles.eventDescription}>
              {event.description}
            </ThemedText>
          ) : null}
          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
              <ThemedText type="body" style={styles.metaText}>
                {event.startDate ? formatDate(event.startDate) : "Date TBD"}
              </ThemedText>
            </View>
            <View style={styles.metaRow}>
              <Feather name="map-pin" size={16} color={theme.textSecondary} />
              <ThemedText type="body" style={styles.metaText}>
                {event.location || "Location TBD"}
              </ThemedText>
            </View>
          </View>
        </View>

        <ThemedText type="h3" style={styles.formTitle}>
          Registration Form
        </ThemedText>

        <View style={styles.form}>
          {(event.formFields || []).map((field: any) => (
            <Input
              key={field.id}
              label={`${field.label}${field.required ? " *" : ""}`}
              placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
              value={formData[field.id] || ""}
              onChangeText={(text) => setFormData({ ...formData, [field.id]: text })}
              keyboardType={
                field.type === "email"
                  ? "email-address"
                  : field.type === "phone"
                  ? "phone-pad"
                  : field.type === "number"
                  ? "numeric"
                  : "default"
              }
              autoCapitalize={field.type === "email" ? "none" : "sentences"}
            />
          ))}
        </View>

        {error ? (
          <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={handleRegister}
          disabled={registerMutation.isPending}
          style={styles.submitButton}
        >
          {registerMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Register for Event"
          )}
        </Button>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
  },
  errorTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  errorText: {
    opacity: 0.7,
    textAlign: "center",
  },
  eventCard: {
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
  },
  eventTitle: {
    marginBottom: Spacing.md,
  },
  eventDescription: {
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  eventMeta: {
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaText: {
    opacity: 0.7,
  },
  formTitle: {
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  error: {
    textAlign: "center",
    marginTop: Spacing.lg,
  },
  submitButton: {
    marginTop: Spacing["2xl"],
  },
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  successIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  successTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  successText: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing["2xl"],
  },
  viewTicketButton: {
    minWidth: 200,
  },
});
