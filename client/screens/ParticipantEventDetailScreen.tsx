import React, { useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Share, FlatList, NativeSyntheticEvent, NativeScrollEvent, Modal } from "react-native";
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
const GOOGLE_MAPS_API_KEY = "AIzaSyBH1Cl0wkbKTVR5Qmyv8_3UGZe-Er_nEDE";

const COLORS = {
    background: "#0F1117", // Deeper dark from screenshot
    card: "#1E212B",
    primary: "#5856D6", // Correct vibrant blue/purple from screenshot
    secondary: "#AB92F0",
    textMuted: "#8E8E93",
    white: "#FFFFFF",
    badgeBg: "rgba(88, 86, 214, 0.15)"
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
    const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);

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
            const categoryQuery = event?.category ? `category=${encodeURIComponent(event.category)}&` : "";
            const res = await apiRequest("GET", `/api/events/search?${categoryQuery}limit=6`);
            const data = await res.json();
            return (data.events || []).filter((e: any) => e.id !== eventId);
        },
        enabled: !!eventId,
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
    const lat = event.latitude || "40.7128";
    const lng = event.longitude || "-74.0060";
    const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=14&size=600x300&maptype=roadmap&markers=color:purple%7C${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}&style=feature:all|element:labels|visibility:on&style=feature:landscape|element:geometry|color:0x212121&style=feature:poi|element:geometry|color:0x333333&style=feature:road|element:geometry|color:0x444444&style=feature:water|element:geometry|color:0x111111`;

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
                        {(gallery as string[]).map((img: string, i: number) => (
                            <Image
                                key={i}
                                source={{ uri: resolveImageUrl(img) }}
                                style={styles.heroImage}
                                contentFit="cover"
                            />
                        ))}
                    </ScrollView>

                    {/* Pagination Dots - Inside Image */}
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
                                <Ionicons name="share-outline" size={22} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>

                    <LinearGradient
                        colors={["transparent", "rgba(15, 17, 23, 0.4)", "rgba(15, 17, 23, 1)"]}
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
                                            style={[styles.miniAvatar, { left: i * 18 }]} // Slightly closer overlapping
                                        />
                                    ))}
                                </View>
                                <ThemedText style={styles.goingText}>
                                    {attendanceData?.count ? `${attendanceData.count.toLocaleString()}+ going` : "Be the first to join"}
                                </ThemedText>
                                <Ionicons name="arrow-forward" size={14} color={COLORS.textMuted} />
                            </Pressable>
                        </View>
                    </View>

                    {/* Info Grid */}
                    <View style={styles.infoGrid}>
                        {/* Divider Line before info grid if needed, screenshot shows content flowing */}
                        <View style={styles.divider} />

                        {/* Date Time Row */}
                        <View style={styles.infoCard}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.infoLabelTitle}>{safeFormat(event.startDate, "EEEE, MMMM d, yyyy")}</ThemedText>
                                <ThemedText style={styles.infoLabelSubtitle}>
                                    {safeFormat(event.startDate, "HH:mm")} - {event.endDate ? safeFormat(event.endDate, "HH:mm") : "Late"} (GMT +07:00)
                                </ThemedText>
                                <Pressable style={styles.pillActionBtn}>
                                    <MaterialCommunityIcons name="calendar-plus" size={14} color="#FFF" />
                                    <ThemedText style={styles.pillActionText}>Add to My Calendar</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        {/* Location Row */}
                        <View style={styles.infoCard}>
                            <View style={styles.iconCircle}>
                                <Ionicons name="location" size={20} color={COLORS.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.infoLabelTitle}>{event.location || "Venue Location"}</ThemedText>
                                <ThemedText style={styles.infoLabelSubtitle} numberOfLines={2}>{event.address || event.location || "Address not provided"}</ThemedText>
                                <Pressable
                                    style={styles.pillActionBtn}
                                    onPress={() => {
                                        const loc = event.address || event.location;
                                        if (loc) Linking.openURL(Platform.OS === 'ios' ? `maps://app?q=${loc}` : `geo:0,0?q=${loc}`);
                                    }}
                                >
                                    <Ionicons name="map-outline" size={14} color="#FFF" />
                                    <ThemedText style={styles.pillActionText}>See Location on Maps</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.divider} />
                    </View>

                    {/* Organizer Section */}
                    <View style={styles.organizerSection}>
                        <View style={styles.organizerRow}>
                            <Image
                                source={{ uri: event.organizerProfileImage ? resolveImageUrl(event.organizerProfileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` }}
                                style={styles.organizerAvatar}
                            />
                            <View style={{ flex: 1 }}>
                                <ThemedText style={styles.organizerName}>{event.organizerName || event.hostedBy || "Organizer"}</ThemedText>
                                <ThemedText style={styles.organizerLabel}>Organizer</ThemedText>
                            </View>
                            <Pressable
                                style={[styles.followBtn, followStatus?.following && styles.followBtnActive]}
                                onPress={() => followMutation.mutate()}
                            >
                                <ThemedText style={styles.followBtnText}>{followStatus?.following ? "Following" : "Follow"}</ThemedText>
                            </Pressable>
                        </View>
                    </View>

                    {/* About Section */}
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionHeading}>About Event</ThemedText>
                    </View>
                    <Pressable onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                        <ThemedText style={styles.bodyText} numberOfLines={isDescriptionExpanded ? undefined : 4}>
                            {event.description || "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut... "}
                        </ThemedText>
                        <ThemedText style={styles.readMore}>{isDescriptionExpanded ? "Read Less" : "Read more..."}</ThemedText>
                    </Pressable>

                    {/* Gallery Section */}
                    <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                        <ThemedText style={styles.sectionHeading}>Gallery (Pre-Event)</ThemedText>
                        <Pressable onPress={() => gallery.length > 0 && setSelectedGalleryImage(gallery[0])}><ThemedText style={styles.seeAllLink}>See All</ThemedText></Pressable>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryContainer}>
                        {(gallery as string[]).map((img: string, i: number) => (
                            <Pressable key={i} onPress={() => setSelectedGalleryImage(img)}>
                                <Image source={{ uri: resolveImageUrl(img) }} style={styles.galleryThumb} />
                            </Pressable>
                        ))}
                        {gallery.length > 2 && (
                            <Pressable style={styles.galleryMoreOverlay} onPress={() => setSelectedGalleryImage(gallery[0])}>
                                <ThemedText style={styles.moreText}>{gallery.length}+</ThemedText>
                            </Pressable>
                        )}
                    </ScrollView>

                    {/* Location & Map Section */}
                    <View style={[styles.sectionHeader, { marginTop: 24 }]}>
                        <ThemedText style={styles.sectionHeading}>Location</ThemedText>
                    </View>
                    <View style={styles.locAddressRow}>
                        <Ionicons name="location" size={16} color={COLORS.primary} />
                        <ThemedText style={styles.addressText}>{event.address || event.location || "Venue Address"}</ThemedText>
                    </View>
                    <View style={styles.mapContainer}>
                        <Pressable
                            style={StyleSheet.absoluteFill}
                            onPress={() => {
                                const query = encodeURIComponent(event.address || event.location || `${lat},${lng}`);
                                const url = Platform.select({
                                    ios: `maps:0,0?q=${query}`,
                                    android: `geo:0,0?q=${query}`
                                });
                                if (url) Linking.openURL(url);
                            }}
                        >
                            <Image source={{ uri: staticMapUrl }} style={styles.mapImg} />
                        </Pressable>
                    </View>

                    {/* Similar Events */}
                    {similarEvents && similarEvents.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { marginTop: 32 }]}>
                                <ThemedText style={styles.sectionHeading}>More Events like this</ThemedText>
                                <Pressable><ThemedText style={styles.seeAllLink}>See All</ThemedText></Pressable>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.similarList}>
                                {(similarEvents as any[]).map((item: any) => (
                                    <Pressable
                                        key={item.id}
                                        style={styles.similarEventCard}
                                        onPress={() => navigation.push("ParticipantEventDetail", { eventId: item.id })}
                                    >
                                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.similarEvtImg} />
                                        <LinearGradient colors={["transparent", "rgba(0,0,0,0.6)", "rgba(0,0,0,0.9)"]} style={StyleSheet.absoluteFill} />
                                        <View style={styles.similarEvtContent}>
                                            <ThemedText style={styles.similarEvtTitle} numberOfLines={1}>{item.title}</ThemedText>
                                            <View style={styles.similarEvtFooter}>
                                                <ThemedText style={styles.similarEvtDate}>{new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</ThemedText>
                                                <View style={styles.similarRegisterBadge}>
                                                    <ThemedText style={styles.similarRegisterText}>Register</ThemedText>
                                                </View>
                                            </View>
                                        </View>
                                    </Pressable>
                                ))}
                            </ScrollView>
                        </>
                    )}
                </Animated.View>
            </ScrollView>

            {/* Fixed Bottom Booking Button */}
            <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Pressable
                    style={({ pressed }) => [
                        styles.bookNowBtn,
                        { opacity: pressed || registrationStatus === "pending" ? 0.8 : 1 },
                        registrationStatus === "approved" && { backgroundColor: "#34C759" }
                    ]}
                    onPress={handleAction}
                    disabled={registrationStatus === "pending"}
                >
                    {isRegLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <ThemedText style={styles.bookNowBtnText}>
                            {registrationStatus === "approved" ? "Show Ticket" : registrationStatus === "pending" ? "Request Pending" : "Register Now"}
                        </ThemedText>
                    )}
                </Pressable>
            </View>
            {/* Gallery Viewer Modal */}
            <Modal visible={!!selectedGalleryImage} transparent animationType="fade" onRequestClose={() => setSelectedGalleryImage(null)}>
                <View style={styles.modalOverlay}>
                    <Pressable style={styles.modalClose} onPress={() => setSelectedGalleryImage(null)}>
                        <Ionicons name="close" size={30} color="#FFF" />
                    </Pressable>
                    <Image source={{ uri: resolveImageUrl(selectedGalleryImage || "") }} style={styles.fullImage} contentFit="contain" />
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

    // Hero Section
    heroContainer: { width: "100%", height: IMAGE_HEIGHT, position: 'relative' },
    heroImage: { width: width, height: IMAGE_HEIGHT },
    heroGradient: { position: 'absolute', bottom: 0, width: '100%', height: '80%' },
    headerOverlay: {
        position: 'absolute', left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 20, zIndex: 100
    },
    circularBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)"
    },
    pagination: {
        position: 'absolute', bottom: 65, width: '100%',
        flexDirection: 'row', justifyContent: 'center', gap: 6
    },
    dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "rgba(255,255,255,0.4)" },
    activeDot: { backgroundColor: COLORS.primary },

    // Main Content
    content: { marginTop: -45, paddingHorizontal: 24 },
    titleSection: { marginBottom: 24 },
    mainTitle: { fontSize: 30, fontWeight: "900", color: "#FFF", lineHeight: 38, marginBottom: 12 },
    metaBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    typeBadge: {
        paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6,
        backgroundColor: COLORS.badgeBg, borderWidth: 1, borderColor: "rgba(88, 86, 214, 0.3)"
    },
    typeBadgeText: { color: COLORS.primary, fontSize: 10, fontWeight: "800", textTransform: 'uppercase' },
    goingContainer: { flexDirection: 'row', alignItems: 'center' },
    avatarsWrapper: { width: 70, height: 32, position: 'relative' },
    miniAvatar: {
        width: 28, height: 28, borderRadius: 14,
        borderWidth: 2, borderColor: COLORS.background,
        position: 'absolute'
    },
    goingText: { color: "#FFF", fontSize: 13, fontWeight: "700", marginLeft: 4, marginRight: 4 },

    // Info Grid
    infoGrid: { gap: 16 },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginVertical: 8 },
    infoCard: { flexDirection: 'row', gap: 16, alignItems: 'flex-start', marginBottom: 8 },
    iconCircle: {
        width: 50, height: 50, borderRadius: 18,
        backgroundColor: "rgba(88, 86, 214, 0.1)",
        justifyContent: 'center', alignItems: 'center'
    },
    infoLabelTitle: { fontSize: 16, fontWeight: "800", color: "#FFF", marginBottom: 2 },
    infoLabelSubtitle: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500", marginBottom: 10 },
    pillActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.primary, paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, alignSelf: 'flex-start'
    },
    pillActionText: { color: "#FFF", fontSize: 12, fontWeight: "800" },

    // Organizer
    organizerSection: { marginBottom: 24 },
    organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    organizerAvatar: { width: 50, height: 50, borderRadius: 20 },
    organizerName: { fontSize: 16, fontWeight: "800", color: "#FFF" },
    organizerLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: "500" },
    followBtn: {
        paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14,
        backgroundColor: COLORS.primary
    },
    followBtnActive: { backgroundColor: "rgba(255,255,255,0.1)" },
    followBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },

    // About
    sectionHeader: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 12
    },
    sectionHeading: { fontSize: 18, fontWeight: "900", color: "#FFF" },
    seeAllLink: { color: COLORS.primary, fontSize: 14, fontWeight: "800" },
    bodyText: { fontSize: 15, color: COLORS.textMuted, lineHeight: 24, fontWeight: "500" },
    readMore: { color: COLORS.primary, marginTop: 4, fontWeight: "800" },

    // Gallery
    galleryContainer: { gap: 12, marginTop: 4 },
    galleryThumb: { width: 105, height: 105, borderRadius: 16 },
    galleryMoreOverlay: {
        width: 105, height: 105, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.6)',
        position: 'absolute', right: 0,
        justifyContent: 'center', alignItems: 'center'
    },
    moreText: { color: '#FFF', fontSize: 20, fontWeight: "900" },

    // Map
    locAddressRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
    addressText: { fontSize: 14, color: COLORS.textMuted, fontWeight: "600" },
    mapContainer: { width: '100%', height: 180, borderRadius: 24, overflow: 'hidden', backgroundColor: '#1E212B' },
    mapImg: { width: '100%', height: '100%' },
    similarList: { gap: 14 },
    similarEventCard: { width: 250, height: 160, borderRadius: 20, overflow: 'hidden' },
    similarEvtImg: { width: '100%', height: '100%' },
    similarEvtContent: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 12 },
    similarEvtTitle: { color: '#FFF', fontWeight: "800", fontSize: 16, marginBottom: 4 },
    similarEvtFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    similarEvtDate: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: "600" },
    similarRegisterBadge: { backgroundColor: COLORS.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    similarRegisterText: { color: '#FFF', fontSize: 10, fontWeight: "800", textTransform: 'uppercase' },
    footer: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: 'rgba(15, 17, 23, 0.98)', paddingHorizontal: 24, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
    bookNowBtn: { backgroundColor: COLORS.primary, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', ...Shadows.lg },
    bookNowBtnText: { color: '#FFF', fontSize: 18, fontWeight: "900" },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
    modalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
    fullImage: { width: width, height: height * 0.8 }
});
