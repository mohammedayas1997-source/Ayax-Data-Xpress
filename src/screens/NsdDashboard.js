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
  });
  const [activityLogs, setActivityLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Search
  const [activeTab, setActiveTab] = useState("states"); // 'states', 'managers', 'history'
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modal 1: Drill-down State Hierarchy (Duba Supervisors da Ayyukan Jihar)
  const [stateInspectModalVisible, setStateInspectModalVisible] = useState(false);
  const [inspectedState, setInspectedState] = useState(null);
  const [inspectedSupervisors, setInspectedSupervisors] = useState([]);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Modal 2: Target Deployment Modal
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetStateItem, setTargetStateItem] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("10000");
  const [targetSupervisorGoal, setTargetSupervisorGoal] = useState("20");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Modal 3: Appoint State Manager Modal
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

  // 1. DAWO DA TELEMETRY NA KASA BAKI DAYA
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
      setNationalStats({
        totalStates: ALL_NIGERIAN_STATES.length,
        activeManagers: fetchedStates.filter((s) => s.hasLeader || s.leaderId).length,
        totalSupervisors: fetchedStats.totalSupervisors || 0,
        totalAgents: fetchedStats.totalAgents || 0,
        nationalVolumeSold: fetchedStats.nationalVolumeSold || 0,
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

  // 2. DUBA KASAN STATE MANAGER (SUPERVISORS & AGENTS INSPECTION)
  const handleInspectStateHierarchy = async (stateItem) => {
    setInspectedState(stateItem);
    setStateInspectModalVisible(true);
    setInspectLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      // Binciko supervisors na wannan jihar
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

  // 3. DAKATARWA KO KUNNAWA (SUSPEND / UNSUSPEND)
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

  // 4. DEPLOY TARGET GA STATE MANAGER
  const handleDeployNationalTarget = async () => {
    if (!targetStateItem?.leaderId) {
      showAlert("Notice", "No State Manager assigned to this state.");
      return;
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/super-leader/assign-target`,
        {
          leaderId: targetStateItem.leaderId,
          state: targetStateItem.state,
          dataGoal: Number(targetDataGoal),
          supervisorGoal: Number(targetSupervisorGoal),
          month: targetMonth.trim(),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Target Deployed 🎯", `Assigned ${targetDataGoal} GB goal to ${targetStateItem.state} State.`);
        setTargetModalVisible(false);
        setTargetStateItem(null);
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 5. APPOINT STATE MANAGER
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

  // 6. BROADCAST DIRECTIVE
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
        <StatusBar barStyle="light-content" backgroundColor="#060c18" />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loaderTitle}>NATIONAL SALES DIRECTOR (NSD)</Text>
        <Text style={styles.loaderText}>Establishing Real-Time 36 States Executive Link...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#060c18" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
          <Feather name="menu" size={24} color="#f8fafc" />
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
            <Ionicons name="person-add" size={16} color="#d4af37" />
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
            color={activeTab === "states" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "states" && styles.mainNavTabTextActive]}>
            36 States & FCT Matrix ({ALL_NIGERIAN_STATES.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "managers" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("managers")}
        >
          <FontAwesome5
            name="user-tie"
            size={13}
            color={activeTab === "managers" ? "#d4af37" : "#64748b"}
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
            color={activeTab === "history" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "history" && styles.mainNavTabTextActive]}>
            Live Operations Feed
          </Text>
        </TouchableOpacity>
      </View>

      {/* DASHBOARD SCROLL AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* NATIONAL FIELD METRICS */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>NIGERIA EXECUTIVE TELEMETRY</Text>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#d4af37" />
                <Text style={styles.geoIndicatorText}>REAL-TIME LIVE SYNC</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderColor: "rgba(212, 175, 55, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Appointed State Managers</Text>
                  <FontAwesome5 name="user-tie" size={14} color="#d4af37" />
                </View>
                <Text style={[styles.metricValue, { color: "#d4af37" }]}>
                  {nationalStats.activeManagers} / {ALL_NIGERIAN_STATES.length}
                </Text>
                <Text style={styles.metricSub}>36 States & FCT Coverage</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(56, 189, 248, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Field Supervisors (FS)</Text>
                  <MaterialCommunityIcons name="account-group" size={17} color="#38bdf8" />
                </View>
                <Text style={[styles.metricValue, { color: "#38bdf8" }]}>{nationalStats.totalSupervisors}</Text>
                <Text style={styles.metricSub}>LGA Network Leads</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Retail Agents</Text>
                  <Ionicons name="people" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricValue, { color: "#10b981" }]}>{nationalStats.totalAgents}</Text>
                <Text style={styles.metricSub}>Grassroot Resellers</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(192, 132, 252, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>National Volume</Text>
                  <Ionicons name="server" size={15} color="#c084fc" />
                </View>
                <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                  {Number(nationalStats.nationalVolumeSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSub}>National Delivered Data</Text>
              </View>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search State, Manager name, phone, or region..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94a3b8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* TAB 1: 36 STATES DEPLOYMENT GRID */}
          {activeTab === "states" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>NIGERIA REGIONAL MATRICES ({filteredStates.length})</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setAppointModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>APPOINT SM</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stateGridContainer}>
                {filteredStates.map((st) => (
                  <TouchableOpacity
                    key={st.state}
                    style={styles.stateCard}
                    activeOpacity={0.85}
                    onPress={() => handleInspectStateHierarchy(st)}
                  >
                    <View style={styles.stateCardHeader}>
                      <Text style={styles.stateNameTitle}>{st.state.toUpperCase()}</Text>
                      <View
                        style={[
                          styles.stateStatusBadge,
                          {
                            backgroundColor: st.hasLeader
                              ? st.isSuspended
                                ? "rgba(239, 68, 68, 0.15)"
                                : "rgba(16, 185, 129, 0.15)"
                              : "rgba(100, 116, 139, 0.15)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stateStatusBadgeText,
                            {
                              color: st.hasLeader
                                ? st.isSuspended
                                  ? "#ef4444"
                                  : "#10b981"
                                : "#94a3b8",
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

                        <View style={styles.inspectPill}>
                          <Text style={styles.inspectPillText}>🔍 Click to Inspect Team & LGAs</Text>
                        </View>
                      </>
                    ) : (
                      <View style={{ alignItems: "center", paddingVertical: 12 }}>
                        <Text style={styles.stateVacantText}>No State Manager Appointed</Text>
                        <TouchableOpacity
                          style={styles.stateAppointBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            setNewSmState(st.state);
                            setAppointModalVisible(true);
                          }}
                        >
                          <Text style={styles.stateAppointBtnText}>+ Appoint Manager</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: STATE MANAGERS LIST & DIRECT ACTIONS */}
          {activeTab === "managers" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>APPOINTED STATE MANAGERS ({nationalStats.activeManagers})</Text>
              </View>

              {statesData.filter((s) => s.hasLeader).map((sm) => (
                <TouchableOpacity
                  key={sm.state}
                  style={styles.managerCard}
                  activeOpacity={0.9}
                  onPress={() => handleInspectStateHierarchy(sm)}
                >
                  <View style={styles.managerCardHeader}>
                    <View style={styles.managerMainInfo}>
                      <View style={styles.managerAvatar}>
                        <FontAwesome5 name="user-tie" size={17} color="#d4af37" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.managerCardName}>{sm.leaderName}</Text>
                        <Text style={styles.managerCardState}>
                          📍 {sm.state} State Manager • {sm.leaderPhone}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        handleToggleStaffSuspension(sm.leaderId, sm.leaderName, sm.isSuspended);
                      }}
                      style={styles.suspendIconButton}
                    >
                      <MaterialIcons
                        name={sm.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                        size={32}
                        color={sm.isSuspended ? "#22c55e" : "#ef4444"}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statsSummaryRow}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Supervisors (FS)</Text>
                      <Text style={styles.summaryBoxValue}>{sm.supervisorsCount || 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Agents Network</Text>
                      <Text style={styles.summaryBoxValue}>{sm.agentsCount || 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Target Quota</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#d4af37" }]}>
                        {sm.stateDataGoal || 5000} GB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.managerActionRow}>
                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${sm.leaderPhone}`);
                      }}
                    >
                      <Ionicons name="call" size={14} color="#38bdf8" />
                      <Text style={[styles.managerActionBtnText, { color: "#38bdf8" }]}>Direct Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setTargetStateItem(sm);
                        setTargetModalVisible(true);
                      }}
                    >
                      <FontAwesome5 name="bullseye" size={13} color="#d4af37" />
                      <Text style={[styles.managerActionBtnText, { color: "#d4af37" }]}>Assign Target</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={() => handleInspectStateHierarchy(sm)}
                    >
                      <Feather name="external-link" size={14} color="#94a3b8" />
                      <Text style={[styles.managerActionBtnText, { color: "#94a3b8" }]}>Inspect Field Team</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* TAB 3: LIVE OPERATIONS AUDIT FEED */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>NATIONAL LIVE AUDIT STREAM</Text>
                <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "bold" }}>REAL-TIME FEED</Text>
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
                  <Feather name="activity" size={36} color="#475569" />
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
            <MaterialIcons name="file-download" size={20} color="#0a1224" />
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
                <MaterialCommunityIcons name="shield-crown" size={26} color="#d4af37" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>National Director</Text>
                  <Text style={styles.sidebarRoleText}>Head of Field Sales (NSD)</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
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
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <MaterialCommunityIcons name="map-legend" size={16} color="#d4af37" />
                </View>
                <Text style={[styles.navItemText, activeTab === "states" && { color: "#d4af37" }]}>36 States Matrix</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "managers" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("managers");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <FontAwesome5 name="user-tie" size={14} color="#38bdf8" />
                </View>
                <Text style={[styles.navItemText, activeTab === "managers" && { color: "#d4af37" }]}>State Managers</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "history" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("history");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Feather name="activity" size={15} color="#10b981" />
                </View>
                <Text style={[styles.navItemText, activeTab === "history" && { color: "#d4af37" }]}>Audit Feed</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>COMMAND ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setAppointModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#d4af37" />
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
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <Ionicons name="megaphone-outline" size={16} color="#38bdf8" />
                </View>
                <Text style={styles.navItemText}>Broadcast National Directive</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Exit NSD Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: DRILL-DOWN INSPECTION (STATE MANAGER -> SUPERVISORS & PERFORMANCE) */}
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
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {inspectLoading ? (
              <View style={{ padding: 40, alignItems: "center" }}>
                <ActivityIndicator size="large" color="#d4af37" />
                <Text style={{ color: "#94a3b8", fontSize: 12, marginTop: 10 }}>
                  Fetching LGA Field Supervisors...
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
                            color={sup.isSuspended ? "#22c55e" : "#ef4444"}
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
                          <Text style={styles.summaryBoxValue}>{sup.teamPerformance || sup.dataSold || 0} GB</Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Target Goal</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d4af37" }]}>
                            {sup.dataGoal || 500} GB
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
                ) : (
                  <View style={styles.emptyFeed}>
                    <FontAwesome5 name="user-slash" size={30} color="#475569" />
                    <Text style={styles.emptyFeedText}>No Field Supervisors deployed in this state yet.</Text>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ASSIGN NATIONAL TARGET */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy State Target</Text>
                <Text style={styles.modalCardSubtitle}>
                  Target for: {targetStateItem?.state} ({targetStateItem?.leaderName})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET CYCLE / MONTH</Text>
            <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

            <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              value={targetDataGoal}
              onChangeText={setTargetDataGoal}
            />

            <Text style={styles.formFieldLabel}>SUPERVISOR RECRUITMENT QUOTA</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              value={targetSupervisorGoal}
              onChangeText={setTargetSupervisorGoal}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleDeployNationalTarget}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#0a1224" />
              ) : (
                <Text style={styles.primaryActionBtnText}>AUTHORIZE & DEPLOY TARGET</Text>
              )}
            </TouchableOpacity>
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
                <Ionicons name="close" size={24} color="#94a3b8" />
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
                placeholderTextColor="#64748b"
                value={newSmName}
                onChangeText={setNewSmName}
              />

              <Text style={styles.formFieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08022223333"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newSmPhone}
                onChangeText={setNewSmPhone}
              />

              <Text style={styles.formFieldLabel}>PASSWORD (FOR LOGIN)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Password123@"
                placeholderTextColor="#64748b"
                value={newSmPassword}
                onChangeText={setNewSmPassword}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleAppointStateManager}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#0a1224" />
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
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Nationwide Month-End Acceleration"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type executive announcement here..."
              placeholderTextColor="#64748b"
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
                <ActivityIndicator color="#0a1224" />
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
  mainWrapper: { flex: 1, backgroundColor: "#060c18" },
  loaderContainer: { flex: 1, backgroundColor: "#060c18", justifyContent: "center", alignItems: "center" },
  loaderTitle: { color: "#d4af37", fontSize: 16, fontWeight: "900", letterSpacing: 1.5, marginTop: 16 },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0a1224",
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
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  livePulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#d4af37", marginRight: 6 },
  stateBadgeText: { color: "#d4af37", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  topBrandTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d4af37",
  },
  logoutIconBtn: { borderColor: "#ef4444", backgroundColor: "rgba(239, 68, 68, 0.1)" },
  mainNavBar: {
    flexDirection: "row",
    backgroundColor: "#0a1224",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
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
  mainNavTabActive: { borderBottomColor: "#d4af37" },
  mainNavTabText: { color: "#64748b", fontSize: 12, fontWeight: "700", marginLeft: 6 },
  mainNavTabTextActive: { color: "#d4af37" },
  scrollArea: { flex: 1, width: "100%" },
  scrollContentContainer: { flexGrow: 1, alignItems: "center", paddingBottom: 120 },
  contentCenterWrapper: { width: "100%", maxWidth: 1100 },
  telemetrySection: { padding: isLargeScreen ? 24 : 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  sectionHeaderLabel: { color: "#64748b", fontSize: 11, fontWeight: "900", letterSpacing: 1 },
  geoIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  geoIndicatorText: { color: "#d4af37", fontSize: 10, fontWeight: "800", marginLeft: 3 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    backgroundColor: "#0a1224",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  metricLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  metricValue: { fontSize: 17, fontWeight: "900", marginVertical: 4 },
  metricSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0a1224",
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 44,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: "#fff", fontSize: 12 },
  tabContentWrapper: { paddingHorizontal: isLargeScreen ? 24 : 16 },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d4af37",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionPillBtnText: { color: "#0a1224", fontSize: 10, fontWeight: "900", marginLeft: 4 },
  stateGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  stateCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    backgroundColor: "#0a1224",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stateCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stateNameTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  stateStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stateStatusBadgeText: { fontSize: 10, fontWeight: "800" },
  managerNameText: { color: "#d4af37", fontSize: 11.5, fontWeight: "700", marginTop: 6 },
  managerSubDetails: { color: "#94a3b8", fontSize: 10, marginTop: 1 },
  stateStatsSummary: { color: "#64748b", fontSize: 10, marginTop: 4 },
  inspectPill: {
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingVertical: 5,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  inspectPillText: { color: "#38bdf8", fontSize: 10, fontWeight: "800" },
  stateVacantText: { color: "#ef4444", fontSize: 10, fontWeight: "600" },
  stateAppointBtn: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  stateAppointBtnText: { color: "#d4af37", fontSize: 10, fontWeight: "800" },
  managerCard: {
    backgroundColor: "#0a1224",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  managerCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  managerMainInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  managerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  managerCardName: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
  managerCardState: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  suspendIconButton: { padding: 4 },
  statsSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
  },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },
  summaryBoxValue: { color: "#f8fafc", fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  managerActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 8,
  },
  managerActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  managerActionBtnText: { fontSize: 11, fontWeight: "700", marginLeft: 5 },
  inspectSupCard: {
    backgroundColor: "#0f172a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  inspectSupName: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  inspectSupLga: { color: "#38bdf8", fontSize: 11, marginTop: 2 },
  logCard: {
    backgroundColor: "#0a1224",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  logCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logCategoryBadge: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logCategoryText: { color: "#d4af37", fontSize: 9, fontWeight: "bold" },
  logTimestamp: { color: "#64748b", fontSize: 10 },
  logDetailsText: { color: "#f8fafc", fontSize: 12, fontWeight: "600", marginVertical: 4 },
  logActorText: { color: "#64748b", fontSize: 10 },
  downloadReportBtn: {
    backgroundColor: "#d4af37",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadReportBtnText: { color: "#0a1224", fontWeight: "900", fontSize: 12, marginLeft: 8 },
  emptyFeed: {
    backgroundColor: "#0a1224",
    padding: 30,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  emptyFeedText: { color: "#64748b", fontSize: 12, marginTop: 10, textAlign: "center" },
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
    backgroundColor: "#060c18",
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
  sidebarRoleText: { color: "#d4af37", fontSize: 10.5, fontWeight: "700" },
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
  navItemActive: { backgroundColor: "rgba(212, 175, 55, 0.1)" },
  navIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
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
    backgroundColor: "#0a1224",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 460,
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
  stateTabPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stateTabPillActive: { backgroundColor: "#d4af37", borderColor: "#d4af37" },
  stateTabPillText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  stateTabPillTextActive: { color: "#060c18", fontWeight: "900" },
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
  primaryActionBtn: {
    backgroundColor: "#d4af37",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
  },
  primaryActionBtnText: { color: "#0a1224", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default NsdDashboard;