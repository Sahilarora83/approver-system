import React from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { TicketCard } from "@/components/TicketCard";
import { EmptyState } from "@/components/EmptyState";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/query-client";

export default function MyTicketsScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { data: tickets, isLoading, refetch, error } = useQuery<any[]>({
    queryKey: ["/api/my-tickets", user?.email],
    queryFn: async () => {
      const url = user?.email
        ? `/api/my-tickets?email=${encodeURIComponent(user.email)}`
        : '/api/my-tickets';

      console.log('[MyTickets] Fetching from:', url);
      const res = await apiRequest("GET", url);
      const data = await res.json();
      console.log('[MyTickets] Received tickets:', data);
      return data;
    },
    enabled: !!user?.email,
  });

  React.useEffect(() => {
    console.log('[MyTickets] Tickets data:', tickets);
    console.log('[MyTickets] Is loading:', isLoading);
    console.log('[MyTickets] Error:', error);
  }, [tickets, isLoading, error]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('[MyTickets] Screen focused, refetching...');
      refetch();
    });
    return unsubscribe;
  }, [navigation, refetch]);

  const safeFormat = (date: any, formatStr: string) => {
    try {
      if (!date) return "TBD";
      const d = new Date(date);
      if (isNaN(d.getTime())) return "TBD";
      // Using native toLocaleDateString as a fallback or if date-fns fails
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


  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2">My Tickets</ThemedText>
      <ThemedText type="body" style={styles.subtitle}>
        Your registered events and tickets
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-tickets.png")}
      title="No Tickets Yet"
      description="Register for events to see your tickets here."
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={(tickets || []).filter((t: any) => t.status === 'approved' || t.status === 'checked_in' || t.status === 'checked_out')}
      keyExtractor={(item: any) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => (
        <TicketCard
          eventTitle={item.event?.title || "Event"}
          participantName={item.name}
          date={safeFormat(item.event?.startDate, "")}
          location={item.event?.location || "Location TBD"}

          qrCode={item.qrCode}
          status={item.status}
          showQR={false}
          onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={refetch} tintColor={theme.primary} />
      }
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    marginBottom: Spacing["2xl"],
  },
  subtitle: {
    opacity: 0.7,
    marginTop: Spacing.xs,
  },
});
