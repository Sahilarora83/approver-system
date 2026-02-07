import React, { useCallback, useLayoutEffect, useMemo } from "react";
import { StyleSheet, View, Pressable, ScrollView, Dimensions, Platform, Image, Share, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import Animated, { FadeInUp, FadeInRight, FadeInDown, useSharedValue, useAnimatedStyle, withSpring, interpolate, useAnimatedScrollHandler } from "react-native-reanimated";
import { BlurView } from "expo-blur";

const { width, height } = Dimensions.get("window");
const COVER_HEIGHT = 280;

type MenuItem = {
  icon: any;
  lib: "Feather" | "Ionicons" | "Material";
  label: string;
  onPress: () => void;
  badge?: string;
  description?: string;
};

const MenuRow = ({ item, isLast, theme }: { item: MenuItem; isLast: boolean; theme: any }) => (
  <Pressable
    onPress={() => {
      Haptics.selectionAsync();
      item.onPress();
    }}
    style={({ pressed }) => [
      styles.menuRow,
      {
        opacity: pressed ? 0.7 : 1,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "rgba(255,255,255,0.05)",
      }
    ]}
  >
    <View style={styles.menuIconBox}>
      {item.lib === "Feather" && <Feather name={item.icon} size={20} color="#7C3AED" />}
      {item.lib === "Ionicons" && <Ionicons name={item.icon} size={20} color="#7C3AED" />}
      {item.lib === "Material" && <MaterialCommunityIcons name={item.icon} size={22} color="#7C3AED" />}
    </View>
    <View style={styles.menuTextContainer}>
      <ThemedText style={styles.menuLabel}>{item.label}</ThemedText>
      {item.description && (
        <ThemedText style={styles.menuDescription}>{item.description}</ThemedText>
      )}
    </View>
    {item.badge && (
      <View style={styles.menuBadge}>
        <ThemedText style={styles.menuBadgeText}>{item.badge}</ThemedText>
      </View>
    )}
    <Feather name="chevron-right" size={16} color="#4B5563" />
  </Pressable>
);

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, refreshUser } = useAuth();
  const scrollY = useSharedValue(0);
  const [lastRefreshTime, setLastRefreshTime] = React.useState(0);

  /* API Response Validation: Ensure array */
  const { data: stats, isLoading: isStatsLoading, error } = useQuery<any>({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/stats");
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 2,
  });

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (user && (!lastRefreshTime || now - lastRefreshTime > 300000)) {
        refreshUser();
        setLastRefreshTime(now);
      }
    }, [refreshUser, user, lastRefreshTime])
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  }, []);

  const coverAnimatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [-100, 0], [1.2, 1], "clamp");
    return { transform: [{ scale }] };
  });

  const profileCardAnimatedStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 100], [0, -40], "clamp");
    return { transform: [{ translateY }] };
  });

  const handleShare = async () => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(`https://qrticket.app/user/${user?.id}`);
        // Consider adding a toast here
        return;
      }

      const result = await Share.share({
        message: `Check out my profile on QR Ticket Manager!`,
        url: `https://qrticket.app/user/${user?.id}`,
      });

      if (result.action === Share.sharedAction) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error("Share failed:", error);
    }
  };

  const safeNavigate = useCallback((routeName: string, params?: any) => {
    try {
      navigation.navigate(routeName, params);
    } catch (e) {
      console.warn(`Navigation failed:`, e);
    }
  }, [navigation]);

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorState}>
          <Ionicons name="alert-circle" size={60} color="#EF4444" />
          <ThemedText style={styles.errorText}>Failed to load profile stats</ThemedText>
          <Pressable
            style={styles.retryBtn}
            onPress={() => queryClient.invalidateQueries({ queryKey: ["userStats"] })}
          >
            <ThemedText style={styles.retryText}>Retry</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  const accountItems: MenuItem[] = [
    { icon: "user", lib: "Feather", label: "Edit Profile", description: "Name, bio, and profile image", onPress: () => safeNavigate("EditProfile") },
    {
      icon: "notifications",
      lib: "Ionicons",
      label: "Notifications",
      description: "Manage your alerts and news",
      onPress: () => safeNavigate("Notifications"),
      badge: stats?.unreadNotifications > 0
        ? (stats.unreadNotifications > 99 ? "99+" : String(stats.unreadNotifications))
        : undefined
    },
    { icon: "heart", lib: "Feather", label: "Favorites", description: "Events you've saved", onPress: () => safeNavigate("Favorites") },
    { icon: "settings", lib: "Feather", label: "Settings", description: "Privacy and app preferences", onPress: () => safeNavigate("Settings") },
  ];

  const supportItems: MenuItem[] = [
    { icon: "help-circle", lib: "Feather", label: "Help Center", onPress: () => safeNavigate("HelpCenter") },
    { icon: "shield-checkmark", lib: "Ionicons", label: "Privacy Policy", onPress: () => safeNavigate("PrivacyPolicy") },
    { icon: "information-circle", lib: "Ionicons", label: "About QR Ticket", onPress: () => safeNavigate("AboutApp") },
  ];

  return (
    <ThemedView style={styles.container}>
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
      >
        {/* Immersive Cover */}
        <View style={styles.coverWrapper}>
          <Animated.View style={[styles.coverContainer, coverAnimatedStyle]}>
            <Image
              source={{
                uri: user?.profileImage
                  ? `${resolveImageUrl(user.profileImage)}?w=800&q=75`
                  : "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=2070&auto=format&fit=crop"
              }}
              style={styles.coverImage}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["rgba(17, 24, 39, 0.4)", "rgba(17, 24, 39, 0.95)"]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </View>

        {/* Profile Card Overlay */}
        <Animated.View style={[styles.profileCard, profileCardAnimatedStyle]}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarBorder}>
              <Image
                source={{
                  uri: user?.profileImage
                    ? `${resolveImageUrl(user.profileImage)}?w=400&q=75`
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'guest'}`
                }}
                style={styles.avatar}
              />
              {user?.role === 'admin' && (
                <View style={styles.verifiedBadge}>
                  <MaterialCommunityIcons name="check-decagram" size={20} color="#7C3AED" />
                </View>
              )}
            </View>
            <View style={styles.actionHeaderButtons}>
              <Pressable style={styles.headerIconButton} onPress={handleShare}>
                <Feather name="share-2" size={20} color="#FFF" />
              </Pressable>
            </View>
          </View>

          <View style={styles.infoSection}>
            <ThemedText style={styles.userName}>{user?.name || "Guest User"}</ThemedText>
            <ThemedText style={styles.userEmail}>{user?.email}</ThemedText>
            <View style={styles.roleBadge}>
              <ThemedText style={styles.roleText}>{user?.role?.toUpperCase()}</ThemedText>
            </View>
            {user?.bio && (
              <ThemedText style={styles.bioText} numberOfLines={2}>
                {user.bio}
              </ThemedText>
            )}
          </View>

          {/* Dashboard Stats */}
          <View style={styles.statsDashboard}>
            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>{stats?.participatedEvents || 0}</ThemedText>
              <ThemedText style={styles.statTitle}>Joined</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>{stats?.following || 0}</ThemedText>
              <ThemedText style={styles.statTitle}>Following</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <ThemedText style={styles.statValue}>{stats?.followers || 0}</ThemedText>
              <ThemedText style={styles.statTitle}>Followers</ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Menu Sections */}
        <Animated.View entering={FadeInUp.delay(200)} style={styles.menuSection}>
          <ThemedText style={styles.sectionLabel}>Account Management</ThemedText>
          <View style={styles.glassMenu}>
            {accountItems.map((item, index) => (
              <MenuRow key={item.label} item={item} isLast={index === accountItems.length - 1} theme={{}} />
            ))}
          </View>

          <ThemedText style={styles.sectionLabel}>Help & Support</ThemedText>
          <View style={styles.glassMenu}>
            {supportItems.map((item, index) => (
              <MenuRow key={item.label} item={item} isLast={index === supportItems.length - 1} theme={{}} />
            ))}
          </View>

          <Pressable
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              logout();
            }}
            style={({ pressed }) => [
              styles.logoutBtn,
              { opacity: pressed ? 0.8 : 1 }
            ]}
          >
            <MaterialCommunityIcons name="logout" size={22} color="#EF4444" />
            <ThemedText style={styles.logoutText}>Sign Out</ThemedText>
          </Pressable>

          <ThemedText style={styles.versionInfo}>Version 1.0.1 (Production)</ThemedText>
        </Animated.View>
      </Animated.ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#111827" },
  coverWrapper: { height: COVER_HEIGHT, overflow: "hidden" },
  coverContainer: { width: "100%", height: "100%" },
  coverImage: { width: "100%", height: "100%" },
  profileCard: {
    marginTop: -100,
    paddingHorizontal: 24,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  avatarBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#111827",
    backgroundColor: "#111827",
    ...Shadows.lg,
  },
  avatar: { width: "100%", height: "100%", borderRadius: 60 },
  verifiedBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 2,
  },
  actionHeaderButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  infoSection: { marginBottom: 24 },
  userName: { fontSize: 28, fontWeight: "900", color: "#FFF", marginBottom: 4 },
  userEmail: { fontSize: 15, color: "#9CA3AF", fontWeight: "600", marginBottom: 12 },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.3)",
    marginBottom: 16,
  },
  roleText: { fontSize: 10, fontWeight: "800", color: "#7C3AED", letterSpacing: 1 },
  bioText: { fontSize: 14, color: "#D1D5DB", lineHeight: 22, fontWeight: "500" },
  statsDashboard: {
    flexDirection: "row",
    backgroundColor: "#1F2937",
    borderRadius: 24,
    padding: 20,
    alignItems: "center",
    justifyContent: "space-between",
    ...Shadows.md,
  },
  statBox: { flex: 1, alignItems: "center" },
  statValue: { fontSize: 20, fontWeight: "900", color: "#FFF" },
  statTitle: { fontSize: 12, color: "#9CA3AF", fontWeight: "700", marginTop: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.05)" },
  menuSection: { paddingHorizontal: 20, marginTop: 32 },
  sectionLabel: { fontSize: 13, fontWeight: "800", color: "#4B5563", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 16, marginLeft: 4 },
  glassMenu: {
    backgroundColor: "#1F2937",
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(124, 58, 237, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  menuTextContainer: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: "700", color: "#FFF" },
  menuDescription: { fontSize: 12, color: "#6B7280", marginTop: 2, fontWeight: "500" },
  menuBadge: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 8,
  },
  menuBadgeText: { fontSize: 10, fontWeight: "900", color: "#FFF" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 60,
    borderRadius: 24,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: 12,
    marginTop: 8,
  },
  logoutText: { fontSize: 16, fontWeight: "800", color: "#EF4444" },
  versionInfo: { textAlign: "center", fontSize: 12, color: "#4B5563", marginTop: 24, fontWeight: "600" },
  errorState: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  errorText: { fontSize: 18, fontWeight: "700", color: "#FFF", marginTop: 16, marginBottom: 8 },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 10, backgroundColor: "#7C3AED", borderRadius: 20, marginTop: 12 },
  retryText: { color: "#FFF", fontWeight: "700" }
});
