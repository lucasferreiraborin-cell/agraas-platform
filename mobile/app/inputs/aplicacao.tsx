import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { registerApplication, getStockProducts } from "../../lib/api";
import { Picker } from "@react-native-picker/picker";

export default function AplicacaoScreen() {
  const { animalId, animalCode } = useLocalSearchParams<{ animalId: string; animalCode: string }>();
  const [products, setProducts] = useState<{ id: string; batch_number: string; product: any }[]>([]);
  const [selected, setSelected] = useState("");
  const [dose, setDose] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { getStockProducts().then(setProducts); }, []);

  async function handleSubmit() {
    if (!selected || !dose) { Alert.alert("Preencha o produto e a dose"); return; }
    const p = products.find(x => x.id === selected);
    const productName = Array.isArray(p?.product) ? p?.product[0]?.name : p?.product?.name ?? p?.batch_number ?? "Produto";
    setLoading(true);
    try {
      await registerApplication(animalId, productName, Number(dose), "mL");
      router.push({ pathname: "/success" as any, params: { animalCode, eventType: "Aplicação", detail: `${productName} — ${dose} mL` } });
    } catch (e: any) { Alert.alert("Erro", e.message); }
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: "#999", textTransform: "uppercase" }}>
        {animalCode} — Aplicação
      </Text>
      <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 2, borderColor: "#D4E8C8", overflow: "hidden" }}>
        <Picker selectedValue={selected} onValueChange={setSelected} style={{ height: 60 }}>
          <Picker.Item label="Selecione o produto..." value="" />
          {products.map(p => {
            const name = Array.isArray(p.product) ? p.product[0]?.name : p.product?.name;
            return <Picker.Item key={p.id} label={`${name ?? p.batch_number} (${p.quantity} disp.)`} value={p.id} />;
          })}
        </Picker>
      </View>
      <TextInput value={dose} onChangeText={setDose} placeholder="Dose (mL)" keyboardType="numeric"
        style={{ backgroundColor: "#fff", borderRadius: 16, padding: 20, fontSize: 24, fontWeight: "700", textAlign: "center", borderWidth: 2, borderColor: "#D4E8C8" }} />
      <TouchableOpacity onPress={handleSubmit} disabled={loading} activeOpacity={0.8}
        style={{ backgroundColor: "#5d9c44", borderRadius: 16, paddingVertical: 20, alignItems: "center", opacity: loading ? 0.6 : 1 }}>
        <Text style={{ fontSize: 18, fontWeight: "800", color: "#fff" }}>
          {loading ? "Salvando..." : "✓ Confirmar Aplicação"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
