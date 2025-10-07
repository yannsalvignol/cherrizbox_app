import { GlobalProvider } from "@/lib/global-provider";
import { ThemeProvider } from "@/lib/useTheme";
import { StripeProvider } from "@stripe/stripe-react-native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "./global.css";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Questrial: require("../assets/fonts/Questrial-Regular.ttf"),
    Urbanist: require("../assets/fonts/Urbanist-Regular.ttf"),
    "Urbanist-Bold": require("../assets/fonts/Urbanist-Bold.ttf"),
    "Urbanist-Medium": require("../assets/fonts/Urbanist-Medium.ttf"),
    "Urbanist-SemiBold": require("../assets/fonts/Urbanist-SemiBold.ttf"),
    "Urbanist-Light": require("../assets/fonts/Urbanist-Light.ttf"),
    "Urbanist-ExtraLight": require("../assets/fonts/Urbanist-ExtraLight.ttf"),
    "Urbanist-Black": require("../assets/fonts/Urbanist-Black.ttf"),
    "MuseoModerno-Regular": require("../assets/fonts/MuseoModerno-Regular.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Always render something, even if fonts aren't loaded yet
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white', fontSize: 24 }}>Loading...</Text>
      </View>
    );
  }

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
