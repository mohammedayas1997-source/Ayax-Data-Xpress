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
  { key: "standardSlip", categoryKey: "nimc", name: "NIMC Standard Slip", category: "NIMC Printing", icon: "file-alt", defaultFee: 500 },
  { key: "premiumCard", categoryKey: "nimc", name: "NIMC Premium Card", category: "NIMC Printing", icon: "id-card", defaultFee: 1500 },
  { key: "basicSlip", categoryKey: "nimc", name: "NIMC Basic Slip", category: "NIMC Printing", icon: "print", defaultFee: 300 },
  { key: "nin", categoryKey: "nimc", name: "NIN Verification Lookup", category: "NIMC Printing", icon: "fingerprint", defaultFee: 200 },
  { key: "phone", categoryKey: "nimc", name: "NIMC Phone Search", category: "NIMC Printing", icon: "phone-alt", defaultFee: 500 },
  { key: "trackingId", categoryKey: "nimc", name: "Tracking ID Search", category: "NIMC Printing", icon: "barcode", defaultFee: 500 },

  // NIMC Modification Services
  { key: "mod_name", categoryKey: "nimc", name: "Modification: Name Correction", category: "NIMC Modification", icon: "user-edit", defaultFee: 2500 },
  { key: "mod_phone", categoryKey: "nimc", name: "Modification: Phone Update", category: "NIMC Modification", icon: "mobile-alt", defaultFee: 2000 },
  { key: "mod_dob", categoryKey: "nimc", name: "Modification: Date of Birth", category: "NIMC Modification", icon: "calendar-alt", defaultFee: 3000 },
  { key: "mod_address", categoryKey: "nimc", name: "Modification: Address Details", category: "NIMC Modification", icon: "map-marker-alt", defaultFee: 1500 },

  // NIN Validation Services
  { key: "val_noRecord", categoryKey: "nimc", name: "Validation: No Record", category: "NIN Validation", icon: "search-minus", defaultFee: 1300 },
  { key: "val_sim", categoryKey: "nimc", name: "Validation: SIM Card Bypass", category: "NIN Validation", icon: "sim-card", defaultFee: 1300 },
  { key: "val_vnin", categoryKey: "nimc", name: "Validation: vNIN Linkage", category: "NIN Validation", icon: "shield-alt", defaultFee: 1300 },
  { key: "val_bank", categoryKey: "nimc", name: "Validation: Bank Records", category: "NIN Validation", icon: "university", defaultFee: 1300 },

  // BVN Services
  { key: "bvn_standard", categoryKey: "bvn", name: "BVN Standard Slip", category: "BVN Services", icon: "user-check", defaultFee: 300 },
  { key: "bvn_premium", categoryKey: "bvn", name: "BVN Premium Card", category: "BVN Services", icon: "id-badge", defaultFee: 1000 },
  { key: "bvn_phone", categoryKey: "bvn", name: "BVN Phone Lookup", category: "BVN Services", icon: "phone-square-alt", defaultFee: 400 },
  { key: "bvn_basic", categoryKey: "bvn", name: "BVN Basic Verification", category: "BVN Services", icon: "user-tie", defaultFee: 200 },
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
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [purgeModalVisible, setPurgeModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States
  const [targetTariffService, setTargetTariffService] = useState(null);
  const [newTariffPrice, setNewTariffPrice] = useState("");
  const [newAgentPrice, setNewAgentPrice] = useState("");
  const [newCostPrice, setNewCostPrice] = useState("");

  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifCategory, setNotifCategory] = useState("ADMIN_BROADCAST");
  const [notifTargetUser, setNotifTargetUser] = useState("");

  const [dispatchNetwork, setDispatchNetwork] = useState("MTN");
  const [dispatchPlanType, setDispatchPlanType] = useState("SME");
  const [dispatchPlanCode, setDispatchPlanCode] = useState("1.0GB");
  const [dispatchPrice, setDispatchPrice] = useState("280");
  const [dispatchRecipients, setDispatchRecipients] = useState("");
  const [sendToAll, setSendToAll] = useState(false);

  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletActionType, setWalletActionType] = useState("credit");

  const [refundUserId, setRefundUserId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundTxRef, setRefundTxRef] = useState("");
  const [refundReason, setRefundReason] = useState("");

  const [roleUserId, setRoleUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("agent");

  const [pwdUserId, setPwdUserId] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pinNew, setPinNew] = useState("");

  const [lockUserId, setLockUserId] = useState("");
  const [lockReason, setLockReason] = useState("");

  const [purgeDays, setPurgeDays] = useState("90");

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

      const headers = { Authorization: `Bearer ${token}` };

      const [telemetryRes, txRes] = await Promise.all([
        axios.get(`${BASE_URL}/superadmin/overview`, { headers, timeout: 15000 }),
        axios.get(`${BASE_URL}/admin/transactions?limit=25`, { headers, timeout: 15000 }),
      ]);

      if (telemetryRes.data?.stats) {
        setStats(telemetryRes.data.stats);
      }

      if (txRes.data?.transactions) {
        setRecentTx(txRes.data.transactions);
      }
    } catch (err) {
      if (!isBackground) {
        console.log("Telemetry Sync Notice:", err.response?.data?.message || err.message);
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
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchMasterTelemetry]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchMasterTelemetry();
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to terminate the SuperAdmin Session?");
      if (confirmLogout) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else {
      Alert.alert(
        "SuperAdmin Sign Out",
        "Terminate active SuperAdmin administrative session?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Sign Out",
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

  // 1. Set Global Service Price (Tariff Matrix)
  const handleUpdateTariff = async () => {
    if (!targetTariffService || !newTariffPrice || isNaN(Number(newTariffPrice))) {
      return showAlert("Validation Error", "Please provide a valid numeric tariff price.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/pricing/set-global`,
        {
          serviceCategory: targetTariffService.categoryKey,
          serviceId: targetTariffService.key,
          amount: Number(newTariffPrice),
          agentPrice: Number(newAgentPrice || newTariffPrice),
          costPrice: Number(newCostPrice || 0),
          name: targetTariffService.name,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Tariff Deployed", res.data.message);
        setPrices((prev) => ({ ...prev, [targetTariffService.key]: Number(newTariffPrice) }));
        setPricingModalVisible(false);
        setNewTariffPrice("");
        setNewAgentPrice("");
        setNewCostPrice("");
      }
    } catch (err) {
      showAlert("Tariff Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Broadcast Real-Time Notification
  const handleSendBroadcastNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      return showAlert("Validation Error", "Title and Body Message are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/notifications/send`,
        {
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          category: notifCategory,
          recipientId: notifTargetUser.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Broadcast Sent 🚀", res.data.message);
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

  // 3. Direct Wallet Balance Adjustment
  const handleExecuteWalletAction = async () => {
    if (!walletUserId.trim() || !walletAmount || isNaN(Number(walletAmount))) {
      return showAlert("Validation Error", "Please provide a valid target identifier and numeric amount.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/wallet/adjust`,
        {
          userId: walletUserId.trim(),
          amount: Number(walletAmount),
          reason: walletReason.trim() || "Administrative settlement",
          actionType: walletActionType,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Ledger Synced", res.data.message);
        setWalletModalVisible(false);
        setWalletUserId("");
        setWalletAmount("");
        setWalletReason("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Ledger Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Executive Refund Override
  const handleExecuteRefund = async () => {
    if ((!refundUserId.trim() && !refundTxRef.trim()) || !refundAmount) {
      return showAlert("Validation Error", "Provide beneficiary identifier (or Reference) and refund amount.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/refunds/executive-override`,
        {
          targetUserId: refundUserId.trim() || null,
          reference: refundTxRef.trim() || null,
          refundAmount: Number(refundAmount),
          reason: refundReason.trim() || "Executive SuperAdmin Refund Override",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Executive Refund Executed", res.data.message);
        setRefundModalVisible(false);
        setRefundUserId("");
        setRefundTxRef("");
        setRefundAmount("");
        setRefundReason("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Refund Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Change User Role
  const handleExecuteRoleChange = async () => {
    if (!roleUserId.trim()) {
      return showAlert("Validation Error", "Target user phone, email, or ID is required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.patch(
        `${BASE_URL}/superadmin/users/change-role`,
        {
          userId: roleUserId.trim(),
          newRole: selectedRole,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Role Updated", res.data.message);
        setRoleModalVisible(false);
        setRoleUserId("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Role Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Security Credential Override
  const handleExecutePasswordOverride = async () => {
    if (!pwdUserId.trim() || (!pwdNew && !pinNew)) {
      return showAlert("Validation Error", "Target identifier and new password or PIN are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/users/force-reset-security`,
        {
          userId: pwdUserId.trim(),
          newPassword: pwdNew.trim() || null,
          newPin: pinNew.trim() || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Credentials Reset", res.data.message);
        setPasswordModalVisible(false);
        setPwdUserId("");
        setPwdNew("");
        setPinNew("");
      }
    } catch (err) {
      showAlert("Security Override Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 7. Lock / Unlock Account
  const handleExecuteToggleLock = async (lock) => {
    if (!lockUserId.trim()) {
      return showAlert("Validation Error", "Target identifier is required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.patch(
        `${BASE_URL}/superadmin/users/toggle-lock`,
        {
          userId: lockUserId.trim(),
          lock,
          reason: lockReason.trim() || "Administrative security inspection",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Security State Changed", res.data.message);
        setLockModalVisible(false);
        setLockUserId("");
        setLockReason("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Account Lock Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 8. Bulk Marketing Data Dispatch
  const handleExecuteDispatch = async () => {
    if (!dispatchPlanCode || !dispatchPrice) {
      return showAlert("Validation Error", "Plan Code and Selling Price are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/vtu/dispatch-bulk`,
        {
          network: dispatchNetwork,
          planType: dispatchPlanType,
          planCode: dispatchPlanCode.trim(),
          price: Number(dispatchPrice),
          recipients: dispatchRecipients.trim(),
          sendToAllUsers: sendToAll,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Campaign Queued", res.data.message);
        setDispatchModalVisible(false);
        setDispatchRecipients("");
        setSendToAll(false);
      }
    } catch (err) {
      showAlert("Campaign Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 9. Prune Audit Trail
  const handleExecuteAuditPurge = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.delete(`${BASE_URL}/superadmin/logs/expunge`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { retentionDays: Number(purgeDays) },
      });

      if (res.data?.success) {
        showAlert("Forensic Clean Complete", res.data.message);
        setPurgeModalVisible(false);
      }
    } catch (err) {
      showAlert("Purge Error", err.response?.data?.message || err.message);
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
        <Text style={styles.loaderText}>Establishing Real-Time Core Telemetry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* TOP SUPREME APP BAR */}
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
          <Feather
            name="grid"
            size={14}
            color={activeMainTab === "overview" ? "#00f0ff" : "#64748b"}
          />
          <Text
            style={[
              styles.mainNavTabText,
              activeMainTab === "overview" && styles.mainNavTabTextActive,
            ]}
          >
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "tariffs" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("tariffs")}
        >
          <MaterialIcons
            name="tune"
            size={15}
            color={activeMainTab === "tariffs" ? "#00f0ff" : "#64748b"}
          />
          <Text
            style={[
              styles.mainNavTabText,
              activeMainTab === "tariffs" && styles.mainNavTabTextActive,
            ]}
          >
            Set Tariffs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "history" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("history")}
        >
          <Feather
            name="activity"
            size={14}
            color={activeMainTab === "history" ? "#00f0ff" : "#64748b"}
          />
          <Text
            style={[
              styles.mainNavTabText,
              activeMainTab === "history" && styles.mainNavTabTextActive,
            ]}
          >
            Live Audit Stream
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
                  <Text style={styles.liveBadgeText}>
                    GATEWAY: {stats?.gatewayBalance ? `₦${stats.gatewayBalance}` : "ONLINE"}
                  </Text>
                </View>
              </View>

              <View style={styles.metricGrid}>
                <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Total Platform Revenue</Text>
                    <Ionicons name="cash" size={18} color="#10b981" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#10b981" }]}>
                    ₦{Number(stats?.totalRevenue || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>{stats?.successfulTransactions || 0} Successful Txns</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(0, 240, 255, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Wallet Liabilities</Text>
                    <Ionicons name="wallet" size={18} color="#00f0ff" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#00f0ff" }]}>
                    ₦{Number(stats?.totalWalletLiabilities || 0).toLocaleString()}
                  </Text>
                  <Text style={styles.metricSub}>User & Staff Floating Capital</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Pending Refunds</Text>
                    <Ionicons name="alert-circle" size={18} color="#f87171" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#f87171" }]}>
                    {stats?.pendingRefunds || 0}
                  </Text>
                  <Text style={styles.metricSub}>{stats?.failedTransactions || 0} Failed Operations</Text>
                </View>

                <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.metricLabel}>Platform Users</Text>
                    <Ionicons name="people" size={18} color="#c084fc" />
                  </View>
                  <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                    {stats?.totalPlatformAccounts || stats?.totalUsers || 0}
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
                    Send instant alerts, announcements, and maintenance updates to all mobile devices.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.commandTile, { borderColor: "rgba(16, 185, 129, 0.4)" }]}
                activeOpacity={0.8}
                onPress={() => setWalletModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#059669" }]}>
                  <Ionicons name="wallet" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitle, { color: "#10b981" }]}>
                    Direct Ledger Injector (Credit / Debit)
                  </Text>
                  <Text style={styles.tileDescription}>
                    Adjust user, agent, or staff wallet balances instantly with immutable audit remarks.
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
                    Executive Refund Override (SuperAdmin Only)
                  </Text>
                  <Text style={styles.tileDescription}>
                    Directly disburse wallet refunds for failed transactions without third-party bottlenecks.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setRoleModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
                  <MaterialCommunityIcons name="account-convert" size={24} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Change User Role & Permissions</Text>
                  <Text style={styles.tileDescription}>
                    Promote or demote users to Agent, Supervisor, Customer Service, or Admin.
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
                  <Text style={styles.tileTitle}>Global Service Pricing & Tariff Engine</Text>
                  <Text style={styles.tileDescription}>
                    Individually set pricing for NIMC printing, validation, BVN, and data bundle tariffs.
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
                  <Text style={styles.tileTitle}>Bulk Data Marketing & Campaign Dispatcher</Text>
                  <Text style={styles.tileDescription}>
                    Deploy custom wholesale bundles, adjust profit margins, and queue bulk dispatches.
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
                  <Text style={styles.tileTitle}>Force-Reset User Password / PIN</Text>
                  <Text style={styles.tileDescription}>
                    Directly override security credentials for any account without OTP delays.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setLockModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#b91c1c" }]}>
                  <MaterialIcons name="block" size={22} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Freeze / Unlock User Wallet & Access</Text>
                  <Text style={styles.tileDescription}>
                    Instantly freeze compromised customer or staff accounts or restore service access.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => setPurgeModalVisible(true)}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#334155" }]}>
                  <Feather name="trash-2" size={22} color="#f87171" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={[styles.tileTitle, { color: "#f87171" }]}>
                    Forensic Log Maintenance & Expunging
                  </Text>
                  <Text style={styles.tileDescription}>
                    Prune and expunge historical system audit records older than 30/60/90 days.
                  </Text>
                </View>
                <Feather name="chevron-right" size={20} color="#64748b" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.commandTile}
                activeOpacity={0.8}
                onPress={() => navigation?.navigate("LeaderDashboard")}
              >
                <View style={[styles.tileIconContainer, { backgroundColor: "#d97706" }]}>
                  <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
                </View>
                <View style={styles.tileInfo}>
                  <Text style={styles.tileTitle}>Supervisor Performance & Quota Targets</Text>
                  <Text style={styles.tileDescription}>
                    Assign team sales goals, track monthly quota, and review commissions.
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
                {["All", "NIMC Printing", "NIMC Modification", "NIN Validation", "BVN Services"].map(
                  (cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryTab,
                        selectedTariffCategory === cat && styles.categoryTabActive,
                      ]}
                      onPress={() => setSelectedTariffCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryTabText,
                          selectedTariffCategory === cat && styles.categoryTabTextActive,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
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
                        <Text style={styles.tariffCategoryTag}>
                          {svc.category} • Key: {svc.key}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.tariffCardRight}>
                      <Text style={styles.tariffPriceValue}>
                        ₦{Number(currentPrice).toLocaleString()}
                      </Text>
                      <TouchableOpacity
                        style={styles.tariffEditBtn}
                        onPress={() => {
                          setTargetTariffService(svc);
                          setNewTariffPrice(currentPrice.toString());
                          setNewAgentPrice(currentPrice.toString());
                          setPricingModalVisible(true);
                        }}
                      >
                        <Text style={styles.tariffEditBtnText}>CONFIGURE</Text>
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
                <Text style={styles.sectionHeaderLabel}>REAL-TIME TRANSACTION & AUDIT LOGS</Text>
                <Text style={{ color: "#00f0ff", fontSize: 11, fontWeight: "bold" }}>
                  {recentTx.length} RECORDS
                </Text>
              </View>

              {recentTx.length > 0 ? (
                recentTx.map((tx) => {
                  const isInflow =
                    tx.category === "CREDIT" ||
                    tx.type === "wallet_funding" ||
                    tx.type === "deposit" ||
                    tx.type === "refund";
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
                            {tx.type ? tx.type.toUpperCase() : "TRANSACTION"}
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
                          User: {tx.user?.phone || tx.phoneNumber || tx.user?.email || "Platform Node"}
                        </Text>
                        <Text style={styles.historyMetaText}>
                          Ref: {tx.reference || tx.transactionId || "N/A"}
                        </Text>
                        <Text
                          style={[
                            styles.historyStatusText,
                            {
                              color:
                                tx.status === "failed"
                                  ? "#ef4444"
                                  : tx.status === "refunded"
                                  ? "#f59e0b"
                                  : "#10b981",
                            },
                          ]}
                        >
                          {tx.status?.toUpperCase() || "SUCCESS"}
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

            <ScrollView
              style={styles.sidebarNavList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
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

              <Text style={styles.sidebarCategory}>EXECUTIVE CONTROLS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setNotificationModalVisible(true);
                }}
              >
                <Ionicons name="megaphone-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Broadcast Push Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setWalletModalVisible(true);
                }}
              >
                <Ionicons name="wallet-outline" size={18} color="#10b981" />
                <Text style={[styles.navItemText, { color: "#10b981" }]}>Direct Ledger Injector</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setRefundModalVisible(true);
                }}
              >
                <Ionicons name="refresh-circle-outline" size={20} color="#f87171" />
                <Text style={[styles.navItemText, { color: "#f87171" }]}>
                  Executive Refund Override
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setRoleModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="account-convert" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Change User Role</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setPasswordModalVisible(true);
                }}
              >
                <MaterialIcons name="lock-reset" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Force-Reset Credentials</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setLockModalVisible(true);
                }}
              >
                <MaterialIcons name="block" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Lock / Unlock Account</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: SET SERVICE TARIFF */}
      <Modal visible={pricingModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Configure Global Tariff</Text>
                <Text style={styles.modalCardSubtitle}>
                  {targetTariffService ? targetTariffService.name : "Select service"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {targetTariffService && (
              <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
                <Text style={styles.formFieldLabel}>STANDARD USER PRICE (₦)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder={`Default: ₦${targetTariffService.defaultFee}`}
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newTariffPrice}
                  onChangeText={setNewTariffPrice}
                />

                <Text style={styles.formFieldLabel}>AGENT DISCOUNTED PRICE (₦)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 450"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newAgentPrice}
                  onChangeText={setNewAgentPrice}
                />

                <Text style={styles.formFieldLabel}>ESTIMATED COST PRICE (₦)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 300"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={newCostPrice}
                  onChangeText={setNewCostPrice}
                />

                <TouchableOpacity
                  style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                  onPress={handleUpdateTariff}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text style={styles.primaryActionBtnText}>DEPLOY TARIFF GLOBALLY</Text>
                  )}
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: BROADCAST NOTIFICATION */}
      <Modal visible={notificationModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast Notification</Text>
                <Text style={styles.modalCardSubtitle}>Push real-time alerts to mobile app users</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET USER (LEAVE EMPTY FOR BROADCAST ALL)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409 or user@gmail.com"
              placeholderTextColor="#64748b"
              value={notifTargetUser}
              onChangeText={setNotifTargetUser}
            />

            <Text style={styles.formFieldLabel}>NOTIFICATION TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Urgent System Upgrade Notice"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>BODY MESSAGE</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type your official announcement here..."
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
                <Text style={styles.primaryActionBtnText}>DISPATCH BROADCAST NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: DIRECT WALLET ADJUSTMENT */}
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
                <Text
                  style={[
                    styles.toggleBtnText,
                    walletActionType === "credit" && styles.activeToggleText,
                  ]}
                >
                  + Credit
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.toggleBtn, walletActionType === "debit" && styles.debitActiveToggle]}
                onPress={() => setWalletActionType("debit")}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    walletActionType === "debit" && styles.activeToggleText,
                  ]}
                >
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
              placeholder="e.g. Manual settlement / Operational grant"
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

      {/* MODAL 4: EXECUTIVE REFUND OVERRIDE */}
      <Modal visible={refundModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#ef4444" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalCardTitle, { color: "#f87171" }]}>
                  Executive Refund Override
                </Text>
                <Text style={styles.modalCardSubtitle}>SuperAdmin exclusive wallet replenishment</Text>
              </View>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>BENEFICIARY PHONE OR EMAIL</Text>
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
              placeholder="e.g. AYAX-ELEC-1938472918"
              placeholderTextColor="#64748b"
              value={refundTxRef}
              onChangeText={setRefundTxRef}
            />

            <Text style={styles.formFieldLabel}>AUDIT REASON</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Manual override on failed gateway response"
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

      {/* MODAL 5: CHANGE USER ROLE */}
      <Modal visible={roleModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Change User Role</Text>
                <Text style={styles.modalCardSubtitle}>Promote or re-assign platform permissions</Text>
              </View>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter User Phone or Email"
              placeholderTextColor="#64748b"
              value={roleUserId}
              onChangeText={setRoleUserId}
            />

            <Text style={styles.formFieldLabel}>ASSIGN ROLE</Text>
            <View style={styles.pillGrid}>
              {["user", "agent", "supervisor", "customer_service", "admin"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pillBtn, selectedRole === r && styles.activePillBtn]}
                  onPress={() => setSelectedRole(r)}
                >
                  <Text
                    style={[
                      styles.pillBtnText,
                      selectedRole === r && styles.activePillBtnText,
                    ]}
                  >
                    {r.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: "#7c3aed", opacity: actionLoading ? 0.7 : 1 },
              ]}
              onPress={handleExecuteRoleChange}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>UPDATE PERMISSION ROLE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 6: SECURITY CREDENTIAL OVERRIDE */}
      <Modal visible={passwordModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Override Security Credentials</Text>
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

            <Text style={styles.formFieldLabel}>NEW STRONG PASSWORD (OPTIONAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter New Password (Min 6 Chars)"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={pwdNew}
              onChangeText={setPwdNew}
            />

            <Text style={styles.formFieldLabel}>NEW TRANSACTION PIN (OPTIONAL, e.g. 1997)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter 4-Digit PIN"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              maxLength={4}
              value={pinNew}
              onChangeText={setPinNew}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: "#4f46e5", opacity: actionLoading ? 0.7 : 1 },
              ]}
              onPress={handleExecutePasswordOverride}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>SAVE NEW CREDENTIALS</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 7: LOCK / UNLOCK ACCOUNT */}
      <Modal visible={lockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Account Access Control</Text>
                <Text style={styles.modalCardSubtitle}>Freeze or restore customer / staff accounts</Text>
              </View>
              <TouchableOpacity onPress={() => setLockModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET PHONE, EMAIL, OR USER ID</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter Phone Number or Email"
              placeholderTextColor="#64748b"
              value={lockUserId}
              onChangeText={setLockUserId}
            />

            <Text style={styles.formFieldLabel}>INSPECTION REASON</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Suspected unauthorized login activity"
              placeholderTextColor="#64748b"
              value={lockReason}
              onChangeText={setLockReason}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { flex: 1, marginRight: 6, backgroundColor: "#dc2626" },
                ]}
                onPress={() => handleExecuteToggleLock(true)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>FREEZE / LOCK</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { flex: 1, marginLeft: 6, backgroundColor: "#059669" },
                ]}
                onPress={() => handleExecuteToggleLock(false)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>RESTORE / UNLOCK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL 8: BULK DATA MARKETING DISPATCHER */}
      <Modal visible={dispatchModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Dispatch Bulk Data Campaign</Text>
                <Text style={styles.modalCardSubtitle}>Provision marketing bundles and discounts</Text>
              </View>
              <TouchableOpacity onPress={() => setDispatchModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>NETWORK</Text>
              <View style={styles.pillGrid}>
                {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[styles.pillBtn, dispatchNetwork === net && styles.activePillBtn]}
                    onPress={() => setDispatchNetwork(net)}
                  >
                    <Text
                      style={[
                        styles.pillBtnText,
                        dispatchNetwork === net && styles.activePillBtnText,
                      ]}
                    >
                      {net}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formFieldLabel}>PLAN SIZE (e.g. 1.0GB)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 1.0GB"
                placeholderTextColor="#64748b"
                value={dispatchPlanCode}
                onChangeText={setDispatchPlanCode}
              />

              <Text style={styles.formFieldLabel}>PRICE PER BUNDLE (₦)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="280"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={dispatchPrice}
                onChangeText={setDispatchPrice}
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
                    style={[styles.textInputStyle, { height: 60, textAlignVertical: "top" }]}
                    placeholder="09033738409, 08012345678"
                    placeholderTextColor="#64748b"
                    multiline
                    value={dispatchRecipients}
                    onChangeText={setDispatchRecipients}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleExecuteDispatch}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>QUEUE BULK DISPATCH</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 9: FORENSIC AUDIT EXPUNGE */}
      <Modal visible={purgeModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { borderColor: "#ef4444" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalCardTitle, { color: "#f87171" }]}>
                  Forensic Log Maintenance
                </Text>
                <Text style={styles.modalCardSubtitle}>Prune immutable database activity records</Text>
              </View>
              <TouchableOpacity onPress={() => setPurgeModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>EXPUNGE RECORDS OLDER THAN (DAYS)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 90"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={purgeDays}
              onChangeText={setPurgeDays}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: "#dc2626", opacity: actionLoading ? 0.7 : 1 },
              ]}
              onPress={handleExecuteAuditPurge}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>EXECUTE DATABASE PRUNE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#050811", height: "100%" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#050811",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#00f0ff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
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
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
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
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tileInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  tileTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tileDescription: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },
  tariffTabContainer: { padding: 16 },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  categoryTabActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  categoryTabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  categoryTabTextActive: { color: "#ffffff" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1120",
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 14,
  },
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
  tariffIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tariffTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tariffCategoryTag: { color: "#64748b", fontSize: 10, marginTop: 2 },
  tariffCardRight: { alignItems: "flex-end" },
  tariffPriceValue: { color: "#00f0ff", fontSize: 15, fontWeight: "900" },
  tariffEditBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  tariffEditBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
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
  historyCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 8,
  },
  historyMetaText: { color: "#64748b", fontSize: 11 },
  historyStatusText: { fontSize: 10, fontWeight: "900" },
  emptyFeed: {
    backgroundColor: "#0b1120",
    padding: 35,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    zIndex: 100,
  },
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
  navItemText: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginLeft: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0b1120",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
  },
  modalCardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  pillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    backgroundColor: "#0f172a",
    margin: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  activePillBtn: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  pillBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activePillBtnText: { color: "#ffffff" },
  textInputStyle: {
    backgroundColor: "#0f172a",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: "#f8fafc",
    fontSize: 13,
    fontWeight: "600",
  },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 },
  checkboxSquare: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: "#00f0ff",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  checkboxSquareActive: { backgroundColor: "#0284c7" },
  checkboxLabel: { color: "#f8fafc", fontSize: 11, fontWeight: "700" },
  toggleRowContainer: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
    padding: 3,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  creditActiveToggle: { backgroundColor: "#059669" },
  debitActiveToggle: { backgroundColor: "#dc2626" },
  toggleBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activeToggleText: { color: "#ffffff" },
  primaryActionBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default SuperAdminDashboard;