import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, Text, Platform, Dimensions } from "react-native";
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withRepeat,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useSocket } from "@/contexts/SocketContext";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

export const ConnectionStatus = () => {
    const { isConnected } = useSocket();
    const insets = useSafeAreaInsets();
    const translateY = useSharedValue(-120);
    const [status, setStatus] = useState<"online" | "offline" | "connecting">("online");
    const lastReportedStatus = useRef<boolean | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isFirstLoad = useRef(true);

    useEffect(() => {
        // Debounce initial state to prevent "Pop Up" on launch
        if (isFirstLoad.current) {
            const initialTimer = setTimeout(() => {
                isFirstLoad.current = false;
                lastReportedStatus.current = isConnected;
                // If we are actually offline after 3s, show it
                if (!isConnected) {
                    setStatus("offline");
                    translateY.value = withSpring(0, { damping: 15 });
                }
            }, 3000);
            return () => clearTimeout(initialTimer);
        }

        if (timerRef.current) clearTimeout(timerRef.current);

        timerRef.current = setTimeout(() => {
            if (lastReportedStatus.current === isConnected) return;

            if (isConnected) {
                if (lastReportedStatus.current === false) {
                    setStatus("online");
                    translateY.value = withSpring(0, { damping: 15 });

                    setTimeout(() => {
                        translateY.value = withTiming(-130, { duration: 800 });
                    }, 2500);
                }
            } else {
                setStatus("offline");
                translateY.value = withSpring(0, { damping: 12 });
            }
            lastReportedStatus.current = isConnected;
        }, isConnected ? 300 : 2000);

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isConnected, translateY]);

    const pulseOpacity = useSharedValue(1);
    useEffect(() => {
        if (status === "offline") {
            pulseOpacity.value = withRepeat(withTiming(0.7, { duration: 1000 }), -1, true);
        } else {
            pulseOpacity.value = withTiming(1);
        }
    }, [status]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
        opacity: pulseOpacity.value,
    }));

    return (
        <Animated.View style={[styles.wrapper, animatedStyle, { height: insets.top + 45 }]}>
            <LinearGradient
                colors={status === "online" ? ["#10B981", "#059669"] : ["#EF4444", "#DC2626"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[StyleSheet.absoluteFill, styles.gradient]}
            />
            <View style={[styles.content, { paddingTop: insets.top }]}>
                <View style={styles.pill}>
                    <Feather
                        name={status === "online" ? "check-circle" : "wifi-off"}
                        size={14}
                        color="#FFF"
                    />
                    <Text style={styles.text}>
                        {status === "online" ? "Back Online" : "Waiting for stable connection..."}
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        width: width,
        elevation: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
    },
    gradient: {
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    content: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    pill: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: "rgba(0,0,0,0.15)",
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
    },
    text: {
        color: "#FFF",
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 0.5,
        textTransform: "uppercase",
    },
});
