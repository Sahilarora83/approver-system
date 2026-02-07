import React, { useCallback, useState } from "react";
import { StyleSheet, View, Pressable, ScrollView, Switch, Image, Alert, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useFocusEffect } from "@react-navigation/native";
import { Feather, Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, resolveImageUrl, queryClient } from "@/lib/query-client";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, Shadows } from "@/constants/theme";
import Animated, { FadeInDown } from "react-native-reanimated";

export default function ProfileScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { user, logout, refreshUser } = useAuth();
  const { theme, isDark } = useTheme();
  const [lastRefreshTime, setLastRefreshTime] = useState(0);

  const { data: stats } = useQuery<any>({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/stats");
      return res.json();
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
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

  const safeNavigate = (routeName: string, params?: any) => {
    try {
      navigation.navigate(routeName, params);
    } catch (e) {
      console.warn(`Navigation failed:`, e);
    }
  };

  const MenuItem = ({ icon, label, onPress, rightElement, isDestructive, iconColor }: any) => (
    <Pressable
      onPress={() => {
        if (onPress) {
          Haptics.selectionAsync();
          onPress();
        }
      }}
      style={({ pressed }) => [
        styles.menuItem,
        { opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={styles.menuLeft}>
        <View style={styles.iconContainer}>
          <Feather name={icon} size={20} color={iconColor || theme.text} />
        </View>
        <ThemedText style={[styles.menuLabel, isDestructive && { color: theme.error }]}>{label}</ThemedText>
      </View>
      {rightElement || <Feather name="chevron-right" size={20} color={theme.textSecondary} />}
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoCircle, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.logoText}>e</ThemedText>
          </View>
          <ThemedText style={styles.headerTitle}>Profile</ThemedText>
        </View>
        <Pressable style={styles.moreBtn}>
          <Feather name="more-horizontal" size={24} color={theme.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: tabBarHeight + 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Info */}
        <View style={styles.profileInfoContainer}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: user?.profileImage
                  ? `${resolveImageUrl(user.profileImage)}?w=400&q=75`
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id || 'guest'}`
              }}
              style={styles.avatar}
            />
            <Pressable style={[styles.editBadge, { backgroundColor: theme.primary }]} onPress={() => safeNavigate("EditProfile")}>
              <Feather name="edit-2" size={12} color="#FFF" />
            </Pressable>
          </View>

          <ThemedText style={styles.userName}>{user?.name || "Guest User"}</ThemedText>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{stats?.participatedEvents || "0"}</ThemedText>
              <ThemedText style={styles.statLabel}>Events</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{stats?.followers || "0"}</ThemedText>
              <ThemedText style={styles.statLabel}>Followers</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>{stats?.following || "0"}</ThemedText>
              <ThemedText style={styles.statLabel}>Following</ThemedText>
            </View>
          </View>
        </View>

        {/* Action List 1 */}
        <View style={[styles.section, { borderTopColor: theme.border, borderBottomColor: theme.border }]}>
          <MenuItem icon="calendar" label="Manage Events" onPress={() => safeNavigate("Tickets")} />
          <MenuItem icon="message-square" label="Message Center" onPress={() => safeNavigate("Notifications")} />
        </View>

        {/* Action List 2 - Settings */}
        <View style={styles.section}>
          <MenuItem icon="user" label="Profile" onPress={() => safeNavigate("EditProfile")} />
          <MenuItem icon="bell" label="Notification" onPress={() => safeNavigate("NotificationSettings")} />
          <MenuItem icon="credit-card" label="Payments" onPress={() => safeNavigate("PaymentMethods")} />
          <MenuItem icon="repeat" label="Linked Accounts" onPress={() => safeNavigate("LinkedAccounts")} />
          <MenuItem icon="tag" label="Ticket Issues" onPress={() => safeNavigate("HelpCenter")} />
          <MenuItem icon="shield" label="Security" onPress={() => safeNavigate("Security")} />
          <MenuItem
            icon="globe"
            label="Language"
            rightElement={<View style={{ flexDirection: 'row', alignItems: 'center' }}><ThemedText style={{ color: theme.textSecondary, marginRight: 8 }}>English (US)</ThemedText><Feather name="chevron-right" size={20} color={theme.textSecondary} /></View>}
            onPress={() => safeNavigate("Language")}
          />
          <MenuItem
            icon="eye"
            label="Dark Mode"
            rightElement={<Switch value={isDark} onValueChange={() => Alert.alert("System Theme", "Use device settings to change theme.")} trackColor={{ false: '#374151', true: theme.primary }} thumbColor="#FFF" />}
          />
          <MenuItem icon="help-circle" label="Help Center" onPress={() => safeNavigate("HelpCenter")} />
          <MenuItem icon="users" label="Invite Friends" onPress={() => safeNavigate("InviteFriends")} />
          <MenuItem
            icon="star"
            label="Rate us"
            onPress={() => {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Rate Us", "Thank you for your interest! The App Store rating feature will be available once the app is published.");
            }}
          />
        </View>

        {/* Logout */}
        <Pressable
          style={styles.logoutButton}
          onPress={() => {
            Alert.alert("Logout", "Are you sure you want to logout?", [
              { text: "Cancel", style: "cancel" },
              { text: "Yes, Logout", style: "destructive", onPress: logout }
            ]);
          }}
        >
          <Feather name="log-out" size={20} color="#EF4444" />
          <ThemedText style={styles.logoutText}>Logout</ThemedText>
        </Pressable>

        <ThemedText style={styles.versionText}>v1.0.1 (Production)</ThemedText>

      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  logoContainer: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center"
  },
  logoText: { color: "#FFF", fontWeight: "900", fontSize: 20 },
  headerTitle: { fontSize: 24, fontWeight: "700" },
  moreBtn: { padding: 4 },
  profileInfoContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  avatarContainer: {
    marginBottom: 16,
    position: "relative",
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#111827' // Matching background usually
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    justifyContent: "space-evenly",
    paddingHorizontal: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    opacity: 0.6,
  },
  statDivider: {
    width: 1,
    height: 30,
  },
  section: {
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  iconContainer: {
    width: 24,
    alignItems: 'center'
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 24,
    marginTop: 10,
    marginBottom: 20
  },
  logoutText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700'
  },
  versionText: {
    textAlign: 'center',
    opacity: 0.3,
    fontSize: 12,
    marginBottom: 20
  }
});
