import React from "react";
import { StyleSheet, View, Text, Pressable, Dimensions, Platform } from "react-native";
import Animated, { FadeInDown, FadeOutDown, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Feather, Ionicons } from "@expo/vector-icons";
import * as Updates from "expo-updates";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

interface UpdatePromptProps {
    isVisible: boolean;
    onDismiss: () => void;
}

export const UpdatePrompt = ({ isVisible, onDismiss }: UpdatePromptProps) => {
    if (!isVisible) return null;

    const handleUpdate = async () => {
        try {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
        } catch (error) {
            console.error("Update failed:", error);
            onDismiss();
        }
    };

    return (
        <Animated.View
            entering={SlideInDown.springify().damping(15)}
            exiting={SlideOutDown}
            style={styles.container}
        >
            <BlurView intensity={80} tint="dark" style={styles.blur}>
                <View style={styles.content}>
                    <View style={styles.iconContainer}>
                        <LinearGradient
                            colors={["#7C3AED", "#6D28D9"]}
                            style={styles.iconGradient}
                        >
                            <Feather name="refresh-cw" size={24} color="#FFF" />
                        </LinearGradient>
                    </View>

                    <View style={styles.textContainer}>
                        <Text style={styles.title}>Update Available</Text>
                        <Text style={styles.description}>
                            A new version of the app is available with latest features and improvements.
                        </Text>
                    </View>
                </View>

                <View style={styles.buttonRow}>
                    <Pressable
                        style={styles.laterButton}
                        onPress={onDismiss}
                    >
                        <Text style={styles.laterText}>Later</Text>
                    </Pressable>

                    <Pressable
                        style={styles.updateButton}
                        onPress={handleUpdate}
                    >
                        <LinearGradient
                            colors={["#7C3AED", "#6D28D9"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.updateGradient}
                        >
                            <Text style={styles.updateText}>Update Now</Text>
                            <Feather name="arrow-right" size={16} color="#FFF" />
                        </LinearGradient>
                    </Pressable>
                </View>
            </BlurView>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 100, // Above tab bar if present
        left: 20,
        right: 20,
        zIndex: 10000,
        borderRadius: 28,
        overflow: "hidden",
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 12,
            },
        }),
    },
    blur: {
        padding: 20,
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    iconContainer: {
        marginRight: 16,
    },
    iconGradient: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
    },
    textContainer: {
        flex: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: "900",
        color: "#FFF",
        marginBottom: 4,
    },
    description: {
        fontSize: 13,
        color: "#9CA3AF",
        lineHeight: 18,
        fontWeight: "600",
    },
    buttonRow: {
        flexDirection: "row",
        gap: 12,
    },
    laterButton: {
        flex: 1,
        height: 50,
        borderRadius: 25,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.05)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.1)",
    },
    laterText: {
        color: "#9CA3AF",
        fontSize: 15,
        fontWeight: "700",
    },
    updateButton: {
        flex: 2,
        height: 50,
        borderRadius: 25,
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
        fontSize: 15,
        fontWeight: "800",
    },
});
