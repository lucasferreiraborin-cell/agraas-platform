import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { router } from "expo-router";
import { supabase } from "../lib/supabase";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) { Alert.alert("Preencha e-mail e senha"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { Alert.alert("Erro", error.message); return; }
    router.replace("/home");
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#3B5E2B" }}>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: 32, gap: 16 }}>
        <Text style={{ fontSize: 42, fontWeight: "900", color: "#fff", textAlign: "center", letterSpacing: -2 }}>
          Agraas
        </Text>
        <Text style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 24 }}>
          Campo
        </Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-mail"
          placeholderTextColor="#999"
          keyboardType="email-address"
          autoCapitalize="none"
          style={inputStyle}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor="#999"
          secureTextEntry
          style={inputStyle}
        />

        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8}
          style={{ backgroundColor: "#fff", borderRadius: 16, paddingVertical: 18, alignItems: "center", marginTop: 8, opacity: loading ? 0.6 : 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: "#3B5E2B" }}>
            {loading ? "Entrando..." : "Entrar"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const inputStyle = {
  backgroundColor: "#fff",
  borderRadius: 14,
  paddingHorizontal: 18,
  paddingVertical: 16,
  fontSize: 18,
  color: "#1a1a1a",
};
