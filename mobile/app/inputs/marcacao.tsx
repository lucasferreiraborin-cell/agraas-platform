import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ScrollView, Alert, View } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerEvent } from "../../lib/api";

const TIPOS = ["Brinco", "Tatuagem", "Botton", "Outro"];

export default function MarcacaoScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [tipo, setTipo] = useState("Brinco");
  const [codigo, setCodigo] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!codigo.trim()) { Alert.alert("Informe o código da marcação"); return; }
    setLoading(true);
    try {
      await registerEvent(animalId, "marcacao", `${tipo}: ${codigo.trim()}`);
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Marcação", detail: `${tipo}: ${codigo.trim()}` } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>{animalCode} — Marcação</Text>

      <View style={{ flexDirection: "row", gap: 8 }}>
        {TIPOS.map(t => (
          <TouchableOpacity key={t} onPress={() => setTipo(t)} activeOpacity={0.8}
            style={{
              flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center",
              backgroundColor: tipo === t ? "#DCFCE7" : "#fff",
              borderWidth: 2, borderColor: tipo === t ? "#5d9c44" : "#D4E8C8",
            }}>
            <Text style={{ fontSize: 13, fontWeight: "700", color: tipo === t ? "#166534" : "#666" }}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput value={codigo} onChangeText={setCodigo} placeholder="Código / número"
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 22, fontWeight: "700", textAlign: "center", borderWidth: 2, borderColor: "#D4E8C8" }} />

      <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>{loading ? "Salvando..." : "✓ Confirmar Marcação"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
