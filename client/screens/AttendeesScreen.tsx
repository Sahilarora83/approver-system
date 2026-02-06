import React, { useLayoutEffect, useState, useMemo } from "react";
import { StyleSheet, View, FlatList, Pressable, ActivityIndicator, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, Shadows, BorderRadius } from "@/constants/theme";
import Animated, { FadeInRight } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AttendeesScreen({ route, navigation }: any) {
    const { eventId, count = 0 } = route.params;
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const { data: attendees = [], isLoading } = useQuery({
        queryKey: [`/api/events/${eventId}/attendees`],
        queryFn: async () => {
            const res = await apiRequest("GET", `/api/events/${eventId}/attendees`);
            return res.json();
        }
    });

    const followMutation = useMutation({
        mutationFn: async ({ userId, isFollowing }: { userId: string, isFollowing: boolean }) => {
            const method = isFollowing ? "DELETE" : "POST";
            await apiRequest(method, `/api/users/${userId}/follow`);
        },
        onMutate: async ({ userId }) => {
            await queryClient.cancelQueries({ queryKey: [`/api/events/${eventId}/attendees`] });
            const previousAttendees = queryClient.getQueryData([`/api/events/${eventId}/attendees`]);

            queryClient.setQueryData([`/api/events/${eventId}/attendees`], (old: any) => {
                return old.map((a: any) => {
                    if (a.id === userId) {
                        return { ...a, isFollowing: !a.isFollowing };
                    }
                    return a;
                });
            });

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return { previousAttendees };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData([`/api/events/${eventId}/attendees`], context?.previousAttendees);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/events/${eventId}/attendees`] });
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
        }
    });

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: `${count.toLocaleString()}+ Going`,
            headerShown: true,
            headerStyle: { backgroundColor: "#111827" },
            headerTintColor: "#FFF",
            headerTitleStyle: { fontWeight: "900", fontSize: 20 },
            headerShadowVisible: false,
            headerRight: () => (
                <Pressable style={{ padding: 8 }}>
                    <Feather name="search" size={24} color="#FFF" />
                </Pressable>
            ),
        });
    }, [navigation, count]);

    const renderItem = ({ item, index }: any) => (
        <Animated.View entering={FadeInRight.delay(index * 50).duration(400).springify()}>
            <View style={styles.item}>
                <Image
                    source={{ uri: item.profileImage ? resolveImageUrl(item.profileImage) : `https://api.dicebear.com/7.x/avataaars/svg?seed=${item.id}` }}
                    style={styles.avatar}
                />
                <ThemedText style={styles.name}>{item.name}</ThemedText>

                <Pressable
                    onPress={() => followMutation.mutate({ userId: item.id, isFollowing: item.isFollowing })}
                    style={[
                        styles.followButton,
                        item.isFollowing && styles.followingButton
                    ]}
                >
                    <ThemedText style={[
                        styles.followText,
                        item.isFollowing && styles.followingText
                    ]}>
                        {item.isFollowing ? "Following" : "Follow"}
                    </ThemedText>
                </Pressable>
            </View>
        </Animated.View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator color="#7C3AED" size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={attendees}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={[
                    styles.list,
                    { paddingBottom: insets.bottom + 20 }
                ]}
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#111827",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#111827",
    },
    list: {
        padding: 20,
    },
    item: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        marginBottom: 8,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: "#1F2937",
    },
    name: {
        flex: 1,
        fontSize: 18,
        fontWeight: "700",
        color: "#FFF",
        marginLeft: 16,
    },
    followButton: {
        backgroundColor: "#7C3AED",
        paddingHorizontal: 24,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 100,
        alignItems: "center",
    },
    followingButton: {
        backgroundColor: "transparent",
        borderWidth: 1.5,
        borderColor: "#7C3AED",
    },
    followText: {
        color: "#FFF",
        fontWeight: "800",
        fontSize: 14,
    },
    followingText: {
        color: "#7C3AED",
    },
});
