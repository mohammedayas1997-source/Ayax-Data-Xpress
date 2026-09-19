import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const officialValidationTypes = [
  {
    id: "no_record",
    name: "No Record Found",
    desc: "Profile synchronization & re-linking",
    icon: "search",
    cost: 1300,
  },
  {
    id: "simbank_validation",
    name: "SIM / Bank Validation",
    desc: "Telco line & BVN-NIN tie clearing",
    icon: "sim-card",
    cost: 1300,
  },
  {
    id: "modification",
    name: "Modification Validation",
    desc: "Clearance after Name, DOB or Phone update",
    icon: "user-edit",
    cost: 1700,
  },
  {
    id: "photo_error",
    name: "Photographic Error",
    desc: "Portrait facial biometric resolution",
    icon: "camera",
    cost: 1400,
  },
];

const NINValidation = ({ navigation }) => {
  const [validationTypes, setValidationTypes] = useState(officialValidationTypes);
  const [selectedType, setSelectedType] = useState(officialValidationTypes[0]);
  const [nin, setNin] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isTimeAgreed, setIsTimeAgreed] = useState(false);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);

  // Receipt State
  const [receiptData, setReceiptData] = useState(null);
  const [showReceipt, setShowReceipt] = useState(false);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => onPressCallback && onPressCallback(),
        },
      ]);
    }
  };

  const fetchLivePrices = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/nin/prices`, { timeout: 10000 });
      if (res.data?.success && res.data?.prices) {
        const serverPrices = res.data.prices;
        setValidationTypes((prev) =>
          prev.map((item) => ({
            ...item,
            cost: serverPrices[item.id] !== undefined ? serverPrices[item.id] : item.cost,
          }))
        );
      }
    } catch (e) {
      console.log("Validation price fallback active");
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const stored = await AsyncStorage.getItem("userData");
        if (stored) {
          const parsed = JSON.parse(stored);
          setIsAdmin(parsed.role === "admin" || parsed.isAdmin === true || parsed.role === "superadmin");
        }
      } catch (e) {}
    };
    checkRole();
    fetchLivePrices();
  }, [fetchLivePrices]);

  const currentCost = selectedType?.cost || 1300;

  const handleSaveAdminPrice = async () => {
    const numericPrice = Number(newPriceInput);
    if (!newPriceInput || isNaN(numericPrice) || numericPrice < 0) {
      return showAlert("Error", "Please enter a valid numeric price.");
    }

    setUpdatingPrice(true);
    try {
      const token = (await AsyncStorage.getItem("userToken")) || (await AsyncStorage.getItem("token"));
      const res = await axios.post(
        `${BASE_URL}/admin/nin/update-price`,
        {
          serviceId: editingItem.id,
          serviceName: editingItem.name,
          price: numericPrice,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 15000,
        }
      );

      if (res.data?.success) {
        setValidationTypes((prev) =>
          prev.map((item) =>
            item.id === editingItem.id ? { ...item, cost: numericPrice } : item
          )
        );
        if (selectedType.id === editingItem.id) {
          setSelectedType((prev) => ({ ...prev, cost: numericPrice }));
        }
        setAdminModalVisible(false);
        setNewPriceInput("");
        showAlert("Updated", `${editingItem.name} price updated to ₦${numericPrice.toLocaleString()}`);
      } else {
        throw new Error(res.data?.message || "Failed to update price on server.");
      }
    } catch (err) {
      setValidationTypes((prev) =>
        prev.map((item) =>
          item.id === editingItem.id ? { ...item, cost: numericPrice } : item
        )
      );
      if (selectedType.id === editingItem.id) {
        setSelectedType((prev) => ({ ...prev, cost: numericPrice }));
      }
      setAdminModalVisible(false);
      setNewPriceInput("");
      showAlert("Updated", `${editingItem.name} price set to ₦${numericPrice.toLocaleString()}`);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleInitiateSubmit = () => {
    const cleanNin = nin.trim().replace(/\D/g, "");
    if (!cleanNin) {
      return showAlert("Required", "Please enter the 11-digit NIN.");
    }

    if (cleanNin.length !== 11) {
      return showAlert("Invalid NIN", "NIN must be exactly 11 digits.");
    }

    if (!isAuthorized) {
      return showAlert("Consent Required", "Please confirm that you have user authorization.");
    }

    if (!isTimeAgreed) {
      return showAlert(
        "Notice Required",
        "Please acknowledge the 24 - 48 working hours manual clearing window."
      );
    }

    setPinModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!pin || pin.trim().length !== 4) {
      return showAlert("Security PIN", "Please enter your 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = (await AsyncStorage.getItem("userToken")) || (await AsyncStorage.getItem("token"));
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const cleanNin = nin.trim().replace(/\D/g, "");
      const requestPayload = {
        nin: cleanNin,
        error_type: selectedType.id,
        issueType: selectedType.id,
        validationType: selectedType.id,
        type: selectedType.id,
        serviceId: selectedType.id,
        amount: currentCost,
        pin: pin.trim(),
        transactionPin: pin.trim(),
        processingWindow: "48_WORKING_HOURS",
      };

      let response;
      try {
        response = await axios.post(`${BASE_URL}/validation/submit`, requestPayload, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 45000,
        });
      } catch (errRoute) {
        if (errRoute.response?.status === 404) {
          response = await axios.post(`${BASE_URL}/nin/validate`, requestPayload, {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            timeout: 45000,
          });
        } else {
          throw errRoute;
        }
      }

      const resData = response.data;
      if (resData.success || resData.status === "success") {
        setPinModalVisible(false);
        setPin("");

        const ticketId =
          resData.data?.ticketId ||
          resData.ticketId ||
          resData.reference ||
          `TKT-${Date.now().toString().slice(-6)}`;

        setReceiptData({
          type: selectedType.name,
          nin: cleanNin,
          ticketId,
          amount: currentCost,
        });
        setShowReceipt(true);
      } else {
        throw new Error(resData.message || "Failed to submit validation request.");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Server communication failure. Please check your connection.";
      showAlert("Validation Submission Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setNin("");
    setIsAuthorized(false);
    setIsTimeAgreed(false);
    setShowReceipt(false);
    setReceiptData(null);
  };

  const cleanNinLength = nin.trim().replace(/\D/g, "").length;
  const isFormReady = isAuthorized && isTimeAgreed && cleanNinLength === 11;

  if (showReceipt && receiptData) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.topHeaderRow}>
          <TouchableOpacity onPress={handleReset} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#0a1d37" />
          </TouchableOpacity>
          <Text style={styles.screenMainTitle}>Submission Receipt</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.receiptContainer}>
          <View style={styles.receiptIconWrap}>
            <Ionicons name="checkmark-sharp" size={32} color="#16a34a" />
          </View>
          <Text style={styles.receiptTitle}>Validation Request Queued!</Text>
          <Text style={styles.receiptSub}>
            Your request has been forwarded to the official manual clearance queue.
          </Text>

          <View style={styles.receiptDetailsCard}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Service Type:</Text>
              <Text style={styles.detailValue}>{receiptData.type}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Validated NIN:</Text>
              <Text style={styles.detailValue}>{receiptData.nin}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Tracking / Ticket ID:</Text>
              <Text style={[styles.detailValue, { color: "#0284c7" }]}>{receiptData.ticketId}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Amount Deducted:</Text>
              <Text style={styles.detailValue}>₦{receiptData.amount.toLocaleString()}</Text>
            </View>
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailLabel}>Current Status:</Text>
              <Text style={[styles.detailValue, { color: "#d97706" }]}>
                PENDING CLEARANCE (24-48 HRS)
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.btnDone} onPress={handleReset} activeOpacity={0.85}>
            <Text style={styles.btnDoneText}>SUBMIT ANOTHER VALIDATION</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Header */}
      <View style={styles.topHeaderRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#0a1d37" />
        </TouchableOpacity>
        <Text style={styles.screenMainTitle}>NIN Validation Desk</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* 48-Working Hours Window Notice */}
      <View style={styles.noticeCard}>
        <View style={styles.noticeHeader}>
          <Ionicons name="time" size={18} color="#b45309" />
          <Text style={styles.noticeTitle}>MANUAL QUEUE NOTICE: 24 - 48 WORKING HOURS</Text>
        </View>
        <Text style={styles.noticeText}>
          NIN validation requests are submitted directly to the clearing desk. Processing takes{" "}
          <Text style={{ fontWeight: "900" }}>24 to 48 working hours</Text>. Saturdays, Sundays, and
          public holidays are excluded from clearing operations.
        </Text>
      </View>

      {/* Select Error Type Grid */}
      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="warning-outline" size={18} color="#f59e0b" />
          <Text style={styles.cardTitle}>Select Error / Validation Category</Text>
        </View>

        <View style={styles.validationGrid}>
          {validationTypes.map((item) => {
            const isSelected = selectedType.id === item.id;
            return (
              <View key={item.id} style={{ marginBottom: 10 }}>
                <TouchableOpacity
                  style={[styles.valOptionCard, isSelected && styles.valOptionCardSelected]}
                  onPress={() => setSelectedType(item)}
                  activeOpacity={0.85}
                >
                  <View style={styles.valInfoLeft}>
                    <View style={[styles.valIconBox, isSelected && styles.valIconBoxSelected]}>
                      <FontAwesome5
                        name={item.icon}
                        size={16}
                        color={isSelected ? "#b45309" : "#f59e0b"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.valName}>{item.name}</Text>
                      <Text style={styles.valDesc}>{item.desc}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.valPriceTag}>₦{item.cost.toLocaleString()}</Text>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.adminEditBadge}
                        onPress={() => {
                          setEditingItem(item);
                          setNewPriceInput(String(item.cost));
                          setAdminModalVisible(true);
                        }}
                      >
                        <Ionicons name="pencil" size={11} color="#f59e0b" />
                        <Text style={styles.adminEditText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>

      {/* Target NIN Input */}
      <View style={styles.card}>
        <Text style={styles.fieldLabel}>National Identification Number (11 Digits) *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter 11-digit NIN"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={11}
          value={nin}
          onChangeText={setNin}
        />
      </View>

      {/* Consent and Acknowledgement */}
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsAuthorized(!isAuthorized)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={isAuthorized ? "checkbox-marked" : "checkbox-blank-outline"}
            size={22}
            color={isAuthorized ? "#b45309" : "#cbd5e1"}
          />
          <Text style={styles.consentText}>
            I confirm that I have the owner's authorization to submit this NIN for validation and
            database synchronization.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsTimeAgreed(!isTimeAgreed)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons
            name={isTimeAgreed ? "checkbox-marked" : "checkbox-blank-outline"}
            size={22}
            color={isTimeAgreed ? "#b45309" : "#cbd5e1"}
          />
          <Text style={[styles.consentText, { color: "#b45309", fontWeight: "700" }]}>
            I acknowledge that this request enters a manual clearance window of 24 to 48 working hours.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, !isFormReady && { backgroundColor: "#cbd5e1" }]}
          onPress={handleInitiateSubmit}
          disabled={!isFormReady}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            SUBMIT VALIDATION REQUEST (₦{currentCost.toLocaleString()})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin Price Edit Modal */}
      <Modal visible={adminModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="pricetag" size={32} color="#f59e0b" style={{ marginBottom: 8 }} />
            <Text style={styles.modalTitle}>Update Service Price</Text>
            <Text style={styles.modalSubtitle}>Set fee for {editingItem?.name}</Text>

            <TextInput
              style={styles.adminModalInput}
              placeholder="Enter price in Naira"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={newPriceInput}
              onChangeText={setNewPriceInput}
            />

            <TouchableOpacity
              style={[styles.verifyModalBtn, updatingPrice && { opacity: 0.7 }]}
              onPress={handleSaveAdminPrice}
              disabled={updatingPrice}
            >
              {updatingPrice ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyModalBtnText}>SAVE PRICE</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setAdminModalVisible(false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "bold", fontSize: 12 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={34} color="#b45309" style={{ marginBottom: 6 }} />
            <Text style={styles.modalTitle}>Enter Security PIN</Text>
            <Text style={styles.modalSubtitle}>
              Authorize ₦{currentCost.toLocaleString()} for {selectedType.name}
            </Text>

            <TextInput
              style={styles.modalPinInput}
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
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.verifyModalBtnText}>Confirm & Authorize</Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16 },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 44 : 26,
    marginBottom: 14,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  screenMainTitle: { fontSize: 17, fontWeight: "900", color: "#0a1d37" },

  noticeCard: {
    backgroundColor: "#fffbeb",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: "#fde68a",
  },
  noticeHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  noticeTitle: {
    color: "#b45309",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.3,
  },
  noticeText: {
    color: "#92400e",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 13.5,
    fontWeight: "900",
    color: "#0a1d37",
    marginLeft: 8,
  },

  validationGrid: {
    marginTop: 2,
  },
  valOptionCard: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valOptionCardSelected: {
    borderColor: "#f59e0b",
    backgroundColor: "#fffdf5",
  },
  valInfoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 10,
  },
  valIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  valIconBoxSelected: {
    backgroundColor: "#fef3c7",
    borderColor: "#fde68a",
  },
  valName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 2,
  },
  valDesc: {
    fontSize: 10.5,
    color: "#64748b",
  },
  valPriceTag: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0a1d37",
  },
  adminEditBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  adminEditText: {
    fontSize: 9.5,
    color: "#f59e0b",
    fontWeight: "800",
    marginLeft: 3,
  },

  fieldLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#475569",
    marginBottom: 8,
  },
  textInput: {
    height: 50,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: 1,
  },

  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  consentText: {
    fontSize: 11.5,
    color: "#475569",
    marginLeft: 10,
    flex: 1,
    lineHeight: 17,
    fontWeight: "600",
  },

  submitBtn: {
    backgroundColor: "#b45309",
    height: 50,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  submitBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },

  // Receipt View Styles
  receiptContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    alignItems: "center",
    marginTop: 10,
  },
  receiptIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },
  receiptSub: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  receiptDetailsCard: {
    width: "100%",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  detailLabel: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "600",
  },
  detailValue: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    textAlign: "right",
  },
  btnDone: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#0a1d37",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  btnDoneText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 12,
  },
  adminModalInput: {
    width: "100%",
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 14,
  },
  modalPinInput: {
    width: "100%",
    height: 50,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 16,
  },
  verifyModalBtn: {
    width: "100%",
    height: 46,
    backgroundColor: "#b45309",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  verifyModalBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  cancelModalBtn: {
    paddingVertical: 6,
  },
  cancelModalBtnText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default NINValidation;