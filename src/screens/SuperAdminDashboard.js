import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
  Modal,
  TextInput,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Modals
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dispatch Form State
  const [dispatchNetwork, setDispatchNetwork] = useState("MTN");
  const [dispatchPlanCode, setDispatchPlanCode] = useState("1GB");
  const [dispatchRecipients, setDispatchRecipients] = useState("");
  const [sendToAll, setSendToAll] = useState(false);

  // Wallet Funding State
  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletActionType, setWalletActionType] = useState("credit"); // 'credit' ko 'debit'

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const { data } = await axios.get(`${BASE_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(data.data || data.stats || {});
      setError(null);
    } catch (err) {
      console.error("Super Admin Stats Error:", err);
      // Fallback zuwa regular admin stats idan endpoint bai shirya ba
      try {
        const token = await AsyncStorage.getItem("userToken");
        const fallbackRes = await axios.get(`${BASE_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(fallbackRes.data.data || fallbackRes.data.stats || {});
        setError(null);
      } catch (e) {
        setError("Failed to load global statistics.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  // 1. Tura Data ta Atomatik (Single / Bulk / All)
  const handleExecuteDispatch = async () => {
    if (!dispatchPlanCode) {
      return showAlert("Plan Required", "Enter a plan code (e.g. 500MB, 1GB, 2GB).");
    }
    if (!sendToAll && !dispatchRecipients.trim()) {
      return showAlert("Recipients Required", "Enter phone number(s) or check 'Send to All Users'.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        network: dispatchNetwork,
        planCode: dispatchPlanCode.trim(),
        planId: dispatchPlanCode.trim(),
        recipients: dispatchRecipients.trim(),
        sendToAllUsers: sendToAll,
      };

      const response = await axios.post(`${BASE_URL}/superadmin/dispatch-data`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        showAlert("Success 🎉", response.data.message || "Data dispatched successfully!");
        setDispatchModalVisible(false);
        setDispatchRecipients("");
        setSendToAll(false);
        fetchStats();
      } else {
        throw new Error(response.data?.message || "Dispatch failed");
      }
    } catch (err) {
      showAlert("Dispatch Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Canza Kudi a Wallet (Credit / Debit)
  const handleExecuteWalletAction = async () => {
    if (!walletUserId.trim() || !walletAmount) {
      return showAlert("Missing Details", "Provide User ID and Amount.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const endpoint =
        walletActionType === "credit"
          ? `${BASE_URL}/superadmin/credit-user`
          : `${BASE_URL}/superadmin/debit-user`;

      const response = await axios.post(
        endpoint,
        {
          userId: walletUserId.trim(),
          amount: Number(walletAmount),
          reason: walletReason.trim() || "SuperAdmin Manual Adjustment",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        showAlert(
          "Success",
          `User wallet ${walletActionType === "credit" ? "credited" : "debited"} with ₦${walletAmount}`
        );
        setWalletModalVisible(false);
        setWalletUserId("");
        setWalletAmount("");
        setWalletReason("");
        fetchStats();
      } else {
        throw new Error(response.data?.message || "Wallet action failed");
      }
    } catch (err) {
      showAlert("Wallet Action Failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a1d37" />
        <Text style={styles.loaderText}>Loading SuperAdmin Overview...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a1d37" />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SuperAdmin Console</Text>
          <Text style={styles.headerSub}>Full System Override & Global Authority</Text>
        </View>
        <MaterialCommunityIcons name="shield-crown" size={32} color="#fbbf24" />
      </View>

      {/* Stats Cards Grid */}
      <View style={styles.gridContainer}>
        <View style={[styles.statCard, { backgroundColor: "#1e3a8a" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Ionicons name="wallet-outline" size={22} color="#93c5fd" />
          </View>
          <Text style={styles.cardValue}>
            ₦{stats?.finance?.totalRevenue?.toLocaleString() || stats?.totalRevenue?.toLocaleString() || "0"}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#047857" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Successful Sales</Text>
            <Ionicons name="checkmark-done-circle-outline" size={22} color="#6ee7b7" />
          </View>
          <Text style={styles.cardValue}>
            {stats?.finance?.successfulTransactions?.toLocaleString() || "0"}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#7c3aed" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total Users</Text>
            <Ionicons name="people-outline" size={22} color="#c4b5fd" />
          </View>
          <Text style={styles.cardValue}>
            {stats?.users?.totalUsers?.toLocaleString() || stats?.totalUsers?.toLocaleString() || "0"}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: "#b91c1c" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Admins & Staff</Text>
            <Ionicons name="shield-checkmark-outline" size={22} color="#fca5a5" />
          </View>
          <Text style={styles.cardValue}>
            {(stats?.users?.totalAdmins || 0) + (stats?.users?.totalSupervisors || 0)}
          </Text>
        </View>
      </View>

      {/* SuperAdmin Override Powers */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>⚡ SuperAdmin Actions & Overrides</Text>
      </View>

      <View style={styles.actionGrid}>
        {/* Bulk Data Dispatch Button */}
        <TouchableOpacity
          style={[styles.actionCard, { borderLeftColor: "#2563eb", borderLeftWidth: 4 }]}
          onPress={() => setDispatchModalVisible(true)}
        >
          <Ionicons name="paper-plane" size={24} color="#2563eb" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.actionText}>Automatic Data Dispatch</Text>
            <Text style={styles.actionSub}>Send data to single, bulk numbers or all users</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Manual Wallet Credit/Debit */}
        <TouchableOpacity
          style={[styles.actionCard, { borderLeftColor: "#059669", borderLeftWidth: 4 }]}
          onPress={() => setWalletModalVisible(true)}
        >
          <Ionicons name="cash" size={24} color="#059669" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.actionText}>Wallet Adjustment (Credit/Debit)</Text>
            <Text style={styles.actionSub}>Direct funding or balance deductions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* Audit Logs */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation?.navigate("SupportActivities")}
        >
          <MaterialCommunityIcons name="history" size={24} color="#0a1d37" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.actionText}>Global System Audit Logs</Text>
            <Text style={styles.actionSub}>Monitor all staff actions & transactions</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        {/* NIMC Management */}
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation?.navigate("NimcRequests")}
        >
          <Ionicons name="id-card-outline" size={24} color="#0a1d37" />
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.actionText}>Manage NIMC Requests</Text>
            <Text style={styles.actionSub}>Approve or reject verification tracks</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      {/* ==========================================
          MODAL: BULK DATA DISPATCH
      ========================================== */}
      <Modal visible={dispatchModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>⚡ Automatic Data Dispatch</Text>
              <TouchableOpacity onPress={() => setDispatchModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Network</Text>
            <View style={styles.netTabs}>
              {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
                <TouchableOpacity
                  key={net}
                  style={[styles.netTabBtn, dispatchNetwork === net && styles.activeNetTab]}
                  onPress={() => setDispatchNetwork(net)}
                >
                  <Text
                    style={[styles.netTabText, dispatchNetwork === net && styles.activeNetTabText]}
                  >
                    {net}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Plan Code / Size (e.g. 500MB, 1GB, 2GB, 5GB)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 1GB"
              placeholderTextColor="#94a3b8"
              value={dispatchPlanCode}
              onChangeText={setDispatchPlanCode}
            />

            <View style={styles.allUsersRow}>
              <TouchableOpacity
                style={[styles.checkbox, sendToAll && styles.checkboxActive]}
                onPress={() => setSendToAll(!sendToAll)}
              >
                {sendToAll && <Ionicons name="checkmark" size={16} color="#fff" />}
              </TouchableOpacity>
              <Text style={styles.allUsersText}>Send to ALL Registered App Users</Text>
            </View>

            {!sendToAll && (
              <>
                <Text style={styles.inputLabel}>Recipient Phone Number(s)</Text>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: "top" }]}
                  placeholder="09033738409, 08012345678 (Separated by commas)"
                  placeholderTextColor="#94a3b8"
                  multiline
                  value={dispatchRecipients}
                  onChangeText={setDispatchRecipients}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleExecuteDispatch}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>DISPATCH DATA NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL: DIRECT WALLET CREDIT / DEBIT
      ========================================== */}
      <Modal visible={walletModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>💰 Wallet Adjustment</Text>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <Ionicons name="close-circle" size={26} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.typeSwitcher}>
              <TouchableOpacity
                style={[styles.switchBtn, walletActionType === "credit" && styles.creditActive]}
                onPress={() => setWalletActionType("credit")}
              >
                <Text
                  style={[
                    styles.switchText,
                    walletActionType === "credit" && styles.activeSwitchText,
                  ]}
                >
                  + Credit Wallet
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.switchBtn, walletActionType === "debit" && styles.debitActive]}
                onPress={() => setWalletActionType("debit")}
              >
                <Text
                  style={[
                    styles.switchText,
                    walletActionType === "debit" && styles.activeSwitchText,
                  ]}
                >
                  - Debit Wallet
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Target User ID (MongoDB Object ID)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 64b8a2c1f9..."
              placeholderTextColor="#94a3b8"
              value={walletUserId}
              onChangeText={setWalletUserId}
            />

            <Text style={styles.inputLabel}>Amount (₦)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. 5000"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              value={walletAmount}
              onChangeText={setWalletAmount}
            />

            <Text style={styles.inputLabel}>Reason / Remarks</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. System compensation / Correction"
              placeholderTextColor="#94a3b8"
              value={walletReason}
              onChangeText={setWalletReason}
            />

            <TouchableOpacity
              style={[
                styles.submitBtn,
                {
                  backgroundColor: walletActionType === "credit" ? "#059669" : "#dc2626",
                  opacity: actionLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleExecuteWalletAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>
                  CONFIRM {walletActionType.toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", padding: 20 },
  loaderText: { marginTop: 10, color: "#64748b", fontWeight: "600", fontSize: 14 },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSub: { fontSize: 12, color: "#94a3b8", marginTop: 3, fontWeight: "600" },
  gridContainer: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 16,
    borderRadius: 16,
    marginBottom: 14,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  cardLabel: { color: "#fff", fontSize: 12, fontWeight: "700" },
  cardValue: { color: "#fff", fontSize: 20, fontWeight: "900" },
  sectionHeader: {
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  actionGrid: {
    paddingHorizontal: 16,
  },
  actionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionText: { fontSize: 14, fontWeight: "800", color: "#1e293b" },
  actionSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 360,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  inputLabel: { fontSize: 12, fontWeight: "700", color: "#475569", marginTop: 10, marginBottom: 4 },
  netTabs: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  netTabBtn: { flex: 1, paddingVertical: 6, alignItems: "center", backgroundColor: "#f1f5f9", marginHorizontal: 2, borderRadius: 6 },
  activeNetTab: { backgroundColor: "#0f172a" },
  netTabText: { fontSize: 11, fontWeight: "700", color: "#64748b" },
  activeNetTabText: { color: "#fff" },
  formInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    color: "#0f172a",
  },
  allUsersRow: { flexDirection: "row", alignItems: "center", marginTop: 12, marginBottom: 6 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxActive: { backgroundColor: "#0f172a" },
  allUsersText: { fontSize: 12, fontWeight: "700", color: "#0f172a" },
  typeSwitcher: { flexDirection: "row", backgroundColor: "#f1f5f9", padding: 3, borderRadius: 10, marginBottom: 10 },
  switchBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  creditActive: { backgroundColor: "#059669" },
  debitActive: { backgroundColor: "#dc2626" },
  switchText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  activeSwitchText: { color: "#fff" },
  submitBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  submitBtnText: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
});

export default SuperAdminDashboard;