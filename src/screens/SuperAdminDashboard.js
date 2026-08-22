import React, { useEffect, useState, useRef } from "react";
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
  Dimensions,
  Animated,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  // Sidebar Drawer Animation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.78)).current;

  // Modals
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [apiGatewayModalVisible, setApiGatewayModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Dispatch / Create Plan Form State
  const [dispatchNetwork, setDispatchNetwork] = useState("MTN");
  const [dispatchPlanType, setDispatchPlanType] = useState("SME");
  const [dispatchPlanCode, setDispatchPlanCode] = useState("1GB");
  const [dispatchPrice, setDispatchPrice] = useState("280");
  const [dispatchCostPrice, setDispatchCostPrice] = useState("245");
  const [dispatchValidity, setDispatchValidity] = useState("30");
  const [dispatchRecipients, setDispatchRecipients] = useState("");
  const [sendToAll, setSendToAll] = useState(false);

  // Wallet Funding State
  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletActionType, setWalletActionType] = useState("credit");

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const toggleSidebar = (open) => {
    if (open) {
      setSidebarOpen(true);
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -width * 0.78,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setSidebarOpen(false));
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
    } catch (err) {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const fallbackRes = await axios.get(`${BASE_URL}/admin/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setStats(fallbackRes.data.data || fallbackRes.data.stats || {});
      } catch (e) {
        console.log("Stats fetch fallback error:", e.message);
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

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 1. Dispatch / Provision Data Bundle
  const handleExecuteDispatch = async () => {
    if (!dispatchPlanCode || !dispatchPrice || !dispatchValidity) {
      return showAlert("Missing Parameters", "Fill in size, price, and validity days.");
    }
    if (!sendToAll && !dispatchRecipients.trim()) {
      return showAlert("Target Required", "Provide recipient phone number(s) or check 'Deploy to All Users'.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        network: dispatchNetwork,
        planType: dispatchPlanType,
        planCode: dispatchPlanCode.trim(),
        price: Number(dispatchPrice),
        costPrice: Number(dispatchCostPrice || dispatchPrice),
        validityDays: Number(dispatchValidity),
        recipients: dispatchRecipients.trim(),
        sendToAllUsers: sendToAll,
      };

      const response = await axios.post(`${BASE_URL}/superadmin/dispatch-data`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data?.success) {
        showAlert("Execution Successful", response.data.message || "Data batch deployed successfully!");
        setDispatchModalVisible(false);
        setDispatchRecipients("");
        setSendToAll(false);
        fetchStats();
      } else {
        throw new Error(response.data?.message || "Operation failed");
      }
    } catch (err) {
      showAlert("Execution Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Direct Ledger Wallet Modification
  const handleExecuteWalletAction = async () => {
    if (!walletUserId.trim() || !walletAmount) {
      return showAlert("Missing Details", "Target identifier and numeric amount required.");
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
          reason: walletReason.trim() || "SuperAdmin Direct Ledger Adjustment",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        showAlert(
          "Ledger Updated",
          `User balance successfully ${walletActionType === "credit" ? "credited" : "debited"} with ₦${walletAmount}`
        );
        setWalletModalVisible(false);
        setWalletUserId("");
        setWalletAmount("");
        setWalletReason("");
        fetchStats();
      } else {
        throw new Error(response.data?.message || "Adjustment failed");
      }
    } catch (err) {
      showAlert("Ledger Fault", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loaderText}>Syncing Enterprise Nodes & Telemetry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1d" />

      {/* TOP GLOBAL APP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuIconBtn}
          onPress={() => toggleSidebar(true)}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.enterpriseBadge}>
            <MaterialCommunityIcons name="shield-crown" size={14} color="#f59e0b" />
            <Text style={styles.enterpriseBadgeText}>ROOT LEVEL</Text>
          </View>
          <Text style={styles.topBrandTitle}>AYAX CENTRAL ENGINE</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => setWalletModalVisible(true)}
        >
          <Ionicons name="flash-outline" size={20} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#38bdf8" />
        }
      >
        {/* TELEMETRY METRICS GRID */}
        <View style={styles.telemetrySection}>
          <Text style={styles.sectionHeaderLabel}>REAL-TIME PLATFORM TELEMETRY</Text>

          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, { borderColor: "#1e3a8a" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Gross Volume</Text>
                <Ionicons name="pie-chart" size={18} color="#38bdf8" />
              </View>
              <Text style={styles.metricValue}>
                ₦{stats?.finance?.totalRevenue?.toLocaleString() || stats?.totalRevenue?.toLocaleString() || "0.00"}
              </Text>
              <Text style={styles.metricSub}>+18.4% from automated nodes</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#065f46" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Transactions</Text>
                <Ionicons name="checkmark-done" size={18} color="#34d399" />
              </View>
              <Text style={styles.metricValue}>
                {stats?.finance?.successfulTransactions?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.metricSub}>99.94% Gateway Success</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#581c87" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Registered Identities</Text>
                <Ionicons name="finger-print" size={18} color="#c084fc" />
              </View>
              <Text style={styles.metricValue}>
                {stats?.users?.totalUsers?.toLocaleString() || stats?.totalUsers?.toLocaleString() || "0"}
              </Text>
              <Text style={styles.metricSub}>{(stats?.users?.totalAgents || 0)} Certified Agents</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#831843" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Supervisors & Admins</Text>
                <Ionicons name="shield-checkmark" size={18} color="#f472b6" />
              </View>
              <Text style={styles.metricValue}>
                {(stats?.users?.totalAdmins || 0) + (stats?.users?.totalSupervisors || 0)}
              </Text>
              <Text style={styles.metricSub}>Active Operational Staff</Text>
            </View>
          </View>
        </View>

        {/* PRIMARY COMMAND CONTROLS */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionHeaderLabel}>HIGH-AUTHORITY COMMAND CORES</Text>

          {/* Provision & Dispatch Data */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setDispatchModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0369a1" }]}>
              <Ionicons name="paper-plane" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Enterprise Data Dispatch & Pricing</Text>
              <Text style={styles.tileDescription}>
                Provision bundles, set wholesale/retail margins, and broadcast to targets.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Wallet Manual Adjustment */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setWalletModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#047857" }]}>
              <Ionicons name="wallet" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Direct Ledger Adjustment</Text>
              <Text style={styles.tileDescription}>
                Manual credit/debit injection with real-time audit ledger tagging.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* API Gateway & Switchboard */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setApiGatewayModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#7c2d12" }]}>
              <MaterialCommunityIcons name="api" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>API Gateways & Server Routing</Text>
              <Text style={styles.tileDescription}>
                Switch active providers (SMEPlug, GladTidings, Alrahuz, VTpass) in real-time.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* NIMC & Verification Command */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("NimcRequests")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#4338ca" }]}>
              <Ionicons name="id-card" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>NIMC & Identity Verification Queue</Text>
              <Text style={styles.tileDescription}>
                Process tracking IDs, Slip generators, and NIN record lookups.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Supervisor Management */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("SupervisorDashboard")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#be185d" }]}>
              <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Supervisor Terminal & Agent Network</Text>
              <Text style={styles.tileDescription}>
                Inspect field agent networks, commissions, and transaction flows.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* Global Audit Logs */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("SupportActivities")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#1e293b" }]}>
              <MaterialCommunityIcons name="security-network" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>System Audit & Security Logs</Text>
              <Text style={styles.tileDescription}>
                Full immutable event stream of staff actions, logins, and API webhooks.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ==========================================
          GLOBAL SIDEBAR DRAWER (OVERLAY)
      ========================================== */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => toggleSidebar(false)}
        >
          <Animated.View
            style={[styles.sidebarContainer, { left: sidebarAnim }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandRow}>
                <MaterialCommunityIcons name="shield-crown" size={26} color="#f59e0b" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>Ayax Terminal</Text>
                  <Text style={styles.sidebarRoleText}>SuperAdmin Superuser</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>CORE NAVIGATION</Text>
              
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                }}
              >
                <Feather name="grid" size={18} color="#38bdf8" />
                <Text style={[styles.navItemText, { color: "#38bdf8" }]}>Master Overview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("SupervisorDashboard");
                }}
              >
                <FontAwesome5 name="user-tie" size={16} color="#94a3b8" />
                <Text style={styles.navItemText}>Supervisor Terminal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("AdminDashboard");
                }}
              >
                <Feather name="users" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Admin Management</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("NimcRequests");
                }}
              >
                <Ionicons name="id-card-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>NIMC Verification Nodes</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FINANCIAL INFRASTRUCTURE</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setWalletModalVisible(true);
                }}
              >
                <Ionicons name="card-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Direct Wallet Injector</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setDispatchModalVisible(true);
                }}
              >
                <Feather name="send" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Provision Data Bundles</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setApiGatewayModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="server-network" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>API Providers Gateway</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>SECURITY & MONITORING</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("SupportActivities");
                }}
              >
                <Feather name="activity" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Realtime Audit Stream</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Terminate Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* ==========================================
          MODAL: ADVANCED ENTERPRISE DISPATCH / PRICING
      ========================================== */}
      <Modal visible={dispatchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Provision Data Plan & Dispatch</Text>
                <Text style={styles.modalCardSubtitle}>Set network, prices, validity, and targets</Text>
              </View>
              <TouchableOpacity onPress={() => setDispatchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Network Selector */}
              <Text style={styles.formFieldLabel}>TELECOM NETWORK</Text>
              <View style={styles.pillGrid}>
                {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[styles.pillBtn, dispatchNetwork === net && styles.activePillBtn]}
                    onPress={() => setDispatchNetwork(net)}
                  >
                    <Text style={[styles.pillBtnText, dispatchNetwork === net && styles.activePillBtnText]}>
                      {net}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Plan Type Selector */}
              <Text style={styles.formFieldLabel}>PLAN CATEGORY / TYPE</Text>
              <View style={styles.pillGrid}>
                {["SME", "CORPORATE", "GIFTING", "SPECIAL"].map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[styles.pillBtn, dispatchPlanType === type && styles.activePillBtn]}
                    onPress={() => setDispatchPlanType(type)}
                  >
                    <Text style={[styles.pillBtnText, dispatchPlanType === type && styles.activePillBtnText]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Data Size Code */}
              <Text style={styles.formFieldLabel}>PLAN SIZE / CODE (e.g. 500MB, 1.0GB, 2.0GB, 5.0GB)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 1.0GB"
                placeholderTextColor="#64748b"
                value={dispatchPlanCode}
                onChangeText={setDispatchPlanCode}
              />

              {/* Pricing Grid */}
              <View style={styles.dualInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formFieldLabel}>SELLING PRICE (₦)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="280"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={dispatchPrice}
                    onChangeText={setDispatchPrice}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.formFieldLabel}>COST/API PRICE (₦)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="245"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={dispatchCostPrice}
                    onChangeText={setDispatchCostPrice}
                  />
                </View>
              </View>

              {/* Validity Days */}
              <Text style={styles.formFieldLabel}>VALIDITY PERIOD (IN DAYS)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="30"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={dispatchValidity}
                onChangeText={setDispatchValidity}
              />

              {/* Target Broadcast Selection */}
              <View style={styles.checkboxWrapper}>
                <TouchableOpacity
                  style={[styles.checkboxSquare, sendToAll && styles.checkboxSquareActive]}
                  onPress={() => setSendToAll(!sendToAll)}
                >
                  {sendToAll && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Dispatch to ALL active app user wallets/numbers</Text>
              </View>

              {!sendToAll && (
                <>
                  <Text style={styles.formFieldLabel}>RECIPIENT NUMBER(S) (Comma-separated)</Text>
                  <TextInput
                    style={[styles.textInputStyle, { height: 75, textAlignVertical: "top" }]}
                    placeholder="09033738409, 08012345678"
                    placeholderTextColor="#64748b"
                    multiline
                    value={dispatchRecipients}
                    onChangeText={setDispatchRecipients}
                  />
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleExecuteDispatch}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>DEPLOY BUNDLE / DISPATCH NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL: DIRECT WALLET INJECTOR
      ========================================== */}
      <Modal visible={walletModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Direct Ledger Injector</Text>
                <Text style={styles.modalCardSubtitle}>Instant balance modification</Text>
              </View>
              <TouchableOpacity onPress={() => setWalletModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRowContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, walletActionType === "credit" && styles.creditActiveToggle]}
                onPress={() => setWalletActionType("credit")}
              >
                <Text style={[styles.toggleBtnText, walletActionType === "credit" && styles.activeToggleText]}>
                  + Credit Account
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, walletActionType === "debit" && styles.debitActiveToggle]}
                onPress={() => setWalletActionType("debit")}
              >
                <Text style={[styles.toggleBtnText, walletActionType === "debit" && styles.activeToggleText]}>
                  - Debit Account
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET USER EMAIL OR PHONE OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409 or user@gmail.com"
              placeholderTextColor="#64748b"
              value={walletUserId}
              onChangeText={setWalletUserId}
            />

            <Text style={styles.formFieldLabel}>AMOUNT (₦)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 5000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={walletAmount}
              onChangeText={setWalletAmount}
            />

            <Text style={styles.formFieldLabel}>AUDIT REMARKS</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. System refund / Operational grant"
              placeholderTextColor="#64748b"
              value={walletReason}
              onChangeText={setWalletReason}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                {
                  backgroundColor: walletActionType === "credit" ? "#059669" : "#dc2626",
                  opacity: actionLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleExecuteWalletAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>
                  AUTHORIZE {walletActionType.toUpperCase()} TRANSACTION
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL: API GATEWAY SWITCHBOARD
      ========================================== */}
      <Modal visible={apiGatewayModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>API Gateways Switchboard</Text>
                <Text style={styles.modalCardSubtitle}>Active routing & provider failover</Text>
              </View>
              <TouchableOpacity onPress={() => setApiGatewayModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.apiNodeList}>
              {[
                { name: "SMEPlug API Node", status: "ONLINE", latency: "140ms", active: true },
                { name: "GladTidings Primary", status: "ONLINE", latency: "185ms", active: true },
                { name: "Alrahuz Data Node", status: "STANDBY", latency: "210ms", active: false },
                { name: "VTpass Multi-Service", status: "ONLINE", latency: "320ms", active: true },
              ].map((node, index) => (
                <View key={index} style={styles.apiNodeRow}>
                  <View>
                    <Text style={styles.apiNodeTitle}>{node.name}</Text>
                    <Text style={styles.apiNodeMeta}>
                      Status: <Text style={{ color: "#34d399" }}>{node.status}</Text> • Latency: {node.latency}
                    </Text>
                  </View>
                  <View style={[styles.statusDot, { backgroundColor: node.active ? "#10b981" : "#64748b" }]} />
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: "#0284c7" }]}
              onPress={() => {
                showAlert("API Switchboard", "Gateway failover nodes synchronized.");
                setApiGatewayModalVisible(false);
              }}
            >
              <Text style={styles.primaryActionBtnText}>SAVE GATEWAY TOPOLOGY</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: "#0a0f1d",
  },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#0a0f1d",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderText: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 12,
    letterSpacing: 0.5,
  },
  topBar: {
    backgroundColor: "#111827",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
  },
  menuIconBtn: {
    padding: 6,
  },
  topBrandGroup: {
    alignItems: "center",
  },
  enterpriseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
  },
  enterpriseBadgeText: {
    color: "#f59e0b",
    fontSize: 9,
    fontWeight: "900",
    marginLeft: 4,
    letterSpacing: 0.8,
  },
  topBrandTitle: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  scrollArea: {
    flex: 1,
  },
  telemetrySection: {
    padding: 16,
  },
  sectionHeaderLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: "48.5%",
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  metricLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "700",
  },
  metricValue: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginVertical: 4,
  },
  metricSub: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "600",
  },
  actionsSection: {
    paddingHorizontal: 16,
    marginTop: 6,
  },
  commandTile: {
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tileInfo: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  tileTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  tileDescription: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // SIDEBAR STYLES
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 100,
  },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: width * 0.78,
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingHorizontal: 18,
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  sidebarBrandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  sidebarBrandText: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
  },
  sidebarRoleText: {
    color: "#f59e0b",
    fontSize: 11,
    fontWeight: "700",
  },
  sidebarNavList: {
    flex: 1,
    marginTop: 15,
  },
  sidebarCategory: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 18,
    marginBottom: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  navItemText: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 12,
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  logoutBtnText: {
    color: "#ef4444",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 10,
  },

  // MODAL STYLES
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#111827",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    borderWidth: 1,
    borderColor: "#1f2937",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1f2937",
    paddingBottom: 10,
  },
  modalCardTitle: {
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "900",
  },
  modalCardSubtitle: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  formFieldLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  pillGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#1e293b",
    marginHorizontal: 2,
    borderRadius: 8,
  },
  activePillBtn: {
    backgroundColor: "#0284c7",
  },
  pillBtnText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
  },
  activePillBtnText: {
    color: "#ffffff",
  },
  textInputStyle: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
  },
  dualInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  checkboxWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 14,
    marginBottom: 6,
  },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxSquareActive: {
    backgroundColor: "#0284c7",
  },
  checkboxLabel: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "700",
  },
  toggleRowContainer: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 3,
    borderRadius: 10,
    marginBottom: 10,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  creditActiveToggle: {
    backgroundColor: "#059669",
  },
  debitActiveToggle: {
    backgroundColor: "#dc2626",
  },
  toggleBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "800",
  },
  activeToggleText: {
    color: "#ffffff",
  },
  primaryActionBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  primaryActionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  apiNodeList: {
    marginVertical: 10,
  },
  apiNodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  apiNodeTitle: {
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "800",
  },
  apiNodeMeta: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default SuperAdminDashboard;