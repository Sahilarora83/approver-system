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
import PendingRegistrationsScreen from "@/screens/PendingRegistrationsScreen";
import EditProfileScreen from "@/screens/EditProfileScreen";
import SettingsScreen from "@/screens/SettingsScreen";
import NotificationsScreen from "@/screens/NotificationsScreen";
import MetaScreen from "@/screens/MetaScreen";
import {
  NotificationSettingsScreen,
  SecurityScreen,
  LinkedAccountsScreen,
  LanguageScreen,
  InviteFriendsScreen,
  PaymentMethodsScreen,
  HelpCenterScreen
} from "@/screens/ProfileWorkflows";

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
  PendingRegistrations: { eventId: string };
  EditProfile: undefined;
  Settings: undefined;
  Notifications: undefined;
  NotificationSettings: undefined;
  Security: undefined;
  LinkedAccounts: undefined;
  Language: undefined;
  InviteFriends: undefined;
  PaymentMethods: undefined;
  HelpCenter: undefined;
  AboutApp: { type: 'about' };
  PrivacyPolicy: { type: 'privacy' };
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
    <Stack.Navigator
      key={user?.id || 'guest'}
      screenOptions={screenOptions}
    >
      {/* Public screens - accessible without login */}


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
            name="PendingRegistrations"
            component={PendingRegistrationsScreen}
            options={{ headerTitle: "Manage Registrations" }}
          />
        </>
      ) : user.role === "verifier" ? (
        <>
          <Stack.Screen
            name="VerifierMain"
            component={VerifierTabNavigator}
            options={{ headerShown: false }}
          />
        </>
      ) : (
        <>
          <Stack.Screen
            name="ParticipantMain"
            component={ParticipantTabNavigator}
            options={{ headerShown: false }}
          />
        </>
      )}

      {/* Shared Screens available to all authenticated users (or conditionally handled inside) */}
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

      <Stack.Screen
        name="RegisterEvent"
        component={RegisterEventScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerTitle: "Edit Profile" }} />
      <Stack.Screen name="Settings" component={SettingsScreen} options={{ headerTitle: "Settings" }} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ headerTitle: "Notifications" }} />

      {/* Profile Workflows */}
      <Stack.Screen name="NotificationSettings" component={NotificationSettingsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Security" component={SecurityScreen} options={{ headerShown: false }} />
      <Stack.Screen name="LinkedAccounts" component={LinkedAccountsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Language" component={LanguageScreen} options={{ headerShown: false }} />
      <Stack.Screen name="InviteFriends" component={InviteFriendsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PaymentMethods" component={PaymentMethodsScreen} options={{ headerShown: false }} />
      <Stack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ headerShown: false }} />

      <Stack.Screen name="AboutApp" component={MetaScreen} initialParams={{ type: 'about' }} />
      <Stack.Screen name="PrivacyPolicy" component={MetaScreen} initialParams={{ type: 'privacy' }} />
    </Stack.Navigator>
  );
}
