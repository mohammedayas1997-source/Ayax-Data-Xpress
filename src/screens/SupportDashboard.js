import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
  StatusBar,
} from "react-native";
import { Ionicons, Feather, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupportDashboard = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState("bvn");
  const [userData, setUserData] = useState(null);
  const [traceData, setTraceData] = useState([]);
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const getConfig = async () => {
    const token = await AsyncStorage.getItem("userToken");
    return {
      headers: { Authorization: `Bearer ${token}` },
    };
  };

  const handleUserSearch = async () => {
    if (!identifier.trim()) {
      showAlert("Notice", "Please enter a valid search identifier");
      return;
    }
    setLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.get(
        `${BASE_URL}/support/search-user/${identifier.trim()}`,
        config
      );
      setUserData(res.data.data || res.data);
      setTraceData([]);
    } catch (err) {
      showAlert("Not Found", err.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleTrace = async () => {
    if (!identifier.trim()) {
      showAlert("Notice", "Please enter an identifier or ID to trace");
      return;
    }
    setLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.get(
        `${BASE_URL}/support/trace/${type}/${identifier.trim()}`,
        config
      );
      setTraceData(res.data.data || res.data);
      setUserData(null);
    } catch (err) {
      showAlert("Notice", err.response?.data?.message || "No records found for this ID");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Customer Support Desk</Text>
          <Text style={styles.headerSub}>Ayax Operations & Tracing Hub</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Feather name="log-out" size={16} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollArea}>
        {/* SEARCH BOX */}
        <View style={styles.card}>
          <Text style={styles.label}>Identifier (Phone / Email / NIN / BVN / Ref)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter search term..."
            placeholderTextColor="#94a3b8"
            value={identifier}
            onChangeText={setIdentifier}
          />

          {/* SERVICE SELECTION ROW */}
          <Text style={[styles.label, { marginTop: 10 }]}>Select Service Type</Text>
          <View style={styles.typeRow}>
            {["bvn", "nimc", "data", "vtu", "cable", "utility"].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, type === t && styles.typePillActive]}
                onPress={() => setType(t)}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnPrimary} onPress={handleUserSearch} disabled={loading}>
              <Text style={styles.btnText}>Search User</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnSecondary} onPress={handleTrace} disabled={loading}>
              <Text style={styles.btnText}>Trace ID</Text>
            </TouchableOpacity>
          </View>
        </View>

        {loading && (
          <ActivityIndicator size="large" color="#0284c7" style={{ marginVertical: 20 }} />
        )}

        {/* USER PROFILE & TRANSACTIONS RESULT */}
        {userData && userData.profile && (
          <View style={styles.resultContainer}>
            <View style={styles.card}>
              <Text style={styles.resultTitle}>User Profile</Text>
              <Text style={styles.profileText}>👤 Name: {userData.profile.firstName} {userData.profile.surname}</Text>
              <Text style={styles.profileText}>✉️ Email: {userData.profile.email}</Text>
              <Text style={styles.profileText}>📞 Phone: {userData.profile.phone}</Text>
              <Text style={styles.profileText}>💼 Role: {userData.profile.role?.toUpperCase()}</Text>
              <Text style={[styles.profileText, { color: "#059669", fontWeight: "bold" }]}>
                💳 Wallet Balance: ₦{Number(userData.profile.walletBalance || userData.profile.balance || 0).toLocaleString()}
              </Text>
            </View>
          </View>
        )}

        {/* TRACE RECORDS RESULT */}
        {Array.isArray(traceData) && traceData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.resultTitle}>{type.toUpperCase()} Verification Records</Text>
            {traceData.map((item, idx) => (
              <View key={item._id || idx.toString()} style={styles.recordItem}>
                <Text style={styles.recordText}>Ref/ID: <Text style={{ fontWeight: "bold" }}>{item.bvnNumber || item.ninNumber || item.reference || "N/A"}</Text></Text>
                <Text style={styles.recordText}>Status: <Text style={{ color: item.status === "success" ? "#059669" : "#dc2626", fontWeight: "bold" }}>{item.status?.toUpperCase() || "PENDING"}</Text></Text>
                <Text style={styles.recordDate}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Recent"}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  headerSub: { color: "#38bdf8", fontSize: 11, marginTop: 2 },
  logoutBtn: { backgroundColor: "rgba(239, 68, 68, 0.15)", padding: 8, borderRadius: 8 },
  scrollArea: { padding: 16 },
  card: { backgroundColor: "#ffffff", borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e2e8f0" },
  label: { fontSize: 12, fontWeight: "700", color: "#475569", marginBottom: 6 },
  input: { backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 8, paddingHorizontal: 12, height: 44, color: "#0f172a" },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  typePill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: "#f1f5f9", borderWidth: 1, borderColor: "#e2e8f0" },
  typePillActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  typeText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  typeTextActive: { color: "#ffffff" },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  btnPrimary: { flex: 1, backgroundColor: "#1e40af", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  btnSecondary: { flex: 1, backgroundColor: "#059669", paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  btnText: { color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  resultContainer: { marginBottom: 12 },
  resultTitle: { fontSize: 14, fontWeight: "bold", color: "#0f172a", marginBottom: 8, borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 6 },
  profileText: { fontSize: 12.5, color: "#334155", marginVertical: 2 },
  recordItem: { backgroundColor: "#f8fafc", padding: 10, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: "#e2e8f0" },
  recordText: { fontSize: 12, color: "#334155" },
  recordDate: { fontSize: 10, color: "#94a3b8", marginTop: 4 },
});

export default SupportDashboard;