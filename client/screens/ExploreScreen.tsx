import React, { useState } from "react";
import { format } from "date-fns";
import { StyleSheet, View, FlatList, TextInput, Pressable, ScrollView, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Spacing, Shadows } from "@/constants/theme";
import { Image } from "expo-image";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useQuery } from "@tanstack/react-query";
import { resolveImageUrl } from "@/lib/query-client";
import Animated, { FadeInRight } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

const MAP_STYLE = [
    { "elementType": "geometry", "stylers": [{ "color": "#242f3e" }] },
    { "elementType": "labels.text.fill", "stylers": [{ "color": "#746855" }] },
    { "elementType": "labels.text.stroke", "stylers": [{ "color": "#242f3e" }] },
    { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#d59563" }] },
    { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#38414e" }] },
    { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#212a37" }] },
    { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#9ca5b3" }] },
    { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#17263c" }] },
];

export default function ExploreScreen({ navigation }: any) {
    const insets = useSafeAreaInsets();
    const [searchQuery, setSearchQuery] = useState("");

    const { data: events = [] } = useQuery({
        queryKey: ["/api/events/feed"],
    }) as { data: any[] };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.mapContainer}>
                <MapView
                    provider={PROVIDER_GOOGLE}
                    style={styles.map}
                    customMapStyle={MAP_STYLE}
                    initialRegion={{
                        latitude: 40.7128,
                        longitude: -74.0060,
                        latitudeDelta: 0.1,
                        longitudeDelta: 0.1,
                    }}
                >
                    {events.map((event) => (
                        <Marker
                            key={event.id}
                            coordinate={{
                                latitude: event.latitude || 40.7128 + (Math.random() - 0.5) * 0.1,
                                longitude: event.longitude || -74.0060 + (Math.random() - 0.5) * 0.1,
                            }}
                            title={event.title}
                            onCalloutPress={() => navigation.navigate("ParticipantEventDetail", { eventId: event.id })}
                        >
                            <View style={styles.markerCircle}>
                                <Feather name="map-pin" size={12} color="#FFF" />
                            </View>
                        </Marker>
                    ))}
                </MapView>

                <View style={[styles.headerOverlay, { top: insets.top + 10 }]}>
                    <View style={styles.searchBar}>
                        <Feather name="search" size={20} color="#9CA3AF" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Explore events..."
                            placeholderTextColor="#9CA3AF"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        <MaterialCommunityIcons name="filter-variant" size={20} color="#7C3AED" />
                    </View>
                </View>
            </View>

            <View style={styles.bottomSection}>
                <ThemedText style={styles.bottomTitle}>Popular Nearby</ThemedText>
                <FlatList
                    horizontal
                    data={events.slice(0, 5)}
                    renderItem={({ item, index }) => (
                        <Animated.View entering={FadeInRight.delay(index * 100)}>
                            <Pressable
                                style={styles.eventCard}
                                onPress={() => navigation.navigate("ParticipantEventDetail", { eventId: item.id })}
                            >
                                <Image source={{ uri: resolveImageUrl(item.coverImage) }} style={styles.eventImage} />
                                <View style={styles.eventInfo}>
                                    <ThemedText style={styles.eventTitle} numberOfLines={1}>{item.title}</ThemedText>
                                    <View style={styles.eventMeta}>
                                        <Feather name="calendar" size={10} color="#7C3AED" />
                                        <ThemedText style={styles.eventMetaText}>
                                            {format(new Date(item.startDate), "MMM d")}
                                        </ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        </Animated.View>
                    )}
                    keyExtractor={(item) => item.id}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.eventList}
                />
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    mapContainer: { flex: 1 },
    map: { width: "100%", height: "100%" },
    markerCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#7C3AED", justifyContent: "center", alignItems: "center", borderWidth: 3, borderColor: "#FFF", ...Shadows.md },
    headerOverlay: { position: "absolute", left: 20, right: 20, zIndex: 100 },
    searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#1F2937", height: 54, borderRadius: 27, paddingHorizontal: 20, ...Shadows.lg, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
    searchInput: { flex: 1, color: "#FFF", fontSize: 15, marginLeft: 12, fontWeight: "600" },
    bottomSection: { position: "absolute", bottom: 0, left: 0, right: 0, paddingBottom: 110, backgroundColor: "rgba(17, 24, 39, 0.9)", borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 20 },
    bottomTitle: { fontSize: 20, fontWeight: "900", color: "#FFF", paddingHorizontal: 24, marginBottom: 16, letterSpacing: -0.5 },
    eventList: { paddingHorizontal: 24, gap: 16 },
    eventCard: { width: 160, backgroundColor: "#1F2937", borderRadius: 24, overflow: "hidden", ...Shadows.md, marginRight: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    eventImage: { width: "100%", height: 110 },
    eventInfo: { padding: 12, gap: 4 },
    eventTitle: { fontSize: 15, fontWeight: "800", color: "#FFF" },
    eventMeta: { flexDirection: "row", alignItems: "center", gap: 6 },
    eventMetaText: { fontSize: 12, color: "#9CA3AF", fontWeight: "600" },
});
