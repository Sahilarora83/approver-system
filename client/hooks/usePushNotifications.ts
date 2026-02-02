import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform, Alert } from 'react-native';
import { apiRequest } from '@/lib/query-client';
import { useAuth } from '@/contexts/AuthContext';
import Constants from 'expo-constants';

export function usePushNotifications(
    onNotificationReceived?: (notification: Notifications.Notification) => void,
    onNotificationResponse?: (response: Notifications.NotificationResponse) => void
) {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            registerForPushNotificationsAsync().then(token => {
                if (token) {
                    apiRequest('POST', '/api/user/push-token', { pushToken: token });
                }
            });

            // Listen for incoming notifications while app is in foreground
            const subscription = Notifications.addNotificationReceivedListener(notification => {
                console.log('Real-time notification received:', notification.request.content.title);
                if (onNotificationReceived) {
                    onNotificationReceived(notification);
                }
            });

            const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
                console.log('Notification tapped:', response.notification.request.content);
                if (onNotificationResponse) {
                    onNotificationResponse(response);
                }
            });

            return () => {
                subscription.remove();
                responseSubscription.remove();
            };
        }
    }, [user, onNotificationReceived, onNotificationResponse]);
}

async function registerForPushNotificationsAsync() {
    let token;

    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    if (isExpoGo) {
        console.log('Push Notifications: Skipped (Remote notifications not supported in Expo Go)');
        return;
    }

    if (Platform.OS === 'android') {
        try {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        } catch (e) {
            console.log("Notification Channel Error:", e);
        }
    }

    if (Device.isDevice) {
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }
            if (finalStatus !== 'granted') {
                console.log('Push permissions not granted');
                return;
            }

            const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
            if (!projectId) {
                console.log('Push Token: Skipped (No EAS Project ID found)');
                return;
            }

            console.log('Requesting push token...');
            token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
            console.log('Push Token Generated Successfully');
        } catch (e: any) {
            console.log('Push Token Error (Silent):', e.message);
        }
    } else {
        console.log('Push notifications: Emulator mode (In-app only)');
    }

    return token;
}
