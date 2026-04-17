import { View, Text, TouchableOpacity } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

export default function SuccessScreen() {
  const { animalCode, eventType, detail } = useLocalSearchParams<{
    animalCode: string; eventType: string; detail: string;
  }>();

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 32, gap: 20, backgroundColor: "#DCFCE7" }}>
      <Text style={{ fontSize: 80 }}>✓</Text>
      <Text style={{ fontSize: 24, fontWeight: "900", color: "#166534", textAlign: "center" }}>
        Evento registrado
      </Text>
      <Text style={{ fontSize: 16, color: "#15803D", textAlign: "center" }}>
        {animalCode} — {eventType}
      </Text>
      {detail ? <Text style={{ fontSize: 14, color: "#22863A", textAlign: "center" }}>{detail}</Text> : null}
      <Text style={{ fontSize: 12, color: "#4ADE80", marginTop: 8 }}>
        {new Date().toLocaleString("pt-BR")}
      </Text>

      <TouchableOpacity onPress={() => router.replace("/home")} activeOpacity={0.8}
        style={{ marginTop: 24, backgroundColor: "#3B5E2B", borderRadius: 16, paddingHorizontal: 32, paddingVertical: 18 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
          Registrar outro animal
        </Text>
      </TouchableOpacity>
    </View>
  );
}
