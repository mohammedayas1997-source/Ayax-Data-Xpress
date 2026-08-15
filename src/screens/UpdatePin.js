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
  StatusBar,
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
      const token = await AsyncStorage.getItem("userToken");
      const userData = await AsyncStorage.getItem("userData");

      let user = userData ? JSON.parse(userData) : null;

      // 1. Check local storage status
      if (
        user &&
        (user.has_transaction_pin || user.pin_set === true || user.hasPin === true)
      ) {
        setHasPin(true);
      }

      // 2. Fetch fresh profile status from server if token exists
      if (token) {
        try {
          const res = await axios.get(`${BASE_URL}/users/profile`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const fetchedUser = res.data?.user || res.data?.data || res.data;
          if (
            fetchedUser?.has_transaction_pin ||
            fetchedUser?.pin_set === true ||
            fetchedUser?.hasPin === true
          ) {
            setHasPin(true);
            // Update stored user data
            if (user) {
              user.has_transaction_pin = true;
              user.hasPin = true;
              await AsyncStorage.setItem("userData", JSON.stringify(user));
            }
          }
        } catch (apiErr) {
          console.log("Profile PIN status fetch failed, using cached state.", apiErr?.message);
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
      Alert.alert("Required", "Please enter your current 4-digit PIN.");
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
        }
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        // Update local storage PIN status
        const userData = await AsyncStorage.getItem("userData");
        if (userData) {
          const parsed = JSON.parse(userData);
          parsed.has_transaction_pin = true;
          parsed.hasPin = true;
          parsed.pin_set = true;
          await AsyncStorage.setItem("userData", JSON.stringify(parsed));
        }

        Alert.alert(
          "Success",
          hasPin ? "PIN updated successfully!" : "PIN created successfully!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
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
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={26} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {hasPin ? "Change Transaction PIN" : "Create Transaction PIN"}
          </Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.card}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={hasPin ? "shield-checkmark" : "lock-closed"}
                size={32}
                color="#1e3a8a"
              />
            </View>
          </View>

          <Text style={styles.instruction}>
            {hasPin
              ? "To change your PIN, provide your current PIN and choose a new 4-digit security PIN."
              : "Set up a secret 4-digit PIN to authorize payments, transfers, and utility orders."}
          </Text>

          {/* Old PIN Field (Only shows if user has an existing PIN) */}
          {hasPin && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Current PIN</Text>
              <TextInput
                style={styles.pinInput}
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
            <Text style={styles.label}>{hasPin ? "New PIN" : "Setup 4-Digit PIN"}</Text>
            <TextInput
              style={styles.pinInput}
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
            <Text style={styles.label}>Confirm {hasPin ? "New " : ""}PIN</Text>
            <TextInput
              style={styles.pinInput}
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
            style={[styles.submitBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleProcessPin}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>
                {hasPin ? "UPDATE TRANSACTION PIN" : "CREATE PIN NOW"}
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
    backgroundColor: "#f8fafc",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 45,
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    color: "#1e3a8a",
    fontSize: 18,
    fontWeight: "bold",
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 15,
  },
  iconCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#dbeafe",
  },
  instruction: {
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 25,
    lineHeight: 20,
    fontWeight: "500",
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    color: "#475569",
    fontSize: 13,
    marginBottom: 8,
    fontWeight: "bold",
  },
  pinInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    height: 55,
    paddingHorizontal: 15,
    color: "#0f172a",
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
    elevation: 3,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
});

export default UpdatePin;