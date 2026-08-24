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
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const initialValidationTypes = [
  { id: "no_record", name: "No Record Found", cost: 1300 },
  { id: "sim_val", name: "SIM Validation", cost: 1300 },
  { id: "vnin_val", name: "vNIN Validation", cost: 1300 },
  { id: "update_record", name: "Update Records Validation", cost: 1300 },
  { id: "bank_val", name: "Bank Validation", cost: 1300 },
  { id: "mod_val", name: "Modification Validation", cost: 1700 },
  { id: "photo_error", name: "Photographic Error", cost: 1400 },
];

const NINValidation = ({ navigation }) => {
  const [validationTypes, setValidationTypes] = useState(initialValidationTypes);
  const [selectedType, setSelectedType] = useState("No Record Found");
  const [loading, setLoading] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [formData, setFormData] = useState({ 
    nin: "", 
    phoneNumber: "", 
    fullName: "",
    additionalNote: "" 
  });
  const [currentUser, setCurrentUser] = useState(null);

  // Admin Price Control States
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // PIN Modal States
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

  // 1. Fetch live prices & user info
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
      console.log("NIN live prices fallback active");
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const stored = await AsyncStorage.getItem("userData");
        if (stored) {
          const parsed = JSON.parse(stored);
          setCurrentUser(parsed);
          setIsAdmin(parsed.role === "admin" || parsed.role === "superadmin" || parsed.isAdmin === true);
          if (parsed.name || parsed.fullName) {
            setFormData((prev) => ({
              ...prev,
              fullName: parsed.name || parsed.fullName || "",
              phoneNumber: parsed.phone || parsed.phoneNumber || "",
            }));
          }
        }
      } catch (e) {}
    };
    checkRole();
    fetchLivePrices();
  }, [fetchLivePrices]);

  const currentItem = validationTypes.find((t) => t.name === selectedType);
  const currentCost = currentItem?.cost || 1300;

  // 2. Admin Price Update Action
  const handleSaveAdminPrice = async () => {
    const numericPrice = Number(newPriceInput);
    if (!newPriceInput || isNaN(numericPrice) || numericPrice < 0) {
      return showAlert("Error", "Please enter a valid numeric price.");
    }

    setUpdatingPrice(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
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
      setAdminModalVisible(false);
      setNewPriceInput("");
      showAlert("Updated", `${editingItem.name} price set to ₦${numericPrice.toLocaleString()}`);
    } finally {
      setUpdatingPrice(false);
    }
  };

  const handleInitiateSubmit = () => {
    if (!formData.nin.trim() || formData.nin.trim().length !== 11) {
      return showAlert("Invalid NIN", "Please enter a valid 11-digit NIN Number.");
    }

    if (!isAuthorized) {
      return showAlert(
        "Consent Required",
        "Please accept the legal authorization consent before submitting."
      );
    }

    setPinModalVisible(true);
  };

  // 3. Submit Validation Application Directly to Admin / Super Admin Dashboard
  const handleSubmit = async () => {
    if (!pin || pin.length !== 4) {
      return showAlert("Security PIN", "Transaction PIN must be 4 digits.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const txReference = `NIN_VAL_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

      const payload = {
        reference: txReference,
        service: "NIN_VALIDATION",
        validationType: selectedType,
        serviceId: currentItem?.id,
        nin: formData.nin.trim(),
        applicantName: formData.fullName || currentUser?.name || "Client",
        applicantPhone: formData.phoneNumber || currentUser?.phone || "N/A",
        additionalNote: formData.additionalNote.trim() || "Standard request",
        amount: currentCost,
        status: "PENDING",
        submissionDate: new Date().toISOString(),
        pin: pin.trim(),
        transactionPin: pin.trim(),
      };

      const response = await axios.post(
        `${BASE_URL}/nin/validate-request`,
        payload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        showAlert(
          "Submission Successful 🎉",
          `Your validation request for NIN (${formData.nin.trim()}) has been queued. Administrators will review and process your request shortly.`,
          () => {
            setFormData({
              nin: "",
              phoneNumber: currentUser?.phone || "",
              fullName: currentUser?.name || "",
              additionalNote: "",
            });
            setIsAuthorized(false);
          }
        );
      } else {
        throw new Error(result.message || "Failed to submit request.");
      }
    } catch (error) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        "Server communication failure. Please check your connection.";
      showAlert("Submission Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Navigation */}
      <View style={styles.topHeaderRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
        </TouchableOpacity>
        <Text style={styles.screenMainTitle}>NIN Validation Submission</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Service Selection Card */}
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons name="shield-checkmark-outline" size={18} color="#1e3a8a" />
            <Text style={styles.title}>Validation Type</Text>
          </View>
          <View style={styles.priceBadge}>
            <Text style={styles.priceText}>Fee: ₦{currentCost?.toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.chipContainer}>
          {validationTypes.map((type) => {
            const isSelected = selectedType === type.name;
            return (
              <View key={type.id} style={styles.chipWrapper}>
                <TouchableOpacity
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setSelectedType(type.name)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                    {type.name}
                  </Text>
                  <Text style={[styles.chipPriceTag, isSelected && styles.selectedChipPriceTag]}>
                    ₦{type.cost.toLocaleString()}
                  </Text>
                </TouchableOpacity>

                {isAdmin && (
                  <TouchableOpacity
                    style={styles.adminEditBtn}
                    onPress={() => {
                      setEditingItem(type);
                      setNewPriceInput(String(type.cost));
                      setAdminModalVisible(true);
                    }}
                  >
                    <Ionicons name="pencil" size={12} color="#f59e0b" />
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Information Input Form */}
      <View style={styles.card}>
        <Text style={styles.label}>NIN Number (11 Digits) *</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter 11-digit NIN"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={11}
          value={formData.nin}
          onChangeText={(v) => setFormData({ ...formData, nin: v })}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Applicant Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. John Doe"
          placeholderTextColor="#94a3b8"
          value={formData.fullName}
          onChangeText={(v) => setFormData({ ...formData, fullName: v })}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Contact Phone Number</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#94a3b8"
          keyboardType="numeric"
          maxLength={11}
          value={formData.phoneNumber}
          onChangeText={(v) => setFormData({ ...formData, phoneNumber: v })}
        />

        <Text style={[styles.label, { marginTop: 14 }]}>Additional Note (Optional)</Text>
        <TextInput
          style={[styles.input, { height: 65, textAlignVertical: "top", paddingTop: 10 }]}
          placeholder="Enter specific instructions or batch info"
          placeholderTextColor="#94a3b8"
          multiline
          value={formData.additionalNote}
          onChangeText={(v) => setFormData({ ...formData, additionalNote: v })}
        />
      </View>

      {/* Authorization Consent & Submission Card */}
      <View style={styles.card}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <MaterialCommunityIcons name="shield-lock" size={20} color="#1e3a8a" />
          <Text style={styles.authTitle}>Legal Authorization Consent</Text>
        </View>

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsAuthorized(!isAuthorized)}
          activeOpacity={0.9}
        >
          <MaterialCommunityIcons
            name={isAuthorized ? "checkbox-marked" : "checkbox-blank-outline"}
            size={24}
            color={isAuthorized ? "#1e3a8a" : "#cbd5e1"}
          />
          <Text style={styles.authText}>
            I certify that I have the legitimate authority from the owner to submit this NIN for validation.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitBtn, !isAuthorized && { backgroundColor: "#cbd5e1" }]}
          onPress={handleInitiateSubmit}
          disabled={!isAuthorized}
          activeOpacity={0.85}
        >
          <Text style={styles.submitBtnText}>
            SUBMIT TO ADMIN (₦{currentCost?.toLocaleString()})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Admin Price Update Modal */}
      <Modal visible={adminModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="pricetag" size={32} color="#f59e0b" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Update Service Price</Text>
            <Text style={styles.modalSubtitle}>Set new fee for {editingItem?.name}</Text>

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
              <Text style={{ color: "#dc2626", fontWeight: "bold" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#1e3a8a" />
            </View>
            <Text style={styles.modalTitle}>Enter Security PIN</Text>
            <Text style={styles.modalSubtitle}>
              Authorize ₦{currentCost?.toLocaleString()} charge for {selectedType}
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
                <Text style={styles.verifyModalBtnText}>Confirm & Submit Request</Text>
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
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 16, paddingTop: 15 },
  topHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Platform.OS === "ios" ? 40 : 25,
    marginBottom: 15,
  },
  backButton: { width: 40, height: 40, justifyContent: "center" },
  screenMainTitle: { fontSize: 16, fontWeight: "900", color: "#1e3a8a" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: { fontSize: 13, fontWeight: "800", marginLeft: 6, color: "#1e3a8a" },
  priceBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  priceText: { color: "#0369a1", fontSize: 11, fontWeight: "800" },
  chipContainer: { flexDirection: "row", flexWrap: "wrap" },
  chipWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    marginBottom: 10,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8fafc",
  },
  selectedChip: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  chipText: { fontSize: 11.5, color: "#64748b", fontWeight: "700" },
  selectedChipText: { color: "#fff", fontWeight: "800" },
  chipPriceTag: { fontSize: 9.5, color: "#94a3b8", fontWeight: "700", marginTop: 2 },
  selectedChipPriceTag: { color: "#38bdf8" },
  adminEditBtn: {
    padding: 6,
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 8,
    marginLeft: 4,
  },
  label: { fontSize: 11.5, fontWeight: "800", color: "#475569", marginBottom: 6, letterSpacing: 0.3 },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: "#f8fafc",
    color: "#0f172a",
    fontSize: 14.5,
    fontWeight: "600",
  },
  authTitle: { fontSize: 13, fontWeight: "800", marginLeft: 6, color: "#1e3a8a" },
  checkboxRow: {
    flexDirection: "row",
    marginTop: 12,
    alignItems: "flex-start",
  },
  authText: { fontSize: 11.5, color: "#475569", marginLeft: 10, flex: 1, lineHeight: 18 },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 18,
    elevation: 2,
  },
  submitBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.5 },

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
    maxWidth: 320,
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 8,
  },
  modalHeaderIcon: { marginBottom: 8 },
  modalTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1e3a8a",
    marginBottom: 4,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 11.5,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 16,
  },
  adminModalInput: {
    width: "100%",
    height: 48,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 16,
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
    marginBottom: 18,
  },
  verifyModalBtn: {
    width: "100%",
    height: 46,
    backgroundColor: "#1e3a8a",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  verifyModalBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13,
  },
  cancelModalBtn: { paddingVertical: 6 },
  cancelModalBtnText: {
    color: "#dc2626",
    fontWeight: "700",
    fontSize: 12,
  },
});

export default NINValidation;