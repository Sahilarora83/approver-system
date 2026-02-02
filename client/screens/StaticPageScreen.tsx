import React, { useLayoutEffect } from "react";
import { StyleSheet, View, ScrollView } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Spacing } from "@/constants/theme";

export default function StaticPageScreen({ route, navigation }: any) {
    const { theme } = useTheme();
    const { title = "Page", content = "Content unavailable." } = route.params || {};

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: title,
        });
    }, [navigation, title]);

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
            contentContainerStyle={{ padding: Spacing.xl }}
        >
            <ThemedText type="body" style={{ lineHeight: 24 }}>
                {content}
            </ThemedText>
        </ScrollView>
    );
}
