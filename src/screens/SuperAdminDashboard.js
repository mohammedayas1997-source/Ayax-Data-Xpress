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
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ALL_SYSTEM_SERVICES = [
  // NIMC Printing
  { key: "standardSlip", categoryKey: "nimc", name: "NIMC Standard Slip", category: "NIMC Printing", icon: "file-alt", defaultFee: 500 },
  { key: "premiumCard", categoryKey: "nimc", name: "NIMC Premium Card", category: "NIMC Printing", icon: "id-card", defaultFee: 1500 },
  { key: "basicSlip", categoryKey: "nimc", name: "NIMC Basic Slip", category: "NIMC Printing", icon: "print", defaultFee: 300 },
  { key: "nin", categoryKey: "nimc", name: "NIN Verification Lookup", category: "NIMC Printing", icon: "fingerprint", defaultFee: 200 },
  { key: "phone", categoryKey: "nimc", name: "NIMC Phone Search", category: "NIMC Printing", icon: "phone-alt", defaultFee: 500 },
  { key: "trackingId", categoryKey: "nimc", name: "Tracking ID Search", category: "NIMC Printing", icon: "barcode", defaultFee: 500 },

  // NIMC Modification
  { key: "mod_name", categoryKey: "nimc", name: "Modification: Name Correction", category: "NIMC Modification", icon: "user-edit", defaultFee: 2500 },
  { key: "mod_phone", categoryKey: "nimc", name: "Modification: Phone Update", category: "NIMC Modification", icon: "mobile-alt", defaultFee: 2000 },
  { key: "mod_dob", categoryKey: "nimc", name: "Modification: Date of Birth", category: "NIMC Modification", icon: "calendar-alt", defaultFee: 3000 },
  { key: "mod_address", categoryKey: "nimc", name: "Modification: Address Details", category: "NIMC Modification", icon: "map-marker-alt", defaultFee: 1500 },

  // NIN Validation
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
  const [dataPlansList, setDataPlansList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [pendingRefundsList, setPendingRefundsList] = useState([]);
  const [companyActivities, setCompanyActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs: 'overview', 'targets', 'refunds', 'tariffs', 'plans', 'users', 'history'
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [selectedTariffCategory, setSelectedTariffCategory] = useState("All");
  const [tariffSearch, setTariffSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 310 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Master Modals
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [dispatchModalVisible, setDispatchModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [purgeModalVisible, setPurgeModalVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [planManagerModalVisible, setPlanManagerModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form States - Create User & Staff
  const [newFirstName, setNewFirstName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Password123@");
  const [newRole, setNewRole] = useState("agent");
  const [newState, setNewState] = useState("Kano");
  const [newLga, setNewLga] = useState("Ajingi");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [newInitialBalance, setNewInitialBalance] = useState("0");

  // Form States - Others
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

  const [targetSupervisorId, setTargetSupervisorId] = useState("");
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Data Plan Manager State
  const [editingPlanId, setEditingPlanId] = useState(null);
  const [planNetwork, setPlanNetwork] = useState("MTN");
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planUserPrice, setPlanUserPrice] = useState("");
  const [planAgentPrice, setPlanAgentPrice] = useState("");
  const [planCostPrice, setPlanCostPrice] = useState("");
  const [planValidity, setPlanValidity] = useState("30");

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
        toValue: -sidebarWidth,
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

      // Kwaso dukkan sassan tsarin kamfani ta hanyar kofofin SuperAdmin/Admin
      const [telemetryRes, txRes, plansRes, usersRes, refundsRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/superadmin/overview`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/superadmin/stats`, { headers, timeout: 15000 }).catch(() => ({ data: {} }))
        ),
        axios.get(`${BASE_URL}/superadmin/transactions?limit=150`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?limit=150`, { headers, timeout: 15000 }).catch(() => ({ data: { transactions: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/plans`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/plans`, { headers, timeout: 15000 }).catch(() => ({ data: { data: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/users?limit=300`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/users?limit=300`, { headers, timeout: 15000 }).catch(() => ({ data: { users: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/refund-requests`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?status=pending-refund`, { headers, timeout: 15000 }).catch(() => ({ data: { data: [] } }))
        ),
        axios.get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
      ]);

      if (telemetryRes.data?.stats) {
        setStats(telemetryRes.data.stats);
        if (telemetryRes.data.prices) setPrices(telemetryRes.data.prices);
      }

      if (txRes.data?.transactions || txRes.data?.data) {
        setRecentTx(txRes.data.transactions || txRes.data.data || []);
      }

      const fetchedPlans = plansRes.data?.data || plansRes.data?.plans || [];
      setDataPlansList(Array.isArray(fetchedPlans) ? fetchedPlans : []);

      if (usersRes.data?.users || usersRes.data?.data) {
        setAllUsersList(usersRes.data.users || usersRes.data.data || []);
      }

      const pendingRefs = refundsRes.data?.requests || refundsRes.data?.data || refundsRes.data?.transactions || [];
      setPendingRefundsList(Array.isArray(pendingRefs) ? pendingRefs : []);

      if (logsRes.data?.logs) {
        setCompanyActivities(logsRes.data.logs);
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
    }, 10000);
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

  // 1. Direct User & Staff Creation (Appoint NSD, SM, Supervisor, Agent)
  const handleCreateUser = async () => {
    if (!newPhone.trim() || !newFirstName.trim()) {
      return showAlert("Validation Error", "First Name and Phone Number are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const fullName = `${newFirstName.trim()} ${newSurname.trim()}`.trim();
      const payload = {
        firstName: newFirstName.trim(),
        surname: newSurname.trim() || "Staff",
        name: fullName.toUpperCase(),
        phone: newPhone.trim(),
        email: newEmail.trim() || `${newPhone.trim()}@ayaxdata.online`,
        password: newPassword.trim() || "Password123@",
        role: newRole,
        state: newState.trim() || "Kano",
        lga: newLga.trim() || "Ajingi",
        supervisorId: newSupervisorId.trim() || undefined,
        walletBalance: Number(newInitialBalance || 0),
        balance: Number(newInitialBalance || 0),
        pin: "2026",
        transactionPin: "2026",
        isVerified: true,
        isSuspended: false,
        status: "active",
      };

      const res = await axios.post(`${BASE_URL}/superadmin/create-user`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() =>
        axios.post(`${BASE_URL}/auth/register`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert("User Provisioned 🎉", `Account successfully created for ${fullName} as ${newRole.toUpperCase()}.`);
        setCreateUserModalVisible(false);
        setNewFirstName("");
        setNewSurname("");
        setNewPhone("");
        setNewEmail("");
        setNewSupervisorId("");
        setNewInitialBalance("0");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Creation Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Direct Accept / Disburse Refund Request
  const handleApproveRefundRequest = async (item) => {
    const targetId = item._id || item.transactionId;
    const ref = item.reference || item.transactionReference;
    const beneficiary = item.user?.phone || item.user?.email || item.phone || item.recipient;
    const amount = Number(item.amount || item.refundAmount || 0);

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/refunds/approve`,
        {
          transactionId: targetId,
          reference: ref,
          beneficiary: beneficiary,
          refundAmount: amount,
          reason: item.reason || item.refundReason || "SuperAdmin Approved Refund",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() =>
        axios.post(
          `${BASE_URL}/superadmin/refunds/executive-override`,
          {
            targetUserId: beneficiary,
            reference: ref,
            refundAmount: amount,
            reason: "Dispute Resolved by SuperAdmin",
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Refund Executed 💳", `₦${amount.toLocaleString()} has been credited back to ${beneficiary}.`);
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Refund Approval Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Set Global Service Price (Tariff Matrix)
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

      if (res.data?.success || res.status === 200) {
        showAlert("Tariff Deployed", res.data.message || "Pricing updated successfully.");
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

  // 4. Broadcast Real-Time Notification
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
          isBroadcast: !notifTargetUser.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Broadcast Sent 🚀", res.data.message || "Notification delivered.");
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

  // 5. Direct Wallet Balance Adjustment
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

      if (res.data?.success || res.status === 200) {
        showAlert("Ledger Synced", res.data.message || "Wallet adjusted successfully.");
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

  // 6. Executive Refund Override
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

      if (res.data?.success || res.status === 200) {
        showAlert("Executive Refund Executed", res.data.message || "Refund processed.");
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

  // 7. Change User Role (Promote/Demote)
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

      if (res.data?.success || res.status === 200) {
        showAlert("Role Updated", res.data.message || "User role modified.");
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

  // 8. Security Credential Override
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

      if (res.data?.success || res.status === 200) {
        showAlert("Credentials Reset", res.data.message || "Security credentials updated.");
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

  // 9. Lock / Unlock Account
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

      if (res.data?.success || res.status === 200) {
        showAlert("Security State Changed", res.data.message || "Account state toggled.");
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

  // 10. Assign Field Targets
  const handleAssignTarget = async () => {
    if (!targetSupervisorId.trim() || !targetAgentGoal || !targetDataGoal) {
      return showAlert("Validation Error", "Supervisor identifier and goals are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/assign-target`,
        {
          supervisorId: targetSupervisorId.trim(),
          agentGoal: Number(targetAgentGoal),
          dataGoal: Number(targetDataGoal),
          month: targetMonth.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Target Deployed 🎯", res.data.message || "Targets allocated successfully.");
        setTargetModalVisible(false);
        setTargetSupervisorId("");
      }
    } catch (err) {
      showAlert("Target Assignment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 11. Save or Edit Data Plan Package
  const handleSaveDataPlan = async () => {
    if (!planCode.trim() || !planUserPrice || isNaN(Number(planUserPrice))) {
      return showAlert("Validation Error", "Plan Code and User Selling Price are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const planPayload = {
        network: planNetwork,
        name: planName.trim() || `${planNetwork} ${planCode}`,
        planCode: planCode.trim(),
        userPrice: Number(planUserPrice),
        agentPrice: Number(planAgentPrice || planUserPrice),
        costPrice: Number(planCostPrice || 0),
        validity: planValidity.trim() || "30",
        isActive: true,
      };

      let res;
      if (editingPlanId) {
        res = await axios.put(`${BASE_URL}/superadmin/plans/${editingPlanId}`, planPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        res = await axios.post(`${BASE_URL}/superadmin/set-plan`, planPayload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      if (res.data?.success || res.status === 200) {
        showAlert("Plan Matrix Saved", res.data.message || "Data plan updated successfully.");
        setPlanManagerModalVisible(false);
        setEditingPlanId(null);
        setPlanName("");
        setPlanCode("");
        setPlanUserPrice("");
        setPlanAgentPrice("");
        setPlanCostPrice("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Plan Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 12. Delete Data Plan
  const handleDeleteDataPlan = async (planId) => {
    if (!planId) return;
    const confirmDelete = Platform.OS === "web"
      ? window.confirm("Are you sure you want to delete this data plan permanently?")
      : true;

    if (!confirmDelete) return;

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.delete(`${BASE_URL}/superadmin/plans/${planId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data?.success || res.status === 200) {
        showAlert("Plan Expunged", "Data package deleted successfully.");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Delete Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 13. Bulk Marketing Data Dispatch
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

      if (res.data?.success || res.status === 200) {
        showAlert("Campaign Queued", res.data.message || "Bulk dispatch queued.");
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

  // 14. Prune Audit Trail
  const handleExecuteAuditPurge = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.delete(`${BASE_URL}/superadmin/logs/expunge`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { retentionDays: Number(purgeDays) },
      });

      if (res.data?.success || res.status === 200) {
        showAlert("Forensic Clean Complete", res.data.message || "Audit trail pruned.");
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

  const filteredUsers = allUsersList.filter((u) => {
    const roleMatch = userRoleFilter === "all" || (u.role || "user").toLowerCase() === userRoleFilter.toLowerCase();
    const q = userSearchQuery.toLowerCase();
    const nameMatch = (u.name || `${u.firstName || ""} ${u.surname || ""}`).toLowerCase().includes(q);
    const phoneMatch = (u.phone || "").includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    return roleMatch && (nameMatch || phoneMatch || emailMatch);
  });

  // Hierarchy Lists for Target Tracing
  const hierarchyStaffList = allUsersList.filter((u) => {
    const r = (u.role || "").toLowerCase();
    return (
      r === "national_sales_director" ||
      r === "super_leader" ||
      r === "state_manager" ||
      r === "leader" ||
      r === "supervisor" ||
      r === "field_supervisor" ||
      r === "agent"
    );
  });

  const openActionModal = (actionKey) => {
    toggleSidebar(false);
    switch (actionKey) {
      case "create_user":
        setCreateUserModalVisible(true);
        break;
      case "notify":
        setNotificationModalVisible(true);
        break;
      case "wallet":
        setWalletModalVisible(true);
        break;
      case "refund":
        setRefundModalVisible(true);
        break;
      case "role":
        setRoleModalVisible(true);
        break;
      case "security":
        setPasswordModalVisible(true);
        break;
      case "lock":
        setLockModalVisible(true);
        break;
      case "dispatch":
        setDispatchModalVisible(true);
        break;
      case "target":
        setTargetModalVisible(true);
        break;
      case "plans":
        setEditingPlanId(null);
        setPlanManagerModalVisible(true);
        break;
      case "purge":
        setPurgeModalVisible(true);
        break;
      default:
        break;
    }
  };

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
            onPress={() => setCreateUserModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#00f0ff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setNotificationModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications" size={17} color="#00f0ff" />
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
          <Feather name="grid" size={12} color={activeMainTab === "overview" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "overview" && styles.mainNavTabTextActive]}>
            Overview
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "targets" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("targets")}
        >
          <FontAwesome5 name="bullseye" size={12} color={activeMainTab === "targets" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "targets" && styles.mainNavTabTextActive]}>
            Target Tracer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "refunds" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("refunds")}
        >
          <MaterialIcons name="replay" size={13} color={activeMainTab === "refunds" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "refunds" && styles.mainNavTabTextActive]}>
            Refunds ({pendingRefundsList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "users" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("users")}
        >
          <FontAwesome5 name="users-cog" size={12} color={activeMainTab === "users" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "users" && styles.mainNavTabTextActive]}>
            Staff ({allUsersList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "tariffs" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("tariffs")}
        >
          <MaterialIcons name="tune" size={13} color={activeMainTab === "tariffs" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "tariffs" && styles.mainNavTabTextActive]}>
            Tariffs
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "history" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("history")}
        >
          <Feather name="activity" size={12} color={activeMainTab === "history" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "history" && styles.mainNavTabTextActive]}>
            Audit Log
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
        <View style={styles.contentCenterWrapper}>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeMainTab === "overview" && (
            <View style={styles.tabWrapper}>
              {/* Financial Telemetry */}
              <View style={styles.telemetrySection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>REAL-TIME COMPANY FINANCIAL TELEMETRY</Text>
                  <View style={styles.liveBadge}>
                    <View style={[styles.livePulseDot, { backgroundColor: "#10b981" }]} />
                    <Text style={styles.liveBadgeText}>
                      GATEWAY: {stats?.gatewayBalance ? `₦${stats.gatewayBalance}` : "LIVE SYNC"}
                    </Text>
                  </View>
                </View>

                <View style={styles.metricGrid}>
                  <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Total Company Revenue</Text>
                      <Ionicons name="cash" size={18} color="#10b981" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#10b981" }]}>
                      ₦{Number(stats?.totalRevenue || stats?.revenue || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.metricSub}>{recentTx.length} System Transactions</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(0, 240, 255, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Total User Wallet Balance</Text>
                      <Ionicons name="wallet" size={18} color="#00f0ff" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#00f0ff" }]}>
                      ₦{Number(stats?.totalWalletLiabilities || stats?.totalUserBalance || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.metricSub}>Floating Float Capital</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Pending Refunds Queue</Text>
                      <Ionicons name="alert-circle" size={18} color="#f87171" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#f87171" }]}>
                      {pendingRefundsList.length || stats?.pendingRefunds || 0}
                    </Text>
                    <Text style={styles.metricSub}>Actionable Dispute Tickets</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Total Registered Entities</Text>
                      <Ionicons name="people" size={18} color="#c084fc" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                      {allUsersList.length || stats?.totalUsers || 0}
                    </Text>
                    <Text style={styles.metricSub}>NSD • SM • Supervisors • Agents</Text>
                  </View>
                </View>
              </View>

              {/* Supreme Command Modules */}
              <View style={styles.actionsSection}>
                <Text style={styles.sectionHeaderLabel}>ROOT EXECUTIVE COMMAND ACTIONS</Text>

                <TouchableOpacity
                  style={[styles.commandTile, { borderColor: "rgba(0, 240, 255, 0.4)" }]}
                  activeOpacity={0.8}
                  onPress={() => setCreateUserModalVisible(true)}
                >
                  <View style={[styles.tileIconContainer, { backgroundColor: "#0284c7" }]}>
                    <Ionicons name="person-add" size={20} color="#ffffff" />
                  </View>
                  <View style={styles.tileInfo}>
                    <Text style={[styles.tileTitle, { color: "#00f0ff" }]}>
                      Create User & Appoint Staff (NSD, SM, Supervisor)
                    </Text>
                    <Text style={styles.tileDescription}>
                      Directly provision database accounts and assign administrative roles.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandTile, { borderColor: "rgba(239, 68, 68, 0.4)" }]}
                  activeOpacity={0.8}
                  onPress={() => setActiveMainTab("refunds")}
                >
                  <View style={[styles.tileIconContainer, { backgroundColor: "#dc2626" }]}>
                    <Ionicons name="refresh-circle" size={24} color="#ffffff" />
                  </View>
                  <View style={styles.tileInfo}>
                    <Text style={[styles.tileTitle, { color: "#f87171" }]}>
                      Process Live Refund Requests ({pendingRefundsList.length})
                    </Text>
                    <Text style={styles.tileDescription}>
                      Review escalated customer disputes and credit wallet balances in real-time.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.commandTile, { borderColor: "rgba(16, 185, 129, 0.4)" }]}
                  activeOpacity={0.8}
                  onPress={() => setActiveMainTab("targets")}
                >
                  <View style={[styles.tileIconContainer, { backgroundColor: "#059669" }]}>
                    <FontAwesome5 name="bullseye" size={18} color="#ffffff" />
                  </View>
                  <View style={styles.tileInfo}>
                    <Text style={[styles.tileTitle, { color: "#10b981" }]}>
                      Field Targets & Quotas Tracker (NSD, SM, FS, Agents)
                    </Text>
                    <Text style={styles.tileDescription}>
                      Monitor live data quotas, agent recruitment goals, and regional progress.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.commandTile}
                  activeOpacity={0.8}
                  onPress={() => setNotificationModalVisible(true)}
                >
                  <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
                    <Ionicons name="megaphone" size={20} color="#ffffff" />
                  </View>
                  <View style={styles.tileInfo}>
                    <Text style={styles.tileTitle}>Broadcast Live Notification & Directives</Text>
                    <Text style={styles.tileDescription}>
                      Transmit instant announcements and instructions to staff and users.
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* TAB 2: LIVE FIELD TARGET TRACER */}
          {activeMainTab === "targets" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>FIELD HIERARCHY TARGETS & PERFORMANCE</Text>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => setTargetModalVisible(true)}
                  >
                    <Ionicons name="add-circle" size={16} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>ASSIGN TARGET</Text>
                  </TouchableOpacity>
                </View>

                {hierarchyStaffList.length > 0 ? (
                  hierarchyStaffList.map((st) => {
                    const r = (st.role || "agent").toUpperCase();
                    const currentData = Number(st.currentSalesGB || st.dataSoldGB || st.salesVolume || 0);
                    const targetData = Number(st.targets?.dataGoal || st.targetDataGB || 500);
                    const percent = Math.min(Math.round((currentData / (targetData || 1)) * 100), 100);

                    return (
                      <View key={st._id || st.id} style={styles.targetTracerCard}>
                        <View style={styles.targetHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.targetStaffName}>
                              {st.name || `${st.firstName || ""} ${st.surname || ""}`}
                            </Text>
                            <Text style={styles.targetStaffRole}>
                              ROLE: <Text style={{ color: "#00f0ff", fontWeight: "900" }}>{r}</Text> • 📞 {st.phone}
                            </Text>
                            {st.state && (
                              <Text style={styles.targetStaffLocation}>
                                📍 {st.state} {st.lga ? `(${st.lga} LGA)` : ""}
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.targetPercentText}>{percent}%</Text>
                            <Text style={styles.targetPercentSub}>Achieved</Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View style={styles.progressBarTrack}>
                          <View style={[styles.progressBarFill, { width: `${percent}%` }]} />
                        </View>

                        <View style={styles.targetFooterRow}>
                          <Text style={styles.targetFooterText}>
                            Data Sold: <Text style={{ color: "#10b981", fontWeight: "bold" }}>{currentData} GB</Text> / {targetData} GB
                          </Text>
                          <TouchableOpacity
                            onPress={() => {
                              setTargetSupervisorId(st.phone || st._id);
                              setTargetModalVisible(true);
                            }}
                          >
                            <Text style={styles.targetAdjustLink}>Modify Target</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <FontAwesome5 name="bullseye" size={36} color="#475569" />
                    <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      No staff members available for target tracking.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: LIVE REFUND DISPUTE QUEUE */}
          {activeMainTab === "refunds" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>PENDING REFUND REQUESTS QUEUE</Text>
                  <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "900" }}>
                    {pendingRefundsList.length} ACTION REQUIRED
                  </Text>
                </View>

                {pendingRefundsList.length > 0 ? (
                  pendingRefundsList.map((item, idx) => {
                    const beneficiary = item.user?.phone || item.user?.email || item.phone || item.recipient || "Subscriber";
                    const amount = Number(item.amount || item.refundAmount || 0);
                    const ref = item.reference || item.transactionReference || item._id;

                    return (
                      <View key={item._id || idx.toString()} style={styles.refundQueueCard}>
                        <View style={styles.refundQueueTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.refundQueueBeneficiary}>👤 {beneficiary}</Text>
                            <Text style={styles.refundQueueRef}>Ref: {ref}</Text>
                            <Text style={styles.refundQueueReason}>
                              Reason: <Text style={{ color: "#f8fafc" }}>{item.reason || item.refundReason || "Debited without value"}</Text>
                            </Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.refundQueueAmount}>₦{amount.toLocaleString()}</Text>
                            <Text style={styles.refundQueueStatus}>PENDING APPROVAL</Text>
                          </View>
                        </View>

                        <View style={styles.refundQueueActionsRow}>
                          <TouchableOpacity
                            style={styles.approveRefundBtn}
                            onPress={() => handleApproveRefundRequest(item)}
                            disabled={actionLoading}
                          >
                            <Ionicons name="checkmark-circle" size={15} color="#ffffff" />
                            <Text style={styles.approveRefundBtnText}>APPROVE & REFUND WALLET</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <Ionicons name="checkmark-done-circle-outline" size={40} color="#10b981" />
                    <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      No pending refund disputes. All customer tickets are clear!
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 4: ALL COMPANY STAFF & USERS DIRECTORATE */}
          {activeMainTab === "users" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>COMPANY USERS & STAFF DIRECTORATE</Text>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => setCreateUserModalVisible(true)}
                  >
                    <Ionicons name="person-add" size={15} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>CREATE USER</Text>
                  </TouchableOpacity>
                </View>

                {/* Role Filter Pills */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {["all", "national_sales_director", "state_manager", "supervisor", "agent", "user", "admin", "support"].map((roleKey) => (
                    <TouchableOpacity
                      key={roleKey}
                      style={[styles.categoryTab, userRoleFilter === roleKey && styles.categoryTabActive]}
                      onPress={() => setUserRoleFilter(roleKey)}
                    >
                      <Text style={[styles.categoryTabText, userRoleFilter === roleKey && styles.categoryTabTextActive]}>
                        {roleKey === "all" ? "ALL ROLES" : roleKey.replace(/_/g, " ").toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* User Search Bar */}
                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search staff or user by name, phone, email, or role..."
                    placeholderTextColor="#64748b"
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                  />
                </View>

                {filteredUsers.length > 0 ? (
                  filteredUsers.map((item) => {
                    const uName = item.name || `${item.firstName || ""} ${item.surname || ""}`.trim() || "User Node";
                    const uRole = (item.role || "user").toUpperCase();
                    const isSuspended = Boolean(item.isSuspended);

                    return (
                      <View key={item._id || item.id} style={styles.userEntityCard}>
                        <View style={styles.userEntityTop}>
                          <View style={styles.userAvatarBox}>
                            <FontAwesome5
                              name={uRole.includes("DIRECTOR") || uRole.includes("MANAGER") ? "crown" : uRole.includes("SUPERVISOR") ? "user-tie" : uRole === "AGENT" ? "store" : "user"}
                              size={15}
                              color="#00f0ff"
                            />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.userEntityName}>{uName}</Text>
                            <Text style={styles.userEntitySub}>
                              📞 {item.phone || "No phone"} • ✉️ {item.email || "No email"}
                            </Text>
                            {item.state && (
                              <Text style={styles.userEntityLocation}>
                                📍 {item.state} {item.lga ? `(${item.lga} LGA)` : ""}
                              </Text>
                            )}
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <View style={[styles.roleBadge, { backgroundColor: isSuspended ? "#7f1d1d" : "rgba(0, 240, 255, 0.15)" }]}>
                              <Text style={[styles.roleBadgeText, { color: isSuspended ? "#fca5a5" : "#00f0ff" }]}>
                                {isSuspended ? "SUSPENDED" : uRole}
                              </Text>
                            </View>
                            <Text style={styles.userWalletBalance}>
                              ₦{Number(item.walletBalance || item.balance || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>

                        {/* Fast Actions Bar on User */}
                        <View style={styles.userEntityActionsRow}>
                          <TouchableOpacity
                            style={styles.userEntityActionBtn}
                            onPress={() => {
                              setWalletUserId(item.phone || item._id);
                              setWalletModalVisible(true);
                            }}
                          >
                            <Ionicons name="wallet-outline" size={13} color="#10b981" />
                            <Text style={[styles.userEntityActionText, { color: "#10b981" }]}>Adjust Wallet</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.userEntityActionBtn}
                            onPress={() => {
                              setRoleUserId(item.phone || item._id);
                              setSelectedRole((item.role || "agent").toLowerCase());
                              setRoleModalVisible(true);
                            }}
                          >
                            <MaterialCommunityIcons name="account-convert" size={14} color="#a78bfa" />
                            <Text style={[styles.userEntityActionText, { color: "#a78bfa" }]}>Role</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.userEntityActionBtn}
                            onPress={() => {
                              setPwdUserId(item.phone || item._id);
                              setPasswordModalVisible(true);
                            }}
                          >
                            <MaterialIcons name="lock-reset" size={14} color="#818cf8" />
                            <Text style={[styles.userEntityActionText, { color: "#818cf8" }]}>Security</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.userEntityActionBtn}
                            onPress={() => {
                              setLockUserId(item.phone || item._id);
                              setLockModalVisible(true);
                            }}
                          >
                            <MaterialIcons name="block" size={13} color={isSuspended ? "#10b981" : "#f87171"} />
                            <Text style={[styles.userEntityActionText, { color: isSuspended ? "#10b981" : "#f87171" }]}>
                              {isSuspended ? "Unfreeze" : "Suspend"}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <FontAwesome5 name="user-slash" size={36} color="#475569" />
                    <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      No user accounts found matching this criteria.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 5: TARIFF CONFIGURATION MATRIX */}
          {activeMainTab === "tariffs" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <Text style={styles.sectionHeaderLabel}>SERVICE TARIFF CONFIGURATION MATRIX</Text>

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

          {/* TAB 6: AUDIT & ALL COMPANY TRANSACTIONS */}
          {activeMainTab === "history" && (
            <View style={styles.tabWrapper}>
              <View style={styles.historyTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>ALL COMPANY TRANSACTIONS & AUDIT STREAM</Text>
                  <Text style={{ color: "#00f0ff", fontSize: 11, fontWeight: "bold" }}>
                    {recentTx.length} TRANSACTIONS
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
        </View>
      </ScrollView>

      {/* FULL SIDEBAR */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => toggleSidebar(false)}
        >
          <Animated.View
            style={[styles.sidebarContainer, { width: sidebarWidth, transform: [{ translateX: sidebarAnim }] }]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandRow}>
                <MaterialCommunityIcons name="shield-crown" size={28} color="#f59e0b" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>Ayax Supreme</Text>
                  <Text style={styles.sidebarRoleText}>Root SuperAdmin Control</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)} style={styles.sidebarCloseBtn}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sidebarNavList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Text style={styles.sidebarCategory}>NAVIGATION PANELS</Text>

              <TouchableOpacity
                style={[styles.navItem, activeMainTab === "overview" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("overview");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(0, 240, 255, 0.1)" }]}>
                  <Feather name="grid" size={17} color="#00f0ff" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "overview" && { color: "#00f0ff" }]}>
                  Master Overview
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeMainTab === "targets" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("targets");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <FontAwesome5 name="bullseye" size={15} color="#10b981" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "targets" && { color: "#00f0ff" }]}>
                  Field Targets Tracer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeMainTab === "refunds" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("refunds");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                  <MaterialIcons name="replay" size={17} color="#f87171" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "refunds" && { color: "#00f0ff" }]}>
                  Refund Queue ({pendingRefundsList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeMainTab === "users" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("users");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(124, 58, 237, 0.2)" }]}>
                  <FontAwesome5 name="users" size={15} color="#a78bfa" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "users" && { color: "#00f0ff" }]}>
                  All Staff & Entities
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>CREATION & APPOINTMENTS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("create_user")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}>
                  <Ionicons name="person-add" size={16} color="#00f0ff" />
                </View>
                <Text style={[styles.navItemText, { color: "#00f0ff" }]}>Create User & Staff</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("role")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(124, 58, 237, 0.2)" }]}>
                  <MaterialCommunityIcons name="account-convert" size={18} color="#a78bfa" />
                </View>
                <Text style={styles.navItemText}>Promote / Change Role</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FINANCIAL OPERATIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("wallet")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="wallet-outline" size={18} color="#10b981" />
                </View>
                <Text style={styles.navItemText}>Direct Ledger (Credit/Debit)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("refund")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(239, 68, 68, 0.15)" }]}>
                  <Ionicons name="refresh-circle-outline" size={20} color="#f87171" />
                </View>
                <Text style={[styles.navItemText, { color: "#f87171" }]}>
                  Executive Refund Override
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>COMMUNICATION & SECURITY</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("notify")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(2, 132, 199, 0.2)" }]}>
                  <Ionicons name="megaphone-outline" size={18} color="#38bdf8" />
                </View>
                <Text style={styles.navItemText}>Broadcast Push Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("security")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(79, 70, 229, 0.2)" }]}>
                  <MaterialIcons name="lock-reset" size={18} color="#818cf8" />
                </View>
                <Text style={styles.navItemText}>Force-Reset Credentials</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => openActionModal("lock")}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(185, 28, 28, 0.2)" }]}>
                  <MaterialIcons name="block" size={18} color="#fca5a5" />
                </View>
                <Text style={styles.navItemText}>Freeze / Unlock Account</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 0: CREATE USER & APPOINT STAFF */}
      <Modal visible={createUserModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Provision Database User / Staff</Text>
                <Text style={styles.modalCardSubtitle}>Create account & appoint role with full DB sync</Text>
              </View>
              <TouchableOpacity onPress={() => setCreateUserModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>FIRST NAME *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Aliyu"
                    placeholderTextColor="#64748b"
                    value={newFirstName}
                    onChangeText={setNewFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>SURNAME</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Ibrahim"
                    placeholderTextColor="#64748b"
                    value={newSurname}
                    onChangeText={setNewSurname}
                  />
                </View>
              </View>

              <Text style={styles.formFieldLabel}>PHONE NUMBER *</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08012345678"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. user@ayaxdata.online"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.formFieldLabel}>APPOINT ROLE</Text>
              <View style={styles.pillGrid}>
                {[
                  { key: "agent", label: "Agent" },
                  { key: "supervisor", label: "Supervisor" },
                  { key: "state_manager", label: "State Manager" },
                  { key: "national_sales_director", label: "NSD" },
                  { key: "support", label: "Support" },
                  { key: "admin", label: "Admin" },
                  { key: "user", label: "Customer" },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.pillBtn, newRole === r.key && styles.activePillBtn]}
                    onPress={() => setNewRole(r.key)}
                  >
                    <Text style={[styles.pillBtnText, newRole === r.key && styles.activePillBtnText]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>STATE</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Kano"
                    placeholderTextColor="#64748b"
                    value={newState}
                    onChangeText={setNewState}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>LGA</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Ajingi"
                    placeholderTextColor="#64748b"
                    value={newLga}
                    onChangeText={setNewLga}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>PASSWORD</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="Password123@"
                    placeholderTextColor="#64748b"
                    value={newPassword}
                    onChangeText={setNewPassword}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>INITIAL WALLET (₦)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="0"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={newInitialBalance}
                    onChangeText={setNewInitialBalance}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleCreateUser}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>PROVISION & SAVE IN DATABASE</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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

      {/* MODAL 2: ASSIGN FIELD TARGET */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Assign Monthly Targets</Text>
                <Text style={styles.modalCardSubtitle}>Set quota targets for field leaders & supervisors</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>STAFF ID, PHONE, OR EMAIL</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409 or sup@gmail.com"
              placeholderTextColor="#64748b"
              value={targetSupervisorId}
              onChangeText={setTargetSupervisorId}
            />

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.formFieldLabel}>AGENT GOAL (COUNT)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 10"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={targetAgentGoal}
                  onChangeText={setTargetAgentGoal}
                />
              </View>

              <View style={{ flex: 1, marginLeft: 8 }}>
                <Text style={styles.formFieldLabel}>DATA GOAL (GB)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="e.g. 500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={targetDataGoal}
                  onChangeText={setTargetDataGoal}
                />
              </View>
            </View>

            <Text style={styles.formFieldLabel}>TARGET MONTH</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. August 2026"
              placeholderTextColor="#64748b"
              value={targetMonth}
              onChangeText={setTargetMonth}
            />

            <TouchableOpacity
              style={[
                styles.primaryActionBtn,
                { backgroundColor: "#d97706", opacity: actionLoading ? 0.7 : 1 },
              ]}
              onPress={handleAssignTarget}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>DEPLOY MONTHLY TARGET</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: BROADCAST NOTIFICATION */}
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
              placeholder="e.g. Official System Directive"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>BODY MESSAGE</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type your announcement or directive here..."
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
                <Text style={styles.primaryActionBtnText}>DISPATCH NOTIFICATION NOW</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 5: DIRECT WALLET ADJUSTMENT */}
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

      {/* MODAL 7: CHANGE USER ROLE */}
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
              {["agent", "supervisor", "state_manager", "national_sales_director", "support", "admin", "user"].map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.pillBtn, selectedRole === r && styles.activePillBtn]}
                  onPress={() => setSelectedRole(r)}
                >
                  <Text style={[styles.pillBtnText, selectedRole === r && styles.activePillBtnText]}>
                    {r.replace(/_/g, " ").toUpperCase()}
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

      {/* MODAL 8: SECURITY CREDENTIAL OVERRIDE */}
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

            <Text style={styles.formFieldLabel}>NEW TRANSACTION PIN (OPTIONAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="Enter 4-Digit PIN (e.g. 2026)"
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

      {/* MODAL 9: LOCK / UNLOCK ACCOUNT */}
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

            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { flex: 1, marginRight: 6, backgroundColor: "#dc2626" },
                ]}
                onPress={() => handleExecuteToggleLock(true)}
                disabled={actionLoading}
              >
                <Text style={styles.primaryActionBtnText}>FREEZE / SUSPEND</Text>
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
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#050811" },
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
    paddingHorizontal: isLargeScreen ? 32 : 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    zIndex: 10,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    paddingHorizontal: isLargeScreen ? 32 : 4,
  },
  mainNavTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mainNavTabActive: {
    borderBottomColor: "#00f0ff",
  },
  mainNavTabText: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "700",
    marginLeft: 3,
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
    alignItems: "center",
    paddingBottom: 120,
  },
  contentCenterWrapper: {
    width: "100%",
    maxWidth: 1100,
  },
  tabWrapper: {
    width: "100%",
  },
  telemetrySection: { padding: isLargeScreen ? 24 : 16 },
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveBadgeText: { color: "#10b981", fontSize: 9.5, fontWeight: "800", marginLeft: 4 },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
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
  actionsSection: {
    paddingHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 6,
  },
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
  tileInfo: { flex: 1, marginLeft: 14, marginRight: 8 },
  tileTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tileDescription: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },
  tariffTabContainer: { padding: isLargeScreen ? 24 : 16 },
  addPlanHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addPlanHeaderText: { color: "#ffffff", fontSize: 11, fontWeight: "900", marginLeft: 4 },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    paddingHorizontal: 14,
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
    width: 38,
    height: 38,
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
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 6,
  },
  tariffEditBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // Target Tracer Styles
  targetTracerCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  targetHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  targetStaffName: { color: "#f8fafc", fontSize: 14, fontWeight: "900" },
  targetStaffRole: { color: "#64748b", fontSize: 11, marginTop: 2 },
  targetStaffLocation: { color: "#94a3b8", fontSize: 10.5, marginTop: 1 },
  targetPercentText: { color: "#10b981", fontSize: 16, fontWeight: "900" },
  targetPercentSub: { color: "#64748b", fontSize: 9.5 },
  progressBarTrack: {
    height: 7,
    backgroundColor: "#0f172a",
    borderRadius: 4,
    marginVertical: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#00f0ff",
    borderRadius: 4,
  },
  targetFooterRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  targetFooterText: { color: "#94a3b8", fontSize: 11 },
  targetAdjustLink: { color: "#00f0ff", fontSize: 11, fontWeight: "800", textDecorationLine: "underline" },

  // Refund Queue Styles
  refundQueueCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#334155",
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  refundQueueTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  refundQueueBeneficiary: { color: "#f8fafc", fontSize: 13.5, fontWeight: "900" },
  refundQueueRef: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  refundQueueReason: { color: "#f87171", fontSize: 11, marginTop: 4 },
  refundQueueAmount: { color: "#f87171", fontSize: 16, fontWeight: "900" },
  refundQueueStatus: { color: "#f59e0b", fontSize: 9.5, fontWeight: "900", marginTop: 2 },
  refundQueueActionsRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#172033", paddingTop: 8 },
  approveRefundBtn: {
    backgroundColor: "#16a34a",
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  approveRefundBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },

  // Users Directorate Cards
  userEntityCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  userEntityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userAvatarBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  userEntityName: {
    color: "#f8fafc",
    fontSize: 14,
    fontWeight: "800",
  },
  userEntitySub: {
    color: "#64748b",
    fontSize: 11,
    marginTop: 2,
  },
  userEntityLocation: {
    color: "#00f0ff",
    fontSize: 10.5,
    marginTop: 1,
    fontWeight: "700",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  roleBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  userWalletBalance: {
    color: "#10b981",
    fontSize: 13.5,
    fontWeight: "900",
  },
  userEntityActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 8,
  },
  userEntityActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  userEntityActionText: {
    fontSize: 10.5,
    fontWeight: "800",
    marginLeft: 4,
  },

  historyTabContainer: { padding: isLargeScreen ? 24 : 16 },
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
    padding: 40,
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
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 100,
  },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#050811",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#00f0ff", fontSize: 10.5, fontWeight: "700" },
  sidebarCloseBtn: { padding: 4 },
  sidebarNavList: { flex: 1, marginTop: 10 },
  sidebarCategory: {
    color: "#475569",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  navItemActive: {
    backgroundColor: "rgba(0, 240, 255, 0.08)",
  },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemText: { color: "#cbd5e1", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
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
    maxWidth: 480,
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