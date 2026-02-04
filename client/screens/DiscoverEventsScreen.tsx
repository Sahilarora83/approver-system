import React, { useState, useCallback } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, TextInput, ActivityIndicator, Platform } from "react-native";
import { Image } from "expo-image";
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
import { resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInDown, FadeInUp, Layout } from "react-native-reanimated";
import { Icon } from "@/components/Icon";





export default function DiscoverEventsScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const tabBarHeight = useBottomTabBarHeight();

    const [searchQuery, setSearchQuery] = useState("");


    const { data: events = [], isLoading, refetch, isFetching } = useQuery({
        queryKey: ["/api/events/feed"],
        // Using global staleTime of 5 minutes for better performance
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

    const categories = ["All", "Tech", "Design", "Music", "Business", "Social"];
    const [selectedCategory, setSelectedCategory] = useState("All");

    const filteredEvents = events.filter((event: any) => {
        if (!event || !event.title) return false;
        const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(searchQuery.toLowerCase()));

        if (selectedCategory !== "All") {
            // Match category if description or title contains it
            const matchesCategory = (event.description && event.description.toLowerCase().includes(selectedCategory.toLowerCase())) ||
                event.title.toLowerCase().includes(selectedCategory.toLowerCase());
            return matchesSearch && matchesCategory;
        }
        return matchesSearch;
    });

    const renderEventCard = useCallback(({ item: event, index }: { item: any, index: number }) => (
        <Animated.View entering={FadeInDown.delay(index * 50).duration(400).springify()}>
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
                {/* Event Image */}
                <View style={styles.cardImageContainer}>
                    {event.coverImage ? (
                        <Image
                            source={{ uri: resolveImageUrl(event.coverImage) }}
                            style={styles.cardImage}
                            contentFit="cover"
                            transition={200}
                        />

                    ) : (
                        <LinearGradient
                            colors={[theme.primary, theme.primary + '80']}
                            style={styles.cardImage}
                        >
                            <Feather name="calendar" size={48} color="rgba(255,255,255,0.3)" />
                        </LinearGradient>
                    )}

                    <View style={[styles.dateBadge, { backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255,255,255,0.95)' }]}>
                        <ThemedText style={styles.dateMonth}>{safeFormat(event.startDate, "MMM")}</ThemedText>
                        <ThemedText style={styles.dateDay}>{safeFormat(event.startDate, "d")}</ThemedText>
                    </View>

                    {/* Badge */}
                    <View style={[styles.imageTag, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
                        <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: '800' }}>TRENDING</ThemedText>
                    </View>
                </View>

                <View style={styles.cardContent}>
                    <ThemedText type="h3" numberOfLines={1} style={styles.cardTitle}>{event.title}</ThemedText>

                    <View style={styles.metaContainer}>
                        <View style={styles.metaRow}>
                            <Icon name="map-pin" size={14} color={theme.primary} />
                            <ThemedText type="small" numberOfLines={1} style={{ color: theme.textSecondary }}>
                                {event.location || "Online Event"}
                            </ThemedText>
                        </View>

                        <View style={styles.metaRow}>
                            <Icon name="clock" size={14} color={theme.primary} />
                            <ThemedText type="small" style={{ color: theme.textSecondary }}>
                                {safeFormat(event.startDate, "h:mm a")}
                            </ThemedText>
                        </View>
                    </View>

                    <View style={styles.cardFooter}>
                        <View style={styles.attendeesContainer}>
                            <View style={[styles.attendeeCircle, { backgroundColor: theme.backgroundSecondary }]}>
                                <Feather name="users" size={12} color={theme.textSecondary} />
                            </View>
                            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 6 }}>
                                {event.registrationCount || 0} joining
                            </ThemedText>
                        </View>

                        <View style={[styles.priceTag, { backgroundColor: theme.primary + '15' }]}>
                            <ThemedText style={{ color: theme.primary, fontWeight: '800', fontSize: 11 }}>FREE</ThemedText>
                        </View>
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    ), [theme, isDark, navigation]);


    return (
        <ThemedView style={styles.container}>
            <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
                <View>
                    <ThemedText type="h1">Discover</ThemedText>
                    <ThemedText style={{ color: theme.textSecondary, opacity: 0.6, fontSize: 13 }}>
                        Find amazing events locally
                    </ThemedText>
                </View>
                <Pressable
                    onPress={() => navigation.navigate("Notifications")}
                    style={({ pressed }) => [
                        styles.notificationButton,
                        {
                            backgroundColor: theme.backgroundSecondary,
                            opacity: pressed ? 0.7 : 1
                        }
                    ]}
                >
                    <Feather name="bell" size={20} color={theme.text} />
                    <View style={[styles.notifBadge, { backgroundColor: theme.primary, borderColor: theme.backgroundRoot }]} />
                </Pressable>
            </View>

            {/* Search Bar */}
            <View style={styles.searchWrapper}>
                <View style={[styles.searchContainer, { backgroundColor: theme.backgroundSecondary }]}>
                    <Feather name="search" size={20} color={theme.textSecondary} style={{ marginLeft: 16 }} />
                    <TextInput
                        style={[styles.searchInput, { color: theme.text }]}
                        placeholder="Search for events..."
                        placeholderTextColor={theme.textSecondary + '70'}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <Pressable onPress={() => setSearchQuery("")} style={{ marginRight: 16 }}>
                            <Feather name="x" size={18} color={theme.textSecondary} />
                        </Pressable>
                    )}
                </View>
            </View>

            {/* Categories */}
            <View style={{ height: 60 }}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesContainer}
                >
                    {categories.map((category) => {
                        const isSelected = selectedCategory === category;
                        return (
                            <Pressable
                                key={category}
                                onPress={() => {
                                    setSelectedCategory(category);
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }}
                                style={[
                                    styles.categoryChip,
                                    {
                                        backgroundColor: isSelected ? theme.primary : theme.backgroundSecondary,
                                        borderColor: isSelected ? theme.primary : theme.border,
                                        borderWidth: 1
                                    }
                                ]}
                            >
                                <ThemedText
                                    style={[
                                        styles.categoryText,
                                        { color: isSelected ? "#fff" : theme.textSecondary }
                                    ]}
                                >
                                    {category}
                                </ThemedText>
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>

            <Animated.FlatList
                itemLayoutAnimation={Layout.springify()}
                data={filteredEvents}
                renderItem={renderEventCard}
                keyExtractor={(item) => item?.id || Math.random().toString()}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: tabBarHeight + Spacing.xl }
                ]}
                showsVerticalScrollIndicator={false}
                windowSize={5}
                maxToRenderPerBatch={5}
                initialNumToRender={5}
                removeClippedSubviews={Platform.OS === 'android'}
                refreshing={isFetching}
                onRefresh={refetch}

                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {!isLoading && !isFetching && (
                            <>
                                <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.backgroundSecondary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    <Feather name="calendar" size={32} color={theme.textSecondary} />
                                </View>
                                <ThemedText type="h4">No Events Found</ThemedText>
                                <ThemedText style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 8 }}>
                                    Try adjusting your search or filters to find what you're looking for.
                                </ThemedText>
                            </>
                        )}
                        {isLoading && <ActivityIndicator color={theme.primary} />}
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
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    notifBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#000', // Matches background
    },
    searchWrapper: {
        paddingHorizontal: Spacing.lg,
        marginBottom: Spacing.md,
    },
    searchContainer: {
        borderRadius: BorderRadius.xl,
        flexDirection: "row",
        alignItems: "center",
        height: 50,
        ...Shadows.sm,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        paddingHorizontal: 12,
        fontSize: 15,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    },
    categoriesContainer: {
        paddingHorizontal: Spacing.lg,
        paddingBottom: Spacing.md,
        gap: Spacing.sm,
        alignItems: 'center',
    },
    categoryChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: BorderRadius.full,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: "700",
    },
    listContent: {
        paddingHorizontal: Spacing.lg,
        paddingTop: Spacing.sm,
        gap: Spacing.xl,
    },
    card: {
        borderRadius: BorderRadius["2xl"],

        overflow: "hidden",
    },
    cardImageContainer: {
        height: 200,
        width: '100%',
        position: 'relative',
    },
    cardImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageTag: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    dateBadge: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        borderRadius: BorderRadius.lg,
        padding: 8,
        alignItems: 'center',
        minWidth: 50,
        ...Shadows.md,
    },
    dateMonth: {
        fontSize: 10,
        fontWeight: '800',
        color: '#E74C3C',
        textTransform: 'uppercase',
    },
    dateDay: {
        fontSize: 20,
        fontWeight: '900',
        color: '#1A1A1A',
    },
    cardContent: {
        padding: Spacing.lg,
        gap: 12,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '800',
    },
    metaContainer: {
        gap: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 4,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.05)',
    },
    attendeesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    attendeeCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    priceTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },

});
