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
  const [activeTab, setActiveTab] = useState("states"); // 'states' | 'managers' | 'history'
  const [searchQuery, setSearchQuery] = useState("");

  // Selective State Selection Array (36 States + FCT)
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

  // Modal 2: Target Deployment Modal
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetMode, setTargetMode] = useState("single");
  const [targetStateItem, setTargetStateItem] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("10000");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("500000");
  const [targetNewAgentGoal, setTargetNewAgentGoal] = useState("50");
  const [targetNewSupervisorGoal, setTargetNewSupervisorGoal] = useState("10");
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

  // Modal 5: Reassign / Agent Team Transfer
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferMode, setTransferMode] = useState("bulk"); // 'bulk' | 'single'
  const [oldSupervisorId, setOldSupervisorId] = useState("");
  const [newSupervisorId, setNewSupervisorId] = useState("");
  const [transferAgentId, setTransferAgentId] = useState("");

  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchNationalTelemetry = useCallback(
    async (isBackground = false) => {
      try {
        const token = await AsyncStorage.getItem("userToken");
        if (!token) {
          if (!isBackground) navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [dashRes, logsRes] = await Promise.all([
          axios
            .get(`${BASE_URL}/super-leader/dashboard`, { headers, timeout: 15000 })
            .catch(() => ({ data: {} })),
          axios
            .get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 })
            .catch(() => ({ data: { logs: [] } })),
        ]);

        const dashData = dashRes.data?.data || dashRes.data || {};
        const fetchedStates = Array.isArray(dashData.statesMatrix) ? dashData.statesMatrix : [];
        const fetchedStats = dashData.nationalStats || {};
        const fetchedLogs = Array.isArray(logsRes.data?.logs) ? logsRes.data.logs : [];

        if (!isMounted.current) return;

        setStatesData(fetchedStates);
        setActivityLogs(fetchedLogs);

        const calculatedTotalAgents = fetchedStates.reduce(
          (acc, curr) => acc + (Number(curr.agentsCount) || 0),
          0
        );
        const calculatedTotalSupervisors = fetchedStates.reduce(
          (acc, curr) => acc + (Number(curr.supervisorsCount) || 0),
          0
        );

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
        if (isMounted.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [navigation]
  );

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

  const handleSelectAllStates = () => {
    if (selectedStateNames.length === ALL_NIGERIAN_STATES.length) {
      setSelectedStateNames([]);
    } else {
      setSelectedStateNames([...ALL_NIGERIAN_STATES]);
    }
  };

  const handleToggleStateSelect = (stateName) => {
    if (selectedStateNames.includes(stateName)) {
      setSelectedStateNames(selectedStateNames.filter((s) => s !== stateName));
    } else {
      setSelectedStateNames([...selectedStateNames, stateName]);
    }
  };

  const handleExecuteTransfer = async () => {
    if (!newSupervisorId.trim()) {
      return showAlert("Validation Error", "Destination Supervisor ID is required.");
    }
    if (transferMode === "bulk" && !oldSupervisorId.trim()) {
      return showAlert("Validation Error", "Current/Suspended Supervisor ID is required.");
    }
    if (transferMode === "single" && !transferAgentId.trim()) {
      return showAlert("Validation Error", "Agent ID is required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
      const endpoint =
        transferMode === "bulk"
          ? `${BASE_URL}/supervisors/transfer-all-agents`
          : `${BASE_URL}/supervisors/transfer-single-agent`;

      const payload =
        transferMode === "bulk"
          ? { oldSupervisorId: oldSupervisorId.trim(), newSupervisorId: newSupervisorId.trim() }
          : { agentId: transferAgentId.trim(), newSupervisorId: newSupervisorId.trim() };

      const res = await axios.post(endpoint, payload, { headers });

      if (res.data?.success) {
        showAlert("Transfer Successful", res.data.message || "Agent reassignment successful.");
        setTransferModalVisible(false);
        setOldSupervisorId("");
        setNewSupervisorId("");
        setTransferAgentId("");
        fetchNationalTelemetry();
      } else {
        showAlert("Failed", res.data?.message || "Could not reassign team.");
      }
    } catch (err) {
      showAlert("Transfer Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
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
      if (isMounted.current) setInspectedSupervisors(stateSupervisors);
    } catch (err) {
      if (isMounted.current) setInspectedSupervisors([]);
    } finally {
      if (isMounted.current) setInspectLoading(false);
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

  const handleDeployNationalTarget = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      const payload = {
        dataGoal: Number(targetDataGoal),
        airtimeGoal: Number(targetAirtimeGoal),
        agentGoal: Number(targetNewAgentGoal),
        supervisorGoal: Number(targetNewSupervisorGoal),
        month: targetMonth.trim(),
      };

      if (targetMode === "single") {
        if (!targetStateItem?.leaderId) {
          showAlert("Notice", "No State Manager appointed for this state yet.");
          setActionLoading(false);
          return;
        }
        payload.mode = "single";
        payload.leaderId = targetStateItem.leaderId;
        payload.state = targetStateItem.state;
      } else if (targetMode === "selected") {
        if (selectedStateNames.length === 0) {
          showAlert("Validation Error", "Please select at least one State.");
          setActionLoading(false);
          return;
        }
        payload.mode = "bulk";
        payload.states = selectedStateNames;
      } else {
        payload.mode = "bulk";
        payload.states = ALL_NIGERIAN_STATES;
      }

      const res = await axios.post(`${BASE_URL}/super-leader/assign-target`, payload, { headers });

      if (res.data?.success || res.status === 200) {
        const targetDesc = `${targetDataGoal}GB Data, ₦${Number(
          targetAirtimeGoal
        ).toLocaleString()} Airtime, ${targetNewAgentGoal} New Agents, & ${targetNewSupervisorGoal} New Supervisors`;

        showAlert(
          "Targets Deployed 🎯",
          targetMode === "single"
            ? `Allocated target (${targetDesc}) to ${targetStateItem?.state} State Manager.`
            : targetMode === "selected"
            ? `Allocated custom target (${targetDesc}) to ${selectedStateNames.length} selected States (${selectedStateNames.join(
                ", "
              )}).`
            : `Allocated target (${targetDesc}) across all 36 States & FCT.`
        );

        setTargetModalVisible(false);
        setTargetStateItem(null);
        setSelectedStateNames([]);
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
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
      if (window.confirm(`Are you sure you want to clear target quotas for ${stateName} State?`))
        confirmClear();
    } else {
      Alert.alert("Reset State Target", `Reset all target quotas for ${stateName} State to 0?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Reset", style: "destructive", onPress: confirmClear },
      ]);
    }
  };

  const handleAppointStateManager = async () => {
    if (!newSmName.trim() || !newSmPhone.trim() || !newSmState) {
      showAlert("Validation Error", "Full Name, Phone Number, and State are required.");
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
          email: newSmEmail.trim() ? newSmEmail.trim().toLowerCase() : undefined,
          password: newSmPassword.trim() || "Password123@",
          state: newSmState,
          role: "leader",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert(
          "Appointed 🎉",
          `${newSmName} has been created and appointed as State Manager for ${newSmState}.`
        );
        setAppointModalVisible(false);
        setNewSmName("");
        setNewSmPhone("");
        setNewSmEmail("");
        setNewSmPassword("Password123@");
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.message || err.message);
    } finally {
      if (isMounted.current) setActionLoading(false);
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
      if (isMounted.current) setActionLoading(false);
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
            onPress={() => setTransferModalVisible(true)}
            activeOpacity={0.7}
          >
            <MaterialCommunityIcons name="account-switch" size={18} color="#38bdf8" />
          </TouchableOpacity>

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
            Managers ({nationalStats.activeManagers})
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
          {/* TARGET COMMAND DESK */}
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
                  setTargetMode("all");
                  setTargetModalVisible(true);
                }}
              >
                <MaterialCommunityIcons name="target-account" size={16} color="#ffffff" />
                <Text style={styles.targetBannerBtnTextPrimary}>DEPLOY TO ALL 36 STATES</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.targetBannerBtnSecondary,
                  selectedStateNames.length > 0 && { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" },
                ]}
                onPress={() => {
                  setTargetMode("selected");
                  setTargetModalVisible(true);
                }}
              >
                <FontAwesome5
                  name="check-double"
                  size={13}
                  color={selectedStateNames.length > 0 ? "#059669" : "#1e40af"}
                />
                <Text
                  style={[
                    styles.targetBannerBtnTextSecondary,
                    selectedStateNames.length > 0 && { color: "#059669" },
                  ]}
                >
                  {selectedStateNames.length > 0
                    ? `DEPLOY SELECTED (${selectedStateNames.length})`
                    : "SELECT SPECIFIC STATES"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* TELEMETRY SECTION */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.telemetryBadgeDot} />
                <Text style={styles.sectionHeaderLabel}>NIGERIA EXECUTIVE TELEMETRY</Text>
              </View>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#38bdf8" />
                <Text style={styles.geoIndicatorText}>REAL-TIME LIVE SYNC</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>State Managers (SM)</Text>
                  <View style={styles.metricIconWrapDark}>
                    <FontAwesome5 name="user-tie" size={13} color="#38bdf8" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>
                  {nationalStats.activeManagers} / {ALL_NIGERIAN_STATES.length}
                </Text>
                <Text style={styles.metricSubDark}>36 States & FCT Coverage</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Field Supervisors (FS)</Text>
                  <View style={styles.metricIconWrapDark}>
                    <MaterialCommunityIcons name="account-group" size={16} color="#38bdf8" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>{nationalStats.totalSupervisors}</Text>
                <Text style={styles.metricSubDark}>LGA Network Coordinators</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Total Retail Agents</Text>
                  <View style={styles.metricIconWrapDark}>
                    <Ionicons name="people" size={16} color="#34d399" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>
                  {Number(nationalStats.totalAgents).toLocaleString()}
                </Text>
                <Text style={styles.metricSubDark}>Active Field Resellers</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>National Data Sold</Text>
                  <View style={styles.metricIconWrapDark}>
                    <Ionicons name="server" size={14} color="#a78bfa" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>
                  {Number(nationalStats.nationalVolumeSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSubDark}>Delivered Telecom Bundles</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>National Airtime Sold</Text>
                  <View style={styles.metricIconWrapDark}>
                    <Ionicons name="call" size={14} color="#fbbf24" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>
                  ₦{Number(nationalStats.nationalAirtimeSold || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricSubDark}>Gross Recharge VTU Value</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>State Coverage Rate</Text>
                  <View style={styles.metricIconWrapDark}>
                    <MaterialCommunityIcons name="shield-check" size={15} color="#2dd4bf" />
                  </View>
                </View>
                <Text style={styles.metricValueDark}>
                  {Math.round((nationalStats.activeManagers / ALL_NIGERIAN_STATES.length) * 100)}%
                </Text>
                <Text style={styles.metricSubDark}>Executive Field Deployment</Text>
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
              <View style={styles.bulkActionRibbon}>
                <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAllStates}>
                  <MaterialIcons
                    name={
                      selectedStateNames.length === ALL_NIGERIAN_STATES.length
                        ? "check-box"
                        : "check-box-outline-blank"
                    }
                    size={20}
                    color="#1e40af"
                  />
                  <Text style={styles.bulkSelectBtnText}>
                    {selectedStateNames.length === ALL_NIGERIAN_STATES.length
                      ? "Deselect All"
                      : selectedStateNames.length > 0
                      ? `Selected (${selectedStateNames.length}/${ALL_NIGERIAN_STATES.length})`
                      : "Select Specific States"}
                  </Text>
                </TouchableOpacity>

                {selectedStateNames.length > 0 ? (
                  <TouchableOpacity
                    style={styles.bulkTargetBtn}
                    onPress={() => {
                      setTargetMode("selected");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>
                      Deploy Target ({selectedStateNames.length} States)
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.bulkTargetBtn, { backgroundColor: "#0284c7" }]}
                    onPress={() => {
                      setTargetMode("all");
                      setTargetModalVisible(true);
                    }}
                  >
                    <MaterialCommunityIcons name="target" size={14} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy to All 36 States</Text>
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
                    <View key={st.state} style={[styles.stateCard, isSelected && styles.cardSelected]}>
                      <View style={styles.stateCardHeader}>
                        <TouchableOpacity
                          style={{ marginRight: 6 }}
                          onPress={() => handleToggleStateSelect(st.state)}
                        >
                          <MaterialIcons
                            name={isSelected ? "check-box" : "check-box-outline-blank"}
                            size={22}
                            color={isSelected ? "#1e40af" : "#94a3b8"}
                          />
                        </TouchableOpacity>

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
                              <Text style={styles.stateTargetMiniLabel}>New Agents</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#059669" }]}>
                                {st.stateAgentGoal || 50}
                              </Text>
                            </View>
                            <View style={styles.stateTargetMiniItem}>
                              <Text style={styles.stateTargetMiniLabel}>New FS</Text>
                              <Text style={[styles.stateTargetMiniVal, { color: "#0284c7" }]}>
                                {st.stateSupervisorGoal || 10}
                              </Text>
                            </View>
                          </View>

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
                              <Text style={styles.stateDeployTargetBtnText}>Set Target</Text>
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
                    name={
                      selectedStateNames.length === ALL_NIGERIAN_STATES.length
                        ? "check-box"
                        : "check-box-outline-blank"
                    }
                    size={20}
                    color="#1e40af"
                  />
                  <Text style={styles.bulkSelectBtnText}>
                    {selectedStateNames.length === ALL_NIGERIAN_STATES.length
                      ? "Deselect All"
                      : `Selected (${selectedStateNames.length}/${ALL_NIGERIAN_STATES.length})`}
                  </Text>
                </TouchableOpacity>

                {selectedStateNames.length > 0 && (
                  <TouchableOpacity
                    style={styles.bulkTargetBtn}
                    onPress={() => {
                      setTargetMode("selected");
                      setTargetModalVisible(true);
                    }}
                  >
                    <FontAwesome5 name="bullseye" size={12} color="#ffffff" />
                    <Text style={styles.bulkTargetBtnText}>Deploy to ({selectedStateNames.length}) Selected</Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>APPOINTED STATE MANAGERS ({nationalStats.activeManagers})</Text>
              </View>

              {statesData.filter((s) => s.hasLeader).map((sm) => {
                const isSelected = selectedStateNames.includes(sm.state);

                return (
                  <View key={sm.state} style={[styles.managerCard, isSelected && styles.cardSelected]}>
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
                        <Text style={[styles.managerActionBtnText, { color: "#1e40af" }]}>Set Target</Text>
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
        <TouchableOpacity style={styles.sidebarBackdrop} activeOpacity={1} onPress={() => toggleSidebar(false)}>
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
                  setTransferModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <MaterialCommunityIcons name="account-switch" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Reassign Agent Network</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setTargetMode("all");
                  setTargetModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#fef3c7" }]}>
                  <FontAwesome5 name="bullseye" size={14} color="#d97706" />
                </View>
                <Text style={styles.navItemText}>Deploy National Targets</Text>
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
                <Text style={styles.modalCardTitle}>{inspectedState?.state?.toUpperCase()} FIELD HIERARCHY</Text>
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

      {/* MODAL 2: TARGET DEPLOYMENT */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "65%" : "95%", maxHeight: "90%" }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={styles.modalCardTitle}>
                  {targetMode === "single"
                    ? `Set Targets: ${targetStateItem?.state} State`
                    : targetMode === "selected"
                    ? `Deploy Targets to (${selectedStateNames.length}) Selected States`
                    : "Deploy Targets to ALL 36 States & FCT"}
                </Text>
                <Text style={styles.modalCardSubtitle} numberOfLines={2}>
                  {targetMode === "single"
                    ? `Manager: ${targetStateItem?.leaderName} (${targetStateItem?.leaderPhone})`
                    : targetMode === "selected"
                    ? selectedStateNames.length > 0
                      ? `Selected: ${selectedStateNames.join(", ")}`
                      : "Choose specific states from the list below"
                    : "Nationwide uniform performance quota allocation"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabel}>1. SELECT SCOPE (TARGET RECIPIENTS)</Text>
              <View style={styles.toggleSegmentRow}>
                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetMode === "single" && styles.toggleSegmentBtnActive]}
                  onPress={() => setTargetMode("single")}
                >
                  <FontAwesome5 name="user-tie" size={12} color={targetMode === "single" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetMode === "single" && styles.toggleSegmentTextActive]}>
                    Single State
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetMode === "selected" && styles.toggleSegmentBtnActive]}
                  onPress={() => setTargetMode("selected")}
                >
                  <FontAwesome5 name="check-double" size={12} color={targetMode === "selected" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetMode === "selected" && styles.toggleSegmentTextActive]}>
                    Select States ({selectedStateNames.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, targetMode === "all" && styles.toggleSegmentBtnActive]}
                  onPress={() => {
                    setTargetMode("all");
                    setSelectedStateNames([...ALL_NIGERIAN_STATES]);
                  }}
                >
                  <MaterialCommunityIcons name="target-account" size={14} color={targetMode === "all" ? "#ffffff" : "#64748b"} />
                  <Text style={[styles.toggleSegmentText, targetMode === "all" && styles.toggleSegmentTextActive]}>
                    All 36 States
                  </Text>
                </TouchableOpacity>
              </View>

              {targetMode === "selected" && (
                <View style={styles.selectionListBox}>
                  <View style={styles.selectionListHeader}>
                    <Text style={styles.selectionListHeaderTitle}>
                      Select Target States ({selectedStateNames.length}/{ALL_NIGERIAN_STATES.length} selected)
                    </Text>
                    <TouchableOpacity onPress={handleSelectAllStates}>
                      <Text style={styles.selectionListSelectAllText}>
                        {selectedStateNames.length === ALL_NIGERIAN_STATES.length ? "Deselect All" : "Select All 36 States"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                      {ALL_NIGERIAN_STATES.map((stateName) => {
                        const isChecked = selectedStateNames.includes(stateName);
                        const matchedStateObj = statesData.find((s) => s.state?.toLowerCase() === stateName?.toLowerCase());

                        return (
                          <TouchableOpacity
                            key={stateName}
                            style={[styles.stateCheckItem, isChecked && styles.stateCheckItemActive]}
                            onPress={() => handleToggleStateSelect(stateName)}
                          >
                            <MaterialIcons
                              name={isChecked ? "check-box" : "check-box-outline-blank"}
                              size={18}
                              color={isChecked ? "#1e40af" : "#94a3b8"}
                            />
                            <View style={{ marginLeft: 6, flex: 1 }}>
                              <Text style={[styles.stateCheckText, isChecked && { color: "#1e40af", fontWeight: "bold" }]}>
                                {stateName}
                              </Text>
                              <Text style={styles.stateCheckSub} numberOfLines={1}>
                                {matchedStateObj?.leaderName || "Vacant"}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}

              <Text style={styles.formFieldLabel}>2. TARGET QUOTA ALLOCATION</Text>

              <Text style={styles.formFieldSubLabel}>TARGET CYCLE / MONTH</Text>
              <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

              <Text style={styles.formFieldSubLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 10000"
                placeholderTextColor="#94a3b8"
                value={targetDataGoal}
                onChangeText={setTargetDataGoal}
              />

              <Text style={styles.formFieldSubLabel}>AIRTIME SALES QUOTA (₦ NAIRA GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 500000"
                placeholderTextColor="#94a3b8"
                value={targetAirtimeGoal}
                onChangeText={setTargetAirtimeGoal}
              />

              <Text style={styles.formFieldSubLabel}>NEW AGENTS REGISTRATION TARGET (HEADCOUNT)</Text>
              <TextInput
                style={styles.textInputStyle}
                keyboardType="numeric"
                placeholder="e.g. 50"
                placeholderTextColor="#94a3b8"
                value={targetNewAgentGoal}
                onChangeText={setTargetNewAgentGoal}
              />

              <Text style={styles.formFieldSubLabel}>NEW SUPERVISORS APPOINTMENT TARGET (LGA LEADS)</Text>
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
                    {targetMode === "single"
                      ? "AUTHORIZE & DEPLOY TARGET"
                      : targetMode === "selected"
                      ? `DEPLOY TARGET TO ${selectedStateNames.length} STATES`
                      : "AUTHORIZE NATIONWIDE (36 STATES) ALLOCATION"}
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
                <Text style={styles.modalCardSubtitle}>Create user profile & deploy executive leader</Text>
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

              <Text style={styles.formFieldLabel}>PHONE NUMBER (LOGIN USERNAME)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08022223333"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newSmPhone}
                onChangeText={setNewSmPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (FOR LOGIN & NOTIFICATIONS)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. sanibello@ayaxdata.online"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newSmEmail}
                onChangeText={setNewSmEmail}
              />

              <Text style={styles.formFieldLabel}>PASSWORD (FOR LOGIN AUTHENTICATION)</Text>
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
                  <Text style={styles.primaryActionBtnText}>AUTHORIZE APPOINTMENT & CREATE ACCOUNT</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: BROADCAST DIRECTIVE */}
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

      {/* MODAL 5: REASSIGN AGENT NETWORK (TRANSFER) */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "60%" : "95%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Reassign Agent Network</Text>
                <Text style={styles.modalCardSubtitle}>
                  Move agents from suspended/terminated supervisor to a new supervisor
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.toggleSegmentRow}>
                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, transferMode === "bulk" && styles.toggleSegmentBtnActive]}
                  onPress={() => setTransferMode("bulk")}
                >
                  <Text style={[styles.toggleSegmentText, transferMode === "bulk" && styles.toggleSegmentTextActive]}>
                    Entire Team (Bulk)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.toggleSegmentBtn, transferMode === "single" && styles.toggleSegmentBtnActive]}
                  onPress={() => setTransferMode("single")}
                >
                  <Text style={[styles.toggleSegmentText, transferMode === "single" && styles.toggleSegmentTextActive]}>
                    Single Agent
                  </Text>
                </TouchableOpacity>
              </View>

              {transferMode === "bulk" ? (
                <>
                  <Text style={styles.formFieldLabel}>CURRENT/SUSPENDED SUPERVISOR ID</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="Enter current supervisor ID"
                    placeholderTextColor="#94a3b8"
                    value={oldSupervisorId}
                    onChangeText={setOldSupervisorId}
                  />
                </>
              ) : (
                <>
                  <Text style={styles.formFieldLabel}>AGENT ID TO TRANSFER</Text>
                  <TextInput
                    style={styles.textInputStyle}
                    placeholder="Enter agent ID"
                    placeholderTextColor="#94a3b8"
                    value={transferAgentId}
                    onChangeText={setTransferAgentId}
                  />
                </>
              )}

              <Text style={styles.formFieldLabel}>DESTINATION SUPERVISOR ID (NEW LEAD)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="Enter new supervisor ID"
                placeholderTextColor="#94a3b8"
                value={newSupervisorId}
                onChangeText={setNewSupervisorId}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleExecuteTransfer}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <MaterialCommunityIcons name="account-switch" size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.primaryActionBtnText}>
                      {transferMode === "bulk" ? "AUTHORIZE TEAM REASSIGNMENT" : "REASSIGN AGENT"}
                    </Text>
                  </View>
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
    flex: 1,
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

  telemetrySection: { padding: isLargeScreen ? 24 : 16 },
  telemetryBadgeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#1e40af", marginRight: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  sectionHeaderLabel: { color: "#334155", fontSize: 12, fontWeight: "900", letterSpacing: 1 },
  geoIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  geoIndicatorText: { color: "#38bdf8", fontSize: 10, fontWeight: "800", marginLeft: 4 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  
  metricCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderLeftWidth: 4.5,
    elevation: 3,
  },
  cardDarkBlueBg: {
    backgroundColor: "#0f172a",
    borderColor: "#1e293b",
    borderLeftColor: "#38bdf8",
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricIconWrapDark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
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
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  bulkTargetBtnText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 5 },

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
  },
  cardSelected: { borderColor: "#1e40af", backgroundColor: "#eff6ff" },
  stateCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stateNameTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800", flex: 1 },
  stateStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stateStatusBadgeText: { fontSize: 10, fontWeight: "800" },
  managerNameText: { color: "#1e40af", fontSize: 12, fontWeight: "800", marginTop: 6 },
  managerSubDetails: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  stateStatsSummary: { color: "#475569", fontSize: 10.5, marginTop: 4 },
  
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
    maxWidth: 480,
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
  stateCheckItem: {
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
  stateCheckItemActive: {
    borderColor: "#1e40af",
    backgroundColor: "#eff6ff",
  },
  stateCheckText: {
    color: "#0f172a",
    fontSize: 11.5,
    fontWeight: "700",
  },
  stateCheckSub: {
    color: "#64748b",
    fontSize: 9.5,
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