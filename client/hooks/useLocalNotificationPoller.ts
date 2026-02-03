import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/query-client';
import * as Notifications from 'expo-notifications';
import { useAuth } from '@/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

export function useLocalNotificationPoller(onNewNotification?: (notif: any) => void) {
    const { user } = useAuth();
    const lastSeenIdRef = useRef<string | null>(null);

    // Fetch notifications periodically
    const { data: notifications } = useQuery({
        queryKey: ["/api/notifications"],
        queryFn: async () => {
            const res = await apiRequest("GET", "/api/notifications");
            return res.json();
        },
        enabled: !!user,
        refetchInterval: 10000, // Check every 10 seconds
    });

    useEffect(() => {
        if (!notifications || notifications.length === 0) return;

        const latest = notifications[0]; // Assuming sorted by newest first

        async function checkAndNotify() {
            const storedLastId = await AsyncStorage.getItem('last_notified_id');

            if (latest.id !== storedLastId && !latest.read) {
                console.log('[LocalNotify] New notification detected:', latest.title);

                const isExpoGo = Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';

                if (!isExpoGo) {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title: latest.title,
                            body: latest.body,
                            data: { id: latest.id, type: latest.type },
                            sound: true, // Enable sound
                            vibrate: [0, 250, 250, 250], // Add vibration pattern
                        },
                        trigger: null, // Show immediately
                    });
                } else {
                    console.log('[LocalNotify] Native notification skipped in Expo Go');
                }

                if (onNewNotification) onNewNotification(latest);

                await AsyncStorage.setItem('last_notified_id', latest.id);
            }
        }

        checkAndNotify();
    }, [notifications]);
}
