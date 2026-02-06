import React from 'react';
import { View, StyleSheet, Linking, Pressable } from 'react-native';
import { ThemedText } from './ThemedText';
import { Ionicons } from '@expo/vector-icons';

interface MapProps {
    latitude: number;
    longitude: number;
    title?: string;
}

export default function EventMap({ latitude, longitude, title }: MapProps) {
    const openExternalMap = () => {
        const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        Linking.openURL(url);
    };

    return (
        <Pressable style={styles.container} onPress={openExternalMap}>
            <View style={styles.placeholder}>
                <Ionicons name="map-outline" size={40} color="#6366F1" />
                <ThemedText style={styles.text}>Interactive content is only available on native mobile.</ThemedText>
                <ThemedText style={styles.link}>Click to view on Google Maps</ThemedText>
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1F2937',
        borderRadius: 24,
        overflow: 'hidden',
    },
    placeholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 12,
    },
    text: {
        color: '#9CA3AF',
        textAlign: 'center',
        fontSize: 14,
    },
    link: {
        color: '#6366F1',
        fontWeight: '700',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
