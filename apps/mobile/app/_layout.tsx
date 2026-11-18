import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StoreProvider } from "../src/store";
import { AuthProvider } from "../src/auth";
import { colors } from "../src/theme";

export default function Root() {
  return (
    <AuthProvider><StoreProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Accedi" }} />
        <Stack.Screen name="onboarding" options={{ title: "Iniziamo" }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="premium" options={{ title: "RITMO Plus" }} />
      </Stack>
    </StoreProvider></AuthProvider>
  );
}
