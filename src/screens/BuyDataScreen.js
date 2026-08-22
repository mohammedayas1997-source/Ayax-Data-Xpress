import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const BuyDataScreen = ({ navigation }) => {
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [selectedPlanType, setSelectedPlanType] = useState("ALL");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userRole, setUserRole] = useState("user");

  // PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [{ text: "OK", onPress: onPressCallback }]);
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserRole(parsed.role || "user");
        } catch (e) {}
      }
    };
    fetchUserRole();
  }, []);

  const fetchLivePlans = useCallback(async (net) => {
    setLoadingPlans(true);
    try {
      const res = await axios.get(`${BASE_URL}/superadmin/plans?network=${net}`);
      if (res.data?.success) {
        setAvailablePlans(res.data.data || []);
      }
    } catch (err) {
      console.log("Error loading plans:", err.message);
    } finally {
      setLoadingPlans(false);
    }
  }, []);

  useEffect(() => {
    fetchLivePlans(selectedNetwork);
    setSelectedPlan(null);
  }, [selectedNetwork, fetchLivePlans]);

  const filteredPlans = availablePlans.filter((p) => {
    if (selectedPlanType === "ALL") return true;
    return p.planType === selectedPlanType;
  });

  const handleInitiatePurchase = () => {
    if (!phoneNumber || phoneNumber.trim().length < 11) {
      return showAlert("Error", "Please enter a valid 11-digit recipient phone number.");
    }
    if (!selectedPlan) {
      return showAlert("Error", "Please select a data bundle to purchase.");
    }
    setPinModalVisible(true);
  };

  const handleExecutePurchase = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Error", "Please enter your 4-digit Transaction PIN.");
    }

    setPurchasing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        return navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }

      const res = await axios.post(
        `${BASE_URL}/vtu/buy-data`,
        {
          network: selectedPlan.networkName,
          networkId: selectedPlan.networkId,
          planCode: selectedPlan.planCode,
          phoneNumber: phoneNumber.trim(),
          amount: userRole === "agent" ? selectedPlan.agentPrice : selectedPlan.userPrice,
          transactionPin: pin.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.data?.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Purchase Successful 🎉",
          `${selectedPlan.planLabel} dispatched to ${phoneNumber} successfully!`,
          () => {
            setPhoneNumber("");
            setSelectedPlan(null);
          }
        );
      } else {
        throw new Error(res.data?.message || "Transaction Error");
      }
    } catch (err) {
      showAlert("Transaction Failed", err.response?.data?.message || err.message);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Buy Data Bundles</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Network Selector */}
        <Text style={styles.sectionLabel}>SELECT NETWORK</Text>
        <View style={styles.networkGrid}>
          {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
            <TouchableOpacity
              key={net}
              style={[styles.networkBtn, selectedNetwork === net && styles.networkBtnActive]}
              onPress={() => setSelectedNetwork(net)}
            >
              <Text style={[styles.networkBtnText, selectedNetwork === net && styles.networkBtnTextActive]}>
                {net}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan Type Selector */}
        <Text style={styles.sectionLabel}>PLAN TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {["ALL", "SME", "GIFTING", "CG", "CORPORATE_GIFTING", "DIRECT"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, selectedPlanType === type && styles.typeChipActive]}
              onPress={() => setSelectedPlanType(type)}
            >
              <Text style={[styles.typeChipText, selectedPlanType === type && styles.typeChipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Phone Input */}
        <Text style={styles.sectionLabel}>RECIPIENT PHONE NUMBER</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          maxLength={11}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        {/* Live Plans from Database */}
        <Text style={styles.sectionLabel}>AVAILABLE PLANS ({selectedNetwork})</Text>

        {loadingPlans ? (
          <ActivityIndicator size="small" color="#00f0ff" style={{ marginVertical: 30 }} />
        ) : filteredPlans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Feather name="wifi-off" size={32} color="#64748b" />
            <Text style={styles.emptyText}>No data plans configured for this selection yet.</Text>
          </View>
        ) : (
          filteredPlans.map((plan) => {
            const isSelected = selectedPlan?._id === plan._id;
            const finalPrice = userRole === "agent" ? plan.agentPrice : plan.userPrice;
            return (
              <TouchableOpacity
                key={plan._id}
                style={[styles.planCard, isSelected && styles.planCardActive]}
                onPress={() => setSelectedPlan(plan)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.planTitle, isSelected && { color: "#fff" }]}>
                    {plan.planLabel || `${plan.networkName} ${plan.planCode}`}
                  </Text>
                  <Text style={styles.planTypeTag}>
                    {plan.planType} • {plan.sizeGB}GB
                  </Text>
                </View>
                <Text style={[styles.planPrice, isSelected && { color: "#10b981" }]}>
                  ₦{Number(finalPrice).toLocaleString()}
                </Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Purchase Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedPlan || !phoneNumber) && { opacity: 0.5 }]}
          onPress={handleInitiatePurchase}
          disabled={!selectedPlan || !phoneNumber}
        >
          <Text style={styles.submitBtnText}>
            PURCHASE DATA (₦{selectedPlan ? (userRole === "agent" ? selectedPlan.agentPrice : selectedPlan.userPrice).toLocaleString() : "0"})
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Transaction PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={32} color="#00f0ff" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Enter your 4-digit PIN to confirm this data purchase</Text>

            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={setPin}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, purchasing && { opacity: 0.7 }]}
              onPress={handleExecutePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Confirm & Pay</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPinModalVisible(false);
                setPin("");
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050811", paddingHorizontal: 16 },
  headerBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: Platform.OS === "ios" ? 50 : 35, paddingBottom: 15 },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  sectionLabel: { color: "#64748b", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  networkGrid: { flexDirection: "row", justifyContent: "space-between" },
  networkBtn: { flex: 1, paddingVertical: 12, alignItems: "center", backgroundColor: "#0b1120", marginHorizontal: 3, borderRadius: 10, borderWidth: 1, borderColor: "#1e293b" },
  networkBtnActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  networkBtnText: { color: "#94a3b8", fontWeight: "bold", fontSize: 12 },
  networkBtnTextActive: { color: "#fff" },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: "#0b1120", marginRight: 8, borderWidth: 1, borderColor: "#1e293b" },
  typeChipActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  typeChipText: { color: "#94a3b8", fontSize: 11, fontWeight: "bold" },
  typeChipTextActive: { color: "#fff" },
  input: { backgroundColor: "#0b1120", borderWidth: 1, borderColor: "#1e293b", borderRadius: 12, paddingHorizontal: 14, height: 50, color: "#f8fafc", fontSize: 15, fontWeight: "600" },
  planCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 14, backgroundColor: "#0b1120", borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e293b" },
  planCardActive: { borderColor: "#00f0ff", backgroundColor: "#071328" },
  planTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  planTypeTag: { color: "#64748b", fontSize: 11, marginTop: 2 },
  planPrice: { color: "#00f0ff", fontSize: 15, fontWeight: "900" },
  emptyCard: { backgroundColor: "#0b1120", padding: 30, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  emptyText: { color: "#64748b", fontSize: 12, marginTop: 8, textAlign: "center" },
  submitBtn: { backgroundColor: "#0284c7", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 20 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 320, backgroundColor: "#0b1120", borderRadius: 20, padding: 22, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  modalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  modalSubtitle: { color: "#64748b", fontSize: 11, textAlign: "center", marginVertical: 8 },
  pinInput: { width: "100%", height: 50, backgroundColor: "#050811", borderWidth: 1, borderColor: "#1e293b", borderRadius: 12, textAlign: "center", fontSize: 24, letterSpacing: 8, color: "#fff", fontWeight: "bold", marginVertical: 14 },
  modalSubmitBtn: { width: "100%", backgroundColor: "#0284c7", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalSubmitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});

export default BuyDataScreen;