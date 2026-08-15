import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
// Ana dauko API URL daga Environment Variables

const NINValidation = () => {
  const [selectedType, setSelectedType] = useState("No Record Found");
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState({ nin: "", pin: "" });

  // Farashin kowane nau'i (Admin na iya iko da wannan daga API)
  const validationTypes = [
    { id: 1, name: "No Record Found", cost: 1300 }, // Hoton 1000412429.jpg
    { id: 2, name: "SIM Validation", cost: 1300 }, // Hoton 1000412430.jpg
    { id: 3, name: "vNIN Validation", cost: 1300 }, // Hoton 1000412431.jpg
    { id: 4, name: "Update Records Validation", cost: 1300 }, // Hoton 1000412432.jpg
    { id: 5, name: "Bank Validation", cost: 1300 }, // Hoton 1000412433.jpg
    { id: 6, name: "Modification Validation", cost: 1700 }, // Hoton 1000412434.jpg
    { id: 7, name: "Photographic Error", cost: 1400 }, // Hoton 1000412435.jpg
  ];

  const BASE_URL = "https://ayax-api-v2.vercel.app/api/v1";

  const currentCost = validationTypes.find(
    (t) => t.name === selectedType,
  )?.cost;

  const handleSubmit = async () => {
    if (!formData.nin || !formData.pin || !isAuthorized) {
      Alert.alert(
        "Error",
        "Da fatan ka cika dukkan gure sannan ka yarda da Authorization.",
      );
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/nin/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${API_AUTH_TOKEN}`,
        },
        body: JSON.stringify({
          type: selectedType,
          nin: formData.nin,
          pin: formData.pin,
          amount: currentCost,
          timestamp: new Date().toISOString(),
        }),
      });

      const result = await response.json();
      if (response.ok) {
        Alert.alert("Success", "An aika da validation dinka cikin nasara.");
      } else {
        throw new Error(result.message || "Akwai matsala gurin aikawa.");
      }
    } catch (error) {
      Alert.alert("Failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="list" size={20} color="#1a73e8" />
            <Text style={styles.title}>Select the validation you want</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              Cost: ₦{currentCost?.toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.chipContainer}>
          {validationTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.chip,
                selectedType === type.name && styles.selectedChip,
              ]}
              onPress={() => setSelectedType(type.name)}
            >
              <Text
                style={[
                  styles.chipText,
                  selectedType === type.name && styles.selectedChipText,
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>NIN Number</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 11-digit NIN"
          keyboardType="numeric"
          onChangeText={(v) => setFormData({ ...formData, nin: v })}
        />

        <Text style={[styles.label, { marginTop: 15 }]}>Transaction PIN</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 4-digit PIN"
          secureTextEntry
          keyboardType="numeric"
          onChangeText={(v) => setFormData({ ...formData, pin: v })}
        />
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="shield-check"
            size={18}
            color="#1a73e8"
          />
          <Text style={styles.authTitle}>Authorization</Text>
        </View>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsAuthorized(!isAuthorized)}
        >
          <MaterialCommunityIcons
            name={isAuthorized ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={isAuthorized ? "#1a73e8" : "#ccc"}
          />
          <Text style={styles.authText}>
            I confirm that I have obtained authorization from the NIN owner.
          </Text>
        </TouchableOpacity>
        <Text style={styles.linkText}>View full consent text</Text>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isAuthorized || loading) && { backgroundColor: "#ccc" },
          ]}
          onPress={handleSubmit}
          disabled={!isAuthorized || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>Submit Validation Request</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  title: { fontSize: 14, fontWeight: "bold", marginLeft: 8 },
  priceBadge: {
    backgroundColor: "#e8f0fe",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
  },
  priceText: { color: "#1a73e8", fontSize: 12, fontWeight: "bold" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 8,
    marginBottom: 10,
  },
  selectedChip: { backgroundColor: "#e8f0fe", borderColor: "#1a73e8" },
  chipText: { fontSize: 12, color: "#666" },
  selectedChipText: { color: "#1a73e8", fontWeight: "bold" },
  label: { fontSize: 14, fontWeight: "bold", color: "#333", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#fafafa",
  },
  authTitle: { fontSize: 14, fontWeight: "bold", marginLeft: 8 },
  checkboxRow: {
    flexDirection: "row",
    marginTop: 15,
    alignItems: "flex-start",
  },
  authText: { fontSize: 12, color: "#444", marginLeft: 10, flex: 1 },
  linkText: {
    color: "#1a73e8",
    fontSize: 12,
    marginTop: 5,
    marginLeft: 35,
    textDecorationLine: "underline",
  },
  submitBtn: {
    backgroundColor: "#1a73e8",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  submitBtnText: { color: "#fff", fontWeight: "bold" },
});

export default NINValidation;
