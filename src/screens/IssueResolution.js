import React, { useState, useEffect, useCallback } from "react";
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
  Modal,
  RefreshControl,
} from "react-native";
import {
  Ionicons,
  Feather,
  MaterialIcons,
  FontAwesome5,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const IssueResolution = ({ navigation }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedIssueType, setSelectedIssueType] = useState("all");

  // User Profile & Diagnostic Data
  const [accountData, setAccountData] = useState(null);
  const [disputedTransactions, setDisputedTransactions] = useState([]);

  // Modal Actions (Refund / Requery / Escalate)
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionType, setActionType] = useState(""); // 'requery' | 'refund' | 'escalate'
  const [selectedTx, setSelectedTx] = useState(null);
  const [resolutionNote, setResolutionNote] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

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
      timeout: 12000,
    };
  };

  // 1. Run Complete System Audit on User / Reference
  const handleDiagnosticSearch = async () => {
    const query = searchTerm.trim();
    if (!query) {
      showAlert("Required", "Please provide a Phone Number, Email, Reference, or Verification ID.");
      return;
    }

    setLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.get(`${BASE_URL}/support/search-user/${query}`, config).catch(() =>
        axios.get(`${BASE_URL}/support/trace/all/${query}`, config)
      );

      const payload = res.data?.data || res.data || {};
      const profile = payload.profile || payload.user || payload;
      const transactions = payload.recentTransactions || payload.transactions || (Array.isArray(payload) ? payload : []);

      setAccountData(profile && (profile.phone || profile.email) ? profile : null);
      setDisputedTransactions(transactions);

      if (!profile?.phone && transactions.length === 0) {
        showAlert("Not Found", `No logs or customer accounts matched "${query}".`);
      }
    } catch (err) {
      showAlert("Diagnostic Error", err.response?.data?.message || "Failed to query telemetry logs.");
      setAccountData(null);
      setDisputedTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const onManualRefresh = async () => {
    setRefreshing(true);
    if (searchTerm.trim()) {
      await handleDiagnosticSearch();
    }
    setRefreshing(false);
  };

  // 2. Open Resolution Action Modal
  const openActionModal = (type, tx = null) => {
    setActionType(type);
    setSelectedTx(tx);
    setResolutionNote("");
    setRefundAmount(tx?.amount ? String(tx.amount) : "");
    setActionModalVisible(true);
  };

  // 3. Execute Resolution Command
  const handleExecuteResolution = async () => {
    if (actionType !== "requery" && !resolutionNote.trim()) {
      showAlert("Validation Error", "Please provide a diagnostic note or reason.");
      return;
    }

    setActionLoading(true);
    try {
      const config = await getConfig();

      // Case A: Gateway Re-query
      if (actionType === "requery") {
        const res = await axios.post(
          `${BASE_URL}/support/requery-transaction`,
          {
            reference: selectedTx?.reference || selectedTx?.transactionId || selectedTx?._id,
            service: selectedTx?.service || selectedTx?.type,
          },
          config
        );

        showAlert("Gateway Re-query Result", res.data?.message || "Transaction status synchronized with telecom gateway.");
      }

      // Case B: Instant Customer Refund
      else if (actionType === "refund") {
        const res = await axios.post(
          `${BASE_URL}/support/refund`,
          {
            userId: accountData?._id || selectedTx?.user?._id || selectedTx?.user,
            phone: accountData?.phone || selectedTx?.recipient,
            amount: Number(refundAmount),
            reference: selectedTx?.reference || `REF-${Date.now()}`,
            reason: resolutionNote.trim(),
          },
          config
        );

        showAlert("Refund Executed 💳", res.data?.message || `₦${Number(refundAmount).toLocaleString()} credited back to user wallet.`);
      }

      // Case C: Escalate to SuperAdmin
      else if (actionType === "escalate") {
        const res = await axios.post(
          `${BASE_URL}/support/escalate-refund`,
          {
            userId: accountData?._id || selectedTx?.user?._id,
            phoneOrEmail: accountData?.phone || accountData?.email || selectedTx?.recipient,
            amount: Number(refundAmount || selectedTx?.amount || 0),
            reference: selectedTx?.reference || "N/A",
            reason: resolutionNote.trim(),
            priority: "URGENT_DISPUTE",
          },
          config
        );

        showAlert("Escalated 🚀", res.data?.message || "Dispute packet dispatched to SuperAdmin executive desk.");
      }

      setActionModalVisible(false);
      handleDiagnosticSearch(); // Refresh live state
    } catch (err) {
      showAlert("Resolution Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.topBarTitle}>Issue Resolution Desk</Text>
          <Text style={styles.topBarSub}>Audit, Re-query, Refund & Escalate Disputes</Text>
        </View>
        <TouchableOpacity
          style={styles.quickEscalateBtn}
          onPress={() => openActionModal("escalate")}
        >
          <MaterialIcons name="report" size={16} color="#fbbf24" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#0284c7" />}
      >
        {/* SEARCH BOX */}
        <View style={styles.searchCard}>
          <Text style={styles.searchCardHeading}>CUSTOMER & DISPUTE AUDIT ENGINE</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Search by Phone, Email, Reference, or Verification ID..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />

          <View style={styles.searchBtnRow}>
            <TouchableOpacity style={styles.searchBtnPrimary} onPress={handleDiagnosticSearch} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark" size={15} color="#ffffff" style={{ marginRight: 6 }} />
                  <Text style={styles.btnTextWhite}>RUN DIAGNOSTICS</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.directRefundBtn}
              onPress={() => openActionModal("refund")}
            >
              <FontAwesome5 name="hand-holding-usd" size={14} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.btnTextWhite}>INSTANT REFUND</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* DIAGNOSTIC USER CARD */}
        {accountData && (
          <View style={styles.userProfileCard}>
            <View style={styles.userProfileTop}>
              <View style={styles.userAvatarBox}>
                <FontAwesome5 name="user-check" size={18} color="#0284c7" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.userNameText}>
                  {accountData.name || `${accountData.firstName || ""} ${accountData.surname || ""}`.trim()}
                </Text>
                <Text style={styles.userRoleTag}>
                  ROLE: {String(accountData.role || "USER").toUpperCase()} • STATUS:{" "}
                  <Text style={{ color: accountData.isSuspended ? "#ef4444" : "#16a34a", fontWeight: "900" }}>
                    {accountData.isSuspended ? "SUSPENDED" : "ACTIVE"}
                  </Text>
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.walletBalText}>
                  ₦{Number(accountData.walletBalance ?? accountData.balance ?? 0).toLocaleString()}
                </Text>
                <Text style={styles.walletBalSub}>Float Balance</Text>
              </View>
            </View>

            <View style={styles.userMetaContainer}>
              <Text style={styles.userMetaText}>📞 Phone: <Text style={styles.metaBold}>{accountData.phone || "N/A"}</Text></Text>
              <Text style={styles.userMetaText}>✉️ Email: <Text style={styles.metaBold}>{accountData.email || "N/A"}</Text></Text>
              <Text style={styles.userMetaText}>🏦 Bank Account: <Text style={styles.metaBold}>{accountData.bankName || "Wema Bank"} ({accountData.accountNumber || "N/A"})</Text></Text>
              <Text style={styles.userMetaText}>📍 Region: <Text style={styles.metaBold}>{accountData.lga || "LGA"}, {accountData.state || "State"}</Text></Text>
            </View>
          </View>
        )}

        {/* DISPUTED / LOGGED TRANSACTIONS LIST */}
        {disputedTransactions.length > 0 && (
          <View style={styles.transactionsContainer}>
            <Text style={styles.sectionHeading}>TRANSACTION TELEMETRY AUDIT ({disputedTransactions.length})</Text>

            {disputedTransactions.map((tx, index) => {
              const isSuccess = tx.status === "success" || tx.status === "completed";
              const isFailed = tx.status === "failed";
              const ref = tx.reference || tx.transactionId || tx._id;

              return (
                <View key={tx._id || index.toString()} style={styles.txAuditCard}>
                  <View style={styles.txHeaderRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txRefVal}>Ref: {ref}</Text>
                      <Text style={styles.txTypeSub}>
                        {tx.service || tx.type || "Service"} • {tx.createdAt ? new Date(tx.createdAt).toLocaleString() : "Real-Time"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.txAmountVal}>₦{Number(tx.amount || 0).toLocaleString()}</Text>
                      <Text style={[styles.txStatusBadge, { color: isSuccess ? "#16a34a" : (isFailed ? "#ef4444" : "#d97706") }]}>
                        {String(tx.status || "PENDING").toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* ACTION CONTROLS ON TRANSACTION */}
                  <View style={styles.txControlsRow}>
                    <TouchableOpacity
                      style={styles.txActionBtnSecondary}
                      onPress={() => openActionModal("requery", tx)}
                    >
                      <Feather name="refresh-cw" size={12} color="#0284c7" />
                      <Text style={styles.txActionBtnTextSecondary}>Gateway Re-Query</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.txActionBtnPrimary}
                      onPress={() => openActionModal("refund", tx)}
                    >
                      <MaterialIcons name="replay" size={13} color="#ffffff" />
                      <Text style={styles.txActionBtnTextPrimary}>Credit Refund</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.txActionBtnDanger}
                      onPress={() => openActionModal("escalate", tx)}
                    >
                      <MaterialIcons name="report-problem" size={13} color="#dc2626" />
                      <Text style={styles.txActionBtnTextDanger}>Escalate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          RESOLUTION / REFUND / ESCALATION MODAL
         ========================================================================= */}
      <Modal visible={actionModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {actionType === "requery"
                    ? "Telecom Gateway Re-Query"
                    : actionType === "refund"
                    ? "Authorize Wallet Refund"
                    : "Escalate Dispute to SuperAdmin"}
                </Text>
                <Text style={styles.modalSub}>
                  Ref: {selectedTx?.reference || selectedTx?._id || "Direct User Adjustment"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {actionType === "refund" && (
                <>
                  <Text style={styles.fieldLabel}>REFUND AMOUNT (₦)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="Enter amount..."
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={refundAmount}
                    onChangeText={setRefundAmount}
                  />
                </>
              )}

              {actionType !== "requery" && (
                <>
                  <Text style={styles.fieldLabel}>DIAGNOSTIC RESOLUTION NOTE</Text>
                  <TextInput
                    style={[styles.modalInput, { height: 75, textAlignVertical: "top" }]}
                    placeholder="Provide detailed diagnostic reason for audit trails..."
                    placeholderTextColor="#94a3b8"
                    multiline
                    value={resolutionNote}
                    onChangeText={setResolutionNote}
                  />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.modalSubmitBtn,
                  { backgroundColor: actionType === "refund" ? "#16a34a" : (actionType === "escalate" ? "#dc2626" : "#0284c7") },
                ]}
                onPress={handleExecuteResolution}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>
                    {actionType === "requery"
                      ? "EXECUTE GATEWAY RE-QUERY"
                      : actionType === "refund"
                      ? "CONFIRM WALLET CREDIT REFUND"
                      : "DISPATCH TO SUPERADMIN DESK"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  topBar: {
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 38,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backIconBtn: { padding: 4 },
  topBarTitle: { color: "#ffffff", fontSize: 15, fontWeight: "900", letterSpacing: 0.3 },
  topBarSub: { color: "#38bdf8", fontSize: 10.5, marginTop: 2 },
  quickEscalateBtn: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  scrollArea: { padding: 14, paddingBottom: 60 },
  searchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  searchCardHeading: { fontSize: 10.5, fontWeight: "900", color: "#0284c7", marginBottom: 8, letterSpacing: 0.6 },
  textInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: "#0f172a",
    fontSize: 13,
    marginBottom: 10,
  },
  searchBtnRow: { flexDirection: "row", gap: 8 },
  searchBtnPrimary: {
    flex: 1.2,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  directRefundBtn: {
    flex: 1,
    backgroundColor: "#16a34a",
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  btnTextWhite: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  userProfileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#0284c7",
    elevation: 2,
  },
  userProfileTop: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  userAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  userNameText: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  userRoleTag: { color: "#64748b", fontSize: 10, marginTop: 1 },
  walletBalText: { color: "#059669", fontSize: 15, fontWeight: "900" },
  walletBalSub: { color: "#94a3b8", fontSize: 9 },
  userMetaContainer: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userMetaText: { fontSize: 11, color: "#475569", marginVertical: 1.5 },
  metaBold: { color: "#0f172a", fontWeight: "700" },

  transactionsContainer: { marginBottom: 14 },
  sectionHeading: { fontSize: 11, fontWeight: "900", color: "#475569", marginBottom: 10, letterSpacing: 0.6 },
  txAuditCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  txHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  txRefVal: { fontSize: 12, color: "#0f172a", fontWeight: "800" },
  txTypeSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  txAmountVal: { fontSize: 14, color: "#0f172a", fontWeight: "900" },
  txStatusBadge: { fontSize: 9.5, fontWeight: "900", marginTop: 2 },

  txControlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  txActionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    gap: 4,
  },
  txActionBtnTextSecondary: { color: "#0284c7", fontSize: 10, fontWeight: "800" },
  txActionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#16a34a",
    paddingVertical: 7,
    borderRadius: 6,
    gap: 4,
  },
  txActionBtnTextPrimary: { color: "#ffffff", fontSize: 10, fontWeight: "800" },
  txActionBtnDanger: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fef2f2",
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#fca5a5",
    gap: 4,
  },
  txActionBtnTextDanger: { color: "#dc2626", fontSize: 10, fontWeight: "800" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 18,
    width: "100%",
    maxWidth: 500,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  modalTitle: { color: "#0f172a", fontSize: 14.5, fontWeight: "900" },
  modalSub: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  fieldLabel: { color: "#0284c7", fontSize: 10, fontWeight: "900", marginTop: 8, marginBottom: 4 },
  modalInput: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    fontSize: 12,
    color: "#0f172a",
    marginBottom: 6,
  },
  modalSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  modalSubmitBtnText: { color: "#ffffff", fontSize: 11.5, fontWeight: "900", letterSpacing: 0.5 },
});

export default IssueResolution;