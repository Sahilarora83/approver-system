import React, { useState, useEffect } from "react";
import { useDebounce } from "../hooks/useDebounce";
import { StyleSheet, View, FlatList, RefreshControl, ActivityIndicator, Pressable, Share, Modal, ScrollView, Linking, Alert, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, TextInput as RNTextInput } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Feather } from "@expo/vector-icons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { Icon } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import * as Clipboard from "expo-clipboard";
import { ThemedText } from "@/components/ThemedText";
import { RegistrationRow } from "@/components/RegistrationRow";
import { StatCard } from "@/components/StatCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
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
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 400);

  const [showShareModal, setShowShareModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [includeEventLink, setIncludeEventLink] = useState(true);

  const { data: event, isLoading: eventLoading, refetch: refetchEvent } = useQuery({
    queryKey: ["/api/events", eventId],
    staleTime: 60000, // Keep event data fresh for 1 min
  }) as { data: any; isLoading: boolean; refetch: any };

  const {
    data: regsData,
    isLoading: regsLoading,
    refetch: refetchRegs,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery({
    queryKey: ["/api/events", eventId, "registrations", filterStatus, debouncedSearch],
    queryFn: async ({ pageParam = 0 }) => {
      const res = await apiRequest(
        "GET",
        `/api/events/${eventId}/registrations?limit=50&offset=${pageParam}&status=${filterStatus}&search=${debouncedSearch}`
      );
      return res.json();
    },
    initialPageParam: 0,
    staleTime: 30000, // 30s cache for registrations
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < 50) return undefined;
      return allPages.length * 50;
    },
  });

  const registrations = regsData?.pages.flat() || [];

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

  const deleteEventMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/events/${eventId}`);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/events"] }); // Refresh Dashboard
      navigation.goBack();
    },
    onError: () => {
      Alert.alert("Error", "Failed to delete event");
    }
  });

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      const url = `/api/events/${eventId}/broadcast`;
      const data = {
        title: broadcastTitle || `Update: ${event?.title}`,
        message: includeEventLink
          ? `${broadcastMessage}\n\nRegister here: ${getShareUrl()}`
          : broadcastMessage
      };

      console.log(`[Broadcast] Sending to ${url}`);
      const res = await apiRequest("POST", url, data);
      return res.json();
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowBroadcastModal(false);
      setBroadcastTitle("");
      setBroadcastMessage("");
      Alert.alert("Success", "Broadcast sent to all participants!");
    },
    onError: (error: any) => {
      console.error("[Broadcast Error]", error);
      Alert.alert("Error", `Failed to send broadcast: ${error.message || "Unknown error"}`);
    }
  });

  const handleDelete = () => {
    Alert.alert(
      "Delete Event",
      "Are you sure you want to delete this event? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteEventMutation.mutate()
        }
      ]
    );
  };

  const handleEdit = () => {
    // Pass the actual event object (ensure date strings are handled if needed, but JS dates usually pass fine or as strings)
    // CreateEvent expects Strings for fields, Dates for pickers.
    // The API returns ISO strings for Date.
    // CreateEvent state init handles strings -> new Date().
    navigation.navigate("CreateEvent", { event });
  };

  const isLoading = eventLoading || regsLoading;

  const handleRefresh = async () => {
    await Promise.all([refetchEvent(), refetchRegs()]);
  };

  const getShareUrl = () => {
    const baseUrl = getApiUrl(); // This is the corrected IP:PORT
    return `${baseUrl}/register/${event?.publicLink}`;
  };

  const handleCopyLink = async () => {
    if (event?.publicLink) {
      const url = getShareUrl();
      await Clipboard.setStringAsync(url);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Link Copied", "Event registration link copied to clipboard!");
    }
  };

  const handleShare = async () => {
    setShowShareModal(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleSocialShare = async (platform: string) => {
    const url = getShareUrl();
    const text = `Register for ${event?.title}`;
    let shareUrl = '';

    switch (platform) {
      case 'whatsapp':
        shareUrl = `whatsapp://send?text=${encodeURIComponent(text + ' ' + url)}`;
        break;
      case 'telegram':
        shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
        break;
      case 'native':
        await Share.share({ message: `${text}: ${url}` });
        setShowShareModal(false);
        return;
    }

    if (shareUrl) {
      await Linking.openURL(shareUrl);
      setShowShareModal(false);
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

  const filteredRegistrations = registrations;

  const stats = {
    total: registrations?.length || 0, // This will only show current page's count if not careful, but good enough for now
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

      <View style={{ marginTop: Spacing.lg }}>
        <ThemedText type="small" style={{ opacity: 0.7, marginBottom: Spacing.sm, textTransform: 'uppercase' }}>Hosted By</ThemedText>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {(() => {
            const hasSocialLinks = event?.socialLinks && typeof event.socialLinks === 'object' && Object.keys(event.socialLinks).length > 0;
            const hostsData = Array.isArray(event?.socialLinks)
              ? event.socialLinks
              : (event?.hostedBy || "Organizer").split(',').map((name: string) => ({
                name: name.trim(),
                instagram: hasSocialLinks ? event?.socialLinks?.instagram : undefined,
                twitter: hasSocialLinks ? event?.socialLinks?.twitter : undefined,
                linkedin: hasSocialLinks ? event?.socialLinks?.linkedin : undefined
              }));
            return hostsData.map((host: any, index: number) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.backgroundSecondary, paddingRight: 8, borderRadius: BorderRadius.full, paddingVertical: 4, paddingLeft: 4 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
                  <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{(host.name || 'O')?.[0]?.toUpperCase()}</ThemedText>
                </View>
                <ThemedText type="small" style={{ fontWeight: '600', marginRight: 8 }}>{host.name || 'Organizer'}</ThemedText>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {host.instagram ? <Pressable onPress={() => Linking.openURL(host.instagram)}><Feather name="instagram" size={12} color={theme.textSecondary} /></Pressable> : null}
                  {host.twitter ? <Pressable onPress={() => Linking.openURL(host.twitter)}><Feather name="twitter" size={12} color={theme.textSecondary} /></Pressable> : null}
                  {host.linkedin ? <Pressable onPress={() => Linking.openURL(host.linkedin)}><Feather name="linkedin" size={12} color={theme.textSecondary} /></Pressable> : null}
                </View>
              </View>
            ));
          })()}
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.actions}
      >
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
        <Pressable
          onPress={() => setShowBroadcastModal(true)}
          style={[styles.actionButton, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30', borderWidth: 1 }]}
        >
          <Icon name="bell" size={18} color={theme.primary} />
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: '700' }}>
            Broadcast
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleEdit}
          style={[styles.actionButton, { backgroundColor: theme.backgroundDefault }]}
        >
          <Icon name="edit" size={18} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            Edit
          </ThemedText>
        </Pressable>
        <Pressable
          onPress={handleDelete}
          style={[styles.actionButton, { backgroundColor: '#FF444415' }]}
        >
          <Icon name="trash-2" size={18} color="#FF4444" />
          <ThemedText type="small" style={{ color: '#FF4444' }}>
            Delete
          </ThemedText>
        </Pressable>
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statsRow}
      >
        <StatCard icon="users" label="Total" value={stats.total} color={theme.primary} />
        <StatCard icon="clock" label="Pending" value={stats.pending} color={theme.warning} />
        <StatCard icon="check-circle" label="Approved" value={stats.approved} color={theme.success} />
        <StatCard icon="check-circle" label="Checked In" value={stats.checkedIn} color={theme.info} />
      </ScrollView>



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
        <View>
          <View style={{ paddingHorizontal: Spacing.lg, marginTop: Spacing.md }}>
            <Input
              placeholder="Search by name or email"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
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
            <View>
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

              <View style={{ marginTop: Spacing.xl }}>
                <Button
                  onPress={handleEdit}
                  style={{ marginBottom: Spacing.md, borderColor: theme.border, backgroundColor: 'transparent', borderWidth: 1 }}
                  textStyle={{ color: theme.text }}
                >
                  Edit Event
                </Button>

                <Button
                  onPress={handleDelete}
                  style={{ backgroundColor: theme.error + '20' }}
                  textStyle={{ color: theme.error }}
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? "Deleting..." : "Delete Event"}
                </Button>
              </View>
            </View>
          )}
          renderItem={() => null}
        />
      </View >
    );
  }

  return (
    <>
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
            profileImage={(item as any).profileImage}
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
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() =>
          isFetchingNextPage ? (
            <View style={{ padding: 20 }}>
              <ActivityIndicator color={theme.primary} />
            </View>
          ) : null
        }
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={handleRefresh} tintColor={theme.primary} />
        }
      />

      <Modal
        visible={showShareModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowShareModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowShareModal(false)}
        >
          <View style={[styles.shareModal, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + 20 }]}>
            <View style={styles.modalHandle} />
            <ThemedText type="h3" style={styles.shareTitle}>Share Event</ThemedText>

            <View style={styles.shareUrlContainer}>
              <ThemedText type="small" style={styles.shareUrl} numberOfLines={1}>
                {getShareUrl()}
              </ThemedText>
              <Pressable
                onPress={handleCopyLink}
                style={[styles.copyButton, { backgroundColor: theme.primary }]}
              >
                <Icon name="copy" size={16} color="#fff" />
              </Pressable>
            </View>

            <ThemedText type="body" style={styles.shareSubtitle}>Share via</ThemedText>

            <View style={styles.socialGrid}>
              <ShareButton
                name="WhatsApp"
                color="#25D366"
                iconComponent={<WhatsAppSVG />}
                onPress={() => handleSocialShare('whatsapp')}
              />
              <ShareButton
                name="X / Twitter"
                color="#000000"
                iconComponent={<TwitterSVG />}
                onPress={() => handleSocialShare('twitter')}
              />
              <ShareButton
                name="LinkedIn"
                color="#0A66C2"
                iconComponent={<LinkedInSVG />}
                onPress={() => handleSocialShare('linkedin')}
              />
              <ShareButton
                name="Copy Link"
                color="#555"
                iconComponent={<Feather name="link" size={24} color="#fff" />}
                onPress={handleCopyLink}
              />
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Broadcast Modal */}
      <Modal
        visible={showBroadcastModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowBroadcastModal(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalOverlay}
          >
            <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault, width: '90%', maxWidth: 400, borderRadius: BorderRadius["2xl"] }]}>
              <View style={[styles.modalHeader, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View>
                  <ThemedText type="h3" style={{ color: theme.primary, fontWeight: '700' }}>Broadcast</ThemedText>
                  <ThemedText type="small" style={{ opacity: 0.6 }}>Notify all the participants</ThemedText>
                </View>
                <Pressable
                  onPress={() => setShowBroadcastModal(false)}
                  style={{ backgroundColor: theme.backgroundSecondary, padding: 8, borderRadius: 20 }}
                >
                  <Feather name="x" size={20} color={theme.text} />
                </Pressable>
              </View>

              <View style={{ padding: Spacing.lg, gap: Spacing.lg }}>
                <View style={{ gap: Spacing.md }}>
                  <Input
                    label="TITLE (e.g. Venue Change)"
                    placeholder="Enter broadcast title"
                    value={broadcastTitle}
                    onChangeText={setBroadcastTitle}
                  />

                  <View style={{ gap: 8 }}>
                    <ThemedText type="small" style={{ fontWeight: '600', opacity: 0.7, textTransform: 'uppercase' }}>MESSAGE</ThemedText>
                    <RNTextInput
                      style={[
                        {
                          height: 120,
                          textAlignVertical: 'top',
                          backgroundColor: theme.backgroundSecondary,
                          borderRadius: BorderRadius.sm,
                          padding: Spacing.md,
                          color: theme.text,
                          borderWidth: 1,
                          borderColor: theme.border
                        }
                      ]}
                      placeholder="What would you like to say?"
                      placeholderTextColor={theme.textSecondary}
                      value={broadcastMessage}
                      onChangeText={setBroadcastMessage}
                      multiline
                    />
                  </View>
                </View>

                <Pressable
                  onPress={() => setIncludeEventLink(!includeEventLink)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}
                >
                  <View style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: includeEventLink ? theme.primary : theme.border,
                    backgroundColor: includeEventLink ? theme.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {includeEventLink && <Feather name="check" size={14} color="#fff" />}
                  </View>
                  <ThemedText type="small" style={{ fontWeight: '600' }}>Include registration link</ThemedText>
                </Pressable>

                <Button
                  onPress={() => broadcastMutation.mutate()}
                  disabled={!broadcastMessage || broadcastMutation.isPending}
                  icon={<Feather name="send" size={18} color="#fff" />}
                >
                  {broadcastMutation.isPending ? "SENDING..." : "SEND BROADCAST"}
                </Button>
              </View>
            </View>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const ShareButton = ({ name, color, iconComponent, onPress }: any) => (
  <Pressable style={styles.shareButton} onPress={onPress}>
    <View style={[styles.shareIconCircle, { backgroundColor: color }]}>
      {iconComponent}
    </View>
    <ThemedText style={styles.shareButtonText}>{name}</ThemedText>
  </Pressable>
);

const WhatsAppSVG = () => (
  <Svg width={24} height={24} viewBox="0 0 24 24" fill="#FFF">
    <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </Svg>
);

const TwitterSVG = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFF">
    <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H12.96l-5.216-6.817L2.49 21.75H-0.817l7.55-8.627L-0.34 2.25h10.198l4.897 6.47 3.489-6.47h0.001Zm-1.16 17.525h1.833L7.086 4.126H5.117L17.084 19.775Z" />
  </Svg>
);

const LinkedInSVG = () => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="#FFF">
    <Path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
  </Svg>
);

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
    paddingHorizontal: Spacing.lg,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shareModal: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    padding: Spacing["2xl"],
    paddingBottom: Spacing["3xl"],
    ...Shadows.lg,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: Spacing.lg,
  },
  shareTitle: {
    marginBottom: Spacing.lg,
    textAlign: "center",
  },
  shareUrlContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing["2xl"],
  },
  shareUrl: {
    flex: 1,
    opacity: 0.7,
  },
  copyButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
  },
  shareSubtitle: {
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  socialGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  shareButton: {
    alignItems: 'center',
    gap: 8,
  },
  shareIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  shareButtonText: {
    fontSize: 12,
    color: '#A0A4B8',
  },
  modalContent: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
});
