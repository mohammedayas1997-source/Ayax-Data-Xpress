import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Animated,
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
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupportDashboard = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState("diagnostics"); // 'diagnostics' | 'live_feed' | 'refund_portal' | 'trace'
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState("data"); // data, vtu, bvn, nimc, cable, electricity
  const [userData, setUserData] = useState(null);
  const [userTransactions, setUserTransactions] = useState([]);
  const [traceData, setTraceData] = useState([]);
  const [liveCompanyTransactions, setLiveCompanyTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 320);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Refund & SuperAdmin Escalation Modal
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [refundUserPhone, setRefundUserPhone] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const toggleSidebar = (open) => {
    if (open) {
      setSidebarOpen(true);
      Animated.spring(sidebarAnim, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -sidebarWidth,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setSidebarOpen(false));
    }
  };

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
      timeout: 10000,
    };
  };

  // 1. Kwaso dukkan Hada-hadar Kamfani a Real Live
  const fetchLiveCompanyTelemetry = useCallback(async () => {
    try {
      const config = await getConfig();
      const res = await axios.get(`${BASE_URL}/support/live-transactions`, config).catch(() =>
        axios.get(`${BASE_URL}/admin/transactions?limit=25`, config).catch(() => ({ data: [] }))
      );

      const list = res.data?.transactions || res.data?.data || (Array.isArray(res.data) ? res.data : []);
      setLiveCompanyTransactions(list);
    } catch (e) {
      // Background fail silent
    }
  }, []);

  useEffect(() => {
    fetchLiveCompanyTelemetry();
    const liveInterval = setInterval(() => {
      fetchLiveCompanyTelemetry();
    }, 5000);
    return () => clearInterval(liveInterval);
  }, [fetchLiveCompanyTelemetry]);

  const onManualRefresh = async () => {
    setRefreshing(true);
    await fetchLiveCompanyTelemetry();
    if (identifier.trim()) {
      await handleUserSearch();
    }
    setRefreshing(false);
  };

  // 2. Binciko Matsalar User da Cikakken Tarihinsa
  const handleUserSearch = async () => {
    if (!identifier.trim()) {
      showAlert("Required", "Please enter User Phone, Email, Reference, or NIN/BVN.");
      return;
    }
    setLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.get(
        `${BASE_URL}/support/search-user/${identifier.trim()}`,
        config
      );

      const payload = res.data?.data || res.data || {};
      setUserData(payload.profile || payload.user || payload);
      setUserTransactions(payload.recentTransactions || payload.transactions || []);
      setTraceData([]);
    } catch (err) {
      showAlert("Not Found", err.response?.data?.message || "No user records found for this query.");
      setUserData(null);
      setUserTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // 3. Trace Takamaiman Sabis (BVN, NIMC, VTU, Data)
  const handleTrace = async () => {
    if (!identifier.trim()) {
      showAlert("Notice", "Please enter ID or Transaction Reference to trace.");
      return;
    }
    setLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.get(
        `${BASE_URL}/support/trace/${type}/${identifier.trim()}`,
        config
      );
      setTraceData(res.data?.data || res.data || []);
      setUserData(null);
    } catch (err) {
      showAlert("Notice", err.response?.data?.message || "No service logs found for this query.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Tura Buƙatar Refund & Rahoto Ga SuperAdmin
  const handleEscalateToSuperAdmin = async () => {
    if (!refundUserPhone.trim() || !refundAmount.trim() || !refundReason.trim()) {
      showAlert("Validation Error", "User Identifier, Amount, and Issue Description are required.");
      return;
    }

    setActionLoading(true);
    try {
      const config = await getConfig();
      const res = await axios.post(
        `${BASE_URL}/support/escalate-refund`,
        {
          phoneOrEmail: refundUserPhone.trim(),
          amount: Number(refundAmount),
          reference: refundReference.trim() || undefined,
          reason: refundReason.trim(),
          priority: "HIGH_SUPPORT_DESK",
        },
        config
      ).catch(() =>
        axios.post(
          `${BASE_URL}/notifications/send`,
          {
            title: `SUPPORT REFUND ESCALATION: ${refundUserPhone}`,
            message: `Amount: ₦${refundAmount} | Ref: ${refundReference || "N/A"} | Details: ${refundReason}`,
            category: "REFUND_DISPUTE",
          },
          config
        )
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert("Dispute Dispatched 🚀", "Refund request and diagnostic packet transmitted to SuperAdmin executive desk.");
        setRefundModalVisible(false);
        setRefundUserPhone("");
        setRefundAmount("");
        setRefundReference("");
        setRefundReason("");
      }
    } catch (err) {
      showAlert("Escalation Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.menuBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
          <Feather name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <View style={styles.deskBadge}>
            <View style={styles.pulseDot} />
            <Text style={styles.deskBadgeText}>AYAX HELPDESK & RESOLUTION TERMINAL</Text>
          </View>
          <Text style={styles.headerTitle}>EXECUTIVE SUPPORT DESK</Text>
        </View>

        <TouchableOpacity style={styles.escalateTopBtn} onPress={() => setRefundModalVisible(true)} activeOpacity={0.8}>
          <MaterialIcons name="security" size={16} color="#fbbf24" />
        </TouchableOpacity>
      </View>

      {/* NAVIGATION TABS */}
      <View style={styles.navTabsContainer}>
        <TouchableOpacity
          style={[styles.navTabItem, activeTab === "diagnostics" && styles.navTabItemActive]}
          onPress={() => setActiveTab("diagnostics")}
        >
          <Ionicons name="search" size={15} color={activeTab === "diagnostics" ? "#0284c7" : "#64748b"} />
          <Text style={[styles.navTabItemText, activeTab === "diagnostics" && styles.navTabItemTextActive]}>
            User Diagnostic
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTabItem, activeTab === "live_feed" && styles.navTabItemActive]}
          onPress={() => setActiveTab("live_feed")}
        >
          <Feather name="activity" size={14} color={activeTab === "live_feed" ? "#0284c7" : "#64748b"} />
          <Text style={[styles.navTabItemText, activeTab === "live_feed" && styles.navTabItemTextActive]}>
            Live Company Feed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navTabItem, activeTab === "trace" && styles.navTabItemActive]}
          onPress={() => setActiveTab("trace")}
        >
          <MaterialCommunityIcons name="radar" size={16} color={activeTab === "trace" ? "#0284c7" : "#64748b"} />
          <Text style={[styles.navTabItemText, activeTab === "trace" && styles.navTabItemTextActive]}>
            Service Tracer
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollArea}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#0284c7" />}
      >
        {/* =========================================================================
            TAB 1: USER COMPREHENSIVE DIAGNOSTICS & RESOLUTION
           ========================================================================= */}
        {activeTab === "diagnostics" && (
          <View>
            <View style={styles.searchCard}>
              <Text style={styles.inputCardLabel}>SEARCH & RESOLVE USER COMPLAINT</Text>
              <TextInput
                style={styles.inputBox}
                placeholder="Enter Phone, Email, Reference, or NIN/BVN..."
                placeholderTextColor="#94a3b8"
                value={identifier}
                onChangeText={setIdentifier}
              />

              <View style={styles.searchActionRow}>
                <TouchableOpacity style={styles.primarySearchBtn} onPress={handleUserSearch} disabled={loading}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextWhite}>DIAGNOSE USER</Text>}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.openRefundBtn}
                  onPress={() => {
                    if (userData) {
                      setRefundUserPhone(userData.phone || userData.email || "");
                    }
                    setRefundModalVisible(true);
                  }}
                >
                  <MaterialIcons name="report-problem" size={16} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>REQUEST REFUND</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* DIAGNOSTIC PROFILE CARD */}
            {userData && (
              <View style={styles.profileDiagnosticCard}>
                <View style={styles.profileHeaderRow}>
                  <View style={styles.avatarWrap}>
                    <FontAwesome5 name="user-shield" size={18} color="#0284c7" />
                  </View>
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.profileNameText}>
                      {userData.name || `${userData.firstName || ""} ${userData.surname || ""}`}
                    </Text>
                    <Text style={styles.profileRoleText}>
                      ROLE: {String(userData.role || "USER").toUpperCase()} • STATUS:{" "}
                      <Text style={{ color: userData.isSuspended ? "#ef4444" : "#16a34a", fontWeight: "900" }}>
                        {userData.isSuspended ? "SUSPENDED" : "ACTIVE"}
                      </Text>
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.walletBalVal}>
                      ₦{Number(userData.walletBalance ?? userData.balance ?? 0).toLocaleString()}
                    </Text>
                    <Text style={styles.walletBalSub}>Wallet Balance</Text>
                  </View>
                </View>

                <View style={styles.profileMetaGrid}>
                  <Text style={styles.metaRowText}>📞 Phone: <Text style={styles.metaHighlight}>{userData.phone || "N/A"}</Text></Text>
                  <Text style={styles.metaRowText}>✉️ Email: <Text style={styles.metaHighlight}>{userData.email || "N/A"}</Text></Text>
                  <Text style={styles.metaRowText}>📍 Region: <Text style={styles.metaHighlight}>{userData.lga || "Ajingi"} LGA, {userData.state || "Kano"}</Text></Text>
                  <Text style={styles.metaRowText}>🏦 Dedicated Bank: <Text style={styles.metaHighlight}>{userData.bankName || "Wema Bank"} ({userData.accountNumber || "N/A"})</Text></Text>
                </View>
              </View>
            )}

            {/* RECENT USER TRANSACTIONS AUDIT */}
            {userTransactions.length > 0 && (
              <View style={styles.historyCard}>
                <Text style={styles.historyCardTitle}>USER TRANSACTION LOGS ({userTransactions.length})</Text>
                {userTransactions.map((tx) => (
                  <View key={tx._id || Math.random().toString()} style={styles.txItemBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txRefText}>Ref: {tx.reference || tx.transactionId || "N/A"}</Text>
                      <Text style={styles.txSubText}>
                        {tx.service || tx.type || "Service"} • {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString() : "Recent"}
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.txAmountText}>₦{Number(tx.amount || 0).toLocaleString()}</Text>
                      <Text style={[styles.txStatusText, { color: tx.status === "success" ? "#16a34a" : "#ef4444" }]}>
                        {String(tx.status || "PENDING").toUpperCase()}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 2: REAL LIVE COMPANY TRANSACTIONS MONITOR (STREAM)
           ========================================================================= */}
        {activeTab === "live_feed" && (
          <View>
            <View style={styles.feedHeaderRow}>
              <Text style={styles.sectionHeadingText}>LIVE COMPANY TRANSACTION TELEMETRY</Text>
              <View style={styles.liveStreamBadge}>
                <View style={styles.pulseDot} />
                <Text style={styles.liveStreamBadgeText}>5s LIVE STREAM</Text>
              </View>
            </View>

            {liveCompanyTransactions.length > 0 ? (
              liveCompanyTransactions.map((item, index) => {
                const isSuccess = item.status === "success";
                return (
                  <View key={item._id || index.toString()} style={styles.companyFeedCard}>
                    <View style={styles.feedCardTop}>
                      <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
                        <View style={[styles.statusIconCircle, { backgroundColor: isSuccess ? "#dcfce7" : "#fee2e2" }]}>
                          <Ionicons
                            name={isSuccess ? "checkmark-circle" : "alert-circle"}
                            size={16}
                            color={isSuccess ? "#16a34a" : "#ef4444"}
                          />
                        </View>
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={styles.feedUserText}>{item.user?.name || item.user?.phone || item.recipient || "Subscriber"}</Text>
                          <Text style={styles.feedRefText}>Ref: {item.reference || item._id}</Text>
                        </View>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={styles.feedAmountText}>₦{Number(item.amount || 0).toLocaleString()}</Text>
                        <Text style={[styles.feedStatusLabel, { color: isSuccess ? "#16a34a" : "#ef4444" }]}>
                          {String(item.status || "PENDING").toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyFeed}>
                <ActivityIndicator color="#0284c7" />
                <Text style={styles.emptyFeedText}>Listening for real-time transactions...</Text>
              </View>
            )}
          </View>
        )}

        {/* =========================================================================
            TAB 3: SERVICE TRACER (BVN, NIMC, DATA, VTU)
           ========================================================================= */}
        {activeTab === "trace" && (
          <View>
            <View style={styles.searchCard}>
              <Text style={styles.inputCardLabel}>SELECT SERVICE FOR DEEP TRACING</Text>
              <View style={styles.servicePillContainer}>
                {["data", "vtu", "bvn", "nimc", "cable", "electricity"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.servicePill, type === s && styles.servicePillActive]}
                    onPress={() => setType(s)}
                  >
                    <Text style={[styles.servicePillText, type === s && styles.servicePillTextActive]}>
                      {s.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput
                style={styles.inputBox}
                placeholder={`Enter ${type.toUpperCase()} ID or Reference...`}
                placeholderTextColor="#94a3b8"
                value={identifier}
                onChangeText={setIdentifier}
              />

              <TouchableOpacity style={styles.primarySearchBtn} onPress={handleTrace} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextWhite}>TRACE {type.toUpperCase()} SERVICE</Text>}
              </TouchableOpacity>
            </View>

            {traceData.length > 0 && (
              <View style={styles.historyCard}>
                <Text style={styles.historyCardTitle}>TRACE RESULTS ({traceData.length})</Text>
                {traceData.map((item, idx) => (
                  <View key={item._id || idx.toString()} style={styles.txItemBox}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txRefText}>ID/Ref: {item.bvnNumber || item.ninNumber || item.reference || "N/A"}</Text>
                      <Text style={styles.txSubText}>Status: {String(item.status || "PENDING").toUpperCase()}</Text>
                    </View>
                    <Text style={styles.txSubText}>{item.createdAt ? new Date(item.createdAt).toLocaleString() : "Live"}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* =========================================================================
          MODAL: SUPERADMIN REFUND ESCALATION
         ========================================================================= */}
      <Modal visible={refundModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Escalate Refund to SuperAdmin</Text>
                <Text style={styles.modalCardSub}>Submit verified dispute for executive approval</Text>
              </View>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>USER IDENTIFIER (PHONE / EMAIL)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 08012345678"
                placeholderTextColor="#94a3b8"
                value={refundUserPhone}
                onChangeText={setRefundUserPhone}
              />

              <Text style={styles.fieldLabel}>REFUND AMOUNT (₦)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1500"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={refundAmount}
                onChangeText={setRefundAmount}
              />

              <Text style={styles.fieldLabel}>TRANSACTION REFERENCE (IF APPLICABLE)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. TX-17882928"
                placeholderTextColor="#94a3b8"
                value={refundReference}
                onChangeText={setRefundReference}
              />

              <Text style={styles.fieldLabel}>DIAGNOSTIC REPORT / ISSUE REASON</Text>
              <TextInput
                style={[styles.modalInput, { height: 80, textAlignVertical: "top" }]}
                placeholder="Detail the failure reason (e.g. Debited Without Value on MTN 2GB)..."
                placeholderTextColor="#94a3b8"
                multiline
                value={refundReason}
                onChangeText={setRefundReason}
              />

              <TouchableOpacity
                style={styles.submitEscalateBtn}
                onPress={handleEscalateToSuperAdmin}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnTextWhite}>TRANSMIT TO SUPERADMIN</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          SIDEBAR DRAWER
         ========================================================================= */}
      {sidebarOpen && (
        <TouchableOpacity style={styles.sidebarBackdrop} activeOpacity={1} onPress={() => toggleSidebar(false)}>
          <Animated.View
            style={[styles.sidebarContainer, { width: sidebarWidth, transform: [{ translateX: sidebarAnim }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <MaterialCommunityIcons name="headset" size={26} color="#0284c7" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarTitle}>Support Operations</Text>
                  <Text style={styles.sidebarSub}>Ayax Desk Terminal</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1, marginTop: 10 }}>
              <Text style={styles.sidebarCatLabel}>DIAGNOSTICS & RESOLUTION</Text>

              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("diagnostics");
                }}
              >
                <Ionicons name="search" size={16} color="#0284c7" />
                <Text style={styles.sidebarItemText}>Diagnose User Issue</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("live_feed");
                }}
              >
                <Feather name="activity" size={16} color="#16a34a" />
                <Text style={styles.sidebarItemText}>Real-Time Company Feed</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("trace");
                }}
              >
                <MaterialCommunityIcons name="radar" size={16} color="#d97706" />
                <Text style={styles.sidebarItemText}>Deep Service Tracer</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCatLabel}>ESCALATION & DISPUTES</Text>

              <TouchableOpacity
                style={styles.sidebarItem}
                onPress={() => {
                  toggleSidebar(false);
                  setRefundModalVisible(true);
                }}
              >
                <MaterialIcons name="security" size={16} color="#dc2626" />
                <Text style={styles.sidebarItemText}>Escalate Refund to SuperAdmin</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtnRow} onPress={handleLogout}>
              <Feather name="log-out" size={16} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Exit Support Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  topHeader: {
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  menuBtn: { padding: 4 },
  deskBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#38bdf8", marginRight: 6 },
  deskBadgeText: { color: "#38bdf8", fontSize: 9, fontWeight: "900", letterSpacing: 0.6 },
  headerTitle: { color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  escalateTopBtn: {
    backgroundColor: "rgba(251, 191, 36, 0.15)",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(251, 191, 36, 0.3)",
  },

  navTabsContainer: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  navTabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  navTabItemActive: { borderBottomColor: "#0284c7" },
  navTabItemText: { color: "#64748b", fontSize: 11, fontWeight: "700", marginLeft: 4 },
  navTabItemTextActive: { color: "#0284c7", fontWeight: "900" },

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
  inputCardLabel: { fontSize: 10.5, fontWeight: "900", color: "#0284c7", marginBottom: 8, letterSpacing: 0.6 },
  inputBox: {
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
  searchActionRow: { flexDirection: "row", gap: 8 },
  primarySearchBtn: {
    flex: 1,
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  openRefundBtn: {
    flex: 1,
    backgroundColor: "#dc2626",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 4,
  },
  btnTextWhite: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },

  profileDiagnosticCard: {
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
  profileHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  avatarWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  profileNameText: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  profileRoleText: { color: "#64748b", fontSize: 10, marginTop: 1 },
  walletBalVal: { color: "#059669", fontSize: 15, fontWeight: "900" },
  walletBalSub: { color: "#94a3b8", fontSize: 9 },
  profileMetaGrid: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  metaRowText: { fontSize: 11, color: "#475569", marginVertical: 1.5 },
  metaHighlight: { color: "#0f172a", fontWeight: "700" },

  historyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  historyCardTitle: { fontSize: 11, fontWeight: "900", color: "#475569", marginBottom: 10, letterSpacing: 0.6 },
  txItemBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  txRefText: { fontSize: 11.5, color: "#0f172a", fontWeight: "700" },
  txSubText: { fontSize: 10, color: "#64748b", marginTop: 2 },
  txAmountText: { fontSize: 13, color: "#0f172a", fontWeight: "900" },
  txStatusText: { fontSize: 9.5, fontWeight: "900", marginTop: 2 },

  feedHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionHeadingText: { fontSize: 11, fontWeight: "900", color: "#475569", letterSpacing: 0.6 },
  liveStreamBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(22, 163, 74, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveStreamBadgeText: { color: "#16a34a", fontSize: 9.5, fontWeight: "900" },
  companyFeedCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  feedCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statusIconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: "center", alignItems: "center" },
  feedUserText: { color: "#0f172a", fontSize: 12.5, fontWeight: "800" },
  feedRefText: { color: "#94a3b8", fontSize: 9.5, marginTop: 1 },
  feedAmountText: { color: "#0f172a", fontSize: 13.5, fontWeight: "900" },
  feedStatusLabel: { fontSize: 9.5, fontWeight: "900", marginTop: 1 },

  servicePillContainer: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  servicePill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  servicePillActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  servicePillText: { fontSize: 10.5, fontWeight: "800", color: "#64748b" },
  servicePillTextActive: { color: "#ffffff" },

  emptyFeed: {
    backgroundColor: "#ffffff",
    padding: 30,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyFeedText: { color: "#94a3b8", fontSize: 11, marginTop: 8 },

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
    maxWidth: 520,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 8,
  },
  modalCardTitle: { color: "#0f172a", fontSize: 14.5, fontWeight: "900" },
  modalCardSub: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
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
  submitEscalateBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
  },

  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    zIndex: 100,
  },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sidebarTitle: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  sidebarSub: { color: "#0284c7", fontSize: 10, fontWeight: "700" },
  sidebarCatLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8, marginTop: 14, marginBottom: 6 },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 2,
  },
  sidebarItemText: { color: "#334155", fontSize: 12, fontWeight: "700", marginLeft: 10 },
  logoutBtnRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 12, fontWeight: "800", marginLeft: 8 },
});

export default SupportDashboard;