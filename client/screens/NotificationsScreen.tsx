import React, { useLayoutEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";

const COLORS = {
    background: "#111827",
    card: "#1F2937",
    primary: "#7C3AED",
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    accent: "#10B981",
};

export default function NotificationsScreen({ navigation }: any) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading, refetch } = useQuery({
        queryKey: ["/api/notifications"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/notifications");
            return res.json();
        },
        staleTime: 30000,
    }) as { data: any[]; isLoading: boolean; refetch: any };

    const markReadMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("PATCH", `/api/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            const unread = notifications.filter((n: any) => !n.read);
            if (unread.length === 0) return;
            await Promise.all(unread.map((n: any) =>
                apiRequest("PATCH", `/api/notifications/${n.id}/read`)
            ));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    });

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Notifications",
            headerShown: true,
            headerStyle: { backgroundColor: COLORS.background },
            headerTintColor: COLORS.text,
            headerTitleStyle: { fontWeight: "900", fontSize: 20 },
            headerShadowVisible: false,
            headerRight: () => (
                <Pressable
                    onPress={() => markAllReadMutation.mutate()}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8, marginRight: 8 })}
                >
                    <ThemedText style={{ color: COLORS.primary, fontWeight: '800', fontSize: 13 }}>Clear All</ThemedText>
                </Pressable>
            ),
        });
    }, [navigation, notifications]);

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'new_event':
                return { icon: 'calendar', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.15)' };
            case 'new_registration':
                return { icon: 'user', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.15)' };
            case 'registration_approved':
                return { icon: 'check-circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
            case 'registration_rejected':
                return { icon: 'x-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
            case 'broadcast':
                return { icon: 'mail', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)' };
            default:
                return { icon: 'bell', color: COLORS.primary, bg: 'rgba(124, 58, 237, 0.15)' };
        }
    };

    const handlePress = (item: any) => {
        if (!item.read) markReadMutation.mutate(item.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (item.type === 'new_event' && item.relatedId) {
            navigation.navigate('ParticipantEventDetail', { eventId: item.relatedId });
        } else if (item.type === 'broadcast' && item.relatedId) {
            navigation.navigate('ParticipantEventDetail', { eventId: item.relatedId });
        } else if (item.type?.startsWith('registration_') && item.relatedId) {
            navigation.navigate('Tickets');
        }
    };

    const renderItem = ({ item, index }: any) => {
        const { icon, color, bg } = getIconInfo(item.type);
        const typeLabel = (item.type || 'system').toUpperCase().replace('_', ' ');

        return (
            <Animated.View entering={FadeInRight.delay(index * 50).duration(400).springify()}>
                <Pressable
                    onPress={() => handlePress(item)}
                    style={({ pressed }) => [
                        styles.item,
                        {
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            backgroundColor: item.read ? "rgba(31, 41, 55, 0.4)" : "rgba(124, 58, 237, 0.08)",
                            borderColor: !item.read ? "rgba(124, 58, 237, 0.3)" : "rgba(255, 255, 255, 0.05)",
                        },
                        !item.read && Shadows.md
                    ]}
                >
                    <View style={[styles.iconBox, { backgroundColor: bg }]}>
                        <Icon name={icon as any} size={20} color={color} />
                    </View>

                    <View style={styles.textContainer}>
                        <View style={styles.itemHeader}>
                            <View style={[styles.typeBadge, { backgroundColor: `${color}20` }]}>
                                <ThemedText style={[styles.typeBadgeText, { color: color }]}>{typeLabel}</ThemedText>
                            </View>
                            <ThemedText style={styles.timeText}>
                                {(() => {
                                    try {
                                        const d = new Date(item.createdAt);
                                        return formatDistanceToNow(d, { addSuffix: true });
                                    } catch { return "now"; }
                                })()}
                            </ThemedText>
                        </View>

                        <ThemedText style={[styles.itemTitle, !item.read && styles.unreadTitle]}>
                            {item.title}
                        </ThemedText>

                        <ThemedText numberOfLines={2} style={styles.itemBody}>
                            {item.body}
                        </ThemedText>
                    </View>

                    {!item.read && (
                        <View style={styles.unreadIndicator}>
                            <View style={[styles.unreadDot, { backgroundColor: color }]} />
                        </View>
                    )}
                </Pressable>
            </Animated.View>
        );
    };

    if (isLoading && notifications.length === 0) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color={COLORS.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{
                    padding: 20,
                    paddingTop: 10,
                    paddingBottom: insets.bottom + 100,
                }}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
                }
                ListEmptyComponent={
                    <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
                        <View style={styles.emptyIconCircle}>
                            <Icon name="bell" size={48} color={COLORS.textSecondary} />
                        </View>
                        <ThemedText style={styles.emptyTitle}>All Caught Up!</ThemedText>
                        <ThemedText style={styles.emptySub}>
                            You have no new notifications. We'll let you know when something exciting happens.
                        </ThemedText>
                    </Animated.View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: COLORS.background,
    },
    item: {
        flexDirection: "row",
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        marginBottom: 12,
        alignItems: "center",
        gap: 16,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    textContainer: {
        flex: 1,
        gap: 4,
    },
    itemHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    itemTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.textSecondary,
        flex: 1,
        marginRight: 8,
    },
    unreadTitle: {
        fontWeight: "800",
        color: COLORS.text,
    },
    timeText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        opacity: 0.7,
    },
    itemBody: {
        fontSize: 14,
        lineHeight: 20,
        color: COLORS.textSecondary,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 140,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(255,255,255,0.03)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: COLORS.text,
        marginBottom: 12,
    },
    emptySub: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: "center",
        lineHeight: 22,
    },
    typeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    typeBadgeText: {
        fontSize: 10,
        fontWeight: "900",
        letterSpacing: 0.5,
    },
    unreadIndicator: {
        justifyContent: "center",
        alignItems: "center",
    },
});
