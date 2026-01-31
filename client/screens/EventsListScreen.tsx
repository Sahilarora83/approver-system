import React from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { EventCard } from "@/components/EventCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

export default function EventsListScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { data: events, isLoading, refetch } = useQuery({
    queryKey: ["/api/events"],
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2">My Events</ThemedText>
      <Pressable
        onPress={() => navigation.navigate("CreateEvent")}
        style={[styles.addButton, { backgroundColor: theme.primary }]}
      >
        <Feather name="plus" size={20} color="#fff" />
      </Pressable>
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-events.png")}
      title="No Events Yet"
      description="Create your first event to get started with ticket management."
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
