import { GlobalProvider } from "@/lib/global-provider";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from "react";
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useDeepLinking } from './deep-linking';
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
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Initialize deep linking
  useDeepLinking();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <GlobalProvider>
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
        />
      </GlobalProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
