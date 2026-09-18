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

// OFFICIAL AL-IHSAN DATA PLAN PRESETS
const SUPERADMIN_ALIHSAN_PRESETS = {
  MTN: [
    { label: "1.0GB DC (30D)", id: "140", type: "DC", size: "1.0 GB", validity: "30 Days", uPrice: "230", aPrice: "210" },
    { label: "1.5GB DC (30D)", id: "133", type: "DC", size: "1.5 GB", validity: "30 Days", uPrice: "340", aPrice: "320" },
    { label: "2.0GB DC (30D)", id: "134", type: "DC", size: "2.0 GB", validity: "30 Days", uPrice: "440", aPrice: "415" },
    { label: "3.0GB DC (30D)", id: "135", type: "DC", size: "3.0 GB", validity: "30 Days", uPrice: "650", aPrice: "620" },
    { label: "5.0GB DC (30D)", id: "136", type: "DC", size: "5.0 GB", validity: "30 Days", uPrice: "1050", aPrice: "1000" },
    { label: "500MB CG (30D)", id: "26", type: "CG", size: "500 MB", validity: "30 Days", uPrice: "350", aPrice: "330" },
    { label: "1.0GB CG (30D)", id: "27", type: "CG", size: "1.0 GB", validity: "30 Days", uPrice: "450", aPrice: "425" },
    { label: "2.0GB CG (30D)", id: "28", type: "CG", size: "2.0 GB", validity: "30 Days", uPrice: "900", aPrice: "860" },
    { label: "5.0GB CG (30D)", id: "38", type: "CG", size: "5.0 GB", validity: "30 Days", uPrice: "2100", aPrice: "2000" },
    { label: "500MB SME", id: "17", type: "SME", size: "500 MB", validity: "1 Day", uPrice: "290", aPrice: "270" },
    { label: "1.0GB SME2", id: "112", type: "SME2", size: "1.0 GB", validity: "1 Day", uPrice: "270", aPrice: "250" },
    { label: "1.0GB DataShare", id: "151", type: "DATASHARE", size: "1.0 GB", validity: "30 Days", uPrice: "280", aPrice: "260" }
  ],
  AIRTEL: [
    { label: "1.2GB CG (7D)", id: "262", type: "CG", size: "1.2 GB", validity: "7 Days", uPrice: "280", aPrice: "260" },
    { label: "1.5GB CG (7D)", id: "240", type: "CG", size: "1.5 GB", validity: "7 Days", uPrice: "620", aPrice: "590" },
    { label: "6.5GB CG (14D)", id: "263", type: "CG", size: "1.2 GB", validity: "14 Days", uPrice: "1350", aPrice: "1280" },
    { label: "1.0GB SME (7D)", id: "200", type: "SME", size: "1.0 GB", validity: "7 Days", uPrice: "350", aPrice: "330" },
    { label: "2.0GB SME (30D)", id: "253", type: "SME", size: "2.0 GB", validity: "30 Days", uPrice: "750", aPrice: "700" },
    { label: "3.0GB SME (30D)", id: "255", type: "SME", size: "3.0 GB", validity: "30 Days", uPrice: "2150", aPrice: "2050" },
    { label: "2.0GB Awoof (2D)", id: "157", type: "AWOOF", size: "2.0 GB", validity: "2 Days", uPrice: "400", aPrice: "375" },
    { label: "3.0GB Awoof (7D)", id: "158", type: "AWOOF", size: "3.0 GB", validity: "7 Days", uPrice: "630", aPrice: "595" },
    { label: "4.0GB Awoof (30D)", id: "159", type: "AWOOF", size: "4.0 GB", validity: "30 Days", uPrice: "1200", aPrice: "1140" },
    { label: "10GB Awoof (30D)", id: "160", type: "AWOOF", size: "10.0 GB", validity: "30 Days", uPrice: "2300", aPrice: "2200" }
  ],
  GLO: [
    { label: "1.0GB Gifting", id: "28", type: "GIFTING", size: "1.0 GB", validity: "30 Days", uPrice: "480", aPrice: "450" },
    { label: "2.0GB Gifting", id: "29", type: "GIFTING", size: "2.0 GB", validity: "30 Days", uPrice: "950", aPrice: "900" }
  ],
  "9MOBILE": [
    { label: "500MB Gifting", id: "45", type: "GIFTING", size: "500 MB", validity: "30 Days", uPrice: "550", aPrice: "510" },
    { label: "1.5GB Gifting", id: "11", type: "GIFTING", size: "1.5 GB", validity: "30 Days", uPrice: "1000", aPrice: "950" }
  ]
};

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

  // Active Tabs: 'overview' | 'pricing' | 'sm_hierarchy' | 'users' | 'refunds' | 'history'
  const [activeMainTab, setActiveMainTab] = useState("overview");
  const [tariffNetFilter, setTariffNetFilter] = useState("ALL");
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
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Pricing & Tariffs Modals
  const [addPlanModalVisible, setAddPlanModalVisible] = useState(false);
  const [editPlanModalVisible, setEditPlanModalVisible] = useState(false);
  const [selectedEditPlan, setSelectedEditPlan] = useState(null);

  // Edit Plan State
  const [editPlanForm, setEditPlanForm] = useState({
    planId: "",
    name: "",
    validity: "30 Days",
    planType: "DC",
    customPlanType: "",
    userPrice: "",
    agentPrice: "",
    status: "active",
  });

  // Create New Plan State
  const [newPlanForm, setNewPlanForm] = useState({
    network: "MTN",
    planId: "140",
    planType: "DC",
    customPlanType: "",
    planSize: "1.0 GB",
    customPlanSize: "",
    validity: "30 Days",
    customValidity: "",
    userPrice: "230",
    agentPrice: "210",
  });

  // Transfer Agent States
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferType, setTransferType] = useState("bulk");
  const [oldSupervisorId, setOldSupervisorId] = useState("");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [transferAgentId, setTransferAgentId] = useState("");

  const [newFirstName, setNewFirstName] = useState("");
  const [newSurname, setNewSurname] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("Password123@");
  const [newRole, setNewRole] = useState("state_manager");
  const [newState, setNewState] = useState("Kano");
  const [newLga, setNewLga] = useState("Municipal");
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

  // Target Directive State
  const [directiveSelectedCadre, setDirectiveSelectedCadre] = useState("supervisor");
  const [targetStaffId, setTargetStaffId] = useState("");
  const [targetDataGoal, setTargetDataGoal] = useState("3000");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("350000");
  const [targetAgentGoal, setTargetAgentGoal] = useState("25");
  const [directiveNote, setDirectiveNote] = useState("Mobilize regional retail stores for the weekly VTU surge.");

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

  /**
   * Universal Live Telemetry Loader
   * Yana hado kiran Overview, Users, Transactions, Tariffs, da kuma kididdigar Target na Real-time
   */
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

      const [overviewRes, txRes, plansRes, usersRes, refundsRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/superadmin/overview`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/dashboard-stats`, { headers, timeout: 15000 })
        ),
        axios.get(`${BASE_URL}/superadmin/transactions?limit=300`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?limit=300`, { headers, timeout: 15000 })
        ),
        axios.get(`${BASE_URL}/superadmin/plans`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/data/plans`, { headers, timeout: 15000 })
        ),
        axios.get(`${BASE_URL}/admin/users?limit=500`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/superadmin/users?limit=500`, { headers, timeout: 15000 })
        ),
        axios.get(`${BASE_URL}/superadmin/refund-requests`, { headers, timeout: 15000 }).catch(() =>
          axios.get(`${BASE_URL}/admin/transactions?status=pending-refund`, { headers, timeout: 15000 })
        ),
      ]);

      if (!isMounted.current) return;

      let rawTxList = [];
      if (txRes.status === "fulfilled" && txRes.value?.data) {
        rawTxList = txRes.value.data.transactions || txRes.value.data.data || [];
        setRecentTx(rawTxList);
      }

      let rawUsers = [];
      if (usersRes.status === "fulfilled" && usersRes.value?.data) {
        rawUsers = usersRes.value.data.users || usersRes.value.data.data || [];
      }

      // =========================================================================
      // LIVE TARGET ENGINE: Kididdige ainihin Data GB da Airtime da kowa ya sayar
      // =========================================================================
      const now = new Date();
      const currentMonthIdx = now.getMonth();
      const currentYear = now.getFullYear();

      // Taswirar cinikin kowane mai amfani a watan nan
      const userSalesMap = {};

      rawTxList.forEach((tx) => {
        const status = String(tx.status || "").toUpperCase();
        if (status !== "SUCCESS" && status !== "SUCCESSFUL" && status !== "COMPLETED") return;

        const txDate = tx.createdAt ? new Date(tx.createdAt) : (tx.date ? new Date(tx.date) : null);
        if (txDate && !isNaN(txDate.getTime())) {
          if (txDate.getMonth() !== currentMonthIdx || txDate.getFullYear() !== currentYear) {
            return;
          }
        }

        const uId = String(tx.user?._id || tx.user?.id || tx.user || tx.userId || "");
        if (!uId) return;

        if (!userSalesMap[uId]) {
          userSalesMap[uId] = { dataGB: 0, airtime: 0 };
        }

        const serviceText = String(tx.service || tx.type || tx.category || "").toUpperCase();
        const detailsText = String(tx.details || tx.description || tx.planCode || "").toUpperCase();

        // Data Calculation
        if (serviceText.includes("DATA") || detailsText.includes("DATA") || tx.type === "data") {
          const combined = detailsText + " " + serviceText;
          let parsedGB = 0;
          const matchGB = combined.match(/(\d+(?:\.\d+)?)\s*GB/i);
          const matchMB = combined.match(/(\d+(?:\.\d+)?)\s*MB/i);

          if (matchGB && matchGB[1]) {
            parsedGB = parseFloat(matchGB[1]);
          } else if (matchMB && matchMB[1]) {
            parsedGB = parseFloat(matchMB[1]) / 1024;
          } else if (tx.dataAmountGB) {
            parsedGB = Number(tx.dataAmountGB);
          } else {
            const amt = Number(tx.amount || 0);
            if (amt >= 200 && amt <= 300) parsedGB = 1.0;
            else if (amt > 300 && amt <= 600) parsedGB = 2.0;
            else if (amt > 600 && amt <= 1200) parsedGB = 5.0;
            else if (amt > 1200) parsedGB = Math.round(amt / 250);
          }
          userSalesMap[uId].dataGB += parsedGB;
        }

        // Airtime Calculation
        if (serviceText.includes("AIRTIME") || detailsText.includes("AIRTIME") || tx.type === "airtime" || serviceText.includes("VTU")) {
          userSalesMap[uId].airtime += Number(tx.amount || 0);
        }
      });

      // Haɗa Live Telemetry a cikin allUsersList
      const computedUsers = rawUsers.map((u) => {
        const uId = String(u._id || u.id);
        const directSales = userSalesMap[uId] || { dataGB: 0, airtime: 0 };

        let totalSubordinateDataGB = directSales.dataGB;
        let totalSubordinateAirtime = directSales.airtime;

        const uRole = String(u.role || "").toLowerCase();

        // Idan Supervisor ne: Tattaro cinikin dukkan Agents da ke karkashinsa
        if (uRole.includes("supervisor")) {
          rawUsers.forEach((ag) => {
            const agRole = String(ag.role || "").toLowerCase();
            if (agRole === "agent") {
              const isUnder =
                String(ag.assignedSupervisor) === uId ||
                String(ag.supervisorId) === uId ||
                (ag.lga && u.lga && ag.lga.toLowerCase() === u.lga.toLowerCase());

              if (isUnder) {
                const agSales = userSalesMap[String(ag._id || ag.id)] || { dataGB: 0, airtime: 0 };
                totalSubordinateDataGB += agSales.dataGB;
                totalSubordinateAirtime += agSales.airtime;
              }
            }
          });
        }

        // Idan State Manager ne: Tattaro cinikin dukkan jihar
        if (uRole.includes("state_manager") || uRole.includes("leader") || uRole.includes("lida") || uRole.includes("sm")) {
          rawUsers.forEach((stf) => {
            if (stf._id !== u._id && stf.state && u.state && stf.state.toLowerCase() === u.state.toLowerCase()) {
              const stfSales = userSalesMap[String(stf._id || stf.id)] || { dataGB: 0, airtime: 0 };
              totalSubordinateDataGB += stfSales.dataGB;
              totalSubordinateAirtime += stfSales.airtime;
            }
          });
        }

        // Idan National Sales Director ne: Tattaro cinikin dukkan ƙasa
        if (uRole.includes("national_sales_director") || uRole.includes("super_leader") || uRole.includes("nsd")) {
          Object.values(userSalesMap).forEach((s) => {
            totalSubordinateDataGB += s.dataGB;
            totalSubordinateAirtime += s.airtime;
          });
        }

        return {
          ...u,
          liveDataSoldGB: Math.round(totalSubordinateDataGB * 10) / 10,
          liveAirtimeSold: Math.round(totalSubordinateAirtime),
        };
      });

      setAllUsersList(computedUsers);

      if (overviewRes.status === "fulfilled" && overviewRes.value?.data) {
        const d = overviewRes.value.data.stats || overviewRes.value.data.data || overviewRes.value.data;
        setStats(d);
        if (overviewRes.value.data.prices) setPrices(overviewRes.value.data.prices);
      }

      if (plansRes.status === "fulfilled" && plansRes.value?.data) {
        const rawPlans = plansRes.value.data.plans || plansRes.value.data.data || [];
        if (Array.isArray(rawPlans) && rawPlans.length > 0) {
          setDataPlansList(rawPlans);
        }
      }

      if (refundsRes.status === "fulfilled" && refundsRes.value?.data) {
        const rawRefs = refundsRes.value.data.requests || refundsRes.value.data.refunds || refundsRes.value.data.transactions || [];
        setPendingRefundsList(Array.isArray(rawRefs) ? rawRefs : []);
      }
    } catch (err) {
      if (!isBackground) {
        console.log("Telemetry Sync Warning:", err.message);
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
    const confirmAction = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Terminate the SuperAdmin Administrative Session?")) {
        confirmAction();
      }
    } else {
      Alert.alert("Sign Out", "Terminate active SuperAdmin session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Sign Out", style: "destructive", onPress: confirmAction },
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
        ).catch(() =>
          axios.post(`${BASE_URL}/admin/refunds/batch-approve`, { transactionIds: selectedRefundIds }, { headers })
        );

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
      if (window.confirm(`Approve and refund ${selectedRefundIds.length} selected accounts?`)) {
        confirmAction();
      }
    } else {
      Alert.alert("Confirm Batch Refund", `Approve and refund ${selectedRefundIds.length} selected accounts?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Approve All", style: "destructive", onPress: confirmAction },
      ]);
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
          `${BASE_URL}/admin/refunds/approve`,
          {
            transactionId: targetId,
            reference: ref,
            beneficiary,
            refundAmount: amount,
          },
          { headers: { Authorization: `Bearer ${token}` } }
        )
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Refund Executed", `₦${amount.toLocaleString()} credited back to ${beneficiary}.`);
        fetchMasterTelemetry();
      }
    } catch (err) {
      showAlert("Refund Approval Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

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

  const handleOpenEditPlan = (plan) => {
    setSelectedEditPlan(plan);
    setEditPlanForm({
      planId: String(plan.planId || plan.planCode || plan.id || plan._id || ""),
      name: String(plan.plan || plan.name || ""),
      validity: String(plan.validity || "30 Days"),
      planType: String(plan.planType || plan.type || "DC").toUpperCase(),
      customPlanType: "",
      userPrice: String(plan.userPrice || plan.price || ""),
      agentPrice: String(plan.agentPrice || plan.userPrice || plan.price || ""),
      status: plan.status || (plan.isActive ? "active" : "disabled"),
    });
    setEditPlanModalVisible(true);
  };

  const handleSaveEditPlanTariff = async () => {
    if (!editPlanForm.planId.trim() || !editPlanForm.userPrice || !editPlanForm.agentPrice) {
      showAlert("Validation Error", "Please provide Gateway Plan ID, Customer price, and Agent price.");
      return;
    }

    const uPrice = Number(editPlanForm.userPrice);
    const aPrice = Number(editPlanForm.agentPrice);
    const targetId = editPlanForm.planId.trim();
    const finalType = editPlanForm.planType === "CUSTOM" ? editPlanForm.customPlanType.trim() : editPlanForm.planType;
    const finalName = editPlanForm.name.trim() || selectedEditPlan?.plan || selectedEditPlan?.name;
    const oldId = selectedEditPlan?.id || selectedEditPlan?._id || selectedEditPlan?.planId || selectedEditPlan?.planCode;

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        id: oldId,
        planId: targetId,
        planCode: targetId,
        code: targetId,
        name: finalName,
        plan: finalName,
        planLabel: finalName,
        planType: finalType,
        validity: editPlanForm.validity,
        userPrice: uPrice,
        agentPrice: aPrice,
        price: uPrice,
        status: editPlanForm.status,
        isActive: editPlanForm.status === "active",
        broadcast: true,
      };

      await axios.post(`${BASE_URL}/superadmin/pricing/update-tier`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() =>
        axios.post(`${BASE_URL}/admin/pricing/update-tier`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      showAlert("Tariff Updated 🚀", `${finalName} [ID: ${targetId}] updated across all customer and agent terminals.`);
      setEditPlanModalVisible(false);
      fetchMasterTelemetry();
    } catch (err) {
      showAlert("Update Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
    }
  };

  const handleDeletePlan = async () => {
    if (!selectedEditPlan) return;
    const planName = selectedEditPlan.plan || selectedEditPlan.name || "this plan";
    const targetId = selectedEditPlan.id || selectedEditPlan._id || selectedEditPlan.planId || selectedEditPlan.planCode;

    const confirmDelete = async () => {
      setActionLoading(true);
      try {
        const token = await AsyncStorage.getItem("userToken");
        await axios.delete(`${BASE_URL}/superadmin/pricing/delete-plan/${targetId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() =>
          axios.delete(`${BASE_URL}/data/plans/${targetId}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        );

        showAlert("Plan Removed", `"${planName}" has been permanently deleted from database.`);
        setEditPlanModalVisible(false);
        fetchMasterTelemetry();
      } catch (err) {
        showAlert("Delete Error", err.response?.data?.message || err.message);
      } finally {
        if (isMounted.current) setActionLoading(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Permanently delete "${planName}"? It will be removed from all mobile and web apps.`)) {
        confirmDelete();
      }
    } else {
      Alert.alert("Confirm Permanent Deletion", `Permanently delete "${planName}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete Permanently", style: "destructive", onPress: confirmDelete },
      ]);
    }
  };

  const applySuperadminPreset = (preset) => {
    setNewPlanForm((prev) => ({
      ...prev,
      planId: preset.id,
      planType: preset.type,
      planSize: preset.size,
      validity: preset.validity,
      userPrice: preset.uPrice,
      agentPrice: preset.aPrice,
    }));
  };

  const handlePublishNewPlan = async () => {
    const finalPlanType = newPlanForm.planType === "CUSTOM" ? newPlanForm.customPlanType.trim() : newPlanForm.planType;
    const finalPlanSize = newPlanForm.planSize === "CUSTOM" ? newPlanForm.customPlanSize.trim() : newPlanForm.planSize;
    const finalValidity = newPlanForm.validity === "CUSTOM" ? newPlanForm.customValidity.trim() : newPlanForm.validity;
    const planIdVal = newPlanForm.planId.trim();
    const uPrice = Number(newPlanForm.userPrice || 0);
    const aPrice = Number(newPlanForm.agentPrice || uPrice);

    if (!newPlanForm.network || !planIdVal || !finalPlanType || !finalPlanSize || uPrice <= 0) {
      showAlert("Incomplete Form", "Please specify Telecom Network, Gateway Plan ID, Plan Type, Volume, and Customer Price.");
      return;
    }

    const net = newPlanForm.network.toUpperCase();
    const pName = `${net} ${finalPlanType} ${finalPlanSize} (${finalValidity})`;

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const payload = {
        id: planIdVal,
        planId: planIdVal,
        planCode: planIdVal,
        code: planIdVal,
        network: net,
        networkName: net,
        planType: finalPlanType,
        plan: finalPlanSize,
        name: pName,
        planLabel: pName,
        validity: finalValidity,
        userPrice: uPrice,
        price: uPrice,
        agentPrice: aPrice,
        status: "active",
        isActive: true,
      };

      await axios.post(`${BASE_URL}/superadmin/pricing/create-plan`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() =>
        axios.post(`${BASE_URL}/admin/pricing/create-plan`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      showAlert("Tariff Published 🚀", `${pName} [ID: ${planIdVal}] successfully added to database & live across all terminals.`);
      setAddPlanModalVisible(false);
      fetchMasterTelemetry();
    } catch (err) {
      showAlert("Publish Error", err.response?.data?.message || err.message);
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
        lga: newLga.trim() || "Municipal",
        supervisorId: newSupervisorIdInput.trim() || undefined,
        walletBalance: Number(newInitialBalance || 0),
        balance: Number(newInitialBalance || 0),
        pin: "2026",
        transactionPin: "2026",
        isVerified: true,
        isSuspended: false,
        status: "active",
        targets: {
          dataGoal: Number(targetDataGoal || 1000),
          airtimeGoal: Number(targetAirtimeGoal || 100000),
          agentGoal: Number(targetAgentGoal || 25),
          month: "September 2026"
        }
      };

      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      let res;
      try {
        res = await axios.post(`${BASE_URL}/admin/users/create`, payload, { headers });
      } catch (err1) {
        try {
          res = await axios.post(`${BASE_URL}/superadmin/create-user`, payload, { headers });
        } catch (err2) {
          res = await axios.post(`${BASE_URL}/auth/register`, payload, { headers });
        }
      }

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert("User Provisioned 🎉", `Account created for ${fullName} as ${newRole.toUpperCase()}. Live in database.`);
        setCreateUserModalVisible(false);
        setNewFirstName("");
        setNewSurname("");
        setNewPhone("");
        setNewEmail("");
        setNewSupervisorIdInput("");
        setNewInitialBalance("0");
        fetchMasterTelemetry();
      } else {
        showAlert("Notice", res.data?.message || "User created successfully.");
        setCreateUserModalVisible(false);
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

  /**
   * DISPATCH DIRECTIVE & QUOTA ALLOCATION (Web-Aligned Architecture)
   */
  const handleAssignTarget = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

      const payload = {
        targetRole: directiveSelectedCadre,
        dataVolumeGoal: Number(targetDataGoal || 3000),
        dataGoal: Number(targetDataGoal || 3000),
        airtimeGoal: Number(targetAirtimeGoal || 350000),
        agentRecruitGoal: Number(targetAgentGoal || 25),
        agentGoal: Number(targetAgentGoal || 25),
        commandNote: directiveNote,
        note: directiveNote,
        month: "September 2026",
        userId: targetStaffId.trim() || undefined,
        supervisorId: targetStaffId.trim() || undefined,
      };

      try {
        await axios.post(`${BASE_URL}/admin/targets/assign`, payload, { headers });
      } catch (e1) {
        try {
          await axios.post(`${BASE_URL}/superadmin/assign-target`, payload, { headers });
        } catch (e2) {
          await axios.post(`${BASE_URL}/admin/assign-target`, payload, { headers });
        }
      }

      showAlert(
        "Directive Dispatched 🎯",
        `Monthly Quota assigned to ${directiveSelectedCadre.toUpperCase()} officers! Live across Web & App.`
      );
      setTargetModalVisible(false);
      fetchMasterTelemetry();
    } catch (err) {
      showAlert("Target Notice", err.response?.data?.message || "Directive dispatched to field personnel.");
      setTargetModalVisible(false);
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
        axios.post(`${BASE_URL}/admin/notifications/broadcast`, payload, {
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

  // Matata masu amfani (Directory Filter)
  const filteredUsers = allUsersList.filter((u) => {
    const r = String(u.role || "user").toLowerCase();
    const targetFilter = userRoleFilter.toLowerCase();
    let roleMatch = false;

    if (targetFilter === "all") {
      roleMatch = true;
    } else if (targetFilter === "state_manager") {
      roleMatch = ["state_manager", "sm", "leader", "lida"].includes(r);
    } else if (targetFilter === "national_sales_director") {
      roleMatch = ["national_sales_director", "nsd", "super_leader"].includes(r);
    } else if (targetFilter === "supervisor") {
      roleMatch = ["supervisor", "field_supervisor"].includes(r);
    } else {
      roleMatch = r === targetFilter;
    }

    const q = userSearchQuery.toLowerCase();
    const nameMatch = (u.name || `${u.firstName || ""} ${u.surname || ""}`).toLowerCase().includes(q);
    const phoneMatch = (u.phone || "").includes(q);
    const emailMatch = (u.email || "").toLowerCase().includes(q);
    const stateMatch = (u.state || "").toLowerCase().includes(q);
    const lgaMatch = (u.lga || "").toLowerCase().includes(q);

    return roleMatch && (nameMatch || phoneMatch || emailMatch || stateMatch || lgaMatch);
  });

  const filteredTariffPlans = dataPlansList.filter((p) => {
    const net = String(p.network || p.networkName || "MTN").toUpperCase();
    return tariffNetFilter === "ALL" || net === tariffNetFilter;
  });

  // National Sales Directors
  const nationalDirectorsList = allUsersList.filter((u) => {
    const r = String(u.role || "").toLowerCase();
    return r === "national_sales_director" || r === "super_leader" || r === "nsd";
  });

  // State Managers (Daidai da na Web)
  const stateManagersList = allUsersList.filter((u) => {
    const r = String(u.role || "").toLowerCase();
    return r === "state_manager" || r === "leader" || r === "lida" || r === "sm";
  });

  const openInspector = (entity, type = "user") => {
    setInspectedEntity(entity);
    setInspectedType(type);
    setInspectorModalVisible(true);
  };

  const openActionModal = (actionKey) => {
    toggleSidebar(false);
    switch (actionKey) {
      case "add_plan":
        setAddPlanModalVisible(true);
        break;
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
            onPress={() => setAddPlanModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="wifi" size={16} color="#00f0ff" />
          </TouchableOpacity>

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
          style={[styles.mainNavTab, activeMainTab === "pricing" && styles.mainNavTabActive]}
          onPress={() => setActiveMainTab("pricing")}
        >
          <Ionicons name="wifi" size={12} color={activeMainTab === "pricing" ? "#00f0ff" : "#64748b"} />
          <Text style={[styles.mainNavTabText, activeMainTab === "pricing" && styles.mainNavTabTextActive]}>
            Tariffs & Plans
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
                    // Real-Time Live Sales daga jami'in da ke jihar
                    const achievedDataGB = assignedSm?.liveDataSoldGB !== undefined
                      ? assignedSm.liveDataSoldGB
                      : (assignedSm?.currentSalesGB || (stateAgents.length * 45));

                    const targetAirtime = assignedSm?.targets?.airtimeGoal || 100000;
                    const achievedAirtime = assignedSm?.liveAirtimeSold !== undefined ? assignedSm.liveAirtimeSold : 0;
                    const agentsGoal = assignedSm?.targets?.agentGoal || 25;
                    const percent = Math.min(Math.round((achievedDataGB / (targetDataGB || 1)) * 100), 100);

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
                              achievedAirtime,
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
                            <Text style={styles.statePercentSub}>Live Quota</Text>
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

          {/* TAB 2: DATA TARIFFS & PLANS */}
          {activeMainTab === "pricing" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>DATA BUNDLE LIVE TARIFFS (CUSTOMER & AGENT)</Text>
                    <Text style={styles.sectionHeaderSub}>Live database pricing deployed to mobile, web & agent terminals</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => setAddPlanModalVisible(true)}
                  >
                    <Ionicons name="add-circle" size={15} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>PUBLISH NEW PLAN</Text>
                  </TouchableOpacity>
                </View>

                {/* Network Filter Tabs */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  {["ALL", "MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
                    <TouchableOpacity
                      key={net}
                      style={[styles.categoryTab, tariffNetFilter === net && styles.categoryTabActive]}
                      onPress={() => setTariffNetFilter(net)}
                    >
                      <Text style={[styles.categoryTabText, tariffNetFilter === net && styles.categoryTabTextActive]}>
                        {net}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {filteredTariffPlans.length > 0 ? (
                  filteredTariffPlans.map((plan) => {
                    const planName = plan.plan || plan.name || plan.planLabel || plan.size || "Data Bundle";
                    const netName = String(plan.network || plan.networkName || "MTN").toUpperCase();
                    const planType = String(plan.planType || plan.type || "DC").toUpperCase();
                    const validity = plan.validity || "30 Days";
                    const userPrice = plan.userPrice || plan.price || 0;
                    const agentPrice = plan.agentPrice || plan.userPrice || plan.price || 0;
                    const status = String(plan.status || (plan.isActive ? "active" : "disabled")).toLowerCase();
                    const planId = plan.planId || plan.planCode || plan.id || plan._id;

                    return (
                      <View key={planId} style={styles.superPlanCard}>
                        <View style={styles.superPlanCardTop}>
                          <View style={{ flex: 1 }}>
                            <View style={styles.planBadgeRow}>
                              <View style={[styles.planNetworkPill, { backgroundColor: "rgba(0, 240, 255, 0.1)" }]}>
                                <Text style={[styles.planNetworkPillTxt, { color: "#00f0ff" }]}>{netName}</Text>
                              </View>
                              <View style={styles.planTypePill}>
                                <Text style={styles.planTypePillTxt}>{planType}</Text>
                              </View>
                              <View style={[styles.planTypePill, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                                <Text style={[styles.planTypePillTxt, { color: "#f59e0b", fontWeight: "900" }]}>ID: {planId}</Text>
                              </View>
                              <View style={[styles.planStatusPill, { backgroundColor: status === "disabled" ? "#7f1d1d" : "rgba(16, 185, 129, 0.15)" }]}>
                                <Text style={[styles.planStatusPillTxt, { color: status === "disabled" ? "#fca5a5" : "#10b981" }]}>
                                  {status.toUpperCase()}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.superPlanTitle}>{netName} {planName} ({validity})</Text>
                          </View>

                          <TouchableOpacity
                            style={styles.superPlanEditBtn}
                            onPress={() => handleOpenEditPlan(plan)}
                          >
                            <Feather name="sliders" size={14} color="#00f0ff" />
                            <Text style={styles.superPlanEditText}>Edit Tariff</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.cleanPricingRow}>
                          <View style={styles.cleanPriceBox}>
                            <Text style={styles.cleanPriceLabel}>Customer Price</Text>
                            <Text style={styles.cleanPriceValue}>₦{Number(userPrice).toLocaleString()}</Text>
                          </View>
                          <View style={styles.cleanPriceDivider} />
                          <View style={styles.cleanPriceBox}>
                            <Text style={styles.cleanPriceLabel}>Agent Wholesale</Text>
                            <Text style={[styles.cleanPriceValue, { color: "#00f0ff" }]}>₦{Number(agentPrice).toLocaleString()}</Text>
                          </View>
                        </View>
                      </View>
                    );
                  })
                ) : (
                  <View style={styles.emptyFeed}>
                    <Ionicons name="wifi-outline" size={36} color="#475569" />
                    <Text style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
                      No data tariffs found for {tariffNetFilter}. Tap "PUBLISH NEW PLAN" to add.
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* TAB 3: NATIONAL SALES DIRECTORS & STATE MANAGERS */}
          {activeMainTab === "sm_hierarchy" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>NATIONAL SALES DIRECTORS (NSD) & STATE MANAGERS (SM)</Text>
                    <Text style={styles.sectionHeaderSub}>Live real-time metering of field team quotas, data & airtime sold</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addPlanHeaderBtn}
                    onPress={() => {
                      setNewRole("state_manager");
                      setCreateUserModalVisible(true);
                    }}
                  >
                    <Ionicons name="person-add" size={15} color="#ffffff" />
                    <Text style={styles.addPlanHeaderText}>APPOINT SM / NSD</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.hierarchyCategoryTitle}>NATIONAL SALES DIRECTORS (NSD) ({nationalDirectorsList.length})</Text>
                {nationalDirectorsList.length > 0 ? (
                  nationalDirectorsList.map((nsd) => {
                    const targetGB = nsd.targets?.dataGoal || 5000;
                    const liveGB = nsd.liveDataSoldGB || 0;
                    const targetAirtime = nsd.targets?.airtimeGoal || 1000000;
                    const liveAirtime = nsd.liveAirtimeSold || 0;
                    const pct = Math.min(Math.round((liveGB / (targetGB || 1)) * 100), 100);

                    return (
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

                        {/* LIVE TELEMETRY ROW */}
                        <View style={{ marginTop: 10, backgroundColor: "#1e293b", padding: 8, borderRadius: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ fontSize: 10.5, color: "#38bdf8", fontWeight: "bold" }}>
                              Live Data Sold: {liveGB} GB / {targetGB} GB ({pct}%)
                            </Text>
                            <Text style={{ fontSize: 10.5, color: "#fbbf24", fontWeight: "bold" }}>
                              Airtime: ₦{liveAirtime.toLocaleString()} / ₦{Number(targetAirtime).toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.stateProgressTrack}>
                            <View style={[styles.stateProgressFill, { width: `${pct}%`, backgroundColor: pct >= 70 ? "#10b981" : "#f59e0b" }]} />
                          </View>
                        </View>

                        <View style={styles.smCardFooterRow}>
                          <Text style={styles.smCardFooterText}>
                            Quota Target: {targetGB}GB Data • {nsd.targets?.agentGoal || 100} Retail Outlets
                          </Text>
                          <Text style={styles.smCardInspectLink}>Inspect Profile & Command ➔</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
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

                    const targetGB = sm.targets?.dataGoal || 1000;
                    const liveGB = sm.liveDataSoldGB !== undefined ? sm.liveDataSoldGB : 0;
                    const targetAirtime = sm.targets?.airtimeGoal || 100000;
                    const liveAirtime = sm.liveAirtimeSold !== undefined ? sm.liveAirtimeSold : 0;
                    const pct = Math.min(Math.round((liveGB / (targetGB || 1)) * 100), 100);

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

                        {/* LIVE TELEMETRY ROW */}
                        <View style={{ marginTop: 10, backgroundColor: "#1e293b", padding: 8, borderRadius: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 4 }}>
                            <Text style={{ fontSize: 10.5, color: "#38bdf8", fontWeight: "bold" }}>
                              Live State Sales: {liveGB} GB / {targetGB} GB ({pct}%)
                            </Text>
                            <Text style={{ fontSize: 10.5, color: "#10b981", fontWeight: "bold" }}>
                              Airtime: ₦{liveAirtime.toLocaleString()} / ₦{Number(targetAirtime).toLocaleString()}
                            </Text>
                          </View>
                          <View style={styles.stateProgressTrack}>
                            <View style={[styles.stateProgressFill, { width: `${pct}%`, backgroundColor: pct >= 70 ? "#10b981" : "#00f0ff" }]} />
                          </View>
                        </View>

                        <View style={styles.smCardFooterRow}>
                          <Text style={styles.smCardFooterText}>
                            {smSupervisors.length} Field Supervisors • {smAgents.length} Retail Outlets
                          </Text>
                          <Text style={styles.smCardInspectLink}>Inspect Live Station ➔</Text>
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

          {/* TAB 4: DIRECTORY */}
          {activeMainTab === "users" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionHeaderLabel}>ALL COMPANY USERS, AGENTS & SUPERVISORS</Text>
                    <Text style={styles.sectionHeaderSub}>Real-time sales metering and quotas across each account</Text>
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
                    const userLiveGB = item.liveDataSoldGB !== undefined ? item.liveDataSoldGB : 0;
                    const userLiveAirtime = item.liveAirtimeSold !== undefined ? item.liveAirtimeSold : 0;
                    const userGoal = item.targets?.dataGoal || 500;

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
                            <Text style={{ fontSize: 10, color: "#34d399", fontWeight: "bold", marginTop: 2 }}>
                              ⚡ Sold: {userLiveGB}GB / {userGoal}GB • Airtime: ₦{userLiveAirtime.toLocaleString()}
                            </Text>
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

          {/* TAB 5: BATCH REFUND QUEUE */}
          {activeMainTab === "refunds" && (
            <View style={styles.tabWrapper}>
              <View style={styles.tariffTabContainer}>
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

          {/* TAB 6: AUDIT LOG */}
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

      {/* MODAL: EDIT DATA TARIFF */}
      <Modal visible={editPlanModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Edit Data Plan Tariff</Text>
                {selectedEditPlan && (
                  <Text style={styles.modalCardSubtitle}>
                    {selectedEditPlan.network} - {selectedEditPlan.plan || selectedEditPlan.name}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setEditPlanModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>PLAN ACTIVE STATUS</Text>
              <View style={styles.toggleRowContainer}>
                <TouchableOpacity
                  style={[styles.toggleBtn, editPlanForm.status === "active" && styles.creditActiveToggle]}
                  onPress={() => setEditPlanForm({ ...editPlanForm, status: "active" })}
                >
                  <Text style={[styles.toggleBtnText, editPlanForm.status === "active" && styles.activeToggleText]}>
                    ACTIVE
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleBtn, editPlanForm.status === "disabled" && styles.debitActiveToggle]}
                  onPress={() => setEditPlanForm({ ...editPlanForm, status: "disabled" })}
                >
                  <Text style={[styles.toggleBtnText, editPlanForm.status === "disabled" && styles.activeToggleText]}>
                    DISABLED
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.formFieldLabel}>PROVIDER GATEWAY PLAN ID (AL-IHSAN ID) *</Text>
              <TextInput
                style={styles.textInputStyle}
                value={editPlanForm.planId}
                onChangeText={(t) => setEditPlanForm({ ...editPlanForm, planId: t })}
                placeholder="e.g. 140, 27, 262"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.formFieldLabel}>PLAN CATEGORY / TYPE</Text>
              <View style={styles.pillGrid}>
                {["DC", "CG", "SME", "SME2", "GIFTING", "AWOOF", "DATASHARE", "CUSTOM"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pillBtn, editPlanForm.planType === t && styles.activePillBtn]}
                    onPress={() => setEditPlanForm({ ...editPlanForm, planType: t })}
                  >
                    <Text style={[styles.pillBtnText, editPlanForm.planType === t && styles.activePillBtnText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {editPlanForm.planType === "CUSTOM" && (
                <TextInput
                  style={[styles.textInputStyle, { borderColor: "#00f0ff" }]}
                  value={editPlanForm.customPlanType}
                  onChangeText={(t) => setEditPlanForm({ ...editPlanForm, customPlanType: t })}
                  placeholder="Type custom plan category..."
                  placeholderTextColor="#64748b"
                />
              )}

              <Text style={styles.formFieldLabel}>PLAN DISPLAY NAME / VOLUME *</Text>
              <TextInput
                style={styles.textInputStyle}
                value={editPlanForm.name}
                onChangeText={(t) => setEditPlanForm({ ...editPlanForm, name: t })}
                placeholder="e.g. 1.0 GB / 2.0 GB"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.formFieldLabel}>VALIDITY (DURATION)</Text>
              <TextInput
                style={styles.textInputStyle}
                value={editPlanForm.validity}
                onChangeText={(t) => setEditPlanForm({ ...editPlanForm, validity: t })}
                placeholder="e.g. 30 Days, 7 Days"
                placeholderTextColor="#64748b"
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>CUSTOMER PRICE (₦) *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={editPlanForm.userPrice}
                    onChangeText={(t) => setEditPlanForm({ ...editPlanForm, userPrice: t })}
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>AGENT WHOLESALE (₦) *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={editPlanForm.agentPrice}
                    onChangeText={(t) => setEditPlanForm({ ...editPlanForm, agentPrice: t })}
                    keyboardType="numeric"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleSaveEditPlanTariff}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>SAVE & DEPLOY DATA TARIFF</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  borderColor: "#ef4444",
                  borderWidth: 1,
                  paddingVertical: 12,
                  borderRadius: 12,
                  alignItems: "center",
                  marginTop: 10,
                }}
                onPress={handleDeletePlan}
                disabled={actionLoading}
              >
                <Text style={{ color: "#f87171", fontSize: 12, fontWeight: "900" }}>
                  DELETE PLAN PERMANENTLY
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL: PUBLISH NEW DATA TARIFF */}
      <Modal visible={addPlanModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Publish New Data Tariff</Text>
                <Text style={styles.modalCardSubtitle}>Automatic Fast Presets or Manual Configuration</Text>
              </View>
              <TouchableOpacity onPress={() => setAddPlanModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>1. SELECT TELECOM NETWORK</Text>
              <View style={styles.pillGrid}>
                {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
                  <TouchableOpacity
                    key={net}
                    style={[styles.pillBtn, newPlanForm.network === net && styles.activePillBtn]}
                    onPress={() => setNewPlanForm({ ...newPlanForm, network: net })}
                  >
                    <Text style={[styles.pillBtnText, newPlanForm.network === net && styles.activePillBtnText]}>
                      {net}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ backgroundColor: "#0f2a24", borderWidth: 1, borderColor: "#059669", borderRadius: 12, padding: 10, marginVertical: 8 }}>
                <Text style={{ color: "#34d399", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>
                  ⚡ AUTOMATIC PRESET (Tap to auto-fill details)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                  {(SUPERADMIN_ALIHSAN_PRESETS[newPlanForm.network] || []).map((preset, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={{
                        backgroundColor: "rgba(16, 185, 129, 0.2)",
                        borderColor: "#059669",
                        borderWidth: 1,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        marginRight: 6,
                      }}
                      onPress={() => applySuperadminPreset(preset)}
                    >
                      <Text style={{ color: "#34d399", fontSize: 11, fontWeight: "800" }}>
                        ⚡ {preset.label} (ID: {preset.id})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <Text style={styles.formFieldLabel}>2. GATEWAY PLAN ID (AL-IHSAN PROVIDER ID) *</Text>
              <TextInput
                style={styles.textInputStyle}
                value={newPlanForm.planId}
                onChangeText={(t) => setNewPlanForm({ ...newPlanForm, planId: t })}
                placeholder="e.g. 140 (MTN DC 1GB), 27 (MTN CG 1GB), 262 (Airtel CG)"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.formFieldLabel}>3. PLAN CATEGORY / TYPE</Text>
              <View style={styles.pillGrid}>
                {["DC", "CG", "SME", "SME2", "GIFTING", "AWOOF", "DATASHARE", "CUSTOM"].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[styles.pillBtn, newPlanForm.planType === t && styles.activePillBtn]}
                    onPress={() => setNewPlanForm({ ...newPlanForm, planType: t })}
                  >
                    <Text style={[styles.pillBtnText, newPlanForm.planType === t && styles.activePillBtnText]}>
                      {t}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newPlanForm.planType === "CUSTOM" && (
                <TextInput
                  style={[styles.textInputStyle, { borderColor: "#00f0ff" }]}
                  value={newPlanForm.customPlanType}
                  onChangeText={(t) => setNewPlanForm({ ...newPlanForm, customPlanType: t })}
                  placeholder="Type custom plan category (e.g. Night Boost)..."
                  placeholderTextColor="#64748b"
                />
              )}

              <Text style={styles.formFieldLabel}>4. PLAN VOLUME (SIZE)</Text>
              <View style={styles.pillGrid}>
                {["500 MB", "1.0 GB", "1.5 GB", "2.0 GB", "3.0 GB", "5.0 GB", "10.0 GB", "CUSTOM"].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pillBtn, newPlanForm.planSize === s && styles.activePillBtn]}
                    onPress={() => setNewPlanForm({ ...newPlanForm, planSize: s })}
                  >
                    <Text style={[styles.pillBtnText, newPlanForm.planSize === s && styles.activePillBtnText]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newPlanForm.planSize === "CUSTOM" && (
                <TextInput
                  style={[styles.textInputStyle, { borderColor: "#00f0ff" }]}
                  value={newPlanForm.customPlanSize}
                  onChangeText={(t) => setNewPlanForm({ ...newPlanForm, customPlanSize: t })}
                  placeholder="Type custom volume (e.g. 750 MB, 15.0 GB)..."
                  placeholderTextColor="#64748b"
                />
              )}

              <Text style={styles.formFieldLabel}>5. VALIDITY DURATION</Text>
              <View style={styles.pillGrid}>
                {["1 Day", "2 Days", "7 Days", "14 Days", "30 Days", "CUSTOM"].map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.pillBtn, newPlanForm.validity === v && styles.activePillBtn]}
                    onPress={() => setNewPlanForm({ ...newPlanForm, validity: v })}
                  >
                    <Text style={[styles.pillBtnText, newPlanForm.validity === v && styles.activePillBtnText]}>
                      {v}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {newPlanForm.validity === "CUSTOM" && (
                <TextInput
                  style={[styles.textInputStyle, { borderColor: "#00f0ff" }]}
                  value={newPlanForm.customValidity}
                  onChangeText={(t) => setNewPlanForm({ ...newPlanForm, customValidity: t })}
                  placeholder="Type custom validity (e.g. 60 Days / 90 Days)..."
                  placeholderTextColor="#64748b"
                />
              )}

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>CUSTOMER PRICE (₦) *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={newPlanForm.userPrice}
                    onChangeText={(t) => setNewPlanForm({ ...newPlanForm, userPrice: t })}
                    keyboardType="numeric"
                    placeholder="e.g. 230"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>AGENT PRICE (₦) *</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    value={newPlanForm.agentPrice}
                    onChangeText={(t) => setNewPlanForm({ ...newPlanForm, agentPrice: t })}
                    keyboardType="numeric"
                    placeholder="e.g. 210"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handlePublishNewPlan}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>PUBLISH TARIFF TO DATABASE & APP</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                    : `Role: ${String(inspectedEntity?.role || "user").toUpperCase()} • Real-Time Field Quota Terminal`}
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
                    <Text style={styles.inspectorSectionHeading}>STATE PERFORMANCE & LIVE TARGET METRICS</Text>
                    <Text style={styles.inspectorSubText}>
                      Live Data Sales: <Text style={{ color: "#00f0ff", fontWeight: "bold" }}>{inspectedEntity.achievedDataGB} GB</Text> / {inspectedEntity.targetDataGB} GB Goal
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Live Airtime Sales: <Text style={{ color: "#10b981", fontWeight: "bold" }}>₦{Number(inspectedEntity.achievedAirtime || 0).toLocaleString()}</Text> / ₦{Number(inspectedEntity.targetAirtime).toLocaleString()}
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Retail Outlets: <Text style={{ color: "#c084fc", fontWeight: "bold" }}>{inspectedEntity.agentsCount}</Text> Active / {inspectedEntity.agentsGoal} Recruited Goal
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Field Supervisors: <Text style={{ color: "#f59e0b", fontWeight: "bold" }}>{inspectedEntity.supervisorsCount}</Text> Stationed
                    </Text>
                  </View>

                  {inspectedEntity.assignedSm && (
                    <TouchableOpacity
                      style={[styles.primaryActionBtn, { backgroundColor: "#d97706", marginTop: 8 }]}
                      onPress={() => {
                        setDirectiveSelectedCadre("state_manager");
                        setTargetStaffId(inspectedEntity.assignedSm.phone || inspectedEntity.assignedSm._id);
                        setTargetDataGoal(String(inspectedEntity.targetDataGB));
                        setTargetAgentGoal(String(inspectedEntity.agentsGoal));
                        setTargetAirtimeGoal(String(inspectedEntity.targetAirtime));
                        setInspectorModalVisible(false);
                        setTargetModalVisible(true);
                      }}
                    >
                      <Text style={styles.primaryActionBtnText}>ADJUST STATE TARGETS & DIRECTIVES</Text>
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
                    <Text style={styles.inspectorSectionHeading}>LIVE PERFORMANCE METERING (THIS MONTH)</Text>
                    <Text style={styles.inspectorSubText}>
                      Live Data Sold: <Text style={{ color: "#00f0ff", fontWeight: "bold" }}>{inspectedEntity.liveDataSoldGB || 0} GB</Text> / {inspectedEntity.targets?.dataGoal || 500} GB Goal
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Live Airtime Sold: <Text style={{ color: "#10b981", fontWeight: "bold" }}>₦{Number(inspectedEntity.liveAirtimeSold || 0).toLocaleString()}</Text> / ₦{Number(inspectedEntity.targets?.airtimeGoal || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.inspectorSubText}>
                      Recruitment Goal: <Text style={{ color: "#c084fc", fontWeight: "bold" }}>{inspectedEntity.targets?.agentGoal || 10} Agents</Text>
                    </Text>
                  </View>

                  <Text style={[styles.formFieldLabel, { marginTop: 10 }]}>EXECUTIVE COMMANDS</Text>
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
                        setDirectiveSelectedCadre((inspectedEntity.role || "supervisor").toLowerCase());
                        setTargetStaffId(inspectedEntity.phone || inspectedEntity._id);
                        setTargetDataGoal(String(inspectedEntity.targets?.dataGoal || 3000));
                        setTargetAirtimeGoal(String(inspectedEntity.targets?.airtimeGoal || 350000));
                        setTargetAgentGoal(String(inspectedEntity.targets?.agentGoal || 25));
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
                style={[styles.navItem, activeMainTab === "pricing" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveMainTab("pricing");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(2, 132, 199, 0.2)" }]}>
                  <Ionicons name="wifi" size={18} color="#38bdf8" />
                </View>
                <Text style={[styles.navItemText, activeMainTab === "pricing" && { color: "#00f0ff" }]}>
                  Data Tariff Manager
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

              <TouchableOpacity style={styles.navItem} onPress={() => openActionModal("add_plan")}>
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="add-circle" size={18} color="#10b981" />
                </View>
                <Text style={[styles.navItemText, { color: "#10b981" }]}>Publish Data Tariff</Text>
              </TouchableOpacity>

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
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Provision Staff & Cadre Officer</Text>
                <Text style={styles.modalCardSubtitle}>Create account with direct Database & Web Portal synchronization</Text>
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
                    placeholder="e.g. Ibrahim"
                    placeholderTextColor="#64748b"
                    value={newFirstName}
                    onChangeText={setNewFirstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>SURNAME</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Sani"
                    placeholderTextColor="#64748b"
                    value={newSurname}
                    onChangeText={setNewSurname}
                  />
                </View>
              </View>

              <Text style={styles.formFieldLabel}>PHONE NUMBER *</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08011223344"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newPhone}
                onChangeText={setNewPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. officer@ayaxdata.online"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newEmail}
                onChangeText={setNewEmail}
              />

              <Text style={styles.formFieldLabel}>APPOINT OPERATIONAL CADRE / ROLE</Text>
              <View style={styles.pillGrid}>
                {[
                  { key: "agent", label: "Agent" },
                  { key: "supervisor", label: "Supervisor" },
                  { key: "state_manager", label: "State Manager (SM)" },
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
                  <Text style={styles.formFieldLabel}>STATE / STATION</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Kano"
                    placeholderTextColor="#64748b"
                    value={newState}
                    onChangeText={setNewState}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>LGA / WARD</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="e.g. Municipal"
                    placeholderTextColor="#64748b"
                    value={newLga}
                    onChangeText={setNewLga}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>LOGIN PASSWORD</Text>
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
                  <Text style={styles.primaryActionBtnText}>PROVISION & SYNC LIVE WITH WEB</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* DEPLOY TARGET MODAL */}
      <Modal visible={targetModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Command Directive & Quota Allocation</Text>
                <Text style={styles.modalCardSubtitle}>Assign monthly Data (GB), Airtime goals & quotas to cadre teams</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>TARGET OPERATIONAL CADRE</Text>
              <View style={styles.pillGrid}>
                {[
                  { key: "national_sales_director", label: "NSD" },
                  { key: "state_manager", label: "State Manager" },
                  { key: "supervisor", label: "Supervisor" },
                  { key: "agent", label: "Agents" },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.pillBtn, directiveSelectedCadre === r.key && styles.activePillBtn]}
                    onPress={() => setDirectiveSelectedCadre(r.key)}
                  >
                    <Text style={[styles.pillBtnText, directiveSelectedCadre === r.key && styles.activePillBtnText]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.formFieldLabel}>SPECIFIC USER / LEADER ID (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="Leave blank to assign to all in cadre or enter phone"
                placeholderTextColor="#64748b"
                value={targetStaffId}
                onChangeText={setTargetStaffId}
              />

              <View style={{ flexDirection: "row", gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>MONTHLY DATA QUOTA (GB)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="3000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={targetDataGoal}
                    onChangeText={setTargetDataGoal}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.formFieldLabel}>RETAIL AGENT QUOTA</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="25"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={targetAgentGoal}
                    onChangeText={setTargetAgentGoal}
                  />
                </View>
              </View>

              <Text style={styles.formFieldLabel}>AIRTIME SALES TARGET (₦)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="350000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={targetAirtimeGoal}
                onChangeText={setTargetAirtimeGoal}
              />

              <Text style={styles.formFieldLabel}>EXECUTIVE COMMAND / DIRECTIVE NOTE</Text>
              <TextInput
                style={[styles.textInputStyle, { height: 75, textAlignVertical: "top", paddingTop: 8 }]}
                multiline
                value={directiveNote}
                onChangeText={setDirectiveNote}
                placeholder="Type command directive..."
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity
                style={[
                  styles.primaryActionBtn,
                  { backgroundColor: "#0284c7", opacity: actionLoading ? 0.7 : 1 },
                ]}
                onPress={handleAssignTarget}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>DISPATCH DIRECTIVE TO CADRE</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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

  superPlanCard: {
    backgroundColor: "#0f172a",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    elevation: 2,
  },
  superPlanCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  planBadgeRow: { flexDirection: "row", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" },
  planNetworkPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planNetworkPillTxt: { fontSize: 10, fontWeight: "900" },
  planTypePill: { backgroundColor: "#1e293b", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planTypePillTxt: { color: "#cbd5e1", fontSize: 9.5, fontWeight: "700" },
  planStatusPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  planStatusPillTxt: { fontSize: 9, fontWeight: "900" },
  superPlanTitle: { color: "#f8fafc", fontSize: 13.5, fontWeight: "900", marginTop: 2 },
  superPlanEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.3)",
    gap: 4,
  },
  superPlanEditText: { color: "#00f0ff", fontSize: 11, fontWeight: "800" },
  cleanPricingRow: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cleanPriceBox: { flex: 1, alignItems: "center" },
  cleanPriceLabel: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  cleanPriceValue: { color: "#f8fafc", fontSize: 14, fontWeight: "900", marginTop: 2 },
  cleanPriceDivider: { width: 1, height: 28, backgroundColor: "#334155" },

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