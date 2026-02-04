import React from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Share, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StatusBadge } from "@/components/StatusBadge";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function TicketViewScreen({ route }: any) {
  const { registrationId } = route.params;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ["/api/registrations", registrationId],
  });

  const safeFormatDate = (date: any) => {
    try {
      if (!date) return "Date TBD";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "Date TBD";
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "Date TBD";
    }
  };

  const safeFormatTime = (date: any) => {
    try {
      if (!date) return "";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (e) {
      return "";
    }
  };


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleShare = async () => {
    if (ticket?.ticketLink) {
      await Share.share({
        message: `My ticket for ${ticket.event?.title}: ${ticket.ticketLink}`,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!ticket) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ThemedText type="body">Ticket not found</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: headerHeight + Spacing.xl,
          paddingBottom: insets.bottom + Spacing["2xl"],
          paddingHorizontal: Spacing.lg,
        }}
      >
        <View style={[styles.ticketCard, { backgroundColor: theme.backgroundDefault }, Shadows.lg]}>
          <View style={styles.header}>
            <ThemedText type="h2" style={styles.eventTitle}>
              {ticket.event?.title || "Event"}
            </ThemedText>
            <StatusBadge status={ticket.status} size="medium" />
          </View>

          {ticket.status === 'approved' || ticket.status === 'checked_in' || ticket.status === 'checked_out' ? (
            <View style={[styles.qrContainer, { backgroundColor: "#FFFFFF" }]}>
              <QRCode
                value={ticket.qrCode}
                size={200}
                backgroundColor="#FFFFFF"
                color="#000000"
              />
            </View>
          ) : (
            <View style={[styles.qrContainer, { backgroundColor: 'rgba(255, 165, 0, 0.05)', padding: 40, alignItems: 'center' }]}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255, 165, 0, 0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <Feather name="clock" size={32} color="#FFA500" />
              </View>
              <ThemedText style={{ color: '#FFA500', fontWeight: '700', textAlign: 'center' }}>Approval Pending</ThemedText>
              <ThemedText style={{ color: theme.textSecondary, fontSize: 13, textAlign: 'center', marginTop: 8 }}>
                Your QR code will be generated once the host approves your registration.
              </ThemedText>
            </View>
          )}

          <View style={[styles.divider, { borderColor: theme.backgroundSecondary }]} />

          <View style={styles.details}>
            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="user" size={18} color={theme.primary} />
              </View>
              <View style={styles.detailText}>
                <ThemedText type="small" style={styles.detailLabel}>
                  Attendee
                </ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {ticket.name}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="mail" size={18} color={theme.primary} />
              </View>
              <View style={styles.detailText}>
                <ThemedText type="small" style={styles.detailLabel}>
                  Email
                </ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {ticket.email}
                </ThemedText>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="calendar" size={18} color={theme.primary} />
              </View>
              <View style={styles.detailText}>
                <ThemedText type="small" style={styles.detailLabel}>
                  Date & Time
                </ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {safeFormatDate(ticket.event?.startDate)}
                </ThemedText>
                {ticket.event?.startDate ? (
                  <ThemedText type="small" style={styles.timeText}>
                    {safeFormatTime(ticket.event.startDate)}
                  </ThemedText>
                ) : null}

              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}15` }]}>
                <Feather name="map-pin" size={18} color={theme.primary} />
              </View>
              <View style={styles.detailText}>
                <ThemedText type="small" style={styles.detailLabel}>
                  Location
                </ThemedText>
                <ThemedText type="body" style={styles.detailValue}>
                  {ticket.event?.location || "Location TBD"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={[styles.footer, { borderTopColor: theme.backgroundSecondary }]}>
            <ThemedText type="small" style={styles.ticketId}>
              Ticket ID: {ticket.id.slice(0, 8).toUpperCase()}
            </ThemedText>
          </View>
        </View>

        <Pressable
          onPress={handleShare}
          style={[styles.shareButton, { backgroundColor: theme.primary }]}
        >
          <Feather name="share-2" size={20} color="#fff" />
          <ThemedText type="body" style={styles.shareText}>
            Share Ticket
          </ThemedText>
        </Pressable>
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
  },
  ticketCard: {
    borderRadius: BorderRadius.xl,
    overflow: "hidden",
  },
  header: {
    padding: Spacing["2xl"],
    alignItems: "center",
    gap: Spacing.md,
  },
  eventTitle: {
    textAlign: "center",
  },
  qrContainer: {
    alignSelf: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginHorizontal: Spacing["2xl"],
  },
  divider: {
    borderTopWidth: 2,
    borderStyle: "dashed",
    marginHorizontal: Spacing["2xl"],
    marginVertical: Spacing["2xl"],
  },
  details: {
    paddingHorizontal: Spacing["2xl"],
    gap: Spacing.lg,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    flex: 1,
  },
  detailLabel: {
    opacity: 0.6,
    marginBottom: Spacing.xs,
  },
  detailValue: {
    fontWeight: "500",
  },
  timeText: {
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
  footer: {
    padding: Spacing["2xl"],
    marginTop: Spacing.lg,
    borderTopWidth: 1,
    alignItems: "center",
  },
  ticketId: {
    opacity: 0.5,
    fontFamily: "monospace",
  },
  shareButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing["2xl"],
  },
  shareText: {
    color: "#fff",
    fontWeight: "600",
  },
});
