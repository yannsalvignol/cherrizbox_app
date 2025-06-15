import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                animation: 'slide_from_right',
                cardStyleInterpolator: ({ current, next, layouts }) => ({
                    cardStyle: {
                        transform: [
                            {
                                translateX: current.progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [layouts.screen.width, 0],
                                }),
                            },
                        ],
                    },
                    overlayStyle: {
                        opacity: current.progress.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.5],
                        }),
                    },
                }),
            }}
        >
            <Stack.Screen name="(tabs)" />
            <Stack.Screen 
                name="chat"
                options={{
                    gestureEnabled: true,
                    gestureDirection: 'horizontal',
                    animation: 'slide_from_right',
                }}
            />
            <Stack.Screen name="properties/[id]" />
        </Stack>
    );
}


