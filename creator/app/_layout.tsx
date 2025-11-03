import { GlobalProvider } from "@/lib/global-provider";
import { ThemeProvider } from "@/lib/useTheme";
import { StripeProvider } from "@stripe/stripe-react-native";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./global.css";

export default function RootLayout() {

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <StripeProvider
          publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
          merchantIdentifier="merchant.com.cherrybox.app" // Replace with your actual merchant ID
        >
        <GlobalProvider>
          <Stack 
            screenOptions={{ 
              headerShown: false,
            }} 
          >
            <Stack.Screen name="landing" options={{ animation: 'none' }} />
            <Stack.Screen name="chat/[id]" />
          </Stack>
        </GlobalProvider>
        </StripeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
