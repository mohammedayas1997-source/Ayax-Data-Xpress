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
  Modal,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const CableScreen = ({ navigation }) => {
  const [provider, setProvider] = useState("GOTV");
  const [smartCard, setSmartCard] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [packages, setPackages] = useState([]);

  // PIN Modal States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");

  // Admin & Pricing State
  const [isAdmin, setIsAdmin] = useState(false);
  const [serviceCharge, setServiceCharge] = useState(50);
  const [newCharge, setNewCharge] = useState("");

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
        try {
          const parsed = JSON.parse(user);
          setIsAdmin(parsed.role === "admin");
        } catch (e) {
          console.log("Error parsing user cache");
        }
      }
    };
    checkAdmin();
    setPackages(cableData[provider] || []);
    setSelectedPackage(null);
    setCustomerName("");
  }, [provider]);

  const updateGlobalCharge = async () => {
    if (!isAdmin) {
      return showAlert("Unauthorized", "Only administrators can update service charges.");
    }
    if (!newCharge || isNaN(parseInt(newCharge))) {
      return showAlert("Error", "Enter a valid new charge amount");
    }
    setServiceCharge(parseInt(newCharge));
    setNewCharge("");
    showAlert("Success", "Service charge updated successfully.");
  };

  const validateIUC = async () => {
    if (!smartCard || smartCard.trim().length < 9) {
      return showAlert("Error", "Enter a valid IUC/Smartcard Number.");
    }

    setValidating(true);
    setCustomerName("");
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/vtu/validate-cable`,
        { provider, smartCard: smartCard.trim() },
        { 
          headers: { Authorization: `Bearer ${token}` },
          timeout: 20000 
        },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setCustomerName(
          result.customerName ||
          result.name ||
          result.data?.customerName ||
          "Verified Customer"
        );
      } else {
        throw new Error(result.message || "Validation failed");
      }
    } catch (err) {
      showAlert(
        "Validation Error",
        err.response?.data?.message ||
        err.message ||
        "Check the IUC number and try again."
      );
    } finally {
      setValidating(false);
    }
  };

  const handleInitiatePayment = () => {
    if (!smartCard.trim() || !selectedPackage) {
      return showAlert("Error", "Please enter IUC number and select a package.");
    }
    if (!customerName) {
      return showAlert("Error", "Please validate the Smartcard/IUC number first.");
    }
    setPinModalVisible(true);
  };

  const handlePayment = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Error", "Enter your valid 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
        return;
      }

      const totalAmount = selectedPackage.price + serviceCharge;

      const res = await axios.post(
        `${BASE_URL}/vtu/pay-cable`,
        {
          provider,
          smartCard: smartCard.trim(),
          packageId: selectedPackage.id,
          amount: totalAmount,
          transactionPin: pin.trim(),
          pin: pin.trim(),
        },
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 25000 
        },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Success 🎉",
          `${selectedPackage.name} subscription successfully activated for ${smartCard}`,
          () => navigation.goBack()
        );
      } else {
        throw new Error(result.message || "Transaction Error");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Server communication failure. Please check your connection.";
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
        <Text style={styles.header}>Cable TV Subscription</Text>
      </View>

      {isAdmin && (
        <View style={styles.adminSection}>
          <Text style={styles.adminLabel}>
            👑 Admin Control: Adjust Service Charge (₦)
          </Text>
          <View style={styles.adminRow}>
            <TextInput
              style={styles.adminInput}
              placeholder={serviceCharge.toString()}
              placeholderTextColor="#94a3b8"
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
          placeholderTextColor="#94a3b8"
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
          <Ionicons name="person-circle-outline" size={22} color="#0369a1" />
          <Text style={styles.customerText}>Customer Name: {customerName}</Text>
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
            activeOpacity={0.8}
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
              <Text
                style={[
                  styles.pkgCaption,
                  selectedPackage?.id === pkg.id && { color: "#cbd5e1" },
                ]}
              >
                1 Month Validity (+₦{serviceCharge} fee)
              </Text>
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

      <TouchableOpacity
        style={styles.payBtn}
        onPress={handleInitiatePayment}
      >
        <Text style={styles.payBtnText}>PROCEED & ACTIVATE SUBSCRIPTION</Text>
      </TouchableOpacity>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#1e40af" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>
              Please input your 4-digit PIN to authorize this cable subscription
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
              onPress={handlePayment}
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
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0a1d37",
    marginLeft: 15,
  },
  adminSection: {
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
  adminRow: { flexDirection: "row" },
  adminInput: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    fontSize: 13,
  },
  adminBtn: {
    backgroundColor: "#b45309",
    paddingHorizontal: 16,
    marginLeft: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  adminBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginTop: 18,
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
  chipText: { fontWeight: "bold", color: "#64748b", fontSize: 13 },
  whiteText: { color: "#fff" },
  inputWrapper: { flexDirection: "row", alignItems: "center" },
  mainInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    color: "#0f172a",
  },
  verifyBtn: {
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 20,
    height: 52,
    justifyContent: "center",
    borderRadius: 12,
    marginLeft: 10,
  },
  verifyBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  customerText: {
    marginLeft: 8,
    fontWeight: "bold",
    color: "#0369a1",
    fontSize: 14,
  },
  packageContainer: { marginTop: 5 },
  pkgCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activePkgCard: { backgroundColor: "#0a1d37", borderColor: "#0a1d37" },
  pkgTitle: { fontSize: 15, fontWeight: "bold", color: "#1e293b" },
  pkgCaption: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  pkgCost: { fontSize: 16, fontWeight: "bold", color: "#0a1d37" },
  payBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 25,
    elevation: 3,
  },
  payBtnText: { color: "#fff", fontWeight: "bold", fontSize: 15 },

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

export default CableScreen;