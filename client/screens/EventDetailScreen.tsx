import React, { useState } from "react";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable, Share } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ThemedText";
import { RegistrationRow } from "@/components/RegistrationRow";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient, getApiUrl } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type Tab = "registrations" | "settings";
type FilterStatus = "all" | "pending" | "approved" | "rejected" | "checked_in";

export default function EventDetailScreen({ route, navigation }: any) {
  const { eventId } = route.params;
  const headerHeight = useHeaderHeight();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<Tab>("registrations");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const { data: event, isLoading: eventLoading, refetch: refetchEvent } = useQuery({
    queryKey: ["/api/events", eventId],
  });

  const { data: registrations, isLoading: regsLoading, refetch: refetchRegs } = useQuery({
    queryKey: ["/api/events", eventId, "registrations"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ regId, status }: { regId: string; status: string }) => {
      return apiRequest("PATCH", `/api/registrations/${regId}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const isLoading = eventLoading || regsLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchEvent(), refetchRegs()]);
  };

  const handleCopyLink = async () => {
    if (event?.publicLink) {
      await Clipboard.setStringAsync(`${getApiUrl()}register/${event.publicLink}`);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  const handleShare = async () => {
    if (event?.publicLink) {
      await Share.share({
        message: `Register for ${event.title}: ${getApiUrl()}register/${event.publicLink}`,
      });
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

  const filteredRegistrations = (registrations || []).filter((reg: any) => {
    if (filterStatus === "all") return true;
    return reg.status === filterStatus;
  });

  const stats = {
    total: registrations?.length || 0,
    pending: registrations?.filter((r: any) => r.status === "pending").length || 0,
    approved: registrations?.filter((r: any) => r.status === "approved").length || 0,
    checkedIn: registrations?.filter((r: any) => r.status === "checked_in").length || 0,
  };

  const filters: { key: FilterStatus; label: string }[] = [
    { key: "all", label: "All" },
    { key: "pending", label: "Pending" },
    { key: "approved", label: "Approved" },
    { key: "checked_in", label: "Checked In" },
  ];

  const renderHeader = () => (
    <View style={styles.header}>
      <ThemedText type="h2" numberOfLines={2}>
        {event?.title || "Event"}
      </ThemedText>
      <View style={styles.eventMeta}>
        <View style={styles.metaRow}>
          <Icon name="calendar" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.metaText}>
            {event?.startDate ? formatDate(event.startDate) : "Date TBD"}
          </ThemedText>
        </View>
        <View style={styles.metaRow}>
          <Icon name="map-pin" size={16} color={theme.textSecondary} />
          <ThemedText type="body" style={styles.metaText}>
            {event?.location || "Location TBD"}
          </ThemedText>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleCopyLink}
          style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Icon name="link" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary }}>
            Copy Link
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleShare}
          style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Icon name="share-2" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary }}>
            Share
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.statsRow}>
        <StatCard icon="users" label="Total" value={stats.total} color={theme.primary} />
        <StatCard icon="clock" label="Pending" value={stats.pending} color={theme.warning} />
        <StatCard icon="check-circle" label="Checked In" value={stats.checkedIn} color={theme.success} />
      </View>

      <View style={[styles.tabContainer, { backgroundColor: theme.backgroundSecondary }]}>
        {(["registrations", "settings"] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              styles.tab,
              activeTab === tab && { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText
              type="body"
              style={[
                styles.tabText,
                activeTab === tab && { color: theme.primary, fontWeight: "600" },
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {activeTab === "registrations" ? (
        <View style={styles.filters}>
          {filters.map((filter) => (
            <Pressable
              key={filter.key}
              onPress={() => setFilterStatus(filter.key)}
              style={[
                styles.filterButton,
                {
                  backgroundColor:
                    filterStatus === filter.key ? `${theme.primary}15` : theme.backgroundDefault,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterStatus === filter.key ? theme.primary : theme.textSecondary,
                  fontWeight: filterStatus === filter.key ? "600" : "400",
                }}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );

  const renderEmpty = () => (
    <EmptyState
      image={require("../../assets/images/empty-tickets.png")}
      title="No Registrations"
      description="Share the event link to start collecting registrations."
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.backgroundRoot }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  if (activeTab === "settings") {
    return (
      <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingTop: headerHeight + Spacing.xl,
            paddingBottom: insets.bottom + Spacing["2xl"],
            paddingHorizontal: Spacing.lg,
          }}
          data={[]}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={() => (
            <View style={[styles.settingsCard, { backgroundColor: theme.backgroundDefault }]}>
              <ThemedText type="h4" style={styles.settingsTitle}>
                Event Settings
              </ThemedText>
              <View style={styles.settingRow}>
                <ThemedText type="body">Requires Approval</ThemedText>
                <ThemedText type="body" style={{ color: theme.primary }}>
                  {event?.requiresApproval ? "Yes" : "No"}
                </ThemedText>
              </View>
              <View style={styles.settingRow}>
                <ThemedText type="body">Check-in Enabled</ThemedText>
                <ThemedText type="body" style={{ color: theme.primary }}>
                  {event?.checkInEnabled ? "Yes" : "No"}
                </ThemedText>
              </View>
            </View>
          )}
          renderItem={() => null}
        />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: insets.bottom + Spacing["2xl"],
        paddingHorizontal: Spacing.lg,
        flexGrow: 1,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
      data={filteredRegistrations}
      keyExtractor={(item: any) => item.id}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      renderItem={({ item }) => (
        <RegistrationRow
          name={item.name}
          email={item.email}
          date={formatDate(item.createdAt)}
          status={item.status}
          onApprove={
            event?.requiresApproval && item.status === "pending"
              ? () => updateStatusMutation.mutate({ regId: item.id, status: "approved" })
              : undefined
          }
          onReject={
            event?.requiresApproval && item.status === "pending"
              ? () => updateStatusMutation.mutate({ regId: item.id, status: "rejected" })
              : undefined
          }
          onPress={() => navigation.navigate("TicketView", { registrationId: item.id })}
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
  eventMeta: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  metaText: {
    opacity: 0.7,
  },
  actions: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing["2xl"],
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing["2xl"],
  },
  tabContainer: {
    flexDirection: "row",
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    marginTop: Spacing["2xl"],
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderRadius: BorderRadius.xs,
  },
  tabText: {
    fontWeight: "500",
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  filterButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  settingsCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  settingsTitle: {
    marginBottom: Spacing.lg,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
});
