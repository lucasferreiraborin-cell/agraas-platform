import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { router } from "expo-router";
import { findAnimal, type AnimalBasic } from "../lib/api";
import AnimalCard from "../components/AnimalCard";

export default function HomeScreen() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [animal, setAnimal] = useState<AnimalBasic | null>(null);

  async function handleSearch() {
    if (!code.trim()) { Alert.alert("Digite o código do animal"); return; }
    setLoading(true);
    const found = await findAnimal(code.trim());
    setLoading(false);
    if (!found) { Alert.alert("Animal não encontrado", `Código "${code}" não existe na base.`); return; }
    setAnimal(found);
  }

  function handleEventSelect() {
    if (!animal) return;
    router.push({ pathname: "/event", params: { animalId: animal.id, animalCode: animal.internal_code ?? "" } });
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase", letterSpacing: 1.5 }}>
        Identificar animal
      </Text>

      <TextInput
        value={code}
        onChangeText={setCode}
        placeholder="Código do animal (BER-001, AGR-...)"
        placeholderTextColor="#aaa"
        autoCapitalize="characters"
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          paddingHorizontal: 20,
          paddingVertical: 20,
          fontSize: 22,
          fontWeight: "700",
          color: "#1a1a1a",
          textAlign: "center",
          borderWidth: 2,
          borderColor: "#D4E8C8",
        }}
      />

      <TouchableOpacity onPress={handleSearch} disabled={loading} activeOpacity={0.8}
        style={{
          backgroundColor: "#5d9c44",
          borderRadius: 16,
          paddingVertical: 18,
          alignItems: "center",
          opacity: loading ? 0.6 : 1,
        }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
          {loading ? "Buscando..." : "🔍 Buscar Animal"}
        </Text>
      </TouchableOpacity>

      {animal && (
        <>
          <AnimalCard animal={animal} />

          <TouchableOpacity onPress={handleEventSelect} activeOpacity={0.8}
            style={{
              backgroundColor: "#3B5E2B",
              borderRadius: 16,
              paddingVertical: 20,
              alignItems: "center",
            }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
              Registrar Evento →
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}
