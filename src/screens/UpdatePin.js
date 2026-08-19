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
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const UpdatePinScreen = ({ navigation, route }) => {
  const [password, setPassword] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);

  const isUpdating = Boolean(route?.params?.isUpdating);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => {
            if (onPressCallback) onPressCallback();
          },
        },
      ]);
    }
  };

  const handleSavePin = async () => {
    console.log("[PIN Debug] Save button pressed");
    console.log("[PIN Debug] State values:", {
      isUpdating,
      pinLength: newPin.length,
      confirmLength: confirmPin.length,
    });

    if (isUpdating && !password.trim()) {
      showAlert("Password Required", "Please enter your account password to update your PIN.");
      return;
    }

    if (!newPin || newPin.length !== 4) {
      showAlert("Invalid PIN", "Please enter a valid 4-digit PIN.");
      return;
    }

    if (newPin !== confirmPin) {
      showAlert("Mismatch", "The new PIN and confirmation PIN do not match.");
      return;
    }

    setLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      console.log("[PIN Debug] Retrieved token:", token ? "Token Found" : "Token Missing");

      if (!token) {
        setLoading(false);
        showAlert("Session Expired", "Authentication token missing. Please log in again.", () => {
          navigation.replace("Login");
        });
        return;
      }

      const endpoint = isUpdating
        ? `${BASE_URL}/auth/update-pin`
        : `${BASE_URL}/auth/create-pin`;

      const payload = isUpdating
        ? { password: password.trim(), newPin: newPin.trim(), pin: newPin.trim() }
        : { newPin: newPin.trim(), pin: newPin.trim() };

      console.log(`[PIN Debug] Dispatching request to: ${endpoint}`);

      const response = await axios({
        method: "POST",
        url: endpoint,
        data: payload,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      console.log("[PIN Debug] Response received:", response.data);

      if (response.data && response.data.success) {
        const cachedUser = await AsyncStorage.getItem("userData");
        if (cachedUser) {
          try {
            const parsedUser = JSON.parse(cachedUser);
            parsedUser.has_transaction_pin = true;
            parsedUser.hasPin = true;
            await AsyncStorage.setItem("userData", JSON.stringify(parsedUser));
          } catch (e) {
            console.log("[PIN Debug] User cache parse error:", e.message);
          }
        }

        const successMsg =
          response.data.message || "Transaction PIN successfully configured.";

        showAlert("Success 🎉", successMsg, () => {
          navigation.goBack();
        });
      } else {
        showAlert("Failed", response.data?.message || "Could not save PIN.");
      }
    } catch (error) {
      console.error("[PIN Debug] Full Error:", error);

      if (error.code === "ECONNABORTED") {
        showAlert("Timeout", "Server took too long to respond. Please check your network connection.");
      } else if (error.response) {
        showAlert(
          "Request Failed",
          error.response.data?.message || `Server error: ${error.response.status}`
        );
      } else if (error.request) {
        showAlert("Network Error", "Unable to connect to server. Please check your network.");
      } else {
        showAlert("Error", error.message || "An unexpected error occurred.");
      }
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
        <Text style={styles.headerTitle}>
          {isUpdating ? "Change Transaction PIN" : "Setup Transaction PIN"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <Ionicons name="key-outline" size={40} color="#1e3a8a" />
        </View>
        <Text style={styles.title}>Secure Your Transactions</Text>
        <Text style={styles.subtitle}>
          Enter a 4-digit PIN to authorize transfers and utility purchases on Ayax Xpress.
        </Text>

        {isUpdating && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Account Password</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter your login password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>New 4-Digit PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="****"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={newPin}
            onChangeText={setNewPin}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Confirm New PIN</Text>
          <TextInput
            style={styles.pinInput}
            placeholder="****"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={4}
            secureTextEntry
            value={confirmPin}
            onChangeText={setConfirmPin}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, loading && styles.disabledBtn]}
          onPress={handleSavePin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>SAVE TRANSACTION PIN</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  content: { padding: 20, paddingTop: 30 },
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
  pinInput: {
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
  textInput: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 52,
    fontSize: 15,
    color: "#1e293b",
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
  disabledBtn: { opacity: 0.7 },
  saveBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default UpdatePinScreen;