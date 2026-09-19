import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  StatusBar,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const networks = [
  { id: "MTN", networkId: "1", name: "MTN", color: "#FFCC00" },
  { id: "AIRTEL", networkId: "2", name: "Airtel", color: "#e74c3c" },
  { id: "9MOBILE", networkId: "3", name: "9Mobile", color: "#006600" },
  { id: "GLO", networkId: "4", name: "GLO", color: "#2ecc71" },
];

const AirtimeScreen = ({ navigation }) => {
  const [selectedNet, setSelectedNet] = useState("MTN");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");

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

  const handleInitiatePurchase = () => {
    if (!phone.trim() || !amount.trim()) {
      return showAlert("Error", "Please fill in recipient phone number and amount.");
    }

    if (phone.trim().length < 11) {
      return showAlert("Error", "Enter a valid 11-digit phone number.");
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 50) {
      return showAlert("Error", "Minimum airtime purchase is ₦50.");
    }

    setPinModalVisible(true);
  };

  const handleAirtimePurchase = async () => {
    if (!pin || pin.trim().length !== 4) {
      return showAlert("Error", "Enter your valid 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        setPinModalVisible(false);
        showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
        return;
      }

      const numericAmount = parseFloat(amount);
      const activeNetworkObj = networks.find((n) => n.id === selectedNet) || networks[0];

      const payload = {
        network: activeNetworkObj.id,
        networkId: activeNetworkObj.networkId,
        airtime_type: "VTU",
        phone: phone.trim(),
        phoneNumber: phone.trim(),
        phoneNo: phone.trim(),
        amount: numericAmount,
        pin: pin.trim(),
        transactionPin: pin.trim(),
      };

      const response = await axios.post(`${BASE_URL}/airtime/buy`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 45000,
      });

      const result = response.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Success",
          `₦${numericAmount} airtime successfully sent to ${phone.trim()}`,
          () => {
            setPhone("");
            setAmount("");
          }
        );
      } else {
        throw new Error(result.message || "Transaction failed");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.message ||
        "Transaction processing failed. Please check your connection.";
      showAlert("Transaction Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#0a1d37" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Airtime Recharge Portal</Text>
      </View>

      <Text style={styles.label}>Select Network</Text>
      <View style={styles.netGrid}>
        {networks.map((net) => {
          const isSelected = selectedNet === net.id;
          return (
            <TouchableOpacity
              key={net.id}
              style={[
                styles.netBox,
                {
                  backgroundColor: isSelected ? net.color : "#f8fafc",
                  borderColor: isSelected ? "#0a1d37" : "#e2e8f0",
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedNet(net.id)}
            >
              <Text
                style={[
                  styles.netText,
                  {
                    color: isSelected
                      ? net.id === "MTN"
                        ? "#000000"
                        : "#ffffff"
                      : "#64748b",
                  },
                ]}
              >
                {net.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Recipient Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="08012345678"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={phone}
        onChangeText={setPhone}
        maxLength={11}
      />

      <Text style={styles.label}>Amount (₦)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <View style={styles.quickAmountRow}>
        {["100", "200", "500", "1000", "2000"].map((val) => (
          <TouchableOpacity
            key={val}
            style={[styles.quickBtn, amount === val && styles.selectedQuickBtn]}
            onPress={() => setAmount(val)}
          >
            <Text
              style={[
                styles.quickText,
                amount === val && styles.selectedQuickText,
              ]}
            >
              ₦{val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.buyBtn} onPress={handleInitiatePurchase}>
        <Text style={styles.buyBtnText}>PROCEED & BUY AIRTIME</Text>
      </TouchableOpacity>

      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#1e40af" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>
              Please input your 4-digit PIN to authorize this airtime recharge
            </Text>

            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              maxLength={4}
            />

            <TouchableOpacity
              style={[styles.verifyModalBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleAirtimePurchase}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyModalBtnText}>Confirm & Pay</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelModalBtn}
              onPress={() => {
                setPinModalVisible(false);
                setPin("");
              }}
            >
              <Text style={styles.cancelModalBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0a1d37",
    marginLeft: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
    marginTop: 18,
    color: "#475569",
  },
  netGrid: { flexDirection: "row", justifyContent: "space-between" },
  netBox: {
    width: "22%",
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  netText: { fontWeight: "800", fontSize: 12 },
  input: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    color: "#0f172a",
  },
  quickAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  quickBtn: {
    backgroundColor: "#f0f9ff",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  selectedQuickBtn: {
    backgroundColor: "#0a1d37",
    borderColor: "#0a1d37",
  },
  quickText: { color: "#0369a1", fontWeight: "bold", fontSize: 12 },
  selectedQuickText: { color: "#ffffff" },
  buyBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 25,
    elevation: 4,
  },
  buyBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    elevation: 10,
  },
  modalHeaderIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  pinInput: {
    width: "100%",
    height: 55,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 20,
  },
  verifyModalBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#0a1d37",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  verifyModalBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  cancelModalBtn: {
    paddingVertical: 8,
  },
  cancelModalBtnText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 13,
  },
});

export default AirtimeScreen;