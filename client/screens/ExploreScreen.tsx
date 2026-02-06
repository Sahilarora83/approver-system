import React, { useState } from "react";
import { StyleSheet, View, FlatList, TextInput, Pressable, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, Shadows } from "@/constants/theme";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const CATEGORIES = [
    { id: "1", name: "Music", icon: "music", color: "#8B5CF6", image: "https://images.unsplash.com/photo-1514525253344-0329a3e680a6?w=400" },
    { id: "2", name: "Food", icon: "food-apple", color: "#EF4444", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
    { id: "3", name: "Tech", icon: "laptop", color: "#3B82F6", image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400" },
    { id: "4", name: "Art", icon: "palette", color: "#EC4899", image: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400" },
    { id: "5", name: "Sports", icon: "basketball", color: "#F59E0B", image: "https://images.unsplash.com/photo-1461896792713-35623b517861?w=400" },
    { id: "6", name: "Nightlife", icon: "glass-cocktail", color: "#10B981", image: "https://images.unsplash.com/photo-1514525253344-0329a3e680a6?w=400" },
];

const COLLECTIONS = [
    { id: "1", name: "Weekend Vibes", count: "12 Events", image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=400" },
    { id: "2", name: "Coding Bootcamps", count: "8 Events", image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400" },
];

export default function ExploreScreen() {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState("");

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ThemedText style={styles.title}>Explore</ThemedText>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color="#6B7280" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Find your next experience..."
                            placeholderTextColor="#6B7280"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <MaterialCommunityIcons name="tune-variant" size={20} color="#7C3AED" />
                    </View>
                </View>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Categories</ThemedText>
                    <View style={styles.categoryGrid}>
                        {CATEGORIES.map((cat) => (
                            <Pressable key={cat.id} style={styles.categoryCard}>
                                <Image source={{ uri: cat.image }} style={styles.categoryImage} />
                                <View style={styles.categoryOverlay}>
                                    <MaterialCommunityIcons name={cat.icon as any} size={24} color="#FFF" />
                                    <ThemedText style={styles.categoryName}>{cat.name}</ThemedText>
                                </View>
                            </Pressable>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <ThemedText style={styles.sectionTitle}>Popular Collections</ThemedText>
                    {COLLECTIONS.map((col) => (
                        <Pressable key={col.id} style={styles.collectionCard}>
                            <Image source={{ uri: col.image }} style={styles.collectionImage} />
                            <View style={styles.collectionInfo}>
                                <ThemedText style={styles.collectionTitle}>{col.name}</ThemedText>
                                <ThemedText style={styles.collectionCount}>{col.count}</ThemedText>
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827",
    },
    header: {
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
    },
    title: {
        fontSize: 32,
        fontWeight: "900",
        color: "#FFF",
        marginBottom: 20,
    },
    searchBar: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#1F2937",
        height: 56,
        borderRadius: 28,
        paddingHorizontal: 20,
        gap: 12,
        ...Shadows.md,
    },
    searchInput: {
        flex: 1,
        color: "#FFF",
        fontSize: 16,
        fontWeight: "500",
    },
    section: {
        marginTop: 32,
        paddingHorizontal: Spacing.lg,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFF",
        marginBottom: 16,
    },
    categoryGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 12,
    },
    categoryCard: {
        width: (width - 24 - 40) / 2,
        height: 100,
        borderRadius: 20,
        overflow: "hidden",
    },
    categoryImage: {
        width: "100%",
        height: "100%",
    },
    categoryOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "center",
        alignItems: "center",
        gap: 4,
    },
    categoryName: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "700",
    },
    collectionCard: {
        height: 160,
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 16,
        ...Shadows.lg,
    },
    collectionImage: {
        width: "100%",
        height: "100%",
    },
    collectionInfo: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: "rgba(0,0,0,0.5)",
    },
    collectionTitle: {
        color: "#FFF",
        fontSize: 22,
        fontWeight: "800",
    },
    collectionCount: {
        color: "#D1D5DB",
        fontSize: 14,
        marginTop: 4,
    },
});
