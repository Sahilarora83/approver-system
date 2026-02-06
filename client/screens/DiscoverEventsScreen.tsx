import React, { useState, useCallback, useMemo, useEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions } from "react-native";
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
import Animated, { FadeInDown, FadeInRight, FadeInUp } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const CATEGORIES = [
    { name: "All", icon: "✅" },
    { name: "Music", icon: "🎵" },
    { name: "Art", icon: "🎨" },
    { name: "Workshop", icon: "💼" },
    { name: "Tech", icon: "💻" },
    { name: "Food", icon: "🍔" },
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

    const filteredEvents = useMemo(() => {
        return events.filter((event: any) => {
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
    }, [events, searchQuery, selectedCategory]);

    const renderFeaturedCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={({ pressed }) => [
                    styles.featuredCard,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
            >
                <View style={styles.featuredImageContainer}>
                    <Image
                        source={{ uri: resolveImageUrl(event.coverImage) }}
                        style={styles.featuredImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <View style={styles.featuredTypeBadge}>
                        <ThemedText style={styles.featuredTypeText}>Featured</ThemedText>
                    </View>
                </View>
                <View style={styles.featuredContent}>
                    <ThemedText style={styles.featuredTitle} numberOfLines={1}>{event.title}</ThemedText>
                    <ThemedText style={styles.featuredDate}>
                        {safeFormat(event.startDate, "EEE, MMM d")} • {safeFormat(event.startDate, "HH:mm")}
                    </ThemedText>
                    <View style={styles.featuredFooter}>
                        <View style={styles.featuredLocation}>
                            <Feather name="map-pin" size={14} color="#7C3AED" />
                            <ThemedText style={styles.featuredLocationText} numberOfLines={1}>
                                {event.location || "Online"}
                            </ThemedText>
                        </View>
                        <Pressable style={styles.favButton}>
                            <Feather name="heart" size={18} color="#7C3AED" />
                        </Pressable>
                    </View>
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
                <Image
                    source={{ uri: resolveImageUrl(event.coverImage) }}
                    style={styles.secondaryImage}
                    contentFit="cover"
                />
                <View style={styles.secondaryContent}>
                    <ThemedText style={styles.secondaryTitle} numberOfLines={1}>{event.title}</ThemedText>
                    <ThemedText style={styles.secondaryDetail}>
                        {safeFormat(event.startDate, "MMM d")} • {event.location || "TBD"}
                    </ThemedText>
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
                    <Pressable style={styles.filterBarIcon}>
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
            <FlatList
                horizontal
                data={featuredEvents}
                renderItem={renderFeaturedCard}
                keyExtractor={(item) => `featured-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.featuredList}
                snapToInterval={width * 0.75 + Spacing.md}
                decelerationRate="fast"
            />

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
                        <ThemedText style={styles.categoryIcon}>{cat.icon}</ThemedText>
                        <ThemedText style={[
                            styles.categoryText,
                            selectedCategory === cat.name && styles.categoryTextActive
                        ]}>{cat.name}</ThemedText>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    ), [user, greeting, searchQuery, featuredEvents, selectedCategory, navigation, renderFeaturedCard]);

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
                    <View style={styles.emptyState}>
                        {isLoading ? (
                            <ActivityIndicator size="large" color="#7C3AED" />
                        ) : (
                            <>
                                <Image
                                    source={require("../../assets/images/icon.png")}
                                    style={styles.emptyImage}
                                    contentFit="contain"
                                />
                                <ThemedText style={styles.emptyTitle}>No Events Found</ThemedText>
                                <ThemedText style={styles.emptySub}>Try searching for something else</ThemedText>
                            </>
                        )}
                    </View>
                }
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827", // Dark theme like screenshot
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
        gap: Spacing.md,
    },
    featuredCard: {
        width: width * 0.75,
        backgroundColor: "#1F2937",
        borderRadius: 32,
        overflow: "hidden",
        ...Shadows.lg,
    },
    featuredImageContainer: {
        width: "100%",
        height: 200,
    },
    featuredImage: {
        width: "100%",
        height: "100%",
    },
    featuredTypeBadge: {
        position: "absolute",
        top: 16,
        left: 16,
        backgroundColor: "rgba(124, 58, 237, 0.8)",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    featuredTypeText: {
        color: "#FFF",
        fontSize: 10,
        fontWeight: "bold",
    },
    featuredContent: {
        padding: 20,
        gap: 6,
    },
    featuredTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#FFF",
    },
    featuredDate: {
        fontSize: 13,
        color: "#7C3AED",
        fontWeight: "600",
    },
    featuredFooter: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginTop: 8,
    },
    featuredLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        flex: 1,
    },
    featuredLocationText: {
        fontSize: 13,
        color: "#9CA3AF",
    },
    favButton: {
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
        borderWidth: 1.5,
        borderColor: "#7C3AED",
        gap: 8,
    },
    categoryChipActive: {
        backgroundColor: "#7C3AED",
        borderColor: "#7C3AED",
    },
    categoryIcon: {
        fontSize: 16,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "700",
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
    secondaryImage: {
        width: "100%",
        height: 150,
    },
    secondaryContent: {
        padding: 12,
        gap: 4,
    },
    secondaryTitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#FFF",
    },
    secondaryDetail: {
        fontSize: 12,
        color: "#9CA3AF",
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
    locationSkeleton: {
        width: 140,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 8,
        marginTop: 4,
    },
});
