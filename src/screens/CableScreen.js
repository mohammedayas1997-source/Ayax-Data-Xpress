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
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const cableData = {
  GOTV: [
    { id: "gotv-smallie", name: "GOtv Smallie (Monthly)", price: 1575 },
    { id: "gotv-smallie-quarterly", name: "GOtv Smallie (Quarterly)", price: 4175 },
    { id: "gotv-smallie-annual", name: "GOtv Smallie (Annual)", price: 12300 },
    { id: "gotv-jinja", name: "GOtv Jinja Package", price: 3300 },
    { id: "gotv-jolli", name: "GOtv Jolli Package", price: 4850 },
    { id: "gotv-max", name: "GOtv Max Package", price: 7200 },
    { id: "gotv-supa", name: "GOtv Supa Package", price: 9600 },
    { id: "gotv-supa-plus", name: "GOtv Supa Plus (EPL Package)", price: 15700 },
  ],
  DSTV: [
    { id: "dstv-padi", name: "DStv Padi", price: 4400 },
    { id: "dstv-yanga", name: "DStv Yanga", price: 6000 },
    { id: "dstv-confam", name: "DStv Confam", price: 11000 },
    { id: "dstv-compact", name: "DStv Compact", price: 19000 },
    { id: "dstv-compact-plus", name: "DStv Compact Plus", price: 30000 },
    { id: "dstv-premium", name: "DStv Premium", price: 44000 },
    { id: "dstv-french-plus", name: "DStv French Plus", price: 47000 },
    { id: "dstv-asia", name: "DStv Asia Bouquet", price: 12400 },
  ],
  STARTIMES: [
    { id: "startimes-nova-daily", name: "Nova (Daily)", price: 500 },
    { id: "startimes-nova-weekly", name: "Nova (Weekly)", price: 1400 },
    { id: "startimes-nova-monthly", name: "Nova (Monthly)", price: 2100 },
    { id: "startimes-basic-daily", name: "Basic (Daily)", price: 800 },
    { id: "startimes-basic-weekly", name: "Basic (Weekly)", price: 2600 },
    { id: "startimes-basic-monthly", name: "Basic (Monthly)", price: 4000 },
    { id: "startimes-smart-daily", name: "Smart (Daily)", price: 1100 },
    { id: "startimes-smart-weekly", name: "Smart (Weekly)", price: 3700 },
    { id: "startimes-smart-monthly", name: "Smart (Monthly)", price: 5100 },
    { id: "startimes-classic-daily", name: "Classic (Daily)", price: 1500 },
    { id: "startimes-classic-weekly", name: "Classic (Weekly)", price: 4500 },
    { id: "startimes-classic-monthly", name: "Classic (Monthly)", price: 6500 },
    { id: "startimes-super-daily", name: "Super (Daily)", price: 2000 },
    { id: "startimes-super-weekly", name: "Super (Weekly)", price: 6200 },
    { id: "startimes-super-monthly", name: "Super (Monthly)", price: 9000 },
  ],
  SHOWMAX: [
    { id: "showmax-entertainment", name: "Showmax Entertainment Mobile", price: 1600 },
    { id: "showmax-entertainment-all", name: "Showmax Entertainment (All Devices)", price: 3200 },
    { id: "showmax-premier-league", name: "Showmax Premier League Mobile", price: 3200 },
    { id: "showmax-combo-mobile", name: "Showmax Entertainment + PL (Mobile)", price: 4000 },
    { id: "showmax-combo-all", name: "Showmax Entertainment + PL (All Devices)", price: 6000 },
  ],
};

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

  // Fixed Service Fee of ₦50
  const SERVICE_FEE = 50;

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

  useEffect(() => {
    setPackages(cableData[provider] || []);
    setSelectedPackage(null);
    setCustomerName("");
  }, [provider]);

  const validateIUC = async () => {
    if (provider === "SHOWMAX") {
      if (!smartCard.includes("@") && smartCard.trim().length < 10) {
        return showAlert("Error", "Enter a valid Email or Registered Phone Number for Showmax.");
      }
      setCustomerName("Showmax Account Verified");
      return;
    }

    if (!smartCard || smartCard.trim().length < 9) {
      return showAlert("Error", "Enter a valid IUC or Smartcard Number (9-11 Digits).");
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

      // Endpoint na daidaita da sabon bills controller
      const res = await axios.post(
        `${BASE_URL}/bills/cable/verify`,
        {
          provider: provider.toLowerCase(),
          cableTv: provider.toLowerCase(),
          service: provider.toLowerCase(),
          smartCardNo: smartCard.trim(),
          smartCardNumber: smartCard.trim(),
          iuc: smartCard.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
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
        err.response?.data?.message || err.message || "Could not verify Smartcard. Check number and retry."
      );
    } finally {
      setValidating(false);
    }
  };

  const handleInitiatePayment = () => {
    if (!smartCard.trim() || !selectedPackage) {
      return showAlert("Required", "Please provide Smartcard/Account Number and select a package.");
    }
    if (!customerName) {
      return showAlert("Verification Required", "Please verify the Smartcard/Account details first.");
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

      // Tura ainihin package.price, backend zai caji +50 service fee
      const res = await axios.post(
        `${BASE_URL}/bills/cable/buy`,
        {
          provider: provider.toLowerCase(),
          cableTv: provider.toLowerCase(),
          smartCardNo: smartCard.trim(),
          smartCardNumber: smartCard.trim(),
          iuc: smartCard.trim(),
          packageCode: selectedPackage.id,
          planCode: selectedPackage.id,
          planName: selectedPackage.name,
          amount: selectedPackage.price,
          pin: pin.trim(),
          transactionPin: pin.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 35000,
        }
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Subscription Active 🎉",
          `${selectedPackage.name} activated successfully for ${smartCard}.`,
          () => navigation.goBack()
        );
      } else {
        throw new Error(result.message || "Subscription activation error.");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Gateway timeout. Please check your transaction history.";
      showAlert("Subscription Failed", errorMsg);
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
        <Text style={styles.header}>Cable TV & Streaming</Text>
      </View>

      {/* SERVICE FEE NOTICE */}
      <View style={styles.feeNotice}>
        <Ionicons name="information-circle" size={18} color="#0284c7" />
        <Text style={styles.feeNoticeText}>
          Standard transaction processing fee: <Text style={{ fontWeight: "bold" }}>₦{SERVICE_FEE}</Text>
        </Text>
      </View>

      {/* PROVIDER SELECTOR */}
      <Text style={styles.label}>Select Cable / Streaming Provider</Text>
      <View style={styles.providerGrid}>
        {[
          { id: "GOTV", name: "GOtv", icon: "tv" },
          { id: "DSTV", name: "DStv", icon: "satellite-dish" },
          { id: "STARTIMES", name: "StarTimes", icon: "broadcast-tower" },
          { id: "SHOWMAX", name: "Showmax", icon: "play-circle" },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.providerCard, provider === item.id && styles.activeProviderCard]}
            onPress={() => setProvider(item.id)}
            activeOpacity={0.8}
          >
            <FontAwesome5
              name={item.icon}
              size={18}
              color={provider === item.id ? "#fff" : "#0a1d37"}
            />
            <Text style={[styles.providerCardText, provider === item.id && styles.whiteText]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SMARTCARD / ACCOUNT INPUT */}
      <Text style={styles.label}>
        {provider === "SHOWMAX" ? "Showmax Phone / Email Account" : "IUC / Smartcard Number"}
      </Text>
      <View style={styles.inputWrapper}>
        <TextInput
          style={styles.mainInput}
          placeholder={provider === "SHOWMAX" ? "e.g. 08012345678 or user@gmail.com" : "e.g. 7012345678"}
          placeholderTextColor="#94a3b8"
          keyboardType={provider === "SHOWMAX" ? "default" : "numeric"}
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
          <Ionicons name="checkmark-circle" size={20} color="#059669" />
          <Text style={styles.customerText}>Verified: {customerName}</Text>
        </View>
      ) : null}

      {/* BOUQUETS / PACKAGES LIST */}
      <Text style={styles.label}>Select Desired Bouquet / Plan ({packages.length} Available)</Text>
      <View style={styles.packageContainer}>
        {packages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          return (
            <TouchableOpacity
              key={pkg.id}
              style={[styles.pkgCard, isSelected && styles.activePkgCard]}
              onPress={() => setSelectedPackage(pkg)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.pkgTitle, isSelected && styles.whiteText]}>
                  {pkg.name}
                </Text>
                <Text style={[styles.pkgCaption, isSelected && { color: "#cbd5e1" }]}>
                  Package: ₦{pkg.price.toLocaleString()} (+₦{SERVICE_FEE} service fee)
                </Text>
              </View>
              <Text style={[styles.pkgCost, isSelected && styles.whiteText]}>
                ₦{(pkg.price + SERVICE_FEE).toLocaleString()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={styles.payBtn}
        onPress={handleInitiatePayment}
      >
        <Text style={styles.payBtnText}>
          ACTIVATE SUBSCRIPTION (₦{selectedPackage ? (selectedPackage.price + SERVICE_FEE).toLocaleString() : "0"})
        </Text>
      </TouchableOpacity>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#0a1d37" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>
              Total Debit: ₦{selectedPackage ? (selectedPackage.price + SERVICE_FEE).toLocaleString() : "0"} (Package + ₦{SERVICE_FEE} Fee)
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

      <View style={{ height: 60 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20 },
  navBar: { flexDirection: "row", alignItems: "center", marginTop: 45, marginBottom: 10 },
  header: { fontSize: 22, fontWeight: "bold", color: "#0a1d37", marginLeft: 15 },
  feeNotice: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    marginVertical: 6,
  },
  feeNoticeText: { fontSize: 12, color: "#0369a1", marginLeft: 6 },
  label: { fontSize: 13, fontWeight: "700", color: "#475569", marginBottom: 8, marginTop: 14 },
  providerGrid: { flexDirection: "row", justifyContent: "space-between" },
  providerCard: {
    width: "23%",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeProviderCard: { backgroundColor: "#0a1d37", borderColor: "#0a1d37" },
  providerCardText: { fontWeight: "bold", color: "#0a1d37", fontSize: 11, marginTop: 4 },
  whiteText: { color: "#ffffff" },
  inputWrapper: { flexDirection: "row", alignItems: "center" },
  mainInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 15,
    color: "#0f172a",
  },
  verifyBtn: { backgroundColor: "#0284c7", paddingHorizontal: 18, height: 50, justifyContent: "center", borderRadius: 12, marginLeft: 10 },
  verifyBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
  customerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ecfdf5",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  customerText: { marginLeft: 8, fontWeight: "bold", color: "#065f46", fontSize: 13 },
  packageContainer: { marginTop: 4 },
  pkgCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#f8fafc",
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activePkgCard: { backgroundColor: "#0a1d37", borderColor: "#0a1d37" },
  pkgTitle: { fontSize: 14, fontWeight: "bold", color: "#1e293b" },
  pkgCaption: { fontSize: 10, color: "#64748b", marginTop: 2 },
  pkgCost: { fontSize: 15, fontWeight: "bold", color: "#0a1d37" },
  payBtn: { backgroundColor: "#0a1d37", padding: 16, borderRadius: 14, alignItems: "center", marginTop: 20, elevation: 3 },
  payBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.6)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 340, backgroundColor: "#fff", borderRadius: 24, padding: 24, alignItems: "center", elevation: 10 },
  modalHeaderIcon: { marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a", marginBottom: 6, textAlign: "center" },
  modalSubtitle: { fontSize: 12, color: "#64748b", textAlign: "center", marginBottom: 20 },
  pinInput: { width: "100%", height: 55, backgroundColor: "#f8fafc", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 14, textAlign: "center", fontSize: 24, letterSpacing: 8, fontWeight: "bold", color: "#0f172a", marginBottom: 20 },
  verifyModalBtn: { width: "100%", height: 48, backgroundColor: "#0a1d37", borderRadius: 12, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  verifyModalBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  cancelModalBtn: { paddingVertical: 8 },
  cancelModalBtnText: { color: "#ef4444", fontWeight: "600", fontSize: 13 },
});

export default CableScreen;