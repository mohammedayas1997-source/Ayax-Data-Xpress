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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sidebar Drawer Animation State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-width * 0.8)).current;

  // Modals
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [restrictModalVisible, setRestrictModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Data Plan Dispatcher State
  const [dispatchNetwork, setDispatchNetwork] = useState("MTN");
  const [dispatchPlanType, setDispatchPlanType] = useState("SME");
  const [dispatchPlanCode, setDispatchPlanCode] = useState("1.0GB");
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

  // Refund State (SuperAdmin Only)
  const [refundUserId, setRefundUserId] = useState("");
  const [refundAmount, setRefundAmount] = useState("");
  const [refundTxId, setRefundTxId] = useState("");
  const [refundReason, setRefundReason] = useState("");

  // Restriction State
  const [restrictUserId, setRestrictUserId] = useState("");

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

  const fetchMasterStats = async () => {
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
    } catch (err) {
      console.log("Telemetry Sync Warning:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMasterStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMasterStats();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 1. Dispatch Data Bundles
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
        fetchMasterStats();
      }
    } catch (err) {
      showAlert("Dispatch Fault", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Process Refund (SuperAdmin Only)
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
        fetchMasterStats();
      }
    } catch (err) {
      showAlert("Refund Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Direct Wallet Adjustment
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
        fetchMasterStats();
      }
    } catch (err) {
      showAlert("Adjustment Failed", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Toggle Wallet Restriction
  const handleExecuteLockAction = async (lock) => {
    if (!restrictUserId.trim()) {
      return showAlert("Validation Error", "Please provide a valid Phone Number or Email.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/toggle-wallet`,
        {
          userId: restrictUserId.trim(),
          lock: lock,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success) {
        showAlert("Status Changed", res.data.message);
        setRestrictModalVisible(false);
        setRestrictUserId("");
      }
    } catch (err) {
      showAlert("Restriction Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loaderText}>Syncing Ayax VTU Master Telemetry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0a0f1d" />

      {/* TOP COMMAND HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)}>
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.enterpriseBadge}>
            <MaterialCommunityIcons name="shield-crown" size={14} color="#f59e0b" />
            <Text style={styles.enterpriseBadgeText}>SUPERADMIN SUPREME</Text>
          </View>
          <Text style={styles.topBrandTitle}>AYAX CENTRAL OVERRIDE</Text>
        </View>

        <TouchableOpacity
          style={styles.avatarBtn}
          onPress={() => setRefundModalVisible(true)}
        >
          <Ionicons name="refresh-circle" size={24} color="#38bdf8" />
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
        {/* STATS OVERVIEW */}
        <View style={styles.telemetrySection}>
          <Text style={styles.sectionHeaderLabel}>PLATFORM OVERVIEW & REVENUE</Text>

          <View style={styles.metricGrid}>
            <View style={[styles.metricCard, { borderColor: "#1e3a8a" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Revenue</Text>
                <Ionicons name="wallet-outline" size={18} color="#38bdf8" />
              </View>
              <Text style={styles.metricValue}>
                ₦{Number(stats?.totalRevenue || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>Gross processed volume</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#065f46" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Transactions</Text>
                <Ionicons name="checkmark-done" size={18} color="#34d399" />
              </View>
              <Text style={styles.metricValue}>
                {Number(stats?.successfulTransactions || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>Successful automated sales</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#581c87" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Total Users</Text>
                <Ionicons name="people" size={18} color="#c084fc" />
              </View>
              <Text style={styles.metricValue}>
                {Number(stats?.totalUsers || 0).toLocaleString()}
              </Text>
              <Text style={styles.metricSub}>Registered customer profiles</Text>
            </View>

            <View style={[styles.metricCard, { borderColor: "#831843" }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.metricLabel}>Supervisors & Agents</Text>
                <Ionicons name="shield-checkmark" size={18} color="#f472b6" />
              </View>
              <Text style={styles.metricValue}>
                {(stats?.totalSupervisors || 0) + (stats?.totalAgents || 0)}
              </Text>
              <Text style={styles.metricSub}>Active field & network staff</Text>
            </View>
          </View>
        </View>

        {/* ACTIONS & OVERRIDES */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionHeaderLabel}>SUPERADMIN EXCLUSIVE COMMAND ACTIONS</Text>

          {/* 1. Data Dispatcher & Pricing */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setDispatchModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0369a1" }]}>
              <Ionicons name="paper-plane" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Data Dispatcher & Pricing Setup</Text>
              <Text style={styles.tileDescription}>
                Configure network bundles, retail/cost prices, validity days, and target recipients.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 2. Process Refund (SuperAdmin Only) */}
          <TouchableOpacity
            style={[styles.commandTile, { borderColor: "#ef4444" }]}
            activeOpacity={0.8}
            onPress={() => setRefundModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#dc2626" }]}>
              <Ionicons name="refresh-circle" size={24} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={[styles.tileTitle, { color: "#f87171" }]}>Process User Refund (SuperAdmin Only)</Text>
              <Text style={styles.tileDescription}>
                Authorize direct automated wallet refunds for failed transactions.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 3. Wallet Credit / Debit */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setWalletModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#047857" }]}>
              <Ionicons name="wallet" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Direct Wallet Adjustment (Credit / Debit)</Text>
              <Text style={styles.tileDescription}>
                Manually adjust wallet balances for Users, Agents, and Staff with audit remarks.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 4. Wallet Restriction Toggle */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => setRestrictModalVisible(true)}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#b91c1c" }]}>
              <MaterialIcons name="lock-person" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Wallet Status & Account Restrictions (Block / Unblock)</Text>
              <Text style={styles.tileDescription}>
                Freeze suspicious wallets or unfreeze accounts to resume transactions.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 5. Supervisor Network Management */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("LeaderDashboard")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
              <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Supervisor Network & Authority Hub</Text>
              <Text style={styles.tileDescription}>
                Assign targets, suspend supervisors, or view team performance records.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 6. Agent Transfer & Management */}
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
                Transfer agents between supervisors and monitor daily field sales.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 7. Service & Transaction Investigation */}
          <TouchableOpacity
            style={styles.commandTile}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate("ServiceTracker")}
          >
            <View style={[styles.tileIconContainer, { backgroundColor: "#0e7490" }]}>
              <Ionicons name="search" size={22} color="#ffffff" />
            </View>
            <View style={styles.tileInfo}>
              <Text style={styles.tileTitle}>Service Tracing (Data, NIMC & Bills)</Text>
              <Text style={styles.tileDescription}>
                Investigate and resolve pending transactions by phone number or reference.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>

          {/* 8. NIMC & Modification Requests */}
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
                Process, approve, or reject customer identity modification submissions.
              </Text>
            </View>
            <Feather name="chevron-right" size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ==========================================
          GLOBAL SIDEBAR DRAWER
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

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => toggleSidebar(false)}
              >
                <Feather name="grid" size={18} color="#38bdf8" />
                <Text style={[styles.navItemText, { color: "#38bdf8" }]}>Master Overview</Text>
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

              <Text style={styles.sidebarCategory}>DATA & FINANCIALS</Text>

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
                <Text style={[styles.navItemText, { color: "#f87171" }]}>Process Refund (Exclusive)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setWalletModalVisible(true);
                }}
              >
                <Ionicons name="wallet-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Wallet Adjustment</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setRestrictModalVisible(true);
                }}
              >
                <MaterialIcons name="lock-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>Wallet Restrictions</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>INVESTIGATION & VERIFICATION</Text>

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

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("NimcRequests");
                }}
              >
                <Ionicons name="id-card-outline" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>NIMC Verification</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation?.navigate("SupportActivities");
                }}
              >
                <Feather name="activity" size={18} color="#94a3b8" />
                <Text style={styles.navItemText}>System Audit Logs</Text>
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
                <Text style={styles.checkboxLabel}>Dispatch to ALL active app users</Text>
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
                <Text style={styles.primaryActionBtnText}>DISPATCH BUNDLE NOW</Text>
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
                <Text style={styles.modalCardSubtitle}>SuperAdmin exclusive refund authorization</Text>
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
                <Text style={styles.modalCardSubtitle}>Instant credit or debit balance injection</Text>
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
              placeholder="e.g. System compensation"
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
          MODAL 4: WALLET RESTRICTIONS
      ========================================== */}
      <Modal visible={restrictModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Wallet Access Restrictions</Text>
                <Text style={styles.modalCardSubtitle}>Freeze or unfreeze customer wallet operations</Text>
              </View>
              <TouchableOpacity onPress={() => setRestrictModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET PHONE OR EMAIL</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter Phone Number or Email"
              placeholderTextColor="#64748b"
              value={restrictUserId}
              onChangeText={setRestrictUserId}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 20 }}>
              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1, marginRight: 6, backgroundColor: "#dc2626" }]}
                onPress={() => handleExecuteLockAction(true)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>FREEZE WALLET</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { flex: 1, marginLeft: 6, backgroundColor: "#059669" }]}
                onPress={() => handleExecuteLockAction(false)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>UNFREEZE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#0a0f1d" },
  loaderContainer: { flex: 1, backgroundColor: "#0a0f1d", justifyContent: "center", alignItems: "center" },
  loaderText: { color: "#94a3b8", fontSize: 13, fontWeight: "700", marginTop: 12 },
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
  menuIconBtn: { padding: 6 },
  topBrandGroup: { alignItems: "center" },
  enterpriseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
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
    backgroundColor: "#1e293b",
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
    backgroundColor: "#111827",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  metricValue: { color: "#f8fafc", fontSize: 17, fontWeight: "900", marginVertical: 4 },
  metricSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  actionsSection: { paddingHorizontal: 16, marginTop: 6 },
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
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#f59e0b", fontSize: 11, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 15 },
  sidebarCategory: { color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 18, marginBottom: 8 },
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 8, borderRadius: 8 },
  navItemText: { color: "#cbd5e1", fontSize: 13, fontWeight: "700", marginLeft: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 18, borderTopWidth: 1, borderTopColor: "#1e293b" },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: "#111827", borderRadius: 20, padding: 20, width: "100%", maxWidth: 420, borderWidth: 1, borderColor: "#1f2937" },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1f2937", paddingBottom: 10 },
  modalCardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  pillGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  pillBtn: { flex: 1, paddingVertical: 8, alignItems: "center", backgroundColor: "#1e293b", marginHorizontal: 2, borderRadius: 8 },
  activePillBtn: { backgroundColor: "#0284c7" },
  pillBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activePillBtnText: { color: "#ffffff" },
  textInputStyle: { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 12, height: 44, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
  dualInputRow: { flexDirection: "row", justifyContent: "space-between" },
  checkboxWrapper: { flexDirection: "row", alignItems: "center", marginTop: 14, marginBottom: 6 },
  checkboxSquare: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#0284c7", justifyContent: "center", alignItems: "center", marginRight: 8 },
  checkboxSquareActive: { backgroundColor: "#0284c7" },
  checkboxLabel: { color: "#f8fafc", fontSize: 11, fontWeight: "700" },
  toggleRowContainer: { flexDirection: "row", backgroundColor: "#1e293b", padding: 3, borderRadius: 10, marginBottom: 10 },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  creditActiveToggle: { backgroundColor: "#059669" },
  debitActiveToggle: { backgroundColor: "#dc2626" },
  toggleBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "800" },
  activeToggleText: { color: "#ffffff" },
  primaryActionBtn: { backgroundColor: "#0284c7", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default SuperAdminDashboard;