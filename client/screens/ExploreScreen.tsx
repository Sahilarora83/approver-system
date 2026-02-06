import React, { useState, useCallback, useMemo, useEffect } from "react";
import { StyleSheet, View, FlatList, TextInput, Pressable, ScrollView, Dimensions, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, FontAwesome5, Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, Shadows, BorderRadius } from "@/constants/theme";
import { Image } from "expo-image";
import { useInfiniteQuery } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInRight, FadeInUp, FadeInDown, Layout } from "react-native-reanimated";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Skeleton } from "@/components/Skeleton";

const { width } = Dimensions.get("window");

const CATEGORIES = [
    { name: "All", icon: "apps-outline" },
    { name: "Music", icon: "musical-notes-outline" },
    { name: "Art", icon: "color-palette-outline" },
    { name: "Workshop", icon: "briefcase-outline" },
    { name: "Tech", icon: "hardware-chip-outline" },
    { name: "Food", icon: "fast-food-outline" },
];

export default function ExploreScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"list" | "grid">("list");
    const [isFilterVisible, setIsFilterVisible] = useState(false);

    // Debounce search for performance
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    const fetchEvents = async ({ pageParam = 0 }) => {
        const queryParams = new URLSearchParams({
            q: debouncedQuery,
            category: selectedCategory,
            offset: pageParam.toString(),
            limit: "10",
        });
        const res = await apiRequest("GET", `/api/events/search?${queryParams.toString()}`);
        return res.json();
    };

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch
    } = useInfiniteQuery({
        queryKey: ["/api/events/search", debouncedQuery, selectedCategory],
        queryFn: fetchEvents,
        getNextPageParam: (lastPage, allPages) => {
            const totalFetched = allPages.length * 10;
            return totalFetched < lastPage.total ? totalFetched : undefined;
        },
        initialPageParam: 0,
    });

    const events = data?.pages.flatMap((page) => page.events) || [];
    const totalFound = data?.pages[0]?.total || 0;

    const renderEmptyState = () => (
        <Animated.View entering={FadeInUp} style={styles.emptyContainer}>
            <Image
                source={require("../../assets/images/icon.png")}
                style={styles.notFoundImage}
                contentFit="contain"
            />
            <ThemedText style={styles.notFoundTitle}>Not Found</ThemedText>
            <ThemedText style={styles.notFoundSub}>
                Sorry, the keyword you entered cannot be found, please check again or search with another keyword.
            </ThemedText>
        </Animated.View>
    );

    const renderSkeleton = () => (
        <View style={styles.skeletonList}>
            {[1, 2, 3, 4].map((i) => (
                <View key={i} style={viewMode === 'list' ? styles.listCardSkeleton : styles.gridCardSkeleton}>
                    <Skeleton height={viewMode === 'list' ? 120 : 180} borderRadius={24} />
                    <View style={{ padding: 12, gap: 8 }}>
                        <Skeleton width="80%" height={20} />
                        <Skeleton width="60%" height={14} />
                    </View>
                </View>
            ))}
        </View>
    );

    const renderItem = ({ item, index }: any) => {
        if (viewMode === "list") {
            return (
                <Animated.View entering={FadeInRight.delay(index % 10 * 50)} layout={Layout.springify()}>
                    <Pressable
                        style={styles.listItem}
                        onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: item.id })}
                    >
                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.listImage} />
                        <View style={styles.listContent}>
                            <ThemedText style={styles.listTitle} numberOfLines={1}>{item.title}</ThemedText>
                            <ThemedText style={styles.listDate}>
                                {format(new Date(item.startDate), "EEE, MMM d · hh:mm a")}
                            </ThemedText>
                            <View style={styles.listMeta}>
                                <Feather name="map-pin" size={12} color="#9CA3AF" />
                                <ThemedText style={styles.listLoc} numberOfLines={1}>{item.location || "TBD"}</ThemedText>
                                <Pressable style={styles.favoriteBtn}>
                                    <MaterialCommunityIcons name="heart-outline" size={18} color="#7C3AED" />
                                </Pressable>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>
            );
        } else {
            return (
                <Animated.View
                    entering={FadeInDown.delay(index % 10 * 50)}
                    layout={Layout.springify()}
                    style={styles.gridItemWrapper}
                >
                    <Pressable
                        style={styles.gridItem}
                        onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: item.id })}
                    >
                        <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.gridImage} />
                        <View style={styles.gridContent}>
                            <ThemedText style={styles.gridTitle} numberOfLines={1}>{item.title}</ThemedText>
                            <ThemedText style={styles.gridDate}>
                                {format(new Date(item.startDate), "MMM d, yyyy")}
                            </ThemedText>
                            <View style={styles.gridMeta}>
                                <Feather name="map-pin" size={10} color="#9CA3AF" />
                                <ThemedText style={styles.gridLoc} numberOfLines={1}>{item.location || "TBD"}</ThemedText>
                            </View>
                        </View>
                    </Pressable>
                </Animated.View>
            );
        }
    };

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <View style={styles.searchContainer}>
                    <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Feather name="arrow-left" size={24} color="#FFF" />
                    </Pressable>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Music, Art, Workshop..."
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus={false}
                        />
                        <Pressable onPress={() => setIsFilterVisible(true)}>
                            <MaterialCommunityIcons name="tune-variant" size={20} color="#7C3AED" />
                        </Pressable>
                    </View>
                </View>

                {/* Categories */}
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
                                selectedCategory === cat.name && styles.categoryChipActive
                            ]}
                        >
                            <Ionicons
                                name={cat.icon as any}
                                size={18}
                                color={selectedCategory === cat.name ? "#FFF" : "#7C3AED"}
                            />
                            <ThemedText style={[
                                styles.categoryText,
                                selectedCategory === cat.name && styles.categoryTextActive
                            ]}>{cat.name}</ThemedText>
                        </Pressable>
                    ))}
                </ScrollView>
            </View>

            {/* Results Info */}
            {!isLoading && events.length > 0 && (
                <View style={styles.resultsInfo}>
                    <ThemedText style={styles.foundCount}>{totalFound} founds</ThemedText>
                    <View style={styles.viewToggles}>
                        <Pressable onPress={() => setViewMode("list")}>
                            <MaterialCommunityIcons
                                name="format-list-bulleted"
                                size={24}
                                color={viewMode === "list" ? "#7C3AED" : "#374151"}
                            />
                        </Pressable>
                        <Pressable onPress={() => setViewMode("grid")} style={{ marginLeft: 16 }}>
                            <MaterialCommunityIcons
                                name="view-grid"
                                size={24}
                                color={viewMode === "grid" ? "#7C3AED" : "#374151"}
                            />
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Content */}
            {isLoading ? (
                renderSkeleton()
            ) : (
                <FlatList
                    data={events}
                    renderItem={renderItem}
                    key={viewMode}
                    numColumns={viewMode === "grid" ? 2 : 1}
                    columnWrapperStyle={viewMode === "grid" ? styles.gridRow : undefined}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.mainList, { paddingBottom: 120 }]}
                    ListEmptyComponent={renderEmptyState}
                    onEndReached={() => hasNextPage && fetchNextPage()}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        isFetchingNextPage ? (
                            <ActivityIndicator color="#7C3AED" style={{ marginVertical: 20 }} />
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}

            {/* Simple Filter Placeholder Modal */}
            <Modal
                visible={isFilterVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsFilterVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Filter</ThemedText>
                            <Pressable onPress={() => setIsFilterVisible(false)}>
                                <Feather name="x" size={24} color="#FFF" />
                            </Pressable>
                        </View>

                        <ThemedText style={styles.filterLabel}>Event Category</ThemedText>
                        <View style={styles.filterChipRow}>
                            {CATEGORIES.map(c => (
                                <Pressable key={c.name} style={styles.filterChip}>
                                    <ThemedText style={styles.filterChipText}>{c.name}</ThemedText>
                                </Pressable>
                            ))}
                        </View>

                        <ThemedText style={styles.filterLabel}>Ticket Price Range</ThemedText>
                        <View style={styles.rangeMock} />

                        <Pressable style={styles.applyBtn} onPress={() => setIsFilterVisible(false)}>
                            <ThemedText style={styles.applyBtnText}>Apply</ThemedText>
                        </Pressable>
                    </View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    header: { paddingHorizontal: 20, backgroundColor: "#111827", gap: 20, paddingBottom: 10 },
    searchContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
    backBtn: { padding: 4 },
    searchBar: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: "#1F2937", height: 50, borderRadius: 25, paddingHorizontal: 16, gap: 10 },
    searchInput: { flex: 1, color: "#FFF", fontSize: 16 },
    categoryList: { gap: 10, paddingRight: 20 },
    categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5, borderColor: "#7C3AED", gap: 8 },
    categoryChipActive: { backgroundColor: "#7C3AED" },
    categoryText: { fontSize: 14, fontWeight: "700", color: "#7C3AED" },
    categoryTextActive: { color: "#FFF" },
    resultsInfo: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, marginVertical: 16 },
    foundCount: { fontSize: 18, fontWeight: "900", color: "#FFF" },
    viewToggles: { flexDirection: "row", alignItems: "center" },
    mainList: { paddingHorizontal: 20 },
    listItem: { flexDirection: "row", backgroundColor: "#1F2937", borderRadius: 24, padding: 12, marginBottom: 16, ...Shadows.md },
    listImage: { width: 100, height: 100, borderRadius: 18 },
    listContent: { flex: 1, marginLeft: 16, justifyContent: "center", gap: 6 },
    listTitle: { fontSize: 17, fontWeight: "800", color: "#FFF" },
    listDate: { fontSize: 13, color: "#7C3AED", fontWeight: "700" },
    listMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
    listLoc: { flex: 1, fontSize: 12, color: "#9CA3AF" },
    favoriteBtn: { padding: 4 },
    gridRow: { justifyContent: "space-between" },
    gridItemWrapper: { width: "48%", marginBottom: 16 },
    gridItem: { backgroundColor: "#1F2937", borderRadius: 24, overflow: "hidden", ...Shadows.md },
    gridImage: { width: "100%", height: 120 },
    gridContent: { padding: 12, gap: 2 },
    gridTitle: { fontSize: 14, fontWeight: "800", color: "#FFF" },
    gridDate: { fontSize: 11, color: "#7C3AED", fontWeight: "700" },
    gridMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
    gridLoc: { fontSize: 10, color: "#9CA3AF" },
    emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, paddingHorizontal: 20 },
    notFoundImage: { width: 200, height: 200, marginBottom: 24 },
    notFoundTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", marginBottom: 12 },
    notFoundSub: { fontSize: 15, color: "#9CA3AF", textAlign: "center", lineHeight: 22 },
    skeletonList: { paddingHorizontal: 20, gap: 16 },
    listCardSkeleton: { backgroundColor: "#1F2937", borderRadius: 24, padding: 12, flexDirection: "row", gap: 16 },
    gridCardSkeleton: { width: "48%", backgroundColor: "#1F2937", borderRadius: 24 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#111827", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, gap: 20 },
    modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
    modalTitle: { fontSize: 24, fontWeight: "900", color: "#FFF" },
    filterLabel: { fontSize: 18, fontWeight: "800", color: "#FFF" },
    filterChipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#374151" },
    filterChipText: { color: "#9CA3AF", fontWeight: "600" },
    rangeMock: { height: 4, backgroundColor: "#374151", marginVertical: 10, borderRadius: 2 },
    applyBtn: { backgroundColor: "#7C3AED", height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginTop: 10 },
    applyBtnText: { color: "#FFF", fontSize: 18, fontWeight: "800" },
});
