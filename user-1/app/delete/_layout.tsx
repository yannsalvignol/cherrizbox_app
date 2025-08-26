import { Stack } from 'expo-router';

export default function DeleteLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false, // Disable swipe back gesture
        animation: 'none', // Disable animations to prevent gesture hints
      }}
    />
  );
}
