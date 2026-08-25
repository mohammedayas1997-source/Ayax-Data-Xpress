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
import { ALL_NIGERIAN_STATES, NIGERIA_STATES_LGAS } from "../utils/nigeriaGeoData";

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

  // Tabs & Filtration
  const [activeTab, setActiveTab] = useState("states"); // 'states', 'managers', 'logs'
  const [selectedRegion, setSelectedRegion] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Target Modal States
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetStateItem, setTargetStateItem] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("10000");
  const [targetSupervisorGoal, setTargetSupervisorGoal] = useState("20");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Appoint State Manager Modal
  const [appointModalVisible, setAppointModalVisible] = useState(false);
  const [newSmName, setNewSmName] = useState("");
  const [newSmPhone, setNewSmPhone] = useState("");
  const [newSmEmail, setNewSmEmail] = useState("");
  const [newSmState, setNewSmState] = useState("Kano");

  // Broadcast Modal
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
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 1. DAKATARWA KO KUNNA STATE MANAGER (SUSPEND / UNSUSPEND)
  const handleToggleManagerSuspension = (leaderId, managerName, isSuspended) => {
    if (!leaderId) {
      showAlert("Notice", "No State Manager assigned to this state yet.");
      return;
    }

    const action = isSuspended ? "Unsuspend (Reactivate)" : "Suspend (Deactivate)";
    const confirmMessage = `Are you sure you want to ${action} ${managerName}? ${
      isSuspended ? "They will regain full management access." : "They will be locked out immediately."
    }`;

    if (Platform.OS === "web") {
      if (window.confirm(confirmMessage)) {
        executeSuspension(leaderId);
      }
    } else {
      Alert.alert(`Confirm Action`, confirmMessage, [
        { text: "Cancel", style: "cancel" },
        {
          text: `Yes, ${action}`,
          style: isSuspended ? "default" : "destructive",
          onPress: () => executeSuspension(leaderId),
        },
      ]);
    }
  };

  const executeSuspension = async (leaderId) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.patch(
        `${BASE_URL}/leader/toggle-status/${leaderId}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success || res.status === 200) {
        showAlert("Updated", "State Manager operational status has been updated.");
        fetchNationalTelemetry();
      }
    } catch (e) {
      showAlert("Action Failed", e.response?.data?.message || "Could not execute status update.");
    }
  };

  // 2. TURA NATIONAL TARGET GA STATE MANAGER
  const handleDeployNationalTarget = async () => {
    if (!targetStateItem?.leaderId) {
      showAlert("Error", "Cannot assign target: No active State Manager appointed for this state.");
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
        showAlert("Target Deployed 🎯", `National target allocated for ${targetStateItem.state} State Manager.`);
        setTargetModalVisible(false);
        setTargetStateItem(null);
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 3. APPOINT NEW STATE MANAGER
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
          state: newSmState,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Appointment Confirmed 🎉", `${newSmName} is now State Manager for ${newSmState} State.`);
        setAppointModalVisible(false);
        setNewSmName("");
        setNewSmPhone("");
        setNewSmEmail("");
        fetchNationalTelemetry();
      }
    } catch (err) {
      showAlert("Appointment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 4. BROADCAST NATIONAL DIRECTIVE
  const handleBroadcastDirective = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      showAlert("Validation Error", "Directive Title and Message Body are required.");
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
        showAlert("Broadcast Sent 🚀", "Directive delivered to all 36 State Managers.");
        setBroadcastModalVisible(false);
        setNotifTitle("");
        setNotifMessage("");
      }
    } catch (err) {
      showAlert("Broadcast Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredStates = statesData.filter((item) => {
    const matchSearch =
      (item.state || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.leaderName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.leaderPhone || "").includes(searchQuery);
    return matchSearch;
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#060c18" />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loaderTitle}>NATIONAL SALES DIRECTOR (NSD)</Text>
        <Text style={styles.loaderText}>Establishing 36 States & FCT Telemetry Command...</Text>
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
            <Text style={styles.stateBadgeText}>NATIONAL COMMAND DESK</Text>
          </View>
          <Text style={styles.topBrandTitle}>36 STATES & FCT OPERATIONS</Text>
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
            States Matrix ({ALL_NIGERIAN_STATES.length})
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
          style={[styles.mainNavTab, activeTab === "logs" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("logs")}
        >
          <Feather
            name="activity"
            size={14}
            color={activeTab === "logs" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "logs" && styles.mainNavTabTextActive]}>
            National Live Feed
          </Text>
        </TouchableOpacity>
      </View>

      {/* DASHBOARD BODY */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* NATIONAL SUMMARY METRICS */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>NIGERIA NATIONAL FIELD PERFORMANCE</Text>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="shield-checkmark" size={13} color="#d4af37" />
                <Text style={styles.geoIndicatorText}>NSD EXECUTIVE</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderColor: "rgba(212, 175, 55, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Active State Managers</Text>
                  <FontAwesome5 name="user-tie" size={15} color="#d4af37" />
                </View>
                <Text style={[styles.metricValue, { color: "#d4af37" }]}>
                  {nationalStats.activeManagers} / {ALL_NIGERIAN_STATES.length}
                </Text>
                <Text style={styles.metricSub}>Appointed State Directors</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(56, 189, 248, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Field Supervisors</Text>
                  <MaterialCommunityIcons name="account-group" size={18} color="#38bdf8" />
                </View>
                <Text style={[styles.metricValue, { color: "#38bdf8" }]}>{nationalStats.totalSupervisors}</Text>
                <Text style={styles.metricSub}>LGA Coordinators</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Grassroot Agents</Text>
                  <Ionicons name="people" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricValue, { color: "#10b981" }]}>{nationalStats.totalAgents}</Text>
                <Text style={styles.metricSub}>Retail Outlets Active</Text>
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
              placeholder="Search State, State Manager name, or phone number..."
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

          {/* TAB 1: 36 STATES DEPLOYMENT MATRIX */}
          {activeTab === "states" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>ALL 36 STATES & FCT STATUS MATRIX</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setAppointModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>APPOINT SM</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.stateGridContainer}>
                {filteredStates.map((st) => (
                  <View key={st.state} style={styles.stateCard}>
                    <View style={styles.stateCardHeader}>
                      <Text style={styles.stateNameTitle}>{st.state.toUpperCase()}</Text>
                      <View
                        style={[
                          styles.stateStatusBadge,
                          { backgroundColor: st.hasLeader ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.stateStatusBadgeText,
                            { color: st.hasLeader ? "#10b981" : "#ef4444" },
                          ]}
                        >
                          {st.hasLeader ? (st.isSuspended ? "SUSPENDED" : "ACTIVE") : "VACANT"}
                        </Text>
                      </View>
                    </View>

                    {st.hasLeader ? (
                      <>
                        <Text style={styles.managerNameText}>
                          👤 {st.leaderName}
                        </Text>
                        <Text style={styles.managerSubDetails}>
                          📞 {st.leaderPhone}
                        </Text>
                        <Text style={styles.stateStatsSummary}>
                          {st.lgasTotal} LGAs • {st.supervisorsCount || 0} FS • {st.agentsCount || 0} Agents
                        </Text>

                        <View style={styles.stateCardActions}>
                          <TouchableOpacity
                            style={[
                              styles.stateActionBtnSmall,
                              { backgroundColor: st.isSuspended ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)" },
                            ]}
                            onPress={() => handleToggleManagerSuspension(st.leaderId, st.leaderName, st.isSuspended)}
                          >
                            <MaterialIcons
                              name={st.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                              size={16}
                              color={st.isSuspended ? "#22c55e" : "#ef4444"}
                            />
                            <Text style={[styles.stateActionBtnTextSmall, { color: st.isSuspended ? "#22c55e" : "#ef4444" }]}>
                              {st.isSuspended ? "Activate" : "Suspend"}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.stateActionBtnSmall, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}
                            onPress={() => {
                              setTargetStateItem(st);
                              setTargetModalVisible(true);
                            }}
                          >
                            <FontAwesome5 name="bullseye" size={13} color="#d4af37" />
                            <Text style={[styles.stateActionBtnTextSmall, { color: "#d4af37" }]}>Target</Text>
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
                ))}
              </View>
            </View>
          )}

          {/* TAB 2: STATE MANAGERS LIST & SUSPENSION CONTROLS */}
          {activeTab === "managers" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>APPOINTED STATE MANAGERS ({nationalStats.activeManagers})</Text>
              </View>

              {statesData.filter((s) => s.hasLeader).map((sm) => (
                <View key={sm.state} style={styles.managerCard}>
                  <View style={styles.managerCardHeader}>
                    <View style={styles.managerMainInfo}>
                      <View style={styles.managerAvatar}>
                        <FontAwesome5 name="user-tie" size={17} color="#d4af37" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.managerCardName}>{sm.leaderName}</Text>
                        <Text style={styles.managerCardState}>
                          📍 {sm.state} State • {sm.leaderPhone}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      onPress={() => handleToggleManagerSuspension(sm.leaderId, sm.leaderName, sm.isSuspended)}
                      style={styles.suspendIconButton}
                    >
                      <MaterialIcons
                        name={sm.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                        size={30}
                        color={sm.isSuspended ? "#22c55e" : "#ef4444"}
                      />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.statsSummaryRow}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Supervisors</Text>
                      <Text style={styles.summaryBoxValue}>{sm.supervisorsCount || 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Agents</Text>
                      <Text style={styles.summaryBoxValue}>{sm.agentsCount || 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Monthly Quota</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#d4af37" }]}>
                        {sm.stateDataGoal || 5000} GB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.managerActionRow}>
                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={() => Linking.openURL(`tel:${sm.leaderPhone}`)}
                    >
                      <Ionicons name="call" size={14} color="#38bdf8" />
                      <Text style={[styles.managerActionBtnText, { color: "#38bdf8" }]}>Call SM</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={() => {
                        setTargetStateItem(sm);
                        setTargetModalVisible(true);
                      }}
                    >
                      <FontAwesome5 name="bullseye" size={13} color="#d4af37" />
                      <Text style={[styles.managerActionBtnText, { color: "#d4af37" }]}>Assign Target</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.managerActionBtn}
                      onPress={() => handleToggleManagerSuspension(sm.leaderId, sm.leaderName, sm.isSuspended)}
                    >
                      <MaterialIcons
                        name={sm.isSuspended ? "check-circle" : "block"}
                        size={15}
                        color={sm.isSuspended ? "#22c55e" : "#ef4444"}
                      />
                      <Text
                        style={[
                          styles.managerActionBtnText,
                          { color: sm.isSuspended ? "#22c55e" : "#ef4444" },
                        ]}
                      >
                        {sm.isSuspended ? "Activate Account" : "Suspend Account"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: NATIONAL AUDIT FEED */}
          {activeTab === "logs" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>NATIONAL OPERATIONS AUDIT FEED</Text>
                <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "bold" }}>LIVE REAL-TIME</Text>
              </View>

              {activityLogs.map((log) => (
                <View key={log._id || Math.random().toString()} style={styles.logCard}>
                  <View style={styles.logCardTop}>
                    <View style={styles.logCategoryBadge}>
                      <Text style={styles.logCategoryText}>{log.category || "NATIONAL_EVENT"}</Text>
                    </View>
                    <Text style={styles.logTimestamp}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "Live"}
                    </Text>
                  </View>
                  <Text style={styles.logDetailsText}>{log.details || log.action || "Field operation recorded."}</Text>
                  <Text style={styles.logActorText}>Actor: {log.user?.phone || log.actorRole || "NSD Node"}</Text>
                </View>
              ))}
            </View>
          )}

          {/* NATIONAL FULL REPORT EXPORT */}
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={async () => {
              const token = await AsyncStorage.getItem("userToken");
              Linking.openURL(`${BASE_URL}/leader/download-full-report?token=${token}`);
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

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.sidebarCategory}>NATIONAL MATRICES</Text>

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
                <Text style={[styles.navItemText, activeTab === "managers" && { color: "#d4af37" }]}>State Managers (SM)</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "logs" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("logs");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(192, 132, 252, 0.15)" }]}>
                  <Feather name="activity" size={15} color="#c084fc" />
                </View>
                <Text style={[styles.navItemText, activeTab === "logs" && { color: "#d4af37" }]}>National Live Feed</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>EXECUTIVE CONTROLS</Text>

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

      {/* MODAL 1: ASSIGN NATIONAL TARGET */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy State Target</Text>
                <Text style={styles.modalCardSubtitle}>
                  Assigned State: {targetStateItem?.state} ({targetStateItem?.leaderName})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET MONTH / CYCLE</Text>
            <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

            <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              value={targetDataGoal}
              onChangeText={setTargetDataGoal}
            />

            <Text style={styles.formFieldLabel}>FIELD SUPERVISOR RECRUITMENT QUOTA</Text>
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
                <Text style={styles.primaryActionBtnText}>AUTHORIZE & DEPLOY STATE TARGET</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: APPOINT STATE MANAGER */}
      <Modal visible={appointModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint State Manager (SM)</Text>
                <Text style={styles.modalCardSubtitle}>Deploy executive state director</Text>
              </View>
              <TouchableOpacity onPress={() => setAppointModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
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

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. manager@ayaxdata.online"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                value={newSmEmail}
                onChangeText={setNewSmEmail}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleAppointStateManager}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#0a1224" />
                ) : (
                  <Text style={styles.primaryActionBtnText}>AUTHORIZE STATE MANAGER</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: BROADCAST NATIONAL DIRECTIVE */}
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
              placeholder="e.g. Nationwide Month-End Quota Acceleration"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type national executive announcement here..."
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
                <Text style={styles.primaryActionBtnText}>DISPATCH NATIONAL DIRECTIVE</Text>
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
  stateCardActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  stateActionBtnSmall: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  stateActionBtnTextSmall: { fontSize: 10, fontWeight: "800", marginLeft: 4 },
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