import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Clipboard,
  Modal,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const allDiscos = [
  { label: "Abuja Electricity (AEDC)", value: "abuja-electric" },
  { label: "Eko Electricity (EKEDC)", value: "eko-electric" },
  { label: "Ikeja Electricity (IKEDC)", value: "ikeja-electric" },
  { label: "Kano Electricity (KEDCO)", value: "kano-electric" },
  { label: "Port Harcourt (PHED)", value: "portharcourt-electric" },
  { label: "Jos Electricity (JED)", value: "jos-electric" },
  { label: "Enugu Electricity (EEDC)", value: "enugu-electric" },
  { label: "Ibadan Electricity (IBEDC)", value: "ibadan-electric" },
  { label: "Kaduna Electricity (KAEDCO)", value: "kaduna-electric" },
  { label: "Benin Electricity (BEDC)", value: "benin-electric" },
  { label: "Yola Electricity (YEDC)", value: "yola-electric" },
];

const ElectricityScreen = ({ navigation }) => {
  const [disco, setDisco] = useState("");
  const [meterNo, setMeterNo] = useState("");
  const [amount, setAmount] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [customerName, setCustomerName] = useState("");
  
  // PIN Modal States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");

  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fee, setFee] = useState(100);
  const [newFee, setNewFee] = useState("");

  useEffect(() => {
    const checkRole = async () => {
      const user = await AsyncStorage.getItem("userData");
      if (user) {
        const parsed = JSON.parse(user);
        setIsAdmin(parsed.role === "admin");
      }
    };
    checkRole();
  }, []);

  const handleAdminUpdate = () => {
    if (!isAdmin) {
      return Alert.alert("Unauthorized", "Only administrators can update service fees.");
    }
    if (!newFee) return Alert.alert("Error", "Enter new fee amount");
    setFee(parseInt(newFee));
    setNewFee("");
    Alert.alert("Success", "Global service fee updated successfully.");
  };

  const verifyMeter = async () => {
    if (!disco || !meterNo)
      return Alert.alert("Required", "Select DISCO and enter Meter Number");

    setVerifying(true);
    setCustomerName("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/vtu/verify-meter`,
        { disco, meterNumber: meterNo, meterType },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setCustomerName(result.name || result.customerName || result.data?.name || "Verified Customer");
      } else {
        throw new Error(result.message || "Verification failed");
      }
    } catch (e) {
      Alert.alert("Verification Error", e.response?.data?.message || e.message || "Check the meter number and try again.");
    } finally {
      setVerifying(false);
    }
  };

  // Wannan zai bincika ko komai ya cika kafin buɗe PIN Modal
  const handleInitiatePayment = () => {
    if (!customerName)
      return Alert.alert("Error", "Please verify meter details first");
    if (!amount || parseInt(amount) < 500)
      return Alert.alert("Error", "Minimum purchase amount is ₦500");
    
    setPinModalVisible(true);
  };

  const handlePayment = async () => {
    if (!pin || pin.length < 4)
      return Alert.alert("Error", "Enter your valid 4-digit Transaction PIN");

    setPaying(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/vtu/electricity`,
        {
          disco,
          meterNumber: meterNo,
          amount: amount,
          fee: fee,
          meterType,
          transactionPin: pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        const tokenVal = result.token || result.data?.token || "N/A";
        const unitsVal = result.units || result.data?.units || "N/A";

        Alert.alert(
          "Purchase Successful!",
          `Token: ${tokenVal}\nUnits: ${unitsVal}\n\nAmount: ₦${amount}\nCharge: ₦${fee}`,
          [
            {
              text: "Copy Token",
              onPress: () => Clipboard.setString(tokenVal),
            },
            { text: "Done", onPress: () => navigation.goBack() },
          ],
        );
      } else {
        throw new Error(result.message || "Transaction Error");
      }
    } catch (e) {
      Alert.alert("Transaction Failed", e.response?.data?.message || e.message || "Internal Server Error");
    } finally {
      setPaying(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={styles.backBtn}
      >
        <Ionicons name="arrow-back" size={26} color="#38bdf8" />
      </TouchableOpacity>

      <Text style={styles.header}>Utility Payments (Electricity)</Text>

      {/* Admin Fee Control */}
      {isAdmin && (
        <View style={styles.adminPane}>
          <Text style={styles.adminLabel}>
            👑 Admin Control: Adjust Service Fee (₦)
          </Text>
          <View style={styles.adminRow}>
            <TextInput
              style={styles.adminInput}
              placeholder={fee.toString()}
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={newFee}
              onChangeText={setNewFee}
            />
            <TouchableOpacity
              style={styles.adminUpdate}
              onPress={handleAdminUpdate}
            >
              <Text style={styles.adminUpdateText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.label}>Select Meter Classification</Text>
      <View style={styles.typeRow}>
        {["prepaid", "postpaid"].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.typeBtn, meterType === t && styles.activeType]}
            onPress={() => {
              setMeterType(t);
              setCustomerName("");
            }}
          >
            <Text
              style={[styles.typeText, meterType === t && styles.whiteText]}
            >
              {t.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Distribution Company (DISCO)</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.discoRow}
      >
        {allDiscos.map((item) => (
          <TouchableOpacity
            key={item.value}
            style={[
              styles.discoChip,
              disco === item.value && styles.activeDisco,
            ]}
            onPress={() => {
              setDisco(item.value);
              setCustomerName("");
            }}
          >
            <Text
              style={[
                styles.chipText,
                disco === item.value && styles.whiteText,
              ]}
            >
              {item.label.split(" (")[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <Text style={styles.label}>Meter / Account Number</Text>
      <View style={styles.inputGroup}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          placeholder="Enter Meter Number"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={meterNo}
          onChangeText={(val) => {
            setMeterNo(val);
            setCustomerName("");
          }}
        />
        <TouchableOpacity
          style={styles.inlineVerify}
          onPress={verifyMeter}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.whiteText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>

      {customerName ? (
        <View style={styles.nameCard}>
          <Ionicons name="flash" size={22} color="#fbbf24" />
          <View style={styles.nameDetails}>
            <Text style={styles.nameLabel}>Verified Customer Name</Text>
            <Text style={styles.nameValue}>{customerName}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.billingRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2000"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Service Fee (₦)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#1e293b", opacity: 0.8 }]}
            value={fee.toString()}
            editable={false}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={handleInitiatePayment}
      >
        <Text style={styles.whiteText}>
          CONFIRM & PAY ₦{(parseInt(amount || 0) + fee).toLocaleString()}
        </Text>
      </TouchableOpacity>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#38bdf8" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Please input your 4-digit PIN to authorize this electricity token purchase</Text>

            <TextInput
              style={styles.modalPinInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
              maxLength={4}
            />

            <TouchableOpacity
              style={[styles.verifyModalBtn, { opacity: paying ? 0.7 : 1 }]}
              onPress={handlePayment}
              disabled={paying}
            >
              {paying ? (
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

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 20 },
  backBtn: { marginTop: 45, marginBottom: 10 },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#38bdf8",
    marginBottom: 20,
  },
  adminPane: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  adminLabel: {
    color: "#f59e0b",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
  },
  adminRow: { flexDirection: "row" },
  adminInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: "#334155",
    fontSize: 13,
  },
  adminUpdate: {
    backgroundColor: "#d97706",
    marginLeft: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    justifyContent: "center",
  },
  adminUpdateText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 8,
    marginTop: 16,
    letterSpacing: 0.5,
  },
  typeRow: { flexDirection: "row", justifyContent: "space-between" },
  typeBtn: {
    width: "48%",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    backgroundColor: "#1e293b",
  },
  activeType: { backgroundColor: "#1d4ed8", borderColor: "#38bdf8" },
  typeText: { color: "#94a3b8", fontWeight: "bold" },
  discoRow: { flexDirection: "row", marginVertical: 5 },
  discoChip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    marginRight: 10,
    borderWidth: 1,
    borderColor: "#334155",
    justifyContent: "center",
  },
  activeDisco: { backgroundColor: "#1d4ed8", borderColor: "#38bdf8" },
  chipText: { color: "#94a3b8", fontWeight: "bold", fontSize: 13 },
  inputGroup: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#fff",
    fontSize: 16,
  },
  inlineVerify: {
    backgroundColor: "#0ea5e9",
    height: 52,
    paddingHorizontal: 20,
    borderRadius: 12,
    justifyContent: "center",
    marginLeft: 10,
  },
  nameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a8a",
    padding: 15,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  nameDetails: { marginLeft: 12 },
  nameLabel: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  nameValue: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  billingRow: { flexDirection: "row", justifyContent: "space-between" },
  payBtn: {
    backgroundColor: "#1d4ed8",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 25,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    elevation: 8,
  },
  whiteText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 10,
  },
  modalHeaderIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 20,
  },
  modalPinInput: {
    width: "100%",
    height: 55,
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 20,
  },
  verifyModalBtn: {
    width: "100%",
    height: 48,
    backgroundColor: "#1d4ed8",
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
    color: "#38bdf8",
    fontWeight: "600",
    fontSize: 13,
  },
});

export default ElectricityScreen;