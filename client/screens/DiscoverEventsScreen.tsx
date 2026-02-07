import React, { useState, useCallback, useMemo, useEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions, Modal } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from 'expo-location';
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { format } from "date-fns";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInDown, FadeInRight, FadeInUp, useAnimatedStyle, withRepeat, withTiming, useSharedValue } from "react-native-reanimated";
import { Skeleton } from "@/components/Skeleton";

const { width } = Dimensions.get("window");

const COLORS = {
    background: "#111827",
    card: "#1F2937",
    primary: "#7C3AED",
    text: "#FFFFFF",
    textSecondary: "#9CA3AF",
    accent: "#10B981",
};

const CATEGORIES = [
    { name: "All", icon: "check-circle", lib: "Feather" },
    { name: "Music", icon: "music", lib: "Feather" },
    { name: "Art", icon: "image", lib: "Feather" },
    { name: "Workshop", icon: "briefcase", lib: "Feather" },
    { name: "Tech", icon: "cpu", lib: "Feather" },
    { name: "Food", icon: "coffee", lib: "Feather" },
];

export default function DiscoverEventsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const { user } = useAuth();
    const tabBarHeight = useBottomTabBarHeight();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [userCity, setUserCity] = useState("Detecting location...");
    const [isLocationLoading, setIsLocationLoading] = useState(true);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [sortBy, setSortBy] = useState<"date" | "title">("date");

    const { data: events = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ["/api/events/feed"],
    }) as { data: any[]; isLoading: boolean; refetch: any; isFetching: boolean };

    // Real Location Detection
    useEffect(() => {
        (async () => {
            try {
                let { status } = await Location.requestForegroundPermissionsAsync();
                if (status !== 'granted') {
                    setUserCity("New York, USA");
                    setIsLocationLoading(false);
                    return;
                }

                let location = await Location.getCurrentPositionAsync({});
                let geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (geocode.length > 0) {
                    const city = geocode[0].city || geocode[0].region || "Your Location";
                    const country = geocode[0].country || "";
                    setUserCity(`${city}${country ? ', ' + country : ''} `);
                }
            } catch (error) {
                console.error("Location error", error);
                setUserCity("New York, USA");
            } finally {
                setIsLocationLoading(false);
            }
        })();
    }, []);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning 👋";
        if (hour < 18) return "Good Afternoon ☀️";
        return "Good Evening 🌙";
    }, []);

    const safeFormat = (date: any, formatStr: string) => {
        try {
            if (!date) return "TBD";
            const d = new Date(date);
            if (isNaN(d.getTime())) return "TBD";
            return format(d, formatStr);
        } catch (e) {
            return "TBD";
        }
    };

    const featuredEvents = useMemo(() => events.slice(0, 5), [events]);

    const FeaturedSkeleton = () => (
        <View style={styles.featuredList}>
            {[1, 2].map((i) => (
                <View key={i} style={[styles.featuredCard, { marginRight: 16 }]}>
                    <Skeleton height={width * 0.55} borderRadius={32} />
                    <View style={{ padding: 16, gap: 8 }}>
                        <Skeleton width="80%" height={24} />
                        <Skeleton width="60%" height={16} />
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Skeleton width="40%" height={14} />
                            <Skeleton width={24} height={24} borderRadius={12} />
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const SecondarySkeleton = () => (
        <View style={styles.popularRow}>
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={styles.secondaryCardWrapper}>
                    <View style={styles.secondaryCard}>
                        <Skeleton height={140} borderRadius={24} />
                        <View style={{ padding: 12, gap: 6 }}>
                            <Skeleton width="90%" height={18} />
                            <Skeleton width="70%" height={14} />
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                                <Skeleton width="50%" height={12} />
                                <Skeleton width={16} height={16} borderRadius={8} />
                            </View>
                        </View>
                    </View>
                </View>
            ))}
        </View>
    );

    const filteredEvents = useMemo(() => {
        let result = events.filter((event: any) => {
            if (!event || !event.title) return false;

            const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

            if (selectedCategory !== "All") {
                const categorySearch = selectedCategory.toLowerCase();
                const matchesCategory =
                    (event.category && event.category.toLowerCase().includes(categorySearch)) ||
                    (event.description && event.description.toLowerCase().includes(categorySearch)) ||
                    event.title.toLowerCase().includes(categorySearch);
                return matchesSearch && matchesCategory;
            }
            return matchesSearch;
        });

        if (sortBy === "date") {
            result.sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
        } else if (sortBy === "title") {
            result.sort((a: any, b: any) => a.title.localeCompare(b.title));
        }

        return result;
    }, [events, searchQuery, selectedCategory, sortBy]);

    const renderFeaturedCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={({ pressed }) => [
                    styles.featuredCard,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
            >
                <Image
                    source={{ uri: resolveImageUrl(event.coverImage) }}
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                />
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)", "#000"]}
                    style={StyleSheet.absoluteFill}
                />

                <View style={styles.featuredOverlayContent}>
                    <View style={styles.featuredBadge}>
                        <ThemedText style={styles.featuredBadgeText}>Featured</ThemedText>
                    </View>
                    <ThemedText style={styles.featuredTitle} numberOfLines={2}>{event.title}</ThemedText>

                    <View style={styles.featuredMetaRow}>
                        <View style={styles.featuredInfoItem}>
                            <Feather name="calendar" size={14} color="#A78BFA" />
                            <ThemedText style={styles.featuredMetaText}>
                                {safeFormat(event.startDate, "MMM d, HH:mm")}
                            </ThemedText>
                        </View>
                    </View>
                    {event.location && (
                        <View style={[styles.featuredInfoItem, { marginTop: 8 }]}>
                            <Feather name="map-pin" size={14} color="#A78BFA" />
                            <ThemedText style={styles.featuredMetaText} numberOfLines={1}>
                                {event.location}
                            </ThemedText>
                        </View>
                    )}
                </View>
            </Pressable>
        </Animated.View>
    ), [navigation]);

    const renderSecondaryCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(500)} style={styles.secondaryCardWrapper}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={styles.secondaryCard}
            >
                <View style={styles.secondaryImageContainer}>
                    <Image
                        source={{ uri: resolveImageUrl(event.coverImage) }}
                        style={styles.secondaryImage}
                        contentFit="cover"
                    />
                    {(!event.price || event.price === "0" || event.price.toLowerCase() === "free") && (
                        <View style={styles.freeBadge}>
                            <ThemedText style={styles.freeText}>FREE</ThemedText>
                        </View>
                    )}
                </View>
                <View style={styles.secondaryContent}>
                    <ThemedText style={styles.secondaryTitle} numberOfLines={1}>{event.title}</ThemedText>
                    <ThemedText style={styles.secondaryDetail} numberOfLines={1}>
                        {safeFormat(event.startDate, "EEE, MMM d • HH:mm")}
                    </ThemedText>
                    <View style={styles.secondaryMetaRow}>
                        <View style={styles.secondaryLocation}>
                            <Feather name="map-pin" size={12} color="#7C3AED" />
                            <ThemedText style={styles.secondaryLocationText} numberOfLines={1}>
                                {event.location || "TBD"}
                            </ThemedText>
                        </View>
                        <Pressable>
                            <Feather name="heart" size={16} color="#7C3AED" />
                        </Pressable>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    ), [navigation]);

    const ListHeader = useMemo(() => (
        <View style={styles.headerContent}>
            {/* User Profile Info */}
            <View style={styles.userRow}>
                <View style={styles.userInfo}>
                    <Image
                        source={{ uri: user?.profileImage ? resolveImageUrl(user.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || "guest"}` }}
                        style={styles.avatar}
                    />
                    <View style={styles.userText}>
                        <ThemedText style={styles.greetingText}>{greeting}</ThemedText>
                        <ThemedText style={styles.userName}>{user?.name || "Andrew Ainsley"}</ThemedText>
                    </View>
                </View>
                <Pressable onPress={() => navigation.navigate("Notifications")} style={styles.iconButton}>
                    <Feather name="bell" size={24} color="#FFF" />
                    <View style={styles.notifBadge} />
                </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.searchBarContainer}>
                <View style={styles.searchBar}>
                    <Feather name="search" size={20} color="#6B7280" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="What event are you looking for?"
                        placeholderTextColor="#6B7280"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Pressable style={styles.filterBarIcon} onPress={() => setShowFilterModal(true)}>
                        <MaterialCommunityIcons name="tune-variant" size={20} color="#7C3AED" />
                    </Pressable>
                </View>
            </View>

            {/* Featured Section */}
            <View style={styles.sectionTitleRow}>
                <ThemedText style={styles.sectionTitleMain}>Featured</ThemedText>
                <Pressable onPress={() => { }}>
                    <ThemedText style={styles.seeAllText}>See All</ThemedText>
                </Pressable>
            </View>
            {isLoading ? (
                <FeaturedSkeleton />
            ) : (
                <FlatList
                    horizontal
                    data={featuredEvents}
                    renderItem={renderFeaturedCard}
                    keyExtractor={(item) => `featured-${item.id}`}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.featuredList}
                    snapToInterval={width * 0.85 + 16}
                    decelerationRate="fast"
                />
            )}

            {/* Popular/Categories Section */}
            <View style={styles.sectionTitleRow}>
                <ThemedText style={styles.sectionTitleMain}>Popular Event 🔥</ThemedText>
                <Pressable onPress={() => { }}>
                    <ThemedText style={styles.seeAllText}>See All</ThemedText>
                </Pressable>
            </View>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categoryScroll}
                contentContainerStyle={styles.categoryContent}
            >
                {CATEGORIES.map((cat) => (
                    <Pressable
                        key={cat.name}
                        onPress={() => {
                            setSelectedCategory(cat.name);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat.name && styles.categoryChipActive
                        ]}
                    >
                        <View style={styles.categoryBadgeIcon}>
                            {cat.name === "All" && <Feather name="check-circle" size={16} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                            {cat.name === "Music" && <Feather name="music" size={16} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                            {cat.name === "Art" && <MaterialCommunityIcons name="palette" size={18} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                            {cat.name === "Workshop" && <Feather name="briefcase" size={16} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                            {cat.name === "Tech" && <Feather name="cpu" size={16} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                            {cat.name === "Food" && <Feather name="coffee" size={16} color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"} />}
                        </View>
                        <ThemedText style={[
                            styles.categoryText,
                            selectedCategory === cat.name && styles.categoryTextActive
                        ]}>{cat.name}</ThemedText>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    ), [user, greeting, searchQuery, featuredEvents, selectedCategory, navigation, renderFeaturedCard, isLoading, showFilterModal, sortBy]);

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <FlatList
                data={filteredEvents.slice(5)} // Remaining events after featured
                renderItem={renderSecondaryCard}
                keyExtractor={(item) => `popular-${item.id}`}
                ListHeaderComponent={ListHeader}
                showsVerticalScrollIndicator={false}
                numColumns={2}
                columnWrapperStyle={styles.popularRow}
                contentContainerStyle={[
                    styles.mainList,
                    { paddingBottom: tabBarHeight + 20 }
                ]}
                refreshing={isFetching}
                onRefresh={refetch}
                ListEmptyComponent={
                    isLoading ? (
                        <SecondarySkeleton />
                    ) : (
                        <View style={styles.emptyState}>
                            <Image
                                source={require("../../assets/images/icon.png")}
                                style={styles.emptyImage}
                                contentFit="contain"
                            />
                            <ThemedText style={styles.emptyTitle}>No Events Found</ThemedText>
                            <ThemedText style={styles.emptySub}>Try searching for something else</ThemedText>
                        </View>
                    )
                }
            />

            {/* Simple Filter Modal */}
            <Modal
                transparent
                visible={showFilterModal}
                animationType="fade"
                onRequestClose={() => setShowFilterModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowFilterModal(false)}>
                    <View style={styles.modalContent}>
                        <ThemedText style={styles.modalTitle}>Sort Events</ThemedText>

                        <Pressable
                            style={[styles.modalOption, sortBy === "date" && styles.modalOptionActive]}
                            onPress={() => { setSortBy("date"); setShowFilterModal(false); }}
                        >
                            <Feather name="calendar" size={18} color={sortBy === "date" ? "#FFF" : "#9CA3AF"} />
                            <ThemedText style={[styles.modalOptionText, sortBy === "date" && { color: "#FFF", fontWeight: "700" }]}>Date (Soonest)</ThemedText>
                            {sortBy === "date" && <Feather name="check" size={18} color="#FFF" />}
                        </Pressable>

                        <Pressable
                            style={[styles.modalOption, sortBy === "title" && styles.modalOptionActive]}
                            onPress={() => { setSortBy("title"); setShowFilterModal(false); }}
                        >
                            <Feather name="type" size={18} color={sortBy === "title" ? "#FFF" : "#9CA3AF"} />
                            <ThemedText style={[styles.modalOptionText, sortBy === "title" && { color: "#FFF", fontWeight: "700" }]}>Name (A-Z)</ThemedText>
                            {sortBy === "title" && <Feather name="check" size={18} color="#FFF" />}
                        </Pressable>

                        <Pressable style={styles.modalCloseBtn} onPress={() => setShowFilterModal(false)}>
                            <ThemedText style={styles.modalCloseText}>Cancel</ThemedText>
                        </Pressable>
                    </View>
                </Pressable>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827",
    },
    mainList: {
        paddingBottom: 20,
    },
    headerContent: {
        marginBottom: Spacing.lg,
    },
    userRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        marginTop: Spacing.md,
    },
    userInfo: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#374151",
    },
    userText: {
        gap: 2,
    },
    greetingText: {
        fontSize: 14,
        color: "#9CA3AF",
    },
    userName: {
        fontSize: 18,
        fontWeight: "800",
        color: "#FFF",
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#1F2937",
        justifyContent: "center",
        alignItems: "center",
    },
    notifBadge: {
        position: "absolute",
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#EF4444",
        borderWidth: 2,
        borderColor: "#1F2937",
    },
    searchBarContainer: {
        paddingHorizontal: Spacing.lg,
        marginTop: 24,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1F2937",
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 20,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        color: "#FFF",
        fontSize: 16,
    },
    filterBarIcon: {
        padding: 4,
    },
    sectionTitleRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        marginTop: 32,
        marginBottom: 16,
    },
    sectionTitleMain: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFF",
    },
    seeAllText: {
        color: "#7C3AED",
        fontWeight: "600",
        fontSize: 14,
    },
    featuredList: {
        paddingHorizontal: Spacing.lg,
        gap: 16,
    },
    featuredCard: {
        width: width * 0.85,
        height: width * 1.1,
        borderRadius: 32,
        overflow: "hidden",
        marginRight: 16,
        backgroundColor: "#1F2937",
        ...Shadows.lg,
    },
    featuredImage: {
        width: "100%",
        height: "100%",
    },
    featuredOverlayContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        paddingBottom: 24,
    },
    featuredBadge: {
        alignSelf: 'flex-start',
        backgroundColor: "rgba(124, 58, 237, 0.9)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    featuredBadgeText: {
        fontSize: 10,
        fontWeight: "800",
        color: "#FFF",
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    featuredTitle: {
        fontSize: 24,
        fontWeight: "900",
        color: "#FFF",
        marginBottom: 8,
        lineHeight: 30,
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    featuredDetail: {
        fontSize: 15,
        color: "#7C3AED",
        fontWeight: "800",
        marginBottom: 12,
    },
    featuredMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 16,
    },
    featuredInfoItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    featuredMetaText: {
        fontSize: 13,
        color: "#E5E7EB",
        fontWeight: "600",
    },
    featuredInlineFav: {
        padding: 4,
    },
    categoryScroll: {
        marginBottom: 8,
    },
    categoryContent: {
        paddingHorizontal: Spacing.lg,
        gap: 12,
    },
    categoryChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: "transparent",
        borderWidth: 2,
        borderColor: "#7C3AED",
        gap: 8,
    },
    categoryChipActive: {
        backgroundColor: "#7C3AED",
        borderColor: "#7C3AED",
    },
    categoryBadgeIcon: {
        width: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "800",
        color: "#7C3AED",
    },
    categoryTextActive: {
        color: "#FFF",
    },
    popularRow: {
        paddingHorizontal: Spacing.lg,
        justifyContent: "space-between",
    },
    secondaryCardWrapper: {
        width: "48%",
        marginBottom: 20,
    },
    secondaryCard: {
        width: "100%",
        backgroundColor: "#1F2937",
        borderRadius: 24,
        overflow: "hidden",
        ...Shadows.sm,
    },
    secondaryImageContainer: {
        width: "100%",
        height: 140,
    },
    secondaryImage: {
        width: "100%",
        height: "100%",
    },
    freeBadge: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: "rgba(124, 58, 237, 0.9)",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    freeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "900",
    },
    secondaryContent: {
        padding: 12,
        gap: 2,
    },
    secondaryTitle: {
        fontSize: 15,
        fontWeight: "900",
        color: "#FFF",
    },
    secondaryDetail: {
        fontSize: 12,
        color: "#7C3AED",
        fontWeight: "700",
    },
    secondaryMetaRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: 6,
    },
    secondaryLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
        flex: 1,
    },
    secondaryLocationText: {
        fontSize: 11,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    emptyState: {
        padding: 40,
        alignItems: "center",
        justifyContent: "center",
        marginTop: 40,
    },
    emptyImage: {
        width: 120,
        height: 120,
        opacity: 0.5,
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#FFF",
    },
    emptySub: {
        fontSize: 14,
        color: "#9CA3AF",
        marginTop: 4,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.6)",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
    },
    modalContent: {
        width: "100%",
        backgroundColor: "#1F2937",
        borderRadius: 24,
        padding: 24,
        ...Shadows.xl,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFF",
        marginBottom: 20,
        textAlign: "center",
    },
    modalOption: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        borderRadius: 16,
        backgroundColor: "rgba(255,255,255,0.05)",
        marginBottom: 12,
        gap: 12,
    },
    modalOptionActive: {
        backgroundColor: "#7C3AED",
    },
    modalOptionText: {
        fontSize: 16,
        color: "#D1D5DB",
        fontWeight: "500",
        flex: 1,
    },
    modalCloseBtn: {
        marginTop: 8,
        padding: 16,
        alignItems: "center",
    },
    modalCloseText: {
        color: "#9CA3AF",
        fontWeight: "600",
    },
});
