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
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-api-v2.vercel.app/api/v1";

const NIMCModification = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState({});
  const [selectedType, setSelectedType] = useState("name");
  const [formData, setFormData] = useState({});
  const [pin, setPin] = useState("");

  useEffect(() => {
    fetchPrices();
  }, []);

  const fetchPrices = async () => {
    try {
      const { data } = await axios.get(`${BASE_URL}/nimc/prices`);
      if (data.success) setPrices(data.prices);
    } catch (err) {
      console.log("Error fetching prices:", err);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async () => {
    if (!pin || !formData.ninNumber) {
      return Alert.alert(
        "Error",
        "Please fill in your NIN and Transaction PIN",
      );
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
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

      if (response.data.success) {
        Alert.alert("Success", "Modification request submitted successfully");
        navigation.goBack();
      }
    } catch (err) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Something went wrong",
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Modification</Text>
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
                onPress={() => {
                  setSelectedType(item.id);
                  setFormData({ ...formData, ninNumber: formData.ninNumber }); // Preserve NIN
                }}
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
                  Cost: ₦{prices[selectedType] || "0.00"}
                </Text>
              </View>
            </View>

            <InputField
              label="NIN Number"
              placeholder="11-digit NIN"
              keyboardType="numeric"
              maxLength={11}
              onChangeText={(v) => handleInputChange("ninNumber", v)}
            />

            {/* Dynamic Fields based on Selection */}
            {selectedType === "name" && (
              <>
                <InputField
                  label="First Name"
                  placeholder="New first name"
                  onChangeText={(v) => handleInputChange("firstName", v)}
                />
                <InputField
                  label="Last Name"
                  placeholder="New last name"
                  onChangeText={(v) => handleInputChange("lastName", v)}
                />
                <InputField
                  label="Middle Name"
                  placeholder="New middle name"
                  onChangeText={(v) => handleInputChange("middleName", v)}
                />
              </>
            )}

            {selectedType === "phone" && (
              <>
                <InputField
                  label="Full Name"
                  placeholder="As seen on NIN"
                  onChangeText={(v) => handleInputChange("fullName", v)}
                />
                <InputField
                  label="New Phone Number"
                  placeholder="080..."
                  keyboardType="phone-pad"
                  onChangeText={(v) => handleInputChange("newPhone", v)}
                />
              </>
            )}

            {selectedType === "dob" && (
              <>
                <InputField
                  label="New Date of Birth"
                  placeholder="DD/MM/YYYY"
                  onChangeText={(v) => handleInputChange("newDob", v)}
                />
                <InputField
                  label="L.G.A of Origin"
                  placeholder="Your LGA"
                  onChangeText={(v) => handleInputChange("lgaOrigin", v)}
                />
                <InputField
                  label="Place of Birth"
                  placeholder="Hospital or Town"
                  onChangeText={(v) => handleInputChange("placeBirth", v)}
                />
              </>
            )}

            {selectedType === "address" && (
              <>
                <InputField
                  label="Address Line 1"
                  placeholder="House number/Street"
                  onChangeText={(v) => handleInputChange("addressLine1", v)}
                />
                <InputField
                  label="Town/City"
                  placeholder="City name"
                  onChangeText={(v) => handleInputChange("townCity", v)}
                />
                <InputField
                  label="State"
                  placeholder="Current state"
                  onChangeText={(v) => handleInputChange("state", v)}
                />
              </>
            )}

            {(selectedType === "name_dob" || selectedType === "name_phone") && (
              <>
                <InputField
                  label="New First Name"
                  placeholder="Enter first name"
                  onChangeText={(v) => handleInputChange("newFirstName", v)}
                />
                <InputField
                  label="New Last Name"
                  placeholder="Enter last name"
                  onChangeText={(v) => handleInputChange("newLastName", v)}
                />
                {selectedType === "name_dob" ? (
                  <InputField
                    label="New Date of Birth"
                    placeholder="DD/MM/YYYY"
                    onChangeText={(v) => handleInputChange("newDob", v)}
                  />
                ) : (
                  <InputField
                    label="New Phone Number"
                    placeholder="080..."
                    keyboardType="phone-pad"
                    onChangeText={(v) => handleInputChange("newPhoneNumber", v)}
                  />
                )}
              </>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Authorization</Text>
            <InputField
              label="Transaction PIN"
              placeholder="4-digit security PIN"
              secureTextEntry
              keyboardType="numeric"
              maxLength={4}
              onChangeText={setPin}
            />
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Submit Modification Request</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#fff",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e3a8a",
    marginLeft: 15,
  },
  tabContainer: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tabScroll: { paddingHorizontal: 15, paddingVertical: 10 },
  tabItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: "#f1f5f9",
  },
  activeTabItem: { backgroundColor: "#1e3a8a" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#64748b", marginLeft: 6 },
  activeTabText: { color: "#fff" },
  scrollContent: { padding: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 15,
  },
  priceBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priceText: { color: "#1e3a8a", fontSize: 12, fontWeight: "800" },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, fontWeight: "700", color: "#64748b", marginBottom: 8 },
  input: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    color: "#1e293b",
  },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 30,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

export default NIMCModification;
