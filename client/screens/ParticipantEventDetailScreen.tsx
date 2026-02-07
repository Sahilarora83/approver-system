import React, { useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Share, FlatList, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, interpolate, withSpring } from "react-native-reanimated";

import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Shadows, Spacing, BorderRadius } from "@/constants/theme";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.55;

const COLORS = {
    background: "#0F172A",
    card: "#1E293B",
    primary: "#6366F1",
    secondary: "#818CF8",
    accent: "#7C3AED",
    textMuted: "#94A3B8",
    white: "#FFFFFF",
    purpleBtn: "#5856D6"
};

const safeFormat = (date: any, fmt: string) => {
    try {
        if (!date) return "TBD";
        const d = new Date(date);
        if (isNaN(d.getTime())) return "Invalid Date";
        return format(d, fmt);
    } catch (e) {
        return "TBD";
    }
};

export default function ParticipantEventDetailScreen({ route, navigation }: any) {
    const { eventId } = route?.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    // Fetch Event Details
    const { data: event, isLoading } = useQuery({
        queryKey: [`/api/events/${eventId}`],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/events/${eventId}`);
            return res.json();
        },
        enabled: !!eventId,
    });

    // Fetch Attendance
    const { data: attendanceData } = useQuery({
        queryKey: [`/api/events/${eventId}/registrations/count`],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/events/${eventId}/registrations`);
            const registrations = await res.json();
            const approved = Array.isArray(registrations) ? registrations.filter((r: any) =>
                ['approved', 'checked_in', 'checked_out'].includes(r.status)
            ) : [];
            return { count: approved.length, registrations: approved };
        },
        enabled: !!eventId,
    });

    // Registration Status
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
    const isRegLoading = registrationStatusQuery.isLoading;

    // Follow Organizer
    const { data: followStatus, refetch: refetchFollow } = useQuery({
        queryKey: [`/api/user/follow/${event?.organizerId}/status`],
        queryFn: async () => {
            if (!event?.organizerId) return { following: false };
            const res = await apiRequest("GET", `/api/user/follow/${event.organizerId}/status`);
            return res.json();
        },
        enabled: !!event?.organizerId && !!user,
    });

    const followMutation = useMutation({
        mutationFn: async () => {
            const method = followStatus?.following ? "DELETE" : "POST";
            await apiRequest(method, `/api/user/follow/${event.organizerId}`);
        },
        onSuccess: () => {
            refetchFollow();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    // Favorites
    const { data: favoriteStatus, refetch: refetchFavorite } = useQuery({
        queryKey: [`/api/favorites/${eventId}`],
        queryFn: async () => {
            if (!eventId) return { isFavorited: false };
            const res = await apiRequest("GET", `/api/favorites/${eventId}`);
            return res.json();
        },
        enabled: !!eventId && !!user,
    });

    const favoriteMutation = useMutation({
        mutationFn: async () => {
            const method = favoriteStatus?.isFavorited ? "DELETE" : "POST";
            await apiRequest(method, `/api/favorites/${eventId}`);
        },
        onSuccess: () => {
            refetchFavorite();
            queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    });

    // Similar Events
    const { data: similarEvents } = useQuery({
        queryKey: [`/api/events/similar`, event?.category, eventId],
        queryFn: async () => {
            if (!event?.category) return [];
            const res = await apiRequest("GET", `/api/events/search?category=${encodeURIComponent(event.category)}&limit=5`);
            const data = await res.json();
            return data.events.filter((e: any) => e.id !== eventId);
        },
        enabled: !!event?.category,
    });

    const handleShare = async () => {
        if (!event) return;
        const msg = `Check out ${event.title}\nhttps://qrticket.app/events/${event.publicLink || event.id}`;
        await Share.share({ message: msg });
    };

    const handleAction = () => {
        if (["approved", "checked_in", "checked_out"].includes(registrationStatus)) {
            navigation.navigate("Tickets");
        } else if (registrationStatus === "pending") {
            return;
        } else {
            navigation.navigate("RegisterEvent", { eventLink: event.publicLink || event.id });
        }
    };

    const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveImageIndex(Math.round(index));
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </ThemedView>
        );
    }

    if (!event) return null;

    const gallery = event.gallery && Array.isArray(event.gallery) && event.gallery.length > 0 ? event.gallery : [event.coverImage];
    const isParticipant = true; // Always participant in this screen

    return (
        <ThemedView style={styles.container}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 120 }}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                {/* Hero Carousel */}
                <View style={styles.heroContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                    >
                        {gallery.map((img: string, i: number) => (
                            <Image
                                key={i}
                                source={{ uri: resolveImageUrl(img) }}
                                style={styles.heroImage}
                                contentFit="cover"
                            />
                        ))}
                    </ScrollView>

                    {/* Pagination Dots */}
                    <View style={styles.pagination}>
                        {(gallery as string[]).map((_: string, i: number) => (
                            <View
                                key={i}
                                style={[
                                    styles.dot,
                                    activeImageIndex === i && styles.activeDot,
                                    activeImageIndex === i && { width: 24 }
                                ]}
                            />
                        ))}
                    </View>

                    {/* Header Overlay */}
                    <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.circularBtn}>
                            <Ionicons name="arrow-back" size={22} color="#FFF" />
                        </Pressable>
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable
                                onPress={() => favoriteMutation.mutate()}
                                style={styles.circularBtn}
                            >
                                <Ionicons
                                    name={favoriteStatus?.isFavorited ? "heart" : "heart-outline"}
                                    size={22}
                                    color={favoriteStatus?.isFavorited ? "#EF4444" : "#FFF"}
                                />
                            </Pressable>
                            <Pressable onPress={handleShare} style={styles.circularBtn}>
                                <Ionicons name="share-social-outline" size={22} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>

                    <LinearGradient
                        colors={["transparent", "rgba(15, 23, 42, 0.4)", "rgba(15, 23, 42, 1)"]}
                        style={styles.heroGradient}
                    />
                </View>

                {/* Main Content */}
                <Animated.View entering={FadeInDown.duration(800)} style={styles.content}>
                    <View style={styles.titleSection}>
                        <ThemedText style={styles.mainTitle}>{event.title}</ThemedText>

                        <View style={styles.metaBadgeRow}>
                            <View style={styles.typeBadge}>
                                <ThemedText style={styles.typeBadgeText}>{event.category || "General"}</ThemedText>
                            </View>

                            <Pressable style={styles.goingContainer} onPress={() => navigation.navigate("Attendees", { eventId: event.id })}>
                                <View style={styles.avatarsWrapper}>
                                    {(attendanceData?.registrations || []).slice(0, 4).map((r: any, i: number) => (
                                        <Image
                                            key={i}
                                            source={{ uri: r.profileImage ? resolveImageUrl(r.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}` }}
                                            style={[styles.miniAvatar, { left: i * 20 }]}
                                        />
                                    ))}
                                </View>
                                <ThemedText style={styles.goingText}>
                                    {attendanceData?.count ? `${attendanceData.count.toLocaleString()}+ going` : "Be the first to join"}
                                </ThemedText>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.textMuted} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Info Rows */}
                    <View style={styles.infoGrid}>
                        {/* Date Time */}
                        <View style={styles.infoCard}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="calendar" size={24} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.labelTitle}>{safeFormat(event.startDate, "EEEE, MMMM d, yyyy")}</ThemedText>
                                <ThemedText style={styles.labelSubtitle}>
                                    {safeFormat(event.startDate, "h:mm a")} - {event.endDate ? safeFormat(event.endDate, "h:mm a") : "Late"}
                                </ThemedText>
                                <Pressable style={styles.actionPill}>
                                    <Ionicons name="calendar-outline" size={12} color="#FFF" />
                                    <ThemedText style={styles.actionPillText}>Add to My Calendar</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.infoCard}>
                            <View style={styles.iconContainer}>
                                <Ionicons name="location" size={24} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.labelTitle}>{event.location || "Venue TBD"}</ThemedText>
                                <ThemedText style={styles.labelSubtitle} numberOfLines={1}>{event.address || "Check details below"}</ThemedText>
                                <Pressable
                                    style={styles.actionPill}
                                    onPress={() => {
                                        const loc = event.address || event.location;
                                        if (loc) Linking.openURL(Platform.OS === 'ios' ? `maps://app?q=${loc}` : `geo:0,0?q=${loc}`);
                                    }}
                                >
                                    <Ionicons name="map-outline" size={12} color="#FFF" />
                                    <ThemedText style={styles.actionPillText}>See Location on Maps</ThemedText>
                                </Pressable>
                            </View>
                        </View>
                    </View>

                    {/* Organizer Section */}
                    <View style={styles.organizerSection}>
                        <View style={styles.organizerInner}>
                            <Image
                                source={{ uri: event.organizerProfileImage ? resolveImageUrl(event.organizerProfileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` }}
                                style={styles.organizerPic}
                            />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.organizerName}>{event.organizerName || "Organizer"}</ThemedText>
                                <ThemedText style={styles.organizerLabel}>Organizer</ThemedText>
                            </View>
                            <Pressable
                                style={[styles.followButton, followStatus?.following && styles.followed]}
                                onPress={() => followMutation.mutate()}
                            >
                                <ThemedText style={styles.followText}>{followStatus?.following ? "Following" : "Follow"}</ThemedText>
                            </Pressable>
                        </View>
                    </View>

                    {/* About */}
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText style={styles.sectionTitle}>About Event</ThemedText>
                    </View>
                    <Pressable onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                        <ThemedText style={styles.description} numberOfLines={isDescriptionExpanded ? undefined : 4}>
                            {event.description || "No detailed description available for this event yet."}
                        </ThemedText>
                        <ThemedText style={styles.readMoreText}>{isDescriptionExpanded ? "Show Less" : "Read more..."}</ThemedText>
                    </Pressable>

                    {/* Gallery Preview */}
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText style={styles.sectionTitle}>Gallery (Pre-Event)</ThemedText>
                        <Pressable><ThemedText style={styles.seeAll}>See All</ThemedText></Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                        {(gallery as string[]).map((img: string, i: number) => (
                            <Image key={i} source={{ uri: resolveImageUrl(img) }} style={styles.galleryImg} />
                        ))}
                        {gallery.length > 2 && (
                            <View style={styles.galleryImgOverlay}>
                                <ThemedText style={styles.overlayText}>20+</ThemedText>
                            </View>
                        )}
                    </ScrollView>

                    {/* Location Placeholder */}
                    <View style={styles.sectionHeaderRow}>
                        <ThemedText style={styles.sectionTitle}>Location</ThemedText>
                    </View>
                    <View style={styles.locationSnippet}>
                        <Ionicons name="location" size={16} color={COLORS.primary} />
                        <ThemedText style={styles.snippetText}>{event.address || event.location || "San Francisco, CA"}</ThemedText>
                    </View>
                    <View style={styles.mapMock}>
                        <Image
                            source={{ uri: "https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/-122.4194,37.7749,12/600x300?access_token=pk.eyJ1IjoiYmFycnljb2xsaW5zIiwiYSI6ImNrdHByNjFwajBoeWIyd3BndWd6NjR3bmIifQ.X9_3S4Z4-x4P5J8I_q6w5g" }}
                            style={styles.mapImage}
                        />
                        <View style={styles.mapPin}>
                            <View style={styles.pinCircle}>
                                <Ionicons name="musical-notes" size={14} color="#FFF" />
                            </View>
                        </View>
                    </View>

                    {/* More Events */}
                    {similarEvents && similarEvents.length > 0 && (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText style={styles.sectionTitle}>More Events like this</ThemedText>
                                <Pressable><ThemedText style={styles.seeAll}>See All</ThemedText></Pressable>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarScroll}>
                                {(similarEvents as any[]).map((item: any) => (
                                    <Pressable
                                        key={item.id}
                                        style={styles.similarCard}
                                        onPress={() => navigation.push("ParticipantEventDetail", { eventId: item.id })}
                                    >
                                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.similarImage} />
                                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.8)"]} style={StyleSheet.absoluteFill} />
                                        <ThemedText style={styles.similarTitle} numberOfLines={1}>{item.title}</ThemedText>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.primaryBtn,
                        { opacity: pressed || registrationStatus === "pending" ? 0.8 : 1 },
                        registrationStatus === "approved" && { backgroundColor: "#10B981" }
                    ]}
                    onPress={handleAction}
                    disabled={registrationStatus === "pending"}
                >
                    {isRegLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <ThemedText style={styles.btnText}>
                            {registrationStatus === "approved" ? "Show Ticket" : registrationStatus === "pending" ? "Request Pending" : "Book Event"}
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    heroContainer: { width: "100%", height: IMAGE_HEIGHT, position: 'relative' },
    heroImage: { width: width, height: IMAGE_HEIGHT },
    heroGradient: { position: 'absolute', bottom: 0, width: '100%', height: '70%' },
    headerOverlay: {
        position: 'absolute', left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 20, zIndex: 100
    },
    circularBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "rgba(30, 41, 59, 0.4)",
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)"
    },
    pagination: {
        position: 'absolute', bottom: 60, width: '100%',
        flexDirection: 'row', justifyContent: 'center', gap: 6
    },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.3)" },
    activeDot: { backgroundColor: "#FFF" },

    content: { marginTop: -40, paddingHorizontal: 24 },
    titleSection: { marginBottom: 24 },
    mainTitle: { fontSize: 32, fontWeight: "900", color: "#FFF", lineHeight: 42, marginBottom: 12 },
    metaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    typeBadge: {
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
        borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.4)",
        backgroundColor: "rgba(99, 102, 241, 0.1)"
    },
    typeBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "800", textTransform: 'uppercase' },
    goingContainer: { flexDirection: 'row', alignItems: 'center' },
    avatarsWrapper: { width: 80, height: 32, position: 'relative' },
    miniAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: COLORS.background, position: 'absolute' },
    goingText: { color: "#FFF", fontSize: 13, fontWeight: "600", marginRight: 4, marginLeft: 10 },

    infoGrid: { gap: 16, marginBottom: 32 },
    infoCard: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    iconContainer: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.04)",
        justifyContent: 'center', alignItems: 'center'
    },
    labelTitle: { fontSize: 16, fontWeight: "800", color: "#FFF", marginBottom: 2 },
    labelSubtitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500", marginBottom: 8 },
    actionPill: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: "rgba(124, 92, 214, 0.6)", paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, alignSelf: 'flex-start'
    },
    actionPillText: { color: "#FFF", fontSize: 11, fontWeight: "700" },

    organizerSection: { marginBottom: 32, paddingVertical: 12 },
    organizerInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    organizerPic: { width: 44, height: 44, borderRadius: 12 },
    organizerName: { fontSize: 15, fontWeight: "800", color: "#FFF" },
    organizerLabel: { fontSize: 12, color: COLORS.textMuted, fontWeight: "500" },
    followButton: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
        backgroundColor: COLORS.accent
    },
    followed: { backgroundColor: "rgba(255,255,255,0.1)" },
    followText: { color: "#FFF", fontSize: 13, fontWeight: "700" },

    sectionHeaderRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12, marginTop: 8
    },
    sectionTitle: { fontSize: 18, fontWeight: "900", color: "#FFF" },
    seeAll: { color: COLORS.secondary, fontSize: 13, fontWeight: "700" },
    description: { fontSize: 15, color: "#94A3B8", lineHeight: 24, fontWeight: "500" },
    readMoreText: { color: COLORS.secondary, marginTop: 6, fontWeight: "700" },

    galleryScroll: { gap: 12, marginTop: 4 },
    galleryImg: { width: 110, height: 110, borderRadius: 20 },
    galleryImgOverlay: {
        position: 'absolute', right: 0, width: 110, height: 110,
        backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', zIndex: 5
    },
    overlayText: { color: '#FFF', fontSize: 20, fontWeight: "800" },

    locationSnippet: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    snippetText: { fontSize: 14, color: "#CBD5E1", fontWeight: "600" },
    mapMock: { width: '100%', height: 180, borderRadius: 24, overflow: 'hidden', position: 'relative' },
    mapImage: { width: '100%', height: '100%' },
    mapPin: { position: 'absolute', top: '40%', left: '50%', zIndex: 10 },
    pinCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: COLORS.accent, borderWidth: 3, borderColor: "rgba(124, 92, 214, 0.4)",
        justifyContent: 'center', alignItems: 'center'
    },

    similarScroll: { gap: 14 },
    similarCard: { width: 260, height: 160, borderRadius: 24, overflow: 'hidden' },
    similarImage: { width: '100%', height: '100%' },
    similarTitle: { position: 'absolute', bottom: 16, left: 16, color: '#FFF', fontWeight: "800", fontSize: 16 },

    bottomBar: {
        position: 'absolute', bottom: 0, width: '100%',
        backgroundColor: 'rgba(15, 23, 42, 0.95)', paddingHorizontal: 24,
        paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)"
    },
    primaryBtn: {
        backgroundColor: COLORS.purpleBtn, height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center', ...Shadows.lg
    },
    btnText: { color: '#FFF', fontSize: 18, fontWeight: "800" }
});
