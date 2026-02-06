import React, { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator, Platform, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { format } from "date-fns";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInDown, FadeInRight, Layout } from "react-native-reanimated";
import { Icon } from "@/components/Icon";

const { width } = Dimensions.get("window");

export default function DiscoverEventsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const tabBarHeight = useBottomTabBarHeight();

    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");

    const { data: events = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ["/api/events/feed"],
    }) as { data: any[]; isLoading: boolean; refetch: any; isFetching: boolean };

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

    const categories = [
        { name: "All", icon: "grid" },
        { name: "Music", icon: "music" },
        { name: "Tech", icon: "cpu" },
        { name: "Concert", icon: "mic" },
        { name: "Design", icon: "layers" },
        { name: "Social", icon: "users" },
    ];

    const filteredEvents = useMemo(() => {
        return events.filter((event: any) => {
            if (!event || !event.title) return false;
            const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

            if (selectedCategory !== "All") {
                const matchesCategory = (event.description && event.description.toLowerCase().includes(selectedCategory.toLowerCase())) ||
                    event.title.toLowerCase().includes(selectedCategory.toLowerCase());
                return matchesSearch && matchesCategory;
            }
            return matchesSearch;
        });
    }, [events, searchQuery, selectedCategory]);

    const upcomingEvents = useMemo(() => events.slice(0, 5), [events]);
    const topPickEvents = useMemo(() => filteredEvents.slice(0, 10), [filteredEvents]);

    const renderUpcomingCard = ({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInRight.delay(index * 100).duration(500)}>
            <Pressable
                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                style={({ pressed }) => [
                    styles.upcomingCard,
                    { backgroundColor: theme.backgroundDefault, transform: [{ scale: pressed ? 0.96 : 1 }] },
                    Shadows.md
                ]}
            >
                <Image
                    source={{ uri: resolveImageUrl(event.coverImage) }}
                    style={styles.upcomingImage}
                    contentFit="cover"
                />
                <View style={styles.upcomingInfo}>
                    <ThemedText style={styles.upcomingDate}>{safeFormat(event.startDate, "d MMM, yyyy")}</ThemedText>
                    <ThemedText type="h4" numberOfLines={2} style={styles.upcomingTitle}>{event.title}</ThemedText>
                    <View style={styles.upcomingLocation}>
                        <Feather name="map-pin" size={12} color={theme.textSecondary} />
                        <ThemedText style={styles.upcomingLocationText} numberOfLines={1}>{event.location || "California, USA"}</ThemedText>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );

    const renderLargeCard = ({ item: event, index }: { item: any, index: number }) => (
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
                    <View>
                        <ThemedText style={styles.largeDate}>{safeFormat(event.startDate, "d MMM yyyy")}</ThemedText>
                        <ThemedText type="h3" style={styles.largeTitle}>{event.title}</ThemedText>
                    </View>
                    <View style={styles.actionIcon}>
                        <Feather name="arrow-up-right" size={24} color="#FFF" />
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );

    const ListHeader = () => (
        <View>
            {/* Header Block with Gradient */}
            <LinearGradient
                colors={["#A855F7", "#EC4899"]} // Deep Purple to Pinkish
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
                        <ThemedText style={styles.locationTitle}>California, USA</ThemedText>
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

            {/* Overlapping Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={[styles.searchInputContainer, Shadows.lg]}>
                    <Feather name="search" size={20} color={theme.textSecondary} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search events"
                        placeholderTextColor={theme.textSecondary + "90"}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    <Pressable style={styles.filterButton}>
                        <Feather name="sliders" size={18} color={theme.textSecondary} />
                    </Pressable>
                </View>
            </View>

            {/* Upcoming Events Section */}
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
                snapToInterval={width * 0.7 + Spacing.lg}
                decelerationRate="fast"
            />

            {/* Top Picks Section */}
            <View style={styles.sectionHeaderWithAction}>
                <ThemedText type="h2" style={styles.sectionTitle}>Top Picks 🔥</ThemedText>
                <Pressable>
                    <ThemedText style={styles.viewAllText}>View All</ThemedText>
                </Pressable>
            </View>

            {/* Category Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryList}
            >
                {categories.map((cat) => (
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
    );

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={topPickEvents}
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
                        {isLoading && <ActivityIndicator color={theme.primary} size="large" />}
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
        fontSize: 28,
        fontWeight: "800",
        color: "#FFF",
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
        color: "#111",
        fontWeight: "500",
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
        width: width * 0.7,
        borderRadius: 24,
        padding: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    upcomingImage: {
        width: 80,
        height: 80,
        borderRadius: 18,
    },
    upcomingInfo: {
        flex: 1,
        gap: 4,
    },
    upcomingDate: {
        fontSize: 12,
        color: "#9333EA",
        fontWeight: "700",
    },
    upcomingTitle: {
        fontSize: 16,
        fontWeight: "700",
        lineHeight: 20,
    },
    upcomingLocation: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    upcomingLocationText: {
        fontSize: 12,
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
        fontSize: 24,
        fontWeight: "800",
        maxWidth: "80%",
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

