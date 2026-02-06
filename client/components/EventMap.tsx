import React from 'react';
import { View, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';

interface MapProps {
    latitude: number;
    longitude: number;
    title?: string;
}

const darkMapStyle = [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
    { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b1" }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

export default function EventMap({ latitude, longitude }: MapProps) {
    return (
        <MapView
            style={styles.map}
            provider={PROVIDER_GOOGLE}
            initialRegion={{
                latitude,
                longitude,
                latitudeDelta: 0.015,
                longitudeDelta: 0.015,
            }}
            customMapStyle={darkMapStyle}
        >
            <Marker coordinate={{ latitude, longitude }}>
                <View style={styles.markerContainer}>
                    <View style={styles.markerPulse} />
                    <View style={styles.markerCore}>
                        <Ionicons name="musical-notes" size={14} color="#FFF" />
                    </View>
                </View>
            </Marker>
        </MapView>
    );
}

const styles = StyleSheet.create({
    map: {
        flex: 1,
    },
    markerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    markerPulse: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        position: 'absolute',
    },
    markerCore: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#6366F1',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
});
