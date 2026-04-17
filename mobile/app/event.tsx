import { View, Text, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import EventButton from "../components/EventButton";

export default function EventScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();

  function navigate(type: string) {
    router.push({ pathname: `/inputs/${type}` as any, params: { animalId, animalCode } });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: 1.5 }}>
        Animal: {animalCode}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "800", color: "#1a1a1a" }}>
        Escolha o evento
      </Text>

      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
        <EventButton icon="🏋️" label="Pesagem" onPress={() => navigate("pesagem")} />
        <EventButton icon="💉" label="Aplicação" onPress={() => navigate("aplicacao")} />
        <EventButton icon="🌾" label="Alimentação" onPress={() => navigate("alimentacao")} />
        <EventButton icon="🏷️" label="Marcação" onPress={() => navigate("marcacao")} />
        <EventButton icon="🔀" label="Mudança de pasto" onPress={() => navigate("pasto")} />
        <EventButton icon="📋" label="Outro" onPress={() => navigate("outro")} />
      </View>
    </ScrollView>
  );
}
