import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const UpdatePin = ({ navigation }) => {
  const [hasPin, setHasPin] = useState(false);
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingStatus, setFetchingStatus] = useState(true);

  useEffect(() => {
    checkPinStatus();
  }, []);

  const checkPinStatus = async () => {
    try {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const user = JSON.parse(userData);
        if (
          user.has_transaction_pin ||
          user.pin_set === true ||
          user.hasPin === true
        ) {
          setHasPin(true);
        }
      }
    } catch (e) {
      console.error("Error checking PIN status:", e);
    } finally {
      setFetchingStatus(false);
    }
  };

  const handleProcessPin = async () => {
    // Validations
    if (hasPin && oldPin.length < 4) {
      Alert.alert("Error", "Please enter your current 4-digit PIN.");
      return;
    }
    if (newPin.length !== 4) {
      Alert.alert("Error", "New PIN must be exactly 4 digits.");
      return;
    }
    if (newPin !== confirmPin) {
      Alert.alert("Error", "New PIN and Confirmation do not match.");
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

      // Amfani da ainihin endpoint din sabar ta Render
      const endpoint = hasPin ? "/users/update-pin" : "/users/create-pin";

      const payload = {
        newPin: newPin,
        confirmPin: confirmPin,
      };

      if (hasPin) {
        payload.oldPin = oldPin;
      }

      const response = await axios.post(
        `${BASE_URL}${endpoint}`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        Alert.alert(
          "Success",
          hasPin ? "PIN updated successfully!" : "PIN created successfully!",
        );
        navigation.goBack();
      } else {
        Alert.alert("Failed", result.message || "Something went wrong");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message || "Connection error. Please try again.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (fetchingStatus) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={26} color="#38bdf8" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {hasPin ? "Change Transaction PIN" : "Create Transaction PIN"}
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons
              name={hasPin ? "shield-checkmark" : "lock-open"}
              size={50}
              color="#38bdf8"
            />
          </View>

          <Text style={styles.instruction}>
            {hasPin
              ? "To change your PIN, provide your old one and set a new 4-digit security code."
              : "Set up a 4-digit transaction PIN to authorize payments and transfers."}
          </Text>

          {/* Old PIN Field (Only shows if user has an existing PIN) */}
          {hasPin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current PIN</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter Old PIN"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={4}
                secureTextEntry
                value={oldPin}
                onChangeText={setOldPin}
              />
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>{hasPin ? "New PIN" : "Setup PIN"}</Text>
            <TextInput
              style={styles.input}
              placeholder="4 Digits"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={newPin}
              onChangeText={setNewPin}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm {hasPin ? "New" : ""} PIN</Text>
            <TextInput
              style={styles.input}
              placeholder="Repeat 4 Digits"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              maxLength={4}
              secureTextEntry
              value={confirmPin}
              onChangeText={setConfirmPin}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleProcessPin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0f172a" />
            ) : (
              <Text style={styles.submitBtnText}>
                {hasPin ? "Update Transaction PIN" : "Create PIN Now"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 30,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
    marginLeft: 15,
  },
  card: {
    backgroundColor: "#1e293b",
    padding: 25,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  instruction: {
    color: "#94a3b8",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: "#38bdf8",
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#0f172a",
    borderRadius: 15,
    height: 60,
    paddingHorizontal: 15,
    color: "#fff",
    fontSize: 22,
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  submitBtn: {
    backgroundColor: "#38bdf8",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  submitBtnText: {
    color: "#0f172a",
    fontSize: 17,
    fontWeight: "bold",
  },
});

export default UpdatePin;