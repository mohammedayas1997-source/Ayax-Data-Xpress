import React, { useState, useEffect } from "react";
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

const networks = [
  { id: "01", name: "MTN", color: "#FFCC00" },
  { id: "02", name: "GLO", color: "#2ecc71" },
  { id: "04", name: "Airtel", color: "#e74c3c" },
  { id: "03", name: "9Mobile", color: "#006600" },
];

const BuyDataScreen = ({ navigation }) => {
  const [selectedNet, setSelectedNet] = useState("01");
  const [phone, setPhone] = useState("");
  const [gbAmount, setGbAmount] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("user");
  const [pin, setPin] = useState("");

  // Admin dynamic rates
  const [pricePerGb, setPricePerGb] = useState(280);
  const [isAdmin, setIsAdmin] = useState(false);
  const [newRate, setNewRate] = useState("");

  useEffect(() => {
    const checkUserStatus = async () => {
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setUserRole(parsed.role || "user");
        setIsAdmin(parsed.role === "admin");
      }

      // Fetch current rate from your server/database
      try {
        const response = await axios.get(
          "https://ayax-data-xpress-server.vercel.app/api/v1/admin/data-rate",
        );
        if (response.data.rate) {
          setPricePerGb(response.data.rate);
        }
      } catch (e) {
        console.log("Using default rate");
      }
    };
    checkUserStatus();
  }, []);

  // Automatic Price Calculation
  useEffect(() => {
    const amount = parseFloat(gbAmount) || 0;
    setTotalPrice(amount * pricePerGb);
  }, [gbAmount, pricePerGb]);

  const handleUpdateRate = async () => {
    if (!newRate) return Alert.alert("Error", "Enter new rate per GB");
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/admin/update-rate",
        { rate: parseFloat(newRate) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPricePerGb(parseFloat(newRate));
      Alert.alert("Success", "Rate updated for all users");
      setNewRate("");
    } catch (error) {
      Alert.alert("Update Failed", "You do not have permission.");
    }
  };

  const handlePurchase = async () => {
    if (!phone || !gbAmount || !pin) {
      return Alert.alert("Error", "Please fill in all fields.");
    }

    if (phone.length < 11) {
      return Alert.alert("Error", "Enter a valid 11-digit phone number.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/vtu/buy-data-custom",
        {
          networkId: selectedNet,
          gbQuantity: gbAmount,
          phoneNumber: phone,
          amount: totalPrice,
          transactionPin: pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.data.success) {
        Alert.alert("Success", `${gbAmount}GB has been sent to ${phone}`);
        setPhone("");
        setGbAmount("");
        setPin("");
      }
    } catch (error) {
      Alert.alert(
        "Transaction Failed",
        error.response?.data?.message || "Server Error",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <Text style={styles.headerText}>Data Purchase</Text>

      {/* Admin Panel */}
      {isAdmin && (
        <View style={styles.adminPanel}>
          <Text style={styles.adminLabel}>Admin: Set Price per GB (₦)</Text>
          <View style={styles.adminRow}>
            <TextInput
              style={styles.adminInput}
              placeholder="e.g. 250"
              keyboardType="numeric"
              value={newRate}
              onChangeText={setNewRate}
            />
            <TouchableOpacity
              style={styles.updateBtn}
              onPress={handleUpdateRate}
            >
              <Text style={styles.updateBtnText}>UPDATE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.label}>Select Network</Text>
      <View style={styles.netGrid}>
        {networks.map((net) => (
          <TouchableOpacity
            key={net.id}
            style={[
              styles.netBox,
              {
                backgroundColor: selectedNet === net.id ? net.color : "#f8fafc",
                borderColor: selectedNet === net.id ? "#0a1d37" : "#f1f5f9",
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

      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        placeholder="08012345678"
        placeholderTextColor="#cbd5e1"
        keyboardType="numeric"
        value={phone}
        onChangeText={setPhone}
        maxLength={11}
      />

      <Text style={styles.label}>Enter Data Quantity (GB)</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. 5"
        placeholderTextColor="#cbd5e1"
        keyboardType="numeric"
        value={gbAmount}
        onChangeText={setGbAmount}
      />

      {/* Dynamic Price Display */}
      <View style={styles.priceContainer}>
        <Text style={styles.priceLabel}>Total Cost:</Text>
        <Text style={styles.priceValue}>₦{totalPrice.toLocaleString()}</Text>
      </View>

      <Text style={styles.label}>Transaction PIN</Text>
      <TextInput
        style={styles.input}
        placeholder="Enter 4-digit PIN"
        placeholderTextColor="#cbd5e1"
        keyboardType="numeric"
        secureTextEntry
        value={pin}
        onChangeText={setPin}
        maxLength={4}
      />

      <TouchableOpacity
        style={[styles.buyBtn, { opacity: loading ? 0.7 : 1 }]}
        onPress={handlePurchase}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buyBtnText}>PROCEED TO PAYMENT</Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20 },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0a1d37",
    marginTop: 20,
  },
  adminPanel: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 15,
    marginTop: 20,
  },
  adminLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 8,
  },
  adminRow: { flexDirection: "row", justifyContent: "space-between" },
  adminInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  updateBtn: {
    backgroundColor: "#0a1d37",
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: 10,
  },
  updateBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 10,
    marginTop: 25,
    color: "#475569",
  },
  netGrid: { flexDirection: "row", justifyContent: "space-between" },
  netBox: {
    width: "22%",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  netText: { fontWeight: "800", fontSize: 12 },
  input: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1.5,
    borderColor: "#f1f5f9",
    color: "#1e293b",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    padding: 15,
    backgroundColor: "#0a1d37",
    borderRadius: 12,
  },
  priceLabel: { color: "#fff", fontSize: 16, opacity: 0.8 },
  priceValue: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  buyBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 30,
    elevation: 4,
  },
  buyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
});

export default BuyDataScreen;
