import React, { useState } from "react";
import { StyleSheet, View, FlatList, ActivityIndicator, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { Skeleton } from "@/components/Skeleton";
import { useSocket } from "@/contexts/SocketContext";
import { useEffect } from "react";

export default function PendingRegistrationsScreen({ route, navigation }: any) {
    const { eventId } = route.params;
    const insets = useSafeAreaInsets();
    const { theme } = useTheme();
    const queryClient = useQueryClient();

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending");

    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage
    } = useInfiniteQuery({
        queryKey: ["/api/events", eventId, "registrations", filter],
        queryFn: async ({ pageParam = 0 }) => {
            const res = await apiRequest("GET", `/api/events/${eventId}/registrations?limit=50&offset=${pageParam}&status=${filter}`);
            return res.json();
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage, allPages) => {
            if (lastPage.length < 50) return undefined;
            return allPages.length * 50;
        },
    });

    const registrations = data?.pages.flat() || [];
    const { socket } = useSocket();

    useEffect(() => {
        if (socket) {
            socket.emit("join-event", eventId);

            const handleUpdate = (data: { registrationId: string; status: string }) => {
                console.log("[Socket] Received update:", data);
                queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
            };

            socket.on("registration-updated", handleUpdate);

            return () => {
                socket.off("registration-updated", handleUpdate);
            };
        }
    }, [socket, eventId]);

    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status }: { id: string; status: string }) => {
            const response = await apiRequest("PATCH", `/api/registrations/${id}/status`, { status });
            return response.json();
        },
        // Optimistic UI Update
        onMutate: async (newRegistration) => {
            await queryClient.cancelQueries({ queryKey: ["/api/events", eventId, "registrations"] });
            const previousRegistrations = queryClient.getQueryData(["/api/events", eventId, "registrations"]);

            queryClient.setQueryData(["/api/events", eventId, "registrations"], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: any) =>
                        page.map((reg: any) =>
                            reg.id === newRegistration.id ? { ...reg, status: newRegistration.status } : reg
                        )
                    )
                };
            });

            return { previousRegistrations };
        },
        onError: (err, newRegistration, context) => {
            queryClient.setQueryData(["/api/events", eventId, "registrations"], context?.previousRegistrations);
            Alert.alert("Error", "Failed to update status. Please try again.");
        },
        onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
            queryClient.invalidateQueries({ queryKey: ["registration-status", eventId] });
        },
    });

    const bulkUpdateMutation = useMutation({
        mutationFn: async ({ registrationIds, status }: { registrationIds: string[]; status: string }) => {
            const response = await apiRequest("POST", "/api/registrations/bulk-update", {
                registrationIds,
                status
            });
            return response.json();
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "registrations"] });
            queryClient.invalidateQueries({ queryKey: ["registration-status", eventId] });
            setSelectedIds(new Set());
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert("Success", data.message);
        },
    });

    const handleApprove = (id: string) => {
        Alert.alert(
            "Approve Registration",
            "Are you sure you want to approve this registration?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Approve",
                    onPress: () => updateStatusMutation.mutate({ id, status: "approved" }),
                },
            ]
        );
    };

    const handleReject = (id: string) => {
        Alert.alert(
            "Reject Registration",
            "Are you sure you want to reject this registration?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reject",
                    style: "destructive",
                    onPress: () => updateStatusMutation.mutate({ id, status: "rejected" }),
                },
            ]
        );
    };

    const handleBulkAction = (status: "approved" | "rejected") => {
        if (selectedIds.size === 0) {
            Alert.alert("No Selection", "Please select at least one registration");
            return;
        }

        const action = status === "approved" ? "approve" : "reject";
        Alert.alert(
            `Bulk ${action.charAt(0).toUpperCase() + action.slice(1)}`,
            `Are you sure you want to ${action} ${selectedIds.size} registration(s)?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: action.charAt(0).toUpperCase() + action.slice(1),
                    style: status === "rejected" ? "destructive" : "default",
                    onPress: () => bulkUpdateMutation.mutate({
                        registrationIds: Array.from(selectedIds),
                        status
                    }),
                },
            ]
        );
    };

    const toggleSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const selectAll = () => {
        const filtered = filteredRegistrations;
        if (selectedIds.size === filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map((r: any) => r.id)));
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const filteredRegistrations = registrations.filter((r: any) => {
        if (filter === "all") return true;
        return r.status === filter;
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "approved": return theme.success;
            case "rejected": return theme.error;
            case "pending": return theme.warning;
            default: return theme.textSecondary;
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "approved": return "check-circle";
            case "rejected": return "x-circle";
            case "pending": return "clock";
            default: return "help-circle";
        }
    };

    if (isLoading) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.filterContainer}>
                    {[1, 2, 3, 4].map((i) => (
                        <View key={i} style={styles.filterTab}>
                            <Skeleton width={60} height={20} />
                        </View>
                    ))}
                </View>
                <View style={{ padding: Spacing.lg }}>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <View key={i} style={[styles.registrationCard, { backgroundColor: theme.backgroundDefault, opacity: 0.6 }]}>
                            <View style={styles.checkbox}>
                                <Skeleton width={20} height={20} borderRadius={4} />
                            </View>
                            <View style={styles.registrationInfo}>
                                <Skeleton width="60%" height={20} style={{ marginBottom: 8 }} />
                                <Skeleton width="40%" height={14} style={{ marginBottom: 4 }} />
                                <Skeleton width="30%" height={14} />
                            </View>
                        </View>
                    ))}
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Filter Tabs */}
            <View style={[styles.filterContainer, { borderBottomColor: theme.border }]}>
                {["all", "pending", "approved", "rejected"].map((f) => (
                    <Pressable
                        key={f}
                        onPress={() => setFilter(f as any)}
                        style={[
                            styles.filterTab,
                            filter === f && { borderBottomColor: theme.primary, borderBottomWidth: 2 },
                        ]}
                    >
                        <ThemedText
                            type="body"
                            style={[
                                styles.filterText,
                                { color: filter === f ? theme.primary : theme.textSecondary },
                            ]}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </ThemedText>
                    </Pressable>
                ))}
            </View>

            {/* Bulk Actions */}
            {selectedIds.size > 0 && (
                <View style={[styles.bulkActions, { backgroundColor: theme.backgroundSecondary }]}>
                    <Pressable onPress={selectAll} style={styles.selectAllButton}>
                        <Feather
                            name={selectedIds.size === filteredRegistrations.length ? "check-square" : "square"}
                            size={20}
                            color={theme.primary}
                        />
                        <ThemedText type="small" style={{ marginLeft: 8 }}>
                            {selectedIds.size} selected
                        </ThemedText>
                    </Pressable>

                    <View style={styles.bulkButtonsContainer}>
                        <Pressable
                            onPress={() => handleBulkAction("approved")}
                            style={[styles.bulkButton, { backgroundColor: theme.success }]}
                        >
                            <Feather name="check" size={16} color="#fff" />
                            <ThemedText type="small" style={styles.bulkButtonText}>
                                Approve
                            </ThemedText>
                        </Pressable>

                        <Pressable
                            onPress={() => handleBulkAction("rejected")}
                            style={[styles.bulkButton, { backgroundColor: theme.error }]}
                        >
                            <Feather name="x" size={16} color="#fff" />
                            <ThemedText type="small" style={styles.bulkButtonText}>
                                Reject
                            </ThemedText>
                        </Pressable>
                    </View>
                </View>
            )}

            {/* Registrations List */}
            <FlatList
                data={filteredRegistrations}
                keyExtractor={(item) => item.id}
                onEndReached={() => {
                    if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage();
                    }
                }}
                onEndReachedThreshold={0.5}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={{ padding: Spacing.md }}>
                            <ActivityIndicator size="small" color={theme.primary} />
                        </View>
                    ) : null
                }
                contentContainerStyle={{
                    paddingHorizontal: Spacing.lg,
                    paddingTop: Spacing.md,
                    paddingBottom: insets.bottom + Spacing["2xl"],
                }}
                renderItem={({ item }) => (
                    <Pressable
                        onPress={() => toggleSelection(item.id)}
                        onLongPress={() => toggleSelection(item.id)}
                        style={[
                            styles.registrationCard,
                            { backgroundColor: theme.backgroundDefault },
                            selectedIds.has(item.id) && { borderColor: theme.primary, borderWidth: 2 },
                            Shadows.sm,
                        ]}
                    >
                        {/* Selection Checkbox */}
                        <View style={styles.checkbox}>
                            <Feather
                                name={selectedIds.has(item.id) ? "check-square" : "square"}
                                size={20}
                                color={selectedIds.has(item.id) ? theme.primary : theme.textSecondary}
                            />
                        </View>

                        {/* Registration Info */}
                        <View style={styles.registrationInfo}>
                            <ThemedText type="h4" style={styles.registrationName}>
                                {item.name}
                            </ThemedText>
                            <ThemedText type="small" style={styles.registrationEmail}>
                                {item.email}
                            </ThemedText>
                            {item.phone && (
                                <ThemedText type="small" style={styles.registrationPhone}>
                                    📱 {item.phone}
                                </ThemedText>
                            )}

                            {/* Status Badge */}
                            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor(item.status)}15` }]}>
                                <Feather name={getStatusIcon(item.status) as any} size={12} color={getStatusColor(item.status)} />
                                <ThemedText
                                    type="small"
                                    style={[styles.statusText, { color: getStatusColor(item.status) }]}
                                >
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Action Buttons */}
                        {item.status === "pending" && (
                            <View style={styles.actionButtons}>
                                <Pressable
                                    onPress={() => handleApprove(item.id)}
                                    style={[styles.actionButton, { backgroundColor: theme.success }]}
                                >
                                    <Feather name="check" size={16} color="#fff" />
                                </Pressable>
                                <Pressable
                                    onPress={() => handleReject(item.id)}
                                    style={[styles.actionButton, { backgroundColor: theme.error }]}
                                >
                                    <Feather name="x" size={16} color="#fff" />
                                </Pressable>
                            </View>
                        )}
                    </Pressable>
                )}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Feather name="inbox" size={48} color={theme.textSecondary} />
                        <ThemedText type="body" style={styles.emptyText}>
                            No {filter !== "all" ? filter : ""} registrations found
                        </ThemedText>
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
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    filterContainer: {
        flexDirection: "row",
        borderBottomWidth: 1,
        paddingHorizontal: Spacing.lg,
    },
    filterTab: {
        flex: 1,
        paddingVertical: Spacing.md,
        alignItems: "center",
    },
    filterText: {
        fontWeight: "600",
    },
    bulkActions: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        padding: Spacing.md,
    },
    selectAllButton: {
        flexDirection: "row",
        alignItems: "center",
    },
    bulkButtonsContainer: {
        flexDirection: "row",
        gap: Spacing.sm,
    },
    bulkButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        paddingHorizontal: Spacing.md,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
    },
    bulkButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    registrationCard: {
        flexDirection: "row",
        padding: Spacing.lg,
        borderRadius: BorderRadius.lg,
        marginBottom: Spacing.md,
        gap: Spacing.md,
    },
    checkbox: {
        justifyContent: "center",
    },
    registrationInfo: {
        flex: 1,
        gap: 4,
    },
    registrationName: {
        marginBottom: 2,
    },
    registrationEmail: {
        opacity: 0.7,
    },
    registrationPhone: {
        opacity: 0.7,
    },
    statusBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: BorderRadius.sm,
        marginTop: 8,
    },
    statusText: {
        fontWeight: "600",
        fontSize: 12,
    },
    actionButtons: {
        flexDirection: "row",
        gap: Spacing.sm,
        alignItems: "center",
    },
    actionButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: "center",
        justifyContent: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: Spacing["3xl"],
    },
    emptyText: {
        marginTop: Spacing.md,
        opacity: 0.7,
    },
});
