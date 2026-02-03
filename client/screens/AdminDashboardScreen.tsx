import React from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { Icon } from "@/components/Icon";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { ThemedText } from "@/components/ThemedText";
import { StatCard } from "@/components/StatCard";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing } from "@/constants/theme";
import { Event } from "@shared/schema";

type AdminStats = {
  totalEvents: number;
  totalRegistrations: number;
  totalCheckedIn: number;
  totalPending: number;
};

export default function AdminDashboardScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    refetchOnWindowFocus: true,
  });

  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = useQuery<(Event & { registrationCount: number })[]>({
    queryKey: ["/api/events"],
    refetchOnWindowFocus: true,
  });

  const isLoading = statsLoading || eventsLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchEvents()]);
  };

  const formatDate = (date: string | Date) => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1 }}>
          <ThemedText type="h2" style={styles.greeting}>
            Welcome, {user?.name?.split(" ")[0] || "Admin"}
          </ThemedText>
          <ThemedText type="body" style={styles.subtitle}>
            Here's your event overview
          </ThemedText>
        </View>
        <Pressable
          onPress={() => navigation.navigate("Notifications")}
          style={({ pressed }) => [
            styles.notificationButton,
            { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Icon name="bell" size={22} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard
          icon="calendar"
          label="Total Events"
          value={stats?.totalEvents || 0}
          color={theme.primary}
        />
        <StatCard
          icon="users"
          label="Registrations"
          value={stats?.totalRegistrations || 0}
          color={theme.success}
        />
      </View>
      <View style={styles.statsRow}>
        <StatCard
          icon="check-circle"
          label="Checked In"
          value={stats?.totalCheckedIn || 0}
          color={theme.checkedIn}
        />
        <StatCard
          icon="clock"
          label="Pending"
          value={stats?.totalPending || 0}
          color={theme.warning}
        />
      </View>

      <ThemedText type="h3" style={styles.sectionTitle}>
        Your Events
      </ThemedText>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-events.png")}
      title="No Events Yet"
      description="Create your first event to start managing registrations and tickets."
      actionLabel="Create Event"
      onAction={() => navigation.navigate("CreateEvent")}
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
      data={events || []}
      keyExtractor={(item: any) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => (
        <EventCard
          title={item.title}
          date={formatDate(item.startDate)}
          location={item.location || "Location TBD"}
          registrations={item.registrationCount || 0}
          status={item.registrationCount > 0 ? "approved" : "pending"}
          onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}
        />
      )}
      refreshControl={
        <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={theme.primary} />
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
    marginBottom: Spacing.lg,
  },
  greeting: {
    marginBottom: Spacing.xs,
  },
  subtitle: {
    opacity: 0.7,
    marginBottom: Spacing["2xl"],
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});
