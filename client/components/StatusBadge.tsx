import React from "react";
import { StyleSheet, View } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

type Status = "pending" | "approved" | "rejected" | "checked_in" | "checked_out";

interface StatusBadgeProps {
  status: Status;
  size?: "small" | "medium";
}

const statusLabels: Record<Status, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  checked_in: "Checked In",
  checked_out: "Checked Out",
};

export function StatusBadge({ status, size = "small" }: StatusBadgeProps) {
  const { theme } = useTheme();

  const getStatusColor = () => {
    switch (status) {
      case "pending":
        return theme.pending;
      case "approved":
        return theme.approved;
      case "rejected":
        return theme.rejected;
      case "checked_in":
        return theme.checkedIn;
      case "checked_out":
        return theme.checkedOut;
      default:
        return theme.textSecondary;
    }
  };

  const color = getStatusColor();

  return (
    <View
      style={[
        styles.badge,
        size === "medium" && styles.badgeMedium,
        { backgroundColor: `${color}15` },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText
        type="small"
        style={[
          styles.text,
          size === "medium" && styles.textMedium,
          { color },
        ]}
      >
        {statusLabels[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.xs,
    alignSelf: "flex-start",
  },
  badgeMedium: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  text: {
    fontWeight: "600",
    fontSize: 12,
  },
  textMedium: {
    fontSize: 14,
  },
});
