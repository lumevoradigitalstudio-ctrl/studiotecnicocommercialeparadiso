import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../src/theme";

type Icon = React.ComponentProps<typeof Ionicons>["name"];
const tab = (title: string, active: Icon, idle: Icon, headerTitle?: string) => ({
  title, headerTitle: headerTitle ?? title,
  tabBarIcon: ({ color, focused, size }: { color: import("react-native").ColorValue; focused: boolean; size: number }) => <Ionicons aria-hidden name={focused ? active : idle} size={size} color={color as string} />,
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary, tabBarInactiveTintColor: colors.inkSoft,
      sceneStyle: { backgroundColor: colors.bg },
      headerStyle: { backgroundColor: colors.bg }, headerShadowVisible: false, headerTitleStyle: { fontWeight: "700", color: colors.ink },
      tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.line, height: 64, paddingBottom: 8, paddingTop: 6 }, tabBarLabelStyle: { fontSize: 11 },
    }}>
      <Tabs.Screen name="home" options={tab("Home", "home", "home-outline")} />
      <Tabs.Screen name="ritmo" options={tab("RITMO", "chatbubble-ellipses", "chatbubble-ellipses-outline", "RITMO AI")} />
      <Tabs.Screen name="pasti" options={tab("Pasti", "restaurant", "restaurant-outline", "I miei pasti")} />
      <Tabs.Screen name="cucina" options={tab("Cucina", "basket", "basket-outline", "La mia cucina")} />
      <Tabs.Screen name="percorso" options={tab("Percorso", "leaf", "leaf-outline", "Il mio percorso")} />
      <Tabs.Screen name="profilo" options={tab("Profilo", "person-circle", "person-circle-outline")} />
    </Tabs>
  );
}
