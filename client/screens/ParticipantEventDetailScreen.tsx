import React, { useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Share, FlatList } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";

import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Shadows } from "@/constants/theme";

const { width } = Dimensions.get("window");
const ITEM_WIDTH = width;
const ITEM_HEIGHT = width * 0.85;

const COLORS = {
    background: "#111827",
    primary: "#6366F1",
    accent: "#10B981",
    card: "#1F2937",
    textSecondary: "#9CA3AF",
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

    // Fetch Event Details
    const { data: event, isLoading } = useQuery({
        queryKey: [`/api/events/${eventId}`],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/events/${eventId}`);
            return res.json();
        },
        enabled: !!eventId,
    });

    // Fetch Attendees/Registration Stats
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

    // Check User's Registration Status
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

    // Follow Logic
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

    // Favorite Logic
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
        queryKey: [`/api/events/search`, { category: event?.category, limit: 5 }],
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
        const link = event.publicLink || event.public_link;
        const evtLink = link || event.id;
        const msg = `Check out ${event.title}\nhttps://qr-ticket-manager.expo.app/events/${evtLink}`;
        await Share.share({ message: msg });
    };

    const handleRegister = () => {
        if (!event) return;
        const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
        const isPending = registrationStatus === "pending";
        const isRejected = registrationStatus === "rejected";

        if (isApproved) {
            navigation.navigate("Tickets");
            return;
        }
        if (isPending || isRejected) return;

        navigation.navigate("RegisterEvent", { eventLink: event.publicLink || event.public_link || event.id });
    };

    if (isLoading) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </ThemedView>
        );
    }

    if (!event) {
        return (
            <ThemedView style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
                <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
                <ThemedText style={{ marginTop: 12, fontSize: 18, fontWeight: "700" }}>Event not found</ThemedText>
                <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20, padding: 12, backgroundColor: COLORS.primary, borderRadius: 8 }}>
                    <ThemedText style={{ color: "#FFF" }}>Go Back</ThemedText>
                </Pressable>
            </ThemedView>
        );
    }

    const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
    const isPending = registrationStatus === "pending";
    const isRejected = registrationStatus === "rejected";
    const gallery = event.gallery && Array.isArray(event.gallery) && event.gallery.length > 0 ? event.gallery : [event.coverImage];

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
                {/* Header Image Area */}
                <View style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT, position: 'relative' }}>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
                        {gallery.map((img: string, i: number) => (
                            <Image
                                key={i}
                                source={{ uri: resolveImageUrl(img) }}
                                style={{ width: ITEM_WIDTH, height: ITEM_HEIGHT }}
                                contentFit="cover"
                            />
                        ))}
                    </ScrollView>

                    {/* Header Controls */}
                    <View style={[styles.headerControls, { top: insets.top + 10 }]}>
                        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </Pressable>
                        <View style={{ flexDirection: "row", gap: 12 }}>
                            <Pressable onPress={() => favoriteMutation.mutate()} style={styles.iconBtn}>
                                <Ionicons name={favoriteStatus?.isFavorited ? "heart" : "heart-outline"} size={22} color={favoriteStatus?.isFavorited ? "#EF4444" : "#FFF"} />
                            </Pressable>
                            <Pressable onPress={handleShare} style={styles.iconBtn}>
                                <Ionicons name="share-outline" size={22} color="#FFF" />
                            </Pressable>
                        </View>
                    </View>

                    <LinearGradient
                        colors={["transparent", "rgba(17, 24, 39, 0.6)", "#111827"]}
                        style={{ position: 'absolute', bottom: 0, width: '100%', height: 140 }}
                    />
                </View>

                <View style={styles.contentContainer}>
                    <ThemedText style={styles.title}>{event.title}</ThemedText>

                    {/* Category & Attendees */}
                    <View style={styles.badgeRow}>
                        <View style={styles.categoryBadge}>
                            <ThemedText style={styles.categoryText}>{event.category || "General"}</ThemedText>
                        </View>
                        {attendanceData && attendanceData.count > 0 && (
                            <Pressable style={styles.attendeesRow} onPress={() => navigation.navigate("Attendees", { eventId: event.id })}>
                                <View style={styles.avatarsPile}>
                                    {(attendanceData.registrations || []).slice(0, 3).map((r: any, i: number) => (
                                        <Image
                                            key={i}
                                            source={{ uri: r.profileImage ? resolveImageUrl(r.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${r.id}` }}
                                            style={[styles.pileAvatar, { marginLeft: i === 0 ? 0 : -10 }]}
                                        />
                                    ))}
                                </View>
                                <ThemedText style={styles.attendeeCountText}>
                                    {attendanceData.count > 1000 ? `${(attendanceData.count / 1000).toFixed(1)}k+` : `${attendanceData.count}+`} going
                                </ThemedText>
                                <Ionicons name="arrow-forward" size={14} color={COLORS.textSecondary} style={{ marginLeft: 4 }} />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.divider} />

                    {/* Date Section */}
                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="calendar" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.infoTitle}>{safeFormat(event.startDate, "EEEE, MMMM d, yyyy")}</ThemedText>
                            <ThemedText style={styles.infoSub}>{safeFormat(event.startDate, "h:mm a")} - {event.endDate ? safeFormat(event.endDate, "h:mm a") : "Late"}</ThemedText>

                            <Pressable style={styles.smallActionBtn}>
                                <Ionicons name="calendar-outline" size={12} color="#FFF" />
                                <ThemedText style={styles.smallActionBtnText}>Add to My Calendar</ThemedText>
                            </Pressable>
                        </View>
                    </View>

                    {/* Location Section */}
                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="location" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.infoTitle}>{event.location || "Online Event"}</ThemedText>
                            <ThemedText style={styles.infoSub} numberOfLines={2}>{event.address || "No address provided"}</ThemedText>

                            <Pressable
                                style={styles.smallActionBtn}
                                onPress={() => {
                                    const q = encodeURIComponent(event.address || event.location || "");
                                    if (q) Linking.openURL(Platform.OS === 'ios' ? `maps://app?q=${q}` : `geo:0,0?q=${q}`);
                                }}
                            >
                                <Ionicons name="map-outline" size={12} color="#FFF" />
                                <ThemedText style={styles.smallActionBtnText}>See Location on Maps</ThemedText>
                            </Pressable>
                        </View>
                    </View>

                    {/* Price Section */}
                    <View style={styles.infoRow}>
                        <View style={styles.iconBox}>
                            <Ionicons name="ticket" size={20} color={COLORS.primary} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.infoTitle}>
                                {event.price && Number(event.price) > 0 ? `$${event.price}` : "Free"}
                            </ThemedText>
                            <ThemedText style={styles.infoSub}>Ticket price per person</ThemedText>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Organizer Section */}
                    <Pressable style={styles.organizerRow}>
                        <Image
                            source={{ uri: event.organizerProfileImage ? resolveImageUrl(event.organizerProfileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${event.organizerId}` }}
                            style={styles.organizerAvatar}
                        />
                        <View style={{ flex: 1 }}>
                            <ThemedText style={styles.organizerName}>{event.organizerName || "Organizer"}</ThemedText>
                            <ThemedText style={styles.organizerRole}>Organizer</ThemedText>
                        </View>
                        <Pressable
                            style={[styles.followBtn, followStatus?.following && styles.followBtnActive]}
                            onPress={() => followMutation.mutate()}
                        >
                            <ThemedText style={styles.followBtnText}>
                                {followStatus?.following ? "Following" : "Follow"}
                            </ThemedText>
                        </Pressable>
                    </Pressable>

                    {/* About Section */}
                    <View style={styles.section}>
                        <ThemedText style={styles.sectionHeader}>About Event</ThemedText>
                        <Pressable onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}>
                            <ThemedText style={styles.aboutText} numberOfLines={isDescriptionExpanded ? undefined : 6}>
                                {event.description || "No description provided."}
                            </ThemedText>
                            <ThemedText style={styles.readMore}>{isDescriptionExpanded ? "Read Less" : "Read More..."}</ThemedText>
                        </Pressable>
                    </View>

                    {/* Gallery Section */}
                    {gallery.length > 0 && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <ThemedText style={styles.sectionHeader}>Gallery</ThemedText>
                                {/* <ThemedText style={{color: COLORS.primary, fontSize: 13, fontWeight: "600"}}>See All</ThemedText> */}
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                                {gallery.map((img: string, i: number) => (
                                    <Image
                                        key={i}
                                        source={{ uri: resolveImageUrl(img) }}
                                        style={{ width: 100, height: 100, borderRadius: 16 }}
                                    />
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    {/* Similar Events */}
                    {similarEvents && similarEvents.length > 0 && (
                        <View style={styles.section}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <ThemedText style={styles.sectionHeader}>More Events like this</ThemedText>
                                {/* <ThemedText style={{color: COLORS.primary, fontSize: 13, fontWeight: "600"}}>See All</ThemedText> */}
                            </View>
                            <FlatList
                                horizontal
                                data={similarEvents}
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={{ gap: 14 }}
                                renderItem={({ item }) => (
                                    <Pressable
                                        style={styles.similarCard}
                                        onPress={() => navigation.push("ParticipantEventDetail", { eventId: item.id })}
                                    >
                                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.similarImg} />
                                        <ThemedText numberOfLines={1} style={styles.similarTitle}>{item.title}</ThemedText>
                                    </Pressable>
                                )}
                            />
                        </View>
                    )}

                </View>
            </ScrollView>

            {/* Bottom Floating Button */}
            <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom + 10, 20) }]}>
                <Pressable
                    style={[
                        styles.bookBtn,
                        isApproved && { backgroundColor: COLORS.accent },
                        isRejected && { backgroundColor: "#EF4444" },
                        (isRegLoading || isPending) && { opacity: 0.7 }
                    ]}
                    onPress={handleRegister}
                    disabled={isRegLoading || isPending}
                >
                    {isRegLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                        <ThemedText style={styles.bookBtnText}>
                            {isApproved ? "Show Ticket" : isPending ? "Pending Approval" : isRejected ? "Registration Rejected" : "Book Event"}
                        </ThemedText>
                    )}
                </Pressable>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    headerControls: {
        position: 'absolute', left: 0, right: 0,
        flexDirection: 'row', justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 10
    },
    iconBtn: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: "rgba(0,0,0,0.3)",
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    },
    contentContainer: {
        marginTop: -30,
        paddingHorizontal: 24,
    },
    title: { fontSize: 32, fontWeight: "700", color: "#FFF", marginBottom: 16, lineHeight: 40 },
    badgeRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" },
    categoryBadge: {
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
        backgroundColor: "rgba(99, 102, 241, 0.15)", borderWidth: 1, borderColor: "rgba(99, 102, 241, 0.3)"
    },
    categoryText: { fontSize: 13, fontWeight: "600", color: COLORS.primary },

    attendeesRow: { flexDirection: "row", alignItems: "center" },
    avatarsPile: { flexDirection: "row" },
    pileAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.background },
    attendeeCountText: { marginLeft: 12, fontSize: 14, fontWeight: "500", color: "#FFF" }, // Changing to White/Grey for modern look

    divider: { height: 1, backgroundColor: "rgba(255,255,255,0.08)", marginBottom: 24 },

    infoRow: { flexDirection: "row", gap: 16, marginBottom: 24 },
    iconBox: {
        width: 52, height: 52, borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.05)",
        justifyContent: "center", alignItems: "center"
    },
    infoTitle: { fontSize: 16, fontWeight: "700", color: "#FFF", marginBottom: 4 },
    infoSub: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20, marginBottom: 8 },
    smallActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: "rgba(99, 102, 241, 0.2)",
        borderRadius: 20, alignSelf: 'flex-start'
    },
    smallActionBtnText: { color: "#818CF8", fontSize: 12, fontWeight: "600" },

    organizerRow: {
        flexDirection: "row", alignItems: "center", gap: 14,
        paddingVertical: 4, marginBottom: 30
    },
    organizerAvatar: { width: 48, height: 48, borderRadius: 24 },
    organizerName: { fontSize: 16, fontWeight: "700", color: "#FFF" },
    organizerRole: { fontSize: 13, color: COLORS.textSecondary },
    followBtn: {
        paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.1)",
    },
    followBtnActive: { backgroundColor: COLORS.primary },
    followBtnText: { fontSize: 13, fontWeight: "600", color: "#FFF" },

    section: { marginBottom: 32 },
    sectionHeader: { fontSize: 18, fontWeight: "700", color: "#FFF", marginBottom: 12 },
    aboutText: { fontSize: 15, color: "#D1D5DB", lineHeight: 26 },
    readMore: { color: COLORS.primary, fontWeight: "600", marginTop: 8 },

    similarCard: { width: 260, height: 160, borderRadius: 16, overflow: 'hidden' },
    similarImg: { width: "100%", height: "100%", position: 'absolute' },
    similarTitle: {
        position: 'absolute', bottom: 12, left: 12, right: 12,
        color: "#FFF", fontWeight: "700", fontSize: 16,
        textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4
    },

    bottomBar: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: 'transparent',
    },
    bookBtn: {
        backgroundColor: COLORS.purpleBtn,
        marginHorizontal: 20,
        height: 56,
        borderRadius: 28,
        justifyContent: "center", alignItems: "center",
        shadowColor: COLORS.purpleBtn,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8
    },
    bookBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.5 }
});
