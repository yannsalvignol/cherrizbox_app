import { GlobalProvider } from "@/lib/global-provider";
import { ThemeProvider } from "@/lib/themes/useTheme";
import Constants from 'expo-constants';
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { Platform, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeepLinking } from './deep-linking';
import "./global.css";
let StripeProvider: any;
if (Platform.OS !== 'web') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stripe = require('@stripe/stripe-react-native');
  StripeProvider = stripe.StripeProvider;
} else {
  StripeProvider = ({ children }: any) => children || null;
}

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
      console.log('✅ All fonts loaded successfully, including MuseoModerno-Regular');
      SplashScreen.hideAsync();
    } else {
      console.log('⏳ Fonts still loading...');
    }
  }, [fontsLoaded]);

  // Initialize deep linking
  useDeepLinking();

  if (!fontsLoaded) {
    return null;
  }

  const publishableKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <StripeProvider publishableKey={publishableKey}>
          <GlobalProvider>
            <Stack 
              screenOptions={{ 
                headerShown: false,
                gestureEnabled: true,
                gestureDirection: 'horizontal',
                animation: 'slide_from_right',
              }} 
            />
          </GlobalProvider>
        </StripeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
