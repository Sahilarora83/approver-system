import React, { useLayoutEffect, useState } from "react";
import { StyleSheet, View, ScrollView, Pressable, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "@/components/Icon";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";
import Animated, { FadeIn } from "react-native-reanimated";

const Section = ({ title, children, theme }: any) => (
    <View style={styles.section}>
        <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.primary }]}>{title}</ThemedText>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

const HelpContent = ({ theme }: any) => (
    <View>
        <Section title="Frequently Asked Questions" theme={theme}>
            <View style={styles.textBlock}>
                <ThemedText style={styles.question}>How do I create an event?</ThemedText>
                <ThemedText style={styles.answer}>Navigate to the Events tab and click the plus button to start creating your event.</ThemedText>
            </View>
            <View style={styles.textBlock}>
                <ThemedText style={styles.question}>How do I scan tickets?</ThemedText>
                <ThemedText style={styles.answer}>Use the Scan tab to open the camera and verify participant QR codes instantly.</ThemedText>
            </View>
            <View style={styles.textBlock}>
                <ThemedText style={styles.question}>How to manage registrations?</ThemedText>
                <ThemedText style={styles.answer}>Admins can view and approve/reject registrations from the Event Details screen.</ThemedText>
            </View>
        </Section>

        <Section title="Contact Support" theme={theme}>
            <ThemedText style={styles.standardText}>If you need further assistance, please reach out to our support team at support@globalscale.app</ThemedText>
        </Section>
    </View>
);

const AboutContent = ({ theme }: any) => (
    <View style={styles.centerContent}>
        <View style={[styles.simpleLogo, { backgroundColor: theme.primary }]}>
            <ThemedText style={{ color: '#fff', fontSize: 40, fontWeight: 'bold' }}>G</ThemedText>
        </View>
        <ThemedText type="h2" style={styles.appName}>Global Scale</ThemedText>
        <ThemedText style={styles.version}>Version 1.0.0</ThemedText>

        <View style={styles.aboutTextContainer}>
            <ThemedText style={styles.standardText}>
                Global Scale is a comprehensive event management platform designed for efficiency and reliability.
                Our mission is to provide tools that help organizers manage events of any size with ease.
            </ThemedText>
            <ThemedText style={[styles.standardText, { marginTop: Spacing.md }]}>
                Built with modern technology to ensure a seamless experience for both organizers and participants.
            </ThemedText>
        </View>

        <ThemedText style={styles.copyright}>© 2026 Global Scale App. All rights reserved.</ThemedText>
    </View>
);

const PrivacyContent = ({ theme }: any) => (
    <View>
        <Section title="1. Information We Collect" theme={theme}>
            <ThemedText style={styles.standardText}>
                We collect information you provide directly to us when you create an account, such as your name, email address, and profile information.
            </ThemedText>
        </Section>

        <Section title="2. How We Use Information" theme={theme}>
            <ThemedText style={styles.standardText}>
                We use the information we collect to provide, maintain, and improve our services, including processing event registrations and sending notifications.
            </ThemedText>
        </Section>

        <Section title="3. Data Security" theme={theme}>
            <ThemedText style={styles.standardText}>
                We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
            </ThemedText>
        </Section>

        <Section title="4. Sharing of Information" theme={theme}>
            <ThemedText style={styles.standardText}>
                We do not share your personal information with third parties except as described in this policy or at the time of collection.
            </ThemedText>
        </Section>
    </View>
);

export default function MetaScreen({ route, navigation }: any) {
    const { type } = route.params || { type: 'about' };
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const getTitle = () => {
        switch (type) {
            case 'help': return "Help Center";
            case 'about': return "About App";
            case 'privacy': return "Privacy Policy";
            default: return "Information";
        }
    };

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: getTitle(),
            headerShown: true,
            headerTransparent: false,
            headerTintColor: theme.text,
            headerStyle: { backgroundColor: theme.backgroundRoot },
            headerShadowVisible: false,
        });
    }, [navigation, theme, type]);

    return (
        <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingTop: Spacing.xl,
                    paddingBottom: insets.bottom + Spacing.xl,
                    paddingHorizontal: Spacing.lg
                }}
            >
                <Animated.View entering={FadeIn.duration(400)}>
                    {type === 'help' && <HelpContent theme={theme} />}
                    {type === 'about' && <AboutContent theme={theme} />}
                    {type === 'privacy' && <PrivacyContent theme={theme} />}
                </Animated.View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: Spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: Spacing.md,
    },
    sectionContent: {
        gap: Spacing.md,
    },
    standardText: {
        fontSize: 15,
        lineHeight: 22,
        opacity: 0.8,
    },
    textBlock: {
        marginBottom: Spacing.sm,
    },
    question: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    answer: {
        fontSize: 14,
        lineHeight: 20,
        opacity: 0.7,
    },
    centerContent: {
        alignItems: 'center',
        paddingTop: 40,
    },
    simpleLogo: {
        width: 80,
        height: 80,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: Spacing.lg,
    },
    appName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    version: {
        fontSize: 14,
        opacity: 0.5,
        marginBottom: 30,
    },
    aboutTextContainer: {
        paddingHorizontal: 10,
        width: '100%',
    },
    copyright: {
        marginTop: 60,
        fontSize: 12,
        opacity: 0.4,
    }
});
