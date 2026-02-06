import React from "react";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image } from "expo-image";
import Animated, { FadeInRight } from "react-native-reanimated";
import { apiRequest, resolveImageUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, Shadows } from "@/constants/theme";
import { useAuth } from "@/contexts/AuthContext";
import { View, Pressable, StyleSheet, FlatList, ActivityIndicator, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const CATEGORIES = [
    { name: "All", icon: "all-inclusive" },
    { name: "Music", icon: "music" },
    { name: "Art", icon: "palette" },
    { name: "Workshop", icon: "laptop" },
];

export default function FavoritesScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = React.useState("All");

    const { data: favorites, isLoading, refetch } = useQuery<any[]>({
        queryKey: ["/api/favorites"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/favorites");
            return res.json();
        },
        enabled: !!user,
    });

    const filteredFavorites = React.useMemo(() => {
        if (!favorites) return [];
        if (selectedCategory === "All") return favorites;
        return favorites.filter(f => f.event.category === selectedCategory);
    }, [favorites, selectedCategory]);

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <ThemedText style={styles.title}>Favorites</ThemedText>
                <View style={styles.headerActions}>
                    <Pressable style={styles.iconButton}>
                        <Feather name="search" size={22} color="#FFF" />
                    </Pressable>
                    <Pressable style={[styles.iconButton, { marginLeft: 12 }]}>
                        <Feather name="sliders" size={22} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipScroll}
            >
                {CATEGORIES.map(cat => (
                    <Pressable
                        key={cat.name}
                        onPress={() => setSelectedCategory(cat.name)}
                        style={[styles.chip, selectedCategory === cat.name && styles.chipActive]}
                    >
                        <MaterialCommunityIcons
                            name={cat.icon as any}
                            size={18}
                            color={selectedCategory === cat.name ? "#FFF" : "#9CA3AF"}
                        />
                        <ThemedText style={[styles.chipText, selectedCategory === cat.name && styles.chipTextActive]}>
                            {cat.name}
                        </ThemedText>
                    </Pressable>
                ))}
            </ScrollView>

            <View style={styles.countRow}>
                <ThemedText style={styles.countText}>{filteredFavorites.length} favorites</ThemedText>
                <View style={styles.viewToggles}>
                    <MaterialCommunityIcons name="format-list-bulleted" size={20} color="#374151" />
                    <MaterialCommunityIcons name="view-grid" size={20} color="#7C3AED" style={{ marginLeft: 12 }} />
                </View>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <FlatList
                data={filteredFavorites}
                keyExtractor={(item) => item.id}
                ListHeaderComponent={renderHeader}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={[styles.listContent, { paddingTop: insets.top + 20, paddingBottom: 100 }]}
                renderItem={({ item, index }) => (
                    <Animated.View entering={FadeInRight.delay(index * 50).duration(500)} style={styles.cardContainer}>
                        <Pressable
                            style={styles.card}
                            onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: item.eventId })}
                        >
                            <View style={styles.cardImageContainer}>
                                <Image
                                    source={{ uri: resolveImageUrl(item.event.coverImage) }}
                                    style={styles.cardImage}
                                    contentFit="cover"
                                />
                                {(!item.event.price || item.event.price === "0" || item.event.price.toLowerCase() === "free") && (
                                    <View style={styles.priceBadge}>
                                        <ThemedText style={styles.priceText}>FREE</ThemedText>
                                    </View>
                                )}
                            </View>
                            <View style={styles.cardInfo}>
                                <ThemedText style={styles.cardTitle} numberOfLines={1}>{item.event.title}</ThemedText>
                                <ThemedText style={styles.cardTime}>
                                    {(() => {
                                        try {
                                            return format(new Date(item.event.startDate), "EEE, MMM d · hh:mm a");
                                        } catch { return "TBD"; }
                                    })()}
                                </ThemedText>
                                <View style={styles.locRow}>
                                    <View style={styles.locInfo}>
                                        <Feather name="map-pin" size={12} color="#7C3AED" />
                                        <ThemedText style={styles.locText} numberOfLines={1}>
                                            {item.event.location || "Online"}
                                        </ThemedText>
                                    </View>
                                    <Pressable style={styles.heartSmall}>
                                        <MaterialCommunityIcons name="heart" size={16} color="#7C3AED" />
                                    </Pressable>
                                </View>
                            </View>
                        </Pressable>
                    </Animated.View>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <View style={styles.iconCircle}>
                            <Feather name="heart" size={48} color="#7C3AED" />
                        </View>
                        <ThemedText style={styles.emptyTitle}>Your Heart's Picks</ThemedText>
                        <ThemedText style={styles.emptySub}>Events you favorite will appear here so you never miss out on the action.</ThemedText>
                        <Pressable style={styles.exploreButton} onPress={() => navigation.navigate("Explore")}>
                            <ThemedText style={styles.exploreButtonText}>Discover Events</ThemedText>
                        </Pressable>
                    </View>
                }
            />
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#111827" },
    header: { paddingHorizontal: 24, marginBottom: 20 },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
    headerActions: { flexDirection: "row", alignItems: "center" },
    title: { fontSize: 32, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
    iconButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.06)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    chipScroll: { gap: 10, marginBottom: 24 },
    chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", gap: 8 },
    chipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
    chipText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
    chipTextActive: { color: "#FFF" },
    countRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    countText: { fontSize: 18, fontWeight: "800", color: "#FFF" },
    viewToggles: { flexDirection: "row", alignItems: "center" },
    listContent: { paddingHorizontal: 18 },
    columnWrapper: { justifyContent: "space-between" },
    cardContainer: { width: "48%", marginBottom: 20 },
    card: { backgroundColor: "#1F2937", borderRadius: 24, overflow: "hidden", ...Shadows.md },
    cardImageContainer: { width: "100%", height: 140 },
    cardImage: { width: "100%", height: "100%" },
    priceBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(124, 58, 237, 0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    priceText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
    cardInfo: { padding: 12, gap: 4 },
    cardTitle: { fontSize: 15, fontWeight: "800", color: "#FFF" },
    cardTime: { fontSize: 12, color: "#7C3AED", fontWeight: "700" },
    locRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
    locInfo: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
    locText: { flex: 1, fontSize: 11, color: "#9CA3AF", fontWeight: "500" },
    heartSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(124, 58, 237, 0.1)", justifyContent: "center", alignItems: "center" },
    emptyState: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 80, paddingHorizontal: 40 },
    iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(124, 58, 237, 0.1)", justifyContent: "center", alignItems: "center", marginBottom: 24 },
    emptyTitle: { fontSize: 24, fontWeight: "900", color: "#FFF", textAlign: "center" },
    emptySub: { fontSize: 15, color: "#9CA3AF", textAlign: "center", marginTop: 12, lineHeight: 22 },
    exploreButton: { marginTop: 40, backgroundColor: "#7C3AED", paddingHorizontal: 32, paddingVertical: 16, borderRadius: 30, ...Shadows.lg },
    exploreButtonText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
