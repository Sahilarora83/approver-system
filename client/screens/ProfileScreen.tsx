import React, { useCallback, memo, useLayoutEffect, useEffect } from "react";
import { StyleSheet, View, Pressable, ScrollView, Dimensions, Platform, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Icon, IconName } from "@/components/Icon";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getApiUrl, resolveImageUrl } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";
import { navigationRef } from "@/App";

const { width } = Dimensions.get("window");

type MenuItem = {
  icon: IconName;
  label: string;
  onPress: () => void;
  badge?: string;
  color?: string;
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
        borderBottomColor: theme.border,
      }
    ]}
  >
    <View style={[styles.iconBox, { backgroundColor: item.color || `${theme.primary}15` }]}>
      <Icon name={item.icon} size={20} color={item.color ? '#fff' : theme.primary} />
    </View>
    <View style={styles.menuTextContainer}>
      <ThemedText type="body" style={{ fontSize: 16, fontWeight: '500' }}>{item.label}</ThemedText>
    </View>
    {item.badge && (
      <View style={[styles.badge, { backgroundColor: theme.error }]}>
        <ThemedText style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{item.badge}</ThemedText>
      </View>
    )}
    <Icon name="chevron-right" size={16} color={theme.textSecondary} />
  </Pressable>
);

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout, refreshUser } = useAuth();

  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/stats");
      return res.json();
    },
    enabled: !!user,
    staleTime: 30000, // Reduced staleTime for better sync while keeping cache benefits
  });

  // Background refresh when screen comes into focus without blocking UI
  useFocusEffect(
    useCallback(() => {
      if (user) refreshUser();
    }, [refreshUser])
  );

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleLogout = useCallback(async () => {
    // Instant feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // This updates the global 'user' state to null, 
    // which triggers RootStackNavigator to show LoginScreen instantly.
    logout();
  }, [logout]);


  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Organizer";
      case "participant": return "Participant";
      case "verifier": return "Verifier";
      case "guest": return "Guest";
      default: return role;
    }
  };

  const accountItems: MenuItem[] = [
    { icon: "user", label: "Edit Profile", onPress: () => navigation.navigate("EditProfile") },
    { icon: "settings", label: "Settings", onPress: () => navigation.navigate("Settings") },
    {
      icon: "bell",
      label: "Notifications",
      onPress: () => navigation.navigate("Notifications"),
      badge: stats?.unreadNotifications > 0 ? String(stats.unreadNotifications) : undefined
    },
  ];

  const supportItems: MenuItem[] = [
    { icon: "help-circle", label: "Help Center", onPress: () => navigation.navigate("HelpCenter") },
    { icon: "info", label: "About App", onPress: () => navigation.navigate("AboutApp") },
    { icon: "shield", label: "Privacy Policy", onPress: () => navigation.navigate("PrivacyPolicy") },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + Spacing.lg,
          paddingBottom: tabBarHeight + Spacing.xl,
          paddingHorizontal: Spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title */}
        <View style={styles.headerTitleRow}>
          <ThemedText type="h1" style={{ fontSize: 32 }}>Profile</ThemedText>
          {/* Optional Top Actions could go here */}
        </View>

        {/* User Identity Card */}
        <View style={[styles.identityCard, { backgroundColor: 'transparent' }]}>
          <View style={[styles.avatarContainer, { borderColor: theme.primary }]}>
            {/* ROBUST IMAGE RESOLVER (Matches EditProfile pattern) */}
            <View style={styles.avatarWrapperInner}>
              <Image
                source={{
                  uri: user?.profileImage
                    ? `${resolveImageUrl(user.profileImage)}?t=${new Date().getTime()}`
                    : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'guest'}`
                }}
                style={styles.avatarImage}
                resizeMode="cover"
                onError={(e) => console.log("[Profile Image] Load Error:", e.nativeEvent.error)}
              />
            </View>
            {user?.role === 'admin' && (
              <View style={styles.verifiedBadge}>
                <Icon name="check" size={10} color="#fff" />
              </View>
            )}
          </View>

          <ThemedText type="h2" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            {user?.name || "Guest User"}
          </ThemedText>
          <ThemedText style={{ color: theme.textSecondary, marginTop: 4, textAlign: 'center' }}>
            {user?.email || "Sign in to access features"}
          </ThemedText>

          <View style={[styles.rolePill, { backgroundColor: `${theme.primary}20` }]}>
            <ThemedText style={{ color: theme.primary, fontSize: 10, fontWeight: '700', textTransform: 'uppercase' }}>
              {getRoleLabel(user?.role || 'guest')}
            </ThemedText>
          </View>
        </View>

        {/* Stats Row */}
        {user && (
          <View style={[styles.statsContainer, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
            <View style={styles.statItem}>
              <ThemedText type="h3">
                {user.role === 'admin' ? stats?.createdEvents || 0 : stats?.participatedEvents || 0}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Events</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="h3">{stats?.tickets || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Tickets</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText type="h3">{stats?.following || 0}</ThemedText>
              <ThemedText style={styles.statLabel}>Following</ThemedText>
            </View>
          </View>
        )}

        {/* Menu Sections */}
        <ThemedText style={styles.sectionTitle}>ACCOUNT</ThemedText>
        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
          {accountItems.map((item, index) => (
            <MenuRow
              key={item.label}
              item={item}
              isLast={index === accountItems.length - 1}
              theme={theme}
            />
          ))}
        </View>

        <ThemedText style={styles.sectionTitle}>SUPPORT</ThemedText>
        <View style={[styles.menuCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
          {supportItems.map((item, index) => (
            <MenuRow
              key={item.label}
              item={item}
              isLast={index === supportItems.length - 1}
              theme={theme}
            />
          ))}
        </View>

        {/* Logout */}
        <View style={{ marginTop: Spacing.xl }}>
          <Pressable
            onPress={handleLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              {
                backgroundColor: pressed ? `${theme.error}20` : 'transparent',
                borderColor: theme.error,
              }
            ]}
          >
            <Icon name="log-out" size={20} color={theme.error} />
            <ThemedText style={{ color: theme.error, fontWeight: '600' }}>
              {user ? "Log Out" : "Log In"}
            </ThemedText>
          </Pressable>
        </View>

        <ThemedText style={styles.versionText}>Global Scale App v1.0.0</ThemedText>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleRow: {
    marginBottom: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  identityCard: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarWrapperInner: {
    width: '100%',
    height: '100%',
    borderRadius: 100, // Ensure perfect circle
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  avatarFill: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#25D366',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000', // Match background or adjust
  },
  rolePill: {
    marginTop: Spacing.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.lg,
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    opacity: 0.1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
    marginLeft: Spacing.xs,
    opacity: 0.5,
  },
  menuCard: {
    borderRadius: BorderRadius.xl,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  menuTextContainer: {
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: Spacing.sm,
  },
  logoutButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  versionText: {
    textAlign: 'center',
    marginTop: Spacing.xl,
    opacity: 0.3,
    fontSize: 12,
  },
});
