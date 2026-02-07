import React, { useState, useMemo } from "react";
import { StyleSheet, View, FlatList, Pressable, ScrollView, Dimensions, Modal, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Image } from "expo-image";
import Animated, { FadeInDown, FadeInRight, SlideInDown, SlideOutDown, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Shadows, BorderRadius } from "@/constants/theme";

const { width, height } = Dimensions.get("window");

const CATEGORIES = [
    { name: "All", icon: "checkmark-circle" },
    { name: "Music", icon: "musical-notes" },
    { name: "Art", icon: "color-palette" },
    { name: "Workshop", icon: "briefcase" },
];

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

export default function FavoritesScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const [selectedCategory, setSelectedCategory] = useState("All");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [removingItem, setRemovingItem] = useState<any>(null);

    const { data: favorites, isLoading, error } = useQuery<any[]>({
        queryKey: ["/api/favorites"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/favorites");
            return res.json();
        },
        enabled: !!user,
    });

    const removeMutation = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/favorites/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
            setRemovingItem(null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
    });

    const renderHeader = () => (
        <View style={styles.header}>
            <View style={styles.headerTop}>
                <View style={styles.headerLeft}>
                    <View style={styles.logoContainer}>
                        <LinearGradient
                            colors={["#7C3AED", "#6D28D9"]}
                            style={styles.logoGradient}
                        >
                            <ThemedText style={styles.logoText}>e</ThemedText>
                        </LinearGradient>
                    </View>
                    <ThemedText style={styles.headerTitle}>Favorites</ThemedText>
                </View>
                <View style={styles.headerRight}>
                    <Pressable style={styles.iconBtn}>
                        <Ionicons name="search-outline" size={22} color="#FFF" />
                    </Pressable>
                    <Pressable style={[styles.iconBtn, { marginLeft: 12 }]}>
                        <Ionicons name="options-outline" size={22} color="#FFF" />
                    </Pressable>
                </View>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
                {CATEGORIES.map(cat => (
                    <Pressable
                        key={cat.name}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setSelectedCategory(cat.name);
                        }}
                        style={[
                            styles.categoryChip,
                            selectedCategory === cat.name && styles.categoryChipActive
                        ]}
                    >
                        {selectedCategory === cat.name && <Ionicons name="checkmark-circle" size={16} color="#FFF" style={{ marginRight: 4 }} />}
                        {!(selectedCategory === cat.name) && <Ionicons name={cat.icon as any} size={16} color="#9CA3AF" style={{ marginRight: 4 }} />}
                        <ThemedText style={[
                            styles.categoryText,
                            selectedCategory === cat.name && styles.categoryTextActive
                        ]}>{cat.name}</ThemedText>
                    </Pressable>
                ))}
            </ScrollView>

            <View style={styles.resultsHeader}>
                <ThemedText style={styles.resultsCount}>{filteredFavorites.length} favorites</ThemedText>
                <View style={styles.viewToggle}>
                    <Pressable onPress={() => setViewMode("list")}>
                        <Ionicons name="list" size={22} color={viewMode === "list" ? "#7C3AED" : "#374151"} />
                    </Pressable>
                    <Pressable onPress={() => setViewMode("grid")} style={{ marginLeft: 16 }}>
                        <Ionicons name="grid" size={22} color={viewMode === "grid" ? "#7C3AED" : "#374151"} />
                    </Pressable>
                </View>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingWrapper}>
                <ActivityIndicator size="large" color="#7C3AED" />
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.emptyState}>
                <Ionicons name="alert-circle-outline" size={80} color="#EF4444" />
                <ThemedText style={styles.emptyTitle}>Error Loading Favorites</ThemedText>
                <ThemedText style={styles.emptySub}>{(error as Error).message || "Could not fetch your favorites."}</ThemedText>
                <Pressable
                    style={[styles.confirmBtn, { marginTop: 20, width: 200 }]}
                    onPress={() => queryClient.invalidateQueries({ queryKey: ["/api/favorites"] })}
                >
                    <ThemedText style={styles.confirmBtnText}>Try Again</ThemedText>
                </Pressable>
            </View>
        );
    }

    const filteredFavorites = useMemo(() => {
        if (!favorites || !Array.isArray(favorites)) return [];
        return favorites.filter(f => {
            if (!f.event) return false;
            if (selectedCategory === "All") return true;
            return f.event.category === selectedCategory;
        });
    }, [favorites, selectedCategory]);


    return (
        <ThemedView style={styles.container}>
            <FlatList
                key={viewMode}
                data={filteredFavorites}
                keyExtractor={(item) => item.id}
                numColumns={viewMode === "grid" ? 2 : 1}
                ListHeaderComponent={renderHeader}
                contentContainerStyle={{ paddingTop: insets.top + 20, paddingBottom: 100 }}
                renderItem={({ item, index }) => {
                    if (!item.event) return null;
                    return (
                        <Animated.View
                            entering={FadeInDown.delay(index * 50)}
                            style={viewMode === "grid" ? styles.gridItemWrapper : styles.listItemWrapper}
                        >
                            <Pressable
                                style={viewMode === "grid" ? styles.gridCard : styles.listCard}
                                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: item.eventId })}
                            >
                                <Image
                                    source={{ uri: resolveImageUrl(item.event.coverImage) }}
                                    style={viewMode === "grid" ? styles.gridImage : styles.listImage}
                                />
                                {(!item.event.price || item.event.price === "0") && (
                                    <View style={styles.freeBadge}>
                                        <ThemedText style={styles.freeText}>FREE</ThemedText>
                                    </View>
                                )}
                                <View style={viewMode === "grid" ? styles.gridInfo : styles.listInfo}>
                                    <ThemedText style={styles.eventTitle} numberOfLines={1}>{item.event.title}</ThemedText>
                                    <ThemedText style={styles.eventDate}>
                                        {safeFormat(item.event.startDate, "EEE, MMM d · hh:mm a")}
                                    </ThemedText>
                                    <View style={styles.locationContainer}>
                                        <Ionicons name="location" size={12} color="#7C3AED" />
                                        <ThemedText style={styles.locationText} numberOfLines={1}>
                                            {item.event.location || "Online"}
                                        </ThemedText>
                                    </View>
                                </View>
                                <Pressable
                                    style={styles.heartBtn}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        setRemovingItem(item);
                                    }}
                                >
                                    <Ionicons name="heart" size={20} color="#7C3AED" />
                                </Pressable>
                            </Pressable>
                        </Animated.View>
                    );
                }}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="heart-outline" size={80} color="#374151" />
                        <ThemedText style={styles.emptyTitle}>Nothing here yet</ThemedText>
                        <ThemedText style={styles.emptySub}>Start searching for events now to build your favorites list.</ThemedText>
                    </View>
                }
            />

            {/* Remove Confirmation Modal */}
            <Modal transparent visible={!!removingItem} animationType="fade">
                <View style={styles.modalOverlay}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setRemovingItem(null)} />
                    <Animated.View entering={SlideInDown} exiting={SlideOutDown} style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <ThemedText style={styles.modalTitle}>Remove from Favorites?</ThemedText>

                        {removingItem && (
                            <View style={styles.previewCard}>
                                <Image
                                    source={{ uri: resolveImageUrl(removingItem.event.coverImage) }}
                                    style={styles.previewImage}
                                />
                                <View style={styles.previewInfo}>
                                    <ThemedText style={styles.previewTitle}>{removingItem.event.title}</ThemedText>
                                    <ThemedText style={styles.previewDate}>
                                        {safeFormat(removingItem.event.startDate, "EEE, MMM d · hh:mm a")}
                                    </ThemedText>
                                    <View style={styles.locationContainer}>
                                        <Ionicons name="location" size={12} color="#7C3AED" />
                                        <ThemedText style={styles.locationText}>{removingItem.event.location}</ThemedText>
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.modalButtons}>
                            <Pressable style={styles.cancelBtn} onPress={() => setRemovingItem(null)}>
                                <ThemedText style={styles.cancelBtnText}>Cancel</ThemedText>
                            </Pressable>
                            <Pressable
                                style={styles.confirmBtn}
                                onPress={() => removeMutation.mutate(removingItem.eventId)}
                            >
                                <ThemedText style={styles.confirmBtnText}>Yes, Remove</ThemedText>
                            </Pressable>
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    loadingWrapper: { flex: 1, justifyContent: "center", alignItems: "center" },
    header: { paddingHorizontal: 20 },
    headerTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
    headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
    logoContainer: { width: 36, height: 36, borderRadius: 10, overflow: "hidden" },
    logoGradient: { flex: 1, justifyContent: "center", alignItems: "center" },
    logoText: { color: "#FFF", fontSize: 20, fontWeight: "900", fontStyle: "italic" },
    headerTitle: { fontSize: 24, fontWeight: "900", color: "#FFF" },
    headerRight: { flexDirection: "row", alignItems: "center" },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    categoryScroll: { gap: 8, marginBottom: 20 },
    categoryChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", backgroundColor: "rgba(255,255,255,0.02)" },
    categoryChipActive: { backgroundColor: "#7C3AED", borderColor: "#7C3AED" },
    categoryText: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
    categoryTextActive: { color: "#FFF" },
    resultsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
    resultsCount: { fontSize: 16, fontWeight: "800", color: "#FFF" },
    viewToggle: { flexDirection: "row", alignItems: "center" },
    gridItemWrapper: { width: (width - 60) / 2, marginLeft: 20, marginBottom: 20 },
    listItemWrapper: { paddingHorizontal: 20, marginBottom: 16 },
    gridCard: { backgroundColor: "#1F2937", borderRadius: 24, overflow: "hidden", ...Shadows.md },
    listCard: { backgroundColor: "#1F2937", borderRadius: 24, overflow: "hidden", flexDirection: "row", padding: 12, alignItems: "center", ...Shadows.md },
    gridImage: { width: "100%", height: 160 },
    listImage: { width: 100, height: 100, borderRadius: 20 },
    freeBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(124, 58, 237, 0.9)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    freeText: { color: "#FFF", fontSize: 10, fontWeight: "900" },
    gridInfo: { padding: 12, gap: 4 },
    listInfo: { flex: 1, marginLeft: 16, gap: 4 },
    eventTitle: { fontSize: 16, fontWeight: "800", color: "#FFF" },
    eventDate: { fontSize: 12, color: "#7C3AED", fontWeight: "700" },
    locationContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
    locationText: { fontSize: 12, color: "#9CA3AF", fontWeight: "500", flex: 1 },
    heartBtn: { position: "absolute", bottom: 12, right: 12 },
    emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 100, paddingHorizontal: 40 },
    emptyTitle: { fontSize: 20, fontWeight: "900", color: "#FFF", marginTop: 20 },
    emptySub: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 8, lineHeight: 20 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
    modalContent: { backgroundColor: "#1F2937", borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
    modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.1)", alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: "900", color: "#FFF", textAlign: "center", marginBottom: 24 },
    previewCard: { backgroundColor: "#111827", borderRadius: 24, padding: 12, flexDirection: "row", alignItems: "center", marginBottom: 32 },
    previewImage: { width: 80, height: 80, borderRadius: 16 },
    previewInfo: { flex: 1, marginLeft: 16, gap: 4 },
    previewTitle: { fontSize: 15, fontWeight: "800", color: "#FFF" },
    previewDate: { fontSize: 12, color: "#7C3AED", fontWeight: "700" },
    modalButtons: { flexDirection: "row", gap: 12 },
    cancelBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: "rgba(255,255,255,0.05)", justifyContent: "center", alignItems: "center" },
    cancelBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
    confirmBtn: { flex: 1, height: 56, borderRadius: 28, backgroundColor: "#4F46E5", justifyContent: "center", alignItems: "center" },
    confirmBtnText: { color: "#FFF", fontSize: 16, fontWeight: "800" },
});
