import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  registrations: number;
  status: "pending" | "approved" | "rejected" | "checked_in" | "checked_out";
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function EventCard({
  title,
  date,
  location,
  registrations,
  status,
  onPress,
}: EventCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.98);
      }}
      onPressOut={() => {
        scale.value = withSpring(1);
      }}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        Shadows.md,
        animatedStyle,
      ]}
    >
      <View style={styles.header}>
        <ThemedText type="h4" numberOfLines={1} style={styles.title}>
          {title}
        </ThemedText>
        <StatusBadge status={status} />
      </View>
      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.detailText}>
            {date}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.detailText}>
            {location}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="users" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={styles.detailText}>
            {registrations} registrations
          </ThemedText>
        </View>
      </View>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  title: {
    flex: 1,
    marginRight: Spacing.md,
  },
  details: {
    gap: Spacing.sm,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  detailText: {
    opacity: 0.7,
  },
});
