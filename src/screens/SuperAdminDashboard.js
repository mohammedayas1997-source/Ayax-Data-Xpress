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
  MaterialIcons,
} from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [prices, setPrices] = useState({});
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.8)).current;

  // Master Modals
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Service Price Adjustment State
  const [selectedServiceKey, setSelectedServiceKey] = useState("nimc_nin");
  const [newServicePrice, setNewServicePrice] = useState("");

  // Other Form States
  const [dispatchNetwork, setDispatchNetwork] = useState("MTN");
  const [dispatchPlanType, setDispatchPlanType] = useState("SME");
  const [dispatchPlanCode, setDispatchPlanCode] = useState("1.0GB");
  const [dispatchPrice, setDispatchPrice] = useState("280");
  const [dispatchCostPrice, setDispatchCostPrice] = useState("245");
  const [dispatchValidity, setDispatchValidity] = useState("30");
  const [dispatchRecipients, setDispatchRecipients] = useState("");
  const [sendToAll, setSendToAll] = useState(false);

  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletActionType, setWalletActionType] = useState("credit");

  const [refundUserId, setRefundUserId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundTxId, setRefundTxId] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const [pwdUserId, setPwdUserId] = useState("");
  const [pwdNew, setPwdNew] = useState("");

  const [suspendUserId, setSuspendUserId] = useState("");

  const serviceCategories = [
    { key: "nimc_nin", name: "NIMC: NIN Verification", category: "NIMC Services" },
    { key: "nimc_phone", name: "NIMC: Phone Search", category: "NIMC Services" },
    { key: "nimc_trackingId", name: "NIMC: Tracking ID Lookup", category: "NIMC Services" },
    { key: "nimc_premiumCard", name: "NIMC: Premium Plastic Card", category: "NIMC Services" },
    { key: "nimc_standardSlip", name: "NIMC: Standard Color Slip", category: "NIMC Services" },
    { key: "nimc_basicSlip", name: "NIMC: Basic Black Slip", category: "NIMC Services" },

    { key: "val_noRecord", name: "Validation: No Record Found", category: "NIN Validation" },
    { key: "val_sim", name: "Validation: SIM Validation", category: "NIN Validation" },
    { key: "val_vnin", name: "Validation: vNIN Validation", category: "NIN Validation" },
    { key: "val_update", name: "Validation: Update Records", category: "NIN Validation" },
    { key: "val_bank", name: "Validation: Bank Validation", category: "NIN Validation" },
    { key: "val_mod", name: "Validation: Modification Validation", category: "NIN Validation" },
    { key: "val_photoError", name: "Validation: Photographic Error", category: "NIN Validation" },

    { key: "verify_phone", name: "Identity: Phone Database Lookup", category: "Identity & Verification" },
    { key: "verify_bvn_basic", name: "Identity: BVN Basic Profile", category: "Identity & Verification" },
    { key: "verify_bvn_full", name: "Identity: Full BVN Demographic", category: "Identity & Verification" },
    { key: "verify_face_id", name: "Identity: Face ID Biometric Match", category: "Identity & Verification" },

    { key: "fee_electricity", name: "Surcharge: Electricity Bill Fee", category: "Utilities Surcharges" },
    { key: "fee_cable", name: "Surcharge: Cable TV Subscription Fee", category: "Utilities Surcharges" },
  ];

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
        toValue: -width * 0.8,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setSidebarOpen(false));
    }
  };

  const fetchMasterTelemetry = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const res = await axios.get(`${BASE_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(res.data?.stats || {});
      setPrices(res.data?.prices || {});
      setRecentTx(res.data?.recentTransactions || []);
    } catch (err) {
      console.log("Telemetry Warning:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMasterTelemetry();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMasterTelemetry();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 1. Update Specific Service Price
  const handleUpdateServicePrice = async () => {
    if (!newServicePrice || isNaN(Number(newServicePrice))) {
      return showAlert("Validation Error", "Please provide a valid numeric tariff amount.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/update-service-price`,
        { serviceKey: selectedServiceKey, newPrice: Number(newServicePrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Tariff Updated", res.data.message);
        setPrices(res.data?.updatedPrices || {});
        setNewServicePrice("");
        setPricingModalVisible(false);
      }
    } catch (err) {
      showAlert("Tariff Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Dispatch Data
  const handleExecuteDispatch = async () => {
    if (!dispatchPlanCode || !dispatchPrice || !dispatchValidity) {
      return showAlert("Validation Error", "Plan Size, Price, and Validity Days are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/dispatch-data`,
        {
          network: dispatchNetwork,
          planType: dispatchPlanType,
          planCode: dispatchPlanCode.trim(),
          price: Number(dispatchPrice),
          costPrice: Number(dispatchCostPrice || dispatchPrice),
          validityDays: Number(dispatchValidity),
          recipients: dispatchRecipients.trim(),
          sendToAllUsers: sendToAll,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Success", res.data.message);
        setDispatchModalVisible(false);
        setDispatchRecipients("");
        setSendToAll(false);
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Dispatch Fault", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. SuperAdmin Exclusive Refund
  const handleExecuteRefund = async () => {
    if (!refundUserId.trim() || !refundAmount) {
      return showAlert("Validation Error", "Recipient phone/email and refund amount are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/process-refund`,
        {
          targetUserId: refundUserId.trim(),
          refundAmount: Number(refundAmount),
          transactionId: refundTxId.trim(),
          reason: refundReason.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Refund Completed", res.data.message);
        setRefundModalVisible(false);
        setRefundUserId("");
        setRefundAmount("");
        setRefundTxId("");
        setRefundReason("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Refund Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Direct Wallet Adjustment
  const handleExecuteWalletAction = async () => {
    if (!walletUserId.trim() || !walletAmount) {
      return showAlert("Validation Error", "Target User Identifier and numeric amount are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/adjust-wallet`,
        {
          userId: walletUserId.trim(),
          amount: Number(walletAmount),
          reason: walletReason.trim(),
          actionType: walletActionType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Ledger Updated", res.data.message);
        setWalletModalVisible(false);
        setWalletUserId("");
        setWalletAmount("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Adjustment Failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Force Password Override
  const handleExecutePasswordOverride = async () => {
    if (!pwdUserId.trim() || !pwdNew || pwdNew.length < 6) {
      return showAlert("Validation Error", "Target user identifier and a 6+ character password are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/override-password`,
        { userId: pwdUserId.trim(), newPassword: pwdNew.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Password Overridden", res.data.message);
        setPasswordModalVisible(false);
        setPwdUserId("");
        setPwdNew("");
      }
    } catch (err) {
      showAlert("Override Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Suspend / Activate Account
  const handleExecuteSuspension = async (suspend) => {
    if (!suspendUserId.trim()) {
      return showAlert("Validation Error", "Target identifier is required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/toggle-suspension`,
        { userId: suspendUserId.trim(), suspend },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Account Status Changed", res.data.message);
        setSuspendModalVisible(false);
        setSuspendUserId("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Operation Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loaderText}>Establishing Supreme Master Protocol...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#070c18" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)}>
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.enterpriseBadge}>
            <MaterialCommunityIcons name="shield-crown" size={14} color="#f59e0b" />
            <Text style={styles.enterpriseBadgeText}>SUPERADMIN SUPREME</Text>
          </View>
          <Text style={styles.topBrandTitle}>AYAX CENTRAL CONSOLE</Text>
        </View>

        <TouchableOpacity style={styles.avatarBtn} onPress={() => setPricingModalVisible(true)}>
          <MaterialIcons name="tune" size={22} color="#38bdf8" />
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
        {/* FINANCIAL TELEMETRY CARDS */}
        <View style={styles.telemetrySection}>
          <Text style={styles.sectionHeaderLabel}>REAL-TIME FINANCIAL INFLOW & OUTFLOW</Text>

          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, { borderColor: "#059669" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Inflow (Deposits)</Text>
                <Ionicons name="arrow-down-circle" size={18} color="#34d399" />
              </View>
              <Text style={[styles.metricValue, { color: "#34d399" }]}>
                ₦{Number(stats?.totalInflow || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>{stats?.totalWalletFundingCount || 0} Inflow Events</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#dc2626" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Outflow (Sales)</Text>
                <Ionicons name="arrow-up-circle" size={18} color="#f87171" />
              </View>
              <Text style={[styles.metricValue, { color: "#f87171" }]}>
                ₦{Number(stats?.totalOutflow || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>{stats?.successfulSalesCount || 0} Successful Dispatches</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#0284c7" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Net Growth Volume</Text>
                <Ionicons name="wallet" size={18} color="#38bdf8" />
              </View>
              <Text style={styles.metricValue}>
                ₦{Number(stats?.netRevenue || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>99.98% Gateway Health</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#7c3aed" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Platform Entities</Text>
                <Ionicons name="people" size={18} color="#c084fc" />
              </View>
              <Text style={styles.metricValue}>
                {(stats?.totalUsers || 0) + (stats?.totalAgents || 0) + (stats?.totalSupervisors || 0)}
              </Text>
              <Text style={styles.metricSub}>
                {stats?.totalSupervisors || 0} Supervisors • {stats?.totalAgents || 0} Agents
              </Text>
            </View>
          </View>
        </View>

        {/* LIVE INFLOW FEED */}
        <View style={styles.feedSection}>
          <Text style={styles.sectionHeaderLabel}>LIVE TRANSACTION & FUNDING STREAM</Text>
          {recentTx.length > 0 ? (
            recentTx.map((tx) => (
              <View key={tx._id} style={styles.feedCard}>
                <View style={styles.feedLeft}>
                  <View
                    style={[
                      styles.feedIconCircle,
                      {
                        backgroundColor:
                          tx.type === "wallet_funding" || tx.type === "deposit"
                            ? "rgba(16, 185, 129, 0.15)"
                            : "rgba(56, 189, 248, 0.15)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        tx.type === "wallet_funding" || tx.type === "deposit"
                          ? "card"
                          : "flash"
                      }
                      size={18}
                      color={
                        tx.type === "wallet_funding" || tx.type === "deposit"
                          ? "#34d399"
                          : "#38bdf8"
                      }
                    />
                  </View>
                  <View style={{ marginLeft: 10 }}>
                    <Text style={styles.feedTitle}>
                      {tx.type === "wallet_funding" || tx.type === "deposit"
                        ? "User Wallet Funding"
                        : tx.service || "Service Order"}
                    </Text>
                    <Text style={styles.feedSubtitle}>
                      {tx.user?.phone || tx.phone || tx.reference || "Verified Node"}
                    </Text>
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text
                    style={[
                      styles.feedAmount,
                      {
                        color:
                          tx.type === "wallet_funding" || tx.type === "deposit"
                            ? "#34d399"
                            : "#f8fafc",
                      },
                    ]}
                  >
                    {tx.type === "wallet_funding" || tx.type === "deposit" ? "+" : "-"}₦
                    {Number(tx.amount || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.feedStatus}>{tx.status?.toUpperCase() || "SUCCESSFUL"}</Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyFeed}>
              <Text style={{ color: "#64748b", fontSize: 12 }}>No transactions recorded recently.</Text>
            </View>
          )}
        </View>

        {/* SUPREME COMMAND CORES & OVERRIDES */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionHeaderLabel}>SERVICE CONFIGURATIONS & MASTER OVERRIDES</Text>

          {/* 1. Global Service Price Configurator */}
          <TouchableOpacity
            style={[styles.commandTile, { borderColor: "#38bdf8" }]}
            activeOpacity={0.8}
            onPress={() => setPricingModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0284c7" }]}>
              <MaterialIcons name="tune" size={24} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={[styles.tileTitle, { color: "#38bdf8" }]}>
                Global Services Tariff Switch (All Rates)
              </Text>
              <Text style={styles.tileDescription}>
                Individually configure fees for NIMC printing, NIN validation, BVN search, and surcharges.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 2. Data Dispatcher */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setDispatchModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0369a1" }]}>
              <Ionicons name="paper-plane" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Data Dispatcher & Wholesale Margin</Text>
              <Text style={styles.tileDescription}>
                Provision network bundles, retail margins, validity days, and target recipients.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 3. SuperAdmin Refund Exclusive */}
          <TouchableOpacity
            style={[styles.commandTile, { borderColor: "#ef4444" }]}
            activeOpacity={0.8}
            onPress={() => setRefundModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#dc2626" }]}>
              <Ionicons name="refresh-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={[styles.tileTitle, { color: "#f87171" }]}>Disburse Direct Refund (SuperAdmin Only)</Text>
              <Text style={styles.tileDescription}>
                Directly refund failed operations into any user, agent, or staff wallet.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 4. Direct Wallet Adjustment */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setWalletModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#047857" }]}>
              <Ionicons name="wallet" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Direct Ledger Injector (Credit / Debit)</Text>
              <Text style={styles.tileDescription}>
                Inject or deduct balances from customer or staff accounts with audit remarks.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 5. Force Password Reset Override */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#4f46e5" }]}>
              <MaterialIcons name="lock-reset" size={24} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>User & Staff Password Override</Text>
              <Text style={styles.tileDescription}>
                Forcefully change the password of any account on the platform without OTPs.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 6. Account Suspension & Reactivation */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setSuspendModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#b91c1c" }]}>
              <MaterialIcons name="block" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Suspend / Activate Staff & Users</Text>
              <Text style={styles.tileDescription}>
                Instantly freeze or reactivate access for any Agent, Supervisor, Admin, or User.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 7. Supervisors Hub */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("LeaderDashboard")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
              <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Supervisors & Network Hierarchy</Text>
              <Text style={styles.tileDescription}>
                Manage team quotas, assigned agents, and performance benchmarks.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 8. Field Agent Management */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("ManageAgents")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#d97706" }]}>
              <MaterialCommunityIcons name="account-group" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Agent Reassignment & Mapping</Text>
              <Text style={styles.tileDescription}>
                Shift agents between supervisors and inspect field throughput.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 9. Service Tracker & Investigation */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("ServiceTracker")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0e7490" }]}>
              <Ionicons name="search" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Transaction & Utility Investigation</Text>
              <Text style={styles.tileDescription}>
                Trace NIN, BVN, Airtime, Electricity, and Cable TV operations.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 10. NIMC Verification Operations */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("NimcRequests")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#4338ca" }]}>
              <Ionicons name="id-card" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>NIMC Modification & Verification Queue</Text>
              <Text style={styles.tileDescription}>
                Review, process, approve, or reject identity modification documents.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ==========================================
          GLOBAL SIDEBAR OVERLAY
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
                  <Text style={styles.sidebarRoleText}>SuperAdmin Master</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>CORE NAVIGATION</Text>

              <TouchableOpacity style={styles.navItem} onPress={() => toggleSidebar(false)}>
                <Feather name="grid" size={18} color="#38bdf8" />
                <Text style={[styles.navItemText, { color: "#38bdf8" }]}>Master Overview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setPricingModalVisible(true);
                }}
              >
                <MaterialIcons name="tune" size={18} color="#38bdf8" />
                <Text style={[styles.navItemText, { color: "#38bdf8" }]}>Set Service Prices</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("LeaderDashboard");
                }}
              >
                <FontAwesome5 name="user-tie" size={16} color="#94a3b8" />
                <Text style={styles.navItemText}>Supervisor Network</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("CreateSupervisor");
                }}
              >
                <FontAwesome5 name="user-plus" size={16} color="#94a3b8" />
                <Text style={styles.navItemText}>Register Supervisor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("ManageAgents");
                }}
              >
                <MaterialCommunityIcons name="account-group" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Manage Field Agents</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FINANCIAL INFRASTRUCTURE</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setDispatchModalVisible(true);
                }}
              >
                <Feather name="send" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Dispatch Data Bundles</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setRefundModalVisible(true);
                }}
              >
                <Ionicons name="refresh-circle-outline" size={20} color="#f87171" />
                <Text style={[styles.navItemText, { color: "#f87171" }]}>Disburse Refund (Exclusive)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setWalletModalVisible(true);
                }}
              >
                <Ionicons name="wallet-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Direct Ledger Injector</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>SECURITY & ACCESS CONTROL</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setPasswordModalVisible(true);
                }}
              >
                <MaterialIcons name="lock-reset" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Override User Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setSuspendModalVisible(true);
                }}
              >
                <MaterialIcons name="block" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Suspend / Activate Account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("ServiceTracker");
                }}
              >
                <Feather name="search" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Service Investigation</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* ==========================================
          MODAL 0: GLOBAL SERVICE PRICING SWITCH
      ========================================== */}
      <Modal visible={pricingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Global Service Pricing Tariff</Text>
                <Text style={styles.modalCardSubtitle}>Select service node to adjust fee structure</Text>
              </View>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
              <Text style={styles.formFieldLabel}>SELECT SERVICE OPERATION</Text>
              {serviceCategories.map((svc) => (
                <TouchableOpacity
                  key={svc.key}
                  style={[
                    styles.serviceSelectBtn,
                    selectedServiceKey === svc.key && styles.activeServiceSelectBtn,
                  ]}
                  onPress={() => setSelectedServiceKey(svc.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.serviceSelectTitle,
                        selectedServiceKey === svc.key && { color: "#ffffff" },
                      ]}
                    >
                      {svc.name}
                    </Text>
                    <Text style={styles.serviceSelectCategory}>{svc.category}</Text>
                  </View>
                  <Text
                    style={[
                      styles.serviceSelectPrice,
                      selectedServiceKey === svc.key && { color: "#34d399" },
                    ]}
                  >
                    ₦{Number(prices[svc.key] || 0).toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.formFieldLabel, { marginTop: 15 }]}>
              NEW TARIFF PRICE FOR {selectedServiceKey.toUpperCase()} (₦)
            </Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder={`Current: ₦${prices[selectedServiceKey] || 0}`}
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={newServicePrice}
              onChangeText={setNewServicePrice}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleUpdateServicePrice}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>SAVE & DEPLOY SERVICE TARIFF</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL 1: DATA DISPATCHER
      ========================================== */}
      <Modal visible={dispatchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Dispatch Data Bundle</Text>
                <Text style={styles.modalCardSubtitle}>Set network, pricing margins, and validity</Text>
              </View>
              <TouchableOpacity onPress={() => setDispatchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
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

              <Text style={styles.formFieldLabel}>DATA SIZE (e.g. 500MB, 1.0GB, 2.5GB, 5.0GB)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 1.0GB"
                placeholderTextColor="#64748b"
                value={dispatchPlanCode}
                onChangeText={setDispatchPlanCode}
              />

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

              <Text style={styles.formFieldLabel}>VALIDITY PERIOD (DAYS)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="30"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={dispatchValidity}
                onChangeText={setDispatchValidity}
              />

              <View style={styles.checkboxWrapper}>
                <TouchableOpacity
                  style={[styles.checkboxSquare, sendToAll && styles.checkboxSquareActive]}
                  onPress={() => setSendToAll(!sendToAll)}
                >
                  {sendToAll && <Ionicons name="checkmark" size={16} color="#ffffff" />}
                </TouchableOpacity>
                <Text style={styles.checkboxLabel}>Dispatch to ALL active platform users</Text>
              </View>

              {!sendToAll && (
                <>
                  <Text style={styles.formFieldLabel}>RECIPIENT NUMBERS (Comma-separated)</Text>
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
                <Text style={styles.primaryActionBtnText}>PROVISION & DISPATCH NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL 2: PROCESS REFUND (SUPERADMIN ONLY)
      ========================================== */}
      <Modal visible={refundModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#ef4444" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalCardTitle, { color: "#f87171" }]}>Authorize Wallet Refund</Text>
                <Text style={styles.modalCardSubtitle}>SuperAdmin exclusive fund replenishment</Text>
              </View>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>RECIPIENT PHONE OR EMAIL</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409 or user@gmail.com"
              placeholderTextColor="#64748b"
              value={refundUserId}
              onChangeText={setRefundUserId}
            />

            <Text style={styles.formFieldLabel}>REFUND AMOUNT (₦)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 1500"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={refundAmount}
              onChangeText={setRefundAmount}
            />

            <Text style={styles.formFieldLabel}>TRANSACTION REFERENCE (OPTIONAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. TX_938472918"
              placeholderTextColor="#64748b"
              value={refundTxId}
              onChangeText={setRefundTxId}
            />

            <Text style={styles.formFieldLabel}>REFUND REASON</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Network delivery failure"
              placeholderTextColor="#64748b"
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: "#dc2626", opacity: actionLoading ? 0.7 : 1 },
              ]}
              onPress={handleExecuteRefund}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>CONFIRM & DISBURSE REFUND</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL 3: DIRECT WALLET ADJUSTMENT
      ========================================== */}
      <Modal visible={walletModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Direct Ledger Adjustment</Text>
                <Text style={styles.modalCardSubtitle}>Instant balance injection or deduction</Text>
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

            <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409"
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
              placeholder="e.g. Operational grant / Manual settlement"
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
                  AUTHORIZE {walletActionType.toUpperCase()}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL 4: PASSWORD OVERRIDE
      ========================================== */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Override User Password</Text>
                <Text style={styles.modalCardSubtitle}>Direct administrative credential modification</Text>
              </View>
              <TouchableOpacity onPress={() => setPasswordModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter User Phone or Email"
              placeholderTextColor="#64748b"
              value={pwdUserId}
              onChangeText={setPwdUserId}
            />

            <Text style={styles.formFieldLabel}>NEW STRONG PASSWORD (MIN 6 CHARS)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter New Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={pwdNew}
              onChangeText={setPwdNew}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: "#4f46e5", opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleExecutePasswordOverride}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>SET NEW CREDENTIALS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          MODAL 5: SUSPEND / ACTIVATE ACCOUNT
      ========================================== */}
      <Modal visible={suspendModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Account Access Control</Text>
                <Text style={styles.modalCardSubtitle}>Suspend or reactivate staff and user accounts</Text>
              </View>
              <TouchableOpacity onPress={() => setSuspendModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter Phone Number or Email"
              placeholderTextColor="#64748b"
              value={suspendUserId}
              onChangeText={setSuspendUserId}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1, marginRight: 6, backgroundColor: "#dc2626" }]}
                onPress={() => handleExecuteSuspension(true)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>SUSPEND ACCOUNT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1, marginLeft: 6, backgroundColor: "#059669" }]}
                onPress={() => handleExecuteSuspension(false)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>ACTIVATE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#070c18" },
  loaderContainer: { flex: 1, backgroundColor: "#070c18", justifyContent: "center", alignItems: "center" },
  loaderText: { color: "#94a3b8", fontSize: 13, fontWeight: "700", marginTop: 12 },
  topBar: {
    backgroundColor: "#0d1424",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#172033",
  },
  menuIconBtn: { padding: 6 },
  topBrandGroup: { alignItems: "center" },
  enterpriseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#172033",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
  },
  enterpriseBadgeText: { color: "#f59e0b", fontSize: 9, fontWeight: "900", marginLeft: 4 },
  topBrandTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "900" },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#172033",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  scrollArea: { flex: 1 },
  telemetrySection: { padding: 16 },
  sectionHeaderLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 12,
  },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: "48.5%",
    backgroundColor: "#0d1424",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  metricValue: { color: "#f8fafc", fontSize: 17, fontWeight: "900", marginVertical: 4 },
  metricSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  feedSection: { paddingHorizontal: 16, marginBottom: 15 },
  feedCard: {
    backgroundColor: "#0d1424",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#172033",
  },
  feedLeft: { flexDirection: "row", alignItems: "center" },
  feedIconCircle: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center" },
  feedTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "700" },
  feedSubtitle: { color: "#64748b", fontSize: 10, marginTop: 2 },
  feedAmount: { fontSize: 14, fontWeight: "900" },
  feedStatus: { color: "#34d399", fontSize: 9, fontWeight: "800", marginTop: 2 },
  emptyFeed: { backgroundColor: "#0d1424", padding: 20, borderRadius: 12, alignItems: "center" },
  actionsSection: { paddingHorizontal: 16, marginTop: 6 },
  commandTile: {
    backgroundColor: "#0d1424",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#172033",
  },
  tileIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  tileInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  tileTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tileDescription: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },
  sidebarBackdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 100 },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: "#0a0f1d",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingHorizontal: 18,
    borderRightWidth: 1,
    borderRightColor: "#172033",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#172033",
  },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 15 },
  sidebarCategory: { color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  navItemText: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginLeft: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderTopWidth: 1, borderTopColor: "#172033" },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: "#0d1424", borderRadius: 20, padding: 20, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "#172033" },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#172033", paddingBottom: 10 },
  modalCardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  pillGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pillBtn: { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: "#172033", marginHorizontal: 2, borderRadius: 8 },
  activePillBtn: { backgroundColor: "#0284c7" },
  pillBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activePillBtnText: { color: "#ffffff" },
  textInputStyle: { backgroundColor: "#172033", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 12, height: 44, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
  dualInputRow: { flexDirection: "row", justifyContent: "space-between" },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 },
  checkboxSquare: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#0284c7", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxSquareActive: { backgroundColor: "#0284c7" },
  checkboxLabel: { color: "#f8fafc", fontSize: 11, fontWeight: "700" },
  toggleRowContainer: { flexDirection: "row", backgroundColor: "#172033", padding: 3, borderRadius: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  creditActiveToggle: { backgroundColor: "#059669" },
  debitActiveToggle: { backgroundColor: "#dc2626" },
  toggleBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" },
  activeToggleText: { color: "#ffffff" },
  primaryActionBtn: { backgroundColor: "#0284c7", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
  serviceSelectBtn: {
    backgroundColor: "#172033",
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  activeServiceSelectBtn: {
    backgroundColor: "#0369a1",
    borderColor: "#38bdf8",
  },
  serviceSelectTitle: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "700",
  },
  serviceSelectCategory: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
  },
  serviceSelectPrice: {
    color: "#38bdf8",
    fontSize: 13,
    fontWeight: "900",
  },
});

export default SuperAdminDashboard;