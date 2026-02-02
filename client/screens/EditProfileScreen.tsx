import React, { useState, useLayoutEffect } from "react";
import { StyleSheet, View, ScrollView, TextInput as RNTextInput, KeyboardAvoidingView, Platform, Pressable, Image, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/query-client";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { ThemedText } from "@/components/ThemedText";
import { Icon } from "@/components/Icon";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

export default function EditProfileScreen({ navigation }: any) {
    const { theme } = useTheme();
    const { user, updateUser, refreshUser } = useAuth();
    const insets = useSafeAreaInsets();
    const queryClient = useQueryClient();

    const [name, setName] = useState(user?.name || "");
    const [bio, setBio] = useState(user?.bio || "");
    const [image, setImage] = useState<string | null>((user as any)?.profileImage || null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerTitle: "Edit Profile",
            headerTransparent: true,
            headerStyle: { backgroundColor: 'transparent' },
            headerShadowVisible: false,
            headerTintColor: theme.text,
        });
    }, [navigation, theme]);

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
            if (data.user) {
                updateUser(data.user);
            }
            // Refresh user data from server to get the latest profile image
            await refreshUser();
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            navigation.goBack();
        },
        onError: (error: any) => {
            console.error("Profile Update Error:", error);
            alert("Failed to update profile: " + error.message);
        }
    });

    const pickImage = async () => {
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

    return (
        <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
            <LinearGradient
                colors={[theme.primary + '15', 'transparent']}
                style={StyleSheet.absoluteFill}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <ScrollView
                    contentContainerStyle={{
                        padding: Spacing.lg,
                        paddingTop: insets.top + (Platform.OS === 'ios' ? 60 : 80),
                        paddingBottom: insets.bottom + 40
                    }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Avatar Section */}
                    <Animated.View
                        entering={FadeInUp.duration(600).springify()}
                        style={styles.avatarSection}
                    >
                        <Pressable onPress={pickImage} style={styles.avatarWrapper}>
                            <View style={[styles.avatarContainer, { backgroundColor: theme.backgroundSecondary }]}>
                                {image || user?.id ? (
                                    <View style={styles.avatarWrapperInner}>
                                        <Image
                                            source={{ uri: image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}` }}
                                            style={styles.avatar}
                                        />
                                    </View>
                                ) : (
                                    <ThemedText style={styles.avatarPlaceholderText}>
                                        {user?.name?.charAt(0).toUpperCase()}
                                    </ThemedText>
                                )}
                            </View>
                            <View style={[styles.editBadge, { backgroundColor: theme.primary, borderColor: theme.backgroundRoot }]}>
                                <Icon name="camera" size={16} color="#fff" />
                            </View>
                        </Pressable>
                        <ThemedText type="small" style={{ color: theme.primary, marginTop: Spacing.md, fontWeight: '700', letterSpacing: 0.5 }}>
                            CHANGE AVATAR
                        </ThemedText>
                    </Animated.View>

                    {/* Form Fields */}
                    <Animated.View
                        entering={FadeInDown.delay(200).duration(600).springify()}
                        style={styles.formContainer}
                    >
                        <Input
                            label="FULL NAME"
                            placeholder="Enter your full name"
                            value={name}
                            onChangeText={setName}
                            style={styles.input}
                        />

                        <View style={styles.fieldWrapper}>
                            <ThemedText type="small" style={styles.label}>BIO</ThemedText>
                            <RNTextInput
                                style={[
                                    styles.bioInput,
                                    {
                                        backgroundColor: theme.backgroundDefault,
                                        color: theme.text,
                                        borderColor: theme.border
                                    }
                                ]}
                                value={bio}
                                onChangeText={setBio}
                                placeholder="Describe yourself..."
                                placeholderTextColor={theme.textSecondary}
                                multiline
                                textAlignVertical="top"
                            />
                        </View>

                        <Input
                            label="EMAIL ACCOUNT"
                            value={user?.email}
                            editable={false}
                            style={[styles.input, { backgroundColor: theme.backgroundSecondary, opacity: 0.6 }]}
                        />
                    </Animated.View>

                    {/* Action Button */}
                    <Animated.View
                        entering={FadeInDown.delay(400).duration(600).springify()}
                        style={{ marginTop: Spacing['3xl'] }}
                    >
                        <Button
                            onPress={() => updateMutation.mutate({ name, bio })}
                            disabled={updateMutation.isPending}
                            style={styles.saveButton}
                        >
                            {updateMutation.isPending ? "SAVING..." : "SAVE CHANGES"}
                        </Button>

                        <Pressable
                            onPress={() => navigation.goBack()}
                            style={styles.cancelButton}
                        >
                            <ThemedText style={{ color: theme.textSecondary, fontWeight: '700', letterSpacing: 1 }}>
                                DISCARD
                            </ThemedText>
                        </Pressable>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    avatarSection: {
        alignItems: 'center',
        marginBottom: Spacing['3xl'],
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarContainer: {
        width: 130,
        height: 130,
        borderRadius: 65,
        justifyContent: 'center',
        alignItems: 'center',
        ...Shadows.lg,
    },
    avatarWrapperInner: {
        width: '100%',
        height: '100%',
        borderRadius: 65,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholderText: {
        fontSize: 48,
        fontWeight: 'bold',
        opacity: 0.8,
    },
    editBadge: {
        position: 'absolute',
        bottom: 5,
        right: 5,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 4,
        ...Shadows.md,
    },
    formContainer: {
        gap: Spacing.xl,
    },
    fieldWrapper: {
        width: '100%',
    },
    label: {
        marginBottom: Spacing.xs,
        fontWeight: "800",
        opacity: 0.5,
        letterSpacing: 1.5,
        fontSize: 11,
    },
    input: {
        height: 60,
        borderRadius: BorderRadius.md,
        fontSize: 16,
    },
    bioInput: {
        borderRadius: BorderRadius.md,
        borderWidth: 1,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.lg,
        fontSize: 16,
        minHeight: 140,
        lineHeight: 24,
    },
    saveButton: {
        width: '100%',
        height: 60,
        borderRadius: BorderRadius.lg,
        ...Shadows.lg,
    },
    cancelButton: {
        marginTop: Spacing.xl,
        alignItems: 'center',
        paddingVertical: Spacing.md,
    }
});
