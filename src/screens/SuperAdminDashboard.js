import React, { useEffect, useState, useRef, useCallback } from "react";
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

const ALL_SYSTEM_SERVICES = [
  // NIMC Printing Services
  { key: "nimc_basicSlip", name: "NIMC Basic Black Slip", category: "NIMC Printing", icon: "print", defaultFee: 300 },
  { key: "nimc_standardSlip", name: "NIMC Standard Color Slip", category: "NIMC Printing", icon: "file-alt", defaultFee: 500 },
  { key: "nimc_premiumCard", name: "NIMC Premium Plastic Card", category: "NIMC Printing", icon: "id-card", defaultFee: 1500 },
  { key: "nimc_nin", name: "NIN Verification Lookup", category: "NIMC Printing", icon: "fingerprint", defaultFee: 1000 },
  { key: "nimc_phone", name: "NIMC Phone Number Search", category: "NIMC Printing", icon: "phone-alt", defaultFee: 1000 },
  { key: "nimc_trackingId", name: "Tracking ID Verification", category: "NIMC Printing", icon: "barcode", defaultFee: 1000 },

  // NIMC Modification Services
  { key: "mod_name", name: "Modification: Name Correction", category: "NIMC Modification", icon: "user-edit", defaultFee: 2500 },
  { key: "mod_phone", name: "Modification: Phone Number Change", category: "NIMC Modification", icon: "mobile-alt", defaultFee: 2000 },
  { key: "mod_dob", name: "Modification: Date of Birth (DOB)", category: "NIMC Modification", icon: "calendar-alt", defaultFee: 3000 },
  { key: "mod_address", name: "Modification: Address Details", category: "NIMC Modification", icon: "map-marker-alt", defaultFee: 1500 },
  { key: "mod_name_dob", name: "Modification: Name & DOB Combo", category: "NIMC Modification", icon: "id-badge", defaultFee: 4500 },
  { key: "mod_name_phone", name: "Modification: Name & Phone Combo", category: "NIMC Modification", icon: "user-plus", defaultFee: 3500 },

  // NIN Validation Services
  { key: "val_noRecord", name: "Validation: No Record Found", category: "NIN Validation", icon: "search-minus", defaultFee: 1300 },
  { key: "val_sim", name: "Validation: SIM Card Validation", category: "NIN Validation", icon: "sim-card", defaultFee: 1300 },
  { key: "val_vnin", name: "Validation: vNIN Virtual Validation", category: "NIN Validation", icon: "shield-alt", defaultFee: 1300 },
  { key: "val_update", name: "Validation: Update Records", category: "NIN Validation", icon: "sync-alt", defaultFee: 1300 },
  { key: "val_bank", name: "Validation: Bank Records Linkage", category: "NIN Validation", icon: "university", defaultFee: 1300 },
  { key: "val_mod", name: "Validation: Modification Validation", category: "NIN Validation", icon: "edit", defaultFee: 1700 },
  { key: "val_photoError", name: "Validation: Photographic Error", category: "NIN Validation", icon: "camera", defaultFee: 1400 },

  // Identity & BVN Services
  { key: "verify_phone", name: "Phone Identification Check", category: "Identity & BVN", icon: "phone-square-alt", defaultFee: 300 },
  { key: "verify_bvn_basic", name: "BVN Basic Profile Lookup", category: "Identity & BVN", icon: "user-check", defaultFee: 200 },
  { key: "verify_bvn_full", name: "Comprehensive BVN Demographics", category: "Identity & BVN", icon: "user-tie", defaultFee: 500 },
  { key: "verify_face_id", name: "Biometric Face ID Matching", category: "Identity & BVN", icon: "smile-beam", defaultFee: 800 },

  // Utility Surcharges
  { key: "fee_electricity", name: "Electricity Token Surcharge", category: "Utilities Surcharge", icon: "bolt", defaultFee: 100 },
  { key: "fee_gotv", name: "GOtv Surcharge Fee", category: "Utilities Surcharge", icon: "tv", defaultFee: 50 },
  { key: "fee_dstv", name: "DStv Surcharge Fee", category: "Utilities Surcharge", icon: "tv", defaultFee: 100 },
  { key: "fee_startimes", name: "StarTimes Surcharge Fee", category: "Utilities Surcharge", icon: "tv", defaultFee: 50 },
  { key: "fee_showmax", name: "Showmax Surcharge Fee", category: "Utilities Surcharge", icon: "tv", defaultFee: 50 },
];

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [prices, setPrices] = useState({});
  const [recentTx, setRecentTx] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [selectedTariffCategory, setSelectedTariffCategory] = useState("All");
  const [tariffSearch, setTariffSearch] = useState("");

  // Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.85)).current;

  // Master Modals
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [suspendModalVisible, setSuspendModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [targetTariffService, setTargetTariffService] = useState(null);
  const [newTariffPrice, setNewTariffPrice] = useState("");

  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifTargetType, setNotifTargetType] = useState("all");
  const [notifTargetUser, setNotifTargetUser] = useState("");

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
      Animated.spring(sidebarAnim, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -width * 0.85,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setSidebarOpen(false));
    }
  };

  const fetchMasterTelemetry = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground) {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      const res = await axios.get(`${BASE_URL}/superadmin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 12000,
      });

      if (res.data && (res.data.success || res.data.stats)) {
        setStats(res.data.stats || {});
        setPrices(res.data.prices || {});
        setRecentTx(res.data.recentTransactions || []);
      }
    } catch (err) {
      if (!isBackground) {
        console.log("Telemetry Error:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchMasterTelemetry();
    const interval = setInterval(() => {
      fetchMasterTelemetry(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchMasterTelemetry]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchMasterTelemetry();
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to log out of the SuperAdmin Console?");
      if (confirmLogout) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else {
      Alert.alert(
        "Log Out Session",
        "Are you sure you want to log out of the SuperAdmin Console?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Log Out",
            style: "destructive",
            onPress: async () => {
              await AsyncStorage.clear();
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            },
          },
        ]
      );
    }
  };

  // 1. Update Tariff
  const handleUpdateTariff = async () => {
    if (!targetTariffService || !newTariffPrice || isNaN(Number(newTariffPrice))) {
      return showAlert("Validation Error", "Enter a valid numeric price.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/update-service-price`,
        { serviceKey: targetTariffService.key, newPrice: Number(newTariffPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Tariff Deployed", res.data.message);
        setPrices(res.data.updatedPrices || { ...prices, [targetTariffService.key]: Number(newTariffPrice) });
        setNewTariffPrice("");
        setPricingModalVisible(false);
      }
    } catch (err) {
      showAlert("Tariff Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Broadcast Notification
  const handleSendBroadcastNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      return showAlert("Validation Error", "Title and Message are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/broadcast-notification`,
        {
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          targetType: notifTargetType,
          targetUserId: notifTargetUser.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Broadcast Sent 🎉", res.data.message);
        setNotificationModalVisible(false);
        setNotifTitle("");
        setNotifMessage("");
        setNotifTargetUser("");
      }
    } catch (err) {
      showAlert("Notification Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Dispatch Data
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
        showAlert("Batch Dispatched 🎉", res.data.message);
        setDispatchModalVisible(false);
        setDispatchRecipients("");
        setSendToAll(false);
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Dispatch Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Refund
  const handleExecuteRefund = async () => {
    if (!refundUserId.trim() || !refundAmount) {
      return showAlert("Validation Error", "Recipient identifier and amount are required.");
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
        showAlert("Refund Executed", res.data.message);
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

  // 5. Wallet Credit / Debit
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
      showAlert("Ledger Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Password Override
  const handleExecutePasswordOverride = async () => {
    if (!pwdUserId.trim() || !pwdNew || pwdNew.length < 6) {
      return showAlert("Validation Error", "Target identifier and a 6+ character password are required.");
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

  // 7. Suspension
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
        showAlert("Status Changed", res.data.message);
        setSuspendModalVisible(false);
        setSuspendUserId("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Suspension Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredServices = ALL_SYSTEM_SERVICES.filter((svc) => {
    const matchesCategory =
      selectedTariffCategory === "All" || svc.category === selectedTariffCategory;
    const matchesSearch =
      svc.name.toLowerCase().includes(tariffSearch.toLowerCase()) ||
      svc.key.toLowerCase().includes(tariffSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={styles.loaderTitle}>AYAX SUPREME ROOT ENGINE</Text>
        <Text style={styles.loaderText}>Establishing Real-Time Protocol Nodes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* TOP SUPREME APP BAR WITH LOGOUT ACTION */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.enterpriseBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.enterpriseBadgeText}>ROOT MASTER ACTIVE</Text>
          </View>
          <Text style={styles.topBrandTitle}>AYAX SUPREME CONSOLE</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setNotificationModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications" size={17} color="#00f0ff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setActiveMainTab("tariffs")}
            activeOpacity={0.7}
          >
            <MaterialIcons name="tune" size={17} color="#00f0ff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, styles.logoutIconBtn]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN NAVIGATION TAB SWITCHER */}
      <View style={styles.mainNavBar}>
        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "overview" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("overview")}
        >
          <Feather name="grid" size={14} color={activeMainTab === "overview" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "overview" && styles.mainNavTabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "tariffs" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("tariffs")}
        >
          <MaterialIcons name="tune" size={15} color={activeMainTab === "tariffs" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "tariffs" && styles.mainNavTabTextActive]}>
            Set Tariffs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "history" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("history")}
        >
          <Feather name="activity" size={14} color={activeMainTab === "history" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "history" && styles.mainNavTabTextActive]}>
            Audit History
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE BODY */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#00f0ff" />
        }
      >
        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeMainTab === "overview" && (
          <View style={styles.tabWrapper}>
            {/* KPI Telemetry */}
            <View style={styles.telemetrySection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME FINANCIAL TELEMETRY</Text>
                <View style={styles.liveBadge}>
                  <View style={[styles.livePulseDot, { backgroundColor: "#10b981" }]} />
                  <Text style={styles.liveBadgeText}>LIVE STREAM</Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Total Inflow (Deposits)</Text>
                    <Ionicons name="arrow-down-circle" size={18} color="#10b981" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#10b981" }]}>
                    ₦{Number(stats?.totalInflow || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>{stats?.totalWalletFundingCount || 0} Inflow Events</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Total Outflow (Sales)</Text>
                    <Ionicons name="arrow-up-circle" size={18} color="#f87171" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#f87171" }]}>
                    ₦{Number(stats?.totalOutflow || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>{stats?.successfulSalesCount || 0} Dispatches</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(0, 240, 255, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Net Capital Ledger</Text>
                    <Ionicons name="wallet" size={18} color="#00f0ff" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#00f0ff" }]}>
                    ₦{Number(stats?.netRevenue || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>99.99% Operational</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Platform Entities</Text>
                    <Ionicons name="people" size={18} color="#c084fc" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                    {(stats?.totalUsers || 0) + (stats?.totalAgents || 0) + (stats?.totalSupervisors || 0)}
                  </Text>
                  <Text style={styles.metricSub}>
                    {stats?.totalSupervisors || 0} Supervisors • {stats?.totalAgents || 0} Agents
                  </Text>
                </View>
              </View>
            </View>

            {/* Supreme Command Tiles */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionHeaderLabel}>HIGH-AUTHORITY COMMAND MODULES</Text>

              <TouchableOpacity
                style={[styles.commandTile, { borderColor: "rgba(0, 240, 255, 0.4)" }]}
                activeOpacity={0.8}
                onPress={() => setNotificationModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#0284c7" }]}>
                  <Ionicons name="megaphone" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitle, { color: "#00f0ff" }]}>
                    Broadcast Push Notification & News
                  </Text>
                  <Text style={styles.tileDescription}>
                    Send alerts, updates, or maintenance notices to all users or target individuals.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setActiveMainTab("tariffs")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#4338ca" }]}>
                  <MaterialIcons name="tune" size={24} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Set Service Tariffs (All Prices)</Text>
                  <Text style={styles.tileDescription}>
                    Individually set pricing for NIMC printing, modifications, validation & BVN.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setDispatchModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#0369a1" }]}>
                  <Ionicons name="paper-plane" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Enterprise Data Dispatcher & Margins</Text>
                  <Text style={styles.tileDescription}>
                    Deploy custom bundles, adjust wholesale prices, validity, and push broadcasts.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.commandTile, { borderColor: "rgba(239, 68, 68, 0.4)" }]}
                activeOpacity={0.8}
                onPress={() => setRefundModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#dc2626" }]}>
                  <Ionicons name="refresh-circle" size={24} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitle, { color: "#f87171" }]}>
                    Disburse Direct Refund (SuperAdmin Only)
                  </Text>
                  <Text style={styles.tileDescription}>
                    Directly disburse automated wallet refunds for failed transactions.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setWalletModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#059669" }]}>
                  <Ionicons name="wallet" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Direct Ledger Injector (Credit / Debit)</Text>
                  <Text style={styles.tileDescription}>
                    Instantly adjust customer or staff wallet balances with immutable audit notes.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

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
                    Forcefully reset passwords for any user, supervisor, or agent without OTP delays.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

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
                    Freeze compromised accounts or restore service access immediately.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate("LeaderDashboard")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
                  <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Supervisors Network & Targets</Text>
                  <Text style={styles.tileDescription}>
                    Assign team sales goals, track monthly quota, and review commissions.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate("ManageAgents")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#d97706" }]}>
                  <MaterialCommunityIcons name="account-group" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Field Agent Reassignment & Mapping</Text>
                  <Text style={styles.tileDescription}>
                    Re-assign agents across supervisor networks and track daily field throughput.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate("ServiceTracker")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#0891b2" }]}>
                  <Ionicons name="search" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Live Service & Transaction Tracker</Text>
                  <Text style={styles.tileDescription}>
                    Investigate and audit NIN, BVN, Airtime, Electricity, and Cable TV operations.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate("NimcRequests")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#4338ca" }]}>
                  <Ionicons name="id-card" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>NIMC Verification & Modification Queue</Text>
                  <Text style={styles.tileDescription}>
                    Review, process, approve, or reject identity modification documents.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* TAB 2: TARIFF CONFIGURATION MATRIX */}
        {activeMainTab === "tariffs" && (
          <View style={styles.tabWrapper}>
            <View style={styles.tariffTabContainer}>
              <Text style={styles.sectionHeaderLabel}>SERVICE TARIFF CONFIGURATION MATRIX</Text>

              {/* Horizontal Category Scroll */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled={true}
                style={{ marginBottom: 12 }}
              >
                {["All", "NIMC Printing", "NIMC Modification", "NIN Validation", "Identity & BVN", "Utilities Surcharge"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryTab, selectedTariffCategory === cat && styles.categoryTabActive]}
                    onPress={() => setSelectedTariffCategory(cat)}
                  >
                    <Text style={[styles.categoryTabText, selectedTariffCategory === cat && styles.categoryTabTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Search Bar */}
              <View style={styles.searchBar}>
                <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search service name or tariff key..."
                  placeholderTextColor="#64748b"
                  value={tariffSearch}
                  onChangeText={setTariffSearch}
                />
              </View>

              {filteredServices.map((svc) => {
                const currentPrice = prices[svc.key] || svc.defaultFee;
                return (
                  <View key={svc.key} style={styles.tariffCard}>
                    <View style={styles.tariffCardLeft}>
                      <View style={styles.tariffIconBox}>
                        <FontAwesome5 name={svc.icon} size={15} color="#00f0ff" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.tariffTitle}>{svc.name}</Text>
                        <Text style={styles.tariffCategoryTag}>{svc.category}</Text>
                      </View>
                    </View>

                    <View style={styles.tariffCardRight}>
                      <Text style={styles.tariffPriceValue}>₦{Number(currentPrice).toLocaleString()}</Text>
                      <TouchableOpacity
                        style={styles.tariffEditBtn}
                        onPress={() => {
                          setTargetTariffService(svc);
                          setNewTariffPrice(currentPrice.toString());
                          setPricingModalVisible(true);
                        }}
                      >
                        <Text style={styles.tariffEditBtnText}>CHANGE</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* TAB 3: AUDIT HISTORY */}
        {activeMainTab === "history" && (
          <View style={styles.tabWrapper}>
            <View style={styles.historyTabContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME TRANSACTION & DEPOSIT AUDIT</Text>
                <Text style={{ color: "#00f0ff", fontSize: 11, fontWeight: "bold" }}>
                  {recentTx.length} RECORDS
                </Text>
              </View>

              {recentTx.length > 0 ? (
                recentTx.map((tx) => {
                  const isInflow = tx.type === "wallet_funding" || tx.type === "deposit" || tx.category === "credit";
                  return (
                    <View key={tx._id || Math.random().toString()} style={styles.historyCard}>
                      <View style={styles.historyCardTop}>
                        <View style={styles.historyTypeRow}>
                          <Ionicons
                            name={isInflow ? "arrow-down-circle" : "arrow-up-circle"}
                            size={18}
                            color={isInflow ? "#10b981" : "#f87171"}
                          />
                          <Text style={styles.historyServiceTitle}>
                            {isInflow ? "Wallet Inflow / Funding" : tx.service || "VTU / Data Order"}
                          </Text>
                        </View>
                        <Text
                          style={[
                            styles.historyAmountText,
                            { color: isInflow ? "#10b981" : "#f8fafc" },
                          ]}
                        >
                          {isInflow ? "+" : "-"}₦{Number(tx.amount || 0).toLocaleString()}
                        </Text>
                      </View>

                      <View style={styles.historyCardBottom}>
                        <Text style={styles.historyMetaText}>
                          User: {tx.user?.phone || tx.phone || tx.user?.email || "Platform Node"}
                        </Text>
                        <Text style={styles.historyMetaText}>
                          Ref: {tx.reference || tx.transactionId || tx._id?.substring(0, 10)}
                        </Text>
                        <Text
                          style={[
                            styles.historyStatusText,
                            { color: tx.status === "failed" ? "#ef4444" : "#10b981" },
                          ]}
                        >
                          {tx.status?.toUpperCase() || "SUCCESSFUL"}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="receipt-outline" size={40} color="#475569" />
                  <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                    No audit transaction records located.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* SIDEBAR OVERLAY */}
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
                  <Text style={styles.sidebarBrandText}>Ayax Supreme</Text>
                  <Text style={styles.sidebarRoleText}>Root SuperAdmin</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.sidebarCategory}>CORE NAVIGATION</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("overview");
                }}
              >
                <Feather name="grid" size={18} color="#00f0ff" />
                <Text style={[styles.navItemText, { color: "#00f0ff" }]}>Master Overview</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("tariffs");
                }}
              >
                <MaterialIcons name="tune" size={18} color="#00f0ff" />
                <Text style={[styles.navItemText, { color: "#00f0ff" }]}>Set Service Tariffs</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("history");
                }}
              >
                <Feather name="activity" size={18} color="#00f0ff" />
                <Text style={[styles.navItemText, { color: "#00f0ff" }]}>Audit History Stream</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setNotificationModalVisible(true);
                }}
              >
                <Ionicons name="megaphone-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Send Broadcast Alert</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>EXECUTIVE ACTIONS</Text>

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
                  navigation?.navigate("ManageAgents");
                }}
              >
                <MaterialCommunityIcons name="account-group" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Manage Field Agents</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL: SET SERVICE TARIFF */}
      <Modal visible={pricingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Update Service Tariff</Text>
                <Text style={styles.modalCardSubtitle}>
                  {targetTariffService ? targetTariffService.name : "Select a service to update"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {targetTariffService && (
              <View>
                <Text style={styles.formFieldLabel}>
                  NEW TARIFF PRICE FOR {targetTariffService.key.toUpperCase()} (₦)
                </Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder={`Current: ₦${prices[targetTariffService.key] || targetTariffService.defaultFee}`}
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newTariffPrice}
                  onChangeText={setNewTariffPrice}
                />

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                  onPress={handleUpdateTariff}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>SAVE & DEPLOY TARIFF</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL: BROADCAST NOTIFICATION */}
      <Modal visible={notificationModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast Notification</Text>
                <Text style={styles.modalCardSubtitle}>Push real-time alert to mobile users</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRowContainer}>
              <TouchableOpacity
                style={[styles.toggleBtn, notifTargetType === "all" && styles.creditActiveToggle]}
                onPress={() => setNotifTargetType("all")}
              >
                <Text style={[styles.toggleBtnText, notifTargetType === "all" && styles.activeToggleText]}>
                  Broadcast to ALL
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, notifTargetType === "single" && styles.debitActiveToggle]}
                onPress={() => setNotifTargetType("single")}
              >
                <Text style={[styles.toggleBtnText, notifTargetType === "single" && styles.activeToggleText]}>
                  Single User
                </Text>
              </TouchableOpacity>
            </View>

            {notifTargetType === "single" && (
              <>
                <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR ID</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 09033738409 or user@gmail.com"
                  placeholderTextColor="#64748b"
                  value={notifTargetUser}
                  onChangeText={setNotifTargetUser}
                />
              </>
            )}

            <Text style={styles.formFieldLabel}>NOTIFICATION TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. System Maintenance Notice"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>NOTIFICATION MESSAGE</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Enter announcement text..."
              placeholderTextColor="#64748b"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleSendBroadcastNotification}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>SEND BROADCAST NOTIFICATION</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL: DATA DISPATCHER */}
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

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} style={{ maxHeight: 380 }}>
              <Text style={styles.formFieldLabel}>NETWORK</Text>
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

              <Text style={styles.formFieldLabel}>PLAN TYPE</Text>
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

              <Text style={styles.formFieldLabel}>DATA SIZE (e.g. 1.0GB)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 1.0GB"
                placeholderTextColor="#64748b"
                value={dispatchPlanCode}
                onChangeText={setDispatchPlanCode}
              />

              <View style={styles.dualInputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.formFieldLabel}>PRICE (₦)</Text>
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
                  <Text style={styles.formFieldLabel}>COST (₦)</Text>
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

              <Text style={styles.formFieldLabel}>VALIDITY (DAYS)</Text>
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
                <Text style={styles.checkboxLabel}>Dispatch to ALL active users</Text>
              </View>

              {!sendToAll && (
                <>
                  <Text style={styles.formFieldLabel}>RECIPIENT NUMBERS (Comma-separated)</Text>
                  <TextInput
                    style={[styles.textInputStyle, { height: 60, textAlignVertical: "top" }]}
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

      {/* MODAL: REFUND */}
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

      {/* MODAL: DIRECT WALLET ADJUSTMENT */}
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
                  + Credit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, walletActionType === "debit" && styles.debitActiveToggle]}
                onPress={() => setWalletActionType("debit")}
              >
                <Text style={[styles.toggleBtnText, walletActionType === "debit" && styles.activeToggleText]}>
                  - Debit
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

      {/* MODAL: PASSWORD OVERRIDE */}
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

      {/* MODAL: SUSPEND / ACTIVATE ACCOUNT */}
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
                <Text style={styles.primaryActionBtnText}>SUSPEND</Text>
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
  mainWrapper: { flex: 1, backgroundColor: "#050811", height: "100%" },
  loaderContainer: { flex: 1, backgroundColor: "#050811", justifyContent: "center", alignItems: "center" },
  loaderTitle: { color: "#00f0ff", fontSize: 16, fontWeight: "900", letterSpacing: 1.5, marginTop: 16 },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0b1120",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  menuIconBtn: { padding: 6 },
  topBrandGroup: { alignItems: "center" },
  enterpriseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00f0ff",
    marginRight: 6,
  },
  enterpriseBadgeText: { color: "#00f0ff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  topBrandTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00f0ff",
  },
  logoutIconBtn: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  mainNavBar: {
    flexDirection: "row",
    backgroundColor: "#0b1120",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingHorizontal: 12,
  },
  mainNavTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mainNavTabActive: {
    borderBottomColor: "#00f0ff",
  },
  mainNavTabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  mainNavTabTextActive: {
    color: "#00f0ff",
  },
  
  // SCROLLING STYLES
  scrollArea: {
    flex: 1,
    width: "100%",
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 120,
  },
  tabWrapper: {
    flex: 1,
    width: "100%",
  },

  telemetrySection: { padding: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  liveBadgeText: { color: "#10b981", fontSize: 9, fontWeight: "800", marginLeft: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: "48.5%",
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  metricValue: { fontSize: 17, fontWeight: "900", marginVertical: 4 },
  metricSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  actionsSection: { paddingHorizontal: 16, marginTop: 6 },
  commandTile: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tileIconContainer: { width: 44, height: 44, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  tileInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  tileTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tileDescription: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },
  
  // TARIFF TAB STYLES
  tariffTabContainer: { padding: 16 },
  categoryTab: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: "#0f172a", marginRight: 8, borderWidth: 1, borderColor: "#1e293b" },
  categoryTabActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  categoryTabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  categoryTabTextActive: { color: "#ffffff" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#0b1120", paddingHorizontal: 12, borderRadius: 10, height: 44, borderWidth: 1, borderColor: "#1e293b", marginBottom: 14 },
  searchInput: { flex: 1, color: "#fff", fontSize: 12 },
  tariffCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tariffCardLeft: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 },
  tariffIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  tariffTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tariffCategoryTag: { color: "#64748b", fontSize: 10, marginTop: 2 },
  tariffCardRight: { alignItems: "flex-end" },
  tariffPriceValue: { color: "#00f0ff", fontSize: 15, fontWeight: "900" },
  tariffEditBtn: { backgroundColor: "#0284c7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 6 },
  tariffEditBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // HISTORY TAB STYLES
  historyTabContainer: { padding: 16 },
  historyCard: {
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  historyCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  historyTypeRow: { flexDirection: "row", alignItems: "center" },
  historyServiceTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800", marginLeft: 8 },
  historyAmountText: { fontSize: 14, fontWeight: "900" },
  historyCardBottom: { flexDirection: "row", justifyContent: "space-between", marginTop: 8, borderTopWidth: 1, borderTopColor: "#172033", paddingTop: 8 },
  historyMetaText: { color: "#64748b", fontSize: 11 },
  historyStatusText: { fontSize: 10, fontWeight: "900" },
  emptyFeed: { backgroundColor: "#0b1120", padding: 35, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },

  // SIDEBAR STYLES
  sidebarBackdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0, 0, 0, 0.8)", zIndex: 100 },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: "#050811",
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
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#00f0ff", fontSize: 11, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 15 },
  sidebarCategory: { color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  navItemText: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginLeft: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderTopWidth: 1, borderTopColor: "#1e293b" },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: "#0b1120", borderRadius: 20, padding: 20, width: "100%", maxWidth: 440, borderWidth: 1, borderColor: "#1e293b" },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingBottom: 10 },
  modalCardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  pillGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pillBtn: { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: "#0f172a", marginHorizontal: 2, borderRadius: 8, borderWidth: 1, borderColor: "#1e293b" },
  activePillBtn: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  pillBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activePillBtnText: { color: "#ffffff" },
  textInputStyle: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b", borderRadius: 10, paddingHorizontal: 12, height: 44, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
  dualInputRow: { flexDirection: "row", justifyContent: "space-between" },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 },
  checkboxSquare: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#00f0ff", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxSquareActive: { backgroundColor: "#0284c7" },
  checkboxLabel: { color: "#f8fafc", fontSize: 11, fontWeight: "700" },
  toggleRowContainer: { flexDirection: "row", backgroundColor: "#0f172a", padding: 3, borderRadius: 10, marginBottom: 10, borderWidth: 1, borderColor: "#1e293b" },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  creditActiveToggle: { backgroundColor: "#059669" },
  debitActiveToggle: { backgroundColor: "#dc2626" },
  toggleBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activeToggleText: { color: "#ffffff" },
  primaryActionBtn: { backgroundColor: "#0284c7", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default SuperAdminDashboard;