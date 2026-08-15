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
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const CableScreen = ({ navigation }) => {
  const [provider, setProvider] = useState("GOTV");
  const [smartCard, setSmartCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [pin, setPin] = useState("");
  const [packages, setPackages] = useState([]);

  // Admin & Pricing State
  const [isAdmin, setIsAdmin] = useState(false);
  const [serviceCharge, setServiceCharge] = useState(50); // Default charge
  const [newCharge, setNewCharge] = useState("");

  // Dynamic Real-World Packages
  const cableData = {
    GOTV: [
      { id: "gotv-lite", name: "GOtv Lite", price: 1500 },
      { id: "gotv-value", name: "GOtv Value", price: 2100 },
      { id: "gotv-plus", name: "GOtv Plus", price: 3300 },
      { id: "gotv-max", name: "GOtv Max", price: 4850 },
      { id: "gotv-supa", name: "GOtv Supa", price: 6400 },
    ],
    DSTV: [
      { id: "dstv-padi", name: "DStv Padi", price: 2950 },
      { id: "dstv-yanga", name: "DStv Yanga", price: 4200 },
      { id: "dstv-confam", name: "DStv Confam", price: 7400 },
      { id: "dstv-asia", name: "DStv Asia", price: 9900 },
      { id: "dstv-compact", name: "DStv Compact", price: 12500 },
    ],
    STARTIMES: [
      { id: "nova", name: "Nova Monthly", price: 1500 },
      { id: "basic", name: "Basic Monthly", price: 2600 },
      { id: "smart", name: "Smart Monthly", price: 3500 },
      { id: "classic", name: "Classic Monthly", price: 5000 },
      { id: "super", name: "Super Monthly", price: 7000 },
    ],
  };

  useEffect(() => {
    const checkAdmin = async () => {
      const user = await AsyncStorage.getItem("userData");
      if (user) {
        const parsed = JSON.parse(user);
        setIsAdmin(parsed.role === "admin");
      }
    };
    checkAdmin();
    setPackages(cableData[provider]);
    setSelectedPackage(null);
    setCustomerName("");
  }, [provider]);

  const updateGlobalCharge = async () => {
    if (!newCharge) return Alert.alert("Error", "Enter amount");
    setServiceCharge(parseInt(newCharge));
    setNewCharge("");
    Alert.alert("Success", "Service charge updated for this session.");
  };

  const validateIUC = async () => {
    if (smartCard.length < 9) {
      return Alert.alert("Error", "Enter a valid IUC/Smartcard Number.");
    }

    setValidating(true);
    setCustomerName("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      // REAL API CALL TO BACKEND VALIDATOR
      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/vtu/validate-cable",
        { provider, smartCard },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setCustomerName(res.data.customerName);
      }
    } catch (err) {
      Alert.alert("Validation Error", "Check the number and try again.");
    } finally {
      setValidating(false);
    }
  };

  const handlePayment = async () => {
    if (!smartCard || !selectedPackage || !pin) {
      return Alert.alert("Error", "Please fill in all details.");
    }
    if (!customerName) {
      return Alert.alert("Error", "Validate the Smartcard first.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/vtu/pay-cable",
        {
          provider,
          smartCard,
          packageId: selectedPackage.id,
          amount: selectedPackage.price + serviceCharge,
          transactionPin: pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        Alert.alert("Success", "Subscription processed successfully!");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert(
        "Transaction Failed",
        err.response?.data?.message || "Internal Error",
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
        <Text style={styles.header}>Cable TV</Text>
      </View>

      {/* Admin Price Control */}
      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>
            Admin: Adjust Service Charge (₦)
          </Text>
          <View style={styles.adminRow}>
            <TextInput
              style={styles.adminInput}
              placeholder={serviceCharge.toString()}
              keyboardType="numeric"
              value={newCharge}
              onChangeText={setNewCharge}
            />
            <TouchableOpacity
              style={styles.adminBtn}
              onPress={updateGlobalCharge}
            >
              <Text style={styles.adminBtnText}>SAVE</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <Text style={styles.label}>Choose Provider</Text>
      <View style={styles.providerRow}>
        {["GOTV", "DSTV", "STARTIMES"].map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.chip, provider === item && styles.activeChip]}
            onPress={() => setProvider(item)}
          >
            <Text
              style={[styles.chipText, provider === item && styles.whiteText]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>IUC / Smartcard Number</Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.mainInput}
          placeholder="e.g. 7012345678"
          keyboardType="numeric"
          value={smartCard}
          onChangeText={(val) => {
            setSmartCard(val);
            setCustomerName("");
          }}
        />
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={validateIUC}
          disabled={validating}
        >
          {validating ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.verifyBtnText}>Verify</Text>
          )}
        </TouchableOpacity>
      </View>

      {customerName ? (
        <View style={styles.customerBox}>
          <Ionicons name="person-circle-outline" size={20} color="#0369a1" />
          <Text style={styles.customerText}>{customerName}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Select Desired Package</Text>
      <View style={styles.packageContainer}>
        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.pkgCard,
              selectedPackage?.id === pkg.id && styles.activePkgCard,
            ]}
            onPress={() => setSelectedPackage(pkg)}
          >
            <View>
              <Text
                style={[
                  styles.pkgTitle,
                  selectedPackage?.id === pkg.id && styles.whiteText,
                ]}
              >
                {pkg.name}
              </Text>
              <Text style={styles.pkgCaption}>1 Month Validity</Text>
            </View>
            <Text
              style={[
                styles.pkgCost,
                selectedPackage?.id === pkg.id && styles.whiteText,
              ]}
            >
              ₦{(pkg.price + serviceCharge).toLocaleString()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Transaction PIN</Text>
      <TextInput
        style={styles.pinInput}
        placeholder="****"
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
        value={pin}
        onChangeText={setPin}
      />

      <TouchableOpacity
        style={[styles.payBtn, loading && { opacity: 0.7 }]}
        onPress={handlePayment}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payBtnText}>ACTIVATE SUBSCRIPTION</Text>
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
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0a1d37",
    marginLeft: 15,
  },
  adminSection: {
    backgroundColor: "#f1f5f9",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  adminLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 8,
  },
  adminRow: { flexDirection: "row" },
  adminInput: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  adminBtn: {
    backgroundColor: "#0a1d37",
    paddingHorizontal: 15,
    marginLeft: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  adminBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 12,
    marginTop: 20,
  },
  providerRow: { flexDirection: "row", justifyContent: "space-between" },
  chip: {
    paddingVertical: 12,
    borderRadius: 12,
    width: "31%",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeChip: { backgroundColor: "#0a1d37", borderColor: "#0a1d37" },
  chipText: { fontWeight: "bold", color: "#64748b" },
  whiteText: { color: "#fff" },
  inputWrapper: { flexDirection: "row", alignItems: "center" },
  mainInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
  },
  verifyBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 20,
    height: 58,
    justifyContent: "center",
    borderRadius: 12,
    marginLeft: 10,
  },
  verifyBtnText: { color: "#fff", fontWeight: "bold" },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 15,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  customerText: {
    marginLeft: 10,
    fontWeight: "bold",
    color: "#0369a1",
    fontSize: 15,
  },
  packageContainer: { marginTop: 10 },
  pkgCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activePkgCard: { backgroundColor: "#0a1d37", borderColor: "#0a1d37" },
  pkgTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  pkgCaption: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  pkgCost: { fontSize: 18, fontWeight: "bold", color: "#0a1d37" },
  pinInput: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 5,
  },
  payBtn: {
    backgroundColor: "#0a1d37",
    padding: 20,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 35,
    elevation: 5,
  },
  payBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default CableScreen;
