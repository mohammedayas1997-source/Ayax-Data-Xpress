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
  const [leaderState, setLeaderState] = useState("Kano");
  const [supervisors, setSupervisors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalAgents: 0,
    overallDataSold: 0,
    activeQuotas: 0,
    activeLgasCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Filtration
  const [activeTab, setActiveTab] = useState("lgas"); // 'lgas', 'supervisors', 'agents', 'history'
  const [selectedLga, setSelectedLga] = useState("All LGAs");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modals States
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetRecipient, setTargetRecipient] = useState(null);
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupLga, setNewSupLga] = useState("");

  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Current State LGA Matrix
  const currentLgaList = NIGERIA_STATES_LGAS[leaderState] || [
    "Central", "North", "South", "East", "West"
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
          setLeaderState(parsed.state);
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

      setSupervisors(fetchedSupervisors);
      setAgents(fetchedAgents);
      setActivityLogs(fetchedLogs);

      const uniqueLgas = new Set(fetchedSupervisors.map((s) => s.lga).filter(Boolean)).size;

      setStats({
        totalSupervisors: fetchedSupervisors.length,
        totalAgents: fetchedAgents.length,
        overallDataSold: dashData.networkStats?.overallDataSold || 0,
        activeQuotas: fetchedSupervisors.filter((s) => s.targetAssigned || s.dataGoal).length,
        activeLgasCount: uniqueLgas,
      });
    } catch (error) {
      if (error.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        console.error("Dashboard Fetch Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

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
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  const handleToggleSupervisorStatus = async (id, currentStatus) => {
    const action = currentStatus ? "unsuspend" : "suspend";
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.patch(
        `${BASE_URL}/leader/toggle-status/${id}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data?.success || res.status === 200) {
        showAlert("Success", `Supervisor successfully ${action}ed.`);
        fetchDashboardData();
      }
    } catch (e) {
      showAlert("Action Failed", e.response?.data?.message || "Could not update status.");
    }
  };

  const handleDispatchTarget = async () => {
    if (!targetRecipient) return;
    setActionLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/admin/assign-target`,
        {
          supervisorId: targetRecipient._id || targetRecipient.id,
          agentGoal: Number(targetAgentGoal),
          dataGoal: Number(targetDataGoal),
          month: targetMonth.trim(),
          state: leaderState,
          lga: targetRecipient.lga,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Target Deployed 🎯", `Target allocated for ${targetRecipient.name || targetRecipient.phone}`);
        setTargetModalVisible(false);
        setTargetRecipient(null);
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEnrollSupervisor = async () => {
    if (!newSupName.trim() || !newSupPhone.trim() || !newSupLga) {
      return showAlert("Validation Error", "Name, Phone Number, and Assigned LGA are required.");
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
          state: leaderState,
          lga: newSupLga,
          role: "supervisor",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Supervisor Enrolled 🎉", `Assigned to ${newSupLga} LGA, ${leaderState} State.`);
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

  const handleBroadcastAlert = async () => {
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
          category: "LEADER_DIRECTIVE",
          state: leaderState,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Broadcast Dispatched 🚀", "Notice delivered to all State Coordinators.");
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

  // Filtration logic
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#060c18" />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loaderTitle}>{leaderState.toUpperCase()} COMMAND ENGINE</Text>
        <Text style={styles.loaderText}>Establishing Real-Time Multi-Supervisor Field Telemetry...</Text>
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
            <Text style={styles.stateBadgeText}>{leaderState.toUpperCase()} STATE LEADER</Text>
          </View>
          <Text style={styles.topBrandTitle}>{currentLgaList.length} LGAS COMMAND DESK</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setEnrollModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#d4af37" />
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
          style={[styles.mainNavTab, activeTab === "lgas" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("lgas")}
        >
          <MaterialCommunityIcons
            name="map-marker-radius"
            size={15}
            color={activeTab === "lgas" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "lgas" && styles.mainNavTabTextActive]}>
            LGAs Matrix ({currentLgaList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "supervisors" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("supervisors")}
        >
          <FontAwesome5
            name="user-tie"
            size={13}
            color={activeTab === "supervisors" ? "#d4af37" : "#64748b"}
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
            size={15}
            color={activeTab === "agents" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "agents" && styles.mainNavTabTextActive]}>
            Agents ({filteredAgents.length})
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
            Live Feed
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
          {/* TOP SUMMARY STATS */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>{leaderState.toUpperCase()} REAL-TIME FIELD METRICS</Text>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="location" size={13} color="#d4af37" />
                <Text style={styles.geoIndicatorText}>{selectedLga}</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderColor: "rgba(212, 175, 55, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>LGA Supervisors</Text>
                  <FontAwesome5 name="user-tie" size={15} color="#d4af37" />
                </View>
                <Text style={[styles.metricValue, { color: "#d4af37" }]}>{stats.totalSupervisors}</Text>
                <Text style={styles.metricSub}>Across {stats.activeLgasCount} Active LGAs</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(56, 189, 248, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Grassroot Agents</Text>
                  <Ionicons name="people" size={17} color="#38bdf8" />
                </View>
                <Text style={[styles.metricValue, { color: "#38bdf8" }]}>{stats.totalAgents}</Text>
                <Text style={styles.metricSub}>Retail Network Active</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Total Data Sold</Text>
                  <Ionicons name="server" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricValue, { color: "#10b981" }]}>
                  {Number(stats.overallDataSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSub}>State Total Volume</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(192, 132, 252, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Active Target Quotas</Text>
                  <FontAwesome5 name="bullseye" size={15} color="#c084fc" />
                </View>
                <Text style={[styles.metricValue, { color: "#c084fc" }]}>{stats.activeQuotas}</Text>
                <Text style={styles.metricSub}>Assigned Team Goals</Text>
              </View>
            </View>
          </View>

          {/* HORIZONTAL LGA FILTER */}
          <View style={styles.lgaFilterContainer}>
            <Text style={styles.sectionHeaderLabel}>FILTER BY LOCAL GOVERNMENT AREA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} style={{ marginTop: 8 }}>
              {["All LGAs", ...currentLgaList].map((lga) => (
                <TouchableOpacity
                  key={lga}
                  style={[styles.lgaTab, selectedLga === lga && styles.lgaTabActive]}
                  onPress={() => setSelectedLga(lga)}
                >
                  <Text style={[styles.lgaTabText, selectedLga === lga && styles.lgaTabTextActive]}>
                    {lga}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* SEARCH BOX */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${leaderState} Supervisors, Agents, or LGA...`}
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

          {/* TAB 1: LOCAL GOVERNMENTS STATUS MATRIX (MULTI-SUPERVISOR SUPPORT) */}
          {activeTab === "lgas" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>LOCAL GOVERNMENTS DEPLOYMENT MATRIX</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setEnrollModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>ENROLL SUPERVISOR</Text>
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
                            { backgroundColor: supsInLga.length > 0 ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.lgaStatusBadgeText,
                              { color: supsInLga.length > 0 ? "#10b981" : "#ef4444" },
                            ]}
                          >
                            {supsInLga.length} Sups
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

                          <View style={styles.lgaMiniList}>
                            {supsInLga.slice(0, 2).map((s) => (
                              <Text key={s._id || s.id} style={styles.lgaSupPill} numberOfLines={1}>
                                • {s.name || s.phone}
                              </Text>
                            ))}
                            {supsInLga.length > 2 && (
                              <Text style={styles.lgaMoreText}>+{supsInLga.length - 2} more</Text>
                            )}
                          </View>

                          <TouchableOpacity
                            style={styles.lgaAppointBtn}
                            onPress={() => {
                              setNewSupLga(lgaName);
                              setEnrollModalVisible(true);
                            }}
                          >
                            <Text style={styles.lgaAppointBtnText}>+ Add More Supervisors</Text>
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

          {/* TAB 2: SUPERVISORS LIST */}
          {activeTab === "supervisors" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>SUPERVISORS MATRIX ({filteredSupervisors.length})</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setEnrollModalVisible(true)}>
                  <Ionicons name="person-add" size={13} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>ENROLL</Text>
                </TouchableOpacity>
              </View>

              {filteredSupervisors.length > 0 ? (
                filteredSupervisors.map((item) => {
                  const supId = item._id || item.id;
                  const supName = item.name || `${item.firstName || ""} ${item.surname || ""}` || "Supervisor Lead";
                  const supLga = item.lga || "Unassigned LGA";

                  return (
                    <View key={supId} style={styles.supCard}>
                      <View style={styles.supCardHeader}>
                        <View style={styles.supMainInfo}>
                          <View style={styles.supAvatar}>
                            <FontAwesome5 name="user-tie" size={17} color="#d4af37" />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.supNameText}>{supName}</Text>
                            <View style={styles.locationTagRow}>
                              <Ionicons name="location-sharp" size={12} color="#38bdf8" />
                              <Text style={styles.locationTagText}>
                                {leaderState} • {supLga} LGA
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity onPress={() => handleToggleSupervisorStatus(supId, item.isSuspended)}>
                          <MaterialIcons
                            name={item.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                            size={28}
                            color={item.isSuspended ? "#22c55e" : "#ef4444"}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.statsSummaryRow}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Agents</Text>
                          <Text style={styles.summaryBoxValue}>{item.teamSize || item.agentsCount || 0}</Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Volume Sold</Text>
                          <Text style={styles.summaryBoxValue}>{item.teamPerformance || item.dataSold || 0} GB</Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Target Goal</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d4af37" }]}>
                            {item.dataGoal || 500} GB
                          </Text>
                        </View>
                      </View>

                      <View style={styles.supActionRow}>
                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => Linking.openURL(`tel:${item.phone}`)}
                        >
                          <Ionicons name="call" size={14} color="#38bdf8" />
                          <Text style={[styles.supActionBtnText, { color: "#38bdf8" }]}>Call</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => {
                            setTargetRecipient(item);
                            setTargetAgentGoal(String(item.agentGoal || 10));
                            setTargetDataGoal(String(item.dataGoal || 500));
                            setTargetModalVisible(true);
                          }}
                        >
                          <FontAwesome5 name="bullseye" size={13} color="#d4af37" />
                          <Text style={[styles.supActionBtnText, { color: "#d4af37" }]}>Assign Target</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => navigation.navigate("SupervisorDetails", { supervisorId: supId })}
                        >
                          <Feather name="external-link" size={14} color="#94a3b8" />
                          <Text style={styles.supActionBtnText}>Agents</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <FontAwesome5 name="user-slash" size={34} color="#475569" />
                  <Text style={styles.emptyFeedText}>No supervisors registered in this LGA.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: AGENTS LIST */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>GRASSROOT AGENTS ({filteredAgents.length})</Text>
                <Text style={{ color: "#d4af37", fontSize: 11, fontWeight: "bold" }}>FIELD RESELLERS</Text>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => (
                  <View key={ag._id || ag.id} style={styles.agentCard}>
                    <View style={styles.agentCardTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.agentNameText}>{ag.name || "Retail Agent"}</Text>
                        <Text style={styles.agentSupervisorTag}>
                          Supervisor: {ag.assignedSupervisorName || "LGA Lead"} ({ag.lga || "LGA"})
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

                    <View style={styles.agentCardBottom}>
                      <View style={styles.agentMetricPill}>
                        <Ionicons name="cart" size={12} color="#10b981" />
                        <Text style={styles.agentMetricPillText}>{ag.totalSalesCount || 0} Txns</Text>
                      </View>
                      <View style={styles.agentMetricPill}>
                        <Ionicons name="server" size={12} color="#38bdf8" />
                        <Text style={styles.agentMetricPillText}>{ag.dataVolumeSold || 0} GB Sold</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.agentCallIconBtn}
                        onPress={() => Linking.openURL(`tel:${ag.phone}`)}
                      >
                        <Ionicons name="call" size={14} color="#d4af37" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={36} color="#475569" />
                  <Text style={styles.emptyFeedText}>No agents recorded in this region.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 4: LIVE FEED AUDIT LOGS */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME FIELD OPERATIONS LOG</Text>
                <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "bold" }}>LIVE STREAM</Text>
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
                    <Text style={styles.logActorText}>Actor: {log.user?.phone || log.actorRole || "Leader Node"}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={34} color="#475569" />
                  <Text style={styles.emptyFeedText}>No real-time audit logs recorded yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* REPORT GENERATION */}
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={async () => {
              const token = await AsyncStorage.getItem("userToken");
              Linking.openURL(`${BASE_URL}/leader/download-full-report?token=${token}`);
            }}
          >
            <MaterialIcons name="file-download" size={20} color="#0a1224" />
            <Text style={styles.downloadReportBtnText}>GENERATE {leaderState.toUpperCase()} AUDIT REPORT</Text>
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
                <MaterialCommunityIcons name="shield-star" size={26} color="#d4af37" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>{leaderState} Leader</Text>
                  <Text style={styles.sidebarRoleText}>Territory Operations Hub</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.sidebarCategory}>FIELD NAVIGATION</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "lgas" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("lgas");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <MaterialCommunityIcons name="map-marker-radius" size={16} color="#d4af37" />
                </View>
                <Text style={[styles.navItemText, activeTab === "lgas" && { color: "#d4af37" }]}>LGAs Matrix</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "supervisors" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("supervisors");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <FontAwesome5 name="user-tie" size={14} color="#38bdf8" />
                </View>
                <Text style={[styles.navItemText, activeTab === "supervisors" && { color: "#d4af37" }]}>Supervisors Network</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "agents" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("agents");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="people" size={16} color="#10b981" />
                </View>
                <Text style={[styles.navItemText, activeTab === "agents" && { color: "#d4af37" }]}>Grassroot Agents</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "history" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("history");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(192, 132, 252, 0.15)" }]}>
                  <Feather name="activity" size={15} color="#c084fc" />
                </View>
                <Text style={[styles.navItemText, activeTab === "history" && { color: "#d4af37" }]}>Operations Live Feed</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>COMMAND ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setEnrollModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#d4af37" />
                </View>
                <Text style={styles.navItemText}>Appoint Supervisor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setNotifModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <Ionicons name="megaphone-outline" size={16} color="#38bdf8" />
                </View>
                <Text style={styles.navItemText}>Broadcast Directive</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Exit Leader Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: TARGET ASSIGNMENT */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy Field Target</Text>
                <Text style={styles.modalCardSubtitle}>
                  Assigned Lead: {targetRecipient?.name || targetRecipient?.phone} ({targetRecipient?.lga} LGA)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET MONTH / PERIOD</Text>
            <TextInput style={styles.textInputStyle} value={targetMonth} onChangeText={setTargetMonth} />

            <Text style={styles.formFieldLabel}>AGENT RECRUITMENT QUOTA (HEADCOUNT)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              value={targetAgentGoal}
              onChangeText={setTargetAgentGoal}
            />

            <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              value={targetDataGoal}
              onChangeText={setTargetDataGoal}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleDispatchTarget}
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

      {/* MODAL 2: ENROLL SUPERVISOR (CAN ASSIGN MULTIPLE PER LGA) */}
      <Modal visible={enrollModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint LGA Supervisor</Text>
                <Text style={styles.modalCardSubtitle}>Add field coordinators in {leaderState}</Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
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
                placeholderTextColor="#64748b"
                value={newSupName}
                onChangeText={setNewSupName}
              />

              <Text style={styles.formFieldLabel}>PHONE NUMBER</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08031234567"
                placeholderTextColor="#64748b"
                keyboardType="phone-pad"
                value={newSupPhone}
                onChangeText={setNewSupPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (OPTIONAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. sup@ayaxdata.online"
                placeholderTextColor="#64748b"
                keyboardType="email-address"
                value={newSupEmail}
                onChangeText={setNewSupEmail}
              />

              <TouchableOpacity
                style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
                onPress={handleEnrollSupervisor}
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

      {/* MODAL 3: DIRECTIVE BROADCAST */}
      <Modal visible={notifModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast Team Directive</Text>
                <Text style={styles.modalCardSubtitle}>Push real-time alert across {leaderState}</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Month-End Performance Review"
              placeholderTextColor="#64748b"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type your official announcement here..."
              placeholderTextColor="#64748b"
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
    zIndex: 10,
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
  lgaFilterContainer: { paddingHorizontal: isLargeScreen ? 24 : 16, marginBottom: 12 },
  lgaTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  lgaTabActive: { backgroundColor: "#d4af37", borderColor: "#d4af37" },
  lgaTabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  lgaTabTextActive: { color: "#060c18", fontWeight: "900" },
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
  lgaGridContainer: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  lgaCard: {
    width: isLargeScreen ? "31.5%" : "48.5%",
    backgroundColor: "#0a1224",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  lgaCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  lgaNameTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  lgaStatusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  lgaStatusBadgeText: { fontSize: 10, fontWeight: "800" },
  lgaSupervisorCount: { color: "#d4af37", fontSize: 11, fontWeight: "700", marginTop: 6 },
  lgaStatsSummary: { color: "#64748b", fontSize: 10, marginTop: 2 },
  lgaMiniList: { marginTop: 6, backgroundColor: "#0f172a", padding: 6, borderRadius: 6 },
  lgaSupPill: { color: "#cbd5e1", fontSize: 10.5, fontWeight: "600" },
  lgaMoreText: { color: "#d4af37", fontSize: 9.5, fontWeight: "700", marginTop: 2 },
  lgaUnassignedText: { color: "#ef4444", fontSize: 10, fontWeight: "600" },
  lgaAppointBtn: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  lgaAppointBtnText: { color: "#d4af37", fontSize: 10, fontWeight: "800" },
  supCard: { backgroundColor: "#0a1224", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1e293b" },
  supCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  supMainInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  supAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  supNameText: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  locationTagRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  locationTagText: { color: "#94a3b8", fontSize: 11, marginLeft: 3 },
  statsSummaryRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "#0f172a", borderRadius: 10, padding: 10, marginTop: 10 },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },
  summaryBoxValue: { color: "#f8fafc", fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  supActionRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10, borderTopWidth: 1, borderTopColor: "#172033", paddingTop: 8 },
  supActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 8 },
  supActionBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  agentCard: { backgroundColor: "#0a1224", borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e293b" },
  agentCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  agentNameText: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  agentSupervisorTag: { color: "#d4af37", fontSize: 10.5, marginTop: 2 },
  agentLocationTag: { color: "#64748b", fontSize: 10, marginTop: 2 },
  agentSalesText: { color: "#10b981", fontSize: 14, fontWeight: "900" },
  agentSalesSub: { color: "#64748b", fontSize: 9.5 },
  agentCardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 10, borderTopWidth: 1, borderTopColor: "#172033", paddingTop: 8 },
  agentMetricPill: { flexDirection: "row", alignItems: "center", backgroundColor: "#0f172a", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  agentMetricPillText: { color: "#cbd5e1", fontSize: 10.5, fontWeight: "700", marginLeft: 4 },
  agentCallIconBtn: { backgroundColor: "rgba(212, 175, 55, 0.1)", padding: 6, borderRadius: 6, borderWidth: 1, borderColor: "rgba(212, 175, 55, 0.3)" },
  logCard: { backgroundColor: "#0a1224", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e293b" },
  logCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  logCategoryBadge: { backgroundColor: "rgba(212, 175, 55, 0.12)", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  logCategoryText: { color: "#d4af37", fontSize: 9, fontWeight: "bold" },
  logTimestamp: { color: "#64748b", fontSize: 10 },
  logDetailsText: { color: "#f8fafc", fontSize: 12, fontWeight: "600", marginVertical: 4 },
  logActorText: { color: "#64748b", fontSize: 10 },
  downloadReportBtn: { backgroundColor: "#d4af37", marginHorizontal: isLargeScreen ? 24 : 16, marginTop: 20, paddingVertical: 14, borderRadius: 12, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  downloadReportBtnText: { color: "#0a1224", fontWeight: "900", fontSize: 12, marginLeft: 8 },
  emptyFeed: { backgroundColor: "#0a1224", padding: 35, borderRadius: 14, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  emptyFeedText: { color: "#64748b", fontSize: 12, marginTop: 10, textAlign: "center" },
  sidebarBackdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(0, 0, 0, 0.75)", zIndex: 100 },
  sidebarContainer: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#060c18", paddingTop: Platform.OS === "ios" ? 50 : 35, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: "#1e293b" },
  sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#d4af37", fontSize: 10.5, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 10 },
  sidebarCategory: { color: "#475569", fontSize: 9.5, fontWeight: "900", letterSpacing: 1, marginTop: 16, marginBottom: 6, paddingLeft: 6 },
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 3 },
  navItemActive: { backgroundColor: "rgba(212, 175, 55, 0.1)" },
  navIconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  navItemText: { color: "#cbd5e1", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#1e293b" },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.85)", justifyContent: "center", alignItems: "center", padding: 16 },
  modalCard: { backgroundColor: "#0a1224", borderRadius: 20, padding: 20, width: "100%", maxWidth: 440, borderWidth: 1, borderColor: "#1e293b" },
  modalHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottomWidth: 1, borderBottomColor: "#1e293b", paddingBottom: 10 },
  modalCardTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 12, marginBottom: 6 },
  textInputStyle: { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#1e293b", borderRadius: 10, paddingHorizontal: 12, height: 44, color: "#f8fafc", fontSize: 13, fontWeight: "600" },
  primaryActionBtn: { backgroundColor: "#d4af37", paddingVertical: 14, borderRadius: 12, alignItems: "center", marginTop: 18 },
  primaryActionBtnText: { color: "#0a1224", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default LeaderDashboard;