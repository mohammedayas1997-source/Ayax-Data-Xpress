import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Dimensions,
  Animated,
  TextInput,
  Modal,
  RefreshControl,
  StatusBar,
} from "react-native";
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { NIGERIA_STATES_LGAS, ALL_NIGERIAN_STATES } from "../utils/nigeriaGeoData";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const LeaderDashboard = ({ navigation }) => {
  const [managerState, setManagerState] = useState("Kano");
  const [supervisors, setSupervisors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // State Manager's Target Overview
  const [myStateTarget, setMyStateTarget] = useState({
    dataGoal: 5000,
    airtimeGoal: 500000,
    agentGoal: 50,
    supervisorGoal: 10,
    currentMonth: "August 2026",
    dataSold: 0,
    airtimeSold: 0,
  });

  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalAgents: 0,
    overallDataSold: 0,
    overallAirtimeSold: 0,
    activeQuotas: 0,
    activeLgasCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Filtration
  const [activeTab, setActiveTab] = useState("supervisors"); // 'supervisors', 'agents', 'lgas', 'history'
  const [selectedLga, setSelectedLga] = useState("All LGAs");
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk Selection States
  const [selectedSupIds, setSelectedSupIds] = useState([]);
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modal 1: Inspection Modal
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  // Modal 2: Target Modal (Single & Bulk Allocation)
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetMode, setTargetMode] = useState("single_sup"); // 'single_sup', 'bulk_sup', 'single_agent', 'bulk_agent'
  const [targetRecipient, setTargetRecipient] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("50000");
  const [targetAgentGoal, setTargetAgentGoal] = useState("10"); // Quota na kawo sabbin agents
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Modal 3: Enroll Supervisor
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupLga, setNewSupLga] = useState("");
  const [newSupPassword, setNewSupPassword] = useState("Password123@");

  // Modal 4: Broadcast Directive
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const currentLgaList = NIGERIA_STATES_LGAS[managerState] || [
    "Central", "North", "South", "East", "West",
  ];

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
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchDashboardData = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!token) {
        if (!isBackground) navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      if (storedUserData) {
        const parsed = JSON.parse(storedUserData);
        if (parsed.state && ALL_NIGERIAN_STATES.includes(parsed.state)) {
          setManagerState(parsed.state);
        }
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, agentsRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/leader/dashboard`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/leader/agents-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { agents: [] } })),
        axios.get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
      ]);

      const dashData = dashRes.data?.data || dashRes.data || {};
      const fetchedSupervisors = dashData.supervisors || [];
      const fetchedAgents = agentsRes.data?.agents || dashData.agents || [];
      const fetchedLogs = logsRes.data?.logs || dashData.activityLogs || [];
      const fetchedMyTarget = dashData.myTargets || dashData.leaderTargets || {};

      setSupervisors(fetchedSupervisors);
      setAgents(fetchedAgents);
      setActivityLogs(fetchedLogs);

      const uniqueLgas = new Set(fetchedSupervisors.map((s) => s.lga).filter(Boolean)).size;
      const totalStateData = dashData.networkStats?.overallDataSold || 0;
      const totalStateAirtime = dashData.networkStats?.overallAirtimeSold || 0;

      setMyStateTarget({
        dataGoal: fetchedMyTarget.dataGoal || 5000,
        airtimeGoal: fetchedMyTarget.airtimeGoal || 500000,
        agentGoal: fetchedMyTarget.agentGoal || 50,
        supervisorGoal: fetchedMyTarget.supervisorGoal || currentLgaList.length,
        currentMonth: fetchedMyTarget.currentMonth || "August 2026",
        dataSold: totalStateData,
        airtimeSold: totalStateAirtime,
      });

      setStats({
        totalSupervisors: fetchedSupervisors.length,
        totalAgents: fetchedAgents.length,
        overallDataSold: totalStateData,
        overallAirtimeSold: totalStateAirtime,
        activeQuotas: fetchedSupervisors.filter((s) => s.targetAssigned || s.dataGoal).length,
        activeLgasCount: uniqueLgas,
      });
    } catch (error) {
      if (error.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        console.error("State Operations Sync Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation, currentLgaList.length]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => {
      fetchDashboardData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Do you want to log out from State Manager session?")) {
        doLogout();
      }
    } else {
      Alert.alert("Confirm Logout", "Exit current State Operations session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  // Bulk Selection Handlers
  const handleSelectAllSupervisors = () => {
    if (selectedSupIds.length === supervisors.length) {
      setSelectedSupIds([]);
    } else {
      setSelectedSupIds(supervisors.map((s) => s._id || s.id));
    }
  };

  const handleToggleSupervisorSelect = (id) => {
    if (selectedSupIds.includes(id)) {
      setSelectedSupIds(selectedSupIds.filter((item) => item !== id));
    } else {
      setSelectedSupIds([...selectedSupIds, id]);
    }
  };

  const handleSelectAllAgents = () => {
    if (selectedAgentIds.length === agents.length) {
      setSelectedAgentIds([]);
    } else {
      setSelectedAgentIds(agents.map((a) => a._id || a.id));
    }
  };

  const handleToggleAgentSelect = (id) => {
    if (selectedAgentIds.includes(id)) {
      setSelectedAgentIds(selectedAgentIds.filter((item) => item !== id));
    } else {
      setSelectedAgentIds([...selectedAgentIds, id]);
    }
  };

  // Deploy Target (Supervisor ko Agent)
  const handleDeployTarget = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        mode: targetMode,
        dataGoal: Number(targetDataGoal),
        airtimeGoal: Number(targetAirtimeGoal),
        agentGoal: Number(targetAgentGoal),
        month: targetMonth.trim(),
        state: managerState,
      };

      if (targetMode === "single_sup") {
        payload.supervisorId = targetRecipient._id || targetRecipient.id;
        payload.lga = targetRecipient.lga;
      } else if (targetMode === "bulk_sup") {
        payload.supervisorIds = selectedSupIds;
      } else if (targetMode === "single_agent") {
        payload.agentId = targetRecipient._id || targetRecipient.id;
      } else if (targetMode === "bulk_agent") {
        payload.agentIds = selectedAgentIds;
      }

      const res = await axios.post(`${BASE_URL}/leader/assign-target`, payload, { headers });

      if (res.data?.success || res.status === 200) {
        showAlert("Targets Deployed 🎯", "Quota allocation successfully updated.");
        setTargetModalVisible(false);
        setTargetRecipient(null);
        setSelectedSupIds([]);
        setSelectedAgentIds([]);
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Clear Target
  const handleClearTarget = async (recipientId, type = "supervisor") => {
    const confirmClear = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post(
          `${BASE_URL}/leader/assign-target`,
          {
            mode: type === "supervisor" ? "single_sup" : "single_agent",
            [type === "supervisor" ? "supervisorId" : "agentId"]: recipientId,
            dataGoal: 0,
            airtimeGoal: 0,
            agentGoal: 0,
            month: targetMonth,
            state: managerState,
          },
          { headers }
        );

        showAlert("Cleared", "Target quota reset to 0.");
        fetchDashboardData();
      } catch (err) {
        showAlert("Error", "Could not clear target.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to reset this target quota to 0?")) confirmClear();
    } else {
      Alert.alert("Reset Target", "Are you sure you want to reset target quota to 0?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: confirmClear },
      ]);
    }
  };

  // Suspend / Unsuspend Supervisor
  const handleToggleSupervisorStatus = async (id, currentStatus, supName) => {
    const action = currentStatus ? "Reactivate (Unsuspend)" : "Suspend";
    const proceed = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const res = await axios.patch(
          `${BASE_URL}/leader/toggle-status/${id}`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.data?.success || res.status === 200) {
          showAlert("Updated", `Field Supervisor status updated.`);
          fetchDashboardData();
        }
      } catch (e) {
        showAlert("Action Failed", e.response?.data?.message || "Could not update status.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to ${action} ${supName || "this supervisor"}?`)) {
        proceed();
      }
    } else {
      Alert.alert("Confirm Action", `Are you sure you want to ${action} ${supName}?`, [
        { text: "Cancel", style: "cancel" },
        { text: `Yes, ${action}`, style: currentStatus ? "default" : "destructive", onPress: proceed },
      ]);
    }
  };

  // Enroll Supervisor (tare da Email)
  const handleEnrollSupervisor = async () => {
    if (!newSupName.trim() || !newSupPhone.trim() || !newSupLga) {
      return showAlert("Validation Error", "Name, Phone Number, and LGA are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/leader/create-supervisor`,
        {
          name: newSupName.trim(),
          phone: newSupPhone.trim(),
          email: newSupEmail.trim() || undefined,
          password: newSupPassword.trim() || "Password123@",
          state: managerState,
          lga: newSupLga,
          role: "supervisor",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Supervisor Enrolled 🎉", `Assigned to ${newSupLga} LGA, ${managerState} State.`);
        setEnrollModalVisible(false);
        setNewSupName("");
        setNewSupPhone("");
        setNewSupEmail("");
        setNewSupLga("");
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Enrollment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Broadcast Alert
  const handleBroadcastAlert = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      return showAlert("Validation Error", "Directive Title and Body Message are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/notifications/send`,
        {
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          category: "STATE_DIRECTIVE",
          state: managerState,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Directive Dispatched 🚀", "Notice delivered to all Field Supervisors.");
        setNotifModalVisible(false);
        setNotifTitle("");
        setNotifMessage("");
      }
    } catch (err) {
      showAlert("Broadcast Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredSupervisors = supervisors.filter((sup) => {
    const matchLga = selectedLga === "All LGAs" || (sup.lga && sup.lga.toLowerCase() === selectedLga.toLowerCase());
    const matchSearch =
      (sup.name || `${sup.firstName || ""} ${sup.surname || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sup.phone || "").includes(searchQuery) ||
      (sup.lga || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchLga && matchSearch;
  });

  const filteredAgents = agents.filter((ag) => {
    const matchLga = selectedLga === "All LGAs" || (ag.lga && ag.lga.toLowerCase() === selectedLga.toLowerCase());
    const matchSearch =
      (ag.name || `${ag.firstName || ""} ${ag.surname || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ag.phone || "").includes(searchQuery) ||
      (ag.assignedSupervisorName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchLga && matchSearch;
  });

  const supervisorChildAgents = selectedSupervisor
    ? agents.filter(
        (a) =>
          (a.assignedSupervisor && (a.assignedSupervisor._id === selectedSupervisor._id || a.assignedSupervisor === selectedSupervisor._id)) ||
          (a.lga && selectedSupervisor.lga && a.lga.toLowerCase() === selectedSupervisor.lga.toLowerCase())
      )
    : [];

  const dataProgress = Math.min(Math.round(((myStateTarget.dataSold || 0) / (myStateTarget.dataGoal || 1)) * 100), 100);
  const airtimeProgress = Math.min(Math.round(((myStateTarget.airtimeSold || 0) / (myStateTarget.airtimeGoal || 1)) * 100), 100);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderTitle}>{managerState.toUpperCase()} STATE OPERATIONS</Text>
        <Text style={styles.loaderText}>Syncing Telemetry & Quota Matrix...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
          <Feather name="menu" size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.stateBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.stateBadgeText}>{managerState.toUpperCase()} STATE MANAGER (SM)</Text>
          </View>
          <Text style={styles.topBrandTitle}>{currentLgaList.length} LGAS COMMAND DESK</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setEnrollModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.avatarBtn, styles.logoutIconBtn]} onPress={handleLogout} activeOpacity={0.7}>
            <Feather name="log-out" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN NAVIGATION TABS */}
      <View style={styles.mainNavBar}>
        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "supervisors" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("supervisors")}
        >
          <FontAwesome5
            name="user-tie"
            size={13}
            color={activeTab === "supervisors" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "supervisors" && styles.mainNavTabTextActive]}>
            Supervisors ({filteredSupervisors.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "agents" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("agents")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "agents" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "agents" && styles.mainNavTabTextActive]}>
            Agents ({filteredAgents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "lgas" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("lgas")}
        >
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={16}
            color={activeTab === "lgas" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "lgas" && styles.mainNavTabTextActive]}>
            LGAs ({currentLgaList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "history" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("history")}
        >
          <Feather
            name="activity"
            size={14}
            color={activeTab === "history" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "history" && styles.mainNavTabTextActive]}>
            Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* DASHBOARD SCROLL AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#1e40af" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* SECTION 1: STATE MANAGER'S TARGET OVERVIEW (WANDA NSD YA TURA MASA) */}
          <View style={styles.executiveTargetCard}>
            <View style={styles.execHeaderRow}>
              <View>
                <Text style={styles.execBadgeText}>OFFICIAL NSD STATE QUOTA ALLOCATION</Text>
                <Text style={styles.execTitleText}>{myStateTarget.currentMonth.toUpperCase()} TARGET PROGRESS</Text>
              </View>
              <View style={styles.cycleBadge}>
                <Ionicons name="calendar" size={12} color="#1e40af" />
                <Text style={styles.cycleBadgeText}>{myStateTarget.currentMonth}</Text>
              </View>
            </View>

            <View style={styles.execMetricsGrid}>
              {/* Data Target */}
              <View style={[styles.execMetricBox, { backgroundColor: "#f0f7ff", borderColor: "#bfdbfe" }]}>
                <Text style={[styles.execMetricLabel, { color: "#1e40af" }]}>DATA QUOTA (GB)</Text>
                <Text style={[styles.execMetricValue, { color: "#1e40af" }]}>
                  {myStateTarget.dataSold} / {myStateTarget.dataGoal} GB
                </Text>
                <View style={styles.execProgressBarBg}>
                  <View style={[styles.execProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#1e40af" }]} />
                </View>
                <Text style={styles.execPercentSub}>{dataProgress}% Completed</Text>
              </View>

              {/* Airtime Target */}
              <View style={[styles.execMetricBox, { backgroundColor: "#fffbeb", borderColor: "#fde68a" }]}>
                <Text style={[styles.execMetricLabel, { color: "#d97706" }]}>AIRTIME SALES (₦)</Text>
                <Text style={[styles.execMetricValue, { color: "#d97706" }]}>
                  ₦{Number(myStateTarget.airtimeSold).toLocaleString()} / ₦{Number(myStateTarget.airtimeGoal).toLocaleString()}
                </Text>
                <View style={styles.execProgressBarBg}>
                  <View style={[styles.execProgressBarFill, { width: `${airtimeProgress}%`, backgroundColor: "#d97706" }]} />
                </View>
                <Text style={styles.execPercentSub}>{airtimeProgress}% Completed</Text>
              </View>

              {/* New Agents Goal */}
              <View style={[styles.execMetricBox, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}>
                <Text style={[styles.execMetricLabel, { color: "#059669" }]}>NEW AGENTS TARGET</Text>
                <Text style={[styles.execMetricValue, { color: "#059669" }]}>
                  {stats.totalAgents} / {myStateTarget.agentGoal || 50}
                </Text>
                <Text style={styles.execPercentSub}>Registered Retail Outlets</Text>
              </View>

              {/* New Supervisors Goal */}
              <View style={[styles.execMetricBox, { backgroundColor: "#f0fdfa", borderColor: "#99f6e4" }]}>
                <Text style={[styles.execMetricLabel, { color: "#0d9488" }]}>SUPERVISORS TARGET</Text>
                <Text style={[styles.execMetricValue, { color: "#0d9488" }]}>
                  {stats.totalSupervisors} / {myStateTarget.supervisorGoal || currentLgaList.length}
                </Text>
                <Text style={styles.execPercentSub}>LGA Network Leads</Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: SUMMARY METRICS */}
          <View style={styles.telemetrySection}>
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, styles.cardBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#1e3a8a" }]}>Field Supervisors</Text>
                  <FontAwesome5 name="user-tie" size={13} color="#1e40af" />
                </View>
                <Text style={[styles.metricValue, { color: "#1e40af" }]}>{stats.totalSupervisors}</Text>
                <Text style={[styles.metricSub, { color: "#3b82f6" }]}>Across {stats.activeLgasCount} LGAs</Text>
              </View>

              <View style={[styles.metricCard, styles.cardGreenBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#065f46" }]}>Retail Agents</Text>
                  <Ionicons name="people" size={15} color="#059669" />
                </View>
                <Text style={[styles.metricValue, { color: "#059669" }]}>{stats.totalAgents}</Text>
                <Text style={[styles.metricSub, { color: "#059669" }]}>Active Resellers</Text>
              </View>

              <View style={[styles.metricCard, styles.cardPurpleBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#5b21b6" }]}>Data Delivered</Text>
                  <Ionicons name="server" size={14} color="#7c3aed" />
                </View>
                <Text style={[styles.metricValue, { color: "#7c3aed" }]}>
                  {Number(stats.overallDataSold || 0).toLocaleString()} GB
                </Text>
                <Text style={[styles.metricSub, { color: "#7c3aed" }]}>Retail Data Volume</Text>
              </View>

              <View style={[styles.metricCard, styles.cardAmberBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#92400e" }]}>Airtime Sales</Text>
                  <Ionicons name="call" size={13} color="#d97706" />
                </View>
                <Text style={[styles.metricValue, { color: "#d97706" }]}>
                  ₦{Number(stats.overallAirtimeSold || 0).toLocaleString()}
                </Text>
                <Text style={[styles.metricSub, { color: "#d97706" }]}>Gross VTU Volume</Text>
              </View>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${managerState} Supervisors, Agents, or LGA...`}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#64748b" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* TAB 1: FIELD SUPERVISORS (WITH BULK SELECT & TARGET DISTRIBUTION) */}
          {activeTab === "supervisors" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.bulkActionRibbon}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAllSupervisors}>
                  <MaterialIcons
                    name={selectedSupIds.length === supervisors.length && supervisors.length > 0 ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color="#1e40af"
                  />
                  <Text style={styles.bulkSelectBtnText}>
                    {selectedSupIds.length === supervisors.length && supervisors.length > 0
                      ? "Deselect All"
                      : `Select Supervisors (${selectedSupIds.length}/${supervisors.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedSupIds.length > 0 && (
                  <TouchableOpacity
                    style={styles.bulkTargetBtn}
                    onPress={() => {
                      setTargetMode("bulk_sup");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy Targets ({selectedSupIds.length} FS)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>FIELD SUPERVISORS DIRECTORY ({filteredSupervisors.length})</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setEnrollModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#ffffff" />
                  <Text style={styles.actionPillBtnText}>ENROLL FS</Text>
                </TouchableOpacity>
              </View>

              {filteredSupervisors.length > 0 ? (
                filteredSupervisors.map((item) => {
                  const supId = item._id || item.id;
                  const supName = item.name || `${item.firstName || ""} ${item.surname || ""}` || "Field Supervisor";
                  const supLga = item.lga || "Unassigned LGA";
                  const isSelected = selectedSupIds.includes(supId);

                  return (
                    <View
                      key={supId}
                      style={[styles.supCard, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.supCardHeader}>
                        <TouchableOpacity
                          style={{ marginRight: 10 }}
                          onPress={() => handleToggleSupervisorSelect(supId)}
                        >
                          <MaterialIcons
                            name={isSelected ? "check-box" : "check-box-outline-blank"}
                            size={22}
                            color={isSelected ? "#1e40af" : "#94a3b8"}
                          />
                        </TouchableOpacity>

                        <View style={styles.supMainInfo}>
                          <View style={styles.supAvatar}>
                            <FontAwesome5 name="user-tie" size={16} color="#1e40af" />
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.supNameText}>{supName}</Text>
                            <Text style={styles.locationTagText}>
                              📍 {supLga} LGA • 📞 {item.phone}
                            </Text>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleToggleSupervisorStatus(supId, item.isSuspended, supName)}
                        >
                          <MaterialIcons
                            name={item.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                            size={28}
                            color={item.isSuspended ? "#059669" : "#dc2626"}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Supervisor Targets Breakdown */}
                      <View style={styles.statsSummaryGrid}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Data Target</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#1e40af" }]}>
                            {item.dataGoal || 0} GB
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Airtime Target</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                            ₦{Number(item.airtimeGoal || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>New Agents Goal</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>
                            {item.agentGoal || 10}
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Team Size</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#0284c7" }]}>
                            {item.teamSize || item.agentsCount || 0}
                          </Text>
                        </View>
                      </View>

                      {/* Action Row */}
                      <View style={styles.supActionRow}>
                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => {
                            setTargetRecipient(item);
                            setTargetMode("single_sup");
                            setTargetDataGoal(String(item.dataGoal || 500));
                            setTargetAirtimeGoal(String(item.airtimeGoal || 50000));
                            setTargetAgentGoal(String(item.agentGoal || 10));
                            setTargetModalVisible(true);
                          }}
                        >
                          <FontAwesome5 name="edit" size={12} color="#1e40af" />
                          <Text style={[styles.supActionBtnText, { color: "#1e40af" }]}>Set Target</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => handleClearTarget(supId, "supervisor")}
                        >
                          <Feather name="trash-2" size={13} color="#dc2626" />
                          <Text style={[styles.supActionBtnText, { color: "#dc2626" }]}>Clear</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.supActionBtn, styles.inspectPillBtn]}
                          onPress={() => {
                            setSelectedSupervisor(item);
                            setInspectModalVisible(true);
                          }}
                        >
                          <Feather name="users" size={12} color="#1e40af" />
                          <Text style={[styles.supActionBtnText, { color: "#1e40af", fontWeight: "900" }]}>
                            Inspect ({item.teamSize || item.agentsCount || 0})
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <FontAwesome5 name="user-slash" size={34} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No field supervisors found in this region.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: AGENTS LIST */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.bulkActionRibbon}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAllAgents}>
                  <MaterialIcons
                    name={selectedAgentIds.length === agents.length && agents.length > 0 ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color="#059669"
                  />
                  <Text style={[styles.bulkSelectBtnText, { color: "#059669" }]}>
                    {selectedAgentIds.length === agents.length && agents.length > 0
                      ? "Deselect All"
                      : `Select Agents (${selectedAgentIds.length}/${agents.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedAgentIds.length > 0 && (
                  <TouchableOpacity
                    style={[styles.bulkTargetBtn, { backgroundColor: "#059669" }]}
                    onPress={() => {
                      setTargetMode("bulk_agent");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy Bulk Quotas ({selectedAgentIds.length} Agents)</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>GRASSROOT RETAIL AGENTS ({filteredAgents.length})</Text>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => {
                  const agId = ag._id || ag.id;
                  const isSelected = selectedAgentIds.includes(agId);

                  return (
                    <View key={agId} style={[styles.agentCard, isSelected && styles.cardSelected]}>
                      <View style={styles.agentCardTop}>
                        <TouchableOpacity
                          style={{ marginRight: 10 }}
                          onPress={() => handleToggleAgentSelect(agId)}
                        >
                          <MaterialIcons
                            name={isSelected ? "check-box" : "check-box-outline-blank"}
                            size={20}
                            color={isSelected ? "#059669" : "#94a3b8"}
                          />
                        </TouchableOpacity>

                        <View style={{ flex: 1 }}>
                          <Text style={styles.agentNameText}>{ag.name || "Retail Agent"}</Text>
                          <Text style={styles.agentSupervisorTag}>
                            FS Lead: {ag.assignedSupervisorName || "LGA Supervisor"} ({ag.lga || "LGA"})
                          </Text>
                          <Text style={styles.agentLocationTag}>📞 {ag.phone || "No phone"}</Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.agentSalesText}>
                            ₦{Number(ag.walletBalance || ag.balance || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.agentSalesSub}>Float</Text>
                        </View>
                      </View>

                      {/* Agent Quota Targets */}
                      <View style={styles.agentQuotaRow}>
                        <Text style={styles.agentQuotaText}>
                          Data Target: <Text style={{ color: "#1e40af", fontWeight: "bold" }}>{ag.dataGoal || 100} GB</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Airtime Target: <Text style={{ color: "#d97706", fontWeight: "bold" }}>₦{Number(ag.airtimeGoal || 10000).toLocaleString()}</Text>
                        </Text>
                      </View>

                      <View style={styles.agentCardBottom}>
                        <TouchableOpacity
                          style={styles.agentActionMiniBtn}
                          onPress={() => {
                            setTargetRecipient(ag);
                            setTargetMode("single_agent");
                            setTargetDataGoal(String(ag.dataGoal || 100));
                            setTargetAirtimeGoal(String(ag.airtimeGoal || 10000));
                            setTargetModalVisible(true);
                          }}
                        >
                          <FontAwesome5 name="edit" size={11} color="#1e40af" />
                          <Text style={[styles.agentActionMiniText, { color: "#1e40af" }]}>Set Quota</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.agentActionMiniBtn}
                          onPress={() => handleClearTarget(agId, "agent")}
                        >
                          <Feather name="trash-2" size={12} color="#dc2626" />
                          <Text style={[styles.agentActionMiniText, { color: "#dc2626" }]}>Clear</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.agentCallIconBtn}
                          onPress={() => Linking.openURL(`tel:${ag.phone}`)}
                        >
                          <Ionicons name="call" size={13} color="#1e40af" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={36} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No agents recorded in this region.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: LGAS MATRIX */}
          {activeTab === "lgas" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>LOCAL GOVERNMENTS DEPLOYMENT MATRIX</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setEnrollModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#ffffff" />
                  <Text style={styles.actionPillBtnText}>ENROLL FS</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.lgaGridContainer}>
                {currentLgaList.map((lgaName) => {
                  const supsInLga = supervisors.filter(
                    (s) => s.lga && s.lga.toLowerCase() === lgaName.toLowerCase()
                  );
                  const agentsInLga = agents.filter(
                    (a) => a.lga && a.lga.toLowerCase() === lgaName.toLowerCase()
                  );
                  const totalLgaData = supsInLga.reduce((acc, curr) => acc + Number(curr.teamPerformance || curr.dataSold || 0), 0);

                  return (
                    <View key={lgaName} style={styles.lgaCard}>
                      <View style={styles.lgaCardHeader}>
                        <Text style={styles.lgaNameTitle}>{lgaName}</Text>
                        <View
                          style={[
                            styles.lgaStatusBadge,
                            { backgroundColor: supsInLga.length > 0 ? "#ecfdf5" : "#fef2f2" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lgaStatusBadgeText,
                              { color: supsInLga.length > 0 ? "#059669" : "#dc2626" },
                            ]}
                          >
                            {supsInLga.length} FS
                          </Text>
                        </View>
                      </View>

                      {supsInLga.length > 0 ? (
                        <>
                          <Text style={styles.lgaSupervisorCount}>
                            👥 {supsInLga.length} Supervisor(s) Active
                          </Text>
                          <Text style={styles.lgaStatsSummary}>
                            {agentsInLga.length} Agents • {totalLgaData} GB Sold
                          </Text>

                          <TouchableOpacity
                            style={styles.lgaAppointBtn}
                            onPress={() => {
                              setNewSupLga(lgaName);
                              setEnrollModalVisible(true);
                            }}
                          >
                            <Text style={styles.lgaAppointBtnText}>+ Add More FS</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={{ alignItems: "center", paddingVertical: 10 }}>
                          <Text style={styles.lgaUnassignedText}>No Active Supervisor</Text>
                          <TouchableOpacity
                            style={styles.lgaAppointBtn}
                            onPress={() => {
                              setNewSupLga(lgaName);
                              setEnrollModalVisible(true);
                            }}
                          >
                            <Text style={styles.lgaAppointBtnText}>+ Appoint 1st Lead</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME FIELD OPERATIONS LOG</Text>
                <Text style={{ color: "#059669", fontSize: 11, fontWeight: "bold" }}>LIVE STREAM</Text>
              </View>

              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <View key={log._id || Math.random().toString()} style={styles.logCard}>
                    <View style={styles.logCardTop}>
                      <View style={styles.logCategoryBadge}>
                        <Text style={styles.logCategoryText}>{log.category || "FIELD_ACTION"}</Text>
                      </View>
                      <Text style={styles.logTimestamp}>
                        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "Live"}
                      </Text>
                    </View>
                    <Text style={styles.logDetailsText}>{log.details || log.action || "Field operation recorded."}</Text>
                    <Text style={styles.logActorText}>Actor: {log.user?.phone || log.actorRole || "State Desk"}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={34} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No real-time audit logs recorded yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* REPORT GENERATION BUTTON */}
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={async () => {
              const token = await AsyncStorage.getItem("userToken");
              Linking.openURL(`${BASE_URL}/leader/download-full-report?token=${token}`);
            }}
          >
            <MaterialIcons name="file-download" size={20} color="#ffffff" />
            <Text style={styles.downloadReportBtnText}>GENERATE {managerState.toUpperCase()} AUDIT REPORT (CSV)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* SIDEBAR DRAWER */}
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
                <MaterialCommunityIcons name="shield-star" size={28} color="#1e40af" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>{managerState} State</Text>
                  <Text style={styles.sidebarRoleText}>State Operations Hub</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>OPERATIONS NAVIGATION</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "supervisors" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("supervisors");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <FontAwesome5 name="user-tie" size={14} color="#1e40af" />
                </View>
                <Text style={[styles.navItemText, activeTab === "supervisors" && { color: "#1e40af", fontWeight: "900" }]}>
                  Field Supervisors (FS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "agents" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("agents");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="people" size={16} color="#059669" />
                </View>
                <Text style={[styles.navItemText, activeTab === "agents" && { color: "#059669", fontWeight: "900" }]}>
                  Grassroot Agents
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "lgas" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("lgas");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={16} color="#1e40af" />
                </View>
                <Text style={[styles.navItemText, activeTab === "lgas" && { color: "#1e40af", fontWeight: "900" }]}>
                  LGAs Matrix
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "history" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("history");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#fef3c7" }]}>
                  <Feather name="activity" size={15} color="#d97706" />
                </View>
                <Text style={[styles.navItemText, activeTab === "history" && { color: "#d97706", fontWeight: "900" }]}>
                  Audit Live Stream
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>COMMAND ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setEnrollModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Appoint Field Supervisor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setNotifModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#f0f9ff" }]}>
                  <Ionicons name="megaphone-outline" size={16} color="#0284c7" />
                </View>
                <Text style={styles.navItemText}>Broadcast Directive</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Exit Manager Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: INSPECTION MODAL */}
      <Modal visible={inspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "88%", width: isLargeScreen ? "60%" : "95%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>
                  {selectedSupervisor?.name?.toUpperCase()} ({selectedSupervisor?.lga} LGA)
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  Supervisor Contact: {selectedSupervisor?.phone} • Quota: {selectedSupervisor?.dataGoal || 500} GB
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inspectSummaryBanner}>
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Total Agents</Text>
                  <Text style={styles.inspectBannerValue}>{supervisorChildAgents.length}</Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Data Delivered</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#059669" }]}>
                    {selectedSupervisor?.teamPerformance || selectedSupervisor?.dataSold || 0} GB
                  </Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Airtime Sold</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#d97706" }]}>
                    ₦{Number(selectedSupervisor?.airtimeSold || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.formFieldLabel}>
                RETAIL AGENTS UNDER THIS SUPERVISOR ({supervisorChildAgents.length})
              </Text>

              {supervisorChildAgents.length > 0 ? (
                supervisorChildAgents.map((ag) => (
                  <View key={ag._id || ag.id} style={styles.inspectAgentCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inspectAgentName}>{ag.name}</Text>
                      <Text style={styles.inspectAgentPhone}>📞 {ag.phone || "N/A"}</Text>
                      <Text style={styles.inspectAgentSales}>
                        ₦{Number(ag.walletBalance || ag.balance || 0).toLocaleString()} Float • {ag.dataVolumeSold || 0} GB Sold
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.agentCallIconBtn}
                      onPress={() => Linking.openURL(`tel:${ag.phone}`)}
                    >
                      <Ionicons name="call" size={14} color="#1e40af" />
                    </TouchableOpacity>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={32} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No agents registered under this supervisor yet.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: TARGET DEPLOYMENT MODAL (SUPERVISOR VS AGENT QUOTAS) */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>
                  {targetMode.includes("sup")
                    ? targetMode === "bulk_sup"
                      ? `Deploy Target to ${selectedSupIds.length} Supervisors`
                      : `Set Target for Supervisor ${targetRecipient?.name}`
                    : targetMode === "bulk_agent"
                    ? `Deploy Quota to ${selectedAgentIds.length} Agents`
                    : `Set Quota for Agent ${targetRecipient?.name}`}
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  {targetMode.includes("sup") ? "Field Supervisor Quotas" : "Grassroot Agent Retail Quotas"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={styles.formFieldLabel}>TARGET MONTH / CYCLE</Text>
              <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

              {/* 1. DATA VOLUME TARGET */}
              <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor="#94a3b8"
                value={targetDataGoal}
                onChangeText={setTargetDataGoal}
              />

              {/* 2. AIRTIME SALES TARGET */}
              <Text style={styles.formFieldLabel}>AIRTIME SALES QUOTA (₦ NAIRA GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                placeholderTextColor="#94a3b8"
                value={targetAirtimeGoal}
                onChangeText={setTargetAirtimeGoal}
              />

              {/* 3. AGENT RECRUITMENT QUOTA (SUPERVISOR ONLY) */}
              {targetMode.includes("sup") && (
                <>
                  <Text style={styles.formFieldLabel}>NEW AGENT RECRUITMENT TARGET (HEADCOUNT)</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    keyboardType="numeric"
                    placeholder="e.g. 10"
                    placeholderTextColor="#94a3b8"
                    value={targetAgentGoal}
                    onChangeText={setTargetAgentGoal}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleDeployTarget}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>
                    {targetMode.includes("bulk") ? "AUTHORIZE BULK TARGETS" : "AUTHORIZE & DEPLOY TARGET"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ENROLL FIELD SUPERVISOR (WITH EMAIL FIELD) */}
      <Modal visible={enrollModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint Field Supervisor (FS)</Text>
                <Text style={styles.modalCardSubtitle}>Deploy LGA field coordinator in {managerState}</Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabel}>SELECT LOCAL GOVERNMENT AREA (LGA)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {currentLgaList.map((lga) => (
                  <TouchableOpacity
                    key={lga}
                    style={[styles.lgaTab, newSupLga === lga && styles.lgaTabActive]}
                    onPress={() => setNewSupLga(lga)}
                  >
                    <Text style={[styles.lgaTabText, newSupLga === lga && styles.lgaTabTextActive]}>
                      {lga}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formFieldLabel}>SUPERVISOR FULL NAME</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Aliyu Mohammed"
                placeholderTextColor="#94a3b8"
                value={newSupName}
                onChangeText={setNewSupName}
              />

              <Text style={styles.formFieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08031234567"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newSupPhone}
                onChangeText={setNewSupPhone}
              />

              {/* EMAIL FIELD */}
              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. supervisor@ayaxdata.online"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newSupEmail}
                onChangeText={setNewSupEmail}
              />

              <Text style={styles.formFieldLabel}>LOGIN PASSWORD</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Password123@"
                placeholderTextColor="#94a3b8"
                value={newSupPassword}
                onChangeText={setNewSupPassword}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleEnrollSupervisor}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>AUTHORIZE APPOINTMENT</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: DIRECTIVE BROADCAST */}
      <Modal visible={notifModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast State Directive</Text>
                <Text style={styles.modalCardSubtitle}>Push real-time alert across {managerState}</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Month-End Field Quota Acceleration"
              placeholderTextColor="#94a3b8"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type your official announcement here..."
              placeholderTextColor="#94a3b8"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleBroadcastAlert}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>DISPATCH DIRECTIVE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center" },
  loaderTitle: { color: "#38bdf8", fontSize: 16, fontWeight: "900", letterSpacing: 1.5, marginTop: 16 },
  loaderText: { color: "#94a3b8", fontSize: 12, fontWeight: "600", marginTop: 6 },
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
  },
  menuIconBtn: { padding: 6 },
  topBrandGroup: { alignItems: "center" },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#38bdf8", marginRight: 6 },
  stateBadgeText: { color: "#38bdf8", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  topBrandTitle: { color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  logoutIconBtn: { borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.15)" },
  mainNavBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingHorizontal: isLargeScreen ? 32 : 12,
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
  mainNavTabActive: { borderBottomColor: "#1e40af" },
  mainNavTabText: { color: "#64748b", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  mainNavTabTextActive: { color: "#1e40af", fontWeight: "900" },
  scrollArea: { flex: 1, width: "100%" },
  scrollContentContainer: { flexGrow: 1, alignItems: "center", paddingBottom: 120 },
  contentCenterWrapper: { width: "100%", maxWidth: 1100 },

  // Executive Target Card Styles
  executiveTargetCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 5,
    borderLeftColor: "#1e40af",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  execHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
    marginBottom: 12,
  },
  execBadgeText: { color: "#64748b", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },
  execTitleText: { color: "#0f172a", fontSize: 13.5, fontWeight: "900", marginTop: 2 },
  cycleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  cycleBadgeText: { color: "#1e40af", fontSize: 10.5, fontWeight: "800", marginLeft: 4 },
  execMetricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  execMetricBox: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    borderWidth: 1,
  },
  execMetricLabel: { fontSize: 9.5, fontWeight: "800" },
  execMetricValue: { fontSize: 14.5, fontWeight: "900", marginVertical: 3 },
  execProgressBarBg: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginVertical: 3 },
  execProgressBarFill: { height: 6, borderRadius: 3 },
  execPercentSub: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },

  // Bulk Actions
  bulkActionRibbon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  bulkSelectBtn: { flexDirection: "row", alignItems: "center" },
  bulkSelectBtnText: { color: "#1e40af", fontSize: 11.5, fontWeight: "800", marginLeft: 6 },
  bulkTargetBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkTargetBtnText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },

  telemetrySection: { paddingHorizontal: isLargeScreen ? 24 : 16, marginTop: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardBlueBg: { backgroundColor: "#f0f7ff", borderColor: "#bfdbfe", borderLeftColor: "#1e40af" },
  cardGreenBg: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderLeftColor: "#059669" },
  cardPurpleBg: { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe", borderLeftColor: "#7c3aed" },
  cardAmberBg: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderLeftColor: "#d97706" },

  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { fontSize: 11, fontWeight: "800" },
  metricValue: { fontSize: 18, fontWeight: "900", marginVertical: 4 },
  metricSub: { fontSize: 10, fontWeight: "700" },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 12 },
  tabContentWrapper: { paddingHorizontal: isLargeScreen ? 24 : 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionHeaderLabel: { color: "#475569", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "900", marginLeft: 4 },

  supCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardSelected: { borderColor: "#1e40af", backgroundColor: "#f0f7ff" },
  supCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  supMainInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  supAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  supNameText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  locationTagText: { color: "#64748b", fontSize: 11, marginTop: 2 },
  statsSummaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryBox: { width: "23%", alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 8.5, fontWeight: "700" },
  summaryBoxValue: { fontSize: 11.5, fontWeight: "900", marginTop: 2 },
  supActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  supActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  supActionBtnText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  inspectPillBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  agentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  agentCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  agentNameText: { color: "#0f172a", fontSize: 13.5, fontWeight: "800" },
  agentSupervisorTag: { color: "#1e40af", fontSize: 10.5, marginTop: 2, fontWeight: "600" },
  agentLocationTag: { color: "#64748b", fontSize: 10, marginTop: 2 },
  agentSalesText: { color: "#059669", fontSize: 14, fontWeight: "900" },
  agentSalesSub: { color: "#94a3b8", fontSize: 9.5 },
  agentQuotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 6,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  agentQuotaText: { fontSize: 10, color: "#64748b" },
  agentCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
  },
  agentActionMiniBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 3 },
  agentActionMiniText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  agentCallIconBtn: {
    backgroundColor: "#eff6ff",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  lgaGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  lgaCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  lgaCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lgaNameTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  lgaStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lgaStatusBadgeText: { fontSize: 10, fontWeight: "800" },
  lgaSupervisorCount: { color: "#1e40af", fontSize: 11, fontWeight: "700", marginTop: 6 },
  lgaStatsSummary: { color: "#64748b", fontSize: 10, marginTop: 2 },
  lgaAppointBtn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  lgaAppointBtnText: { color: "#1e40af", fontSize: 10, fontWeight: "800" },
  lgaUnassignedText: { color: "#dc2626", fontSize: 10, fontWeight: "600" },

  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logCategoryBadge: { backgroundColor: "#eff6ff", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  logCategoryText: { color: "#1e40af", fontSize: 9, fontWeight: "bold" },
  logTimestamp: { color: "#94a3b8", fontSize: 10 },
  logDetailsText: { color: "#0f172a", fontSize: 12, fontWeight: "600", marginVertical: 4 },
  logActorText: { color: "#64748b", fontSize: 10 },
  downloadReportBtn: {
    backgroundColor: "#1e40af",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  downloadReportBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12, marginLeft: 8 },
  emptyFeed: {
    backgroundColor: "#ffffff",
    padding: 30,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  emptyFeedText: { color: "#94a3b8", fontSize: 12, marginTop: 10, textAlign: "center" },

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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#1e40af", fontSize: 10.5, fontWeight: "700" },
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
  navItemActive: { backgroundColor: "#eff6ff" },
  navIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  navItemText: { color: "#334155", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 13, fontWeight: "800", marginLeft: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 460,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  modalCardTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  lgaTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  lgaTabActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  lgaTabText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  lgaTabTextActive: { color: "#ffffff", fontWeight: "900" },
  textInputStyle: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryActionBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
    elevation: 2,
  },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
  inspectSummaryBanner: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  inspectBannerBox: { flex: 1, alignItems: "center" },
  inspectBannerLabel: { color: "#1e40af", fontSize: 10, fontWeight: "700" },
  inspectBannerValue: { color: "#0f172a", fontSize: 15, fontWeight: "900", marginTop: 2 },
  inspectBannerDivider: { width: 1, height: 30, backgroundColor: "#bfdbfe" },
  inspectAgentCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  inspectAgentName: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  inspectAgentPhone: { color: "#64748b", fontSize: 11, marginTop: 1 },
  inspectAgentSales: { color: "#059669", fontSize: 10.5, fontWeight: "700", marginTop: 2 },
});

export default LeaderDashboard;