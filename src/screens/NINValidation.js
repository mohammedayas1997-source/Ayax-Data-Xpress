import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NINValidation = ({ navigation }) => {
  const [selectedType, setSelectedType] = useState("No Record Found");
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState({ nin: "", pin: "" });

  // Farashin kowane nau'i
  const validationTypes = [
    { id: 1, name: "No Record Found", cost: 1300 },
    { id: 2, name: "SIM Validation", cost: 1300 },
    { id: 3, name: "vNIN Validation", cost: 1300 },
    { id: 4, name: "Update Records Validation", cost: 1300 },
    { id: 5, name: "Bank Validation", cost: 1300 },
    { id: 6, name: "Modification Validation", cost: 1700 },
    { id: 7, name: "Photographic Error", cost: 1400 },
  ];

  const currentCost = validationTypes.find(
    (t) => t.name === selectedType,
  )?.cost;

  const handleSubmit = async () => {
    if (!formData.nin || !formData.pin || !isAuthorized) {
      Alert.alert(
        "Required",
        "Da fatan ka cika dukkan bayanan sannan ka yarda da Authorization.",
      );
      return;
    }

    if (formData.nin.length !== 11) {
      Alert.alert("Error", "NIN must be exactly 11 digits.");
      return;
    }

    if (formData.pin.length !== 4) {
      Alert.alert("Error", "Transaction PIN must be 4 digits.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/nin/validate`,
        {
          type: selectedType,
          nin: formData.nin,
          pin: formData.pin,
          amount: currentCost,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        Alert.alert("Success", "An aika da validation dinka cikin nasara.", [
          { text: "Done", onPress: () => { setFormData({ nin: "", pin: "" }); setIsAuthorized(false); } }
        ]);
      } else {
        throw new Error(result.message || "Akwai matsala gurin aikawa.");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || error.message || "Connection error.";
      Alert.alert("Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="list" size={20} color="#1e3a8a" />
            <Text style={styles.title}>Select Validation Service</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>
              Fee: ₦{currentCost?.toLocaleString()}
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
              activeOpacity={0.8}
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
        <Text style={styles.label}>NIN Number (11 Digits)</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 11-digit NIN"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={11}
          value={formData.nin}
          onChangeText={(v) => setFormData({ ...formData, nin: v })}
        />

        <Text style={[styles.label, { marginTop: 15 }]}>Transaction PIN (Required)</Text>
        <TextInput
          style={styles.pinInput}
          placeholder="****"
          placeholderTextColor="#94a3b8"
          secureTextEntry
          keyboardType="numeric"
          maxLength={4}
          value={formData.pin}
          onChangeText={(v) => setFormData({ ...formData, pin: v })}
        />
      </View>

      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons
            name="shield-check"
            size={20}
            color="#1e3a8a"
          />
          <Text style={styles.authTitle}>Authorization Consent</Text>
        </View>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsAuthorized(!isAuthorized)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name={isAuthorized ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={isAuthorized ? "#1e3a8a" : "#cbd5e1"}
          />
          <Text style={styles.authText}>
            I confirm that I have obtained proper authorization from the NIN owner to perform this check.
          </Text>
        </TouchableOpacity>
        <Text style={styles.linkText}>View full consent text</Text>

        <TouchableOpacity
          style={[
            styles.submitBtn,
            (!isAuthorized || loading) && { backgroundColor: "#cbd5e1" },
          ]}
          onPress={handleSubmit}
          disabled={!isAuthorized || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitBtnText}>SUBMIT VALIDATION REQUEST</Text>
          )}
        </TouchableOpacity>
      </View>
      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20, paddingTop: 15 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  title: { fontSize: 14, fontWeight: "bold", marginLeft: 8, color: "#1e3a8a" },
  priceBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  priceText: { color: "#0369a1", fontSize: 12, fontWeight: "bold" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    marginBottom: 10,
    backgroundColor: "#f8fafc",
  },
  selectedChip: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  chipText: { fontSize: 12, color: "#64748b", fontWeight: "bold" },
  selectedChipText: { color: "#fff", fontWeight: "bold" },
  label: { fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 16,
  },
  pinInput: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 15,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 6,
  },
  authTitle: { fontSize: 14, fontWeight: "bold", marginLeft: 8, color: "#1e3a8a" },
  checkboxRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "flex-start",
  },
  authText: { fontSize: 12, color: "#475569", marginLeft: 10, flex: 1, lineHeight: 18 },
  linkText: {
    color: "#0ea5e9",
    fontSize: 12,
    marginTop: 6,
    marginLeft: 34,
    fontWeight: "bold",
  },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 20,
    elevation: 3,
  },
  submitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
});

export default NINValidation;