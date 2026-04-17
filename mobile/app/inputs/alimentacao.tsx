import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerEvent } from "../../lib/api";

export default function AlimentacaoScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [tipo, setTipo] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!tipo.trim() || !quantidade) { Alert.alert("Preencha tipo e quantidade"); return; }
    setLoading(true);
    try {
      await registerEvent(animalId, "alimentacao", `${tipo.trim()} — ${quantidade} kg`);
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Alimentação", detail: `${tipo.trim()} — ${quantidade} kg` } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>{animalCode} — Alimentação</Text>
      <TextInput value={tipo} onChangeText={setTipo} placeholder="Tipo de ração/suplemento"
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 18, borderWidth: 2, borderColor: "#D4E8C8" }} />
      <TextInput value={quantidade} onChangeText={setQuantidade} placeholder="Quantidade (kg)" keyboardType="numeric"
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 24, fontWeight: "700", textAlign: "center", borderWidth: 2, borderColor: "#D4E8C8" }} />
      <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>{loading ? "Salvando..." : "✓ Confirmar Alimentação"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
