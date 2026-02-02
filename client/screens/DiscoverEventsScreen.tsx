import React, { useState } from "react";
import { StyleSheet, View, FlatList, Image, Pressable, ScrollView, TextInput, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { format } from "date-fns";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export default function DiscoverEventsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const tabBarHeight = useBottomTabBarHeight();

    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");

    const { data: events = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ["/api/events/feed"],
        staleTime: 0, // Always fetch fresh data on focus
    }) as { data: any[]; isLoading: boolean; refetch: any; isFetching: boolean };

    useFocusEffect(
        React.useCallback(() => {
            refetch();
        }, [refetch])
    );

    const categories = ["All", "Tech", "Design", "Music", "Business", "Social"];

    const filteredEvents = events.filter((event: any) => {
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));
        // Mock category filtering since we don't have categories in DB yet
        return matchesSearch;
    });

    const renderEventCard = ({ item: event }: { item: any }) => (
        <Pressable
            onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
            style={({ pressed }) => [
                styles.card,
                {
                    backgroundColor: theme.backgroundDefault,
                    transform: [{ scale: pressed ? 0.98 : 1 }]
                },
                Shadows.md
            ]}
        >
            {/* Event Image Placeholder with Gradient */}
            <View style={styles.cardImageContainer}>
                {event.coverImage ? (
                    <Image
                        source={{ uri: event.coverImage }}
                        style={styles.cardImage}
                        resizeMode="cover"
                    />
                ) : (
                    <LinearGradient
                        colors={['#4c669f', '#3b5998', '#192f6a']}
                        style={styles.cardImage}
                    >
                        <Feather name="calendar" size={40} color="rgba(255,255,255,0.5)" />
                    </LinearGradient>
                )}

                <View style={styles.dateBadge}>
                    <ThemedText style={styles.dateMonth}>{format(new Date(event.startDate), "MMM")}</ThemedText>
                    <ThemedText style={styles.dateDay}>{format(new Date(event.startDate), "d")}</ThemedText>
                </View>
            </View>

            <View style={styles.cardContent}>
                <ThemedText type="h3" style={styles.cardTitle}>{event.title}</ThemedText>

                <View style={styles.metaRow}>
                    <Feather name="map-pin" size={14} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {event.location || "Online Event"}
                    </ThemedText>
                </View>

                <View style={styles.metaRow}>
                    <Feather name="clock" size={14} color={theme.textSecondary} />
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        {format(new Date(event.startDate), "h:mm a")}
                    </ThemedText>
                </View>

                {/* Tags / Host info placeholder */}
                <View style={styles.tagsContainer}>
                    <View style={[styles.tag, { backgroundColor: theme.backgroundSecondary }]}>
                        <ThemedText type="small" style={{ fontSize: 10, color: theme.textSecondary }}>
                            #Event
                        </ThemedText>
                    </View>
                </View>
            </View>
        </Pressable>
    );

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <ThemedText type="h1">Discover</ThemedText>
                <Pressable
                    style={({ pressed }) => [
                        styles.notificationButton,
                        { backgroundColor: theme.backgroundSecondary, opacity: pressed ? 0.7 : 1 }
                    ]}
                    onPress={() => navigation.navigate("Notifications")}
                >
                    <Feather name="bell" size={20} color={theme.text} />
                </Pressable>
            </View>

            {/* Search Bar - Inline for now */}
            <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="search" size={18} color={theme.textSecondary} style={{ marginLeft: 12 }} />
                <TextInput
                    placeholder="Search events..."
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.searchInput, { color: theme.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* Categories */}
            <View>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((cat) => (
                        <Pressable
                            key={cat}
                            onPress={() => {
                                setActiveCategory(cat);
                                Haptics.selectionAsync();
                            }}
                            style={[
                                styles.categoryChip,
                                activeCategory === cat
                                    ? { backgroundColor: theme.primary }
                                    : { backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border }
                            ]}
                        >
                            <ThemedText
                                style={[
                                    styles.categoryText,
                                    activeCategory === cat ? { color: '#fff' } : { color: theme.text }
                                ]}
                            >
                                {cat}
                            </ThemedText>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Events List */}
            {isLoading && !isFetching && (
                <View style={[styles.emptyContainer, { flex: 1 }]}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            )}

            <FlatList
                data={filteredEvents}
                renderItem={renderEventCard}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[styles.listContent, { paddingBottom: tabBarHeight + Spacing.xl }]}
                showsVerticalScrollIndicator={false}
                initialNumToRender={5}
                maxToRenderPerBatch={10}
                windowSize={10}
                removeClippedSubviews={true}
                refreshing={isFetching}
                onRefresh={refetch}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {!isLoading && !isFetching && (
                            <>
                                <Feather name="calendar" size={48} color={theme.textSecondary} />
                                <ThemedText style={{ marginTop: 12, color: theme.textSecondary }}>No events found</ThemedText>
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
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },
    notificationButton: {
        padding: 10,
        borderRadius: BorderRadius.full,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        marginHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
        borderRadius: BorderRadius.lg,
        flexDirection: "row",
        alignItems: "center",
        height: 44,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 12,
        fontFamily: 'Inter-Regular', // Assuming Inter font is available or fallback
    },
    categoriesContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: BorderRadius.full,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "600",
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: 100, // Space for bottom tab
        gap: Spacing.lg,
    },
    card: {
        borderRadius: BorderRadius.xl,
        overflow: "hidden",
    },
    cardImageContainer: {
        height: 180,
        width: '100%',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: 180,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: BorderRadius.md,
        padding: 8,
        alignItems: 'center',
        minWidth: 50,
    },
    dateMonth: {
        fontSize: 12,
        fontWeight: '700',
        color: '#E74C3C',
        textTransform: 'uppercase',
    },
    dateDay: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1A1A',
    },
    cardContent: {
        padding: Spacing.md,
        gap: 6,
    },
    cardTitle: {
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    tagsContainer: {
        flexDirection: 'row',
        marginTop: 8,
        gap: 6,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    }
});
