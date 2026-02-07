import React, { useState, useMemo } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, Dimensions, Modal, ActivityIndicator, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image } from "expo-image";
import Animated, { FadeInDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Shadows, BorderRadius } from "@/constants/theme";

const { width } = Dimensions.get("window");

const TABS = ["Upcoming", "Completed", "Cancelled"];

const safeFormat = (date: any, fmt: string) => {
  try {
    if (!date) return "TBD";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    return format(d, fmt);
  } catch (e) {
    return "TBD";
  }
};

export default function MyTicketsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [reviewItem, setReviewItem] = useState<any>(null);
  const [cancelItem, setCancelItem] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  const { data: tickets, isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/my-tickets", user?.email],
    queryFn: async () => {
      const url = user?.email
        ? `/api/my-tickets?email=${encodeURIComponent(user.email)}`
        : '/api/my-tickets';
      const res = await apiRequest("GET", url);
      return res.json();
    },
    enabled: !!user?.email,
  });

  const filteredTickets = useMemo(() => {
    if (!tickets || !Array.isArray(tickets)) return [];
    const now = new Date();
    return tickets.filter(t => {
      if (!t.event) return false; // Skip tickets with missing event data
      const eventDate = t.event.startDate ? new Date(t.event.startDate) : null;
      // Handle invalid date
      if (eventDate && isNaN(eventDate.getTime())) return false;

      if (activeTab === "Upcoming") return t.status !== 'cancelled' && eventDate && eventDate >= now;
      if (activeTab === "Completed") return (eventDate && eventDate < now && t.status !== 'cancelled') || t.status === 'checked_in';
      if (activeTab === "Cancelled") return t.status === 'cancelled';
      return true;
    });
  }, [tickets, activeTab]);

  const reviewMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/reviews", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tickets"] });
      setReviewItem(null);
      setRating(0);
      setComment("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/registrations/${id}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/my-tickets"] });
      setCancelItem(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerLeft}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={["#7C3AED", "#6D28D9"]} style={styles.logoGradient}>
              <ThemedText style={styles.logoText}>e</ThemedText>
            </LinearGradient>
          </View>
          <ThemedText style={styles.headerTitle}>Tickets</ThemedText>
        </View>
        <View style={styles.headerRight}>
          <Pressable style={styles.iconBtn}>
            <Ionicons name="search-outline" size={22} color="#FFF" />
          </Pressable>
          <Pressable style={[styles.iconBtn, { marginLeft: 12 }]}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={22} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {TABS.map(tab => (
          <Pressable
            key={tab}
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab(tab);
            }}
            style={styles.tabItem}
          >
            <ThemedText style={[styles.tabLabel, activeTab === tab && styles.tabLabelActive]}>
              {tab}
            </ThemedText>
            {activeTab === tab && <Animated.View layout={FadeInDown} style={styles.tabIndicator} />}
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingWrapper}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
        <ThemedText style={styles.emptyTitle}>Error Loading Tickets</ThemedText>
        <ThemedText style={styles.emptySub}>{(error as Error).message || "Could not fetch your tickets."}</ThemedText>
        <Pressable
          style={[styles.confirmBtn, { marginTop: 20, width: 200 }]}
          onPress={() => queryClient.invalidateQueries({ queryKey: ["/api/my-tickets"] })}
        >
          <ThemedText style={styles.confirmBtnText}>Try Again</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={filteredTickets}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
        renderItem={({ item, index }) => {
          if (!item.event) return null;
          return (
            <Animated.View entering={FadeInDown.delay(index * 100)} style={styles.ticketWrapper}>
              <View style={styles.ticketCard}>
                <View style={styles.ticketMain}>
                  <Image source={{ uri: resolveImageUrl(item.event.coverImage) }} style={styles.eventThumb} />
                  <View style={styles.ticketInfo}>
                    <ThemedText style={styles.eventTitle}>{item.event.title}</ThemedText>
                    <ThemedText style={styles.eventDate}>
                      {safeFormat(item.event.startDate, "EEE, MMM d · hh:mm a")}
                    </ThemedText>
                    <View style={styles.locationRow}>
                      <Ionicons name="location" size={12} color="#9CA3AF" />
                      <ThemedText style={styles.locationText} numberOfLines={1}>
                        {item.event.location || "Online"}
                      </ThemedText>
                      <View style={[
                        styles.statusBadge,
                        item.status === 'cancelled' ? styles.statusCancelled : styles.statusPaid
                      ]}>
                        <ThemedText style={styles.statusText}>
                          {item.status === 'cancelled' ? 'Cancelled' : 'Paid'}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>

                <View style={styles.ticketActions}>
                  {activeTab === "Upcoming" && (
                    <>
                      <Pressable
                        style={styles.actionBtnSecondary}
                        onPress={() => setCancelItem(item)}
                      >
                        <ThemedText style={styles.actionTextSecondary}>Cancel Booking</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.actionBtnPrimary}
                        onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
                      >
                        <ThemedText style={styles.actionTextPrimary}>View E-Ticket</ThemedText>
                      </Pressable>
                    </>
                  )}
                  {activeTab === "Completed" && (
                    <>
                      <Pressable
                        style={styles.actionBtnSecondary}
                        onPress={() => setReviewItem(item)}
                      >
                        <ThemedText style={styles.actionTextSecondary}>Leave a Review</ThemedText>
                      </Pressable>
                      <Pressable
                        style={styles.actionBtnPrimary}
                        onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
                      >
                        <ThemedText style={styles.actionTextPrimary}>View E-Ticket</ThemedText>
                      </Pressable>
                    </>
                  )}
                  {activeTab === "Cancelled" && (
                    <View style={styles.cancelledStatusRow}>
                      <ThemedText style={styles.cancelledDetail}>This booking was cancelled</ThemedText>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <View style={styles.illustration}>
              <View style={styles.charBody}>
                <View style={styles.charHead} />
              </View>
              <View style={styles.ticketIcon}>
                <Ionicons name="ticket" size={40} color="#7C3AED" />
              </View>
            </View>
            <ThemedText style={styles.emptyTitle}>Empty Tickets</ThemedText>
            <ThemedText style={styles.emptySub}>
              Looks like you don't have a ticket yet.{"\n"}Start searching for events now.
            </ThemedText>
            <Pressable
              style={styles.findBtn}
              onPress={() => navigation.navigate("Explore")}
            >
              <ThemedText style={styles.findBtnText}>Find Events</ThemedText>
            </Pressable>
          </View>
        }
      />

      {/* Leave a Review Modal */}
      <Modal transparent visible={!!reviewItem} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setReviewItem(null)} />
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Leave a Review</ThemedText>
            <ThemedText style={styles.reviewSubTitle}>How was your experience with{"\n"}{reviewItem?.event.title}?</ThemedText>

            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map(star => (
                <Pressable key={star} onPress={() => setRating(star)}>
                  <Ionicons
                    name={rating >= star ? "star" : "star-outline"}
                    size={36}
                    color={rating >= star ? "#7C3AED" : "rgba(255,255,255,0.1)"}
                  />
                </Pressable>
              ))}
            </View>

            <ThemedText style={styles.inputLabel}>Write Your Review</ThemedText>
            <TextInput
              style={styles.reviewInput}
              placeholder="Your review here..."
              placeholderTextColor="#6B7280"
              multiline
              value={comment}
              onChangeText={setComment}
            />

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setReviewItem(null)}>
                <ThemedText style={styles.cancelBtnText}>Maybe Later</ThemedText>
              </Pressable>
              <Pressable
                style={[styles.confirmBtn, rating === 0 && { opacity: 0.5 }]}
                disabled={rating === 0}
                onPress={() => reviewMutation.mutate({ eventId: reviewItem.eventId, rating, comment })}
              >
                <ThemedText style={styles.confirmBtnText}>Submit</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Cancel Booking Modal */}
      <Modal transparent visible={!!cancelItem} animationType="fade">
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCancelItem(null)} />
          <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <ThemedText style={styles.modalTitle}>Cancel Booking</ThemedText>
            <View style={styles.warningBox}>
              <ThemedText style={styles.warningTitle}>Are you sure you want to cancel this event?</ThemedText>
              <ThemedText style={styles.warningSub}>Only 80% of funds will be returned to your account according to our policy.</ThemedText>
            </View>

            <View style={styles.modalButtons}>
              <Pressable style={styles.cancelBtn} onPress={() => setCancelItem(null)}>
                <ThemedText style={styles.cancelBtnText}>No, Don't Cancel</ThemedText>
              </Pressable>
              <Pressable
                style={styles.confirmBtnDanger}
                onPress={() => cancelMutation.mutate(cancelItem.id)}
              >
                <ThemedText style={styles.confirmBtnText}>Yes, Cancel</ThemedText>
              </Pressable>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { paddingHorizontal: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoContainer: { width: 36, height: 36, borderRadius: 10, overflow: "hidden" },
  logoGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
  logoText: { color: "#FFF", fontSize: 20, fontWeight: "900", fontStyle: "italic" },
  headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFF" },
  headerRight: { flexDirection: "row", alignItems: "center" },
  iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabContainer: { flexDirection: "row", gap: 24, marginBottom: 24, paddingHorizontal: 4 },
  tabItem: { position: "relative", paddingBottom: 8 },
  tabLabel: { fontSize: 16, fontWeight: "700", color: "#4B5563" },
  tabLabelActive: { color: "#7C3AED" },
  tabIndicator: { position: "absolute", bottom: 0, left: 0, right: 0, height: 3, backgroundColor: "#7C3AED", borderRadius: 2 },
  ticketWrapper: { paddingHorizontal: 20, marginBottom: 16 },
  ticketCard: { backgroundColor: "#1F2937", borderRadius: 24, padding: 12, ...Shadows.md },
  ticketMain: { flexDirection: "row", alignItems: "center" },
  eventThumb: { width: 80, height: 80, borderRadius: 20 },
  ticketInfo: { flex: 1, marginLeft: 16, gap: 4 },
  eventTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  eventDate: { fontSize: 13, color: "#9CA3AF", fontWeight: "600" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", flex: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  statusPaid: { backgroundColor: "rgba(16, 185, 129, 0.1)" },
  statusCancelled: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
  statusText: { fontSize: 10, fontWeight: "900", color: "#7C3AED" },
  ticketActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  actionBtnPrimary: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  actionTextPrimary: { fontSize: 14, fontWeight: "800", color: "#FFF" },
  actionBtnSecondary: { flex: 1, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  actionTextSecondary: { fontSize: 14, fontWeight: "700", color: "#FFF" },
  cancelledStatusRow: { flex: 1, alignItems: "center", paddingVertical: 4 },
  cancelledDetail: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 40 },
  illustration: { width: 220, height: 220, justifyContent: "center", alignItems: "center", marginBottom: 24 },
  charBody: { width: 100, height: 120, backgroundColor: "#312E81", borderRadius: 50, position: "relative" },
  charHead: { width: 20, height: 20, backgroundColor: "#F97316", borderRadius: 10, position: "absolute", top: -10, alignSelf: "center" },
  ticketIcon: { position: "absolute", justifyContent: "center", alignItems: "center" },
  emptyTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", marginBottom: 8 },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 22 },
  findBtn: { marginTop: 32, height: 56, paddingHorizontal: 32, borderRadius: 28, backgroundColor: "#7C3AED", justifyContent: "center", alignItems: "center" },
  findBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#1F2937", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "center", marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: "900", color: "#FFF", textAlign: "center", marginBottom: 12 },
  reviewSubTitle: { fontSize: 15, color: "#D1D5DB", textAlign: "center", marginBottom: 24, lineHeight: 22 },
  starsRow: { flexDirection: "row", justifyContent: "center", gap: 12, marginBottom: 32 },
  inputLabel: { fontSize: 16, fontWeight: "800", color: "#FFF", marginBottom: 12 },
  reviewInput: { backgroundColor: "#111827", borderRadius: 16, padding: 16, height: 120, color: "#FFF", textAlignVertical: "top", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", marginBottom: 32 },
  warningBox: { backgroundColor: "rgba(239, 68, 68, 0.05)", padding: 20, borderRadius: 24, marginBottom: 32, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.1)" },
  warningTitle: { fontSize: 16, fontWeight: "800", color: "#FFF", textAlign: "center", marginBottom: 8 },
  warningSub: { fontSize: 13, color: "#9CA3AF", textAlign: "center", lineHeight: 20 },
  modalButtons: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
  confirmBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
  confirmBtnDanger: { flex: 1, height: 56, borderRadius: 28, backgroundColor: "#EF4444", justifyContent: "center", alignItems: "center" },
  confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
  cancelBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
});
