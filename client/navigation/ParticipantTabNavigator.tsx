import React, { useCallback, useMemo } from "react";
import { Platform, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useTheme } from "@/hooks/useTheme";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { HeaderTitle } from "@/components/HeaderTitle";
import { TabIcon } from "@/components/TabIcon";

import MyTicketsScreen from "@/screens/MyTicketsScreen";
import ProfileScreen from "@/screens/ProfileScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TicketsStack() {
  const screenOptions = useScreenOptions();
  return (
    <Stack.Navigator screenOptions={screenOptions}>
      <Stack.Screen
        name="MyTickets"
        component={MyTicketsScreen}
        options={{
          headerTitle: () => <HeaderTitle title="QR Ticket Manager" />,
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

  const renderTicketsIcon = useCallback(
    ({ color, size }: { color: string; size: number }) => (
      <TabIcon name="credit-card" color={color} size={size} />
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
      },
      tabBarBackground,
      headerShown: false,
    }),
    [theme, tabBarBackground]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions}>
      <Tab.Screen
        name="TicketsTab"
        component={TicketsStack}
        options={{
          title: "My Tickets",
          tabBarIcon: renderTicketsIcon,
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
