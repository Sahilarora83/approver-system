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

import DiscoverEventsScreen from "@/screens/DiscoverEventsScreen";
import ParticipantEventDetailScreen from "@/screens/ParticipantEventDetailScreen";
import MyTicketsScreen from "@/screens/MyTicketsScreen";
import ProfileScreen from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DiscoverStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={{ ...screenOptions, headerShown: false }}>
      <Stack.Screen name="DiscoverEvents" component={DiscoverEventsScreen} />
      <Stack.Screen name="ParticipantEventDetail" component={ParticipantEventDetailScreen} />
    </Stack.Navigator>
  );
}

function TicketsStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="My Tickets" />,
          headerLargeTitle: true,
        }}
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

export default function ParticipantTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const renderTabIcon = useCallback(
    (name: any) =>
      ({ color, size }: { color: string; size: number }) => (
        <TabIcon name={name} color={color} size={size} />
      ),
    []
  );

  const tabBarBackground = useCallback(
    () =>
      Platform.OS === "ios" ? (
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={StyleSheet.absoluteFill}
        />
      ) : null,
    [isDark]
  );

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: theme.primary,
      tabBarInactiveTintColor: theme.tabIconDefault,
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: Platform.select({
          ios: "transparent",
          android: theme.backgroundRoot,
        }),
        borderTopWidth: 0,
        elevation: 8,
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
        name="DiscoverTab"
        component={DiscoverStack}
        options={{
          title: "Discover",
          tabBarIcon: renderTabIcon("compass"),
        }}
      />
      <Tab.Screen
        name="TicketsTab"
        component={TicketsStack}
        options={{
          title: "Tickets",
          tabBarIcon: renderTabIcon("tag"), // changed from credit-card to ticket
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileStack}
        options={{
          title: "Profile",
          tabBarIcon: renderTabIcon("user"),
        }}
      />
    </Tab.Navigator>
  );
}
