import React, { useLayoutEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, Platform, ActivityIndicator, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { Spacing, BorderRadius, Shadows, Colors } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { formatDistanceToNow } from "date-fns";
import * as Haptics from "expo-haptics";

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
        staleTime: 30000, // Cache for 30s
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
            // Check if there are any unread notifications
            const unread = notifications.filter((n: any) => !n.read);
            if (unread.length === 0) return;

            // Mark all as read concurrently
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
            headerTransparent: false,
            headerTintColor: theme.text,
            headerStyle: { backgroundColor: theme.backgroundRoot },
            headerShadowVisible: false,
            headerRight: () => (
                <Pressable
                    onPress={() => markAllReadMutation.mutate()}
                    style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1, padding: 8 })}
                >
                    <ThemedText style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>Mark all read</ThemedText>
                </Pressable>
            ),
        });
    }, [navigation, theme, notifications]);

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'new_event':
                return { icon: 'calendar', color: '#8B5CF6', bg: '#8B5CF620' };
            case 'new_registration':
                return { icon: 'user', color: '#3B82F6', bg: '#3B82F620' };
            case 'registration_approved':
                return { icon: 'check-circle', color: '#10B981', bg: '#10B98120' };
            case 'registration_rejected':
                return { icon: 'x-circle', color: '#EF4444', bg: '#EF444420' };
            case 'registration_checked_in':
                return { icon: 'scan', color: '#F59E0B', bg: '#F59E0B20' };
            case 'registration_successful':
                return { icon: 'ticket', color: '#3B82F6', bg: '#3B82F620' };
            case 'broadcast':
                return { icon: 'mail', color: '#EC4899', bg: '#EC489920' };
            default:
                return { icon: 'bell', color: theme.primary, bg: theme.primary + '20' };
        }
    };

    const handlePress = (item: any) => {
        // 1. Mark as read
        if (!item.read) {
            markReadMutation.mutate(item.id);
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // 2. Navigate
        if (item.type === 'new_event' && item.relatedId) {
            navigation.navigate('EventDetail', { eventId: item.relatedId });
        } else if (item.type === 'broadcast' && item.relatedId) {
            navigation.navigate('EventDetail', { eventId: item.relatedId });
        } else if (item.type?.startsWith('registration_') && item.relatedId) {
            // For registration updates (approved settings, check-in, or new success), go to Ticket view
            navigation.navigate('TicketView', { registrationId: item.relatedId });
        }
    };

    const renderItem = ({ item, index }: any) => {
        const { icon, color, bg } = getIconInfo(item.type);

        return (
            <Animated.View entering={FadeInRight.delay(index * 50).duration(400).springify()}>
                <Pressable
                    onPress={() => handlePress(item)}
                    style={({ pressed }) => [
                        styles.item,
                        {
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                            borderColor: item.read ? 'rgba(255,255,255,0.05)' : color + '40', // Highlight border for unread
                            backgroundColor: theme.backgroundSecondary,
                        }
                    ]}
                >
                    {!item.read && (
                        <LinearGradient
                            colors={[color + '10', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    )}

                    <View style={[styles.iconDot, { backgroundColor: bg }]}>
                        <Icon name={icon as any} size={20} color={color} />
                    </View>

                    <View style={{ flex: 1, gap: 4 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <ThemedText style={{
                                fontWeight: !item.read ? '700' : '500',
                                fontSize: 15,
                                color: !item.read ? theme.text : theme.textSecondary
                            }}>
                                {item.title}
                            </ThemedText>
                            <ThemedText style={{ fontSize: 10, color: theme.textSecondary, opacity: 0.7 }}>
                                {(() => {
                                    try {
                                        let dateStr = item.createdAt;
                                        // If no timezone info, assume UTC from server
                                        if (typeof dateStr === 'string' && !dateStr.includes('Z') && !dateStr.includes('+')) {
                                            dateStr = dateStr.replace(' ', 'T') + 'Z';
                                        }
                                        const d = new Date(dateStr);
                                        const now = new Date();
                                        if (d > now) return "Just now";
                                        return formatDistanceToNow(d, { addSuffix: true });
                                    } catch {
                                        return "Recent";
                                    }
                                })()}
                            </ThemedText>
                        </View>

                        <ThemedText numberOfLines={2} style={{
                            color: theme.textSecondary,
                            fontSize: 13,
                            lineHeight: 18,
                            opacity: !item.read ? 1 : 0.7
                        }}>
                            {item.body}
                        </ThemedText>
                    </View>

                    {!item.read && (
                        <View style={[styles.unreadIndicator, { backgroundColor: color }]} />
                    )}
                </Pressable>
            </Animated.View>
        );
    };

    if (isLoading && notifications.length === 0) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator color={theme.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
            <LinearGradient
                colors={[theme.primary + '05', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            <FlatList
                data={notifications}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{
                    padding: Spacing.md,
                    paddingTop: Spacing.lg,
                    paddingBottom: insets.bottom + 20,
                    gap: Spacing.sm
                }}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={theme.primary} />
                }
                ListEmptyComponent={
                    <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
                        <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
                            <Icon name="bell" size={40} color={theme.textSecondary} />
                        </View>
                        <ThemedText type="h3" style={{ marginTop: Spacing.lg }}>All Caught Up</ThemedText>
                        <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8, maxWidth: 240 }}>
                            You have no new notifications at the moment.
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
        backgroundColor: '#000',
    },
    item: {
        flexDirection: 'row',
        padding: Spacing.md,
        borderRadius: BorderRadius.lg,
        borderWidth: 1,
        alignItems: 'center', // Align center vertically
        gap: Spacing.md,
        overflow: 'hidden',
        position: 'relative',
    },
    iconDot: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    unreadIndicator: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 120,
        paddingHorizontal: 40,
        opacity: 0.8,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: Spacing.sm
    }
});
