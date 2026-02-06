import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export function useAutoUpdate() {
    useEffect(() => {
        async function onFetchUpdateAsync() {
            try {
                if (__DEV__) return;

                const update = await Updates.checkForUpdateAsync();

                if (update.isAvailable) {
                    Alert.alert(
                        'Update Available',
                        'A new version of the app is available. Would you like to update now?',
                        [
                            { text: 'Later', style: 'cancel' },
                            {
                                text: 'Update',
                                onPress: async () => {
                                    try {
                                        await Updates.fetchUpdateAsync();
                                        await Updates.reloadAsync();
                                    } catch (error) {
                                        console.error('Error fetching/reloading update:', error);
                                    }
                                }
                            },
                        ]
                    );
                }
            } catch (error) {
                // You can also handle errors here, but often we just want to fail silently in background checks
                console.log('Error checking for updates:', error);
            }
        }

        onFetchUpdateAsync();
    }, []);
}
