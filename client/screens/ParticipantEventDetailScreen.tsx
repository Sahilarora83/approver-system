import React, { useState, useMemo } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Share, FlatList } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import Animated, { FadeInUp, FadeInRight, FadeInDown, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, interpolate } from "react-native-reanimated";

import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import EventMap from "@/components/EventMap";

import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

const { width, height } = Dimensions.get("window");
const IMAGE_HEIGHT = height * 0.5;

const COLORS = {
    background: "#111827",
    card: "#1F2937",
    primary: "#6366F1", // Indigo-ish for that premium look
    secondary: "#4F46E5",
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    accent: "#10B981",
};

export default function ParticipantEventDetailScreen({ route, navigation }: any) {
    const { eventId } = route?.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollY = useSharedValue(0);

    const { data: event, isLoading } = useQuery({
        queryKey: [`/api/events/${eventId}`],
        enabled: !!eventId,
    }) as { data: any; isLoading: boolean };

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
    }) as { data: any };

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
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    const { data: favoriteStatus, refetch: refetchFavorite } = useQuery({
        queryKey: [`/api/favorites/${eventId}`],
        queryFn: async () => {
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

    const { data: similarEvents } = useQuery({
        queryKey: [`/api/events/search`, { category: event?.category, limit: 5 }],
        queryFn: async () => {
            if (!event?.category) return [];
            const res = await apiRequest("GET", `/api/events/search?category=${encodeURIComponent(event.category)}&limit=5`);
            const data = await res.json();
            return data.events.filter((e: any) => e.id !== eventId);
        },
        enabled: !!event?.category,
    }) as { data: any[] };

    const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
    const isPending = registrationStatus === "pending";
    const isRejected = registrationStatus === "rejected";

    const scrollHandler = useAnimatedScrollHandler((e) => {
        scrollY.value = e.contentOffset.y;
    });

    const headerImageStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateY: interpolate(scrollY.value, [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT], [-IMAGE_HEIGHT / 2, 0, IMAGE_HEIGHT * 0.5]) },
                { scale: interpolate(scrollY.value, [-IMAGE_HEIGHT, 0, IMAGE_HEIGHT], [2, 1, 1]) }
            ]
        };
    });

    const handleShare = async () => {
        const link = event.publicLink || event.public_link;
        const msg = `Check out ${event.title}\nhttps://qr-ticket-manager.expo.app/events/${link}`;
        await Share.share({ message: msg });
    };

    const handleRegister = () => {
        if (isApproved) {
            navigation.navigate("Tickets");
            return;
        }
        if (isPending || isRejected) return;
        navigation.navigate("RegisterEvent", { eventLink: event.publicLink || event.public_link });
    };

    if (isLoading || !event) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </ThemedView>
        );
    }

    const gallery = event.gallery || [event.coverImage];

    return (
        <ThemedView style={styles.container}>
            <Animated.ScrollView
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
            >
                {/* Immersive Header Image Carousel */}
                <View style={styles.headerImageWrapper}>
                    <Animated.View style={[styles.imageContainer, headerImageStyle]}>
                        <ScrollView
                            horizontal
                            pagingEnabled
                            showsHorizontalScrollIndicator={false}
                            onScroll={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
                            scrollEventThrottle={16}
                        >
                            {gallery.map((img: string, idx: number) => (
                                <Image
                                    key={idx}
                                    source={{ uri: resolveImageUrl(img) }}
                                    style={styles.headerImage}
                                    contentFit="cover"
                                />
                            ))}
                        </ScrollView>
                        <LinearGradient
                            colors={["rgba(0,0,0,0.5)", "transparent", "transparent", COLORS.background]}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>

                    {/* Indicators */}
                    <View style={styles.indicatorRow}>
                        {gallery.length > 1 && gallery.map((_: any, i: number) => (
                            <View key={i} style={[styles.indicator, activeIndex === i ? styles.indicatorActive : styles.indicatorInactive]} />
                        ))}
                    </View>

                    {/* Floating Header Actions */}
                    <View style={[styles.floatingHeader, { top: insets.top + 10 }]}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.headerBtn}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </Pressable>
                        <View style={styles.headerRightActions}>
                            <Pressable onPress={() => favoriteMutation.mutate()} style={styles.headerBtn}>
                                <Ionicons name={favoriteStatus?.isFavorited ? "heart" : "heart-outline"} size={24} color={favoriteStatus?.isFavorited ? "#EF4444" : "#FFF"} />
                            </Pressable>
                            <Pressable onPress={handleShare} style={[styles.headerBtn, { marginLeft: 12 }]}>
                                <Ionicons name="paper-plane-outline" size={22} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Animated.View entering={FadeInUp.delay(200)}>
                        <ThemedText style={styles.title}>{event.title}</ThemedText>

                        <View style={styles.badgeRow}>
                            <View style={styles.categoryBadge}>
                                <ThemedText style={styles.categoryText}>{event.category || "Music"}</ThemedText>
                            </View>
                            <Pressable style={styles.goingPile} onPress={() => navigation.navigate("Attendees", { eventId: event.id })}>
                                {(attendanceData?.registrations || []).slice(0, 5).map((reg: any, i: number) => (
                                    <Image
                                        key={i}
                                        source={{ uri: reg.profileImage ? resolveImageUrl(reg.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${reg.id}` }}
                                        style={[styles.pileAvatar, { marginLeft: i === 0 ? 0 : -10 }]}
                                    />
                                ))}
                                <ThemedText style={styles.goingText}>{attendanceData?.count || 0}+ going</ThemedText>
                                <Ionicons name="chevron-forward" size={14} color={COLORS.primary} style={{ marginLeft: 4 }} />
                            </Pressable>
                        </View>
                    </Animated.View>

                    <View style={styles.divider} />

                    {/* Info Blocks */}
                    <View style={styles.infoBlocks}>
                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="calendar-clear" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <ThemedText style={styles.infoValue}>{format(new Date(event.startDate), "EEEE, MMMM d, yyyy")}</ThemedText>
                                <ThemedText style={styles.infoSub}>{format(new Date(event.startDate), "HH:mm")} - {event.endDate ? format(new Date(event.endDate), "HH:mm") : "TBD"}</ThemedText>
                                <Pressable style={styles.linkAction}>
                                    <ThemedText style={styles.linkActionText}>Add to My Calendar</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="location" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <ThemedText style={styles.infoValue}>{event.location || "Online"}</ThemedText>
                                <ThemedText style={styles.infoSub}>{event.address || "No precise address"}</ThemedText>
                                <Pressable style={styles.linkAction} onPress={() => {
                                    const q = encodeURIComponent(event.address || event.location);
                                    Linking.openURL(Platform.OS === 'ios' ? `maps://app?q=${q}` : `geo:0,0?q=${q}`);
                                }}>
                                    <ThemedText style={styles.linkActionText}>See Location on Maps</ThemedText>
                                </Pressable>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={styles.infoIconBox}>
                                <Ionicons name="ticket" size={22} color={COLORS.primary} />
                            </View>
                            <View style={styles.infoTextContainer}>
                                <ThemedText style={styles.infoValue}>
                                    {event.price && event.price !== "0" ? `$${event.price}` : "Free"}
                                </ThemedText>
                                <ThemedText style={styles.infoSub}>Ticket price depends on package</ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Organizer Section */}
                    <View style={styles.organizerCard}>
                        <View style={styles.organizerLeft}>
                            <Image
                                source={{ uri: event.organizerProfileImage ? resolveImageUrl(event.organizerProfileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` }}
                                style={styles.organizerThumb}
                            />
                            <View>
                                <ThemedText style={styles.organizerName}>{event.organizerName || "World of Music"}</ThemedText>
                                <ThemedText style={styles.organizerRole}>Organizer</ThemedText>
                            </View>
                        </View>
                        <Pressable
                            style={[styles.followBtn, followStatus?.following && styles.followBtnActive]}
                            onPress={() => followMutation.mutate()}
                        >
                            <ThemedText style={[styles.followBtnText, followStatus?.following && styles.followBtnTextActive]}>
                                {followStatus?.following ? "Following" : "Follow"}
                            </ThemedText>
                        </Pressable>
                    </View>

                    {/* About Event */}
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>About Event</ThemedText>
                    </View>
                    <Pressable onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                        <ThemedText style={styles.descriptionText} numberOfLines={isDescriptionExpanded ? undefined : 3}>
                            {event.description || "Join us for an incredible experience filled with performances, activities, and memories."}
                        </ThemedText>
                        {!isDescriptionExpanded && (
                            <ThemedText style={styles.readMore}>Read more...</ThemedText>
                        )}
                    </Pressable>

                    {/* Gallery (Pre-Event) */}
                    {gallery.length > 0 && (
                        <View style={styles.gallerySection}>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText style={styles.sectionTitle}>Gallery (Pre-Event)</ThemedText>
                                <Pressable><ThemedText style={styles.linkText}>See All</ThemedText></Pressable>
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.galleryScroll}>
                                {gallery.map((img: string, i: number) => (
                                    <View key={i} style={styles.galleryItem}>
                                        <Image source={{ uri: resolveImageUrl(img) }} style={styles.galleryImage} />
                                        {i === 2 && gallery.length > 3 && (
                                            <BlurView intensity={20} tint="dark" style={styles.galleryOverlay}>
                                                <ThemedText style={styles.overlayText}>{gallery.length - 2}+</ThemedText>
                                            </BlurView>
                                        )}
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Location / Interactive Map */}
                    <View style={styles.sectionHeader}>
                        <ThemedText style={styles.sectionTitle}>Location</ThemedText>
                    </View>
                    <View style={styles.locationDetailRow}>
                        <Ionicons name="location-sharp" size={16} color={COLORS.primary} />
                        <ThemedText style={styles.locationAddressText} numberOfLines={1}>
                            {event.address || event.location}
                        </ThemedText>
                    </View>

                    <View style={styles.mapContainer}>
                        <EventMap
                            latitude={parseFloat(event.latitude) || 40.7128}
                            longitude={parseFloat(event.longitude) || -74.0060}
                            title={event.title}
                        />
                    </View>

                    {/* More Events Like This */}
                    {similarEvents && similarEvents.length > 0 && (
                        <View style={styles.similarEventsSection}>
                            <View style={styles.sectionHeaderRow}>
                                <ThemedText style={styles.sectionTitle}>More Events like this</ThemedText>
                                <Pressable><ThemedText style={styles.linkText}>See All</ThemedText></Pressable>
                            </View>
                            <FlatList
                                horizontal
                                data={similarEvents}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 16 }}
                                keyExtractor={(item) => item.id}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.similarCard}
                                        onPress={() => navigation.push("ParticipantEventDetail", { eventId: item.id })}
                                    >
                                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.similarImg} />
                                        <ThemedText style={styles.similarTitle} numberOfLines={1}>{item.title}</ThemedText>
                                    </Pressable>
                                )}
                            />
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

            {/* Sticky Bottom Action Bar */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
                <Pressable
                    style={[
                        styles.bookBtn,
                        isApproved && styles.bookBtnSuccess,
                        isRejected && styles.bookBtnDanger
                    ]}
                    onPress={handleRegister}
                    disabled={isRegLoading || isPending}
                >
                    <ThemedText style={styles.bookBtnText}>
                        {isRegLoading ? "Checking Status..." :
                            isApproved ? "Joined • View Ticket" :
                                isPending ? "Pending Approval" :
                                    isRejected ? "Registration Rejected" : "Book Event"}
                    </ThemedText>
                </Pressable>
            </View>
        </ThemedView>
    );
}

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b1" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
    headerImageWrapper: { height: IMAGE_HEIGHT, position: "relative" },
    imageContainer: { width: width, height: IMAGE_HEIGHT },
    headerImage: { width: width, height: IMAGE_HEIGHT },
    indicatorRow: { position: "absolute", bottom: 40, flexDirection: "row", alignSelf: "center", gap: 6 },
    indicator: { height: 6, borderRadius: 3 },
    indicatorActive: { width: 30, backgroundColor: COLORS.primary },
    indicatorInactive: { width: 6, backgroundColor: "rgba(255,255,255,0.4)" },
    floatingHeader: { position: "absolute", left: 0, right: 0, paddingHorizontal: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    headerBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.3)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    headerRightActions: { flexDirection: "row" },
    content: { marginTop: -24, backgroundColor: COLORS.background, borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 32 },
    title: { fontSize: 32, fontWeight: "900", color: "#FFF", marginBottom: 16, letterSpacing: -0.5 },
    badgeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    categoryBadge: { backgroundColor: "rgba(99, 102, 241, 0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.2)" },
    categoryText: { color: COLORS.primary, fontSize: 12, fontWeight: "900" },
    goingPile: { flexDirection: "row", alignItems: "center" },
    pileAvatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: COLORS.background },
    goingText: { marginLeft: 8, color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.05)", marginVertical: 24 },
    infoBlocks: { gap: 24 },
    infoRow: { flexDirection: "row", gap: 16, alignItems: "flex-start" },
    infoIconBox: { width: 52, height: 52, borderRadius: 18, backgroundColor: "rgba(99, 102, 241, 0.08)", justifyContent: "center", alignItems: "center" },
    infoTextContainer: { flex: 1 },
    infoValue: { fontSize: 17, fontWeight: "800", color: "#FFF" },
    infoSub: { fontSize: 13, color: "#9CA3AF", marginTop: 4, fontWeight: "500" },
    linkAction: { marginTop: 8 },
    linkActionText: { color: COLORS.primary, fontSize: 14, fontWeight: "800" },
    organizerCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "rgba(255,255,255,0.02)", padding: 16, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    organizerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    organizerThumb: { width: 48, height: 48, borderRadius: 24 },
    organizerName: { fontSize: 16, fontWeight: "800", color: "#FFF" },
    organizerRole: { fontSize: 12, color: "#9CA3AF" },
    followBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    followBtnActive: { backgroundColor: "transparent", borderWidth: 1.5, borderColor: COLORS.primary },
    followBtnText: { color: "#FFF", fontSize: 14, fontWeight: "800" },
    followBtnTextActive: { color: COLORS.primary },
    sectionHeader: { marginTop: 32, marginBottom: 12 },
    sectionTitle: { fontSize: 22, fontWeight: "900", color: "#FFF" },
    descriptionText: { fontSize: 15, color: "#9CA3AF", lineHeight: 24 },
    readMore: { color: COLORS.primary, fontWeight: "900", marginTop: 4 },
    gallerySection: { marginTop: 32 },
    sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    linkText: { color: COLORS.primary, fontWeight: "800", fontSize: 15 },
    galleryScroll: { gap: 12 },
    galleryItem: { width: 100, height: 100, borderRadius: 20, overflow: "hidden" },
    galleryImage: { width: "100%", height: "100%" },
    galleryOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
    overlayText: { color: "#FFF", fontSize: 20, fontWeight: "900" },
    locationDetailRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 16 },
    locationAddressText: { fontSize: 14, color: "#9CA3AF", fontWeight: "600", flex: 1 },
    mapContainer: { height: 200, borderRadius: 24, overflow: "hidden", backgroundColor: "#1F2937" },
    map: { ...StyleSheet.absoluteFillObject },
    markerContainer: { alignItems: "center", justifyContent: "center" },
    markerPulse: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(99, 102, 241, 0.2)", position: "absolute" },
    markerCore: { width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.primary, justifyContent: "center", alignItems: "center", borderWidth: 2, borderColor: "#FFF" },
    similarEventsSection: { marginTop: 40 },
    similarCard: { width: 220, gap: 10 },
    similarImg: { width: "100%", height: 140, borderRadius: 24 },
    similarTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
    bottomBar: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: COLORS.background, paddingHorizontal: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.05)" },
    bookBtn: { backgroundColor: COLORS.primary, height: 60, borderRadius: 30, justifyContent: "center", alignItems: "center", ...Shadows.lg },
    bookBtnSuccess: { backgroundColor: COLORS.accent },
    bookBtnDanger: { backgroundColor: "#EF4444" },
    bookBtnText: { color: "#FFF", fontSize: 18, fontWeight: "900" },
});
