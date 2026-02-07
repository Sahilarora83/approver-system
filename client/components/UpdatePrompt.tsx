import React, { useState } from "react";
import { StyleSheet, View, Text, Pressable, Dimensions, Platform, ActivityIndicator } from "react-native";
import Animated, { FadeInDown, FadeOutUp, SlideInUp, SlideOutUp } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

interface UpdatePromptProps {
    isVisible: boolean;
    onDismiss: () => void;
}

export const UpdatePrompt = ({ isVisible, onDismiss }: UpdatePromptProps) => {
    const insets = useSafeAreaInsets();
    const [isUpdating, setIsUpdating] = useState(false);

    if (!isVisible) return null;

    const handleUpdate = async () => {
        try {
            setIsUpdating(true);
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (error) {
            console.error("Update failed:", error);
            setIsUpdating(false);
            onDismiss(); // Dismiss if failed
        }
    };

    return (
        <Animated.View
            entering={FadeInDown.duration(600)}
            exiting={FadeOutUp}
            style={[styles.container, { top: insets.top + 10 }]}
        >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={["#7C3AED", "#6D28D9"]}
                            style={styles.iconGradient}
                        >
                            <Feather name="download-cloud" size={24} color="#FFF" />
                        </LinearGradient>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Update Available</Text>
                        <Text style={styles.description}>
                            A new version is ready.
                        </Text>
                    </View>

                    <View style={styles.actions}>
                        <Pressable
                            style={styles.laterButton}
                            onPress={onDismiss}
                            disabled={isUpdating}
                        >
                            <Feather name="x" size={20} color="#9CA3AF" />
                        </Pressable>
                    </View>
                </View>

                <Pressable
                    style={styles.updateButton}
                    onPress={handleUpdate}
                    disabled={isUpdating}
                >
                    <LinearGradient
                        colors={["#7C3AED", "#6D28D9"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.updateGradient}
                    >
                        {isUpdating ? (
                            <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.updateText}>Update Now</Text>
                                <Feather name="arrow-right" size={16} color="#FFF" />
                            </>
                        )}
                    </LinearGradient>
                </Pressable>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: 16,
        right: 16,
        zIndex: 10000,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "rgba(31, 41, 55, 0.9)", // Fallback
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 8,
            },
        }),
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    blur: {
        padding: 16,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    iconContainer: {
        marginRight: 12,
    },
    iconGradient: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 16,
        fontWeight: "800",
        color: "#FFF",
    },
    description: {
        fontSize: 12,
        color: "#9CA3AF",
        fontWeight: "500",
    },
    actions: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    laterButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
    },
    updateButton: {
        height: 44,
        borderRadius: 12,
        overflow: "hidden",
    },
    updateGradient: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 8,
    },
    updateText: {
        color: "#FFF",
        fontSize: 14,
        fontWeight: "700",
        letterSpacing: 0.5,
    },
});
