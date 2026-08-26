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
import { ALL_NIGERIAN_STATES } from "../utils/nigeriaGeoData";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NsdDashboard = ({ navigation }) => {
  const [statesData, setStatesData] = useState([]);
  const [nationalStats, setNationalStats] = useState({
    totalStates: 37,
    activeManagers: 0,
    totalSupervisors: 0,
    totalAgents: 0,
    nationalVolumeSold: 0,
    nationalAirtimeSold: 0,
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState("states"); // 'states', 'managers', 'history'
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk State Selection
  const [selectedStateNames, setSelectedStateNames] = useState([]);

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modal 1: Drill-down State Hierarchy
  const [stateInspectModalVisible, setStateInspectModalVisible] = useState(false);
  const [inspectedState, setInspectedState] = useState(null);
  const [inspectedSupervisors, setInspectedSupervisors] = useState([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Modal 2: Target Deployment Modal (Har da Raba Sabbin Agents & Sabbin Supervisors Quotas)
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetMode, setTargetMode] = useState("single"); // 'single' ko 'bulk'
  const [targetStateItem, setTargetStateItem] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("10000");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("500000");
  const [targetNewAgentGoal, setTargetNewAgentGoal] = useState("50"); // Sabbin Agents Target
  const [targetNewSupervisorGoal, setTargetNewSupervisorGoal] = useState("10"); // Sabbin Supervisors Target
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Modal 3: Appoint State Manager
  const [appointModalVisible, setAppointModalVisible] = useState(false);
  const [newSmName, setNewSmName] = useState("");
  const [newSmPhone, setNewSmPhone] = useState("");
  const [newSmEmail, setNewSmEmail] = useState("");
  const [newSmState, setNewSmState] = useState("Kano");
  const [newSmPassword, setNewSmPassword] = useState("Password123@");

  // Modal 4: Broadcast Directive
  const [broadcastModalVisible, setBroadcastModalVisible] = useState(false);
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
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchNationalTelemetry = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground) navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [dashRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/super-leader/dashboard`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
      ]);

      const dashData = dashRes.data?.data || dashRes.data || {};
      const fetchedStates = dashData.statesMatrix || [];
      const fetchedStats = dashData.nationalStats || {};
      const fetchedLogs = logsRes.data?.logs || [];

      setStatesData(fetchedStates);
      setActivityLogs(fetchedLogs);

      const calculatedTotalAgents = fetchedStates.reduce((acc, curr) => acc + (Number(curr.agentsCount) || 0), 0);
      const calculatedTotalSupervisors = fetchedStates.reduce((acc, curr) => acc + (Number(curr.supervisorsCount) || 0), 0);

      setNationalStats({
        totalStates: ALL_NIGERIAN_STATES.length,
        activeManagers: fetchedStates.filter((s) => s.hasLeader || s.leaderId).length,
        totalSupervisors: fetchedStats.totalSupervisors || calculatedTotalSupervisors || 0,
        totalAgents: fetchedStats.totalAgents || calculatedTotalAgents || 0,
        nationalVolumeSold: fetchedStats.nationalVolumeSold || 0,
        nationalAirtimeSold: fetchedStats.nationalAirtimeSold || 0,
      });
    } catch (error) {
      if (!isBackground) {
        console.error("NSD Telemetry Sync Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchNationalTelemetry();
    const interval = setInterval(() => {
      fetchNationalTelemetry(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchNationalTelemetry]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchNationalTelemetry();
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Terminate National Sales Director executive session?")) {
        doLogout();
      }
    } else {
      Alert.alert("Executive Sign Out", "Terminate active National Directorate session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Log Out", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const activeStatesList = statesData.filter((s) => s.hasLeader);

  const handleSelectAllStates = () => {
    if (selectedStateNames.length === activeStatesList.length) {
      setSelectedStateNames([]);
    } else {
      setSelectedStateNames(activeStatesList.map((s) => s.state));
    }
  };

  const handleToggleStateSelect = (stateName) => {
    if (selectedStateNames.includes(stateName)) {
      setSelectedStateNames(selectedStateNames.filter((s) => s !== stateName));
    } else {
      setSelectedStateNames([...selectedStateNames, stateName]);
    }
  };

  const handleInspectStateHierarchy = async (stateItem) => {
    setInspectedState(stateItem);
    setStateInspectModalVisible(true);
    setInspectLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const res = await axios.get(
        `${BASE_URL}/leader/dashboard?state=${encodeURIComponent(stateItem.state)}`,
        { headers, timeout: 15000 }
      );

      const stateSupervisors = res.data?.data?.supervisors || res.data?.supervisors || [];
      setInspectedSupervisors(stateSupervisors);
    } catch (err) {
      setInspectedSupervisors([]);
    } finally {
      setInspectLoading(false);
    }
  };

  const handleToggleStaffSuspension = (staffId, staffName, isSuspended) => {
    if (!staffId) return;

    const action = isSuspended ? "Reactivate (Unsuspend)" : "Suspend (Deactivate)";
    const confirmMessage = `Are you sure you want to ${action} ${staffName}?`;

    const proceed = () => {
      executeSuspension(staffId);
    };

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) proceed();
    } else {
      Alert.alert("Confirm Action", confirmMessage, [
        { text: "Cancel", style: "cancel" },
        { text: `Yes, ${action}`, style: isSuspended ? "default" : "destructive", onPress: proceed },
      ]);
    }
  };

  const executeSuspension = async (staffId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.patch(
        `${BASE_URL}/super-leader/toggle-status/${staffId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success || res.status === 200) {
        showAlert("Status Updated", "Staff operational access has been modified.");
        fetchNationalTelemetry();
        if (stateInspectModalVisible && inspectedState) {
          handleInspectStateHierarchy(inspectedState);
        }
      }
    } catch (e) {
      showAlert("Action Failed", e.response?.data?.message || "Could not update status.");
    }
  };

  // DEPLOY TARGET GA STATE MANAGER (SINGLE KO NATIONWIDE BULK)
  const handleDeployNationalTarget = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        mode: targetMode,
        dataGoal: Number(targetDataGoal),
        airtimeGoal: Number(targetAirtimeGoal),
        agentGoal: Number(targetNewAgentGoal), // Target na sabbin Agents
        supervisorGoal: Number(targetNewSupervisorGoal), // Target na sabbin Supervisors
        month: targetMonth.trim(),
      };

      if (targetMode === "single") {
        if (!targetStateItem?.leaderId) {
          showAlert("Notice", "No State Manager appointed for this state yet.");
          setActionLoading(false);
          return;
        }
        payload.leaderId = targetStateItem.leaderId;
        payload.state = targetStateItem.state;
      } else {
        payload.states = selectedStateNames.length > 0 ? selectedStateNames : ALL_NIGERIAN_STATES;
      }

      const res = await axios.post(`${BASE_URL}/super-leader/assign-target`, payload, { headers });

      if (res.data?.success || res.status === 200) {
        showAlert(
          "Targets Deployed 🎯",
          targetMode === "bulk"
            ? `Allocated target (${targetDataGoal}GB Data, ₦${Number(targetAirtimeGoal).toLocaleString()} Airtime, ${targetNewAgentGoal} New Agents, & ${targetNewSupervisorGoal} New Supervisors) across selected States.`
            : `Allocated target (${targetDataGoal}GB Data, ₦${Number(targetAirtimeGoal).toLocaleString()} Airtime, ${targetNewAgentGoal} New Agents, & ${targetNewSupervisorGoal} New Supervisors) to ${targetStateItem?.state} State Manager.`
        );
        setTargetModalVisible(false);
        setTargetStateItem(null);
        setSelectedStateNames([]);
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleClearStateTarget = async (leaderId, stateName) => {
    const confirmClear = async () => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        const headers = { Authorization: `Bearer ${token}` };

        await axios.post(
          `${BASE_URL}/super-leader/assign-target`,
          {
            mode: "single",
            leaderId,
            state: stateName,
            dataGoal: 0,
            airtimeGoal: 0,
            agentGoal: 0,
            supervisorGoal: 0,
            month: targetMonth,
          },
          { headers }
        );

        showAlert("Cleared", `All target quotas for ${stateName} State reset to 0.`);
        fetchNationalTelemetry();
      } catch (err) {
        showAlert("Error", "Could not reset target quota.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Are you sure you want to clear target quotas for ${stateName} State?`)) confirmClear();
    } else {
      Alert.alert("Reset State Target", `Reset all target quotas for ${stateName} State to 0?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: confirmClear },
      ]);
    }
  };

  const handleAppointStateManager = async () => {
    if (!newSmName.trim() || !newSmPhone.trim() || !newSmState) {
      showAlert("Validation Error", "Name, Phone Number, and State are required.");
      return;
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/super-leader/appoint-leader`,
        {
          name: newSmName.trim(),
          phone: newSmPhone.trim(),
          email: newSmEmail.trim() || undefined,
          password: newSmPassword.trim() || "Password123@",
          state: newSmState,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Appointed 🎉", `${newSmName} is now State Manager for ${newSmState}.`);
        setAppointModalVisible(false);
        setNewSmName("");
        setNewSmPhone("");
        setNewSmEmail("");
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBroadcastDirective = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showAlert("Validation Error", "Directive Title and Body are required.");
      return;
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/notifications/send`,
        {
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          category: "NATIONAL_DIRECTIVE",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Dispatched 🚀", "Directive pushed to all field personnel.");
        setBroadcastModalVisible(false);
        setNotifTitle("");
        setNotifMessage("");
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStates = statesData.filter((item) => {
    const q = searchQuery.toLowerCase();
    return (
      (item.state || "").toLowerCase().includes(q) ||
      (item.leaderName || "").toLowerCase().includes(q) ||
      (item.leaderPhone || "").includes(q)
    );
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderTitle}>NATIONAL SALES DIRECTOR (NSD)</Text>
        <Text style={styles.loaderText}>Establishing Real-Time 36 States Executive Link...</Text>
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
            <Text style={styles.stateBadgeText}>NATIONAL SALES DIRECTORATE</Text>
          </View>
          <Text style={styles.topBrandTitle}>36 STATES & FCT EXECUTIVE DESK</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setAppointModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setBroadcastModalVisible(true)}
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
          style={[styles.mainNavTab, activeTab === "states" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("states")}
        >
          <MaterialCommunityIcons
            name="map-legend"
            size={16}
            color={activeTab === "states" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "states" && styles.mainNavTabTextActive]}>
            36 States Matrix ({ALL_NIGERIAN_STATES.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "managers" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("managers")}
        >
          <FontAwesome5
            name="user-tie"
            size={13}
            color={activeTab === "managers" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "managers" && styles.mainNavTabTextActive]}>
            State Managers ({nationalStats.activeManagers})
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
            Live Stream
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
          {/* =========================================================================
              EXECUTIVE TARGET DISPATCH BANNER (BABBAN MABALLIN TURA TARGET)
             ========================================================================= */}
          <View style={styles.targetDispatchBanner}>
            <View style={styles.targetDispatchTop}>
              <View style={styles.targetIconBox}>
                <FontAwesome5 name="bullseye" size={20} color="#1e40af" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.targetBannerTitle}>National Target Command Desk</Text>
                <Text style={styles.targetBannerSub}>
                  Deploy Data, Airtime, New Agents, & New Supervisors quotas across 36 States
                </Text>
              </View>
            </View>

            <View style={styles.targetBannerActionRow}>
              <TouchableOpacity
                style={styles.targetBannerBtnPrimary}
                onPress={() => {
                  setTargetMode("bulk");
                  setSelectedStateNames(activeStatesList.map((s) => s.state));
                  setTargetModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="target-account" size={16} color="#ffffff" />
                <Text style={styles.targetBannerBtnTextPrimary}>DEPLOY TO ALL 36 STATES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.targetBannerBtnSecondary}
                onPress={() => {
                  setActiveTab("managers");
                }}
              >
                <Feather name="edit" size={14} color="#1e40af" />
                <Text style={styles.targetBannerBtnTextSecondary}>SELECT STATE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* =========================================================================
              NIGERIA EXECUTIVE TELEMETRY (DYNAMIC PASTEL BACKGROUNDS & COLORED ICONS)
             ========================================================================= */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.telemetryBadgeDot} />
                <Text style={styles.sectionHeaderLabel}>NIGERIA EXECUTIVE TELEMETRY</Text>
              </View>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#0284c7" />
                <Text style={styles.geoIndicatorText}>REAL-TIME LIVE SYNC</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              {/* CARD 1: STATE MANAGERS */}
              <View style={[styles.metricCard, styles.cardBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#1e3a8a" }]}>State Managers (SM)</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#dbeafe", borderColor: "#bfdbfe" }]}>
                    <FontAwesome5 name="user-tie" size={13} color="#1e40af" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#1e40af" }]}>
                  {nationalStats.activeManagers} / {ALL_NIGERIAN_STATES.length}
                </Text>
                <Text style={[styles.metricSub, { color: "#3b82f6" }]}>36 States & FCT Coverage</Text>
              </View>

              {/* CARD 2: FIELD SUPERVISORS */}
              <View style={[styles.metricCard, styles.cardSkyBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#0369a1" }]}>Field Supervisors (FS)</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#e0f2fe", borderColor: "#bae6fd" }]}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#0284c7" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#0284c7" }]}>{nationalStats.totalSupervisors}</Text>
                <Text style={[styles.metricSub, { color: "#0284c7" }]}>LGA Network Coordinators</Text>
              </View>

              {/* CARD 3: TOTAL RETAIL AGENTS */}
              <View style={[styles.metricCard, styles.cardGreenBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#065f46" }]}>Total Retail Agents</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#d1fae5", borderColor: "#a7f3d0" }]}>
                    <Ionicons name="people" size={16} color="#059669" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#059669" }]}>
                  {Number(nationalStats.totalAgents).toLocaleString()}
                </Text>
                <Text style={[styles.metricSub, { color: "#059669" }]}>Active Field Resellers</Text>
              </View>

              {/* CARD 4: NATIONAL DATA VOLUME */}
              <View style={[styles.metricCard, styles.cardPurpleBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#5b21b6" }]}>National Data Sold</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#ede9fe", borderColor: "#ddd6fe" }]}>
                    <Ionicons name="server" size={14} color="#7c3aed" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#7c3aed" }]}>
                  {Number(nationalStats.nationalVolumeSold || 0).toLocaleString()} GB
                </Text>
                <Text style={[styles.metricSub, { color: "#7c3aed" }]}>Delivered Telecom Bundles</Text>
              </View>

              {/* CARD 5: NATIONAL AIRTIME */}
              <View style={[styles.metricCard, styles.cardAmberBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#92400e" }]}>National Airtime Sold</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#fef3c7", borderColor: "#fde68a" }]}>
                    <Ionicons name="call" size={14} color="#d97706" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#d97706" }]}>
                  ₦{Number(nationalStats.nationalAirtimeSold || 0).toLocaleString()}
                </Text>
                <Text style={[styles.metricSub, { color: "#d97706" }]}>Gross Recharge VTU Value</Text>
              </View>

              {/* CARD 6: COVERAGE */}
              <View style={[styles.metricCard, styles.cardTealBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.metricLabel, { color: "#115e59" }]}>State Coverage Rate</Text>
                  <View style={[styles.metricIconWrap, { backgroundColor: "#ccfbf1", borderColor: "#99f6e4" }]}>
                    <MaterialCommunityIcons name="shield-check" size={15} color="#0d9488" />
                  </View>
                </View>
                <Text style={[styles.metricValue, { color: "#0d9488" }]}>
                  {Math.round((nationalStats.activeManagers / ALL_NIGERIAN_STATES.length) * 100)}%
                </Text>
                <Text style={[styles.metricSub, { color: "#0d9488" }]}>Executive Field Deployment</Text>
              </View>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search State, Manager name, phone, or region..."
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

          {/* TAB 1: 36 STATES GRID */}
          {activeTab === "states" && (
            <View style={styles.tabContentWrapper}>
              {/* Bulk Action Ribbon */}
              <View style={styles.bulkActionRibbon}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAllStates}>
                  <MaterialIcons
                    name={selectedStateNames.length === activeStatesList.length && activeStatesList.length > 0 ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color="#1e40af"
                  />
                  <Text style={styles.bulkSelectBtnText}>
                    {selectedStateNames.length === activeStatesList.length && activeStatesList.length > 0
                      ? "Deselect All"
                      : `Select States (${selectedStateNames.length}/${activeStatesList.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedStateNames.length > 0 && (
                  <TouchableOpacity
                    style={styles.bulkTargetBtn}
                    onPress={() => {
                      setTargetMode("bulk");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy Target ({selectedStateNames.length})</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>NIGERIA REGIONAL MATRICES ({filteredStates.length})</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setAppointModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#ffffff" />
                  <Text style={styles.actionPillBtnText}>APPOINT SM</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stateGridContainer}>
                {filteredStates.map((st) => {
                  const isSelected = selectedStateNames.includes(st.state);

                  return (
                    <View
                      key={st.state}
                      style={[styles.stateCard, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.stateCardHeader}>
                        {st.hasLeader && (
                          <TouchableOpacity
                            style={{ marginRight: 6 }}
                            onPress={() => handleToggleStateSelect(st.state)}
                          >
                            <MaterialIcons
                              name={isSelected ? "check-box" : "check-box-outline-blank"}
                              size={20}
                              color={isSelected ? "#1e40af" : "#94a3b8"}
                            />
                          </TouchableOpacity>
                        )}

                        <Text style={styles.stateNameTitle}>{st.state.toUpperCase()}</Text>
                        <View
                          style={[
                            styles.stateStatusBadge,
                            {
                              backgroundColor: st.hasLeader
                                ? st.isSuspended
                                  ? "#fef2f2"
                                  : "#ecfdf5"
                                : "#f1f5f9",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.stateStatusBadgeText,
                              {
                                color: st.hasLeader
                                ? st.isSuspended
                                  ? "#dc2626"
                                  : "#059669"
                                : "#64748b",
                              },
                            ]}
                          >
                            {st.hasLeader ? (st.isSuspended ? "SUSPENDED" : "ACTIVE") : "VACANT"}
                          </Text>
                        </View>
                      </View>

                      {st.hasLeader ? (
                        <>
                          <Text style={styles.managerNameText} numberOfLines={1}>
                            👤 {st.leaderName}
                          </Text>
                          <Text style={styles.managerSubDetails}>📞 {st.leaderPhone}</Text>
                          <Text style={styles.stateStatsSummary}>
                            {st.lgasTotal} LGAs • {st.supervisorsCount || 0} FS • {st.agentsCount || 0} Agents
                          </Text>

                          {/* Mini Targets Breakdown */}
                          <View style={styles.stateTargetMiniGrid}>
                            <View style={styles.stateTargetMiniItem}>
                              <Text style={styles.stateTargetMiniLabel}>Data Quota</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#1e40af" }]}>
                                {st.stateDataGoal || 0} GB
                              </Text>
                            </View>
                            <View style={styles.stateTargetMiniItem}>
                              <Text style={styles.stateTargetMiniLabel}>Airtime Quota</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#d97706" }]}>
                                ₦{Number(st.stateAirtimeGoal || 0).toLocaleString()}
                              </Text>
                            </View>
                            <View style={styles.stateTargetMiniItem}>
                              <Text style={styles.stateTargetMiniLabel}>New Agents Goal</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#059669" }]}>
                                {st.stateAgentGoal || 50} Agents
                              </Text>
                            </View>
                            <View style={styles.stateTargetMiniItem}>
                              <Text style={styles.stateTargetMiniLabel}>New FS Goal</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#0284c7" }]}>
                                {st.stateSupervisorGoal || 10} FS
                              </Text>
                            </View>
                          </View>

                          {/* Action Buttons */}
                          <View style={styles.stateCardActionGrid}>
                            <TouchableOpacity
                              style={styles.stateDeployTargetBtn}
                              onPress={() => {
                                setTargetStateItem(st);
                                setTargetMode("single");
                                setTargetDataGoal(String(st.stateDataGoal || 10000));
                                setTargetAirtimeGoal(String(st.stateAirtimeGoal || 500000));
                                setTargetNewAgentGoal(String(st.stateAgentGoal || 50));
                                setTargetNewSupervisorGoal(String(st.stateSupervisorGoal || 10));
                                setTargetModalVisible(true);
                              }}
                            >
                              <FontAwesome5 name="bullseye" size={11} color="#ffffff" />
                              <Text style={styles.stateDeployTargetBtnText}>Set Targets</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.inspectPill}
                              onPress={() => handleInspectStateHierarchy(st)}
                            >
                              <Feather name="users" size={12} color="#1e40af" />
                              <Text style={styles.inspectPillText}>Inspect</Text>
                            </TouchableOpacity>
                          </View>
                        </>
                      ) : (
                        <View style={{ alignItems: "center", paddingVertical: 12 }}>
                          <Text style={styles.stateVacantText}>No State Manager Appointed</Text>
                          <TouchableOpacity
                            style={styles.stateAppointBtn}
                            onPress={() => {
                              setNewSmState(st.state);
                              setAppointModalVisible(true);
                            }}
                          >
                            <Text style={styles.stateAppointBtnText}>+ Appoint Manager</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* TAB 2: STATE MANAGERS LIST */}
          {activeTab === "managers" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.bulkActionRibbon}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAllStates}>
                  <MaterialIcons
                    name={selectedStateNames.length === activeStatesList.length && activeStatesList.length > 0 ? "check-box" : "check-box-outline-blank"}
                    size={20}
                    color="#1e40af"
                  />
                  <Text style={styles.bulkSelectBtnText}>
                    {selectedStateNames.length === activeStatesList.length && activeStatesList.length > 0
                      ? "Deselect All"
                      : `Select All (${selectedStateNames.length}/${activeStatesList.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedStateNames.length > 0 && (
                  <TouchableOpacity
                    style={styles.bulkTargetBtn}
                    onPress={() => {
                      setTargetMode("bulk");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy Bulk Targets ({selectedStateNames.length})</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>APPOINTED STATE MANAGERS ({nationalStats.activeManagers})</Text>
              </View>

              {statesData.filter((s) => s.hasLeader).map((sm) => {
                const isSelected = selectedStateNames.includes(sm.state);

                return (
                  <View
                    key={sm.state}
                    style={[styles.managerCard, isSelected && styles.cardSelected]}
                  >
                    <View style={styles.managerCardHeader}>
                      <TouchableOpacity
                        style={{ marginRight: 10 }}
                        onPress={() => handleToggleStateSelect(sm.state)}
                      >
                        <MaterialIcons
                          name={isSelected ? "check-box" : "check-box-outline-blank"}
                          size={22}
                          color={isSelected ? "#1e40af" : "#94a3b8"}
                        />
                      </TouchableOpacity>

                      <View style={styles.managerMainInfo}>
                        <View style={styles.managerAvatar}>
                          <FontAwesome5 name="user-tie" size={17} color="#1e40af" />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                          <Text style={styles.managerCardName}>{sm.leaderName}</Text>
                          <Text style={styles.managerCardState}>
                            📍 {sm.state} State Manager • {sm.leaderPhone}
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleToggleStaffSuspension(sm.leaderId, sm.leaderName, sm.isSuspended)}
                        style={styles.suspendIconButton}
                      >
                        <MaterialIcons
                          name={sm.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                          size={32}
                          color={sm.isSuspended ? "#059669" : "#dc2626"}
                        />
                      </TouchableOpacity>
                    </View>

                    {/* Manager 4 Targets Breakdown */}
                    <View style={styles.statsSummaryGrid}>
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>Data Quota</Text>
                        <Text style={[styles.summaryBoxValue, { color: "#1e40af" }]}>
                          {sm.stateDataGoal || 0} GB
                        </Text>
                      </View>
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>Airtime Quota</Text>
                        <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                          ₦{Number(sm.stateAirtimeGoal || 0).toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>New Agents</Text>
                        <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>
                          {sm.stateAgentGoal || 50}
                        </Text>
                      </View>
                      <View style={styles.summaryBox}>
                        <Text style={styles.summaryBoxLabel}>New FS</Text>
                        <Text style={[styles.summaryBoxValue, { color: "#0284c7" }]}>
                          {sm.stateSupervisorGoal || 10}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.managerActionRow}>
                      <TouchableOpacity
                        style={styles.managerActionBtn}
                        onPress={() => {
                          setTargetStateItem(sm);
                          setTargetMode("single");
                          setTargetDataGoal(String(sm.stateDataGoal || 10000));
                          setTargetAirtimeGoal(String(sm.stateAirtimeGoal || 500000));
                          setTargetNewAgentGoal(String(sm.stateAgentGoal || 50));
                          setTargetNewSupervisorGoal(String(sm.stateSupervisorGoal || 10));
                          setTargetModalVisible(true);
                        }}
                      >
                        <FontAwesome5 name="edit" size={12} color="#1e40af" />
                        <Text style={[styles.managerActionBtnText, { color: "#1e40af" }]}>Set/Edit Targets</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.managerActionBtn}
                        onPress={() => handleClearStateTarget(sm.leaderId, sm.state)}
                      >
                        <Feather name="trash-2" size={13} color="#dc2626" />
                        <Text style={[styles.managerActionBtnText, { color: "#dc2626" }]}>Clear</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.managerActionBtn}
                        onPress={() => handleInspectStateHierarchy(sm)}
                      >
                        <Feather name="users" size={12} color="#059669" />
                        <Text style={[styles.managerActionBtnText, { color: "#059669" }]}>Inspect Team</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.managerActionBtn}
                        onPress={() => Linking.openURL(`tel:${sm.leaderPhone}`)}
                      >
                        <Ionicons name="call" size={13} color="#0284c7" />
                        <Text style={[styles.managerActionBtnText, { color: "#0284c7" }]}>Call</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* TAB 3: AUDIT STREAM */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>NATIONAL LIVE AUDIT STREAM</Text>
                <Text style={{ color: "#059669", fontSize: 11, fontWeight: "bold" }}>REAL-TIME FEED</Text>
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
                    <Text style={styles.logActorText}>Actor: {log.user?.phone || log.actorRole || "NSD Node"}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={36} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No real-time audit logs recorded yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* FULL REPORT CSV EXPORT */}
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={async () => {
              const token = await AsyncStorage.getItem("userToken");
              Linking.openURL(`${BASE_URL}/super-leader/download-report?token=${token}`);
            }}
          >
            <MaterialIcons name="file-download" size={20} color="#ffffff" />
            <Text style={styles.downloadReportBtnText}>EXPORT 36 STATES AUDIT REPORT (CSV)</Text>
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
                <MaterialCommunityIcons name="shield-crown" size={28} color="#1e40af" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>National Director</Text>
                  <Text style={styles.sidebarRoleText}>Head of Field Sales (NSD)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>NAVIGATION MATRICES</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "states" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("states");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <MaterialCommunityIcons name="map-legend" size={16} color="#1e40af" />
                </View>
                <Text style={[styles.navItemText, activeTab === "states" && { color: "#1e40af", fontWeight: "900" }]}>
                  36 States Matrix
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "managers" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("managers");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <FontAwesome5 name="user-tie" size={14} color="#1e40af" />
                </View>
                <Text style={[styles.navItemText, activeTab === "managers" && { color: "#1e40af", fontWeight: "900" }]}>
                  State Managers
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "history" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("history");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Feather name="activity" size={15} color="#059669" />
                </View>
                <Text style={[styles.navItemText, activeTab === "history" && { color: "#059669", fontWeight: "900" }]}>
                  Audit Feed
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>EXECUTIVE ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setTargetMode("bulk");
                  setSelectedStateNames(activeStatesList.map((s) => s.state));
                  setTargetModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#fef3c7" }]}>
                  <FontAwesome5 name="bullseye" size={14} color="#d97706" />
                </View>
                <Text style={styles.navItemText}>Deploy State Targets</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setAppointModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Appoint State Manager</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setBroadcastModalVisible(true);
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
              <Text style={styles.logoutBtnText}>Exit NSD Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: DRILL-DOWN INSPECTION */}
      <Modal visible={stateInspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "90%", width: isLargeScreen ? "65%" : "95%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>
                  {inspectedState?.state?.toUpperCase()} FIELD HIERARCHY
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  State Manager: {inspectedState?.leaderName} ({inspectedState?.leaderPhone})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStateInspectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {inspectLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#1e40af" />
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 10 }}>
                  Fetching LGA Field Supervisors & Agents...
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionHeaderLabel}>
                    ACTIVE LGA FIELD SUPERVISORS ({inspectedSupervisors.length})
                  </Text>
                </View>

                {inspectedSupervisors.length > 0 ? (
                  inspectedSupervisors.map((sup) => (
                    <View key={sup.id || sup._id} style={styles.inspectSupCard}>
                      <View style={styles.supCardHeader}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.inspectSupName}>{sup.name}</Text>
                          <Text style={styles.inspectSupLga}>
                            📍 {sup.lga} LGA • 📞 {sup.phone}
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleToggleStaffSuspension(sup.id || sup._id, sup.name, sup.isSuspended)}
                        >
                          <MaterialIcons
                            name={sup.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                            size={28}
                            color={sup.isSuspended ? "#059669" : "#dc2626"}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.statsSummaryRow}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Agents</Text>
                          <Text style={styles.summaryBoxValue}>{sup.teamSize || sup.agentsCount || 0}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Data Delivered</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>
                            {sup.teamPerformance || sup.dataSold || 0} GB
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Airtime Sold</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                            ₦{Number(sup.airtimeSold || 0).toLocaleString()}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyFeed}>
                    <FontAwesome5 name="user-slash" size={30} color="#94a3b8" />
                    <Text style={styles.emptyFeedText}>No Field Supervisors deployed in this state yet.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ASSIGN NATIONAL TARGETS (DATA, AIRTIME, NEW AGENTS, & NEW SUPERVISORS) */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>
                  {targetMode === "bulk"
                    ? `Deploy Nationwide Quotas (${selectedStateNames.length} States)`
                    : `Deploy State Targets (${targetStateItem?.state} State)`}
                </Text>
                <Text style={styles.modalCardSubtitle}>
                  {targetMode === "bulk"
                    ? `Applying quotas across selected state directorates`
                    : `State Director: ${targetStateItem?.leaderName} (${targetStateItem?.leaderPhone})`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={styles.formFieldLabel}>TARGET CYCLE / MONTH</Text>
              <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

              {/* 1. DATA VOLUME TARGET */}
              <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 10000"
                placeholderTextColor="#94a3b8"
                value={targetDataGoal}
                onChangeText={setTargetDataGoal}
              />

              {/* 2. AIRTIME SALES TARGET */}
              <Text style={styles.formFieldLabel}>AIRTIME SALES QUOTA (₦ NAIRA GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 500000"
                placeholderTextColor="#94a3b8"
                value={targetAirtimeGoal}
                onChangeText={setTargetAirtimeGoal}
              />

              {/* 3. NEW AGENTS RECRUITMENT TARGET */}
              <Text style={styles.formFieldLabel}>NEW AGENTS REGISTRATION TARGET (HEADCOUNT)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor="#94a3b8"
                value={targetNewAgentGoal}
                onChangeText={setTargetNewAgentGoal}
              />

              {/* 4. NEW SUPERVISORS APPOINTMENT TARGET */}
              <Text style={styles.formFieldLabel}>NEW SUPERVISORS APPOINTMENT TARGET (LGA LEADS)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 10"
                placeholderTextColor="#94a3b8"
                value={targetNewSupervisorGoal}
                onChangeText={setTargetNewSupervisorGoal}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleDeployNationalTarget}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>
                    {targetMode === "bulk" ? "AUTHORIZE NATIONWIDE TARGET ALLOCATION" : "AUTHORIZE & DEPLOY TARGETS"}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: APPOINT STATE MANAGER */}
      <Modal visible={appointModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint State Manager (SM)</Text>
                <Text style={styles.modalCardSubtitle}>Deploy state executive director</Text>
              </View>
              <TouchableOpacity onPress={() => setAppointModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabel}>SELECT NIGERIAN STATE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {ALL_NIGERIAN_STATES.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.stateTabPill, newSmState === st && styles.stateTabPillActive]}
                    onPress={() => setNewSmState(st)}
                  >
                    <Text style={[styles.stateTabPillText, newSmState === st && styles.stateTabPillTextActive]}>
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.formFieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Sani Bello"
                placeholderTextColor="#94a3b8"
                value={newSmName}
                onChangeText={setNewSmName}
              />

              <Text style={styles.formFieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08022223333"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newSmPhone}
                onChangeText={setNewSmPhone}
              />

              <Text style={styles.formFieldLabel}>PASSWORD (FOR LOGIN)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Password123@"
                placeholderTextColor="#94a3b8"
                value={newSmPassword}
                onChangeText={setNewSmPassword}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleAppointStateManager}
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

      {/* MODAL 4: BROADCAST NATIONAL DIRECTIVE */}
      <Modal visible={broadcastModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast National Directive</Text>
                <Text style={styles.modalCardSubtitle}>Push directive across 36 State Managers</Text>
              </View>
              <TouchableOpacity onPress={() => setBroadcastModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Nationwide Month-End Acceleration"
              placeholderTextColor="#94a3b8"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type executive announcement here..."
              placeholderTextColor="#94a3b8"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleBroadcastDirective}
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

  // Target Command Dispatch Banner
  targetDispatchBanner: {
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
  targetDispatchTop: { flexDirection: "row", alignItems: "center" },
  targetIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  targetBannerTitle: { color: "#0f172a", fontSize: 13.5, fontWeight: "900" },
  targetBannerSub: { color: "#64748b", fontSize: 11, marginTop: 1 },
  targetBannerActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 10,
  },
  targetBannerBtnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 6,
  },
  targetBannerBtnTextPrimary: { color: "#ffffff", fontSize: 11, fontWeight: "900", marginLeft: 5 },
  targetBannerBtnSecondary: {
    flex: 0.45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  targetBannerBtnTextSecondary: { color: "#1e40af", fontSize: 11, fontWeight: "800", marginLeft: 4 },

  // Telemetry Section
  telemetrySection: { padding: isLargeScreen ? 24 : 16 },
  telemetryBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1e40af", marginRight: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionHeaderLabel: { color: "#334155", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  geoIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  geoIndicatorText: { color: "#0284c7", fontSize: 10, fontWeight: "800", marginLeft: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  
  // Custom Distinct Card Backgrounds
  metricCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardBlueBg: { backgroundColor: "#f0f7ff", borderColor: "#bfdbfe", borderLeftColor: "#1e40af" },
  cardSkyBg: { backgroundColor: "#f0f9ff", borderColor: "#bae6fd", borderLeftColor: "#0284c7" },
  cardGreenBg: { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0", borderLeftColor: "#059669" },
  cardPurpleBg: { backgroundColor: "#f5f3ff", borderColor: "#ddd6fe", borderLeftColor: "#7c3aed" },
  cardAmberBg: { backgroundColor: "#fffbeb", borderColor: "#fde68a", borderLeftColor: "#d97706" },
  cardTealBg: { backgroundColor: "#f0fdfa", borderColor: "#99f6e4", borderLeftColor: "#0d9488" },

  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
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

  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionPillBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "900", marginLeft: 4 },
  stateGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  stateCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardSelected: { borderColor: "#1e40af", backgroundColor: "#f0f7ff" },
  stateCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stateNameTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800", flex: 1 },
  stateStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stateStatusBadgeText: { fontSize: 10, fontWeight: "800" },
  managerNameText: { color: "#1e40af", fontSize: 12, fontWeight: "800", marginTop: 6 },
  managerSubDetails: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  stateStatsSummary: { color: "#475569", fontSize: 10.5, marginTop: 4 },
  
  // 4-Quotas Mini Grid
  stateTargetMiniGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 6,
    borderRadius: 8,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stateTargetMiniItem: { width: "48%", marginVertical: 2 },
  stateTargetMiniLabel: { fontSize: 8.5, color: "#64748b", fontWeight: "700" },
  stateTargetMiniVal: { fontSize: 10.5, fontWeight: "900", marginTop: 1 },

  stateCardActionGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 6,
  },
  stateDeployTargetBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 4,
  },
  stateDeployTargetBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "800", marginLeft: 4 },
  inspectPill: {
    flex: 0.8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  inspectPillText: { color: "#1e40af", fontSize: 10, fontWeight: "800", marginLeft: 3 },
  stateVacantText: { color: "#dc2626", fontSize: 10.5, fontWeight: "600" },
  stateAppointBtn: {
    backgroundColor: "#eff6ff",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  stateAppointBtnText: { color: "#1e40af", fontSize: 10, fontWeight: "800" },

  managerCard: {
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
  managerCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  managerMainInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  managerCardName: { color: "#0f172a", fontSize: 14.5, fontWeight: "800" },
  managerCardState: { color: "#64748b", fontSize: 11, marginTop: 2 },
  suspendIconButton: { padding: 4 },

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
  summaryBoxLabel: { color: "#64748b", fontSize: 9, fontWeight: "700" },
  summaryBoxValue: { fontSize: 11.5, fontWeight: "900", marginTop: 2 },
  
  statsSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  managerActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  managerActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  managerActionBtnText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  inspectSupCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inspectSupName: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  inspectSupLga: { color: "#1e40af", fontSize: 11, marginTop: 2, fontWeight: "600" },
  supCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
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
  stateTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  stateTabPillActive: { backgroundColor: "#1e40af", borderColor: "#1e40af" },
  stateTabPillText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  stateTabPillTextActive: { color: "#ffffff", fontWeight: "900" },
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
});

export default NsdDashboard;