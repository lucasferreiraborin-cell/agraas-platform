import { useState } from "react";
import { Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerEvent } from "../../lib/api";

export default function OutroScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!notes.trim()) { Alert.alert("Descreva o evento"); return; }
    setLoading(true);
    try {
      await registerEvent(animalId, "outro", notes.trim());
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Outro evento", detail: notes.trim().slice(0, 50) } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>{animalCode} — Outro Evento</Text>
      <TextInput value={notes} onChangeText={setNotes} placeholder="Descreva o evento..." multiline numberOfLines={4}
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 18, minHeight: 120, textAlignVertical: "top", borderWidth: 2, borderColor: "#D4E8C8" }} />
      <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>{loading ? "Salvando..." : "✓ Confirmar"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
