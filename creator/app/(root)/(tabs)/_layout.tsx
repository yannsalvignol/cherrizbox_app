import { Stack } from 'expo-router';
import React from 'react';

export default function Layout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen name="edit-profile" />
            <Stack.Screen name="explore" />
            <Stack.Screen name="create" />
            <Stack.Screen name="test-chat" />
            <Stack.Screen name="AudienceTab" />
            <Stack.Screen name="EarningsTab" />
            <Stack.Screen name="InsightsTab" />
            <Stack.Screen name="settings" />
            <Stack.Screen name="about" />
            <Stack.Screen name="privacy-policy" />
            <Stack.Screen name="terms" />
            <Stack.Screen name="payment-methods" />
            <Stack.Screen name="forgot_password_loged_in" />
        </Stack>
    );
} 