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

const ALL_NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [prices, setPrices] = useState({});
  const [recentTx, setRecentTx] = useState([]);
  const [dataPlansList, setDataPlansList] = useState([]);
  const [allUsersList, setAllUsersList] = useState([]);
  const [pendingRefundsList, setPendingRefundsList] = useState([]);
  const [selectedRefundIds, setSelectedRefundIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [userRoleFilter, setUserRoleFilter] = useState("all");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 310 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  const [inspectorModalVisible, setInspectorModalVisible] = useState(false);
  const [inspectedEntity, setInspectedEntity] = useState(null);
  const [inspectedType, setInspectedType] = useState("user");

  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [lockModalVisible, setLockModalVisible] = useState(false);
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Transfer Agent States
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferType, setTransferType] = useState("bulk"); // 'bulk' | 'single'
  const [oldSupervisorId, setOldSupervisorId] = useState("");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [transferAgentId, setTransferAgentId] = useState("");

  const [newFirstName, setNewFirstName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Password123@");
  const [newRole, setNewRole] = useState("agent");
  const [newState, setNewState] = useState("Kano");
  const [newLga, setNewLga] = useState("Ajingi");
  const [newSupervisorIdInput, setNewSupervisorIdInput] = useState("");
  const [newInitialBalance, setNewInitialBalance] = useState("0");

  const [notifAudience, setNotifAudience] = useState("all");
  const [notifTargetUser, setNotifTargetUser] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifCategory, setNotifCategory] = useState("ADMIN_BROADCAST");

  const [walletUserId, setWalletUserId] = useState("");
  const [walletAmount, setWalletAmount] = useState("");
  const [walletReason, setWalletReason] = useState("");
  const [walletActionType, setWalletActionType] = useState("credit");

  const [roleUserId, setRoleUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState("agent");

  const [pwdUserId, setPwdUserId] = useState("");
  const [pwdNew, setPwdNew] = useState("");
  const [pinNew, setPinNew] = useState("");

  const [lockUserId, setLockUserId] = useState("");
  const [lockReason, setLockReason] = useState("");

  const [targetStaffId, setTargetStaffId] = useState("");
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("50000");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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
      }).start(() => {
        if (isMounted.current) setSidebarOpen(false);
      });
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

      const [telemetryRes, txRes, plansRes, usersRes, refundsRes] = await Promise.all([
        axios.get(`${BASE_URL}/superadmin/overview`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/superadmin/stats`, { headers, timeout: 15000 }).catch(() => ({ data: {} }))
        ),
        axios.get(`${BASE_URL}/superadmin/transactions?limit=150`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?limit=150`, { headers, timeout: 15000 }).catch(() => ({ data: { transactions: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/plans`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/plans`, { headers, timeout: 15000 }).catch(() => ({ data: { data: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/users?limit=400`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/users?limit=400`, { headers, timeout: 15000 }).catch(() => ({ data: { users: [] } }))
        ),
        axios.get(`${BASE_URL}/superadmin/refund-requests`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?status=pending-refund`, { headers, timeout: 15000 }).catch(() => ({ data: { data: [] } }))
        ),
      ]);

      if (!isMounted.current) return;

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
    } catch (err) {
      if (!isBackground) {
        console.log("Telemetry Sync Notice:", err.response?.data?.message || err.message);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
      const confirmLogout = window.confirm("Terminate the SuperAdmin Administrative Session?");
      if (confirmLogout) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else {
      Alert.alert("Sign Out", "Terminate active SuperAdmin session?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]);
    }
  };

  // REFUND SELECTION & EXECUTION HANDLERS
  const handleToggleSelectAllRefunds = () => {
    if (selectedRefundIds.length === pendingRefundsList.length && pendingRefundsList.length > 0) {
      setSelectedRefundIds([]);
    } else {
      setSelectedRefundIds(pendingRefundsList.map((item) => item._id || item.transactionId || item.id));
    }
  };

  const handleToggleRefundItem = (id) => {
    if (selectedRefundIds.includes(id)) {
      setSelectedRefundIds(selectedRefundIds.filter((item) => item !== id));
    } else {
      setSelectedRefundIds([...selectedRefundIds, id]);
    }
  };

  const handleBatchApproveRefunds = async () => {
    if (selectedRefundIds.length === 0) {
      showAlert("Validation Error", "Please select at least one refund request.");
      return;
    }

    const confirmAction = async () => {
      setActionLoading(true);
      try {
        const token = await AsyncStorage.getItem("userToken");
        const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

        const res = await axios.post(
          `${BASE_URL}/superadmin/refunds/batch-approve`,
          { transactionIds: selectedRefundIds },
          { headers }
        ).catch(async () => {
          // Fallback: approve sequentially if batch endpoint not found
          const selectedItems = pendingRefundsList.filter((item) =>
            selectedRefundIds.includes(item._id || item.transactionId || item.id)
          );
          for (const item of selectedItems) {
            await axios.post(
              `${BASE_URL}/superadmin/refunds/approve`,
              {
                transactionId: item._id || item.transactionId,
                reference: item.reference || item.transactionReference,
                beneficiary: item.user?.phone || item.user?.email || item.phone || item.recipient,
                refundAmount: Number(item.amount || item.refundAmount || 0),
                reason: item.reason || item.refundReason || "SuperAdmin Approved Batch Refund",
              },
              { headers }
            );
          }
          return { data: { success: true, message: `Successfully approved ${selectedRefundIds.length} refunds.` } };
        });

        if (res.data?.success || res.status === 200) {
          showAlert("Batch Refunds Approved", res.data.message || `Processed refund for ${selectedRefundIds.length} tickets.`);
          setSelectedRefundIds([]);
          fetchMasterTelemetry();
        }
      } catch (err) {
        showAlert("Refund Error", err.response?.data?.message || err.message);
      } finally {
        if (isMounted.current) setActionLoading(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to approve and refund ${selectedRefundIds.length} selected accounts?`)) {
        confirmAction();
      }
    } else {
      Alert.alert(
        "Confirm Batch Refund",
        `Are you sure you want to approve and refund ${selectedRefundIds.length} selected accounts?`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Approve All", style: "destructive", onPress: confirmAction },
        ]
      );
    }
  };

  const handleApproveSingleRefund = async (item) => {
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
        showAlert("Refund Executed", `₦${amount.toLocaleString()} has been credited back to ${beneficiary}.`);
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Refund Approval Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  // AGENT TEAM TRANSFER HANDLER
  const handleExecuteAgentTransfer = async () => {
    if (!newSupervisorId.trim()) {
      return showAlert("Validation Error", "Destination Supervisor ID is required.");
    }
    if (transferType === "bulk" && !oldSupervisorId.trim()) {
      return showAlert("Validation Error", "Current/Suspended Supervisor ID is required.");
    }
    if (transferType === "single" && !transferAgentId.trim()) {
      return showAlert("Validation Error", "Agent ID is required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const endpoint =
        transferType === "bulk"
          ? `${BASE_URL}/supervisors/transfer-all-agents`
          : `${BASE_URL}/supervisors/transfer-single-agent`;

      const payload =
        transferType === "bulk"
          ? { oldSupervisorId: oldSupervisorId.trim(), newSupervisorId: newSupervisorId.trim() }
          : { agentId: transferAgentId.trim(), newSupervisorId: newSupervisorId.trim() };

      const res = await axios.post(endpoint, payload, { headers });

      if (res.data?.success) {
        showAlert("Transfer Successful", res.data.message || "Agent reassignment processed.");
        setTransferModalVisible(false);
        setOldSupervisorId("");
        setNewSupervisorId("");
        setTransferAgentId("");
        fetchMasterTelemetry();
      } else {
        showAlert("Transfer Failed", res.data?.message || "Could not complete reassignment.");
      }
    } catch (err) {
      showAlert("Transfer Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

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
        supervisorId: newSupervisorIdInput.trim() || undefined,
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
        showAlert("User Provisioned", `Account created for ${fullName} as ${newRole.toUpperCase()}.`);
        setCreateUserModalVisible(false);
        setNewFirstName("");
        setNewSurname("");
        setNewPhone("");
        setNewEmail("");
        setNewSupervisorIdInput("");
        setNewInitialBalance("0");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Creation Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

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
      if (isMounted.current) setActionLoading(false);
    }
  };

  const handleAssignTarget = async () => {
    if (!targetStaffId.trim() || !targetDataGoal || !targetAgentGoal) {
      return showAlert("Validation Error", "Staff identifier and targets are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/superadmin/assign-target`,
        {
          supervisorId: targetStaffId.trim(),
          userId: targetStaffId.trim(),
          agentGoal: Number(targetAgentGoal),
          dataGoal: Number(targetDataGoal),
          airtimeGoal: Number(targetAirtimeGoal || 0),
          month: targetMonth.trim() || undefined,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Target Deployed", res.data.message || "Targets allocated successfully.");
        setTargetModalVisible(false);
        setTargetStaffId("");
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Target Assignment Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  const handleExecuteRoleChange = async () => {
    if (!roleUserId.trim()) {
      return showAlert("Validation Error", "Target user identifier is required.");
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
      if (isMounted.current) setActionLoading(false);
    }
  };

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
      if (isMounted.current) setActionLoading(false);
    }
  };

  const handleSendBroadcastNotification = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      return showAlert("Validation Error", "Title and Body Message are required.");
    }

    if (notifAudience === "single" && !notifTargetUser.trim()) {
      return showAlert("Validation Error", "Target phone, email or ID is required for direct messaging.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        category: notifCategory,
        audience: notifAudience,
        recipientId: notifAudience === "single" ? notifTargetUser.trim() : null,
        isBroadcast: notifAudience !== "single",
      };

      const res = await axios.post(`${BASE_URL}/superadmin/broadcast-notification`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() =>
        axios.post(`${BASE_URL}/notifications/send`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert("Broadcast Dispatched", res.data.message || "Notification delivered successfully.");
        setNotificationModalVisible(false);
        setNotifTitle("");
        setNotifMessage("");
        setNotifTargetUser("");
        setNotifAudience("all");
      }
    } catch (err) {
      showAlert("Notification Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  const filteredUsers = allUsersList.filter((u) => {
    const roleMatch = userRoleFilter === "all" || (u.role || "user").toLowerCase() === userRoleFilter.toLowerCase();
    const q = userSearchQuery.toLowerCase();
    const nameMatch = (u.name || `${u.firstName || ""} ${u.surname || ""}`).toLowerCase().includes(q);
    const phoneMatch = (u.phone || "").includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    const stateMatch = (u.state || "").toLowerCase().includes(q);
    const lgaMatch = (u.lga || "").toLowerCase().includes(q);
    return roleMatch && (nameMatch || phoneMatch || emailMatch || stateMatch || lgaMatch);
  });

  const nationalDirectorsList = allUsersList.filter((u) => {
    const r = (u.role || "").toLowerCase();
    return r === "national_sales_director" || r === "super_leader";
  });

  const stateManagersList = allUsersList.filter((u) => {
    const r = (u.role || "").toLowerCase();
    return r === "state_manager" || r === "leader";
  });

  const openInspector = (entity, type = "user") => {
    setInspectedEntity(entity);
    setInspectedType(type);
    setInspectorModalVisible(true);
  };

  const openActionModal = (actionKey) => {
    toggleSidebar(false);
    switch (actionKey) {
      case "create_user":
        setCreateUserModalVisible(true);
        break;
      case "transfer":
        setTransferModalVisible(true);
        break;
      case "notify":
        setNotificationModalVisible(true);
        break;
      case "wallet":
        setWalletModalVisible(true);
        break;
      case "target":
        setTargetModalVisible(true);
        break;
      case "role":
        setRoleModalVisible(true);
        break;
      case "security":
        setPasswordModalVisible(true);
        break;
      default:
        break;
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={styles.loaderTitle}>AYAX SUPREME ROOT ENGINE</Text>
        <Text style={styles.loaderText}>Synchronizing National State & Field Telemetry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP BAR */}
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
            onPress={() => setTransferModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="account-switch" size={18} color="#00f0ff" />
          </TouchableOpacity>

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

      {/* NAVIGATION BAR */}
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
          style={[styles.mainNavTab, activeMainTab === "sm_hierarchy" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("sm_hierarchy")}
        >
          <FontAwesome5 name="crown" size={11} color={activeMainTab === "sm_hierarchy" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "sm_hierarchy" && styles.mainNavTabTextActive]}>
            SM & NSD
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeMainTab === "users" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("users")}
        >
          <FontAwesome5 name="users-cog" size={12} color={activeMainTab === "users" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "users" && styles.mainNavTabTextActive]}>
            Directory ({allUsersList.length})
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
          style={[styles.mainNavTab, activeMainTab === "history" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("history")}
        >
          <Feather name="activity" size={12} color={activeMainTab === "history" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "history" && styles.mainNavTabTextActive]}>
            Audit Log
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN BODY */}
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
              <View style={styles.telemetrySection}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>REAL-TIME FINANCIAL TELEMETRY</Text>
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
                      <Text style={styles.metricLabel}>Total Revenue</Text>
                      <Ionicons name="cash" size={18} color="#10b981" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#10b981" }]}>
                      ₦{Number(stats?.totalRevenue || stats?.revenue || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.metricSub}>{recentTx.length} Transactions Logged</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(0, 240, 255, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Wallet Liabilities</Text>
                      <Ionicons name="wallet" size={18} color="#00f0ff" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#00f0ff" }]}>
                      ₦{Number(stats?.totalWalletLiabilities || stats?.totalUserBalance || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.metricSub}>Floating Float Capital</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(239, 68, 68, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Refund Queue</Text>
                      <Ionicons name="alert-circle" size={18} color="#f87171" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#f87171" }]}>
                      {pendingRefundsList.length || stats?.pendingRefunds || 0}
                    </Text>
                    <Text style={styles.metricSub}>Actionable Tickets</Text>
                  </View>

                  <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.3)" }]}>
                    <View style={styles.cardHeaderRow}>
                      <Text style={styles.metricLabel}>Total Accounts</Text>
                      <Ionicons name="people" size={18} color="#c084fc" />
                    </View>
                    <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                      {allUsersList.length || stats?.totalUsers || 0}
                    </Text>
                    <Text style={styles.metricSub}>NSD • SM • Supervisors • Agents</Text>
                  </View>
                </View>
              </View>

              {/* NIGERIAN STATES MATRIX */}
              <View style={styles.statesSection}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>NIGERIAN STATES TARGET & PERFORMANCE MATRIX</Text>
                    <Text style={styles.sectionHeaderSub}>Tap any state to view appointed SM, supervisors & agents</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.miniHeaderActionBtn}
                    onPress={() => setActiveMainTab("sm_hierarchy")}
                  >
                    <Text style={styles.miniHeaderActionText}>VIEW ALL SMs</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.stateCardsGrid}>
                  {ALL_NIGERIAN_STATES.map((stateName) => {
                    const assignedSm = stateManagersList.find(
                      (sm) => (sm.state || "").toLowerCase() === stateName.toLowerCase()
                    );

                    const stateSupervisors = allUsersList.filter(
                      (u) =>
                        ((u.role || "").toLowerCase() === "supervisor" || (u.role || "").toLowerCase() === "field_supervisor") &&
                        (u.state || "").toLowerCase() === stateName.toLowerCase()
                    );

                    const stateAgents = allUsersList.filter(
                      (u) =>
                        (u.role || "").toLowerCase() === "agent" &&
                        (u.state || "").toLowerCase() === stateName.toLowerCase()
                    );

                    const targetDataGB = assignedSm?.targets?.dataGoal || 1000;
                    const achievedDataGB = assignedSm?.currentSalesGB || assignedSm?.dataSoldGB || (stateAgents.length * 45);
                    const targetAirtime = assignedSm?.targets?.airtimeGoal || 100000;
                    const agentsGoal = assignedSm?.targets?.agentGoal || 25;
                    const percent = Math.min(Math.round((achievedDataGB / targetDataGB) * 100), 100);

                    return (
                      <TouchableOpacity
                        key={stateName}
                        style={styles.stateCard}
                        activeOpacity={0.75}
                        onPress={() =>
                          openInspector(
                            {
                              stateName,
                              assignedSm,
                              supervisorsCount: stateSupervisors.length,
                              agentsCount: stateAgents.length,
                              supervisorsList: stateSupervisors,
                              agentsList: stateAgents,
                              targetDataGB,
                              achievedDataGB,
                              targetAirtime,
                              agentsGoal,
                              percent,
                            },
                            "state"
                          )
                        }
                      >
                        <View style={styles.stateCardHeader}>
                          <View style={{ flexDirection: "row", alignItems: "center" }}>
                            <View style={styles.statePinBox}>
                              <Ionicons name="location" size={14} color="#00f0ff" />
                            </View>
                            <View style={{ marginLeft: 8 }}>
                              <Text style={styles.stateNameText}>{stateName}</Text>
                              <Text style={styles.stateSmName}>
                                SM: {assignedSm ? assignedSm.name || `${assignedSm.firstName} ${assignedSm.surname}` : "Vacant / Not Appointed"}
                              </Text>
                            </View>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={[styles.statePercentText, { color: percent >= 70 ? "#10b981" : "#00f0ff" }]}>
                              {percent}%
                            </Text>
                            <Text style={styles.statePercentSub}>Quota</Text>
                          </View>
                        </View>

                        <View style={styles.stateProgressTrack}>
                          <View
                            style={[
                              styles.stateProgressFill,
                              {
                                width: `${percent}%`,
                                backgroundColor: percent >= 70 ? "#10b981" : "#00f0ff",
                              },
                            ]}
                          />
                        </View>

                        <View style={styles.stateCardFooter}>
                          <Text style={styles.stateFootMetric}>
                            Data: <Text style={{ color: "#10b981", fontWeight: "700" }}>{achievedDataGB}GB</Text>/{targetDataGB}GB
                          </Text>
                          <Text style={styles.stateFootMetric}>
                            {stateSupervisors.length} Sup • {stateAgents.length} Agents
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* TAB 2: NATIONAL SALES DIRECTORS & STATE MANAGERS */}
          {activeMainTab === "sm_hierarchy" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>NATIONAL SALES DIRECTORS (NSD) & STATE MANAGERS (SM)</Text>
                    <Text style={styles.sectionHeaderSub}>Tap on any Leader to view assigned quota targets & field supervisors</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => setCreateUserModalVisible(true)}
                  >
                    <Ionicons name="person-add" size={15} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>APPOINT SM / NSD</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.hierarchyCategoryTitle}>NATIONAL SALES DIRECTORS (NSD)</Text>
                {nationalDirectorsList.length > 0 ? (
                  nationalDirectorsList.map((nsd) => (
                    <TouchableOpacity
                      key={nsd._id || nsd.id}
                      style={[styles.smDirectorCard, { borderLeftColor: "#f59e0b" }]}
                      activeOpacity={0.8}
                      onPress={() => openInspector(nsd, "user")}
                    >
                      <View style={styles.smCardTopRow}>
                        <View style={styles.smAvatarCrownBox}>
                          <FontAwesome5 name="crown" size={16} color="#f59e0b" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text style={styles.smDirectorName}>
                            {nsd.name || `${nsd.firstName || ""} ${nsd.surname || ""}`}
                          </Text>
                          <Text style={styles.smDirectorRole}>
                            NATIONAL SALES DIRECTOR • Phone: {nsd.phone}
                          </Text>
                          <Text style={styles.smDirectorEmail}>Email: {nsd.email}</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.smWalletBalText}>
                            ₦{Number(nsd.walletBalance || nsd.balance || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.smWalletBalSub}>Wallet Balance</Text>
                        </View>
                      </View>
                      <View style={styles.smCardFooterRow}>
                        <Text style={styles.smCardFooterText}>
                          Target: {nsd.targets?.dataGoal || 5000}GB Data • {nsd.targets?.agentGoal || 100} Agents
                        </Text>
                        <Text style={styles.smCardInspectLink}>Inspect Profile & Override ➔</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.emptyFeed}>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>No National Sales Directors appointed yet.</Text>
                  </View>
                )}

                <Text style={[styles.hierarchyCategoryTitle, { marginTop: 20 }]}>
                  APPOINTED STATE MANAGERS (SM) ({stateManagersList.length})
                </Text>
                {stateManagersList.length > 0 ? (
                  stateManagersList.map((sm) => {
                    const smSupervisors = allUsersList.filter(
                      (u) =>
                        ((u.role || "").toLowerCase() === "supervisor" || (u.role || "").toLowerCase() === "field_supervisor") &&
                        (u.state || "").toLowerCase() === (sm.state || "").toLowerCase()
                    );
                    const smAgents = allUsersList.filter(
                      (u) =>
                        (u.role || "").toLowerCase() === "agent" &&
                        (u.state || "").toLowerCase() === (sm.state || "").toLowerCase()
                    );

                    return (
                      <TouchableOpacity
                        key={sm._id || sm.id}
                        style={[styles.smDirectorCard, { borderLeftColor: "#00f0ff" }]}
                        activeOpacity={0.8}
                        onPress={() => openInspector(sm, "user")}
                      >
                        <View style={styles.smCardTopRow}>
                          <View style={styles.smAvatarCrownBox}>
                            <FontAwesome5 name="user-tie" size={16} color="#00f0ff" />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.smDirectorName}>
                              {sm.name || `${sm.firstName || ""} ${sm.surname || ""}`}
                            </Text>
                            <Text style={styles.smDirectorRole}>
                              STATE MANAGER ({sm.state ? sm.state.toUpperCase() : "GENERAL"}) • Phone: {sm.phone}
                            </Text>
                            <Text style={styles.smDirectorEmail}>Email: {sm.email}</Text>
                          </View>
                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={styles.smWalletBalText}>
                              ₦{Number(sm.walletBalance || sm.balance || 0).toLocaleString()}
                            </Text>
                            <Text style={styles.smWalletBalSub}>Wallet Balance</Text>
                          </View>
                        </View>
                        <View style={styles.smCardFooterRow}>
                          <Text style={styles.smCardFooterText}>
                            {smSupervisors.length} Supervisors • {smAgents.length} Retail Agents
                          </Text>
                          <Text style={styles.smCardInspectLink}>Inspect State Target ➔</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>No State Managers assigned.</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: DIRECTORY */}
          {activeMainTab === "users" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>ALL COMPANY USERS, AGENTS & SUPERVISORS</Text>
                    <Text style={styles.sectionHeaderSub}>Search any staff or agent to inspect balances, targets & overrides</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => setCreateUserModalVisible(true)}
                  >
                    <Ionicons name="person-add" size={15} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>CREATE USER</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {["all", "agent", "supervisor", "state_manager", "national_sales_director", "support", "admin", "user"].map((roleKey) => (
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

                <View style={styles.searchBar}>
                  <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by Agent name, Phone, Email, State, or LGA..."
                    placeholderTextColor="#64748b"
                    value={userSearchQuery}
                    onChangeText={setUserSearchQuery}
                  />
                  {userSearchQuery ? (
                    <TouchableOpacity onPress={() => setUserSearchQuery("")}>
                      <Ionicons name="close-circle" size={16} color="#64748b" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {filteredUsers.length > 0 ? (
                  filteredUsers.map((item) => {
                    const uName = item.name || `${item.firstName || ""} ${item.surname || ""}`.trim() || "User Node";
                    const uRole = (item.role || "user").toUpperCase();
                    const isSuspended = Boolean(item.isSuspended);

                    return (
                      <TouchableOpacity
                        key={item._id || item.id}
                        style={styles.userEntityCard}
                        activeOpacity={0.8}
                        onPress={() => openInspector(item, "user")}
                      >
                        <View style={styles.userEntityTop}>
                          <View style={styles.userAvatarBox}>
                            <FontAwesome5
                              name={
                                uRole.includes("DIRECTOR") || uRole.includes("MANAGER")
                                  ? "crown"
                                  : uRole.includes("SUPERVISOR")
                                  ? "user-tie"
                                  : uRole === "AGENT"
                                  ? "store"
                                  : "user"
                              }
                              size={15}
                              color="#00f0ff"
                            />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.userEntityName}>{uName}</Text>
                            <Text style={styles.userEntitySub}>
                              Phone: {item.phone || "No phone"} • Email: {item.email || "No email"}
                            </Text>
                            {item.state && (
                              <Text style={styles.userEntityLocation}>
                                Region: {item.state} {item.lga ? `(${item.lga} LGA)` : ""}
                              </Text>
                            )}
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <View
                              style={[
                                styles.roleBadge,
                                { backgroundColor: isSuspended ? "#7f1d1d" : "rgba(0, 240, 255, 0.15)" },
                              ]}
                            >
                              <Text style={[styles.roleBadgeText, { color: isSuspended ? "#fca5a5" : "#00f0ff" }]}>
                                {isSuspended ? "SUSPENDED" : uRole}
                              </Text>
                            </View>
                            <Text style={styles.userWalletBalance}>
                              ₦{Number(item.walletBalance || item.balance || 0).toLocaleString()}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <FontAwesome5 name="user-slash" size={36} color="#475569" />
                    <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      No accounts found matching this search criteria.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 4: BATCH REFUND QUEUE */}
          {activeMainTab === "refunds" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                {/* SELECT ALL & BATCH REFUND TOOLBAR */}
                <View style={styles.bulkRefundToolbar}>
                  <TouchableOpacity
                    style={styles.bulkRefundSelectAllBtn}
                    onPress={handleToggleSelectAllRefunds}
                    activeOpacity={0.8}
                  >
                    <MaterialIcons
                      name={
                        selectedRefundIds.length === pendingRefundsList.length && pendingRefundsList.length > 0
                          ? "check-box"
                          : "check-box-outline-blank"
                      }
                      size={22}
                      color="#00f0ff"
                    />
                    <Text style={styles.bulkRefundSelectAllText}>
                      {selectedRefundIds.length === pendingRefundsList.length && pendingRefundsList.length > 0
                        ? "Deselect All"
                        : `Select All (${selectedRefundIds.length}/${pendingRefundsList.length})`}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.bulkRefundSubmitBtn,
                      selectedRefundIds.length === 0 && { opacity: 0.5 },
                    ]}
                    onPress={handleBatchApproveRefunds}
                    disabled={selectedRefundIds.length === 0 || actionLoading}
                    activeOpacity={0.85}
                  >
                    {actionLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="replay" size={16} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.bulkRefundSubmitBtnText}>
                          Refund Selected ({selectedRefundIds.length})
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>PENDING REFUND REQUESTS QUEUE</Text>
                  <Text style={{ color: "#f87171", fontSize: 11, fontWeight: "900" }}>
                    {pendingRefundsList.length} ACTION REQUIRED
                  </Text>
                </View>

                {pendingRefundsList.length > 0 ? (
                  pendingRefundsList.map((item, idx) => {
                    const id = item._id || item.transactionId || item.id || String(idx);
                    const isChecked = selectedRefundIds.includes(id);
                    const beneficiary = item.user?.phone || item.user?.email || item.phone || item.recipient || "Subscriber";
                    const amount = Number(item.amount || item.refundAmount || 0);
                    const ref = item.reference || item.transactionReference || id;

                    return (
                      <View
                        key={id}
                        style={[
                          styles.refundQueueCard,
                          isChecked && { borderColor: "#00f0ff", backgroundColor: "rgba(0, 240, 255, 0.05)" },
                        ]}
                      >
                        <View style={styles.refundQueueTop}>
                          <TouchableOpacity
                            style={{ marginRight: 10, marginTop: 2 }}
                            onPress={() => handleToggleRefundItem(id)}
                          >
                            <MaterialIcons
                              name={isChecked ? "check-box" : "check-box-outline-blank"}
                              size={24}
                              color={isChecked ? "#00f0ff" : "#64748b"}
                            />
                          </TouchableOpacity>

                          <View style={{ flex: 1 }}>
                            <Text style={styles.refundQueueBeneficiary}>Account: {beneficiary}</Text>
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
                            onPress={() => handleApproveSingleRefund(item)}
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
                      No pending refund disputes. All customer tickets are clear.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 5: AUDIT LOG */}
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
                          <Text style={styles.historyMetaText}>Ref: {tx.reference || tx.transactionId || "N/A"}</Text>
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

      {/* INSPECTOR MODAL */}
      <Modal visible={inspectorModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 580, maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalCardTitle}>
                  {inspectedType === "state"
                    ? `${inspectedEntity?.stateName} State Target & Directorate`
                    : `${inspectedEntity?.name || `${inspectedEntity?.firstName || ""} ${inspectedEntity?.surname || ""}`} Audit Sheet`}
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  {inspectedType === "state"
                    ? "Regional supervisor and agent performance telemetry"
                    : `Role: ${String(inspectedEntity?.role || "user").toUpperCase()} • Administrative Override Terminal`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectorModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              {inspectedType === "state" && inspectedEntity && (
                <View>
                  <View style={styles.inspectorDetailCard}>
                    <Text style={styles.inspectorSectionHeading}>APPOINTED STATE MANAGER</Text>
                    <Text style={styles.inspectorValueText}>
                      Account: {inspectedEntity.assignedSm ? inspectedEntity.assignedSm.name || `${inspectedEntity.assignedSm.firstName} ${inspectedEntity.assignedSm.surname}` : "Vacant / Not Appointed"}
                    </Text>
                    {inspectedEntity.assignedSm && (
                      <>
                        <Text style={styles.inspectorSubText}>Phone: {inspectedEntity.assignedSm.phone}</Text>
                        <Text style={styles.inspectorSubText}>Email: {inspectedEntity.assignedSm.email}</Text>
                        <Text style={styles.inspectorSubText}>
                          SM Float Balance: <Text style={{ color: "#10b981", fontWeight: "bold" }}>₦{Number(inspectedEntity.assignedSm.walletBalance || inspectedEntity.assignedSm.balance || 0).toLocaleString()}</Text>
                        </Text>
                      </>
                    )}
                  </View>

                  <View style={styles.inspectorDetailCard}>
                    <Text style={styles.inspectorSectionHeading}>STATE PERFORMANCE & TARGET METRICS</Text>
                    <Text style={styles.inspectorSubText}>
                      Data Sales: <Text style={{ color: "#00f0ff", fontWeight: "bold" }}>{inspectedEntity.achievedDataGB} GB</Text> / {inspectedEntity.targetDataGB} GB Goal
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Airtime Sales Target: <Text style={{ color: "#10b981", fontWeight: "bold" }}>₦{Number(inspectedEntity.targetAirtime).toLocaleString()}</Text>
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Retail Agents: <Text style={{ color: "#c084fc", fontWeight: "bold" }}>{inspectedEntity.agentsCount}</Text> Active / {inspectedEntity.agentsGoal} Recruited Goal
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Field Supervisors: <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>{inspectedEntity.supervisorsCount}</Text> Assigned
                    </Text>
                  </View>

                  {inspectedEntity.assignedSm && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: "#d97706", marginTop: 8 }]}
                      onPress={() => {
                        setTargetStaffId(inspectedEntity.assignedSm.phone || inspectedEntity.assignedSm._id);
                        setTargetDataGoal(String(inspectedEntity.targetDataGB));
                        setTargetAgentGoal(String(inspectedEntity.agentsGoal));
                        setTargetAirtimeGoal(String(inspectedEntity.targetAirtime));
                        setInspectorModalVisible(false);
                        setTargetModalVisible(true);
                      }}
                    >
                      <Text style={styles.primaryActionBtnText}>ADJUST STATE TARGETS</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {inspectedType === "user" && inspectedEntity && (
                <View>
                  <View style={styles.inspectorDetailCard}>
                    <Text style={styles.inspectorSectionHeading}>FINANCIAL & PROFILE AUDIT</Text>
                    <Text style={styles.inspectorValueText}>
                      Account: {inspectedEntity.name || `${inspectedEntity.firstName || ""} ${inspectedEntity.surname || ""}`}
                    </Text>
                    <Text style={styles.inspectorSubText}>Phone: <Text style={{ color: "#f8fafc", fontWeight: "bold" }}>{inspectedEntity.phone}</Text></Text>
                    <Text style={styles.inspectorSubText}>Email: {inspectedEntity.email}</Text>
                    <Text style={styles.inspectorSubText}>
                      Role: <Text style={{ color: "#00f0ff", fontWeight: "bold" }}>{(inspectedEntity.role || "user").toUpperCase()}</Text>
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Location: {inspectedEntity.state || "Kano"} {inspectedEntity.lga ? `(${inspectedEntity.lga} LGA)` : ""}
                    </Text>
                    <Text style={[styles.inspectorSubText, { fontSize: 14, marginTop: 6 }]}>
                      Live Wallet Balance: <Text style={{ color: "#10b981", fontWeight: "900" }}>₦{Number(inspectedEntity.walletBalance || inspectedEntity.balance || 0).toLocaleString()}</Text>
                    </Text>
                  </View>

                  <View style={styles.inspectorDetailCard}>
                    <Text style={styles.inspectorSectionHeading}>ASSIGNED PERFORMANCE TARGETS</Text>
                    <Text style={styles.inspectorSubText}>
                      Data Quota Goal: <Text style={{ color: "#00f0ff", fontWeight: "bold" }}>{inspectedEntity.targets?.dataGoal || 500} GB</Text>
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Agent Recruitment Goal: <Text style={{ color: "#c084fc", fontWeight: "bold" }}>{inspectedEntity.targets?.agentGoal || 10} Agents</Text>
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Airtime Quota: <Text style={{ color: "#10b981", fontWeight: "bold" }}>₦{Number(inspectedEntity.targets?.airtimeGoal || 0).toLocaleString()}</Text>
                    </Text>
                  </View>

                  <Text style={[styles.formFieldLabel, { marginTop: 10 }]}>EXECUTIVE OVERRIDE COMMANDS</Text>
                  <View style={styles.overrideBtnGrid}>
                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: "#059669" }]}
                      onPress={() => {
                        setWalletUserId(inspectedEntity.phone || inspectedEntity._id);
                        setInspectorModalVisible(false);
                        setWalletModalVisible(true);
                      }}
                    >
                      <Ionicons name="wallet" size={14} color="#fff" />
                      <Text style={styles.overrideBtnText}>Adjust Wallet</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: "#d97706" }]}
                      onPress={() => {
                        setTargetStaffId(inspectedEntity.phone || inspectedEntity._id);
                        setInspectorModalVisible(false);
                        setTargetModalVisible(true);
                      }}
                    >
                      <FontAwesome5 name="bullseye" size={13} color="#fff" />
                      <Text style={styles.overrideBtnText}>Set Target</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: "#7c3aed" }]}
                      onPress={() => {
                        setRoleUserId(inspectedEntity.phone || inspectedEntity._id);
                        setSelectedRole((inspectedEntity.role || "agent").toLowerCase());
                        setInspectorModalVisible(false);
                        setRoleModalVisible(true);
                      }}
                    >
                      <MaterialCommunityIcons name="account-convert" size={15} color="#fff" />
                      <Text style={styles.overrideBtnText}>Change Role</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.overrideBtn, { backgroundColor: "#4f46e5" }]}
                      onPress={() => {
                        setPwdUserId(inspectedEntity.phone || inspectedEntity._id);
                        setInspectorModalVisible(false);
                        setPasswordModalVisible(true);
                      }}
                    >
                      <MaterialIcons name="lock-reset" size={15} color="#fff" />
                      <Text style={styles.overrideBtnText}>Reset Security</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* REASSIGN / AGENT TEAM TRANSFER MODAL */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Reassign Agent Network</Text>
                <Text style={styles.modalCardSubtitle}>
                  Move agents from suspended or terminated supervisor to a new supervisor
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <View style={styles.toggleRowContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, transferType === "bulk" && styles.creditActiveToggle]}
                  onPress={() => setTransferType("bulk")}
                >
                  <Text style={[styles.toggleBtnText, transferType === "bulk" && styles.activeToggleText]}>
                    Entire Team (Bulk)
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, transferType === "single" && styles.debitActiveToggle]}
                  onPress={() => setTransferType("single")}
                >
                  <Text style={[styles.toggleBtnText, transferType === "single" && styles.activeToggleText]}>
                    Single Agent
                  </Text>
                </TouchableOpacity>
              </View>

              {transferType === "bulk" ? (
                <>
                  <Text style={styles.formFieldLabel}>CURRENT/SUSPENDED SUPERVISOR ID *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="Enter current supervisor ID"
                    placeholderTextColor="#64748b"
                    value={oldSupervisorId}
                    onChangeText={setOldSupervisorId}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.formFieldLabel}>AGENT ID TO TRANSFER *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="Enter agent ID"
                    placeholderTextColor="#64748b"
                    value={transferAgentId}
                    onChangeText={setTransferAgentId}
                  />
                </>
              )}

              <Text style={styles.formFieldLabel}>DESTINATION SUPERVISOR ID (NEW LEAD) *</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="Enter new supervisor ID"
                placeholderTextColor="#64748b"
                value={newSupervisorId}
                onChangeText={setNewSupervisorId}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleExecuteAgentTransfer}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="account-switch" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>
                      {transferType === "bulk" ? "AUTHORIZE TEAM REASSIGNMENT" : "REASSIGN AGENT"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* SIDEBAR DRAWER */}
      {sidebarOpen && (
        <TouchableOpacity style={styles.sidebarBackdrop} activeOpacity={1} onPress={() => toggleSidebar(false)}>
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

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.sidebarCategory}>CORE NAVIGATION PANELS</Text>

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
                  Overview & State Targets
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeMainTab === "sm_hierarchy" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("sm_hierarchy");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                  <FontAwesome5 name="crown" size={14} color="#f59e0b" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "sm_hierarchy" && { color: "#00f0ff" }]}>
                  SM & NSD Hierarchy
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
                  <FontAwesome5 name="users" size={14} color="#a78bfa" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "users" && { color: "#00f0ff" }]}>
                  User & Agent Directory
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

              <Text style={styles.sidebarCategory}>CREATION & REASSIGNMENT</Text>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("transfer")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}>
                  <MaterialCommunityIcons name="account-switch" size={18} color="#00f0ff" />
                </View>
                <Text style={[styles.navItemText, { color: "#00f0ff" }]}>Reassign Agent Network</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("create_user")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(0, 240, 255, 0.15)" }]}>
                  <Ionicons name="person-add" size={16} color="#00f0ff" />
                </View>
                <Text style={styles.navItemText}>Create User / Appoint Staff</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("role")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(124, 58, 237, 0.2)" }]}>
                  <MaterialCommunityIcons name="account-convert" size={18} color="#a78bfa" />
                </View>
                <Text style={styles.navItemText}>Promote / Change Role</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FINANCIAL OPERATIONS</Text>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("wallet")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="wallet-outline" size={18} color="#10b981" />
                </View>
                <Text style={styles.navItemText}>Direct Ledger (Credit/Debit)</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("target")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(217, 119, 6, 0.2)" }]}>
                  <FontAwesome5 name="bullseye" size={15} color="#fbbf24" />
                </View>
                <Text style={styles.navItemText}>Deploy Target & Goals</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>SECURITY & COMMUNICATION</Text>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("notify")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(2, 132, 199, 0.2)" }]}>
                  <Ionicons name="megaphone-outline" size={18} color="#38bdf8" />
                </View>
                <Text style={styles.navItemText}>Broadcast Push Alert</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("security")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(79, 70, 229, 0.2)" }]}>
                  <MaterialIcons name="lock-reset" size={18} color="#818cf8" />
                </View>
                <Text style={styles.navItemText}>Force-Reset Credentials</Text>
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

      {/* CREATE USER MODAL */}
      <Modal visible={createUserModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Provision Database User / Staff</Text>
                <Text style={styles.modalCardSubtitle}>Create account and appoint role with full DB synchronization</Text>
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

      {/* DEPLOY TARGET MODAL */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Assign Targets & Quotas</Text>
                <Text style={styles.modalCardSubtitle}>Set goals for NSD, State Managers, Supervisors & Agents</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>STAFF ID, PHONE, OR EMAIL</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. 09033738409 or sup@ayaxdata.online"
              placeholderTextColor="#64748b"
              value={targetStaffId}
              onChangeText={setTargetStaffId}
            />

            <View style={{ flexDirection: "row", gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.formFieldLabel}>DATA GOAL (GB)</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="500"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={targetDataGoal}
                  onChangeText={setTargetDataGoal}
                />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.formFieldLabel}>AGENT GOAL</Text>
                <TextInput
                  style={styles.textInputStyle}
                  placeholder="10"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  value={targetAgentGoal}
                  onChangeText={setTargetAgentGoal}
                />
              </View>
            </View>

            <Text style={styles.formFieldLabel}>AIRTIME GOAL (₦)</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="50000"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={targetAirtimeGoal}
              onChangeText={setTargetAirtimeGoal}
            />

            <Text style={styles.formFieldLabel}>TARGET MONTH</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="August 2026"
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

      {/* WALLET ADJUSTMENT MODAL */}
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
              placeholder="e.g. Operational float adjustment"
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

      {/* CHANGE ROLE MODAL */}
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

      {/* RESET SECURITY MODAL */}
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
              placeholder="Enter New Password"
              placeholderTextColor="#64748b"
              secureTextEntry
              value={pwdNew}
              onChangeText={setPwdNew}
            />

            <Text style={styles.formFieldLabel}>NEW TRANSACTION PIN (OPTIONAL)</Text>
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

      {/* BROADCAST NOTIFICATION MODAL */}
      <Modal visible={notificationModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 520 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Dispatch Notification</Text>
                <Text style={styles.modalCardSubtitle}>Target a specific group or single account</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>TARGET AUDIENCE</Text>
              <View style={styles.pillGrid}>
                {[
                  { key: "all", label: "All Users" },
                  { key: "agents", label: "All Agents" },
                  { key: "supervisors", label: "All Supervisors" },
                  { key: "state_managers", label: "All SCM / SMs" },
                  { key: "nsd", label: "All NSDs" },
                  { key: "users", label: "Customers Only" },
                  { key: "single", label: "Single User" },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.pillBtn, notifAudience === item.key && styles.activePillBtn]}
                    onPress={() => setNotifAudience(item.key)}
                  >
                    <Text style={[styles.pillBtnText, notifAudience === item.key && styles.activePillBtnText]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {notifAudience === "single" && (
                <View style={{ marginTop: 6 }}>
                  <Text style={[styles.formFieldLabel, { color: "#00f0ff" }]}>
                    TARGET PHONE, EMAIL, OR USER ID *
                  </Text>
                  <TextInput
                    style={[styles.textInputStyle, { borderColor: "#00f0ff" }]}
                    placeholder="e.g. 08012345678 or user@ayaxdata.online"
                    placeholderTextColor="#64748b"
                    value={notifTargetUser}
                    onChangeText={setNotifTargetUser}
                  />
                </View>
              )}

              <Text style={styles.formFieldLabel}>NOTIFICATION TITLE *</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Operational Directive / Flash Promo"
                placeholderTextColor="#64748b"
                value={notifTitle}
                onChangeText={setNotifTitle}
              />

              <Text style={styles.formFieldLabel}>CATEGORY</Text>
              <View style={styles.pillGrid}>
                {["ADMIN_BROADCAST", "SYSTEM_UPDATE", "DIRECTIVE", "PRICE_ALERT", "SECURITY"].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.pillBtn, notifCategory === cat && styles.activePillBtn]}
                    onPress={() => setNotifCategory(cat)}
                  >
                    <Text style={[styles.pillBtnText, notifCategory === cat && styles.activePillBtnText]}>
                      {cat.replace(/_/g, " ")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formFieldLabel}>BODY MESSAGE *</Text>
              <TextInput
                style={[styles.textInputStyle, { height: 90, textAlignVertical: "top", paddingTop: 8 }]}
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
                  <Text style={styles.primaryActionBtnText}>
                    DISPATCH NOTIFICATION ({notifAudience.toUpperCase().replace(/_/g, " ")})
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
  mainWrapper: { flex: 1, backgroundColor: "#0b1120" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#0b1120",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: { color: "#00f0ff", fontSize: 16, fontWeight: "900", letterSpacing: 1.5, marginTop: 16 },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0f172a",
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
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#00f0ff", marginRight: 6 },
  enterpriseBadgeText: { color: "#00f0ff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  topBrandTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00f0ff",
  },
  logoutIconBtn: { borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)" },
  mainNavBar: {
    flexDirection: "row",
    backgroundColor: "#0f172a",
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
  mainNavTabActive: { borderBottomColor: "#00f0ff" },
  mainNavTabText: { color: "#64748b", fontSize: 10.5, fontWeight: "700", marginLeft: 3 },
  mainNavTabTextActive: { color: "#00f0ff" },
  scrollArea: { flex: 1, width: "100%" },
  scrollContentContainer: { flexGrow: 1, alignItems: "center", paddingBottom: 120 },
  contentCenterWrapper: { width: "100%", maxWidth: 1100 },
  tabWrapper: { width: "100%" },
  telemetrySection: { padding: isLargeScreen ? 24 : 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionHeaderLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "900", letterSpacing: 0.8 },
  sectionHeaderSub: { color: "#64748b", fontSize: 10, marginTop: 2 },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  liveBadgeText: { color: "#10b981", fontSize: 9.5, fontWeight: "800", marginLeft: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  metricValue: { fontSize: 17, fontWeight: "900", marginVertical: 4 },
  metricSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  statesSection: { paddingHorizontal: isLargeScreen ? 24 : 16, marginTop: 4 },
  miniHeaderActionBtn: {
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.3)",
  },
  miniHeaderActionText: { color: "#00f0ff", fontSize: 10, fontWeight: "900" },
  stateCardsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  stateCard: {
    width: isLargeScreen ? "32%" : "48.5%",
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stateCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  statePinBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  stateNameText: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  stateSmName: { color: "#64748b", fontSize: 9.5, marginTop: 1 },
  statePercentText: { fontSize: 13.5, fontWeight: "900" },
  statePercentSub: { color: "#64748b", fontSize: 8.5 },
  stateProgressTrack: {
    height: 5,
    backgroundColor: "#1e293b",
    borderRadius: 3,
    marginVertical: 8,
    overflow: "hidden",
  },
  stateProgressFill: { height: "100%", borderRadius: 3 },
  stateCardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stateFootMetric: { color: "#94a3b8", fontSize: 9.5 },
  tariffTabContainer: { padding: isLargeScreen ? 24 : 16 },
  hierarchyCategoryTitle: { color: "#00f0ff", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginBottom: 8 },
  smDirectorCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderLeftWidth: 4,
  },
  smCardTopRow: { flexDirection: "row", alignItems: "center" },
  smAvatarCrownBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  smDirectorName: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
  smDirectorRole: { color: "#94a3b8", fontSize: 10.5, marginTop: 2, fontWeight: "700" },
  smDirectorEmail: { color: "#64748b", fontSize: 10, marginTop: 1 },
  smWalletBalText: { color: "#10b981", fontSize: 14, fontWeight: "900" },
  smWalletBalSub: { color: "#64748b", fontSize: 9 },
  smCardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 8,
  },
  smCardFooterText: { color: "#94a3b8", fontSize: 10.5 },
  smCardInspectLink: { color: "#00f0ff", fontSize: 10.5, fontWeight: "bold" },
  userEntityCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  userEntityTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  userAvatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
  },
  userEntityName: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  userEntitySub: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  userEntityLocation: { color: "#00f0ff", fontSize: 10, marginTop: 1, fontWeight: "700" },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginBottom: 4 },
  roleBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  userWalletBalance: { color: "#10b981", fontSize: 13.5, fontWeight: "900" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 12 },
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

  // BULK REFUND TOOLBAR STYLES
  bulkRefundToolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    padding: 12,
    borderRadius: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  bulkRefundSelectAllBtn: { flexDirection: "row", alignItems: "center" },
  bulkRefundSelectAllText: { color: "#00f0ff", fontSize: 12, fontWeight: "bold", marginLeft: 8 },
  bulkRefundSubmitBtn: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bulkRefundSubmitBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "900", letterSpacing: 0.4 },

  refundQueueCard: {
    backgroundColor: "#0f172a",
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
  refundQueueActionsRow: { marginTop: 10, borderTopWidth: 1, borderTopColor: "#1e293b", paddingTop: 8 },
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
  historyTabContainer: { padding: isLargeScreen ? 24 : 16 },
  historyCard: {
    backgroundColor: "#0f172a",
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
    borderTopColor: "#1e293b",
    paddingTop: 8,
  },
  historyMetaText: { color: "#64748b", fontSize: 11 },
  historyStatusText: { fontSize: 10, fontWeight: "900" },
  emptyFeed: {
    backgroundColor: "#0f172a",
    padding: 30,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  inspectorDetailCard: {
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  inspectorSectionHeading: { color: "#00f0ff", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.6, marginBottom: 4 },
  inspectorValueText: { color: "#ffffff", fontSize: 15, fontWeight: "800", marginBottom: 4 },
  inspectorSubText: { color: "#cbd5e1", fontSize: 12, marginVertical: 2 },
  overrideBtnGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  overrideBtn: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  overrideBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "bold" },
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
    backgroundColor: "#0f172a",
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
    color: "#64748b",
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
  navItemActive: { backgroundColor: "rgba(0, 240, 255, 0.08)" },
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
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0f172a",
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
    backgroundColor: "#1e293b",
    margin: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  activePillBtn: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  pillBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "800" },
  activePillBtnText: { color: "#ffffff" },
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
  toggleRowContainer: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    padding: 3,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
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