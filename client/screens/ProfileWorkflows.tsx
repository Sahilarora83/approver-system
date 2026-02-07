import React, { useState, useLayoutEffect, useEffect } from "react";
import { StyleSheet, View, ScrollView, Switch, Pressable, TextInput, FlatList, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

const Header = ({ title, navigation }: any) => {
    const { theme } = useTheme();
    return (
        <View style={[styles.header, { backgroundColor: theme.backgroundRoot }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
                <Feather name="arrow-left" size={24} color="#FFF" />
            </Pressable>
            <ThemedText style={styles.headerTitle}>{title}</ThemedText>
            <View style={{ width: 24 }} />
        </View>
    );
};

const ToggleRow = ({ label, value, onValueChange, theme }: any) => (
    <View style={styles.row}>
        <ThemedText style={styles.rowLabel}>{label}</ThemedText>
        <Switch
            trackColor={{ false: "#374151", true: theme.primary }}
            thumbColor={"#FFF"}
            ios_backgroundColor="#374151"
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

// --- 1. Notification Settings ---
export const NotificationSettingsScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [settings, setSettings] = useState({
        sound: true,
        tickets: true,
        liked: true,
        organizers: true,
        offers: false,
        payments: true,
        reminders: true,
        recommendations: true,
        updates: true,
    });

    const { data: savedSettings, isLoading } = useQuery({
        queryKey: ["/api/user/settings"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/user/settings");
            return res.json();
        }
    });

    useEffect(() => {
        if (savedSettings) {
            setSettings(prev => ({ ...prev, ...savedSettings }));
        }
    }, [savedSettings]);

    const settingsMutation = useMutation({
        mutationFn: async (newSettings: any) => {
            await apiRequest("POST", "/api/user/settings", newSettings);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/user/settings"] });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    });

    const toggle = (key: keyof typeof settings) => {
        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);
        settingsMutation.mutate(newSettings);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    if (isLoading) {
        return (
            <ThemedView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Header title="Notification" navigation={navigation} />
                <ThemedText>Loading...</ThemedText>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <Header title="Notification" navigation={navigation} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ToggleRow label="Enable Sound & Vibrate" value={settings.sound} onValueChange={() => toggle('sound')} theme={theme} />
                <ToggleRow label="Purchased Tickets" value={settings.tickets} onValueChange={() => toggle('tickets')} theme={theme} />
                <ToggleRow label="Liked Events" value={settings.liked} onValueChange={() => toggle('liked')} theme={theme} />
                <ToggleRow label="Followed Organizer" value={settings.organizers} onValueChange={() => toggle('organizers')} theme={theme} />
                <ToggleRow label="Special Offers" value={settings.offers} onValueChange={() => toggle('offers')} theme={theme} />
                <ToggleRow label="Payments" value={settings.payments} onValueChange={() => toggle('payments')} theme={theme} />
                <ToggleRow label="Reminders" value={settings.reminders} onValueChange={() => toggle('reminders')} theme={theme} />
                <ToggleRow label="Recommendations" value={settings.recommendations} onValueChange={() => toggle('recommendations')} theme={theme} />
                <ToggleRow label="App Updates" value={settings.updates} onValueChange={() => toggle('updates')} theme={theme} />
            </ScrollView>
        </ThemedView>
    );
};

// --- 2. Security ---
export const SecurityScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [settings, setSettings] = useState({
        remember: true,
        faceId: true,
        biometric: true,
    });

    const toggle = (key: keyof typeof settings) => setSettings(p => ({ ...p, [key]: !p[key] }));

    return (
        <ThemedView style={styles.container}>
            <Header title="Security" navigation={navigation} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ToggleRow label="Remember me" value={settings.remember} onValueChange={() => toggle('remember')} theme={theme} />
                <ToggleRow label="Face ID" value={settings.faceId} onValueChange={() => toggle('faceId')} theme={theme} />
                <ToggleRow label="Biometric ID" value={settings.biometric} onValueChange={() => toggle('biometric')} theme={theme} />

                <Pressable style={styles.navRow}>
                    <ThemedText style={styles.navRowText}>Google Authenticator</ThemedText>
                    <Feather name="chevron-right" size={20} color="#9CA3AF" />
                </Pressable>

                <View style={{ marginTop: 20, gap: 16 }}>
                    <Pressable style={styles.greyButton}>
                        <ThemedText style={styles.greyButtonText}>Change PIN</ThemedText>
                    </Pressable>
                    <Pressable style={styles.greyButton}>
                        <ThemedText style={styles.greyButtonText}>Change Password</ThemedText>
                    </Pressable>
                </View>
            </ScrollView>
        </ThemedView>
    );
};

// --- 3. Linked Accounts ---
export const LinkedAccountsScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [linked, setLinked] = useState({
        google: true,
        apple: true,
        facebook: false,
        twitter: false
    });

    const toggle = (key: keyof typeof linked) => setLinked(p => ({ ...p, [key]: !p[key] }));

    const AccountRow = ({ icon, label, provider, color }: any) => (
        <View style={styles.row}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <FontAwesome5 name={icon} size={24} color={color} style={{ width: 30, textAlign: 'center' }} />
                <ThemedText style={styles.rowLabel}>{label}</ThemedText>
            </View>
            <Switch
                trackColor={{ false: "#374151", true: theme.primary }}
                thumbColor={"#FFF"}
                onValueChange={() => toggle(provider)}
                value={linked[provider as keyof typeof linked]}
            />
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <Header title="Linked Accounts" navigation={navigation} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <AccountRow icon="google" label="Google" provider="google" color="#EA4335" />
                <AccountRow icon="apple" label="Apple" provider="apple" color="#FFF" />
                <AccountRow icon="facebook" label="Facebook" provider="facebook" color="#1877F2" />
                <AccountRow icon="twitter" label="Twitter" provider="twitter" color="#1DA1F2" />
            </ScrollView>
        </ThemedView>
    );
};

// --- 4. Language ---
const LANGUAGES = ["English (US)", "English (UK)", "Mandarin", "Hindi", "Spanish", "French", "Arabic", "Bengali"];

export const LanguageScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [selected, setSelected] = useState("English (US)");

    return (
        <ThemedView style={styles.container}>
            <Header title="Language" navigation={navigation} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ThemedText style={styles.sectionTitle}>Suggested</ThemedText>
                {LANGUAGES.map((lang, index) => (
                    <Pressable
                        key={lang}
                        style={styles.langRow}
                        onPress={() => setSelected(lang)}
                    >
                        <ThemedText style={styles.langText}>{lang}</ThemedText>
                        <View style={[styles.radioOuter, selected === lang && { borderColor: theme.primary }]}>
                            {selected === lang && <View style={[styles.radioInner, { backgroundColor: theme.primary }]} />}
                        </View>
                    </Pressable>
                ))}
            </ScrollView>
        </ThemedView>
    );
};

// --- 5. Invite Friends ---
const FRIENDS = [
    { id: 1, name: "Lauralee Quintero", phone: "+1-300-555-0135", invited: true },
    { id: 2, name: "Annabel Rohan", phone: "+1-202-555-0136", invited: true },
    { id: 3, name: "Alfonzo Schuessler", phone: "+1-300-555-0119", invited: true },
    { id: 4, name: "Augustina Midgett", phone: "+1-300-555-0161", invited: true },
    { id: 5, name: "Freida Varnes", phone: "+1-300-555-0136", invited: false },
];

export const InviteFriendsScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();

    const renderItem = ({ item }: any) => (
        <View style={styles.friendRow}>
            <View style={styles.friendInfo}>
                <View style={styles.avatarPlaceholder}>
                    <ThemedText style={styles.avatarInitial}>{item.name[0]}</ThemedText>
                </View>
                <View>
                    <ThemedText style={styles.friendName}>{item.name}</ThemedText>
                    <ThemedText style={styles.friendPhone}>{item.phone}</ThemedText>
                </View>
            </View>
            <Pressable
                style={[
                    styles.inviteButton,
                    item.invited ? { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.primary } : { backgroundColor: theme.primary }
                ]}
            >
                <ThemedText style={[styles.inviteText, item.invited ? { color: theme.primary } : { color: '#FFF' }]}>
                    {item.invited ? "Invited" : "Invite"}
                </ThemedText>
            </Pressable>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <Header title="Invite Friends" navigation={navigation} />
            <FlatList
                data={FRIENDS}
                keyExtractor={item => item.id.toString()}
                renderItem={renderItem}
                contentContainerStyle={{ padding: 20 }}
            />
        </ThemedView>
    );
};

// --- 6. Payment Methods ---
export const PaymentMethodsScreen = ({ navigation }: any) => {
    const { theme } = useTheme();

    const PaymentCard = ({ icon, label, connected, number }: any) => (
        <View style={styles.paymentCard}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                {number ? (
                    <View style={styles.mastercardIcon}>
                        <View style={[styles.circle, { backgroundColor: '#EB001B', left: 0 }]} />
                        <View style={[styles.circle, { backgroundColor: '#F79E1B', left: 12 }]} />
                    </View>
                ) : (
                    <FontAwesome5 name={icon} size={24} color={label === 'PayPal' ? '#003087' : '#FFF'} />
                )}
                <ThemedText style={styles.paymentLabel}>{label} {number}</ThemedText>
            </View>
            <ThemedText style={styles.connectedText}>{connected ? "Connected" : "Link"}</ThemedText>
        </View>
    );

    return (
        <ThemedView style={styles.container}>
            <Header title="Payments" navigation={navigation} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <PaymentCard icon="paypal" label="PayPal" connected />
                <PaymentCard icon="google-pay" label="Google Pay" connected />
                <PaymentCard icon="apple-pay" label="Apple Pay" connected />
                <View style={[styles.divider, { marginVertical: 10 }]} />
                <PaymentCard label="•••• •••• ••••" number="4679" connected />
                <PaymentCard label="•••• •••• ••••" number="2766" connected />

                <Pressable style={[styles.addButton, { backgroundColor: theme.primary }]}>
                    <ThemedText style={styles.addButtonText}>Add New Account</ThemedText>
                </Pressable>
            </ScrollView>
        </ThemedView>
    );
};

// --- 7. Help Center ---
export const HelpCenterScreen = ({ navigation }: any) => {
    const { theme } = useTheme();
    const [tab, setTab] = useState<'faq' | 'contact'>('faq');
    const [search, setSearch] = useState("");

    return (
        <ThemedView style={styles.container}>
            <Header title="Help Center" navigation={navigation} />

            <View style={styles.tabContainer}>
                <Pressable onPress={() => setTab('faq')} style={[styles.tab, tab === 'faq' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
                    <ThemedText style={[styles.tabText, tab === 'faq' && { color: theme.primary }]}>FAQ</ThemedText>
                </Pressable>
                <Pressable onPress={() => setTab('contact')} style={[styles.tab, tab === 'contact' && { borderBottomColor: theme.primary, borderBottomWidth: 3 }]}>
                    <ThemedText style={[styles.tabText, tab === 'contact' && { color: theme.primary }]}>Contact us</ThemedText>
                </Pressable>
            </View>

            {tab === 'faq' ? (
                <View style={{ padding: 20 }}>
                    <View style={styles.searchBox}>
                        <Feather name="search" size={20} color={theme.textSecondary} />
                        <TextInput
                            placeholder="Search..."
                            placeholderTextColor={theme.textSecondary}
                            style={[styles.searchInput, { color: theme.text }]}
                            value={search}
                            onChangeText={setSearch}
                        />
                    </View>

                    <View style={styles.chipRow}>
                        <Pressable style={[styles.chip, { backgroundColor: theme.primary }]}><ThemedText style={{ color: '#FFF', fontWeight: '600' }}>General</ThemedText></Pressable>
                        <Pressable style={styles.chip}><ThemedText style={{ color: theme.textSecondary }}>Account</ThemedText></Pressable>
                        <Pressable style={styles.chip}><ThemedText style={{ color: theme.textSecondary }}>Service</ThemedText></Pressable>
                        <Pressable style={styles.chip}><ThemedText style={{ color: theme.textSecondary }}>Payment</ThemedText></Pressable>
                    </View>

                    <View style={styles.faqItem}>
                        <ThemedText style={styles.faqQuestion}>What is Global Scale?</ThemedText>
                        <Feather name="chevron-down" size={20} color={theme.text} />
                    </View>
                    <View style={styles.faqItem}>
                        <ThemedText style={styles.faqQuestion}>How to make a payment?</ThemedText>
                        <Feather name="chevron-down" size={20} color={theme.text} />
                    </View>
                    <View style={styles.faqItem}>
                        <ThemedText style={styles.faqQuestion}>How do I cancel booking?</ThemedText>
                        <Feather name="chevron-down" size={20} color={theme.text} />
                    </View>
                    <View style={styles.faqItem}>
                        <ThemedText style={styles.faqQuestion}>How do I delete my account?</ThemedText>
                        <Feather name="chevron-down" size={20} color={theme.text} />
                    </View>
                </View>
            ) : (
                <View style={{ padding: 20, gap: 16 }}>
                    <View style={styles.contactItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Feather name="headphones" size={24} color={theme.primary} />
                            <ThemedText style={styles.contactLabel}>Customer Service</ThemedText>
                        </View>
                    </View>
                    <View style={styles.contactItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <MaterialCommunityIcons name="whatsapp" size={24} color="#25D366" />
                            <ThemedText style={styles.contactLabel}>WhatsApp</ThemedText>
                        </View>
                    </View>
                    <View style={styles.contactItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <MaterialCommunityIcons name="web" size={24} color="#FFF" />
                            <ThemedText style={styles.contactLabel}>Website</ThemedText>
                        </View>
                    </View>
                    <View style={styles.contactItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <MaterialCommunityIcons name="facebook" size={24} color="#1877F2" />
                            <ThemedText style={styles.contactLabel}>Facebook</ThemedText>
                        </View>
                    </View>
                </View>
            )}
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#111827" },
    header: { height: 100, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 20 },
    backButton: { padding: 4 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    scrollContent: { padding: 24, gap: 24 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    rowLabel: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16 },
    navRowText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    greyButton: { backgroundColor: '#1F2937', padding: 16, borderRadius: 30, alignItems: 'center' },
    greyButtonText: { color: '#FFF', fontWeight: '700' },
    sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 16, color: '#FFF' },
    langRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
    langText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
    radioOuter: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4B5563', justifyContent: 'center', alignItems: 'center' },
    radioInner: { width: 10, height: 10, borderRadius: 5 },
    friendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
    friendInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1F2937', justifyContent: 'center', alignItems: 'center' },
    avatarInitial: { fontSize: 20, fontWeight: '700', color: '#FFF' },
    friendName: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    friendPhone: { fontSize: 13, color: '#9CA3AF' },
    inviteButton: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20 },
    inviteText: { fontSize: 12, fontWeight: '700' },
    paymentCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: '#1F2937', borderRadius: 16, marginBottom: 16 },
    paymentLabel: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    connectedText: { fontSize: 12, color: '#7C3AED', fontWeight: '700' },
    mastercardIcon: { width: 24, height: 16, position: 'relative' },
    circle: { width: 16, height: 16, borderRadius: 8, position: 'absolute', opacity: 0.8 },
    divider: { height: 1, backgroundColor: '#374151' },
    addButton: { width: '100%', padding: 16, borderRadius: 30, alignItems: 'center', marginTop: 16 },
    addButtonText: { color: '#FFF', fontWeight: '800' },
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 16 },
    tabText: { fontSize: 16, fontWeight: '700', color: '#9CA3AF' },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1F2937', borderRadius: 12, padding: 12, marginBottom: 20 },
    searchInput: { marginLeft: 10, flex: 1, fontSize: 15 },
    chipRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
    chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#7C3AED' },
    faqItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
    faqQuestion: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    contactItem: { padding: 16, backgroundColor: '#1F2937', borderRadius: 16 },
    contactLabel: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
