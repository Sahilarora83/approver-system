import React, { useLayoutEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Switch, Pressable, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const Section = ({ title, children, delay = 0 }: any) => (
    <Animated.View
        entering={FadeInDown.delay(delay).duration(600).springify()}
        style={{ marginBottom: Spacing['2xl'] }}
    >
        <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
        <View style={styles.sectionCard}>
            {children}
        </View>
    </Animated.View>
);

const SettingRow = ({ label, icon, value, onValueChange, isLast, theme, type = "toggle" }: any) => (
    <View style={[styles.row, !isLast && { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' }]}>
        <View style={styles.rowLeft}>
            <View style={[styles.iconBox, { backgroundColor: theme.backgroundSecondary }]}>
                <Icon name={icon} size={18} color={theme.text} />
            </View>
            <ThemedText style={{ fontSize: 15, fontWeight: '600' }}>{label}</ThemedText>
        </View>
        {type === "toggle" ? (
            <Switch
                value={value}
                onValueChange={(val) => {
                    onValueChange(val);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: '#333', true: theme.primary }}
                thumbColor={'#fff'}
                ios_backgroundColor="#333"
            />
        ) : (
            <Icon name="chevron-right" size={18} color={theme.textSecondary} />
        )}
    </View>
);

export default function SettingsScreen({ navigation }: any) {
    const { theme, isDark } = useTheme();
    const insets = useSafeAreaInsets();

    const [pushEnabled, setPushEnabled] = useState(true);
    const [locationEnabled, setLocationEnabled] = useState(true);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Settings",
            headerShown: true,
            headerTransparent: false,
            headerTintColor: theme.text,
            headerStyle: { backgroundColor: theme.backgroundRoot },
            headerShadowVisible: false,
        });
    }, [navigation, theme]);

    return (
        <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
            <LinearGradient
                colors={[theme.primary + '10', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    padding: Spacing.lg,
                    paddingTop: Spacing.xl,
                    paddingBottom: insets.bottom + 40
                }}
                showsVerticalScrollIndicator={false}
            >
                <Section title="PREFERENCES" delay={100}>
                    <SettingRow
                        label="Dark Mode (System)"
                        icon="moon"
                        value={isDark}
                        onValueChange={() => { }}
                        theme={theme}
                    />
                    <SettingRow
                        label="Push Notifications"
                        icon="bell"
                        value={pushEnabled}
                        onValueChange={setPushEnabled}
                        theme={theme}
                    />
                    <SettingRow
                        label="Location Services"
                        icon="map-pin"
                        value={locationEnabled}
                        onValueChange={setLocationEnabled}
                        theme={theme}
                        isLast
                    />
                </Section>

                <Section title="SECURITY" delay={300}>
                    <SettingRow
                        label="Change Password"
                        icon="shield"
                        type="link"
                        theme={theme}
                        isLast
                    />
                </Section>

                <Section title="SUPPORT" delay={500}>
                    <Pressable onPress={() => navigation.navigate("HelpCenter")}>
                        <SettingRow
                            label="Help Center"
                            icon="help-circle"
                            type="link"
                            theme={theme}
                        />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("AboutApp")}>
                        <SettingRow
                            label="About App"
                            icon="info"
                            type="link"
                            theme={theme}
                        />
                    </Pressable>
                    <Pressable onPress={() => navigation.navigate("PrivacyPolicy")}>
                        <SettingRow
                            label="Privacy Policy"
                            icon="lock"
                            type="link"
                            theme={theme}
                            isLast
                        />
                    </Pressable>
                </Section>

                <Section title="APP UPDATES" delay={600}>
                    <Pressable onPress={async () => {
                        try {
                            const Updates = await import('expo-updates');
                            if (__DEV__) {
                                alert('Updates are not available in development mode.');
                                return;
                            }
                            const { isAvailable } = await Updates.checkForUpdateAsync();
                            if (isAvailable) {
                                await Updates.fetchUpdateAsync();
                                await Updates.reloadAsync();
                            } else {
                                alert('No updates available. You are on the latest version.');
                            }
                        } catch (error: any) {
                            alert(`Error checking for updates: ${error.message}`);
                        }
                    }}>
                        <SettingRow
                            label="Check for Updates"
                            icon="download-cloud"
                            type="link"
                            theme={theme}
                            isLast
                        />
                    </Pressable>
                </Section>

                <View style={styles.versionContainer}>
                    <ThemedText style={styles.versionText}>Version 1.0.1 (Koyeb Prod)</ThemedText>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    sectionTitle: {
        fontSize: 11,
        fontWeight: '900',
        opacity: 0.5,
        marginBottom: Spacing.md,
        marginLeft: Spacing.xs,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    sectionCard: {
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: BorderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        overflow: 'hidden',
        ...Shadows.sm,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Spacing.lg,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: Spacing.lg,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.sm,
    },
    versionContainer: {
        marginTop: Spacing.xl,
        alignItems: 'center',
        opacity: 0.3,
    },
    versionText: {
        fontSize: 12,
        fontWeight: '600',
    }
});
