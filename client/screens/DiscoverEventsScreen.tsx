import React, { useState, useCallback, useMemo, useEffect } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as Location from 'expo-location';
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { format } from "date-fns";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInDown, FadeInRight, Layout } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const CATEGORIES = [
    { name: "All", icon: "grid" },
    { name: "Music", icon: "music" },
    { name: "Tech", icon: "cpu" },
    { name: "Concert", icon: "mic" },
    { name: "Design", icon: "layers" },
    { name: "Social", icon: "users" },
];

export default function DiscoverEventsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
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
                if (status !== 'granted') return;

                let location = await Location.getCurrentPositionAsync({});
                let geocode = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                });

                if (geocode.length > 0) {
                    const city = geocode[0].city || geocode[0].region || "Your Location";
                    const country = geocode[0].country || "";
                    setUserCity(`${city}${country ? ', ' + country : ''}`);
                }
            } catch (error) {
                console.error("Location error", error);
                setUserCity("Location unavailable");
            } finally {
                setIsLocationLoading(false);
            }
        })();
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

    const upcomingEvents = useMemo(() => events.slice(0, 8), [events]);

    const renderUpcomingCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={({ pressed }) => [
                    styles.upcomingCard,
                    { backgroundColor: theme.backgroundDefault, transform: [{ scale: pressed ? 0.96 : 1 }] },
                    Shadows.md
                ]}
            >
                <View style={styles.upcomingImageWrapper}>
                    <Image
                        source={{ uri: resolveImageUrl(event.coverImage) }}
                        style={styles.upcomingImage}
                        contentFit="cover"
                        transition={300}
                    />
                    <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.4)"]}
                        style={StyleSheet.absoluteFill}
                    />
                </View>
                <View style={styles.upcomingInfo}>
                    <ThemedText style={styles.upcomingDate}>{safeFormat(event.startDate, "d MMM")}</ThemedText>
                    <ThemedText type="h4" numberOfLines={1} style={styles.upcomingTitle}>{event.title}</ThemedText>
                    <View style={styles.upcomingLocation}>
                        <Feather name="map-pin" size={10} color={theme.textSecondary} />
                        <ThemedText style={styles.upcomingLocationText} numberOfLines={1}>
                            {event.location || "Nearby"}
                        </ThemedText>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    ), [theme, navigation]);

    const renderLargeCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 100).duration(600)}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={({ pressed }) => [
                    styles.largeCard,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] }
                ]}
            >
                <Image
                    source={{ uri: resolveImageUrl(event.coverImage) }}
                    style={styles.largeImage}
                    contentFit="cover"
                />
                <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.8)"]}
                    style={styles.largeOverlay}
                />
                <View style={styles.largeContent}>
                    <View style={{ flex: 1 }}>
                        <ThemedText style={styles.largeDate}>{safeFormat(event.startDate, "EEEE, d MMM yyyy")}</ThemedText>
                        <ThemedText type="h3" style={styles.largeTitle}>{event.title}</ThemedText>
                    </View>
                    <View style={styles.actionIcon}>
                        <Feather name="arrow-up-right" size={24} color="#FFF" />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    ), [navigation]);

    // Refactored Header to prevent re-renders on every keystroke
    const ListHeader = useMemo(() => (
        <View>
            <LinearGradient
                colors={["#A855F7", "#EC4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.headerGradient, { paddingTop: insets.top + Spacing.lg }]}
            >
                <View style={styles.headerTopRow}>
                    <View>
                        <View style={styles.locationLabelRow}>
                            <Feather name="compass" size={14} color="rgba(255,255,255,0.8)" />
                            <ThemedText style={styles.locationLabel}>Events near me</ThemedText>
                        </View>
                        {isLocationLoading ? (
                            <View style={styles.locationSkeleton} />
                        ) : (
                            <ThemedText style={styles.locationTitle}>{userCity}</ThemedText>
                        )}
                    </View>
                    <Pressable
                        onPress={() => navigation.navigate("Notifications")}
                        style={({ pressed }) => [
                            styles.notifButton,
                            { opacity: pressed ? 0.7 : 1 }
                        ]}
                    >
                        <Feather name="bell" size={22} color="#000" />
                        <View style={styles.notifBadgeCircle} />
                    </Pressable>
                </View>
            </LinearGradient>

            <View style={styles.searchWrapper}>
                <View style={[styles.searchInputContainer, Shadows.lg]}>
                    <Feather name="search" size={20} color={theme.textSecondary} />
                    <TextInput
                        style={[styles.searchInput, { color: '#111' }]}
                        placeholder="Search events"
                        placeholderTextColor="#999"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Pressable style={styles.filterButton}>
                        <Feather name="sliders" size={18} color={theme.textSecondary} />
                    </Pressable>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <ThemedText type="h2" style={styles.sectionTitle}>Upcoming Events</ThemedText>
            </View>

            <FlatList
                horizontal
                data={upcomingEvents}
                renderItem={renderUpcomingCard}
                keyExtractor={(item) => `upcoming-${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.upcomingList}
                snapToInterval={width * 0.55 + Spacing.lg}
                decelerationRate="fast"
            />

            <View style={styles.sectionHeaderWithAction}>
                <ThemedText type="h2" style={styles.sectionTitle}>Top Picks 🔥</ThemedText>
                <Pressable>
                    <ThemedText style={styles.viewAllText}>View All</ThemedText>
                </Pressable>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
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
                            {
                                backgroundColor: selectedCategory === cat.name ? "#9333EA" : theme.backgroundDefault,
                            },
                            Shadows.sm
                        ]}
                    >
                        {selectedCategory === cat.name ? (
                            <View style={styles.activeCategoryIcon}>
                                <Feather name={cat.icon as any} size={14} color="#9333EA" />
                            </View>
                        ) : (
                            <Feather name={cat.icon as any} size={16} color={theme.textSecondary} />
                        )}
                        <ThemedText
                            style={[
                                styles.categoryLabel,
                                { color: selectedCategory === cat.name ? "#FFF" : theme.textSecondary }
                            ]}
                        >
                            {cat.name}
                        </ThemedText>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    ), [userCity, insets.top, navigation, theme, searchQuery, selectedCategory, upcomingEvents, renderUpcomingCard]);

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={filteredEvents}
                renderItem={renderLargeCard}
                keyExtractor={(item) => `pick-${item.id}`}
                ListHeaderComponent={ListHeader}
                contentContainerStyle={[
                    styles.mainList,
                    { paddingBottom: tabBarHeight + 40 }
                ]}
                showsVerticalScrollIndicator={false}
                refreshing={isFetching}
                onRefresh={refetch}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {!isLoading && (
                            <>
                                <MaterialCommunityIcons name="calendar-search" size={64} color={theme.textSecondary} />
                                <ThemedText type="h3" style={{ marginTop: 16 }}>No events found</ThemedText>
                                <ThemedText style={{ color: theme.textSecondary, textAlign: 'center' }}>
                                    Try searching for something else
                                </ThemedText>
                            </>
                        )}
                        {isLoading && (
                            <View style={{ marginTop: 40 }}>
                                <ActivityIndicator color={theme.primary} size="large" />
                            </View>
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
    },
    headerGradient: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 60,
        borderBottomLeftRadius: 40,
        borderBottomRightRadius: 40,
    },
    headerTopRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    locationLabelRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
    },
    locationLabel: {
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
        fontWeight: "500",
    },
    locationTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#FFF",
        marginTop: 4,
    },
    locationSkeleton: {
        width: 140,
        height: 28,
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 8,
        marginTop: 4,
    },
    notifButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    notifBadgeCircle: {
        position: "absolute",
        top: 14,
        right: 14,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: "#FF3B30",
        borderWidth: 1.5,
        borderColor: "#FFF",
    },
    searchWrapper: {
        marginTop: -30,
        paddingHorizontal: Spacing.lg,
    },
    searchInputContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFF",
        height: 60,
        borderRadius: 30,
        paddingHorizontal: 20,
        gap: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        fontWeight: "500",
        paddingVertical: 10,
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#F3F4F6",
        justifyContent: "center",
        alignItems: "center",
    },
    sectionHeader: {
        paddingHorizontal: Spacing.lg,
        marginTop: 32,
        marginBottom: 16,
    },
    sectionHeaderWithAction: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: Spacing.lg,
        marginTop: 32,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "800",
    },
    viewAllText: {
        color: "#6B7280",
        fontSize: 14,
        fontWeight: "600",
        textDecorationLine: "underline",
    },
    upcomingList: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 10,
        gap: Spacing.lg,
    },
    upcomingCard: {
        width: width * 0.55,
        borderRadius: 20,
        overflow: 'hidden',
        padding: 8,
        gap: 8,
    },
    upcomingImageWrapper: {
        width: '100%',
        height: 120,
        borderRadius: 16,
        overflow: 'hidden',
    },
    upcomingImage: {
        width: '100%',
        height: '100%',
    },
    upcomingInfo: {
        paddingHorizontal: 4,
        gap: 2,
    },
    upcomingDate: {
        fontSize: 12,
        color: "#9333EA",
        fontWeight: "700",
        textTransform: 'uppercase',
    },
    upcomingTitle: {
        fontSize: 15,
        fontWeight: "700",
        lineHeight: 18,
    },
    upcomingLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    upcomingLocationText: {
        fontSize: 11,
        color: "#6B7280",
    },
    categoryList: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 20,
        gap: 12,
    },
    categoryChip: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    activeCategoryIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: "#FFF",
        justifyContent: "center",
        alignItems: "center",
    },
    categoryLabel: {
        fontSize: 14,
        fontWeight: "700",
    },
    mainList: {
        paddingBottom: 20,
    },
    largeCard: {
        marginHorizontal: Spacing.lg,
        height: 240,
        borderRadius: 32,
        overflow: "hidden",
        marginBottom: 20,
        ...Shadows.lg,
    },
    largeImage: {
        width: "100%",
        height: "100%",
    },
    largeOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    largeContent: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-end",
    },
    largeDate: {
        color: "rgba(255,255,255,0.8)",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    largeTitle: {
        color: "#FFF",
        fontSize: 22,
        fontWeight: "800",
    },
    actionIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
});


