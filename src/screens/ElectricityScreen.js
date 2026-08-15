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
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

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
  const [pin, setPin] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [fee, setFee] = useState(100); // Admin-set service charge
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
    if (!newFee) return;
    setFee(parseInt(newFee));
    setNewFee("");
    Alert.alert("Admin", "Global service charge updated.");
  };

  const verifyMeter = async () => {
    if (!disco || !meterNo)
      return Alert.alert("Required", "Select DISCO and enter Meter No");

    setVerifying(true);
    setCustomerName("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/vtu/verify-meter",
        { disco, meterNumber: meterNo, meterType },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (res.data.success) {
        setCustomerName(res.data.name);
      }
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handlePayment = async () => {
    if (!customerName)
      return Alert.alert("Error", "Verify meter details first");
    if (parseInt(amount) < 500)
      return Alert.alert("Error", "Minimum purchase is ₦500");
    if (pin.length < 4)
      return Alert.alert("Error", "Enter your Transaction PIN");

    setPaying(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const totalAmount = parseInt(amount) + fee;

      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/vtu/electricity",
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

      if (res.data.success) {
        Alert.alert(
          "Purchase Successful",
          `Token: ${res.data.token}\nUnits: ${res.data.units}\n\nAmount: ₦${amount}\nCharge: ₦${fee}`,
          [
            {
              text: "Copy Token",
              onPress: () => Clipboard.setString(res.data.token),
            },
            { text: "Done", onPress: () => navigation.goBack() },
          ],
        );
      }
    } catch (e) {
      Alert.alert("Failed", e.response?.data?.message || "Transaction Error");
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
        <Ionicons name="arrow-back" size={28} color="#38bdf8" />
      </TouchableOpacity>

      <Text style={styles.header}>Utility Payments</Text>

      {isAdmin && (
        <View style={styles.adminPane}>
          <Text style={styles.adminLabel}>Admin Settings: Service Fee (₦)</Text>
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
              <Text style={styles.adminUpdateText}>Update</Text>
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
          placeholder="Enter ID Number"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          value={meterNo}
          onChangeText={setMeterNo}
        />
        <TouchableOpacity
          style={styles.inlineVerify}
          onPress={verifyMeter}
          disabled={verifying}
        >
          {verifying ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.whiteText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>

      {customerName ? (
        <View style={styles.nameCard}>
          <Ionicons name="flash" size={20} color="#fbbf24" />
          <View style={styles.nameDetails}>
            <Text style={styles.nameLabel}>Verified Customer</Text>
            <Text style={styles.nameValue}>{customerName}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.billingRow}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            placeholder="500+"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Charge (₦)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: "#1e293b", opacity: 0.8 }]}
            value={fee.toString()}
            editable={false}
          />
        </View>
      </View>

      <Text style={styles.label}>Transaction PIN</Text>
      <TextInput
        style={styles.input}
        placeholder="****"
        placeholderTextColor="#64748b"
        keyboardType="numeric"
        secureTextEntry
        maxLength={4}
        value={pin}
        onChangeText={setPin}
      />

      <TouchableOpacity
        style={[styles.payBtn, paying && { opacity: 0.7 }]}
        onPress={handlePayment}
        disabled={paying}
      >
        {paying ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.whiteText}>
            CONFIRM & PAY ₦{(parseInt(amount || 0) + fee).toLocaleString()}
          </Text>
        )}
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 20 },
  backBtn: { marginTop: 50, marginBottom: 15 },
  header: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#38bdf8",
    marginBottom: 30,
  },
  adminPane: {
    backgroundColor: "#1e293b",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  adminLabel: {
    color: "#38bdf8",
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 10,
  },
  adminRow: { flexDirection: "row" },
  adminInput: {
    flex: 1,
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 15,
    height: 40,
  },
  adminUpdate: {
    backgroundColor: "#38bdf8",
    marginLeft: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    justifyContent: "center",
  },
  adminUpdateText: { color: "#0f172a", fontWeight: "bold", fontSize: 12 },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#94a3b8",
    marginBottom: 8,
    marginTop: 15,
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
  discoRow: { flexDirection: "row" },
  discoChip: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 15,
    backgroundColor: "#1e293b",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  activeDisco: { backgroundColor: "#1d4ed8", borderColor: "#38bdf8" },
  chipText: { color: "#94a3b8", fontWeight: "bold", fontSize: 13 },
  inputGroup: { flexDirection: "row", alignItems: "center" },
  input: {
    backgroundColor: "#1e293b",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    color: "#fff",
    fontSize: 16,
  },
  inlineVerify: {
    backgroundColor: "#0ea5e9",
    height: 58,
    paddingHorizontal: 25,
    borderRadius: 12,
    justifyContent: "center",
    marginLeft: 10,
  },
  nameCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  nameDetails: { marginLeft: 15 },
  nameLabel: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  nameValue: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  billingRow: { flexDirection: "row", justifyContent: "space-between" },
  payBtn: {
    backgroundColor: "#1d4ed8",
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 35,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    elevation: 10,
  },
  whiteText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default ElectricityScreen;
