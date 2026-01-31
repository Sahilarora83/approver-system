import React from "react";
import { ActivityIndicator, View } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@/contexts/AuthContext";
import { useScreenOptions } from "@/hooks/useScreenOptions";
import { useTheme } from "@/hooks/useTheme";

import LoginScreen from "@/screens/LoginScreen";
import SignupScreen from "@/screens/SignupScreen";
import AdminTabNavigator from "@/navigation/AdminTabNavigator";
import ParticipantTabNavigator from "@/navigation/ParticipantTabNavigator";
import VerifierTabNavigator from "@/navigation/VerifierTabNavigator";
import CreateEventScreen from "@/screens/CreateEventScreen";
import EventDetailScreen from "@/screens/EventDetailScreen";
import TicketViewScreen from "@/screens/TicketViewScreen";
import RegisterEventScreen from "@/screens/RegisterEventScreen";

export type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  AdminMain: undefined;
  ParticipantMain: undefined;
  VerifierMain: undefined;
  CreateEvent: undefined;
  EventDetail: { eventId: string };
  TicketView: { registrationId: string };
  RegisterEvent: { eventLink: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootStackNavigator() {
  const { user, isLoading } = useAuth();
  const screenOptions = useScreenOptions();
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.backgroundRoot }}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={screenOptions}>
      {!user ? (
        <>
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="Signup"
            component={SignupScreen}
            options={{ headerShown: false }}
          />
        </>
      ) : user.role === "admin" ? (
        <>
          <Stack.Screen
            name="AdminMain"
            component={AdminTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CreateEvent"
            component={CreateEventScreen}
            options={{ headerTitle: "Create Event" }}
          />
          <Stack.Screen
            name="EventDetail"
            component={EventDetailScreen}
            options={{ headerTitle: "Event Details" }}
          />
          <Stack.Screen
            name="TicketView"
            component={TicketViewScreen}
            options={{ headerTitle: "Ticket" }}
          />
        </>
      ) : user.role === "verifier" ? (
        <>
          <Stack.Screen
            name="VerifierMain"
            component={VerifierTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketView"
            component={TicketViewScreen}
            options={{ headerTitle: "Ticket" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="ParticipantMain"
            component={ParticipantTabNavigator}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="TicketView"
            component={TicketViewScreen}
            options={{ headerTitle: "Ticket" }}
          />
          <Stack.Screen
            name="RegisterEvent"
            component={RegisterEventScreen}
            options={{ headerTitle: "Register" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}
