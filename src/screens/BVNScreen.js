import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const VerificationScreen = ({ navigation }) => {
  const [view, setView] = useState("list");
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin Prices
  const [prices, setPrices] = useState({
    bvn_full: 500,
    bvn_basic: 200,
    face_id: 800,
    phone_verify: 300,
  });

  const [formData, setFormData] = useState({ searchValue: "", pin: "" });
  const [verificationResult, setVerificationResult] = useState(null);
  const [newPrice, setNewPrice] = useState("");

  const services = [
    {
      id: "phone_verify",
      title: "Phone Number Verification",
      subtitle: "Instant NIN/Phone database lookup",
      icon: "phone-check",
      inputLabel: "Phone Number",
      maxLength: 11,
    },
    {
      id: "bvn_basic",
      title: "BVN Basic Search",
      subtitle: "Verify BVN name and basic profile",
      icon: "bank-outline",
      inputLabel: "11-Digit BVN",
      maxLength: 11,
    },
    {
      id: "bvn_full",
      title: "Full BVN Comprehensive",
      subtitle: "Complete demographic details & image",
      icon: "bank-check",
      inputLabel: "11-Digit BVN",
      maxLength: 11,
    },
    {
      id: "face_id",
      title: "Face ID Biometric Match",
      subtitle: "Advanced facial recognition check",
      icon: "face-recognition",
      inputLabel: "Enrollment ID / NIN",
      maxLength: 15,
    },
  ];

  useEffect(() => {
    const checkRole = async () => {
      const storedUser = await AsyncStorage.getItem("userData");
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        setIsAdmin(parsed.role === "admin");
      }
    };
    checkRole();
  }, []);

  const handleUpdatePrice = async (serviceId) => {
    if (!isAdmin) {
      return Alert.alert("Unauthorized", "Only admins can modify service fees.");
    }
    if (!newPrice) return Alert.alert("Error", "Enter a valid new price");
    
    setPrices({ ...prices, [serviceId]: parseInt(newPrice) });
    setNewPrice("");
    Alert.alert("Success", "Service fee updated successfully.");
  };

  const handleVerify = async () => {
    if (!formData.searchValue || !formData.pin) {
      return Alert.alert("Error", "Please fill in all fields including your Transaction PIN.");
    }
    if (formData.pin.length < 4) {
      return Alert.alert("Error", "Enter your valid 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/verify`,
        {
          type: selectedTask.id,
          value: formData.searchValue,
          transactionPin: formData.pin, // Dole a tura PIN don tabbatarwa a Server
          charge: prices[selectedTask.id],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setVerificationResult(result.data || result);
        setView("result");
      } else {
        throw new Error(result.message || "Verification failed");
      }
    } catch (err) {
      Alert.alert(
        "Verification Failed",
        err.response?.data?.message || err.message || "An error occurred during verification.",
      );
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (data) => {
    try {
      const html = `
        <html>
          <body style="padding: 40px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1e293b;">
            <div style="text-align: center; border-bottom: 2px solid #0a1d37; padding-bottom: 20px; margin-bottom: 30px;">
              <h1 style="color: #0a1d37; margin: 0; font-size: 26px;">AYAX SECURE IDENTITY PORTAL</h1>
              <p style="color: #64748b; font-size: 14px; margin-top: 5px;">Official Verification Report & Certificate Slip</p>
            </div>
            
            <table style="width: 100%; margin-bottom: 30px; font-size: 15px;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Service Type:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${selectedTask.title}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Target Search ID:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${formData.searchValue}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Timestamp:</td>
                <td style="padding: 8px 0; font-weight: bold; text-align: right;">${new Date().toUTCString()}</td>
              </tr>
            </table>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 30px;">
              <h3 style="margin-top: 0; color: #0a1d37; border-bottom: 1px solid #cbd5e1; padding-bottom: 10px;">Subject Profile Information</h3>
              <p style="margin: 10px 0;"><b>First Name:</b> ${data?.firstName || data?.firstname || "N/A"}</p>
              <p style="margin: 10px 0;"><b>Last Name:</b> ${data?.lastName || data?.surname || "N/A"}</p>
              <p style="margin: 10px 0;"><b>Phone Number:</b> ${data?.phone || data?.phoneNumber || "N/A"}</p>
              <p style="margin: 10px 0;"><b>Date of Birth:</b> ${data?.dob || "N/A"}</p>
            </div>

            <div style="text-align: center; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 10px; padding: 15px;">
              <p style="color: #065f46; margin: 0; font-weight: bold; font-size: 16px;">Status: VERIFIED & AUTHENTICATED</p>
            </div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert("Error", "Unable to generate or share verification PDF slip.");
    }
  };

  if (view === "list") {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        <View style={styles.topHeaderBox}>
          <Text style={styles.header}>Identity Verification</Text>
          <Text style={styles.subHeader}>Select a secure gateway service below</Text>
        </View>

        {services.map((s) => (
          <View key={s.id} style={styles.serviceWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedTask(s);
                setView("form");
                setFormData({ searchValue: "", pin: "" });
              }}
              activeOpacity={0.8}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={s.icon}
                  size={26}
                  color="#0a1d37"
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardSubTitle}>{s.subtitle}</Text>
                <Text style={styles.cardPrice}>Fee: ₦{prices[s.id]}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Admin Controls (Admin Kaɗai) */}
            {isAdmin && (
              <View style={styles.adminRow}>
                <TextInput
                  style={styles.adminInput}
                  placeholder="New Fee (₦)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={newPrice}
                  onChangeText={setNewPrice}
                />
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => handleUpdatePrice(s.id)}
                >
                  <Text style={styles.updateBtnText}>SET FEE</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  if (view === "form") {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={() => setView("list")}
          style={styles.backLink}
        >
          <Ionicons name="arrow-back" size={24} color="#0a1d37" />
          <Text style={styles.backLinkText}>Back to Services</Text>
        </TouchableOpacity>

        <View style={styles.formHeaderContainer}>
          <Text style={styles.formTitle}>{selectedTask?.title}</Text>
          <Text style={styles.formPrice}>
            Required Gateway Fee: ₦{prices[selectedTask?.id]}
          </Text>
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>{selectedTask?.inputLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${selectedTask?.inputLabel}`}
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            maxLength={selectedTask?.maxLength}
            value={formData.searchValue}
            onChangeText={(v) => setFormData({ ...formData, searchValue: v })}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Transaction PIN (Required)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your 4-digit PIN"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            value={formData.pin}
            onChangeText={(v) => setFormData({ ...formData, pin: v })}
          />
        </View>

        <TouchableOpacity
          style={[styles.mainBtn, loading && { opacity: 0.7 }]}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainBtnText}>VERIFY IDENTITY NOW</Text>
          )}
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  if (view === "result") {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.successCard}>
          <View style={styles.successIconBadge}>
            <Ionicons name="checkmark" size={45} color="#fff" />
          </View>
          <Text style={styles.successTitle}>Identity Verified Successfully</Text>
          <Text style={styles.successSub}>Gateway response verified via live network server.</Text>

          <View style={styles.resData}>
            <View style={styles.resRow}>
              <Text style={styles.resLabel}>Full Name</Text>
              <Text style={styles.resValue}>
                {verificationResult?.firstName || verificationResult?.firstname || "N/A"} {verificationResult?.lastName || verificationResult?.surname || ""}
              </Text>
            </View>

            <View style={styles.resRow}>
              <Text style={styles.resLabel}>Search Parameter</Text>
              <Text style={styles.resValue}>{formData.searchValue}</Text>
            </View>

            <View style={styles.resRow}>
              <Text style={styles.resLabel}>Reference Number</Text>
              <Text style={styles.resValue}>
                AYX-{Math.random().toString(36).substring(2, 10).toUpperCase()}
              </Text>
            </View>

            <View style={[styles.resRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.resLabel}>Verification Status</Text>
              <Text style={[styles.resValue, { color: "#10b981" }]}>AUTHENTICATED</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pdfBtn}
            onPress={() => generatePDF(verificationResult)}
          >
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={24}
              color="#fff"
            />
            <Text style={styles.pdfBtnText}>DOWNLOAD OFFICIAL SLIP (PDF)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setView("list")}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>Perform Another Verification</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", paddingHorizontal: 20 },
  topHeaderBox: { marginTop: 40, marginBottom: 20 },
  header: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0a1d37",
  },
  subHeader: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
  },
  serviceWrapper: { marginBottom: 16 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardContent: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#0a1d37" },
  cardSubTitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  cardPrice: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "800",
    marginTop: 6,
  },
  adminRow: { flexDirection: "row", marginTop: 8, paddingHorizontal: 4 },
  adminInput: {
    flex: 1,
    height: 40,
    backgroundColor: "#fef3c7",
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#92400e",
    borderWidth: 1,
    borderColor: "#f59e0b",
  },
  updateBtn: {
    backgroundColor: "#b45309",
    paddingHorizontal: 16,
    marginLeft: 10,
    borderRadius: 8,
    justifyContent: "center",
  },
  updateBtnText: { color: "#fff", fontSize: 11, fontWeight: "bold" },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 20,
  },
  backLinkText: {
    marginLeft: 8,
    fontSize: 15,
    color: "#0a1d37",
    fontWeight: "700",
  },
  formHeaderContainer: { marginBottom: 25 },
  formTitle: { fontSize: 22, fontWeight: "800", color: "#0a1d37" },
  formPrice: {
    fontSize: 14,
    color: "#ef4444",
    marginTop: 6,
    fontWeight: "700",
  },
  inputBox: { marginBottom: 20 },
  inputLabel: {
    fontSize: 13,
    color: "#475569",
    marginBottom: 8,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
    color: "#0f172a",
  },
  mainBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 15,
    elevation: 3,
  },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold", letterSpacing: 0.5 },
  successCard: { flex: 1, alignItems: "center", justifyContent: "center", marginTop: 30 },
  successIconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0a1d37",
    textAlign: "center",
  },
  successSub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 4,
  },
  resData: {
    width: "100%",
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 16,
    marginTop: 25,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  resRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  resLabel: { fontSize: 11, color: "#64748b", textTransform: "uppercase", fontWeight: "700" },
  resValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginTop: 3,
  },
  pdfBtn: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    padding: 18,
    borderRadius: 14,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    elevation: 2,
  },
  pdfBtnText: { color: "#fff", fontWeight: "bold", fontSize: 14, marginLeft: 10 },
  closeBtn: { marginTop: 20, padding: 10, alignItems: "center" },
  closeBtnText: { fontSize: 15, fontWeight: "bold", color: "#0a1d37" },
});

export default VerificationScreen;