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

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

// Dukkan Jihohi 36 na Najeriya + FCT Abuja
const NIGERIA_STATES = [
  "All States",
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
  "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau",
  "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"
];

const LeaderDashboard = ({ navigation }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [stats, setStats] = useState({
    totalSupervisors: 0,
    totalAgents: 0,
    overallDataSold: 0,
    activeQuotas: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("supervisors"); // 'supervisors', 'agents', 'history'
  const [selectedState, setSelectedState] = useState("All States");
  const [searchQuery, setSearchQuery] = useState("");

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Target Dispatch Modal
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetRecipient, setTargetRecipient] = useState(null); // Supervisor or Agent Object
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetDataGoal, setTargetDataGoal] = useState("500");
  const [targetMonth, setTargetMonth] = useState("August 2026");
  const [actionLoading, setActionLoading] = useState(false);

  // Notification Broadcast Modal
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");

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
      if (!token) {
        if (!isBackground) {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
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

      setStats({
        totalSupervisors: dashData.networkStats?.totalSupervisors || fetchedSupervisors.length || 0,
        totalAgents: dashData.networkStats?.totalAgents || fetchedAgents.length || 0,
        overallDataSold: dashData.networkStats?.overallDataSold || 0,
        activeQuotas: dashData.networkStats?.activeQuotas || fetchedSupervisors.filter((s) => s.targetAssigned).length || 0,
      });
    } catch (error) {
      if (error.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        console.error("Leader Telemetry Fetch Error:", error.message);
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
    if (Platform.OS === "web") {
      const confirmLogout = window.confirm("Are you sure you want to end this Leader session?");
      if (confirmLogout) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else {
      Alert.alert("Leader Sign Out", "Terminate active Leader administrative session?", [
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

  const handleToggleSupervisorStatus = async (id, currentStatus) => {
    const action = currentStatus ? "unsuspend" : "suspend";
    const confirmAction = Platform.OS === "web"
      ? window.confirm(`Are you sure you want to ${action} this supervisor?`)
      : true;

    if (!confirmAction) return;

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
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Broadcast Dispatched 🚀", "Notice delivered to team channels.");
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

  // Filter List ta State da Search Query
  const filteredSupervisors = supervisors.filter((sup) => {
    const matchState = selectedState === "All States" || (sup.state && sup.state.toLowerCase() === selectedState.toLowerCase());
    const matchSearch =
      (sup.name || `${sup.firstName || ""} ${sup.surname || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sup.phone || "").includes(searchQuery) ||
      (sup.lga || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchState && matchSearch;
  });

  const filteredAgents = agents.filter((ag) => {
    const matchState = selectedState === "All States" || (ag.state && ag.state.toLowerCase() === selectedState.toLowerCase());
    const matchSearch =
      (ag.name || `${ag.firstName || ""} ${ag.surname || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ag.phone || "").includes(searchQuery) ||
      (ag.assignedSupervisorName || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchState && matchSearch;
  });

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0a1224" />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loaderTitle}>AYAX NATIONAL LEADER ENGINE</Text>
        <Text style={styles.loaderText}>Establishing 36 States Real-Time Field Telemetry...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#0a1224" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.menuIconBtn}
          onPress={() => toggleSidebar(true)}
          activeOpacity={0.7}
        >
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.stateBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.stateBadgeText}>36 STATES & FCT ACTIVE</Text>
          </View>
          <Text style={styles.topBrandTitle}>NATIONAL LEADER COMMAND</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="megaphone-outline" size={17} color="#d4af37" />
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

      {/* MAIN TAB SWITCHER */}
      <View style={styles.mainNavBar}>
        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "supervisors" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("supervisors")}
        >
          <FontAwesome5
            name="user-tie"
            size={13}
            color={activeTab === "supervisors" ? "#d4af37" : "#64748b"}
          />
          <Text
            style={[
              styles.mainNavTabText,
              activeTab === "supervisors" && styles.mainNavTabTextActive,
            ]}
          >
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
          <Text
            style={[
              styles.mainNavTabText,
              activeTab === "agents" && styles.mainNavTabTextActive,
            ]}
          >
            Active Agents ({filteredAgents.length})
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
          <Text
            style={[
              styles.mainNavTabText,
              activeTab === "history" && styles.mainNavTabTextActive,
            ]}
          >
            Live Activity
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE DASHBOARD BODY */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        showsVerticalScrollIndicator={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* NATIONAL SUMMARY STATS */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>NATIONAL FIELD METRICS</Text>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="location" size={13} color="#d4af37" />
                <Text style={styles.geoIndicatorText}>{selectedState}</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderColor: "rgba(212, 175, 55, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Field Supervisors</Text>
                  <FontAwesome5 name="user-tie" size={16} color="#d4af37" />
                </View>
                <Text style={[styles.metricValue, { color: "#d4af37" }]}>
                  {stats.totalSupervisors}
                </Text>
                <Text style={styles.metricSub}>36 State Coordinators</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(2, 132, 199, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Platform Agents</Text>
                  <Ionicons name="people" size={17} color="#38bdf8" />
                </View>
                <Text style={[styles.metricValue, { color: "#38bdf8" }]}>
                  {stats.totalAgents}
                </Text>
                <Text style={styles.metricSub}>Grassroot Retailers</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Total Volume Sold</Text>
                  <Ionicons name="server" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricValue, { color: "#10b981" }]}>
                  {Number(stats.overallDataSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSub}>National Cumulative Data</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Target Quotas</Text>
                  <FontAwesome5 name="bullseye" size={16} color="#c084fc" />
                </View>
                <Text style={[styles.metricValue, { color: "#c084fc" }]}>
                  {stats.activeQuotas}
                </Text>
                <Text style={styles.metricSub}>Active Target Programs</Text>
              </View>
            </View>
          </View>

          {/* GEOLOCATION HORIZONTAL SCROLL (36 STATES) */}
          <View style={styles.stateFilterContainer}>
            <Text style={styles.sectionHeaderLabel}>NIGERIA REGIONAL LOCATION FILTER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              nestedScrollEnabled={true}
              style={{ marginTop: 8 }}
            >
              {NIGERIA_STATES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.stateTab,
                    selectedState === st && styles.stateTabActive,
                  ]}
                  onPress={() => setSelectedState(st)}
                >
                  <Text
                    style={[
                      styles.stateTabText,
                      selectedState === st && styles.stateTabTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, phone, LGA, or territory..."
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

          {/* TAB 1: SUPERVISORS MATRIX */}
          {activeTab === "supervisors" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>
                  STATE SUPERVISORS MATRIX ({filteredSupervisors.length})
                </Text>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => navigation.navigate("CreateSupervisor")}
                >
                  <Ionicons name="person-add" size={14} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>ENROLL SUPERVISOR</Text>
                </TouchableOpacity>
              </View>

              {filteredSupervisors.length > 0 ? (
                filteredSupervisors.map((item) => {
                  const supId = item._id || item.id;
                  const supName = item.name || `${item.firstName || ""} ${item.surname || ""}` || "State Coordinator";
                  const supState = item.state || "Unassigned State";
                  const supLga = item.lga || "Main Hub";

                  return (
                    <View key={supId} style={styles.supCard}>
                      <View style={styles.supCardHeader}>
                        <View style={styles.supMainInfo}>
                          <View style={styles.supAvatar}>
                            <FontAwesome5 name="user-tie" size={18} color="#d4af37" />
                          </View>
                          <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={styles.supNameText}>{supName}</Text>
                            <View style={styles.locationTagRow}>
                              <Ionicons name="location-sharp" size={12} color="#38bdf8" />
                              <Text style={styles.locationTagText}>
                                {supState} • {supLga}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <TouchableOpacity
                          onPress={() => handleToggleSupervisorStatus(supId, item.isSuspended)}
                          style={styles.statusToggleBtn}
                        >
                          <MaterialIcons
                            name={item.isSuspended ? "play-circle-filled" : "pause-circle-filled"}
                            size={28}
                            color={item.isSuspended ? "#22c55e" : "#ef4444"}
                          />
                        </TouchableOpacity>
                      </View>

                      {/* Performance & Field Stats */}
                      <View style={styles.statsSummaryRow}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Agents Managed</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                            <Ionicons name="people" size={14} color="#d4af37" />
                            <Text style={styles.summaryBoxValue}>{item.teamSize || item.agentsCount || 0}</Text>
                          </View>
                        </View>

                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Data Delivered</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
                            <Ionicons name="server" size={14} color="#10b981" />
                            <Text style={styles.summaryBoxValue}>{item.teamPerformance || item.dataSold || 0} GB</Text>
                          </View>
                        </View>

                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Target Status</Text>
                          <Text style={[styles.summaryBoxValue, { color: item.targetAssigned ? "#c084fc" : "#64748b" }]}>
                            {item.targetAssigned ? "Active" : "Unset"}
                          </Text>
                        </View>
                      </View>

                      {/* Leader Action Row */}
                      <View style={styles.supActionRow}>
                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => Linking.openURL(`tel:${item.phone}`)}
                        >
                          <Ionicons name="call" size={15} color="#38bdf8" />
                          <Text style={[styles.supActionBtnText, { color: "#38bdf8" }]}>Direct Call</Text>
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
                          <FontAwesome5 name="bullseye" size={14} color="#d4af37" />
                          <Text style={[styles.supActionBtnText, { color: "#d4af37" }]}>Assign Target</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.supActionBtn}
                          onPress={() => navigation.navigate("SupervisorDetails", { supervisorId: supId })}
                        >
                          <Feather name="external-link" size={15} color="#94a3b8" />
                          <Text style={styles.supActionBtnText}>View Team</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <FontAwesome5 name="user-slash" size={36} color="#475569" />
                  <Text style={styles.emptyFeedText}>No field supervisors found matching selected criteria.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: AGENTS STREAM */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>
                  GRASSROOT RETAIL AGENTS ({filteredAgents.length})
                </Text>
                <Text style={{ color: "#d4af37", fontSize: 11, fontWeight: "bold" }}>
                  LIVE FIELD TELEMETRY
                </Text>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => {
                  const agId = ag._id || ag.id;
                  const agName = ag.name || `${ag.firstName || ""} ${ag.surname || ""}` || "Retail Agent";
                  return (
                    <View key={agId} style={styles.agentCard}>
                      <View style={styles.agentCardTop}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.agentNameText}>{agName}</Text>
                          <Text style={styles.agentSupervisorTag}>
                            Supervisor: {ag.assignedSupervisorName || ag.supervisor?.name || "Direct Leader Unit"}
                          </Text>
                          <Text style={styles.agentLocationTag}>
                            📍 {ag.state || "Territory"} • {ag.phone || "No phone"}
                          </Text>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.agentSalesText}>
                            ₦{Number(ag.walletBalance || ag.balance || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.agentSalesSub}>Wallet Float</Text>
                        </View>
                      </View>

                      <View style={styles.agentCardBottom}>
                        <View style={styles.agentMetricPill}>
                          <Ionicons name="cart" size={12} color="#10b981" />
                          <Text style={styles.agentMetricPillText}>
                            Sales: {ag.totalSalesCount || 0} Txns
                          </Text>
                        </View>

                        <View style={styles.agentMetricPill}>
                          <Ionicons name="server" size={12} color="#38bdf8" />
                          <Text style={styles.agentMetricPillText}>
                            Volume: {ag.dataVolumeSold || 0} GB
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.agentCallIconBtn}
                          onPress={() => Linking.openURL(`tel:${ag.phone}`)}
                        >
                          <Ionicons name="call" size={14} color="#d4af37" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={38} color="#475569" />
                  <Text style={styles.emptyFeedText}>No retail agents recorded in this region.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 3: LIVE AUDIT & FIELD LOGS */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME FIELD ACTIVITY STREAM</Text>
                <Text style={{ color: "#10b981", fontSize: 11, fontWeight: "bold" }}>
                  {activityLogs.length} EVENTS
                </Text>
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
                    <Text style={styles.logActorText}>
                      Initiator: {log.user?.phone || log.actorRole || "Leader Node"}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={36} color="#475569" />
                  <Text style={styles.emptyFeedText}>No real-time audit records streamed yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* FULL REPORT EXPORT BUTTON */}
          <TouchableOpacity
            style={styles.downloadReportBtn}
            onPress={async () => {
              const token = await AsyncStorage.getItem("userToken");
              Linking.openURL(`${BASE_URL}/leader/download-full-report?token=${token}`);
            }}
          >
            <MaterialIcons name="file-download" size={20} color="#0a1224" />
            <Text style={styles.downloadReportBtnText}>GENERATE NATIONAL FIELD AUDIT REPORT</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FULL LEADER SIDEBAR DRAWER */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => toggleSidebar(false)}
        >
          <Animated.View
            style={[
              styles.sidebarContainer,
              { width: sidebarWidth, transform: [{ translateX: sidebarAnim }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandRow}>
                <MaterialCommunityIcons name="shield-star" size={28} color="#d4af37" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>National Leader</Text>
                  <Text style={styles.sidebarRoleText}>36 States Executive Desk</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sidebarNavList}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled={true}
            >
              <Text style={styles.sidebarCategory}>NAVIGATION MATRICES</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "supervisors" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("supervisors");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <FontAwesome5 name="user-tie" size={15} color="#d4af37" />
                </View>
                <Text style={[styles.navItemText, activeTab === "supervisors" && { color: "#d4af37" }]}>
                  Supervisors Hierarchy
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "agents" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("agents");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <Ionicons name="people" size={17} color="#38bdf8" />
                </View>
                <Text style={[styles.navItemText, activeTab === "agents" && { color: "#d4af37" }]}>
                  Grassroot Agents Stream
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "history" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("history");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Feather name="activity" size={16} color="#10b981" />
                </View>
                <Text style={[styles.navItemText, activeTab === "history" && { color: "#d4af37" }]}>
                  Live Operations Stream
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FIELD INTERVENTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("CreateSupervisor");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(168, 85, 247, 0.15)" }]}>
                  <Ionicons name="person-add-outline" size={17} color="#c084fc" />
                </View>
                <Text style={styles.navItemText}>Enroll New Supervisor</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setNotifModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <Ionicons name="megaphone-outline" size={17} color="#d4af37" />
                </View>
                <Text style={styles.navItemText}>Send Team Directive</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={async () => {
                  toggleSidebar(false);
                  const token = await AsyncStorage.getItem("userToken");
                  Linking.openURL(`${BASE_URL}/leader/download-full-report?token=${token}`);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(2, 132, 199, 0.15)" }]}>
                  <MaterialIcons name="file-download" size={17} color="#38bdf8" />
                </View>
                <Text style={styles.navItemText}>Export Regional Report</Text>
              </TouchableOpacity>

              <View style={{ height: 30 }} />
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Leader Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: TARGET DISPATCH ENGINE */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy Field Target</Text>
                <Text style={styles.modalCardSubtitle}>
                  Target for: {targetRecipient?.name || targetRecipient?.phone || "Field Coordinator"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>TARGET MONTH / PERIOD</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. August 2026"
                placeholderTextColor="#64748b"
                value={targetMonth}
                onChangeText={setTargetMonth}
              />

              <Text style={styles.formFieldLabel}>AGENT RECRUITMENT QUOTA (HEADCOUNT)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 10"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={targetAgentGoal}
                onChangeText={setTargetAgentGoal}
              />

              <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 500"
                placeholderTextColor="#64748b"
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
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: NOTIFICATION & DIRECTIVE BROADCASTER */}
      <Modal visible={notifModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast Team Directive</Text>
                <Text style={styles.modalCardSubtitle}>Push real-time alert to all Field Coordinators</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Month-End Field Target Acceleration"
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
                <Text style={styles.primaryActionBtnText}>DISPATCH DIRECTIVE NOW</Text>
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
  loaderContainer: {
    flex: 1,
    backgroundColor: "#060c18",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
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
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d4af37",
    marginRight: 6,
  },
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
  logoutIconBtn: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
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
  mainNavTabActive: {
    borderBottomColor: "#d4af37",
  },
  mainNavTabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  mainNavTabTextActive: {
    color: "#d4af37",
  },
  scrollArea: { flex: 1, width: "100%" },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 120,
  },
  contentCenterWrapper: {
    width: "100%",
    maxWidth: 1100,
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
  geoIndicatorBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  geoIndicatorText: { color: "#d4af37", fontSize: 10, fontWeight: "800", marginLeft: 3 },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  metricCard: {
    width: isLargeScreen ? "23.5%" : "48.5%",
    backgroundColor: "#0a1224",
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
  stateFilterContainer: {
    paddingHorizontal: isLargeScreen ? 24 : 16,
    marginBottom: 12,
  },
  stateTab: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  stateTabActive: {
    backgroundColor: "#d4af37",
    borderColor: "#d4af37",
  },
  stateTabText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  stateTabTextActive: { color: "#060c18", fontWeight: "900" },
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
  supCard: {
    backgroundColor: "#0a1224",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  supCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  supMainInfo: { flexDirection: "row", alignItems: "center", flex: 1, marginRight: 8 },
  supAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  supNameText: { color: "#f8fafc", fontSize: 14, fontWeight: "800" },
  locationTagRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  locationTagText: { color: "#94a3b8", fontSize: 11, marginLeft: 3 },
  statusToggleBtn: { padding: 4 },
  statsSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    padding: 10,
    marginTop: 12,
  },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },
  summaryBoxValue: { color: "#f8fafc", fontSize: 12.5, fontWeight: "900", marginLeft: 4 },
  supActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 10,
  },
  supActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  supActionBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginLeft: 6 },
  agentCard: {
    backgroundColor: "#0a1224",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  agentCardTop: { flexDirection: "row", justifyContent: "space-between" },
  agentNameText: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  agentSupervisorTag: { color: "#d4af37", fontSize: 11, marginTop: 2 },
  agentLocationTag: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  agentSalesText: { color: "#10b981", fontSize: 15, fontWeight: "900" },
  agentSalesSub: { color: "#64748b", fontSize: 9.5 },
  agentCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 8,
  },
  agentMetricPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  agentMetricPillText: { color: "#cbd5e1", fontSize: 10.5, fontWeight: "700", marginLeft: 4 },
  agentCallIconBtn: {
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
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
    padding: 35,
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

export default LeaderDashboard;