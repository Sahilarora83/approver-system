import React, { useState, useLayoutEffect } from "react";
import { StyleSheet, View, ScrollView, TextInput as RNTextInput, KeyboardAvoidingView, Platform, Pressable, Image, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming } from "react-native-reanimated";
import { BlurView } from "expo-blur";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function EditProfileScreen({ navigation }: any) {
    const { theme } = useTheme();
    const { user, updateUser, refreshUser } = useAuth();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [image, setImage] = useState<string | null>((user as any)?.profileImage || null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    const buttonScale = useSharedValue(1);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "",
            headerTransparent: true,
            headerLeft: () => (
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.goBack();
                    }}
                    style={styles.backButton}
                >
                    <Feather name="arrow-left" size={24} color="#FFF" />
                </Pressable>
            ),
        });
    }, [navigation]);

    const updateMutation = useMutation({
        mutationFn: async (data: { name: string; bio: string }) => {
            let profileImageUrl = (user as any)?.profileImage;

            if (imageBase64) {
                const uploadRes = await apiRequest("POST", "/api/upload", {
                    image: `data:image/jpeg;base64,${imageBase64}`
                });
                if (!uploadRes.ok) throw new Error("Failed to upload image");
                const uploadData = await uploadRes.json();
                profileImageUrl = uploadData.url;
            }

            const res = await apiRequest("PATCH", "/api/user", {
                ...data,
                profileImage: profileImageUrl
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || "Failed to update profile");
            }
            return res.json();
        },
        onSuccess: async (data) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (data.user) {
                updateUser(data.user);
            }
            await refreshUser();
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            navigation.goBack();
        },
        onError: (error: any) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert("Error", error.message);
        }
    });

    const pickImage = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images',
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setImageBase64(result.assets[0].base64 || null);
        }
    };

    const animatedButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: buttonScale.value }]
    }));

    const onPressIn = () => (buttonScale.value = withSpring(0.95));
    const onPressOut = () => (buttonScale.value = withSpring(1));

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={["#0F172A", "#1E1B4B", "#0F172A"]}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={[
                        styles.scrollContent,
                        { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 40 }
                    ]}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Header Text */}
                    <Animated.View entering={FadeInUp.duration(600).springify()}>
                        <ThemedText style={styles.headerLabel}>Edit Profile</ThemedText>
                        <ThemedText style={styles.subLabel}>Customize your online presence</ThemedText>
                    </Animated.View>

                    {/* Avatar Modern Section */}
                    <Animated.View
                        entering={FadeInUp.delay(200).duration(600).springify()}
                        style={styles.avatarContainer}
                    >
                        <Pressable onPress={pickImage} style={styles.avatarPressable}>
                            <View style={styles.avatarOuterRing}>
                                <LinearGradient
                                    colors={["#7C3AED", "#C026D3"]}
                                    style={styles.avatarGradient}
                                >
                                    <View style={styles.avatarInner}>
                                        <Image
                                            source={{ uri: image ? (image.startsWith('http') ? image : resolveImageUrl(image)) : resolveImageUrl(user?.profileImage) }}
                                            style={styles.avatarImage}
                                        />
                                    </View>
                                </LinearGradient>
                                <View style={styles.cameraBadge}>
                                    <Feather name="camera" size={14} color="#FFF" />
                                </View>
                            </View>
                        </Pressable>
                    </Animated.View>

                    {/* Glass Form Card */}
                    <Animated.View
                        entering={FadeInDown.delay(300).duration(600).springify()}
                        style={styles.formCard}
                    >
                        <BlurView intensity={20} tint="dark" style={styles.blur}>
                            {/* Full Name Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Feather name="user" size={14} color="#7C3AED" />
                                    <ThemedText style={styles.inputLabel}>FULL NAME</ThemedText>
                                </View>
                                <RNTextInput
                                    style={styles.textInput}
                                    placeholder="Your Name"
                                    placeholderTextColor="#4B5563"
                                    value={name}
                                    onChangeText={setName}
                                />
                            </View>

                            <View style={styles.divider} />

                            {/* Bio Input */}
                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Feather name="book-open" size={14} color="#7C3AED" />
                                    <ThemedText style={styles.inputLabel}>BIO</ThemedText>
                                </View>
                                <RNTextInput
                                    style={[styles.textInput, styles.bioInput]}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor="#4B5563"
                                    value={bio}
                                    onChangeText={setBio}
                                    multiline
                                    numberOfLines={3}
                                />
                            </View>

                            <View style={styles.divider} />

                            {/* Email (Disabled) */}
                            <View style={styles.inputGroup}>
                                <View style={styles.labelRow}>
                                    <Feather name="mail" size={14} color="#4B5563" />
                                    <ThemedText style={[styles.inputLabel, { color: '#4B5563' }]}>EMAIL ADDRESS</ThemedText>
                                </View>
                                <ThemedText style={styles.disabledText}>{user?.email}</ThemedText>
                            </View>
                        </BlurView>
                    </Animated.View>

                    {/* Actions */}
                    <Animated.View
                        entering={FadeInDown.delay(500).duration(600).springify()}
                        style={styles.footer}
                    >
                        <Pressable
                            onPressIn={onPressIn}
                            onPressOut={onPressOut}
                            onPress={() => updateMutation.mutate({ name, bio })}
                            disabled={updateMutation.isPending}
                        >
                            <Animated.View style={[styles.saveButton, animatedButtonStyle]}>
                                <LinearGradient
                                    colors={["#7C3AED", "#6D28D9"]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.saveGradient}
                                >
                                    {updateMutation.isPending ? (
                                        <ActivityIndicator color="#FFF" size="small" />
                                    ) : (
                                        <>
                                            <ThemedText style={styles.saveText}>Save Changes</ThemedText>
                                            <Feather name="check" size={18} color="#FFF" />
                                        </>
                                    )}
                                </LinearGradient>
                            </Animated.View>
                        </Pressable>

                        <Pressable
                            style={styles.cancelButton}
                            onPress={() => navigation.goBack()}
                        >
                            <ThemedText style={styles.cancelText}>Discard</ThemedText>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0F172A" },
    scrollContent: { paddingHorizontal: 24 },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.05)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    headerLabel: { fontSize: 32, fontWeight: "900", color: "#FFF", marginBottom: 4 },
    subLabel: { fontSize: 16, color: "#94A3B8", fontWeight: "500", marginBottom: 32 },
    avatarContainer: { alignItems: "center", marginBottom: 40 },
    avatarPressable: { position: "relative" },
    avatarOuterRing: {
        width: 140,
        height: 140,
        borderRadius: 70,
        padding: 4,
        backgroundColor: "rgba(124, 58, 237, 0.2)",
        justifyContent: "center",
        alignItems: "center",
    },
    avatarGradient: {
        width: "100%",
        height: "100%",
        borderRadius: 66,
        padding: 3,
        justifyContent: "center",
        alignItems: "center",
    },
    avatarInner: {
        width: "100%",
        height: "100%",
        borderRadius: 63,
        backgroundColor: "#0F172A",
        overflow: "hidden",
        borderWidth: 2,
        borderColor: "#0F172A",
    },
    avatarImage: { width: "100%", height: "100%" },
    cameraBadge: {
        position: "absolute",
        bottom: 4,
        right: 4,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#7C3AED",
        borderWidth: 3,
        borderColor: "#0F172A",
        justifyContent: "center",
        alignItems: "center",
        ...Shadows.md,
    },
    formCard: {
        borderRadius: 30,
        overflow: "hidden",
        backgroundColor: "rgba(30, 41, 59, 0.4)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    blur: { padding: 24 },
    inputGroup: { marginBottom: 20 },
    labelRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    inputLabel: { fontSize: 12, fontWeight: "800", color: "#7C3AED", letterSpacing: 1.5 },
    textInput: {
        fontSize: 16,
        color: "#FFF",
        fontWeight: "600",
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: "rgba(15, 23, 42, 0.3)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.05)",
    },
    bioInput: { minHeight: 100, textAlignVertical: "top", paddingTop: 12 },
    disabledText: { fontSize: 16, color: "#4B5563", fontWeight: "600", paddingHorizontal: 16, paddingVertical: 12 },
    divider: { height: 1, backgroundColor: "rgba(255, 255, 255, 0.03)", marginBottom: 20 },
    footer: { marginTop: 40, alignItems: "center" },
    saveButton: { width: "100%", height: 64, borderRadius: 24, overflow: "hidden", ...Shadows.lg },
    saveGradient: {
        flex: 1,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    saveText: { color: "#FFF", fontSize: 18, fontWeight: "800", letterSpacing: 0.5 },
    cancelButton: { marginTop: 24, padding: 12 },
    cancelText: { color: "#94A3B8", fontSize: 16, fontWeight: "700" },
});
