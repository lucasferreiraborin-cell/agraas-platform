import { View, Text } from "react-native";
import type { AnimalBasic } from "../lib/api";

export default function AnimalCard({ animal }: { animal: AnimalBasic }) {
  const sexLabel = animal.sex === "Male" ? "🐂 Macho" : animal.sex === "Female" ? "🐄 Fêmea" : "—";
  return (
    <View style={{
      backgroundColor: "#fff",
      borderRadius: 20,
      borderWidth: 2,
      borderColor: "#5d9c44",
      padding: 20,
      gap: 8,
    }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Text style={{ fontSize: 24, fontWeight: "800", color: "#1a1a1a" }}>
          {animal.internal_code ?? animal.id.slice(0, 8)}
        </Text>
        {animal.score != null && (
          <View style={{
            backgroundColor: animal.score >= 75 ? "#DCFCE7" : animal.score >= 50 ? "#FEF3C7" : "#FEE2E2",
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: "900",
              color: animal.score >= 75 ? "#166534" : animal.score >= 50 ? "#854D0E" : "#991B1B",
            }}>
              {animal.score}
            </Text>
          </View>
        )}
      </View>
      <Text style={{ fontSize: 16, color: "#666" }}>
        {animal.nickname ?? "—"} · {animal.breed ?? "—"} · {sexLabel}
      </Text>
    </View>
  );
}
