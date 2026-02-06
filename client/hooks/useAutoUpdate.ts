import { useEffect, useState } from 'react';
import * as Updates from 'expo-updates';

export function useAutoUpdate() {
    const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

    useEffect(() => {
        async function checkUpdate() {
            try {
                const update = await Updates.checkForUpdateAsync();
                console.log("[Update Check] Available:", update.isAvailable);
                if (update.isAvailable) {
                    setIsUpdateAvailable(true);
                }
            } catch (error) {
                console.log('Error checking for updates:', error);
            }
        }

        checkUpdate();

        // Check every 30 minutes if app stays open
        const interval = setInterval(checkUpdate, 30 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    return {
        isUpdateAvailable,
        setIsUpdateAvailable
    };
}
