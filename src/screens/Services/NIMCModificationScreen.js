import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NIMCModification = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState({});
  const [selectedType, setSelectedType] = useState("name");
  const [formData, setFormData] = useState({});
  
  // PIN Modal States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const { data } = await axios.get(`${BASE_URL}/nimc/prices`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (data.success || data.status === "success") {
        setPrices(data.prices || data.data || {});
      }
    } catch (err) {
      console.log("Error fetching prices:", err);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleInitiateSubmit = () => {
    if (!formData.ninNumber) {
      return Alert.alert(
        "Required",
        "Please fill in your NIN number",
      );
    }

    if (formData.ninNumber.length !== 11) {
      return Alert.alert("Error", "NIN must be exactly 11 digits");
    }

    setPinModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!pin || pin.length !== 4) {
      return Alert.alert("Error", "Transaction PIN must be 4 digits");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const response = await axios.post(
        `${BASE_URL}/nimc/request-modification`,
        {
          serviceType: selectedType,
          formData: formData,
          ninNumber: formData.ninNumber,
          pin: pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = response.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        Alert.alert("Success", "Modification request submitted successfully", [
          { text: "OK", onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error(result.message || "Submission failed");
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || err.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const modificationOptions = [
    { id: "name", label: "Name", icon: "person-outline" },
    { id: "phone", label: "Phone", icon: "call-outline" },
    { id: "dob", label: "DOB", icon: "calendar-outline" },
    { id: "address", label: "Address", icon: "location-outline" },
    { id: "name_dob", label: "Name & DOB", icon: "id-card-outline" },
    { id: "name_phone", label: "Name & Phone", icon: "person-add-outline" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Modification</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScroll}
          >
            {modificationOptions.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.tabItem,
                  selectedType === item.id && styles.activeTabItem,
                ]}
                onPress={() => setSelectedType(item.id)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={item.icon}
                  size={18}
                  color={selectedType === item.id ? "#fff" : "#64748b"}
                />
                <Text
                  style={[
                    styles.tabText,
                    selectedType === item.id && styles.activeTabText,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Primary Details</Text>
              <View style={styles.priceBadge}>
                <Text style={styles.priceText}>
                  Fee: ₦{prices[selectedType] || "0.00"}
                </Text>
              </View>
            </View>

            <InputField
              label="NIN Number (11 Digits)"
              placeholder="Enter 11-digit NIN"
              keyboardType="numeric"
              maxLength={11}
              value={formData.ninNumber || ""}
              onChangeText={(v) => handleInputChange("ninNumber", v)}
            />

            {/* Dynamic Fields based on Selection */}
            {selectedType === "name" && (
              <>
                <InputField
                  label="First Name"
                  placeholder="New first name"
                  value={formData.firstName || ""}
                  onChangeText={(v) => handleInputChange("firstName", v)}
                />
                <InputField
                  label="Last Name"
                  placeholder="New last name"
                  value={formData.lastName || ""}
                  onChangeText={(v) => handleInputChange("lastName", v)}
                />
                <InputField
                  label="Middle Name"
                  placeholder="New middle name"
                  value={formData.middleName || ""}
                  onChangeText={(v) => handleInputChange("middleName", v)}
                />
              </>
            )}

            {selectedType === "phone" && (
              <>
                <InputField
                  label="Full Name"
                  placeholder="As seen on NIN"
                  value={formData.fullName || ""}
                  onChangeText={(v) => handleInputChange("fullName", v)}
                />
                <InputField
                  label="New Phone Number"
                  placeholder="080..."
                  keyboardType="phone-pad"
                  maxLength={11}
                  value={formData.newPhone || ""}
                  onChangeText={(v) => handleInputChange("newPhone", v)}
                />
              </>
            )}

            {selectedType === "dob" && (
              <>
                <InputField
                  label="New Date of Birth"
                  placeholder="DD/MM/YYYY"
                  value={formData.newDob || ""}
                  onChangeText={(v) => handleInputChange("newDob", v)}
                />
                <InputField
                  label="L.G.A of Origin"
                  placeholder="Your LGA"
                  value={formData.lgaOrigin || ""}
                  onChangeText={(v) => handleInputChange("lgaOrigin", v)}
                />
                <InputField
                  label="Place of Birth"
                  placeholder="Hospital or Town"
                  value={formData.placeBirth || ""}
                  onChangeText={(v) => handleInputChange("placeBirth", v)}
                />
              </>
            )}

            {selectedType === "address" && (
              <>
                <InputField
                  label="Address Line 1"
                  placeholder="House number/Street"
                  value={formData.addressLine1 || ""}
                  onChangeText={(v) => handleInputChange("addressLine1", v)}
                />
                <InputField
                  label="Town/City"
                  placeholder="City name"
                  value={formData.townCity || ""}
                  onChangeText={(v) => handleInputChange("townCity", v)}
                />
                <InputField
                  label="State"
                  placeholder="Current state"
                  value={formData.state || ""}
                  onChangeText={(v) => handleInputChange("state", v)}
                />
              </>
            )}

            {(selectedType === "name_dob" || selectedType === "name_phone") && (
              <>
                <InputField
                  label="New First Name"
                  placeholder="Enter first name"
                  value={formData.newFirstName || ""}
                  onChangeText={(v) => handleInputChange("newFirstName", v)}
                />
                <InputField
                  label="New Last Name"
                  placeholder="Enter last name"
                  value={formData.newLastName || ""}
                  onChangeText={(v) => handleInputChange("newLastName", v)}
                />
                {selectedType === "name_dob" ? (
                  <InputField
                    label="New Date of Birth"
                    placeholder="DD/MM/YYYY"
                    value={formData.newDob || ""}
                    onChangeText={(v) => handleInputChange("newDob", v)}
                  />
                ) : (
                  <InputField
                    label="New Phone Number"
                    placeholder="080..."
                    keyboardType="phone-pad"
                    maxLength={11}
                    value={formData.newPhoneNumber || ""}
                    onChangeText={(v) => handleInputChange("newPhoneNumber", v)}
                  />
                )}
              </>
            )}
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleInitiateSubmit}
            activeOpacity={0.9}
          >
            <Text style={styles.btnText}>SUBMIT MODIFICATION REQUEST</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="shield-checkmark" size={32} color="#1e3a8a" />
            </View>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>Please input your 4-digit PIN to authorize this modification request</Text>

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
                <Text style={styles.verifyModalBtnText}>Confirm & Submit</Text>
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
    </SafeAreaView>
  );
};

const InputField = ({ label, ...props }) => (
  <View style={styles.inputGroup}>
    <Text style={styles.label}>{label}</Text>
    <TextInput style={styles.input} placeholderTextColor="#94a3b8" {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    marginBottom: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1e3a8a" },
  tabContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tabScroll: { paddingHorizontal: 15, paddingVertical: 10 },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeTabItem: { backgroundColor: "#1e3a8a", borderColor: "#1e3a8a" },
  tabText: { fontSize: 13, fontWeight: "bold", color: "#64748b", marginLeft: 6 },
  activeTabText: { color: "#fff" },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  priceBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  priceText: { color: "#0369a1", fontSize: 12, fontWeight: "bold" },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: "bold", color: "#475569", marginBottom: 8 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 15,
    borderRadius: 12,
    fontSize: 16,
    color: "#0f172a",
  },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 40,
    elevation: 3,
  },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "bold" },

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
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 10,
  },
  modalHeaderIcon: {
    marginBottom: 10,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 6,
    textAlign: "center",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 20,
  },
  modalPinInput: {
    width: "100%",
    height: 55,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
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
    backgroundColor: "#1e3a8a",
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
    color: "#dc2626",
    fontWeight: "600",
    fontSize: 13,
  },
});

export default NIMCModification;