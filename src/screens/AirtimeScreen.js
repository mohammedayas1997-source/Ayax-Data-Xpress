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
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const networks = [
  { id: "01", name: "MTN", color: "#FFCC00" },
  { id: "02", name: "GLO", color: "#2ecc71" },
  { id: "04", name: "Airtel", color: "#e74c3c" },
  { id: "03", name: "9Mobile", color: "#006600" },
];

const AirtimeScreen = ({ navigation }) => {
  const [selectedNet, setSelectedNet] = useState("01");
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAirtimePurchase = async () => {
    if (!phone || !amount || !pin) {
      return Alert.alert("Error", "Please fill in all fields including your Transaction PIN.");
    }

    if (phone.length < 11) {
      return Alert.alert("Error", "Enter a valid 11-digit phone number.");
    }

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount < 50) {
      return Alert.alert("Error", "Minimum airtime purchase is ₦50.");
    }

    if (pin.length < 4) {
      return Alert.alert("Error", "Enter your valid 4-digit Transaction PIN.");
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
        `${BASE_URL}/vtu/buy-airtime`,
        {
          network: selectedNet,
          phoneNumber: phone,
          amount: numericAmount,
          transactionPin: pin, // Dole sai an sanya PIN sannan zata tafi server
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        Alert.alert("Success!", `₦${numericAmount} airtime successfully sent to ${phone}`, [
          { text: "Done", onPress: () => {
            setPhone("");
            setAmount("");
            setPin("");
          }}
        ]);
      } else {
        throw new Error(result.message || "Transaction Error");
      }
    } catch (error) {
      Alert.alert(
        "Failed",
        error.response?.data?.message || error.message || "Transaction could not be completed.",
      );
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

      {/* Network Selection */}
      <Text style={styles.label}>Select Network</Text>
      <View style={styles.netGrid}>
        {networks.map((net) => (
          <TouchableOpacity
            key={net.id}
            style={[
              styles.netBox,
              {
                backgroundColor: selectedNet === net.id ? net.color : "#f8fafc",
                borderColor: selectedNet === net.id ? "#0a1d37" : "#e2e8f0",
                borderWidth: selectedNet === net.id ? 2 : 1,
              },
            ]}
            onPress={() => setSelectedNet(net.id)}
          >
            <Text
              style={[
                styles.netText,
                { color: selectedNet === net.id ? "#000" : "#64748b" },
              ]}
            >
              {net.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Phone Number */}
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

      {/* Amount Input */}
      <Text style={styles.label}>Amount (₦)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 500"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      {/* Quick Selection Amounts */}
      <View style={styles.quickAmountRow}>
        {["100", "200", "500", "1000", "2000"].map((val) => (
          <TouchableOpacity
            key={val}
            style={[
              styles.quickBtn,
              amount === val && styles.selectedQuickBtn
            ]}
            onPress={() => setAmount(val)}
          >
            <Text style={[styles.quickText, amount === val && styles.selectedQuickText]}>
              ₦{val}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Transaction PIN (Dole sai ansa) */}
      <Text style={styles.label}>Transaction PIN (Required)</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter your 4-digit PIN"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        secureTextEntry
        value={pin}
        onChangeText={setPin}
        maxLength={4}
      />

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.buyBtn, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleAirtimePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyBtnText}>PROCEED & BUY AIRTIME</Text>
        )}
      </TouchableOpacity>

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
});

export default AirtimeScreen;