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

  // 1. AYYANA CURRENT LGA LIST A SAMA DOMIN KAUCE WA BLANK ERROR
  const currentLgaList = NIGERIA_STATES_LGAS[managerState] || [
    "Central",
    "North",
    "South",
    "East",
    "West",
  ];

  // State Manager's Target Overview (Daga NSD)
  const [myStateTarget, setMyStateTarget] = useState({
    dataGoal: 0,
    airtimeGoal: 0,
    agentGoal: 0,
    supervisorGoal: 0,
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

  // Tabs & Search
  const [activeTab, setActiveTab] = useState("supervisors");
  const [selectedLga, setSelectedLga] = useState("All LGAs");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // =========================================================================
  // SMART AUTO-SPLIT PORTAL & MANUAL EDIT STATES
  // =========================================================================
  const [targetPortalVisible, setTargetPortalVisible] = useState(false);
  const [splitMode, setSplitMode] = useState("supervisor"); // 'supervisor' | 'agent'
  const [allocatedList, setAllocatedList] = useState([]);

  // Modal 1: Inspection Modal
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);

  // Modal 2: Advanced Target Command Modal States (Custom Target)
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetCategory, setTargetCategory] = useState("supervisor"); // 'supervisor' | 'agent' | 'lga'
  const [targetScope, setTargetScope] = useState("selected"); // 'selected' | 'all' | 'by_lga'
  const [targetSelectedLgas, setTargetSelectedLgas] = useState([]);
  const [targetSelectedPeopleIds, setTargetSelectedPeopleIds] = useState([]);
  
  // Quota Inputs
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("50000");
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Modal 3: Enroll Supervisor (Amfani da currentLgaList bayan an ayyana shi a sama)
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupLga, setNewSupLga] = useState(currentLgaList[0] || "Central");
  const [newSupPassword, setNewSupPassword] = useState("Password123@");

  // Modal 4: Broadcast Directive
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
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
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // KARBO DUKKAN BAYANAI DA TARGET DA NSD YA TURA
  const fetchDashboardData = useCallback(
    async (isBackground = false) => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const storedUserData = await AsyncStorage.getItem("userData");
        if (!token) {
          if (!isBackground) navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }

        let parsedUser = {};
        if (storedUserData) {
          try {
            parsedUser = JSON.parse(storedUserData);
            if (parsedUser.state && ALL_NIGERIAN_STATES.includes(parsedUser.state)) {
              setManagerState(parsedUser.state);
            }
          } catch (e) {}
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [dashRes, agentsRes, logsRes, targetRes] = await Promise.all([
          axios.get(`${BASE_URL}/leader/dashboard`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/leader/agents-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { agents: [] } })),
          axios.get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
          axios.get(`${BASE_URL}/leader/my-state-target`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
        ]);

        const dashData = dashRes.data?.data || dashRes.data || {};
        const fetchedSupervisors = dashData.supervisors || [];
        const fetchedAgents = agentsRes.data?.agents || dashData.agents || [];
        const fetchedLogs = logsRes.data?.logs || dashData.activityLogs || [];
        
        const fetchedMyTarget =
          targetRes.data?.targets ||
          targetRes.data?.data?.assignedTargets ||
          targetRes.data?.data ||
          dashData.myTargets ||
          dashData.leaderTargets ||
          parsedUser.targets ||
          {};

        setSupervisors(fetchedSupervisors);
        setAgents(fetchedAgents);
        setActivityLogs(fetchedLogs);

        const uniqueLgas = new Set(fetchedSupervisors.map((s) => s.lga).filter(Boolean)).size;
        const totalStateData = dashData.networkStats?.overallDataSold || 0;
        const totalStateAirtime = dashData.networkStats?.overallAirtimeSold || 0;

        setMyStateTarget({
          dataGoal: Number(fetchedMyTarget.dataGoal || fetchedMyTarget.dataVolumeQuota || 0),
          airtimeGoal: Number(fetchedMyTarget.airtimeGoal || fetchedMyTarget.airtimeSalesQuota || 0),
          agentGoal: Number(fetchedMyTarget.agentGoal || fetchedMyTarget.agentsQuota || 0),
          supervisorGoal: Number(fetchedMyTarget.supervisorGoal || fetchedMyTarget.supervisorsQuota || currentLgaList.length),
          currentMonth: fetchedMyTarget.currentMonth || fetchedMyTarget.month || fetchedMyTarget.targetCycle || "August 2026",
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
    },
    [navigation, currentLgaList.length]
  );

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

    if (Platform.OS === "web" && typeof window !== "undefined") {
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

  // =========================================================================
  // SMART AUTO-SPLIT ENGINE: KWAMFUTA TA RABA TARGET DA KANTA
  // =========================================================================
  const handleOpenSmartTargetPortal = (mode = "supervisor") => {
    setSplitMode(mode);
    const pool = mode === "supervisor" ? supervisors : agents;

    if (pool.length === 0) {
      showAlert(
        "No Staff Registered",
        `You do not have any registered ${mode === "supervisor" ? "Supervisors" : "Agents"} in ${managerState} State yet to allocate targets to.`
      );
      return;
    }

    const count = pool.length;
    const autoDataPerPerson = Math.floor((myStateTarget.dataGoal || 0) / count);
    const autoAirtimePerPerson = Math.floor((myStateTarget.airtimeGoal || 0) / count);
    const autoAgentPerPerson = mode === "supervisor" ? Math.max(1, Math.floor((myStateTarget.agentGoal || 10) / count)) : 0;

    const initialList = pool.map((item) => ({
      id: item._id || item.id,
      name: item.name || `${item.firstName || ""} ${item.surname || ""}` || "Staff",
      phone: item.phone || "N/A",
      lga: item.lga || "LGA",
      dataGoal: String(autoDataPerPerson),
      airtimeGoal: String(autoAirtimePerPerson),
      agentGoal: String(autoAgentPerPerson),
    }));

    setAllocatedList(initialList);
    setTargetPortalVisible(true);
  };

  const handleUpdateItemTarget = (id, field, value) => {
    setAllocatedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDeployAllocatedTargets = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      for (const item of allocatedList) {
        await axios.post(
          `${BASE_URL}/leader/assign-target`,
          {
            category: splitMode,
            scope: "selected",
            [splitMode === "supervisor" ? "supervisorIds" : "agentIds"]: [item.id],
            dataGoal: Number(item.dataGoal) || 0,
            airtimeGoal: Number(item.airtimeGoal) || 0,
            agentGoal: Number(item.agentGoal) || 0,
            month: myStateTarget.currentMonth,
            state: managerState,
          },
          { headers }
        );
      }

      showAlert(
        "Targets Deployed Successfully 🎯",
        `Quotas have been officially dispatched to ${allocatedList.length} ${splitMode === "supervisor" ? "Supervisors" : "Agents"} in ${managerState} State.`
      );
      setTargetPortalVisible(false);
      fetchDashboardData();
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleModalPerson = (id) => {
    if (targetSelectedPeopleIds.includes(id)) {
      setTargetSelectedPeopleIds(targetSelectedPeopleIds.filter((item) => item !== id));
    } else {
      setTargetSelectedPeopleIds([...targetSelectedPeopleIds, id]);
    }
  };

  const handleSelectAllModalPeople = () => {
    const pool = targetCategory === "supervisor" ? supervisors : agents;
    if (targetSelectedPeopleIds.length === pool.length) {
      setTargetSelectedPeopleIds([]);
    } else {
      setTargetSelectedPeopleIds(pool.map((p) => p._id || p.id));
    }
  };

  const handleToggleModalLga = (lga) => {
    if (targetSelectedLgas.includes(lga)) {
      setTargetSelectedLgas(targetSelectedLgas.filter((item) => item !== lga));
    } else {
      setTargetSelectedLgas([...targetSelectedLgas, lga]);
    }
  };

  const handleSelectAllModalLgas = () => {
    if (targetSelectedLgas.length === currentLgaList.length) {
      setTargetSelectedLgas([]);
    } else {
      setTargetSelectedLgas([...currentLgaList]);
    }
  };

  const handleDeployTarget = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        category: targetCategory,
        scope: targetScope,
        dataGoal: Number(targetDataGoal),
        airtimeGoal: Number(targetAirtimeGoal),
        agentGoal: Number(targetAgentGoal),
        month: targetMonth.trim(),
        state: managerState,
      };

      if (targetCategory === "lga") {
        if (targetScope === "by_lga" && targetSelectedLgas.length === 0) {
          showAlert("Validation Error", "Please select at least one LGA.");
          setActionLoading(false);
          return;
        }
        payload.lgas = targetScope === "all" ? currentLgaList : targetSelectedLgas;
      } else if (targetCategory === "supervisor") {
        if (targetScope === "selected" && targetSelectedPeopleIds.length === 0) {
          showAlert("Validation Error", "Please select at least one Supervisor.");
          setActionLoading(false);
          return;
        }
        payload.supervisorIds = targetScope === "all" ? supervisors.map((s) => s._id || s.id) : targetSelectedPeopleIds;
      } else if (targetCategory === "agent") {
        if (targetScope === "selected" && targetSelectedPeopleIds.length === 0) {
          showAlert("Validation Error", "Please select at least one Retail Agent.");
          setActionLoading(false);
          return;
        }
        payload.agentIds = targetScope === "all" ? agents.map((a) => a._id || a.id) : targetSelectedPeopleIds;
      }

      const res = await axios.post(`${BASE_URL}/leader/assign-target`, payload, { headers });

      if (res.data?.success || res.status === 200) {
        showAlert(
          "Targets Deployed 🎯",
          `Successfully allocated target (${targetDataGoal}GB Data, ₦${Number(targetAirtimeGoal).toLocaleString()} Airtime) across the specified recipients.`
        );
        setTargetModalVisible(false);
        setTargetSelectedPeopleIds([]);
        setTargetSelectedLgas([]);
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearTarget = async (recipientId, type = "supervisor") => {
    const confirmClear = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post(
          `${BASE_URL}/leader/assign-target`,
          {
            category: type,
            scope: "selected",
            [type === "supervisor" ? "supervisorIds" : "agentIds"]: [recipientId],
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

    if (Platform.OS === "web" && typeof window !== "undefined") {
      if (window.confirm("Are you sure you want to reset this target quota to 0?")) confirmClear();
    } else {
      Alert.alert("Reset Target", "Are you sure you want to reset target quota to 0?", [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: confirmClear },
      ]);
    }
  };

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
          showAlert("Updated", "Field Supervisor status updated.");
          fetchDashboardData();
        }
      } catch (e) {
        showAlert("Action Failed", e.response?.data?.message || "Could not update status.");
      }
    };

    if (Platform.OS === "web" && typeof window !== "undefined") {
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

  const handleEnrollSupervisor = async () => {
    const selectedLga = newSupLga || currentLgaList[0] || "Central";

    if (!newSupName.trim() || !newSupPhone.trim()) {
      return showAlert("Validation Error", "Full Name and Phone Number are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/leader/create-supervisor`,
        {
          name: newSupName.trim(),
          phone: newSupPhone.trim(),
          email: newSupEmail.trim() ? newSupEmail.trim().toLowerCase() : undefined,
          password: newSupPassword.trim() || "Password123@",
          state: managerState,
          lga: selectedLga,
          role: "supervisor",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert(
          "Supervisor Enrolled 🎉",
          `${newSupName} has been officially deployed to ${selectedLga} LGA, ${managerState} State.`
        );
        setEnrollModalVisible(false);
        setNewSupName("");
        setNewSupPhone("");
        setNewSupEmail("");
        setNewSupLga(currentLgaList[0] || "Central");
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Enrollment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

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

  const dataProgress = myStateTarget.dataGoal > 0 
    ? Math.min(Math.round(((myStateTarget.dataSold || 0) / myStateTarget.dataGoal) * 100), 100)
    : 0;

  const airtimeProgress = myStateTarget.airtimeGoal > 0 
    ? Math.min(Math.round(((myStateTarget.airtimeSold || 0) / myStateTarget.airtimeGoal) * 100), 100)
    : 0;

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
          {/* TARGET PORTAL QUICK ACCESS ICON */}
          <TouchableOpacity
            style={[styles.avatarBtn, styles.targetQuickIconBtn, { marginRight: 8 }]}
            onPress={() => handleOpenSmartTargetPortal("supervisor")}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="bullseye" size={16} color="#fbbf24" />
          </TouchableOpacity>

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
          
          {/* SECTION 1: STATE MANAGER'S TARGET OVERVIEW (WANDA NSD YA TURA TARE DA AUTO-SPLIT BUTTON) */}
          <View style={styles.executiveTargetCardDark}>
            <View style={styles.execHeaderRowDark}>
              <View>
                <Text style={styles.execBadgeTextDark}>OFFICIAL NSD STATE QUOTA ALLOCATION</Text>
                <Text style={styles.execTitleTextDark}>{myStateTarget.currentMonth.toUpperCase()} TARGET MATRIX</Text>
              </View>
              <TouchableOpacity
                style={styles.autoSplitBadgeBtn}
                onPress={() => handleOpenSmartTargetPortal("supervisor")}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calculator-variant" size={14} color="#ffffff" />
                <Text style={styles.autoSplitBadgeBtnText}>AUTO-SPLIT QUOTA</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.execMetricsGrid}>
              {/* Data Target */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#38bdf8" }]}>DATA QUOTA (GB)</Text>
                <Text style={styles.execMetricValueDark}>
                  {myStateTarget.dataSold} / {myStateTarget.dataGoal} GB
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{dataProgress}% Completed</Text>
              </View>

              {/* Airtime Target */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#fbbf24" }]}>AIRTIME SALES (₦)</Text>
                <Text style={styles.execMetricValueDark}>
                  ₦{Number(myStateTarget.airtimeSold).toLocaleString()} / ₦{Number(myStateTarget.airtimeGoal).toLocaleString()}
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${airtimeProgress}%`, backgroundColor: "#fbbf24" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{airtimeProgress}% Completed</Text>
              </View>

              {/* New Agents Goal */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#34d399" }]}>NEW AGENTS TARGET</Text>
                <Text style={styles.execMetricValueDark}>
                  {stats.totalAgents} / {myStateTarget.agentGoal || 50}
                </Text>
                <Text style={styles.execPercentSubDark}>Registered Retail Outlets</Text>
              </View>

              {/* New Supervisors Goal */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#2dd4bf" }]}>SUPERVISORS TARGET</Text>
                <Text style={styles.execMetricValueDark}>
                  {stats.totalSupervisors} / {myStateTarget.supervisorGoal || currentLgaList.length}
                </Text>
                <Text style={styles.execPercentSubDark}>LGA Network Leads</Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: DIRECT TARGET COMMAND BANNER */}
          <View style={styles.targetCommandBanner}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.targetBannerIconWrap}>
                <FontAwesome5 name="bullseye" size={18} color="#1e40af" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.targetBannerTitle}>State Quota Command Desk</Text>
                <Text style={styles.targetBannerSub}>System calculates & splits quota automatically or deploy custom targets to LGA leads</Text>
              </View>
            </View>

            <View style={styles.targetBannerBtnRow}>
              <TouchableOpacity
                style={styles.bannerActionBtnPrimary}
                onPress={() => handleOpenSmartTargetPortal("supervisor")}
              >
                <FontAwesome5 name="user-tie" size={12} color="#ffffff" />
                <Text style={styles.bannerActionBtnTextPrimary}>AUTO-SPLIT SUPERVISORS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bannerActionBtnSecondary}
                onPress={() => handleOpenSmartTargetPortal("agent")}
              >
                <Ionicons name="people" size={14} color="#059669" />
                <Text style={styles.bannerActionBtnTextSecondary}>AUTO-SPLIT AGENTS</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bannerActionBtnTertiary}
                onPress={() => {
                  setTargetCategory("lga");
                  setTargetScope("by_lga");
                  setTargetSelectedLgas([]);
                  setTargetModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="map-marker-radius" size={14} color="#0284c7" />
                <Text style={styles.bannerActionBtnTextTertiary}>TARGET LGAS</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 3: SUMMARY METRICS */}
          <View style={styles.telemetrySection}>
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Field Supervisors</Text>
                  <FontAwesome5 name="user-tie" size={13} color="#38bdf8" />
                </View>
                <Text style={styles.metricValueDark}>{stats.totalSupervisors}</Text>
                <Text style={styles.metricSubDark}>Across {stats.activeLgasCount} LGAs</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Retail Agents</Text>
                  <Ionicons name="people" size={15} color="#34d399" />
                </View>
                <Text style={styles.metricValueDark}>{stats.totalAgents}</Text>
                <Text style={styles.metricSubDark}>Active Resellers</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Data Delivered</Text>
                  <Ionicons name="server" size={14} color="#a78bfa" />
                </View>
                <Text style={styles.metricValueDark}>
                  {Number(stats.overallDataSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSubDark}>Retail Data Volume</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Airtime Sales</Text>
                  <Ionicons name="call" size={13} color="#fbbf24" />
                </View>
                <Text style={styles.metricValueDark}>
                  ₦{Number(stats.overallAirtimeSold || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSubDark}>Gross VTU Volume</Text>
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

          {/* TAB 1: FIELD SUPERVISORS */}
          {activeTab === "supervisors" && (
            <View style={styles.tabContentWrapper}>
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

                  return (
                    <View key={supId} style={styles.supCard}>
                      <View style={styles.supCardHeader}>
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

                      <View style={styles.statsSummaryGrid}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Data Target</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#1e40af" }]}>
                            {item.targets?.dataGoal || item.dataGoal || 0} GB
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Airtime Target</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                            ₦{Number(item.targets?.airtimeGoal || item.airtimeGoal || 0).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>New Agents Goal</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>
                            {item.targets?.agentGoal || item.agentGoal || 10}
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Team Size</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#0284c7" }]}>
                            {item.teamSize || item.agentsCount || 0}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.supActionRow}>
                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => {
                            setTargetCategory("supervisor");
                            setTargetScope("selected");
                            setTargetSelectedPeopleIds([supId]);
                            setTargetDataGoal(String(item.targets?.dataGoal || item.dataGoal || 500));
                            setTargetAirtimeGoal(String(item.targets?.airtimeGoal || item.airtimeGoal || 50000));
                            setTargetAgentGoal(String(item.targets?.agentGoal || item.agentGoal || 10));
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
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>GRASSROOT RETAIL AGENTS ({filteredAgents.length})</Text>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => {
                  const agId = ag._id || ag.id;

                  return (
                    <View key={agId} style={styles.agentCard}>
                      <View style={styles.agentCardTop}>
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

                      <View style={styles.agentQuotaRow}>
                        <Text style={styles.agentQuotaText}>
                          Data Target: <Text style={{ color: "#1e40af", fontWeight: "bold" }}>{ag.targets?.dataGoal || ag.dataGoal || 100} GB</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Airtime Target: <Text style={{ color: "#d97706", fontWeight: "bold" }}>₦{Number(ag.targets?.airtimeGoal || ag.airtimeGoal || 10000).toLocaleString()}</Text>
                        </Text>
                      </View>

                      <View style={styles.agentCardBottom}>
                        <TouchableOpacity
                          style={styles.agentActionMiniBtn}
                          onPress={() => {
                            setTargetCategory("agent");
                            setTargetScope("selected");
                            setTargetSelectedPeopleIds([agId]);
                            setTargetDataGoal(String(ag.targets?.dataGoal || ag.dataGoal || 100));
                            setTargetAirtimeGoal(String(ag.targets?.airtimeGoal || ag.airtimeGoal || 10000));
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

                          <View style={{ flexDirection: "row", marginTop: 8 }}>
                            <TouchableOpacity
                              style={[styles.lgaAppointBtn, { flex: 1, marginRight: 4 }]}
                              onPress={() => {
                                setTargetCategory("lga");
                                setTargetScope("by_lga");
                                setTargetSelectedLgas([lgaName]);
                                setTargetModalVisible(true);
                              }}
                            >
                              <Text style={styles.lgaAppointBtnText}>Set Target</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.lgaAppointBtn, { flex: 1, marginLeft: 4, backgroundColor: "#f1f5f9" }]}
                              onPress={() => {
                                setNewSupLga(lgaName);
                                setEnrollModalVisible(true);
                              }}
                            >
                              <Text style={[styles.lgaAppointBtnText, { color: "#475569" }]}>+ Add FS</Text>
                            </TouchableOpacity>
                          </View>
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

      {/* =========================================================================
          SABON SMART TARGET PORTAL: AUTO-SPLIT DA MANUAL CUSTOMIZATION TABLE
         ========================================================================= */}
      <Modal visible={targetPortalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "75%" : "96%", maxHeight: "92%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>
                  Auto-Split & Quota Adjustment ({splitMode.toUpperCase()}S)
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  NSD State Pool: {myStateTarget.dataGoal} GB Data & ₦{Number(myStateTarget.airtimeGoal).toLocaleString()} Airtime ({allocatedList.length} staff)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetPortalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.splitInstructionBanner}>
                <Ionicons name="information-circle" size={18} color="#1e40af" />
                <Text style={styles.splitInstructionText}>
                  System has divided the state quota equally among your active leads. You can increase (+) or reduce (-) any person's quota in the boxes below before deploying.
                </Text>
              </View>

              {/* TABLE LIST OF RECIPIENTS */}
              {allocatedList.map((item, index) => (
                <View key={item.id} style={styles.editableQuotaCard}>
                  <View style={styles.editableQuotaHeader}>
                    <Text style={styles.editableQuotaName}>
                      {index + 1}. {item.name}
                    </Text>
                    <Text style={styles.editableQuotaLga}>📍 {item.lga} LGA • 📞 {item.phone}</Text>
                  </View>

                  <View style={styles.editableInputGrid}>
                    <View style={styles.editableInputCol}>
                      <Text style={styles.inputMiniLabel}>DATA (GB)</Text>
                      <TextInput
                        style={styles.tableInputBox}
                        keyboardType="numeric"
                        value={item.dataGoal}
                        onChangeText={(val) => handleUpdateItemTarget(item.id, "dataGoal", val)}
                      />
                    </View>

                    <View style={styles.editableInputCol}>
                      <Text style={styles.inputMiniLabel}>AIRTIME (₦)</Text>
                      <TextInput
                        style={styles.tableInputBox}
                        keyboardType="numeric"
                        value={item.airtimeGoal}
                        onChangeText={(val) => handleUpdateItemTarget(item.id, "airtimeGoal", val)}
                      />
                    </View>

                    {splitMode === "supervisor" && (
                      <View style={styles.editableInputCol}>
                        <Text style={styles.inputMiniLabel}>NEW AGENTS</Text>
                        <TextInput
                          style={styles.tableInputBox}
                          keyboardType="numeric"
                          value={item.agentGoal}
                          onChangeText={(val) => handleUpdateItemTarget(item.id, "agentGoal", val)}
                        />
                      </View>
                    )}
                  </View>
                </View>
              ))}

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleDeployAllocatedTargets}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>
                    CONFIRM & DEPLOY ADJUSTED TARGETS TO FIELD
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

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
                  handleOpenSmartTargetPortal("supervisor");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <FontAwesome5 name="bullseye" size={15} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Auto-Split to Supervisors</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  handleOpenSmartTargetPortal("agent");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="people" size={16} color="#059669" />
                </View>
                <Text style={styles.navItemText}>Auto-Split to Agents</Text>
              </TouchableOpacity>

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

      {/* MODAL 2: ADVANCED TARGET DEPLOYMENT (CUSTOM ALLOCATION) */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "65%" : "95%", maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy Custom Targets</Text>
                <Text style={styles.modalCardSubtitle}>
                  State Operations: {managerState} Quota Allocation
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* STEP 1: SELECT TARGET RECIPIENT TYPE */}
              <Text style={styles.formFieldLabel}>1. SELECT TARGET CATEGORY</Text>
              <View style={styles.toggleSegmentRow}>
                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetCategory === "supervisor" && styles.toggleSegmentBtnActive]}
                  onPress={() => {
                    setTargetCategory("supervisor");
                    setTargetSelectedPeopleIds([]);
                  }}
                >
                  <FontAwesome5 name="user-tie" size={12} color={targetCategory === "supervisor" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetCategory === "supervisor" && styles.toggleSegmentTextActive]}>
                    Supervisors ({supervisors.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetCategory === "agent" && styles.toggleSegmentBtnActive]}
                  onPress={() => {
                    setTargetCategory("agent");
                    setTargetSelectedPeopleIds([]);
                  }}
                >
                  <Ionicons name="people" size={14} color={targetCategory === "agent" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetCategory === "agent" && styles.toggleSegmentTextActive]}>
                    Agents ({agents.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetCategory === "lga" && styles.toggleSegmentBtnActive]}
                  onPress={() => {
                    setTargetCategory("lga");
                    setTargetSelectedLgas([]);
                  }}
                >
                  <MaterialCommunityIcons name="map-marker-radius" size={14} color={targetCategory === "lga" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetCategory === "lga" && styles.toggleSegmentTextActive]}>
                    LGAs ({currentLgaList.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* STEP 2: SCOPE SELECTION */}
              <Text style={styles.formFieldLabel}>2. SELECT SCOPE (RECIPIENTS)</Text>
              <View style={styles.toggleSegmentRow}>
                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetScope === "selected" && styles.toggleSegmentBtnActive]}
                  onPress={() => setTargetScope("selected")}
                >
                  <Text style={[styles.toggleSegmentText, targetScope === "selected" && styles.toggleSegmentTextActive]}>
                    Select Specific Recipients
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetScope === "all" && styles.toggleSegmentBtnActive]}
                  onPress={() => {
                    setTargetScope("all");
                    if (targetCategory === "supervisor") setTargetSelectedPeopleIds(supervisors.map((s) => s._id || s.id));
                    if (targetCategory === "agent") setTargetSelectedPeopleIds(agents.map((a) => a._id || a.id));
                    if (targetCategory === "lga") setTargetSelectedLgas([...currentLgaList]);
                  }}
                >
                  <Text style={[styles.toggleSegmentText, targetScope === "all" && styles.toggleSegmentTextActive]}>
                    Select All in State
                  </Text>
                </TouchableOpacity>
              </View>

              {/* CHECKBOX LIST FOR SUPERVISORS OR AGENTS MULTI-SELECT */}
              {targetScope === "selected" && targetCategory !== "lga" && (
                <View style={styles.selectionListBox}>
                  <View style={styles.selectionListHeader}>
                    <Text style={styles.selectionListHeaderTitle}>
                      {targetCategory === "supervisor" ? "Select Supervisors" : "Select Agents"} ({targetSelectedPeopleIds.length} chosen)
                    </Text>
                    <TouchableOpacity onPress={handleSelectAllModalPeople}>
                      <Text style={styles.selectionListSelectAllText}>
                        {targetSelectedPeopleIds.length === (targetCategory === "supervisor" ? supervisors.length : agents.length)
                          ? "Deselect All"
                          : "Select All"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    {(targetCategory === "supervisor" ? supervisors : agents).map((item) => {
                      const id = item._id || item.id;
                      const name = item.name || `${item.firstName || ""} ${item.surname || ""}` || "User";
                      const isChecked = targetSelectedPeopleIds.includes(id);

                      return (
                        <TouchableOpacity
                          key={id}
                          style={[styles.personCheckItem, isChecked && styles.personCheckItemActive]}
                          onPress={() => handleToggleModalPerson(id)}
                        >
                          <MaterialIcons
                            name={isChecked ? "check-box" : "check-box-outline-blank"}
                            size={20}
                            color={isChecked ? "#1e40af" : "#94a3b8"}
                          />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={styles.personCheckName}>{name}</Text>
                            <Text style={styles.personCheckSub}>
                              📍 {item.lga || "LGA"} • 📞 {item.phone || "No phone"} {targetCategory === "agent" && item.assignedSupervisorName ? `• FS: ${item.assignedSupervisorName}` : ""}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* CHECKBOX LIST FOR SPECIFIC LGAS */}
              {targetCategory === "lga" && (
                <View style={styles.selectionListBox}>
                  <View style={styles.selectionListHeader}>
                    <Text style={styles.selectionListHeaderTitle}>
                      Select Target LGAs ({targetSelectedLgas.length} chosen)
                    </Text>
                    <TouchableOpacity onPress={handleSelectAllModalLgas}>
                      <Text style={styles.selectionListSelectAllText}>
                        {targetSelectedLgas.length === currentLgaList.length ? "Deselect All" : "Select All LGAs"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 160 }} nestedScrollEnabled>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                      {currentLgaList.map((lga) => {
                        const isChecked = targetSelectedLgas.includes(lga);
                        return (
                          <TouchableOpacity
                            key={lga}
                            style={[styles.lgaCheckItem, isChecked && styles.lgaCheckItemActive]}
                            onPress={() => handleToggleModalLga(lga)}
                          >
                            <MaterialIcons
                              name={isChecked ? "check-box" : "check-box-outline-blank"}
                              size={18}
                              color={isChecked ? "#1e40af" : "#94a3b8"}
                            />
                            <Text style={[styles.lgaCheckText, isChecked && { color: "#1e40af", fontWeight: "bold" }]}>
                              {lga}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              {/* STEP 3: QUOTA VALUES INPUTS */}
              <Text style={styles.formFieldLabel}>3. TARGET QUOTA GOALS</Text>
              
              <Text style={styles.formFieldSubLabel}>TARGET MONTH / CYCLE</Text>
              <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

              <Text style={styles.formFieldSubLabel}>DATA VOLUME GOAL (GB)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 500"
                placeholderTextColor="#94a3b8"
                value={targetDataGoal}
                onChangeText={setTargetDataGoal}
              />

              <Text style={styles.formFieldSubLabel}>AIRTIME SALES GOAL (₦)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 50000"
                placeholderTextColor="#94a3b8"
                value={targetAirtimeGoal}
                onChangeText={setTargetAirtimeGoal}
              />

              {targetCategory === "supervisor" && (
                <>
                  <Text style={styles.formFieldSubLabel}>NEW AGENTS RECRUITMENT GOAL (HEADCOUNT)</Text>
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
                    AUTHORIZE & DEPLOY TARGET QUOTAS
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ENROLL FIELD SUPERVISOR */}
      <Modal visible={enrollModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint Field Supervisor (FS)</Text>
                <Text style={styles.modalCardSubtitle}>Create user profile & deploy LGA field coordinator</Text>
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

              <Text style={styles.formFieldLabel}>PHONE NUMBER (LOGIN USERNAME)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08031234567"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newSupPhone}
                onChangeText={setNewSupPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (FOR LOGIN & NOTIFICATIONS)</Text>
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
                  <Text style={styles.primaryActionBtnText}>AUTHORIZE APPOINTMENT & CREATE ACCOUNT</Text>
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
  targetQuickIconBtn: {
    borderColor: "#fbbf24",
    backgroundColor: "rgba(251, 191, 36, 0.15)",
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

  executiveTargetCardDark: {
    backgroundColor: "#0f172a",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderLeftWidth: 5,
    borderLeftColor: "#38bdf8",
    elevation: 4,
  },
  execHeaderRowDark: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
    marginBottom: 12,
  },
  execBadgeTextDark: { color: "#94a3b8", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },
  execTitleTextDark: { color: "#ffffff", fontSize: 13.5, fontWeight: "900", marginTop: 2 },
  autoSplitBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  autoSplitBadgeBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "900", marginLeft: 4 },

  execMetricsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  execMetricBoxDark: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    borderRadius: 10,
    padding: 10,
    marginVertical: 4,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
  },
  execMetricLabelDark: { fontSize: 9.5, fontWeight: "800" },
  execMetricValueDark: { fontSize: 14.5, fontWeight: "900", marginVertical: 3, color: "#ffffff" },
  execProgressBarBgDark: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden", marginVertical: 3 },
  execProgressBarFill: { height: 6, borderRadius: 3 },
  execPercentSubDark: { color: "#94a3b8", fontSize: 9.5, fontWeight: "700" },

  targetCommandBanner: {
    backgroundColor: "#ffffff",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 14,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 5,
    borderLeftColor: "#1e40af",
    elevation: 2,
  },
  targetBannerIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  targetBannerTitle: { color: "#0f172a", fontSize: 13.5, fontWeight: "900" },
  targetBannerSub: { color: "#64748b", fontSize: 11, marginTop: 1 },
  targetBannerBtnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  bannerActionBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 4,
  },
  bannerActionBtnTextPrimary: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },
  bannerActionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ecfdf5",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginHorizontal: 4,
  },
  bannerActionBtnTextSecondary: { color: "#059669", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },
  bannerActionBtnTertiary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginLeft: 4,
  },
  bannerActionBtnTextTertiary: { color: "#0284c7", fontSize: 10, fontWeight: "900", marginLeft: 4 },

  telemetrySection: { paddingHorizontal: isLargeScreen ? 24 : 16, marginTop: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    elevation: 3,
  },
  cardDarkBlueBg: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderLeftColor: "#38bdf8",
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabelDark: { fontSize: 11, fontWeight: "800", color: "#94a3b8" },
  metricValueDark: { fontSize: 18, fontWeight: "900", marginVertical: 4, color: "#ffffff" },
  metricSubDark: { fontSize: 10, fontWeight: "700", color: "#38bdf8" },

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
  },
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

  // Auto Split Table Styles
  splitInstructionBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  splitInstructionText: { color: "#1e40af", fontSize: 11, marginLeft: 8, flex: 1, lineHeight: 15 },
  editableQuotaCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  editableQuotaHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  editableQuotaName: { fontSize: 12.5, fontWeight: "800", color: "#0f172a" },
  editableQuotaLga: { fontSize: 11, color: "#64748b", fontWeight: "600" },
  editableInputGrid: { flexDirection: "row", justifyContent: "space-between" },
  editableInputCol: { flex: 1, marginHorizontal: 3 },
  inputMiniLabel: { fontSize: 9, fontWeight: "800", color: "#475569", marginBottom: 2 },
  tableInputBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 6,
    paddingHorizontal: 8,
    height: 36,
    fontSize: 12,
    fontWeight: "bold",
    color: "#0f172a",
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
    maxWidth: 600,
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
    color: "#1e40af",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  formFieldSubLabel: {
    color: "#475569",
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 8,
    marginBottom: 4,
  },

  toggleSegmentRow: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderRadius: 10,
    padding: 4,
    marginBottom: 10,
  },
  toggleSegmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleSegmentBtnActive: {
    backgroundColor: "#1e40af",
    elevation: 2,
  },
  toggleSegmentText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    marginLeft: 4,
  },
  toggleSegmentTextActive: {
    color: "#ffffff",
    fontWeight: "900",
  },

  selectionListBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 12,
  },
  selectionListHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 6,
    marginBottom: 6,
  },
  selectionListHeaderTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
  },
  selectionListSelectAllText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1e40af",
  },
  personCheckItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 4,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  personCheckItemActive: {
    borderColor: "#1e40af",
    backgroundColor: "#eff6ff",
  },
  personCheckName: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "800",
  },
  personCheckSub: {
    color: "#64748b",
    fontSize: 10,
  },

  lgaCheckItem: {
    width: "48%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginBottom: 6,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  lgaCheckItemActive: {
    borderColor: "#1e40af",
    backgroundColor: "#eff6ff",
  },
  lgaCheckText: {
    color: "#475569",
    fontSize: 11,
    marginLeft: 6,
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