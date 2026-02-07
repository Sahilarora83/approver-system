import React from "react";
import { StyleSheet, View, ScrollView, ActivityIndicator, Share, Pressable, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import QRCode from "react-native-qrcode-svg";
import { format } from "date-fns";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { useSocket } from "@/contexts/SocketContext";

export default function TicketViewScreen({ route, navigation }: any) {
  const { registrationId } = route.params;
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { socket } = useSocket();

  const { data: ticket, isLoading } = useQuery<any>({
    queryKey: ["/api/registrations", registrationId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/registrations/${registrationId}`);
      return res.json();
    },
    refetchInterval: 5000, // Fallback for real-time
  });

  React.useEffect(() => {
    if (socket) {
      socket.on("ticket-status-changed", (data: any) => {
        if (data.registrationId === registrationId) {
          queryClient.invalidateQueries({ queryKey: ["/api/registrations", registrationId] });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          console.log("[Socket] Ticket status updated in real-time");
        }
      });

      return () => {
        socket.off("ticket-status-changed");
      };
    }
  }, [socket, registrationId]);

  const handleShare = async () => {
    if (ticket?.ticketLink) {
      await Share.share({
        message: `My ticket for ${ticket.event?.title}: ${ticket.ticketLink}`,
      });
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  if (isLoading || !ticket) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.headerActions, { top: insets.top + 10 }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Feather name="arrow-left" size={24} color="#FFF" />
        </Pressable>
        <ThemedText style={styles.headerTitle}>E-Ticket</ThemedText>
        <Pressable style={styles.moreButton}>
          <Feather name="more-horizontal" size={24} color="#FFF" />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 80,
          paddingBottom: 120,
          paddingHorizontal: 24,
        }}
      >
        <View style={styles.qrCard}>
          <View style={styles.qrInner}>
            <QRCode
              value={ticket.qrCode}
              size={width * 0.65}
              backgroundColor="#FFFFFF"
              color="#000000"
              quietZone={10}
            />
          </View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Event</ThemedText>
            <ThemedText style={styles.detailValue}>{ticket.event?.title}</ThemedText>
          </View>

          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Date and Hour</ThemedText>
            <ThemedText style={styles.detailValue}>
              {ticket.event?.startDate ? format(new Date(ticket.event.startDate), "EEEE, MMM d · HH:mm") : "TBD"}
              {ticket.event?.endDate ? ` - ${format(new Date(ticket.event.endDate), "HH:mm a")}` : ""}
            </ThemedText>
          </View>

          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Event Location</ThemedText>
            <ThemedText style={styles.detailValue}>{ticket.event?.location || "Location TBD"}</ThemedText>
          </View>

          <View style={styles.detailItem}>
            <ThemedText style={styles.detailLabel}>Event Organizer</ThemedText>
            <ThemedText style={styles.detailValue}>{ticket.event?.hostedBy || "Organizer"}</ThemedText>
          </View>
        </View>
      </ScrollView>

      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 20 }]}>
        <Pressable style={styles.downloadButton} onPress={handleShare}>
          <ThemedText style={styles.downloadText}>Download Ticket</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#111827" },
  headerActions: { position: "absolute", left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, zIndex: 10 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "transparent", justifyContent: "center", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#FFF" },
  moreButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "transparent", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  qrCard: { backgroundColor: "#1F2937", borderRadius: 32, padding: 24, alignItems: "center", ...Shadows.lg, marginBottom: 32 },
  qrInner: { backgroundColor: "#FFF", padding: 20, borderRadius: 24 },
  detailsCard: { backgroundColor: "#1F2937", borderRadius: 32, padding: 32, gap: 24 },
  detailItem: { gap: 8 },
  detailLabel: { fontSize: 13, color: "#9CA3AF", fontWeight: "500" },
  detailValue: { fontSize: 20, fontWeight: "800", color: "#FFF", letterSpacing: -0.2 },
  bottomActions: { position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 24, paddingTop: 20, backgroundColor: "rgba(17, 24, 39, 0.9)" },
  downloadButton: { backgroundColor: "#5D5FEF", height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", ...Shadows.lg },
  downloadText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
