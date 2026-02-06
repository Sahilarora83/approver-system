import React, { useEffect, useRef } from "react";
import { StyleSheet, Animated, ViewStyle } from "react-native";
import { useTheme } from "@/hooks/useTheme";

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    borderRadius?: number;
    style?: ViewStyle;
}

export const Skeleton = ({ width, height, borderRadius, style }: SkeletonProps) => {
    const { theme } = useTheme();
    const opacity = useRef(new Animated.Value(0.3)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(opacity, {
                    toValue: 0.7,
                    duration: 800,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0.3,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [opacity]);

    return (
        <Animated.View
            style={[
                {
                    width: (width || "100%") as any,
                    height: (height || 20) as any,
                    borderRadius: borderRadius || 4,
                    backgroundColor: theme.textSecondary,
                    opacity: opacity,
                },
                style,
            ]}
        />
    );
};

const styles = StyleSheet.create({});
