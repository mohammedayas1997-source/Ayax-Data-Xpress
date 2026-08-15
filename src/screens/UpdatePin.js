import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const UpdatePinScreen = ({ navigation, route }) => {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Zaka iya sanin ko yana son canzawa ne ko sabon kirkira ne daga params ko kuma ka bar shi ya duba biyu
  const isUpdating = route?.params?.isUpdating || false;

  const handleSavePin = async () => {
    if (!newPin || newPin.length !== 4) {
      Alert.alert("Kuskure", "Da fatan za a saka sabon PIN mai lamba 4 (4-digit PIN).");
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert("Kuskure", "Sabbin PIN ɗin da ka saka ba su yi daidai ba.");
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Oga!", "Zaman ka ya kare, da fatan za a sake shiga (Login).");
        navigation.replace("Login");
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Muna amfani da endpoint ɗin da ya dace
      const endpoint = isUpdating ? `${BASE_URL}/auth/update-pin` : `${BASE_URL}/auth/create-pin`;
      const payload = isUpdating ? { oldPin, newPin } : { newPin };

      const response = await axios.post(endpoint, payload, config);

      if (response.data.success) {
        // Sabunta cache a cikin AsyncStorage cewa an saita PIN
        const cachedUser = await AsyncStorage.getItem("userData");
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          parsedUser.has_transaction_pin = true;
          parsedUser.hasPin = true;
          await AsyncStorage.setItem("userData", JSON.stringify(parsedUser));
        }

        Alert.alert(
          "Nasara! 🎉",
          response.data.message || "An saita Transaction PIN ɗinka cikin nasara.",
          [
            {
              text: "OK",
              onPress: () => navigation.goBack(),
            },
          ]
        );
      }
    } catch (error) {
      console.error("PIN Error:", error.response?.data || error.message);
      const errorMsg = error.response?.data?.message || "An samu matsala wajen ajiye PIN ɗinka. Gwada daga baya.";
      Alert.alert("Kuskure", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction PIN Setup</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={40} color="#1e3a8a" />
        </View>
        <Text style={styles.title}>Secure Your Transactions</Text>
        <Text style={styles.subtitle}>
          Saka lamba 4 (PIN) wacce zaka riƙa amfani da ita wajen tura kuɗi ko siyan data a Ayax Xpress.
        </Text>

        {isUpdating && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tsohon PIN (Current PIN)</Text>
            <TextInput
              style={styles.input}
              placeholder="****"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={oldPin}
              onChangeText={setOldPin}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Sabon PIN (New PIN)</Text>
          <TextInput
            style={styles.input}
            placeholder="****"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={newPin}
            onChangeText={setNewPin}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Tabbatar da Sabon PIN (Confirm PIN)</Text>
          <TextInput
            style={styles.input}
            placeholder="****"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
        </View>

        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSavePin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>AJIYE PIN DIN</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#1e3a8a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backBtn: { padding: 5 },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  content: { padding: 20, marginTop: 10 },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 15,
  },
  title: { fontSize: 20, fontWeight: "bold", color: "#1e293b", textAlign: "center" },
  subtitle: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 5, marginBottom: 25 },
  inputGroup: { marginBottom: 18 },
  label: { fontSize: 12, fontWeight: "bold", color: "#475569", marginBottom: 6, textTransform: "uppercase" },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    fontSize: 18,
    color: "#1e293b",
    letterSpacing: 5,
  },
  saveBtn: {
    backgroundColor: "#1e3a8a",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 2,
  },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default UpdatePinScreen;