import React from "react";
import { StyleSheet, View, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await logout();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "admin":
        return "Event Organizer";
      case "participant":
        return "Participant";
      case "verifier":
        return "Verifier";
      default:
        return role;
    }
  };

  const menuItems = [
    {
      icon: "user" as const,
      label: "Account Settings",
      onPress: () => {},
    },
    {
      icon: "bell" as const,
      label: "Notifications",
      onPress: () => {},
    },
    {
      icon: "help-circle" as const,
      label: "Help & Support",
      onPress: () => {},
    },
    {
      icon: "info" as const,
      label: "About",
      onPress: () => {},
    },
  ];

  return (
    <KeyboardAwareScrollViewCompat
      style={{ flex: 1, backgroundColor: theme.backgroundRoot }}
      contentContainerStyle={{
        paddingTop: headerHeight + Spacing.xl,
        paddingBottom: tabBarHeight + Spacing.xl,
        paddingHorizontal: Spacing.lg,
      }}
      scrollIndicatorInsets={{ bottom: insets.bottom }}
    >
      <View style={[styles.profileCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
        <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
          <ThemedText type="h2" style={styles.avatarText}>
            {user?.name?.charAt(0).toUpperCase() || "U"}
          </ThemedText>
        </View>
        <ThemedText type="h3" style={styles.name}>
          {user?.name || "User"}
        </ThemedText>
        <ThemedText type="body" style={styles.email}>
          {user?.email}
        </ThemedText>
        <View style={[styles.roleBadge, { backgroundColor: `${theme.primary}15` }]}>
          <ThemedText type="small" style={{ color: theme.primary, fontWeight: "600" }}>
            {getRoleLabel(user?.role || "participant")}
          </ThemedText>
        </View>
      </View>

      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={item.onPress}
            style={({ pressed }) => [
              styles.menuItem,
              {
                backgroundColor: pressed ? theme.backgroundSecondary : theme.backgroundDefault,
              },
              index === 0 && styles.menuItemFirst,
              index === menuItems.length - 1 && styles.menuItemLast,
            ]}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: `${theme.primary}10` }]}>
              <Feather name={item.icon} size={18} color={theme.primary} />
            </View>
            <ThemedText type="body" style={styles.menuLabel}>
              {item.label}
            </ThemedText>
            <Feather name="chevron-right" size={20} color={theme.textSecondary} />
          </Pressable>
        ))}
      </View>

      <Pressable
        onPress={handleLogout}
        style={({ pressed }) => [
          styles.logoutButton,
          {
            backgroundColor: pressed ? `${theme.error}20` : `${theme.error}10`,
          },
        ]}
      >
        <Feather name="log-out" size={18} color={theme.error} />
        <ThemedText type="body" style={{ color: theme.error, fontWeight: "600" }}>
          Log Out
        </ThemedText>
      </Pressable>

      <ThemedText type="small" style={styles.version}>
        QR Ticket Manager v1.0.0
      </ThemedText>
    </KeyboardAwareScrollViewCompat>
  );
}

const styles = StyleSheet.create({
  profileCard: {
    alignItems: "center",
    padding: Spacing["2xl"],
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  avatarText: {
    color: "#fff",
  },
  name: {
    marginBottom: Spacing.xs,
  },
  email: {
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  roleBadge: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  menuSection: {
    borderRadius: BorderRadius.lg,
    overflow: "hidden",
    marginBottom: Spacing["2xl"],
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  menuItemFirst: {
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },
  menuItemLast: {
    borderBottomLeftRadius: BorderRadius.lg,
    borderBottomRightRadius: BorderRadius.lg,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: {
    flex: 1,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing["2xl"],
  },
  version: {
    textAlign: "center",
    opacity: 0.5,
  },
});
