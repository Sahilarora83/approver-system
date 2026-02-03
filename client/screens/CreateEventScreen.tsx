import React, { useState, useCallback, memo, useEffect } from "react";
import { StyleSheet, View, ScrollView, Pressable, ActivityIndicator, Platform, Switch, Image, Alert, LogBox, KeyboardAvoidingView } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

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
  onUpdate,
  theme,
}: {
  field: FormField;
  index: number;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FormField>) => void;
  theme: any;
}) {
  return (
    <View style={[styles.fieldRow, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
      <View style={styles.fieldInfo}>
        <View style={{ marginBottom: 10 }}>
          <ThemedText type="small" style={{ marginBottom: 4 }}>Label</ThemedText>
          <Input
            value={field.label}
            onChangeText={(text) => onUpdate(field.id, { label: text })}
            placeholder="Field Label"
            style={{ padding: 8, height: 40 }}
          />
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <ThemedText type="small">Required</ThemedText>
            <Switch
              value={field.required}
              onValueChange={(val) => onUpdate(field.id, { required: val })}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          {/* Simple Type Toggler for demo */}
          <Pressable
            onPress={() => {
              const types: FormField['type'][] = ['text', 'number', 'email', 'phone', 'checkbox', 'dropdown'];
              const nextIndex = (types.indexOf(field.type) + 1) % types.length;
              onUpdate(field.id, { type: types[nextIndex] });
            }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4, borderWidth: 1, borderColor: theme.border, borderRadius: 4 }}
          >
            <ThemedText type="small">{field.type.toUpperCase()}</ThemedText>
            <Icon name="chevron-down" size={14} color={theme.textSecondary} />
          </Pressable>
        </View>

        {(field.type === 'dropdown' || field.type === 'checkbox') && (
          <View style={{ marginTop: 10 }}>
            <ThemedText type="small" style={{ marginBottom: 4 }}>Options (comma separated)</ThemedText>
            <Input
              value={field.options?.join(', ') || ''}
              onChangeText={(text) => onUpdate(field.id, { options: text.split(',').map(s => s.trim()).filter(Boolean) })}
              placeholder="Option A, Option B, Option C"
              style={{ padding: 8, height: 40 }}
            />
          </View>
        )}
      </View>
      {index >= 3 ? (
        <Pressable onPress={() => onRemove(field.id)} style={styles.removeButton}>
          <Icon name="trash-2" size={18} color={theme.error} />
        </Pressable>
      ) : null}
    </View>
  );
});

type Host = {
  id: string;
  name: string;
  instagram: string;
  twitter: string;
  linkedin: string;
};

export default function CreateEventScreen({ navigation, route }: any) {
  const { event } = route.params || {};
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  useEffect(() => {
    LogBox.ignoreLogs([/VirtualizedLists should never be nested/]);
  }, []);

  const [title, setTitle] = useState(event?.title || "");
  const [description, setDescription] = useState(event?.description || "");
  const [location, setLocation] = useState(event?.location || "");
  const [coverImage, setCoverImage] = useState(event?.coverImage || "");

  // Initialize hosts from event data
  const [hosts, setHosts] = useState<Host[]>(() => {
    if (event?.socialLinks && Array.isArray(event.socialLinks)) {
      return event.socialLinks;
    }
    // Legacy support or new event
    return [{
      id: Date.now().toString(),
      name: event?.hostedBy || "",
      instagram: event?.socialLinks?.instagram || "",
      twitter: event?.socialLinks?.twitter || "",
      linkedin: event?.socialLinks?.linkedin || ""
    }];
  });

  // Derived state for legacy compatibility during submit
  const hostedBy = hosts.map(h => h.name).filter(Boolean).join(", ");

  const [startDate, setStartDate] = useState(event?.startDate ? new Date(event.startDate) : new Date());
  const [endDate, setEndDate] = useState(event?.endDate ? new Date(event.endDate) : new Date());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(event?.requiresApproval || false);
  const [formFields, setFormFields] = useState<FormField[]>(event?.formFields || defaultFields);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const submitMutation = useMutation({
    mutationFn: async (data: any) => {
      if (event) {
        const response = await apiRequest("PATCH", `/api/events/${event.id}`, data);
        return response.json();
      } else {
        const response = await apiRequest("POST", "/api/events", data);
        return response.json();
      }
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

  const addHost = useCallback(() => {
    setHosts((prev) => [...prev, { id: Date.now().toString(), name: "", instagram: "", twitter: "", linkedin: "" }]);
  }, []);

  const updateHost = useCallback((id: string, updates: Partial<Host>) => {
    setHosts((prev) => prev.map((h) => (h.id === id ? { ...h, ...updates } : h)));
  }, []);

  const removeHost = useCallback((id: string) => {
    setHosts((prev) => (prev.length > 1 ? prev.filter((h) => h.id !== id) : prev));
  }, []);

  const handleCreate = useCallback(() => {
    if (!title.trim()) {
      setError("Please enter an event title");
      return;
    }

    submitMutation.mutate({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      requiresApproval,
      checkInEnabled: true,

      formFields,
      coverImage: coverImage.trim(),
      hostedBy: hostedBy.trim(),
      socialLinks: hosts,
    });
  }, [title, description, location, startDate, endDate, requiresApproval, formFields, submitMutation, coverImage, hostedBy, hosts]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.2,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setUploading(true);
      try {
        const res = await apiRequest("POST", "/api/upload", {
          image: `data:image/jpeg;base64,${result.assets[0].base64}`,
        });
        const data = await res.json();
        setCoverImage(data.url);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e: any) {
        console.error("Upload failed", e);
        setError("Failed to upload: " + (e.message || "Unknown error"));
        Alert.alert("Upload Error", "Could not upload image. Please try a smaller image or check connection. Details: " + (e.message || "Unknown"));
      } finally {
        setUploading(false);
      }
    }
  };

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(false);
    if (selectedDate) setStartDate(selectedDate);
  };

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(false);
    if (selectedDate) setEndDate(selectedDate);
  };

  const updateField = useCallback((id: string, updates: Partial<FormField>) => {
    setFormFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, ...updates } : field))
    );
  }, []);

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
    setRequiresApproval((prev: boolean) => !prev);
  }, []);

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
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
            {event ? "Edit Event" : "Create Event"}
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
            <View style={{ zIndex: 10, marginBottom: 16 }}>
              <ThemedText type="body" style={{ marginBottom: 8, fontWeight: '500' }}>Location</ThemedText>
              <GooglePlacesAutocomplete
                placeholder="Search for event location"
                onPress={(data: any, details = null) => {
                  setLocation(data.description);
                }}
                query={{
                  key: 'AIzaSyBH1Cl0wkbKTVR5Qmyv8_3UGZe-Er_nEDE',
                  language: 'en',
                }}
                styles={{
                  textInputContainer: {
                    width: '100%',
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    borderBottomWidth: 0,
                    padding: 0,
                    margin: 0,
                  },
                  textInput: {
                    backgroundColor: theme.backgroundDefault,
                    color: theme.text,
                    height: 48,
                    borderRadius: BorderRadius.md,
                    paddingHorizontal: 16,
                    borderWidth: 1,
                    borderColor: theme.border,
                    fontSize: 16,
                    marginTop: 0,
                    marginLeft: 0,
                    marginRight: 0,
                  },
                  description: {
                    color: theme.text,
                  },
                  row: {
                    backgroundColor: theme.backgroundDefault,
                    padding: 13,
                    height: 44,
                    flexDirection: 'row',
                  },
                  listView: {
                    backgroundColor: theme.backgroundDefault,
                    borderRadius: BorderRadius.md,
                    borderWidth: 1,
                    borderColor: theme.border,
                    marginTop: 8,
                  },
                  separator: {
                    height: 0.5,
                    backgroundColor: theme.border,
                  },
                  poweredContainer: {
                    backgroundColor: theme.backgroundDefault,
                  },
                }}
                textInputProps={{
                  placeholderTextColor: theme.textSecondary,
                  value: location,
                  onChangeText: setLocation,
                }}
                // @ts-ignore
                listProps={{
                  nestedScrollEnabled: true,
                }}
                enablePoweredByContainer={false}
                fetchDetails={false}
                nearbyPlacesAPI='GooglePlacesSearch'
                debounce={200}
              />
            </View>
            <ThemedText type="body" style={{ marginBottom: 8, fontWeight: '500' }}>Cover Image</ThemedText>
            <Pressable
              onPress={pickImage}
              style={{
                borderWidth: 1,
                borderColor: theme.border,
                borderStyle: 'dashed',
                borderRadius: BorderRadius.md,
                overflow: 'hidden',
                marginBottom: Spacing.lg
              }}
            >
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={{ width: '100%', height: 200 }} resizeMode="cover" />
              ) : (
                <View style={{ alignItems: 'center', padding: Spacing["2xl"] }}>
                  {uploading ? (
                    <ActivityIndicator color={theme.primary} />
                  ) : (
                    <>
                      <Icon name="image" size={32} color={theme.textSecondary} />
                      <ThemedText style={{ color: theme.textSecondary, marginTop: 8 }}>
                        Tap to upload cover image
                      </ThemedText>
                    </>
                  )}
                </View>
              )}
            </Pressable>

            <View style={{ marginTop: 16, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <ThemedText type="h4" style={{ fontSize: 16 }}>Hosts & Speakers</ThemedText>
                <Pressable onPress={addHost} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: BorderRadius.sm }}>
                  <Icon name="plus" size={14} color={theme.primary} />
                  <ThemedText type="small" style={{ color: theme.primary, fontWeight: '600', marginLeft: 4 }}>Add Host</ThemedText>
                </Pressable>
              </View>

              {hosts.map((host, index) => (
                <View key={host.id} style={{ marginBottom: 16, padding: 12, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.backgroundDefault }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Host #{index + 1}</ThemedText>
                    {hosts.length > 1 && (
                      <Pressable onPress={() => removeHost(host.id)} hitSlop={10}>
                        <Icon name="trash-2" size={16} color={theme.error} />
                      </Pressable>
                    )}
                  </View>
                  <Input
                    label="Name"
                    value={host.name}
                    onChangeText={(t) => updateHost(host.id, { name: t })}
                    placeholder="Host Name (e.g. John Doe)"
                    style={{ marginBottom: 12 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Instagram"
                        value={host.instagram}
                        onChangeText={(t) => updateHost(host.id, { instagram: t })}
                        placeholder="Link/Handle"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Input
                        label="Twitter"
                        value={host.twitter}
                        onChangeText={(t) => updateHost(host.id, { twitter: t })}
                        placeholder="Link/Handle"
                      />
                    </View>
                  </View>
                  <View style={{ marginTop: 12 }}>
                    <Input
                      label="LinkedIn"
                      value={host.linkedin}
                      onChangeText={(t) => updateHost(host.id, { linkedin: t })}
                      placeholder="Link/Handle"
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Date & Time
            </ThemedText>
            <Pressable onPress={() => setShowStartPicker(true)} style={[styles.dateButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Icon name="calendar" size={18} color={theme.textSecondary} />
              <View style={styles.dateText}>
                <ThemedText type="small" style={styles.dateLabel}>
                  Start Date
                </ThemedText>
                <ThemedText type="body">{formatDate(startDate)}</ThemedText>
              </View>
            </Pressable>
            {showStartPicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={startDate}
                mode="date"
                is24Hour={true}
                display="default"
                onChange={onStartDateChange}
              />
            )}

            <Pressable onPress={() => setShowEndPicker(true)} style={[styles.dateButton, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
              <Icon name="calendar" size={18} color={theme.textSecondary} />
              <View style={styles.dateText}>
                <ThemedText type="small" style={styles.dateLabel}>
                  End Date
                </ThemedText>
                <ThemedText type="body">{formatDate(endDate)}</ThemedText>
              </View>
            </Pressable>
            {showEndPicker && (
              <DateTimePicker
                testID="dateTimePickerEnd"
                value={endDate}
                mode="date"
                is24Hour={true}
                display="default"
                onChange={onEndDateChange}
              />
            )}
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
                onUpdate={updateField}
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
            disabled={submitMutation.isPending}
            style={styles.createButton}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              event ? "Update Event" : "Create Event"
            )}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
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
