import React, { useCallback, useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { TabIcon } from "@/components/TabIcon";

import AdminDashboardScreen from "@/screens/AdminDashboardScreen";
import EventsListScreen from "@/screens/EventsListScreen";
import ScannerScreen from "@/screens/ScannerScreen";
import ProfileScreen from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Dashboard"
        component={AdminDashboardScreen}
        options={{
          headerTitle: () => <HeaderTitle title="QR Ticket Manager" />,
        }}
      />
    </Stack.Navigator>
  );
}

function EventsStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Events"
        component={EventsListScreen}
        options={{ headerTitle: "Events" }}
      />
    </Stack.Navigator>
  );
}

function ScanStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Scan"
        component={ScannerScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

function ProfileStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ headerTitle: "Profile" }}
      />
    </Stack.Navigator>
  );
}

export default function AdminTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const renderDashboardIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon name="home" color={color} size={size} />
    ),
    []
  );


  const renderEventsIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon name="calendar" color={color} size={size} />
    ),
    []
  );

  const renderScanIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon name="camera" color={color} size={size} />
    ),
    []
  );

  const renderProfileIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon name="user" color={color} size={size} />
    ),
    []
  );

  const tabBarBackground = useCallback(
    () =>
      Platform.OS === "ios" ? (
        <BlurView
          intensity={100}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null,
    [isDark]
  );

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.tabIconSelected,
      tabBarInactiveTintColor: theme.tabIconDefault,
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: Platform.select({
          ios: "transparent",
          android: theme.backgroundRoot,
        }),
        borderTopWidth: 0,
        elevation: 0,
        height: 60 + insets.bottom,
        paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
      },
      tabBarBackground,
      headerShown: false,
    }),
    [theme, tabBarBackground, insets.bottom]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="DashboardTab"
        component={DashboardStack}
        options={{
          title: "Dashboard",
          tabBarIcon: renderDashboardIcon,
        }}
      />
      <Tab.Screen
        name="EventsTab"
        component={EventsStack}
        options={{
          title: "Events",
          tabBarIcon: renderEventsIcon,
        }}
      />
      <Tab.Screen
        name="ScanTab"
        component={ScanStack}
        options={{
          title: "Scan",
          tabBarIcon: renderScanIcon,
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarIcon: renderProfileIcon,
        }}
      />
    </Tab.Navigator>
  );
}
