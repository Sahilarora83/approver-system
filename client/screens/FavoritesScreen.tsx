import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, Shadows } from "@/constants/theme";

export default function FavoritesScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <ThemedText style={styles.title}>Favorites</ThemedText>
            </View>

            <View style={styles.emptyState}>
                <View style={styles.iconCircle}>
                    <Feather name="heart" size={48} color="#7C3AED" />
                </View>
                <ThemedText style={styles.emptyTitle}>Your Heart's Picks</ThemedText>
                <ThemedText style={styles.emptySub}>Events you favorite will appear here so you never miss out on the action.</ThemedText>

                <Pressable
                    style={styles.exploreButton}
                    onPress={() => navigation.navigate("Home")}
                >
                    <ThemedText style={styles.exploreButtonText}>Discover Events</ThemedText>
                </Pressable>
            </View>
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
    },
    emptyState: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: "rgba(124, 58, 237, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: "800",
        color: "#FFF",
        textAlign: "center",
    },
    emptySub: {
        fontSize: 15,
        color: "#9CA3AF",
        textAlign: "center",
        marginTop: 12,
        lineHeight: 22,
    },
    exploreButton: {
        marginTop: 40,
        backgroundColor: "#7C3AED",
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        ...Shadows.md,
    },
    exploreButtonText: {
        color: "#FFF",
        fontSize: 16,
        fontWeight: "700",
    },
});
