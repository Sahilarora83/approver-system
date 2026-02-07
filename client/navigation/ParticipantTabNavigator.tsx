import React, { useCallback, useMemo } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { getFocusedRouteNameFromRoute } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { TabIcon } from "@/components/TabIcon";

import DiscoverEventsScreen from "@/screens/DiscoverEventsScreen";
import ParticipantEventDetailScreen from "@/screens/ParticipantEventDetailScreen";
import MyTicketsScreen from "@/screens/MyTicketsScreen";
import ProfileScreen from "@/screens/ProfileScreen";
import ExploreScreen from "@/screens/ExploreScreen";
import FavoritesScreen from "@/screens/FavoritesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

import AttendeesScreen from "@/screens/AttendeesScreen";

function DiscoverStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="DiscoverEvents" component={DiscoverEventsScreen} />
      <Stack.Screen name="ParticipantEventDetail" component={ParticipantEventDetailScreen} />
      <Stack.Screen name="Attendees" component={AttendeesScreen} />
    </Stack.Navigator>
  );
}

export default function ParticipantTabNavigator() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const renderTabIcon = useCallback(
    (name: any) =>
      ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
        <View style={focused ? styles.activeTabContainer : null}>
          <TabIcon name={name} color={color} size={focused ? 24 : 22} />
        </View>
      ),
    []
  );

  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: "#7C3AED", // Vibrant purple
      tabBarInactiveTintColor: "#9CA3AF", // Grayish
      tabBarStyle: {
        position: "absolute" as const,
        backgroundColor: "#111827",
        borderTopWidth: 0,
        height: 70 + insets.bottom,
        paddingBottom: insets.bottom + 10,
        paddingTop: 10,
        ...Platform.select({
          ios: {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: -10 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          },
          android: {
            elevation: 20,
          },
        }),
      },
      headerShown: false,
      tabBarShowLabel: true,
      tabBarLabelStyle: {
        fontSize: 10,
        fontWeight: "600",
        marginTop: 4,
      },
    }),
    [insets.bottom]
  );

  return (
    <Tab.Navigator screenOptions={screenOptions as any}>
      <Tab.Screen
        name="Home"
        component={DiscoverStack}
        options={({ route }) => ({
          tabBarIcon: renderTabIcon("home"),
          tabBarStyle: ((route) => {
            const routeName = getFocusedRouteNameFromRoute(route) ?? "";
            if (["ParticipantEventDetail", "Attendees"].includes(routeName)) {
              return { display: "none" };
            }
            return screenOptions.tabBarStyle;
          })(route),
        })}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          tabBarIcon: renderTabIcon("search"),
        }}
      />
      <Tab.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          tabBarIcon: renderTabIcon("heart"),
        }}
      />
      <Tab.Screen
        name="Tickets"
        component={MyTicketsScreen}
        options={{
          tabBarIcon: renderTabIcon("layers"), // matches screenshot-like icon
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: renderTabIcon("user"),
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  activeTabContainer: {
    // Optional highlight logic if needed
  }
});
