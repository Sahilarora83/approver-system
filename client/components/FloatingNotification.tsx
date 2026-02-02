
import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Animated, View, Pressable, Dimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/hooks/useTheme';
import { Icon } from '@/components/Icon';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface FloatingNotificationProps {
    title: string;
    body: string;
    onPress?: () => void;
    onDismiss: () => void;
}

export function FloatingNotification({ title, body, onPress, onDismiss }: FloatingNotificationProps) {
    const { theme } = useTheme();
    const insets = useSafeAreaInsets();
    const translateY = useRef(new Animated.Value(-200)).current;

    useEffect(() => {
        // Slide in
        Animated.spring(translateY, {
            toValue: insets.top + 10,
            useNativeDriver: true,
            friction: 8,
            tension: 40
        }).start();

        // Auto dismiss after 5 seconds
        const timer = setTimeout(() => {
            dismiss();
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    const dismiss = () => {
        Animated.timing(translateY, {
            toValue: -200,
            duration: 300,
            useNativeDriver: true
        }).start(() => {
            onDismiss();
        });
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    backgroundColor: theme.backgroundSecondary,
                    transform: [{ translateY }]
                }
            ]}
        >
            <Pressable
                onPress={() => {
                    if (onPress) onPress();
                    dismiss();
                }}
                style={styles.content}
            >
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                    <Icon name="bell" size={20} color={theme.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <ThemedText style={styles.title} numberOfLines={1}>{title}</ThemedText>
                    <ThemedText style={styles.body} numberOfLines={2}>{body}</ThemedText>
                </View>
                <Pressable onPress={dismiss} style={styles.closeButton}>
                    <Icon name="x" size={16} color={theme.textSecondary} />
                </Pressable>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        left: 15,
        right: 15,
        zIndex: 9999,
        borderRadius: 16,
        padding: 12,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 10,
            },
            android: {
                elevation: 10,
            }
        }),
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center'
    },
    title: {
        fontSize: 14,
        fontWeight: '800',
    },
    body: {
        fontSize: 12,
        opacity: 0.7,
        marginTop: 2
    },
    closeButton: {
        padding: 4
    }
});
