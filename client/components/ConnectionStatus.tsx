import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, Platform } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withDelay,
    withTiming,
    withRepeat,
    interpolateColor
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "@/contexts/SocketContext";
import { Feather } from "@expo/vector-icons";

export const ConnectionStatus = () => {
    const { isConnected } = useSocket();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-100);
    const [lastStatus, setLastStatus] = useState<boolean | null>(null);

    useEffect(() => {
        // Only show if status has changed (to avoid showing on first load if already connected)
        if (lastStatus !== null && lastStatus !== isConnected) {
            translateY.value = withSpring(insets.top + 10, { damping: 15 });

            // Auto hide after 3 seconds if connected, stay if disconnected
            if (isConnected) {
                const timer = setTimeout(() => {
                    translateY.value = withSpring(-100);
                }, 3000);
                return () => clearTimeout(timer);
            }
        } else if (lastStatus === null && !isConnected) {
            // Show immediately if starting offline
            translateY.value = withSpring(insets.top + 10);
        }

        setLastStatus(isConnected);
    }, [isConnected, insets.top]);

    const opacity = useSharedValue(1);

    useEffect(() => {
        if (!isConnected) {
            opacity.value = withRepeat(
                withTiming(0.6, { duration: 800 }),
                -1,
                true
            );
        } else {
            opacity.value = withTiming(1);
        }
    }, [isConnected]);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ translateY: translateY.value }],
            backgroundColor: isConnected ? "#10B981" : "#EF4444",
            opacity: opacity.value,
        };
    });

    return (
        <Animated.View style={[styles.container, animatedStyle]}>
            <View style={styles.content}>
                <Feather
                    name={isConnected ? "zap" : "zap-off"}
                    size={14}
                    color="#FFF"
                />
                <Text style={styles.text}>
                    {isConnected ? "You are Online" : "You are Offline"}
                </Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        left: "25%",
        right: "25%",
        zIndex: 9999,
        borderRadius: 20,
        paddingVertical: 8,
        paddingHorizontal: 16,
        ...Platform.select({
            ios: {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            },
        }),
    },
    content: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    text: {
        color: "#FFF",
        fontSize: 13,
        fontWeight: "800",
    },
});
