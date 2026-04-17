import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerWeight } from "../../lib/api";

export default function PesagemScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [weight, setWeight] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    const w = Number(weight);
    if (!w || w < 1 || w > 2000) { Alert.alert("Peso inválido", "Informe um peso entre 1 e 2000 kg"); return; }
    setLoading(true);
    try {
      await registerWeight(animalId, w);
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Pesagem", detail: `${w} kg` } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
        {animalCode} — Pesagem
      </Text>
      <TextInput
        value={weight}
        onChangeText={setWeight}
        placeholder="Peso em kg"
        keyboardType="numeric"
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 32, fontWeight: "900", textAlign: "center", borderWidth: 2, borderColor: "#D4E8C8" }}
      />
      <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
          {loading ? "Salvando..." : "✓ Confirmar Pesagem"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
