import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerMovement, getProperties } from "../../lib/api";

export default function PastoScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [properties, setProperties] = useState<{ id: string; name: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { getProperties().then(setProperties); }, []);

  async function handleSubmit() {
    if (!selected) { Alert.alert("Selecione o destino"); return; }
    const p = properties.find(x => x.id === selected);
    setLoading(true);
    try {
      await registerMovement(animalId, p?.name ?? selected);
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Mudança de pasto", detail: p?.name ?? "" } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
        {animalCode} — Mudança de Pasto
      </Text>
      {properties.map(p => (
        <TouchableOpacity key={p.id} onPress={() => setSelected(p.id)} activeOpacity={0.8}
          style={{
            backgroundColor: selected === p.id ? "#DCFCE7" : "#fff",
            borderRadius: 16, padding: 20, borderWidth: 2,
            borderColor: selected === p.id ? "#5d9c44" : "#D4E8C8",
          }}>
          <Text style={{ fontSize: 18, fontWeight: "700", color: selected === p.id ? "#166534" : "#1a1a1a" }}>{p.name}</Text>
        </TouchableOpacity>
      ))}
      <TouchableOpacity onPress={handleSubmit} disabled={loading || !selected} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading || !selected ? 0.5 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>✓ Confirmar Mudança</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
