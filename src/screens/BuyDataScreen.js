import React, { useState, useEffect, useCallback } from "react";
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
  FlatList,
  RefreshControl,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const networks = [
  { id: "01", name: "MTN", color: "#FFCC00", textColor: "#000" },
  { id: "04", name: "Airtel", color: "#e74c3c", textColor: "#fff" },
  { id: "02", name: "GLO", color: "#2ecc71", textColor: "#fff" },
  { id: "03", name: "9Mobile", color: "#006600", textColor: "#fff" },
];

const dataCategories = ["SME", "GIFTING", "CORPORATE"];

const BuyDataScreen = ({ navigation }) => {
  const [selectedNet, setSelectedNet] = useState("01");
  const [dataType, setDataType] = useState("SME");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);

  // Database Plans & Loading
  const [plans, setPlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [planModalVisible, setPlanModalVisible] = useState(false);
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

  // Ɗauko dukkan plans daga Database
  const fetchPlans = useCallback(async () => {
    setLoadingPlans(true);
    const activeNetName =
      networks.find((n) => n.id === selectedNet)?.name || "MTN";
    try {
      const response = await axios.get(`${BASE_URL}/plans/active`, {
        params: { network: activeNetName, dataType },
      });
      if (response.data?.plans) {
        setPlans(response.data.plans);
      }
    } catch (error) {
      console.log("Error fetching active plans from database.");
    } finally {
      setLoadingPlans(false);
      setRefreshing(false);
    }
  }, [selectedNet, dataType]);

  useEffect(() => {
    fetchPlans();
    setSelectedPlan(null);
  }, [fetchPlans]);

  // Bincika bayanan mai amfani kafin buɗe PIN
  const handleInitiatePurchase = () => {
    if (!phone.trim()) {
      return showAlert("Missing Details", "Enter the recipient phone number.");
    }
    if (phone.trim().length < 11) {
      return showAlert(
        "Invalid Number",
        "Enter a valid 11-digit phone number."
      );
    }
    if (!selectedPlan) {
      return showAlert(
        "Plan Required",
        "Please click 'Select Data Plan' to choose a bundle."
      );
    }
    setPinModalVisible(true);
  };

  // Biyan Kuɗi
  const handlePurchase = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("PIN Error", "Enter your 4-digit Transaction PIN.");
    }

    setPurchasing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const activeNetName =
        networks.find((n) => n.id === selectedNet)?.name || "MTN";

      const response = await axios.post(
        `${BASE_URL}/vtu/buy-data-custom`,
        {
          networkId: selectedNet,
          network: activeNetName,
          dataType,
          planId: selectedPlan._id,
          planSize: selectedPlan.sizeLabel,
          amount: selectedPlan.price,
          phoneNumber: phone.trim(),
          phone: phone.trim(),
          pin: pin.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 25000,
        }
      );

      if (response.data?.success || response.data?.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Transaction Successful 🎉",
          `${dataType} ${selectedPlan.sizeLabel} has been sent to ${phone}.`,
          () => {
            setPhone("");
            setSelectedPlan(null);
          }
        );
      } else {
        throw new Error(response.data?.message || "Transaction failed");
      }
    } catch (error) {
      showAlert(
        "Failed",
        error.response?.data?.message || error.message || "Network Error"
      );
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            fetchPlans();
          }}
        />
      }
    >
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={26} color="#0a1d37" />
        </TouchableOpacity>
        <Text style={styles.headerText}>Buy Data Bundle</Text>
      </View>

      {/* 1. Network Selection */}
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
                },
              ]}
              onPress={() => setSelectedNet(net.id)}
            >
              <Text
                style={[
                  styles.netText,
                  { color: isSelected ? net.textColor : "#64748b" },
                ]}
              >
                {net.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 2. Data Type Selection */}
      <Text style={styles.label}>Select Data Type</Text>
      <View style={styles.typeContainer}>
        {dataCategories.map((type) => {
          const active = dataType === type;
          return (
            <TouchableOpacity
              key={type}
              style={[styles.typeTab, active && styles.activeTypeTab]}
              onPress={() => setDataType(type)}
            >
              <Text
                style={[
                  styles.typeTabText,
                  active && styles.activeTypeTabText,
                ]}
              >
                {type}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 3. Recipient Phone */}
      <Text style={styles.label}>Recipient Phone Number</Text>
      <View style={styles.inputWrapper}>
        <Ionicons
          name="call-outline"
          size={20}
          color="#64748b"
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.inputWithIcon}
          placeholder="08012345678"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          value={phone}
          onChangeText={setPhone}
          maxLength={11}
        />
      </View>

      {/* 4. Plan Selector */}
      <Text style={styles.label}>Select Data Plan</Text>
      <TouchableOpacity
        style={styles.planSelector}
        onPress={() => setPlanModalVisible(true)}
      >
        <View style={{ flex: 1 }}>
          {selectedPlan ? (
            <View>
              <Text style={styles.selectedPlanTitle}>
                {dataType} {selectedPlan.sizeLabel} - {selectedPlan.validity}
              </Text>
              <Text style={styles.selectedPlanCost}>
                Price: ₦{Number(selectedPlan.price).toLocaleString()}
              </Text>
            </View>
          ) : (
            <Text style={styles.placeholderText}>
              {loadingPlans ? "Loading plans..." : "Tap to choose a plan..."}
            </Text>
          )}
        </View>
        <Ionicons name="chevron-down-circle" size={24} color="#0a1d37" />
      </TouchableOpacity>

      {/* 5. Summary Display */}
      {selectedPlan && (
        <View style={styles.summaryCard}>
          <View>
            <Text style={styles.summaryLabel}>Total Payable Amount:</Text>
            <Text style={styles.summarySub}>
              {dataType} {selectedPlan.sizeLabel} ({selectedPlan.validity})
            </Text>
          </View>
          <Text style={styles.summaryPrice}>
            ₦{Number(selectedPlan.price).toLocaleString()}
          </Text>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.buyBtn} onPress={handleInitiatePurchase}>
        <Text style={styles.buyBtnText}>PROCEED & PAY</Text>
      </TouchableOpacity>

      {/* Plan Selection Modal */}
      <Modal visible={planModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.planModalContent}>
            <View style={styles.planModalHeader}>
              <Text style={styles.planModalTitle}>
                {networks.find((n) => n.id === selectedNet)?.name} {dataType}{" "}
                Plans
              </Text>
              <TouchableOpacity onPress={() => setPlanModalVisible(false)}>
                <Ionicons name="close-circle" size={28} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {loadingPlans ? (
              <ActivityIndicator
                size="large"
                color="#0a1d37"
                style={{ marginVertical: 30 }}
              />
            ) : plans.length === 0 ? (
              <View style={{ padding: 30, alignItems: "center" }}>
                <Text style={{ color: "#64748b", fontSize: 14 }}>
                  No active plans found for this network and category.
                </Text>
              </View>
            ) : (
              <FlatList
                data={plans}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const isCurrent = selectedPlan?._id === item._id;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.planItemRow,
                        isCurrent && styles.activePlanItemRow,
                      ]}
                      onPress={() => {
                        setSelectedPlan(item);
                        setPlanModalVisible(false);
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.planItemSize,
                            isCurrent && styles.activePlanItemText,
                          ]}
                        >
                          {dataType} {item.sizeLabel}
                        </Text>
                        <Text style={styles.planItemValidity}>
                          Validity: {item.validity}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        <Text style={styles.planItemPrice}>
                          ₦{Number(item.price).toLocaleString()}
                        </Text>
                        <Ionicons
                          name={
                            isCurrent
                              ? "checkmark-circle"
                              : "chevron-forward-circle-outline"
                          }
                          size={20}
                          color={isCurrent ? "#0a1d37" : "#94a3b8"}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Transaction PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.pinModalBox}>
            <Ionicons
              name="shield-checkmark"
              size={36}
              color="#0a1d37"
              style={{ marginBottom: 8 }}
            />
            <Text style={styles.pinModalTitle}>Authorize Payment</Text>
            <Text style={styles.pinModalDesc}>
              Enter your 4-digit PIN to pay{" "}
              <Text style={{ fontWeight: "bold", color: "#0a1d37" }}>
                ₦
                {selectedPlan
                  ? Number(selectedPlan.price).toLocaleString()
                  : 0}
              </Text>
            </Text>

            <TextInput
              style={styles.pinInputBox}
              placeholder="••••"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={setPin}
              autoFocus
            />

            <TouchableOpacity
              style={[
                styles.confirmPinBtn,
                { opacity: purchasing ? 0.7 : 1 },
              ]}
              onPress={handlePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.confirmPinText}>CONFIRM & SEND</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => {
                setPinModalVisible(false);
                setPin("");
              }}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0a1d37",
    marginLeft: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginTop: 15,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  netGrid: { flexDirection: "row", justifyContent: "space-between" },
  netBox: {
    width: "23%",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  netText: { fontWeight: "800", fontSize: 13 },
  typeContainer: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 4,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  activeTypeTab: { backgroundColor: "#0a1d37" },
  typeTabText: { fontSize: 13, fontWeight: "700", color: "#64748b" },
  activeTypeTabText: { color: "#ffffff" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  inputWithIcon: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: "#0f172a",
    fontWeight: "600",
  },
  planSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: 14,
  },
  placeholderText: { color: "#94a3b8", fontSize: 14, fontWeight: "600" },
  selectedPlanTitle: { fontSize: 15, fontWeight: "800", color: "#0a1d37" },
  selectedPlanCost: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "700",
    marginTop: 2,
  },
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderLeftWidth: 4,
    borderLeftColor: "#0a1d37",
    padding: 16,
    borderRadius: 12,
    marginTop: 18,
  },
  summaryLabel: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  summarySub: {
    fontSize: 12,
    color: "#0a1d37",
    fontWeight: "700",
    marginTop: 2,
  },
  summaryPrice: { fontSize: 20, fontWeight: "900", color: "#0a1d37" },
  buyBtn: {
    backgroundColor: "#0a1d37",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
    elevation: 3,
  },
  buyBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 29, 55, 0.65)",
    justifyContent: "flex-end",
  },
  planModalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "75%",
  },
  planModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  planModalTitle: { fontSize: 16, fontWeight: "800", color: "#0a1d37" },
  planItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    borderRadius: 10,
  },
  activePlanItemRow: { backgroundColor: "#f1f5f9" },
  planItemSize: { fontSize: 15, fontWeight: "700", color: "#1e293b" },
  planItemValidity: { fontSize: 11, color: "#64748b", marginTop: 2 },
  planItemPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0a1d37",
    marginRight: 8,
  },
  activePlanItemText: { color: "#0a1d37" },
  pinModalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginHorizontal: 20,
    alignSelf: "center",
    width: "88%",
  },
  pinModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0a1d37",
    marginBottom: 6,
  },
  pinModalDesc: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 18,
  },
  pinInputBox: {
    width: "100%",
    height: 50,
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 18,
  },
  confirmPinBtn: {
    width: "100%",
    backgroundColor: "#0a1d37",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmPinText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  cancelBtn: { paddingVertical: 6, alignItems: "center" },
  cancelBtnText: { color: "#ef4444", fontWeight: "700", fontSize: 12 },
});

export default BuyDataScreen;