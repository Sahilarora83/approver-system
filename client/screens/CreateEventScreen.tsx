import React, { useState, useCallback, memo } from "react";
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Platform } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type FormField = {
  id: string;
  type: "text" | "email" | "phone" | "dropdown" | "checkbox" | "number";
  label: string;
  required: boolean;
  options?: string[];
};

const defaultFields: FormField[] = [
  { id: "name", type: "text", label: "Full Name", required: true },
  { id: "email", type: "email", label: "Email Address", required: true },
  { id: "phone", type: "phone", label: "Phone Number", required: false },
];

const FieldRow = memo(function FieldRow({
  field,
  index,
  onRemove,
  theme,
}: {
  field: FormField;
  index: number;
  onRemove: (id: string) => void;
  theme: any;
}) {
  return (
    <View style={[styles.fieldRow, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
      <View style={styles.fieldInfo}>
        <ThemedText type="body">{field.label}</ThemedText>
        <ThemedText type="small" style={styles.fieldType}>
          {field.type} {field.required ? "(required)" : "(optional)"}
        </ThemedText>
      </View>
      {index >= 3 ? (
        <Pressable onPress={() => onRemove(field.id)} style={styles.removeButton}>
          <Icon name="trash-2" size={18} color={theme.error} />
        </Pressable>
      ) : null}
    </View>
  );
});

export default function CreateEventScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>(defaultFields);
  const [error, setError] = useState("");

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/events", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    },
    onError: (err: any) => {
      setError(err.message || "Failed to create event");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleCreate = useCallback(() => {
    if (!title.trim()) {
      setError("Please enter an event title");
      return;
    }

    createEventMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      requiresApproval,
      checkInEnabled: true,
      formFields,
    });
  }, [title, description, location, startDate, endDate, requiresApproval, formFields, createEventMutation]);

  const addField = useCallback(() => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
    };
    setFormFields((prev) => [...prev, newField]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFormFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleApproval = useCallback(() => {
    setRequiresApproval((prev) => !prev);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ThemedText type="h2" style={styles.title}>
          Create Event
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Event Details
          </ThemedText>
          <Input
            label="Event Title"
            placeholder="Enter event title"
            value={title}
            onChangeText={setTitle}
          />
          <Input
            label="Description"
            placeholder="Describe your event"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            style={styles.textArea}
          />
          <Input
            label="Location"
            placeholder="Event location"
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Date & Time
          </ThemedText>
          <View style={[styles.dateButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Icon name="calendar" size={18} color={theme.textSecondary} />
            <View style={styles.dateText}>
              <ThemedText type="small" style={styles.dateLabel}>
                Start Date
              </ThemedText>
              <ThemedText type="body">{formatDate(startDate)}</ThemedText>
            </View>
          </View>

          <View style={[styles.dateButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
            <Icon name="calendar" size={18} color={theme.textSecondary} />
            <View style={styles.dateText}>
              <ThemedText type="small" style={styles.dateLabel}>
                End Date
              </ThemedText>
              <ThemedText type="body">{formatDate(endDate)}</ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Settings
          </ThemedText>
          <Pressable
            onPress={toggleApproval}
            style={[styles.toggle, { backgroundColor: theme.backgroundDefault }]}
          >
            <View style={styles.toggleInfo}>
              <ThemedText type="body">Require Approval</ThemedText>
              <ThemedText type="small" style={styles.toggleDesc}>
                Manually approve each registration
              </ThemedText>
            </View>
            <View
              style={[
                styles.checkbox,
                {
                  backgroundColor: requiresApproval ? theme.primary : "transparent",
                  borderColor: requiresApproval ? theme.primary : theme.border,
                },
              ]}
            >
              {requiresApproval ? <Icon name="check" size={14} color="#fff" /> : null}
            </View>
          </Pressable>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Registration Form Fields
            </ThemedText>
            <Pressable onPress={addField} style={[styles.addFieldButton, { backgroundColor: `${theme.primary}15` }]}>
              <Icon name="plus" size={16} color={theme.primary} />
              <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
                Add Field
              </ThemedText>
            </Pressable>
          </View>

          {formFields.map((field, index) => (
            <FieldRow
              key={field.id}
              field={field}
              index={index}
              onRemove={removeField}
              theme={theme}
            />
          ))}
        </View>

        {error ? (
          <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
            {error}
          </ThemedText>
        ) : null}

        <Button
          onPress={handleCreate}
          disabled={createEventMutation.isPending}
          style={styles.createButton}
        >
          {createEventMutation.isPending ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            "Create Event"
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
  title: {
    marginBottom: Spacing["2xl"],
  },
  section: {
    marginBottom: Spacing["2xl"],
    gap: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
    paddingTop: Spacing.md,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    gap: Spacing.md,
  },
  dateText: {
    flex: 1,
  },
  dateLabel: {
    opacity: 0.7,
    marginBottom: Spacing.xs,
  },
  toggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleDesc: {
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  addFieldButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
  },
  fieldInfo: {
    flex: 1,
  },
  fieldType: {
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  error: {
    textAlign: "center",
    marginBottom: Spacing.lg,
  },
  createButton: {
    marginTop: Spacing.lg,
  },
});
