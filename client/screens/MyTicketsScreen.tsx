import React from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Image } from "expo-image";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, resolveImageUrl } from "@/lib/query-client";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeInUp, FadeInRight } from "react-native-reanimated";
import { format } from "date-fns";

export default function MyTicketsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = React.useState("Upcoming");

  const { data: tickets, isLoading, refetch, isFetching } = useQuery<any[]>({
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

  const filteredTickets = React.useMemo(() => {
    if (!tickets) return [];
    const now = new Date();
    return tickets.filter(t => {
      const eventDate = t.event?.startDate ? new Date(t.event.startDate) : null;
      if (activeTab === "Upcoming") return t.status !== 'cancelled' && eventDate && eventDate >= now;
      if (activeTab === "Completed") return t.status === 'checked_in' || t.status === 'checked_out' || (eventDate && eventDate < now && t.status !== 'cancelled');
      if (activeTab === "Cancelled") return t.status === 'cancelled';
      return true;
    });
  }, [tickets, activeTab]);

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <ThemedText style={styles.title}>Tickets</ThemedText>
        <View style={styles.headerActions}>
          <Pressable style={styles.iconButton}>
            <Feather name="search" size={22} color="#FFF" />
          </Pressable>
          <Pressable style={[styles.iconButton, { marginLeft: 12 }]}>
            <Feather name="more-horizontal" size={22} color="#FFF" />
          </Pressable>
        </View>
      </View>

      <View style={styles.tabContainer}>
        {["Upcoming", "Completed", "Cancelled"].map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </ThemedText>
          </Pressable>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: "#111827" }]}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        contentContainerStyle={[
          styles.mainList,
          {
            paddingTop: insets.top + Spacing.lg,
            paddingBottom: 100,
          }
        ]}
        data={filteredTickets}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInRight.delay(index * 100)}>
            <Pressable
              style={styles.ticketItem}
              onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
            >
              <Image source={{ uri: resolveImageUrl(item.event?.coverImage) }} style={styles.eventThumb} />
              <View style={styles.ticketInfo}>
                <ThemedText style={styles.eventTitle} numberOfLines={1}>{item.event?.title}</ThemedText>
                <ThemedText style={styles.eventTime}>
                  {item.event?.startDate ? format(new Date(item.event.startDate), "EEE, MMM d · h:mm a") : "TBD"}
                </ThemedText>
                <View style={styles.locationRow}>
                  <Feather name="map-pin" size={12} color="#9CA3AF" />
                  <ThemedText style={styles.locationText} numberOfLines={1}>{item.event?.location}</ThemedText>
                </View>
              </View>
              <View style={[
                styles.statusBadge,
                item.status === 'cancelled' ? styles.cancelledBadge :
                  item.status === 'approved' ? styles.paidBadge : styles.completedBadge
              ]}>
                <ThemedText style={styles.statusText}>
                  {item.status === 'approved' ? 'Paid' : item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                </ThemedText>
              </View>
            </Pressable>
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#7C3AED" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <MaterialCommunityIcons name="ticket-outline" size={80} color="#374151" />
            </View>
            <ThemedText style={styles.emptyTitle}>Empty Tickets</ThemedText>
            <ThemedText style={styles.emptySub}>
              Looks like you don't have a ticket yet.{"\n"}
              Start searching for events now by clicking the button below.
            </ThemedText>
            <Pressable style={styles.findButton} onPress={() => navigation.navigate("Explore")}>
              <ThemedText style={styles.findButtonText}>Find Events</ThemedText>
            </Pressable>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  mainList: { paddingHorizontal: 24 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { marginBottom: 24, gap: 20 },
  headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerActions: { flexDirection: "row", alignItems: "center" },
  title: { fontSize: 32, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  tabContainer: { flexDirection: "row", gap: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)", paddingBottom: 10 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  activeTab: { backgroundColor: "rgba(124, 58, 237, 0.1)" },
  tabText: { color: "#9CA3AF", fontSize: 15, fontWeight: "700" },
  activeTabText: { color: "#7C3AED" },
  ticketItem: { flexDirection: "row", alignItems: "center", backgroundColor: "#1F2937", borderRadius: 24, padding: 12, marginBottom: 16, ...Shadows.md },
  eventThumb: { width: 80, height: 80, borderRadius: 18 },
  ticketInfo: { flex: 1, marginLeft: 16, gap: 4 },
  eventTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
  eventTime: { fontSize: 13, color: "#7C3AED", fontWeight: "700" },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  paidBadge: { backgroundColor: "rgba(16, 185, 129, 0.1)" },
  completedBadge: { backgroundColor: "rgba(59, 130, 246, 0.1)" },
  cancelledBadge: { backgroundColor: "rgba(239, 68, 68, 0.1)" },
  statusText: { fontSize: 11, fontWeight: "800", color: "#FFF" },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 80, paddingHorizontal: 20 },
  emptyIllustration: { width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.03)", justifyContent: "center", alignItems: "center", marginBottom: 24 },
  emptyTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", marginBottom: 12 },
  emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", lineHeight: 22, marginBottom: 32 },
  findButton: { backgroundColor: "#7C3AED", paddingVertical: 16, paddingHorizontal: 32, borderRadius: 28, ...Shadows.lg },
  findButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
