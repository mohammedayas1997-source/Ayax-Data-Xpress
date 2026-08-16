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
  Modal,
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

const dataPlans = [
  "1", "2", "3", "5", "10", "15", "20", "30", "50", "100"
];

const BuyDataScreen = ({ navigation }) => {
  const [selectedNet, setSelectedNet] = useState("01");
  const [phone, setPhone] = useState("");
  const [gbAmount, setGbAmount] = useState("");
  const [totalPrice, setTotalPrice] = useState(0);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState("user");

  // PIN Modal States
  const [pinModalVisible, setPinModalVisible] = useState(false);
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

      try {
        const response = await axios.get(`${BASE_URL}/admin/data-rate`);
        if (response.data.rate) {
          setPricePerGb(response.data.rate);
        }
      } catch (e) {
        console.log("Using default rate");
      }
    };
    checkUserStatus();
  }, []);

  useEffect(() => {
    const amount = parseFloat(gbAmount) || 0;
    setTotalPrice(amount * pricePerGb);
  }, [gbAmount, pricePerGb]);

  const handleUpdateRate = async () => {
    if (!isAdmin) {
      return Alert.alert("Unauthorized", "Only administrators can update data rates.");
    }
    if (!newRate) return Alert.alert("Error", "Enter new rate per GB");
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      await axios.post(
        `${BASE_URL}/admin/update-rate`,
        { rate: parseFloat(newRate) },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPricePerGb(parseFloat(newRate));
      Alert.alert("Success", "Rate updated for all users");
      setNewRate("");
    } catch (error) {
      Alert.alert("Update Failed", error.response?.data?.message || "You do not have permission.");
    }
  };

  // Wannan zai bincika ko an cika bayanan farko kafin a buɗe PIN Modal
  const handleInitiatePurchase = () => {
    if (!phone || !gbAmount) {
      return Alert.alert("Error", "Please fill in phone number and data quantity.");
    }

    if (phone.length < 11) {
      return Alert.alert("Error", "Enter a valid 11-digit phone number.");
    }

    const gbNum = parseFloat(gbAmount);
    if (gbNum < 1 || gbNum > 100) {
      return Alert.alert("Error", "Data quantity must be between 1GB and 100GB.");
    }

    // Idan komai ya cika, sai a buɗe Modal na PIN
    setPinModalVisible(true);
  };

  // Wannan zai tura bayanan da PIN zuwa Server bayan mai amfani ya saka PIN ɗinsa
  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
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

      const gbNum = parseFloat(gbAmount);

      const response = await axios.post(
        `${BASE_URL}/vtu/buy-data-custom`,
        {
          networkId: selectedNet,
          gbQuantity: gbNum,
          phoneNumber: phone,
          amount: totalPrice,
          transactionPin: pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        Alert.alert("Success", `${gbNum}GB has been successfully sent to ${phone}`, [
          { text: "Done", onPress: () => {
            setPhone("");
            setGbAmount("");
          }}
        ]);
      } else {
        throw new Error(result.message || "Transaction Error");
      }
    } catch (error) {
      Alert.alert(
        "Transaction Failed",
        error.response?.data?.message || error.message || "Server Error",
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
        <Text style={styles.headerText}>Data Purchase Portal</Text>
      </View>

      {/* Admin Panel */}
      {isAdmin && (
        <View style={styles.adminPanel}>
          <Text style={styles.adminLabel}>👑 Admin Control: Set Price per GB (₦)</Text>
          <View style={styles.adminRow}>
            <TextInput
              style={styles.adminInput}
              placeholder="e.g. 250"
              placeholderTextColor="#94a3b8"
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

      <Text style={styles.label}>Select or Enter Data Quantity (1GB - 100GB)</Text>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
        {dataPlans.map((item) => (
          <TouchableOpacity
            key={item}
            style={[
              styles.chip,
              gbAmount === item && styles.selectedChip
            ]}
            onPress={() => setGbAmount(item)}
          >
            <Text style={[styles.chipText, gbAmount === item && styles.selectedChipText]}>
              {item}GB
            </Text>
            <Text style={[styles.chipSubText, gbAmount === item && styles.selectedChipSubText]}>
              ₦{item * pricePerGb}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <TextInput
        style={styles.input}
        placeholder="Or type exact GB (e.g. 7)"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={gbAmount}
        onChangeText={setGbAmount}
      />

      {/* Dynamic Price Display */}
      <View style={styles.priceContainer}>
        <View>
          <Text style={styles.priceLabel}>Total Cost ({gbAmount || 0}GB):</Text>
          <Text style={styles.rateSubText}>Rate: ₦{pricePerGb}/GB</Text>
        </View>
        <Text style={styles.priceValue}>₦{totalPrice.toLocaleString()}</Text>
      </View>

      <TouchableOpacity
        style={styles.buyBtn}
        onPress={handleInitiatePurchase}
      >
        <Text style={styles.buyBtnText}>PROCEED & SEND DATA</Text>
      </TouchableOpacity>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#1e40af" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Please input your 4-digit PIN to authorize this transaction</Text>

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
              onPress={handlePurchase}
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
  adminPanel: {
    backgroundColor: "#fef3c7",
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  adminLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#b45309",
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
    color: "#0f172a",
  },
  updateBtn: {
    backgroundColor: "#b45309",
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
    marginLeft: 10,
  },
  updateBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
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
  chipsScroll: {
    marginBottom: 10,
  },
  chip: {
    backgroundColor: "#f1f5f9",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    alignItems: "center",
  },
  selectedChip: {
    backgroundColor: "#0a1d37",
    borderColor: "#0a1d37",
  },
  chipText: {
    fontWeight: "bold",
    color: "#334155",
    fontSize: 14,
  },
  selectedChipText: {
    color: "#ffffff",
  },
  chipSubText: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
  },
  selectedChipSubText: {
    color: "#cbd5e1",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 15,
    padding: 16,
    backgroundColor: "#0a1d37",
    borderRadius: 15,
  },
  priceLabel: { color: "#fff", fontSize: 14, opacity: 0.8 },
  rateSubText: { color: "#93c5fd", fontSize: 11, marginTop: 2 },
  priceValue: { color: "#fff", fontSize: 20, fontWeight: "bold" },
  buyBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 25,
    elevation: 4,
  },
  buyBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  
  // Modal Styles
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

export default BuyDataScreen;