import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

interface RegistrationRowProps {
  name: string;
  email: string;
  date: string;
  status: "pending" | "approved" | "rejected" | "checked_in" | "checked_out";
  onApprove?: () => void;
  onReject?: () => void;
  onPress?: () => void;
}

export function RegistrationRow({
  name,
  email,
  date,
  status,
  onApprove,
  onReject,
  onPress,
}: RegistrationRowProps) {
  const { theme } = useTheme();

  const handleApprove = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onApprove?.();
  };

  const handleReject = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onReject?.();
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault },
      ]}
    >
      <View style={styles.info}>
        <ThemedText type="body" style={styles.name}>
          {name}
        </ThemedText>
        <ThemedText type="small" style={styles.email}>
          {email}
        </ThemedText>
        <ThemedText type="small" style={styles.date}>
          {date}
        </ThemedText>
      </View>
      <View style={styles.right}>
        <StatusBadge status={status} />
        {status === "pending" && (onApprove || onReject) ? (
          <View style={styles.actions}>
            {onApprove ? (
              <Pressable
                onPress={handleApprove}
                style={[styles.actionButton, { backgroundColor: `${theme.success}15` }]}
              >
                <Icon name="check" size={18} color={theme.success} />
              </Pressable>
            ) : null}
            {onReject ? (
              <Pressable
                onPress={handleReject}
                style={[styles.actionButton, { backgroundColor: `${theme.error}15` }]}
              >
                <Icon name="x" size={18} color={theme.error} />
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  info: {
    flex: 1,
    marginRight: Spacing.md,
  },
  name: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  email: {
    opacity: 0.7,
  },
  date: {
    opacity: 0.5,
    marginTop: Spacing.xs,
  },
  right: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
});
