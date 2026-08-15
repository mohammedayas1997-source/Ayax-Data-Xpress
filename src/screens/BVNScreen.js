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

const VerificationScreen = ({ navigation }) => {
  const [view, setView] = useState("list");
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Admin Prices - Can be fetched from DB
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
      icon: "phone-check",
      inputLabel: "Phone Number",
      maxLength: 11,
    },
    {
      id: "bvn_basic",
      title: "BVN Basic Search",
      icon: "bank-outline",
      inputLabel: "BVN Number",
      maxLength: 11,
    },
    {
      id: "bvn_full",
      title: "Full BVN Details",
      icon: "bank-check",
      inputLabel: "BVN Number",
      maxLength: 11,
    },
    {
      id: "face_id",
      title: "Face ID Recognition",
      icon: "face-recognition",
      inputLabel: "Enrollment ID",
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
    if (!newPrice) return Alert.alert("Error", "Enter price");
    setPrices({ ...prices, [serviceId]: parseInt(newPrice) });
    setNewPrice("");
    Alert.alert("Success", "Price updated locally for this session.");
  };

  const handleVerify = async () => {
    if (!formData.searchValue || !formData.pin) {
      return Alert.alert("Error", "Fill all fields");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/verify",
        {
          type: selectedTask.id,
          value: formData.searchValue,
          pin: formData.pin,
          charge: prices[selectedTask.id],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setVerificationResult(res.data.data);
        setView("result");
      }
    } catch (err) {
      Alert.alert(
        "Failed",
        err.response?.data?.message || "Verification Error",
      );
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async (data) => {
    const html = `
      <html>
        <body style="padding: 50px; font-family: sans-serif;">
          <h1 style="text-align: center; color: #0a1d37;">AYAX VERIFICATION SLIP</h1>
          <hr/>
          <p><b>Service:</b> ${selectedTask.title}</p>
          <p><b>Name:</b> ${data.firstName} ${data.lastName}</p>
          <p><b>ID Used:</b> ${formData.searchValue}</p>
          <p><b>Date:</b> ${new Date().toDateString()}</p>
          <div style="margin-top: 50px; border: 1px solid #ccc; padding: 20px;">
            <p>Verification Status: <b>VERIFIED</b></p>
          </div>
        </body>
      </html>
    `;
    const { uri } = await Print.printToFileAsync({ html });
    await Sharing.shareAsync(uri);
  };

  if (view === "list") {
    return (
      <ScrollView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.header}>Identity Verification</Text>

        {services.map((s) => (
          <View key={s.id} style={styles.serviceWrapper}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setSelectedTask(s);
                setView("form");
              }}
            >
              <View style={styles.iconCircle}>
                <MaterialCommunityIcons
                  name={s.icon}
                  size={28}
                  color="#0a1d37"
                />
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{s.title}</Text>
                <Text style={styles.cardPrice}>Fee: ₦{prices[s.id]}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>

            {isAdmin && (
              <View style={styles.adminRow}>
                <TextInput
                  style={styles.adminInput}
                  placeholder="New Price"
                  keyboardType="numeric"
                  onChangeText={setNewPrice}
                />
                <TouchableOpacity
                  style={styles.updateBtn}
                  onPress={() => handleUpdatePrice(s.id)}
                >
                  <Text style={styles.updateBtnText}>SET</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    );
  }

  if (view === "form") {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => setView("list")}
          style={styles.backLink}
        >
          <Ionicons name="arrow-back" size={24} color="#0a1d37" />
          <Text style={styles.backLinkText}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.formTitle}>{selectedTask.title}</Text>
        <Text style={styles.formPrice}>
          Service Charge: ₦{prices[selectedTask.id]}
        </Text>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>{selectedTask.inputLabel}</Text>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${selectedTask.inputLabel}`}
            keyboardType="numeric"
            maxLength={selectedTask.maxLength}
            onChangeText={(v) => setFormData({ ...formData, searchValue: v })}
          />
        </View>

        <View style={styles.inputBox}>
          <Text style={styles.inputLabel}>Transaction PIN</Text>
          <TextInput
            style={styles.input}
            placeholder="****"
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            onChangeText={(v) => setFormData({ ...formData, pin: v })}
          />
        </View>

        <TouchableOpacity
          style={styles.mainBtn}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.mainBtnText}>VERIFY IDENTITY</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (view === "result") {
    return (
      <View style={styles.container}>
        <View style={styles.successCard}>
          <Ionicons name="checkmark-circle" size={80} color="#10b981" />
          <Text style={styles.successTitle}>Verification Successful</Text>

          <View style={styles.resData}>
            <Text style={styles.resLabel}>Name</Text>
            <Text style={styles.resValue}>
              {verificationResult?.firstName} {verificationResult?.lastName}
            </Text>

            <Text style={styles.resLabel}>Reference</Text>
            <Text style={styles.resValue}>
              {Math.random().toString(36).substring(7).toUpperCase()}
            </Text>
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
            <Text style={styles.pdfBtnText}>DOWNLOAD SLIP</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setView("list")}
            style={styles.closeBtn}
          >
            <Text style={styles.closeBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0a1d37",
    marginBottom: 30,
    marginTop: 40,
  },
  serviceWrapper: { marginBottom: 15 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  cardContent: { flex: 1, marginLeft: 15 },
  cardTitle: { fontSize: 16, fontWeight: "bold", color: "#0a1d37" },
  cardPrice: {
    fontSize: 13,
    color: "#10b981",
    fontWeight: "700",
    marginTop: 2,
  },
  adminRow: { flexDirection: "row", marginTop: 8, paddingHorizontal: 10 },
  adminInput: {
    flex: 1,
    height: 35,
    backgroundColor: "#f1f5f9",
    borderRadius: 5,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  updateBtn: {
    backgroundColor: "#0a1d37",
    paddingHorizontal: 15,
    marginLeft: 10,
    borderRadius: 5,
    justifyContent: "center",
  },
  updateBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  backLinkText: {
    marginLeft: 8,
    fontSize: 16,
    color: "#0a1d37",
    fontWeight: "600",
  },
  formTitle: { fontSize: 22, fontWeight: "bold", color: "#0a1d37" },
  formPrice: {
    fontSize: 16,
    color: "#ef4444",
    marginTop: 5,
    marginBottom: 30,
    fontWeight: "600",
  },
  inputBox: { marginBottom: 20 },
  inputLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    fontSize: 16,
  },
  mainBtn: {
    backgroundColor: "#0a1d37",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  mainBtnText: { color: "#fff", fontSize: 16, fontWeight: "bold" },
  successCard: { flex: 1, alignItems: "center", justifyContent: "center" },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0a1d37",
    marginTop: 20,
  },
  resData: {
    width: "100%",
    backgroundColor: "#f8fafc",
    padding: 20,
    borderRadius: 15,
    marginTop: 30,
  },
  resLabel: { fontSize: 12, color: "#64748b" },
  resValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0a1d37",
    marginBottom: 15,
  },
  pdfBtn: {
    backgroundColor: "#ef4444",
    flexDirection: "row",
    padding: 18,
    borderRadius: 12,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 30,
  },
  pdfBtnText: { color: "#fff", fontWeight: "bold", marginLeft: 10 },
  closeBtn: { marginTop: 25 },
  closeBtnText: { fontSize: 16, fontWeight: "bold", color: "#0a1d37" },
});

export default VerificationScreen;
