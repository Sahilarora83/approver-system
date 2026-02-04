import React, { useState, useEffect, useCallback } from "react";
import { StyleSheet, View, ScrollView, Pressable, Linking, Dimensions, Platform, ActivityIndicator, Modal, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";

import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns";
import MapView, { Marker } from "react-native-maps";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import * as Clipboard from 'expo-clipboard';
import Svg, { Path } from "react-native-svg";

const { width } = Dimensions.get("window");

const COLORS = {
    background: "#121421",
    card: "#1C1F35",
    primary: "#3D5CFF",
    text: "#FFFFFF",
    textSecondary: "#A0A4B8",
    accent: "#10B981",
};

export default function ParticipantEventDetailScreen({ route, navigation }: any) {
    const { eventId } = route?.params || {};
    if (!eventId) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ThemedText>Event not found</ThemedText>
                <Pressable onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <ThemedText style={{ color: COLORS.primary }}>Go Back</ThemedText>
                </Pressable>
            </ThemedView>
        );
    }

    const insets = useSafeAreaInsets();
    const { theme, isDark } = useTheme();
    const { user } = useAuth();
    const [showShareModal, setShowShareModal] = useState(false);

    // Use insets.bottom directly for safe padding at the bottom
    const tabBarHeight = insets.bottom > 0 ? insets.bottom + 60 : 80;


    const safeFormat = (date: any, formatStr: string) => {
        try {
            if (!date) return "TBD";
            const d = new Date(date);
            if (isNaN(d.getTime())) return "TBD";
            return format(d, formatStr);
        } catch (e) {
            return "TBD";
        }
    };

    const { data: event, isLoading, refetch: refetchEvent } = useQuery({
        queryKey: [`/api/events/${eventId}`],
        enabled: !!eventId,
    }) as { data: any; isLoading: boolean; refetch: any };

    const { data: attendanceData, refetch: refetchAttendance } = useQuery({
        queryKey: [`/api/events/${eventId}/registrations/count`],
        queryFn: async () => {
            try {
                const res = await apiRequest("GET", `/api/events/${eventId}/registrations`);
                const registrations = await res.json();
                const approvedRegistrations = Array.isArray(registrations) ? registrations.filter((r: any) =>
                    ['approved', 'checked_in', 'checked_out'].includes(r.status)
                ) : [];
                return {
                    count: approvedRegistrations.length,
                    registrations: approvedRegistrations
                };
            } catch {
                return { count: 0, registrations: [] };
            }
        },
        enabled: !!eventId,
    }) as { data: any; refetch: any };

    const registrationStatusQuery = useQuery({
        queryKey: ["registration-status", eventId || "no-id", user?.id || "no-user"],
        queryFn: async () => {
            if (!eventId || !user?.email) return null;
            const res = await apiRequest("GET", `/api/events/${eventId}/registration-status?email=${encodeURIComponent(user.email)}`);
            return res.json();
        },
        enabled: !!eventId && !!user?.email,
    });

    const [mapRegion, setMapRegion] = useState({
        latitude: 28.6139,
        longitude: 77.2090,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
    });

    useEffect(() => {
        const geocodeLocation = async () => {
            if (!event?.location) return;
            try {
                const response = await fetch(
                    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(event.location)}&key=AIzaSyBH1Cl0wkbKTVR5Qmyv8_3UGZe-Er_nEDE`
                );
                const data = await response.json();
                if (data.status === 'OK' && data.results?.[0]) {
                    const { lat, lng } = data.results[0].geometry.location;
                    setMapRegion({
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                    });
                }
            } catch (error) {
                console.log('[Map] Geocoding failed');
            }
        };
        geocodeLocation();
    }, [event?.location]);

    const registration = registrationStatusQuery.data?.registration;
    const registrationStatus = registration?.status ? String(registration.status).toLowerCase() : "none";
    const isRegLoading = registrationStatusQuery.isLoading && !registrationStatusQuery.data;

    useFocusEffect(
        useCallback(() => {
            refetchEvent?.();
            refetchAttendance?.();
            registrationStatusQuery.refetch?.();
        }, [refetchEvent, refetchAttendance])
    );

    const { data: followStatus, refetch: refetchFollow } = useQuery({
        queryKey: [`/api/user/follow/${event?.organizerId}/status`],
        queryFn: async () => {
            if (!event?.organizerId) return { following: false };
            const res = await apiRequest("GET", `/api/user/follow/${event.organizerId}/status`);
            return res.json();
        },
        enabled: !!event?.organizerId && !!user,
    }) as { data: any; refetch: any };

    const followMutation = useMutation({
        mutationFn: async () => {
            const method = followStatus?.following ? "DELETE" : "POST";
            await apiRequest(method, `/api/user/follow/${event.organizerId}`);
        },
        onSuccess: () => {
            refetchFollow();
            queryClient.invalidateQueries({ queryKey: ["userStats"] });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    });

    const isPending = registrationStatus === "pending";
    const isApproved = ["approved", "checked_in", "checked_out"].includes(registrationStatus);
    const isRejected = registrationStatus === "rejected";
    const isRegistered = isPending || isApproved || isRejected;

    if (isLoading || !event) {
        return (
            <ThemedView style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
            </ThemedView>
        );
    }

    const handleRegister = () => {
        if (!event) return;
        if (isApproved) {
            navigation.navigate("TicketsTab", { screen: "MyTickets" });
            return;
        }
        if (isPending || isRejected) return;
        const link = event.publicLink || event.public_link;
        if (link) {
            navigation.navigate("RegisterEvent", { eventLink: link });
        }
    };

    const getRegButtonText = () => {
        if (!isRegistered) return "Request to Join";
        if (isPending) return "Pending Approval";
        if (isApproved) return "Joined • View Ticket";
        if (isRejected) return "Registration Rejected";
        return "Request to Join";
    };

    const isButtonDisabled = isRegLoading || isPending || isRejected;
    const handleOpenMap = () => {
        if (!event.location) return;
        const query = encodeURIComponent(event.location);
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
    };

    return (
        <View style={[styles.container, { backgroundColor: COLORS.background }]}>
            <ScrollView
                bounces={true}
                contentContainerStyle={{ paddingBottom: 20 + tabBarHeight }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.imageContainer}>
                    {event.coverImage ? (
                        <Image source={{ uri: resolveImageUrl(event.coverImage) }} style={styles.headerImage} contentFit="cover" transition={200} />
                    ) : (
                        <LinearGradient colors={['#4c669f', '#3b5998', '#192f6a']} style={styles.headerImage}>
                            <Feather name="calendar" size={60} color="rgba(255,255,255,0.3)" />
                        </LinearGradient>
                    )}
                    <Pressable
                        style={[styles.backButton, { top: insets.top + 10 }]}
                        onPress={() => navigation.goBack()}
                    >
                        <Feather name="arrow-left" size={24} color="#fff" />
                    </Pressable>
                    <Pressable
                        style={[styles.backButton, { top: insets.top + 10, left: undefined, right: 20 }]}
                        onPress={() => setShowShareModal(true)}
                    >
                        <Feather name="share-2" size={22} color="#fff" />
                    </Pressable>
                </View>

                <View style={styles.mainContent}>
                    <View style={styles.featuredBadge}>
                        <Feather name="home" size={14} color="#FFA500" />
                        <ThemedText style={styles.featuredText}>Featured in {event.location?.split(',').pop()?.trim() || "Local"}</ThemedText>
                        <Feather name="chevron-right" size={14} color="#A0A4B8" />
                    </View>

                    <ThemedText style={styles.eventTitleText}>{event.title}</ThemedText>

                    <View style={styles.metaInfo}>
                        <View style={styles.metaLine}>
                            <View style={styles.metaIconCircle}>
                                <Feather name="calendar" size={16} color={COLORS.textSecondary} />
                            </View>
                            <View>
                                <ThemedText style={styles.metaMainText}>{safeFormat(event.startDate, "EEEE, d MMMM")}</ThemedText>
                                <ThemedText style={styles.metaSubText}>
                                    {safeFormat(event.startDate, "h:mm a")} - {event.endDate ? safeFormat(event.endDate, "h:mm a") : "Late"}
                                </ThemedText>
                            </View>
                        </View>
                    </View>

                    <View style={styles.registrationCard}>
                        <ThemedText style={styles.regHeader}>Registration</ThemedText>

                        {event.requiresApproval && (
                            <View style={styles.approvalInfo}>
                                <Feather name="user" size={18} color="#A0A4B8" style={styles.approvalIcon} />
                                <View style={{ flex: 1 }}>
                                    <ThemedText style={styles.approvalTitle}>Approval Required</ThemedText>
                                    <ThemedText style={styles.approvalDesc}>Your registration is subject to host approval.</ThemedText>
                                </View>
                            </View>
                        )}

                        <ThemedText style={styles.welcomeText}>Welcome! To join the event, please register below.</ThemedText>

                        <View style={styles.userSnippet}>
                            <View style={styles.userAvatar}>
                                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{user?.name?.[0] || 'U'}</ThemedText>
                            </View>
                            <View>
                                <ThemedText style={styles.userName}>{user?.name || "Your Profile"}</ThemedText>
                                <ThemedText style={styles.userEmail}>{user?.email || "Ready to register"}</ThemedText>
                            </View>
                        </View>

                        <Pressable
                            style={[
                                styles.regButtonInner,
                                (!isRegistered) && {
                                    backgroundColor: '#FFF',
                                    shadowColor: "#000",
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.1,
                                    shadowRadius: 10,
                                    elevation: 2
                                },
                                isPending && { backgroundColor: 'rgba(255, 165, 0, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 165, 0, 0.3)' },
                                isApproved && { backgroundColor: COLORS.accent },
                                isRejected && { backgroundColor: 'rgba(255, 75, 75, 0.1)', borderWidth: 1, borderColor: 'rgba(255, 75, 75, 0.3)' }
                            ]}
                            onPress={handleRegister}
                            disabled={isButtonDisabled}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                {isRegLoading && <ActivityIndicator size="small" color={!isRegistered ? "#000" : "#FFA500"} />}
                                {!isRegLoading && isPending && <Feather name="clock" size={16} color="#FFA500" />}
                                {!isRegLoading && isApproved && <Feather name="check" size={16} color="#FFF" />}
                                {!isRegLoading && isRejected && <Feather name="x-circle" size={16} color="#FF4B4B" />}

                                <ThemedText style={[
                                    styles.regButtonInnerText,
                                    (!isRegistered) && { color: '#000' },
                                    isPending && { color: '#FFA500' },
                                    isApproved && { color: '#FFF' },
                                    isRejected && { color: '#FF4B4B' }
                                ]}>
                                    {isRegLoading ? "Checking..." : getRegButtonText()}
                                </ThemedText>
                            </View>
                        </Pressable>
                    </View>

                    <View style={styles.sectionHeaderNew}>
                        <ThemedText style={styles.sectionTitleNew}>About Event</ThemedText>
                    </View>
                    <ThemedText style={styles.descriptionNew}>
                        {event.description || "No description provided."}
                    </ThemedText>

                    <View style={styles.sectionHeaderNew}>
                        <ThemedText style={styles.sectionTitleNew}>Location</ThemedText>
                    </View>

                    <View style={styles.locationInfoCard}>
                        <ThemedText style={styles.locationNameText}>{event.location?.split(',')[0]}</ThemedText>
                        <ThemedText style={styles.locationAddressText}>{event.location}</ThemedText>

                        {event.location && (
                            <Pressable onPress={handleOpenMap} style={styles.mapContainerNew}>
                                <View style={[styles.mapImageNew, { backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' }]}>
                                    <Feather name="map" size={40} color="rgba(255,255,255,0.1)" />
                                    <ThemedText style={{ color: 'rgba(255,255,255,0.3)', marginTop: 12 }}>Map Preview Unavailable</ThemedText>
                                </View>
                                <View style={styles.mapOverlayNew}>
                                    <View style={styles.mapBadgeNew}>
                                        <Feather name="navigation" size={14} color={COLORS.primary} />
                                        <ThemedText style={{ color: COLORS.primary, fontSize: 12, fontWeight: 'bold', marginLeft: 4 }}>Open in Maps</ThemedText>
                                    </View>
                                </View>
                            </Pressable>
                        )}

                    </View>

                    <View style={styles.sectionHeaderNew}>
                        <ThemedText style={styles.sectionTitleNew}>Hosted By</ThemedText>
                    </View>
                    <View style={styles.hostsList}>
                        {(() => {
                            const hostsData = Array.isArray(event.socialLinks)
                                ? event.socialLinks
                                : (event.hostedBy || "Organizer").split(',').map((name: string) => ({
                                    name: name.trim(),
                                    instagram: event.socialLinks?.instagram,
                                    twitter: event.socialLinks?.twitter,
                                    linkedin: event.socialLinks?.linkedin
                                }));

                            return hostsData.map((host: any, index: number) => (
                                <View key={index} style={styles.hostRowSmall}>
                                    <View style={[styles.hostAvatarSmall, { overflow: 'hidden' }]}>
                                        {index === 0 && event.organizerProfileImage ? (
                                            <Image source={{ uri: resolveImageUrl(event.organizerProfileImage) }} style={styles.hostAvatarImageSmall} />
                                        ) : (
                                            <ThemedText style={styles.hostInitialSmall}>{host.name?.[0]?.toUpperCase() || '?'}</ThemedText>
                                        )}
                                    </View>
                                    <ThemedText style={styles.hostNameSmall}>{host.name}</ThemedText>
                                    <View style={styles.socialIconsSmall}>
                                        {host.instagram ? (
                                            <Pressable onPress={() => Linking.openURL(host.instagram)}>
                                                <Feather name="instagram" size={16} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                                            </Pressable>
                                        ) : null}
                                        {host.twitter ? (
                                            <Pressable onPress={() => Linking.openURL(host.twitter)}>
                                                <Feather name="twitter" size={16} color={COLORS.textSecondary} style={{ marginRight: 10 }} />
                                            </Pressable>
                                        ) : null}
                                        {host.linkedin ? (
                                            <Pressable onPress={() => Linking.openURL(host.linkedin)}>
                                                <Feather name="linkedin" size={16} color={COLORS.textSecondary} />
                                            </Pressable>
                                        ) : null}

                                        {index === 0 && user?.id !== event.organizerId && (
                                            <Pressable
                                                onPress={() => followMutation.mutate()}
                                                disabled={followMutation.isPending}
                                                style={{
                                                    marginLeft: 15,
                                                    paddingHorizontal: 12,
                                                    paddingVertical: 6,
                                                    borderRadius: 20,
                                                    backgroundColor: followStatus?.following ? 'transparent' : COLORS.primary,
                                                    borderWidth: followStatus?.following ? 1 : 0,
                                                    borderColor: followStatus?.following ? 'rgba(160,164,184,0.3)' : 'transparent',
                                                    flexDirection: 'row',
                                                    alignItems: 'center',
                                                    minWidth: 80,
                                                    justifyContent: 'center'
                                                }}
                                            >
                                                {followMutation.isPending ? (
                                                    <ActivityIndicator size="small" color={followStatus?.following ? COLORS.textSecondary : "#FFF"} />
                                                ) : (
                                                    <>
                                                        <Feather
                                                            name={followStatus?.following ? "check" : "user-plus"}
                                                            size={12}
                                                            color={followStatus?.following ? COLORS.accent : "#FFF"}
                                                            style={{ marginRight: 4 }}
                                                        />
                                                        <ThemedText style={{
                                                            fontSize: 11,
                                                            fontWeight: '800',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 0.5,
                                                            color: followStatus?.following ? COLORS.textSecondary : '#FFF'
                                                        }}>
                                                            {followStatus?.following ? 'Following' : 'Follow'}
                                                        </ThemedText>
                                                    </>
                                                )}
                                            </Pressable>
                                        )}
                                    </View>
                                </View>
                            ));
                        })()}
                    </View>

                    <View style={styles.sectionHeaderNew}>
                        <ThemedText style={styles.sectionTitleNew}>Attendance</ThemedText>
                    </View>
                    <View style={styles.attendanceRow}>
                        <ThemedText style={styles.goingCount}>
                            {attendanceData?.count || 0} Going
                        </ThemedText>
                        <View style={styles.avatarPile}>
                            {(attendanceData?.registrations || []).slice(0, 5).map((reg: any, i: number) => (
                                <View
                                    key={reg.id || i}
                                    style={[
                                        styles.pileAvatar,
                                        {
                                            marginLeft: i === 0 ? 0 : -12,
                                            backgroundColor: i % 2 === 0 ? COLORS.primary : COLORS.accent,
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden'
                                        }
                                    ]}
                                >
                                    {reg.profileImage ? (
                                        <Image source={{ uri: resolveImageUrl(reg.profileImage) }} style={{ width: '100%', height: '100%' }} />
                                    ) : (
                                        <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                                            {reg.name?.[0]?.toUpperCase() || '?'}
                                        </ThemedText>
                                    )}
                                </View>
                            ))}
                            {(attendanceData?.count || 0) > 5 && (
                                <View style={[styles.pileAvatar, { marginLeft: -12, backgroundColor: '#333', alignItems: 'center', justifyContent: 'center' }]}>
                                    <ThemedText style={{ color: '#fff', fontSize: 10 }}>+{(attendanceData?.count || 0) - 5}</ThemedText>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </ScrollView>

            <Modal
                visible={showShareModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowShareModal(false)}
            >
                <Pressable style={styles.modalOverlay} onPress={() => setShowShareModal(false)}>
                    <Pressable style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]} onPress={e => e.stopPropagation()}>
                        <View style={styles.modalIndicator} />
                        <View style={styles.modalHeader}>
                            <ThemedText style={styles.modalTitle}>Share this Event</ThemedText>
                        </View>

                        <View style={styles.shareGrid}>
                            <ShareButton
                                name="WhatsApp"
                                color="#25D366"
                                iconComponent={<WhatsAppSVG />}
                                onPress={() => {
                                    const link = event.publicLink || event.public_link;
                                    Linking.openURL(`whatsapp://send?text=${encodeURIComponent(`Check out this event: ${event.title} \n${link}`)}`);
                                }}
                            />
                            <ShareButton
                                name="X / Twitter"
                                color="#000000"
                                iconComponent={<TwitterSVG />}
                                onPress={() => {
                                    const link = event.publicLink || event.public_link;
                                    Linking.openURL(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out this event: ${event.title}`)}&url=${encodeURIComponent(link)}`);
                                }}
                            />
                            <ShareButton
                                name="LinkedIn"
                                color="#0A66C2"
                                iconComponent={<LinkedInSVG />}
                                onPress={() => {
                                    const link = event.publicLink || event.public_link;
                                    Linking.openURL(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(link)}`);
                                }}
                            />
                            <ShareButton
                                name="Copy Link"
                                color="#555"
                                iconComponent={<Feather name="link" size={24} color="#fff" />}
                                onPress={async () => {
                                    const link = event.publicLink || event.public_link;
                                    await Clipboard.setStringAsync(link);
                                    Alert.alert("Copied", "Event link copied to clipboard");
                                    setShowShareModal(false);
                                }}
                            />
                        </View>
                        <Pressable style={styles.cancelButton} onPress={() => setShowShareModal(false)}>
                            <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const ShareButton = ({ name, color, iconComponent, onPress }: any) => (
    <Pressable style={styles.shareButton} onPress={onPress}>
        <View style={[styles.shareIconCircle, { backgroundColor: color }]}>
            {iconComponent}
        </View>
        <ThemedText style={styles.shareButtonText}>{name}</ThemedText>
    </Pressable>
);

const WhatsAppSVG = () => (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="#FFF">
        <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </Svg>
);

const TwitterSVG = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="#FFF">
        <Path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H12.96l-5.216-6.817L2.49 21.75H-0.817l7.55-8.627L-0.34 2.25h10.198l4.897 6.47 3.489-6.47h0.001Zm-1.16 17.525h1.833L7.086 4.126H5.117L17.084 19.775Z" />
    </Svg>
);

const LinkedInSVG = () => (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="#FFF">
        <Path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
    </Svg>
);

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    imageContainer: { height: 300, width: '100%', position: 'relative' },
    headerImage: { width: '100%', height: 300 },
    backButton: { position: 'absolute', left: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
    mainContent: { paddingHorizontal: 20, paddingTop: 20 },
    featuredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,165,0,0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 16 },
    featuredText: { color: '#A0A4B8', fontSize: 12, fontWeight: '600', marginHorizontal: 6 },
    eventTitleText: { fontSize: 28, fontWeight: '900', color: '#FFF', marginBottom: 24 },
    metaInfo: { gap: 20, marginBottom: 30 },
    metaLine: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    metaIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(160,164,184,0.1)', alignItems: 'center', justifyContent: 'center' },
    metaMainText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    metaSubText: { fontSize: 13, color: '#A0A4B8', marginTop: 2 },
    registrationCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    regHeader: { fontSize: 14, fontWeight: '800', color: '#A0A4B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    approvalInfo: { flexDirection: 'row', backgroundColor: 'rgba(160,164,184,0.1)', padding: 12, borderRadius: 12, marginBottom: 16 },
    approvalIcon: { marginRight: 10 },
    approvalTitle: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    approvalDesc: { fontSize: 12, color: '#A0A4B8' },
    welcomeText: { fontSize: 15, color: '#FFF', fontWeight: '600', marginBottom: 16 },
    userSnippet: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    userAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    userName: { fontSize: 15, fontWeight: '700', color: '#FFF' },
    userEmail: { fontSize: 13, color: '#A0A4B8' },
    regButtonInner: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    regButtonInnerText: { fontSize: 16, fontWeight: '800' },
    sectionHeaderNew: { marginBottom: 16 },
    sectionTitleNew: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    descriptionNew: { fontSize: 16, lineHeight: 24, color: '#A0A4B8', marginBottom: 32 },
    locationInfoCard: { backgroundColor: COLORS.card, borderRadius: 24, padding: 20, marginBottom: 32 },
    locationNameText: { fontSize: 18, fontWeight: '800', color: '#FFF', marginBottom: 4 },
    locationAddressText: { fontSize: 14, color: '#A0A4B8', marginBottom: 20 },
    mapContainerNew: { height: 200, borderRadius: 16, overflow: 'hidden', position: 'relative' },
    mapImageNew: { width: '100%', height: '100%' },
    mapOverlayNew: { position: 'absolute', bottom: 12, right: 12 },
    mapBadgeNew: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
    hostsList: { gap: 16, marginBottom: 32 },
    hostRowSmall: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    hostAvatarSmall: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
    hostAvatarImageSmall: { width: '100%', height: '100%' },
    hostInitialSmall: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    hostNameSmall: { fontSize: 16, fontWeight: '700', color: '#FFF', flex: 1 },
    socialIconsSmall: { flexDirection: 'row', alignItems: 'center' },
    attendanceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 40 },
    goingCount: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    avatarPile: { flexDirection: 'row' },
    pileAvatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, borderColor: COLORS.background },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24 },
    modalIndicator: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, alignSelf: 'center', marginBottom: 24 },
    modalHeader: { marginBottom: 24 },
    modalTitle: { fontSize: 24, fontWeight: '900', color: '#FFF', textAlign: 'center' },
    shareGrid: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 32 },
    shareButton: { alignItems: 'center', gap: 12 },
    shareIconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
    shareButtonText: { fontSize: 12, fontWeight: '700', color: '#A0A4B8' },
    cancelButton: { paddingVertical: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    cancelButtonText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
