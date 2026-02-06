import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, Platform, View, ActivityIndicator } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

import RootStackNavigator, { RootStackParamList } from "@/navigation/RootStackNavigator";
import { createNavigationContainerRef } from "@react-navigation/native";
import { FloatingNotification } from "@/components/FloatingNotification";

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SocketProvider, useSocket } from "@/contexts/SocketContext";
import { useTheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/theme";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useLocalNotificationPoller } from "@/hooks/useLocalNotificationPoller";
import * as Notifications from "expo-notifications";

SplashScreen.preventAutoHideAsync();

import Constants from 'expo-constants';

const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

if (!isExpoGo) {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch (e) {
    console.log("Notification Handler Error:", e);
  }
}

const linking = {
  prefixes: [Linking.createURL('/'), 'qrticket://', 'https://horizontal-nedda-technocompany-d67bfb10.koyeb.app'],
  config: {
    screens: {
      Login: 'login',
      Signup: 'signup',
      RegisterEvent: {
        path: 'register/:eventLink',
        parse: {
          eventLink: (eventLink: string) => eventLink,
        },
      },
    },
  },
};

// Navigation ref and imports moved to top

function NotificationWrapper({ children }: { children: React.ReactNode }) {
  const [activeNotification, setActiveNotification] = useState<any>(null);
  const { user } = useAuth();

  const handleNotificationTap = (data: any) => {

    if (!data || !navigationRef.isReady()) return;

    console.log("Handling Notification Tap:", data);
    const storedUser = user; // Use current user from AuthContext

    if (data.type === 'new_event' || data.type === 'broadcast') {
      const isUserAdmin = user?.role === 'admin';

      if (isUserAdmin) {
        // Admin goes to Event Management screen
        navigationRef.navigate('EventDetail', { eventId: data.relatedId });
      } else {
        // Participants use ParticipantEventDetail inside DiscoverStack
        (navigationRef.navigate as any)('ParticipantMain', {
          screen: 'DiscoverTab',
          params: {
            screen: 'ParticipantEventDetail',
            params: { eventId: data.relatedId }
          }
        });
      }
    } else if (data.type?.startsWith('registration_') && data.relatedId) {
      navigationRef.navigate('TicketView', { registrationId: data.relatedId });
    }
  };


  usePushNotifications(
    (notification) => {
      setActiveNotification({
        title: notification.request.content.title || "New Notification",
        body: notification.request.content.body || "",
        data: notification.request.content.data,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    (response) => {
      const data = response.notification.request.content.data;
      handleNotificationTap(data);
    }
  );

  useLocalNotificationPoller((notif) => {
    setActiveNotification({
      title: notif.title,
      body: notif.body,
      data: { type: notif.type, relatedId: notif.relatedId },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
  });

  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on("notification-received", (notif: any) => {
        console.log("[Socket] Notification received:", notif);
        setActiveNotification({
          title: notif.title,
          body: notif.body,
          data: { type: notif.type, relatedId: notif.relatedId },
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Invalidate queries to update notification list and counts
        queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/stats"] });
      });

      return () => {
        socket.off("notification-received");
      };
    }
  }, [socket]);

  return (
    <>
      {children}
      {activeNotification && (
        <FloatingNotification
          title={activeNotification.title}
          body={activeNotification.body}
          onPress={() => {
            handleNotificationTap(activeNotification.data);
            setActiveNotification(null);
          }}
          onDismiss={() => setActiveNotification(null)}
        />
      )}
    </>
  );
}

function AppContent() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <NavigationContainer linking={linking} ref={navigationRef}>
        <RootStackNavigator />
      </NavigationContainer>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

function AppWithKeyboard() {
  if (Platform.OS === "web") {
    return <AppContent />;
  }

  try {
    const { KeyboardProvider } = require("react-native-keyboard-controller");
    return (
      <KeyboardProvider>
        <AppContent />
      </KeyboardProvider>
    );
  } catch {
    return <AppContent />;
  }
}

function LoadingScreen() {
  const { theme } = useTheme();
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    // IGNORE SPECIFIC EXPO NOTIFICATION LOGS
    const { LogBox } = require('react-native');
    LogBox.ignoreLogs([
      'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed',
      'functionality is not fully supported in Expo Go',
    ]);

    async function prepare() {
      try {
        const initialUrl = await Linking.getInitialURL();
        console.log('App launched with URL:', initialUrl);
      } catch (e) {
        console.warn("App preparation error:", e);
      } finally {
        setAppIsReady(true);
      }
    }


    const validUrl = Linking.addEventListener('url', (e) => {
      console.log('Deep Link Event:', e.url);
    });

    prepare();

    return () => {
      validUrl.remove();
    };
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return <LoadingScreen />;
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <View style={styles.root}>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <SocketProvider>
                <NotificationWrapper>
                  <AppWithKeyboard />
                </NotificationWrapper>
              </SocketProvider>
            </AuthProvider>
          </QueryClientProvider>
        </ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
});
