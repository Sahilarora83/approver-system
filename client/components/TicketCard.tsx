import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

interface TicketCardProps {
  eventTitle: string;
  participantName: string;
  date: string;
  location: string;
  qrCode: string;
  status: "pending" | "approved" | "rejected" | "checked_in" | "checked_out";
  onPress?: () => void;
  showQR?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function TicketCard({
  eventTitle,
  participantName,
  date,
  location,
  qrCode,
  status,
  onPress,
  showQR = true,
}: TicketCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const content = (
    <View style={[styles.card, { backgroundColor: theme.backgroundDefault }, Shadows.lg]}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <ThemedText type="h4" numberOfLines={2}>
            {eventTitle}
          </ThemedText>
          <StatusBadge status={status} />
        </View>
      </View>

      {showQR ? (
        <View style={[styles.qrContainer, { backgroundColor: "#FFFFFF" }]}>
          <QRCode value={qrCode} size={160} backgroundColor="#FFFFFF" color="#000000" />
        </View>
      ) : null}

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Feather name="user" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.detailText}>
            {participantName}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="calendar" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.detailText}>
            {date}
          </ThemedText>
        </View>
        <View style={styles.detailRow}>
          <Feather name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.detailText}>
            {location}
          </ThemedText>
        </View>
      </View>

      <View style={[styles.tear, { borderColor: theme.backgroundRoot }]} />
    </View>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.98);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
        style={animatedStyle}
      >
        {content}
      </AnimatedPressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing.lg,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  headerText: {
    gap: Spacing.sm,
  },
  qrContainer: {
    alignSelf: "center",
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
  },
  details: {
    padding: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  detailText: {
    flex: 1,
  },
  tear: {
    height: 20,
    borderTopWidth: 2,
    borderStyle: "dashed",
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
});
