import React, { useState, useEffect, useCallback, useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Modal, Alert, Share } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import * as Clipboard from 'expo-clipboard';
import Animated, { FadeInUp, FadeInRight, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, interpolate } from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.45;

const COLORS = {
    background: "#111827",
    card: "#1F2937",
    primary: "#7C3AED",
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    accent: "#10B981",
};

export default function ParticipantEventDetailScreen({ route, navigation }: any) {
    const { eventId } = route?.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [showShareModal, setShowShareModal] = useState(false);
    const scrollY = useSharedValue(0);

    const { data: event, isLoading, refetch: refetchEvent } = useQuery({
        queryKey: [`/api/events/${eventId}`],
        enabled: !!eventId,
    }) as { data: any; isLoading: boolean; refetch: any };

    const { data: attendanceData, refetch: refetchAttendance } = useQuery({
        queryKey: [`/api/events/${eventId}/registrations/count`],
        queryFn: async () => {
            try {
                const res = await apiRequest("GET", `/api/events/${eventId}/registrations`);
                const registrations = await res.json();
                const approvedRegistrations = Array.isArray(registrations) ? registrations.filter((r: any) =>
                    ['approved', 'checked_in', 'checked_out'].includes(r.status)
                ) : [];
                return { count: approvedRegistrations.length, registrations: approvedRegistrations };
            } catch {
                return { count: 0, registrations: [] };
            }
        },
        enabled: !!eventId,
    }) as { data: any; refetch: any };

    const registrationStatusQuery = useQuery({
        queryKey: ["registration-status", eventId, user?.id],
        queryFn: async () => {
            if (!eventId || !user?.email) return null;
            const res = await apiRequest("GET", `/api/events/${eventId}/registration-status?email=${encodeURIComponent(user.email)}`);
            return res.json();
        },
        enabled: !!eventId && !!user?.email,
    });

    const registration = registrationStatusQuery.data?.registration;
    const registrationStatus = registration?.status ? String(registration.status).toLowerCase() : "none";
    const isRegLoading = registrationStatusQuery.isLoading && !registrationStatusQuery.data;

    const { data: followStatus, refetch: refetchFollow } = useQuery({
        queryKey: [`/api/user/follow/${event?.organizerId}/status`],
        queryFn: async () => {
            if (!event?.organizerId) return { following: false };
            const res = await apiRequest("GET", `/api/user/follow/${event.organizerId}/status`);
            return res.json();
        },
        enabled: !!event?.organizerId && !!user,
    }) as { data: any; refetch: any };

    const followMutation = useMutation({
        mutationFn: async () => {
            const method = followStatus?.following ? "DELETE" : "POST";
            await apiRequest(method, `/api/user/follow/${event.organizerId}`);
        },
        onSuccess: () => {
            refetchFollow();
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
    const isPending = registrationStatus === "pending";
    const isRejected = registrationStatus === "rejected";
    const isRegistered = isPending || isApproved || isRejected;

    const safeFormat = (date: any, formatStr: string) => {
        try {
            if (!date) return "TBD";
            const d = new Date(date);
            return format(d, formatStr);
        } catch (e) { return "TBD"; }
    };

    const headerImageStyle = useAnimatedStyle(() => {
        return {
            transform: [
                {
                    translateY: interpolate(scrollY.value, [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT], [-IMAGE_HEIGHT / 2, 0, IMAGE_HEIGHT * 0.75])
                },
                {
                    scale: interpolate(scrollY.value, [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT], [2, 1, 1])
                }
            ]
        };
    });

    const scrollHandler = useAnimatedScrollHandler((event) => {
        scrollY.value = event.contentOffset.y;
    });

    const handleShare = async () => {
        try {
            const publicLink = event.publicLink || event.public_link;
            const url = `https://qr-ticket-manager.expo.app/events/${publicLink}`;
            const message = `Check out this event: ${event.title}\n\nRegister here: ${url}`;

            await Share.share({
                message,
                url, // iOS only
                title: event.title,
            });
        } catch (error) {
            console.error("Share error:", error);
        }
    };

    const handleRegister = () => {
        if (!event) return;
        if (isApproved) {
            navigation.navigate("Tickets");
            return;
        }
        if (isPending || isRejected) return;
        const link = event.publicLink || event.public_link;
        if (link) navigation.navigate("RegisterEvent", { eventLink: link });
    };

    if (isLoading || !event) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <Animated.ScrollView
                scrollEventThrottle={16}
                onScroll={scrollHandler}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header Image */}
                <Animated.View style={[styles.imageContainer, headerImageStyle]}>
                    <Image
                        source={{ uri: resolveImageUrl(event.coverImage) }}
                        style={styles.headerImage}
                        contentFit="cover"
                    />
                    <LinearGradient
                        colors={["transparent", "rgba(17, 24, 39, 0.8)", COLORS.background]}
                        style={styles.imageOverlay}
                    />
                </Animated.View>

                {/* Content */}
                <View style={styles.content}>
                    <View style={styles.headerRow}>
                        <ThemedText style={styles.title}>{event.title}</ThemedText>
                        <View style={styles.headerActions}>
                            <Pressable style={styles.actionIcon} onPress={handleShare}>
                                <Feather name="share-2" size={20} color="#FFF" />
                            </Pressable>
                            <Pressable style={[styles.actionIcon, { marginLeft: 12 }]}>
                                <Feather name="heart" size={20} color={COLORS.primary} />
                            </Pressable>
                        </View>
                    </View>

                    <View style={styles.categoryInfo}>
                        <View style={styles.categoryBadge}>
                            <ThemedText style={styles.categoryText}>{event.category || "Music"}</ThemedText>
                        </View>
                        <View style={styles.avatarPile}>
                            {(attendanceData?.registrations || []).slice(0, 4).map((reg: any, i: number) => (
                                <Image
                                    key={i}
                                    source={{ uri: reg.profileImage ? resolveImageUrl(reg.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${reg.id}` }}
                                    style={[styles.pileAvatar, { marginLeft: i === 0 ? 0 : -10 }]}
                                />
                            ))}
                            <ThemedText style={styles.attendanceText}>{attendanceData?.count || "20k+"} going</ThemedText>
                            <Feather name="arrow-right" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
                        </View>
                    </View>

                    {/* Date & Location */}
                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <View style={styles.iconCircle}>
                                <Feather name="calendar" size={20} color={COLORS.primary} />
                            </View>
                            <View>
                                <ThemedText style={styles.infoLabel}>{safeFormat(event.startDate, "EEEE, MMMM d, yyyy")}</ThemedText>
                                <ThemedText style={styles.infoSub}>{safeFormat(event.startDate, "HH:mm")} - {event.endDate ? safeFormat(event.endDate, "HH:mm") : "TBD"}</ThemedText>
                                <Pressable style={styles.linkButton}>
                                    <ThemedText style={styles.linkText}>Add to My Calendar</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.iconCircle}>
                                <Feather name="map-pin" size={20} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.infoLabel}>{event.location || "Online"}</ThemedText>
                                <ThemedText style={styles.infoSub} numberOfLines={1}>{event.address || "New York, USA"}</ThemedText>
                                <Pressable
                                    style={styles.linkButton}
                                    onPress={() => {
                                        const query = encodeURIComponent(event.address || event.location || "New York");
                                        const url = Platform.select({
                                            ios: `maps://app?q=${query}`,
                                            android: `geo:0,0?q=${query}`
                                        });
                                        if (url) Linking.openURL(url);
                                    }}
                                >
                                    <ThemedText style={styles.linkText}>View on Maps</ThemedText>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>About Event</ThemedText>
                    </View>
                    <ThemedText style={styles.description}>
                        {event.description || "Join us for an unforgettable experience filled with amazing performances and great vibes."}
                        <ThemedText style={styles.readMore}> Read more...</ThemedText>
                    </ThemedText>

                    {/* Hosted By */}
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Organizer</ThemedText>
                    </View>
                    <View style={styles.organizerRow}>
                        <View style={styles.organizerInfo}>
                            <Image
                                source={{ uri: event.organizerProfileImage ? resolveImageUrl(event.organizerProfileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` }}
                                style={styles.organizerAvatar}
                            />
                            <View>
                                <ThemedText style={styles.organizerName}>{event.organizerName || "World of Music"}</ThemedText>
                                <ThemedText style={styles.organizerSub}>Organizer</ThemedText>
                            </View>
                        </View>
                        <Pressable
                            style={[styles.followButton, followStatus?.following && styles.followButtonActive]}
                            onPress={() => followMutation.mutate()}
                        >
                            <ThemedText style={[styles.followText, followStatus?.following && styles.followTextActive]}>
                                {followStatus?.following ? "Following" : "Follow"}
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            </Animated.ScrollView>

            {/* Back Button Floating */}
            <Pressable
                onPress={() => navigation.goBack()}
                style={[styles.floatingBack, { top: insets.top + 10 }]}
            >
                <Feather name="chevron-left" size={28} color="#FFF" />
            </Pressable>

            {/* Bottom Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Pressable
                    style={[
                        styles.bookButton,
                        isRegistered && styles.bookButtonRegistered,
                        isRejected && { backgroundColor: "#EF4444" }
                    ]}
                    onPress={handleRegister}
                    disabled={isRegLoading || isPending || isRejected}
                >
                    <ThemedText style={styles.bookButtonText}>
                        {isRegLoading ? "Checking..." :
                            isApproved ? "Joined • View Ticket" :
                                isPending ? "Pending Approval" :
                                    isRejected ? "Registration Rejected" : "Book Event"}
                    </ThemedText>
                </Pressable>
            </View>

            {/* Share Modal */}
            <Modal
                visible={showShareModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowShareModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowShareModal(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <ThemedText style={styles.modalTitle}>Share</ThemedText>
                        <View style={styles.shareGrid}>
                            <ShareButton name="WhatsApp" color="#25D366" icon="message-circle" />
                            <ShareButton name="Twitter" color="#1DA1F2" icon="twitter" />
                            <ShareButton name="Facebook" color="#1877F2" icon="facebook" />
                            <ShareButton name="Copy Link" color="#374151" icon="link" />
                        </View>
                    </View>
                </Pressable>
            </Modal>
        </ThemedView>
    );
}

const ShareButton = ({ name, color, icon }: any) => (
    <View style={styles.shareItem}>
        <View style={[styles.shareIconCircle, { backgroundColor: color }]}>
            <Feather name={icon} size={24} color="#FFF" />
        </View>
        <ThemedText style={styles.shareName}>{name}</ThemedText>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.background },
    imageContainer: { height: IMAGE_HEIGHT, width: width },
    headerImage: { width: "100%", height: "100%" },
    imageOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, height: 150 },
    content: { marginTop: -30, backgroundColor: COLORS.background, borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 24, paddingTop: 30 },
    headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
    headerActions: { flexDirection: "row", alignItems: "center" },
    title: { fontSize: 28, fontWeight: "900", color: COLORS.text, flex: 1, marginRight: 16, letterSpacing: -0.5 },
    actionIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    categoryInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16 },
    categoryBadge: { backgroundColor: "rgba(124, 58, 237, 0.15)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    categoryText: { color: COLORS.primary, fontSize: 12, fontWeight: "bold" },
    avatarPile: { flexDirection: "row", alignItems: "center" },
    pileAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.background },
    attendanceText: { marginLeft: 8, color: COLORS.textSecondary, fontSize: 13, fontWeight: "600" },
    infoSection: { marginTop: 32, gap: 24 },
    infoRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
    iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(124, 58, 237, 0.1)", justifyContent: "center", alignItems: "center" },
    infoLabel: { fontSize: 16, fontWeight: "700", color: COLORS.text, letterSpacing: 0.2 },
    infoSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 4, fontWeight: "500" },
    linkButton: { marginTop: 6 },
    linkText: { color: COLORS.primary, fontSize: 13, fontWeight: "800" },
    sectionHeader: { marginTop: 32, marginBottom: 12 },
    sectionTitle: { fontSize: 20, fontWeight: "900", color: COLORS.text, letterSpacing: -0.2 },
    description: { fontSize: 15, lineHeight: 24, color: COLORS.textSecondary, fontWeight: "400" },
    readMore: { color: COLORS.primary, fontWeight: "bold" },
    organizerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 20 },
    organizerInfo: { flexDirection: "row", alignItems: "center", gap: 12 },
    organizerAvatar: { width: 44, height: 44, borderRadius: 22 },
    organizerName: { fontSize: 16, fontWeight: "700", color: COLORS.text },
    organizerSub: { fontSize: 12, color: COLORS.textSecondary },
    followButton: { backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
    followButtonActive: { backgroundColor: "transparent", borderWidth: 1, borderColor: COLORS.primary },
    followText: { color: "#FFF", fontWeight: "bold", fontSize: 13 },
    followTextActive: { color: COLORS.primary },
    floatingBack: { position: "absolute", left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center" },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.background, paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
    bookButton: { backgroundColor: COLORS.primary, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", ...Shadows.md },
    bookButtonRegistered: { backgroundColor: COLORS.accent },
    bookButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, backgroundColor: "#374151", borderRadius: 2, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 22, fontWeight: "800", color: "#FFF", textAlign: "center", marginBottom: 32 },
    shareGrid: { flexDirection: "row", justifyContent: "space-around", flexWrap: "wrap", gap: 20 },
    shareItem: { alignItems: "center", gap: 8 },
    shareIconCircle: { width: 60, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center" },
    shareName: { fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },
});
