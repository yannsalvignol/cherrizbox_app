import { useGlobalContext } from "@/lib/global-provider";
import { Redirect, Slot } from "expo-router";
import React from "react";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AppLayout() {
    const { loading, isLogged } = useGlobalContext();

    if (loading) {
        return (
            <SafeAreaView className="flex-1 justify-center items-center">
                <ActivityIndicator size="large" color="#FB2355" />
            </SafeAreaView>
        );
    }

    if (!isLogged) {
        return <Redirect href="/sign-up" />;
    }

    return <Slot />;
}


