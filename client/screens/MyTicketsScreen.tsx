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

export default function MyTicketsScreen({ navigation }: any) {
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const { data: tickets, isLoading, refetch } = useQuery({
    queryKey: ["/api/my-tickets"],
  });

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
      data={tickets || []}
      keyExtractor={(item: any) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => (
        <TicketCard
          eventTitle={item.event?.title || "Event"}
          participantName={item.name}
          date={item.event?.startDate ? formatDate(item.event.startDate) : "Date TBD"}
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
