import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

import AsyncStorage from "@react-native-async-storage/async-storage";

import * as LocalAuthentication from "expo-local-authentication";

import { ThemeContext } from "../context/ThemeContext";

const SettingsScreen = ({ navigation }) => {
  const { isDarkMode, toggleTheme } = useContext(ThemeContext);

  const [loading, setLoading] = useState(true);

  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  const [useFingerprintLogin, setUseFingerprintLogin] = useState(false);

  const [useFingerprintTransaction, setUseFingerprintTransaction] =
    useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);

  const [changePinModalVisible, setChangePinModalVisible] = useState(false);

  const [transactionPin, setTransactionPin] = useState("");

  const [oldPin, setOldPin] = useState("");

  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    initializeSettings();
  }, []);

  const initializeSettings = async () => {
    try {
      await checkDeviceSupport();
      await loadSettings();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  const checkDeviceSupport = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();

      const enrolled = await LocalAuthentication.isEnrolledAsync();

      setIsBiometricSupported(compatible && enrolled);
    } catch (error) {
      console.log(error);
    }
  };

  const loadSettings = async () => {
    try {
      const loginBio = await AsyncStorage.getItem("useBiometricLogin");

      const txBio = await AsyncStorage.getItem("useBiometricTransaction");

      if (loginBio !== null) {
        setUseFingerprintLogin(JSON.parse(loginBio));
      }

      if (txBio !== null) {
        setUseFingerprintTransaction(JSON.parse(txBio));
      }
    } catch (error) {
      console.log(error);
    }
  };

  const authenticateUser = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.log(error);
      return false;
    }
  };

  const toggleBiometric = async (type) => {
    if (!isBiometricSupported) {
      Alert.alert(
        "Unavailable",
        "Biometric authentication is not available on this device.",
      );
      return;
    }

    const authenticated = await authenticateUser();

    if (!authenticated) {
      Alert.alert("Failed", "Authentication failed");
      return;
    }

    try {
      if (type === "login") {
        const newValue = !useFingerprintLogin;

        setUseFingerprintLogin(newValue);

        await AsyncStorage.setItem(
          "useBiometricLogin",
          JSON.stringify(newValue),
        );
      }

      if (type === "transaction") {
        const newValue = !useFingerprintTransaction;

        setUseFingerprintTransaction(newValue);

        await AsyncStorage.setItem(
          "useBiometricTransaction",
          JSON.stringify(newValue),
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  const toggleDarkMode = async () => {
    try {
      await toggleTheme();
    } catch (error) {
      console.log(error);
    }
  };

  const handleSetPin = async () => {
    try {
      if (transactionPin.length !== 4) {
        Alert.alert("Invalid PIN", "PIN must be exactly 4 digits");
        return;
      }

      if (!/^\d+$/.test(transactionPin)) {
        Alert.alert("Invalid PIN", "PIN must contain numbers only");
        return;
      }

      await AsyncStorage.setItem("transactionPin", transactionPin);

      Alert.alert("Success", "Transaction PIN saved successfully");

      setTransactionPin("");

      setPinModalVisible(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleChangePin = async () => {
    try {
      const savedPin = await AsyncStorage.getItem("transactionPin");

      if (!savedPin) {
        Alert.alert("Error", "No existing PIN found");
        return;
      }

      if (oldPin !== savedPin) {
        Alert.alert("Incorrect", "Old PIN is incorrect");
        return;
      }

      if (newPin.length !== 4) {
        Alert.alert("Invalid", "New PIN must be 4 digits");
        return;
      }

      if (!/^\d+$/.test(newPin)) {
        Alert.alert("Invalid", "PIN must contain numbers only");
        return;
      }

      await AsyncStorage.setItem("transactionPin", newPin);

      Alert.alert("Success", "Transaction PIN changed successfully");

      setOldPin("");
      setNewPin("");

      setChangePinModalVisible(false);
    } catch (error) {
      console.log(error);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      {
        text: "Cancel",
        style: "cancel",
      },

      {
        text: "Logout",
        style: "destructive",

        onPress: async () => {
          try {
            await AsyncStorage.clear();

            navigation.reset({
              index: 0,
              routes: [{ name: "Login" }],
            });
          } catch (error) {
            console.log(error);

            Alert.alert("Error", "Logout failed. Try again.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, isDarkMode && styles.darkContainer]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons
              name="arrow-back"
              size={26}
              color={isDarkMode ? "#fff" : "#1e293b"}
            />
          </TouchableOpacity>

          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Settings
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Security</Text>

          <TouchableOpacity
            style={[styles.item, isDarkMode && styles.darkItem]}
            onPress={() => setPinModalVisible(true)}
          >
            <View style={styles.itemLeft}>
              <Ionicons name="lock-closed-outline" size={22} color="#2563eb" />

              <Text
                style={[styles.itemText, isDarkMode && styles.darkItemText]}
              >
                Set Transaction PIN
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.item, isDarkMode && styles.darkItem]}
            onPress={() => setChangePinModalVisible(true)}
          >
            <View style={styles.itemLeft}>
              <MaterialCommunityIcons
                name="lock-reset"
                size={22}
                color="#7c3aed"
              />

              <Text
                style={[styles.itemText, isDarkMode && styles.darkItemText]}
              >
                Change Transaction PIN
              </Text>
            </View>
          </TouchableOpacity>

          <View style={[styles.item, isDarkMode && styles.darkItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="finger-print-outline" size={22} color="#0ea5e9" />

              <Text
                style={[styles.itemText, isDarkMode && styles.darkItemText]}
              >
                Fingerprint Login
              </Text>
            </View>

            <Switch
              value={useFingerprintLogin}
              onValueChange={() => toggleBiometric("login")}
            />
          </View>

          <View style={[styles.item, isDarkMode && styles.darkItem]}>
            <View style={styles.itemLeft}>
              <MaterialCommunityIcons
                name="shield-key-outline"
                size={22}
                color="#16a34a"
              />

              <Text
                style={[styles.itemText, isDarkMode && styles.darkItemText]}
              >
                Fingerprint Transaction
              </Text>
            </View>

            <Switch
              value={useFingerprintTransaction}
              onValueChange={() => toggleBiometric("transaction")}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Preferences</Text>

          <View style={[styles.item, isDarkMode && styles.darkItem]}>
            <View style={styles.itemLeft}>
              <Ionicons name="moon-outline" size={22} color="#f59e0b" />

              <Text
                style={[styles.itemText, isDarkMode && styles.darkItemText]}
              >
                Dark Mode
              </Text>
            </View>

            <Switch value={isDarkMode} onValueChange={toggleDarkMode} />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout Account</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* SET PIN MODAL */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Set Transaction PIN</Text>

            <TextInput
              placeholder="Enter 4-digit PIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={transactionPin}
              onChangeText={setTransactionPin}
              style={styles.input}
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleSetPin}>
              <Text style={styles.modalBtnText}>Save PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setTransactionPin("");
                setPinModalVisible(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PIN MODAL */}
      <Modal visible={changePinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Change Transaction PIN</Text>

            <TextInput
              placeholder="Old PIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={oldPin}
              onChangeText={setOldPin}
              style={styles.input}
            />

            <TextInput
              placeholder="New PIN"
              secureTextEntry
              keyboardType="number-pad"
              maxLength={4}
              value={newPin}
              onChangeText={setNewPin}
              style={styles.input}
            />

            <TouchableOpacity style={styles.modalBtn} onPress={handleChangePin}>
              <Text style={styles.modalBtnText}>Change PIN</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setOldPin("");
                setNewPin("");
                setChangePinModalVisible(false);
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },

  darkContainer: {
    backgroundColor: "#0f172a",
  },

  contentContainer: {
    padding: 20,
    paddingBottom: 120,
  },

  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 50,
    marginBottom: 30,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    marginLeft: 15,
    color: "#0f172a",
  },

  darkText: {
    color: "#fff",
  },

  section: {
    marginBottom: 30,
  },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 15,
  },

  item: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },

  darkItem: {
    backgroundColor: "#1e293b",
  },

  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
  },

  itemText: {
    marginLeft: 15,
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
  },

  darkItemText: {
    color: "#fff",
  },

  logoutBtn: {
    backgroundColor: "#dc2626",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 10,
  },

  logoutText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },

  modalBox: {
    width: "85%",
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 25,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0f172a",
  },

  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    padding: 15,
    marginBottom: 15,
  },

  modalBtn: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  modalBtnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  cancelText: {
    textAlign: "center",
    marginTop: 15,
    color: "#ef4444",
    fontWeight: "600",
  },
});

export default SettingsScreen;
