import { Tabs } from "expo-router";
import { colors } from "../../src/theme";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: colors.primary, headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, tabBarStyle: { backgroundColor: colors.surface } }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="ritmo" options={{ title: "RITMO AI" }} />
      <Tabs.Screen name="pasti" options={{ title: "I miei pasti" }} />
      <Tabs.Screen name="cucina" options={{ title: "La mia cucina" }} />
      <Tabs.Screen name="profilo" options={{ title: "Profilo" }} />
    </Tabs>
  );
}
