import { TouchableOpacity, Text, View } from "react-native";

type Props = {
  icon: string;
  label: string;
  onPress: () => void;
};

export default function EventButton({ icon, label, onPress }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={{
        flex: 1,
        minWidth: 140,
        height: 90,
        backgroundColor: "#F0F7EC",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#D4E8C8",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
      }}
    >
      <Text style={{ fontSize: 28 }}>{icon}</Text>
      <Text style={{ fontSize: 14, fontWeight: "700", color: "#3B5E2B" }}>{label}</Text>
    </TouchableOpacity>
  );
}
