import React from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TicketCard } from "@/components/TicketCard";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";
import { Feather } from "@expo/vector-icons";
import Animated, { FadeInUp } from "react-native-reanimated";

export default function MyTicketsScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

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

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);

  const safeFormat = (date: any) => {
    try {
      if (!date) return "TBD";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "TBD";
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch (e) {
      return "TBD";
    }
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <ThemedText style={styles.title}>My Tickets</ThemedText>
        <Pressable style={styles.iconButton}>
          <Feather name="more-horizontal" size={24} color="#FFF" />
        </Pressable>
      </View>
      <ThemedText style={styles.subtitle}>
        You have {(tickets || []).length} registered tickets
      </ThemedText>
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
            paddingBottom: tabBarHeight + 40,
          }
        ]}
        data={(tickets || []).filter((t: any) => t.status === 'approved' || t.status === 'checked_in' || t.status === 'checked_out')}
        keyExtractor={(item: any) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.delay(index * 100).duration(500)}>
            <TicketCard
              eventTitle={item.event?.title || "Event"}
              participantName={item.name}
              date={safeFormat(item.event?.startDate)}
              location={item.event?.location || "Location TBD"}
              qrCode={item.qrCode}
              status={item.status}
              showQR={false}
              onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
            />
          </Animated.View>
        )}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor="#7C3AED" />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Feather name="layers" size={80} color="#374151" />
            <ThemedText style={styles.emptyTitle}>No Tickets Yet</ThemedText>
            <ThemedText style={styles.emptySub}>Register for events to see your tickets here</ThemedText>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111827",
  },
  mainList: {
    paddingHorizontal: Spacing.lg,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: 32,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#1F2937",
    justifyContent: "center",
    alignItems: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginTop: 20,
  },
  emptySub: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },
});
