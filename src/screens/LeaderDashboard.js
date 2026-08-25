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
import { NIGERIA_STATES_LGAS } from "../utils/nigeriaGeoData";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const LeaderDashboard = ({ navigation }) => {
  const [leaderState, setLeaderState] = useState("Kano");
  const [supervisors, setSupervisors] = useState([]);
  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [stats, setStats] = useState({
    totalLgasCovered: 0,
    totalSupervisors: 0,
    totalAgents: 0,
    stateVolumeSold: 0,
    monthlyTargetProgress: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search
  const [selectedLga, setSelectedLga] = useState("All LGAs");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("lgas"); // 'lgas', 'supervisors', 'agents', 'history'

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Target Modal
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetSupervisor, setTargetSupervisor] = useState(null);
  const [targetAgentGoal, setTargetAgentGoal] = useState("10");
  const [targetDataGoal, setTargetDataGoal] = useState("1000");
  const [targetMonth, setTargetMonth] = useState("August 2026");
  const [actionLoading, setActionLoading] = useState(false);

  // Enroll LGA Supervisor Modal
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [newSupName, setNewSupName] = useState("");
  const [newSupPhone, setNewSupPhone] = useState("");
  const [newSupEmail, setNewSupEmail] = useState("");
  const [newSupLga, setNewSupLga] = useState("");

  const lgaList = NIGERIA_STATES_LGAS[leaderState] || [
    "Central LGA", "North LGA", "South LGA", "East LGA", "West LGA"
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

  const fetchTerritoryData = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");
      if (!token) {
        if (!isBackground) navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      if (storedUserData) {
        const u = JSON.parse(storedUserData);
        if (u.state) setLeaderState(u.state);
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

      const uniqueLgasCovered = new Set(fetchedSupervisors.map((s) => s.lga)).size;

      setStats({
        totalLgasCovered: uniqueLgasCovered,
        totalSupervisors: fetchedSupervisors.length,
        totalAgents: fetchedAgents.length,
        stateVolumeSold: dashData.networkStats?.overallDataSold || 0,
        monthlyTargetProgress: dashData.networkStats?.targetProgress || 65,
      });
    } catch (error) {
      if (!isBackground) {
        console.error("Leader Territory Sync Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchTerritoryData();
    const interval = setInterval(() => {
      fetchTerritoryData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchTerritoryData]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchTerritoryData();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: "Login" }] });
  };

  // 1. Tura Target ga LGA Supervisor
  const handleDispatchLgaTarget = async () => {
    if (!targetSupervisor) return;
    setActionLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/admin/assign-target`,
        {
          supervisorId: targetSupervisor._id || targetSupervisor.id,
          agentGoal: Number(targetAgentGoal),
          dataGoal: Number(targetDataGoal),
          month: targetMonth.trim(),
          lga: targetSupervisor.lga,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Target Deployed 🎯", `Target allocated for ${targetSupervisor.lga} LGA Supervisor.`);
        setTargetModalVisible(false);
        setTargetSupervisor(null);
        fetchTerritoryData();
      }
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Ɗaukar Sabon LGA Supervisor Kai Tsaye
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
        fetchTerritoryData();
      }
    } catch (err) {
      showAlert("Enrollment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Filter List ta LGA da Bincike
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
        <Text style={styles.loaderText}>Establishing LGA Territory Live Streams...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#060c18" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)}>
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.stateBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.stateBadgeText}>{leaderState.toUpperCase()} STATE LEADER</Text>
          </View>
          <Text style={styles.topBrandTitle}>{lgaList.length} LGAs COMMAND MATRIX</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setEnrollModalVisible(true)}
          >
            <Ionicons name="person-add" size={16} color="#d4af37" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.avatarBtn, styles.logoutIconBtn]} onPress={handleLogout}>
            <Feather name="log-out" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* MAIN NAV TABS */}
      <View style={styles.mainNavBar}>
        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "lgas" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("lgas")}
        >
          <MaterialCommunityIcons
            name="map-marker-multiple"
            size={15}
            color={activeTab === "lgas" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "lgas" && styles.mainNavTabTextActive]}>
            LGAs Matrix ({lgaList.length})
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
            Live Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLL AREA */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        nestedScrollEnabled={true}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* STATE OVERVIEW METRICS */}
          <View style={styles.telemetrySection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>{leaderState.toUpperCase()} FIELD COVERAGE</Text>
              <View style={styles.geoIndicatorBadge}>
                <Ionicons name="location" size={13} color="#d4af37" />
                <Text style={styles.geoIndicatorText}>{selectedLga}</Text>
              </View>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderColor: "rgba(212, 175, 55, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>LGAs Active</Text>
                  <MaterialCommunityIcons name="city-variant" size={17} color="#d4af37" />
                </View>
                <Text style={[styles.metricValue, { color: "#d4af37" }]}>
                  {stats.totalLgasCovered} / {lgaList.length}
                </Text>
                <Text style={styles.metricSub}>{leaderState} Territorial Reach</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(2, 132, 199, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>LGA Supervisors</Text>
                  <FontAwesome5 name="user-tie" size={15} color="#38bdf8" />
                </View>
                <Text style={[styles.metricValue, { color: "#38bdf8" }]}>{stats.totalSupervisors}</Text>
                <Text style={styles.metricSub}>Appointed Field Leads</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(16, 185, 129, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>State Volume Sold</Text>
                  <Ionicons name="server" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricValue, { color: "#10b981" }]}>
                  {Number(stats.stateVolumeSold || 0).toLocaleString()} GB
                </Text>
                <Text style={styles.metricSub}>Cumulative Retail Data</Text>
              </View>

              <View style={[styles.metricCard, { borderColor: "rgba(168, 85, 247, 0.35)" }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabel}>Registered Agents</Text>
                  <Ionicons name="people" size={17} color="#c084fc" />
                </View>
                <Text style={[styles.metricValue, { color: "#c084fc" }]}>{stats.totalAgents}</Text>
                <Text style={styles.metricSub}>Grassroot Resellers</Text>
              </View>
            </View>
          </View>

          {/* LGA SELECTOR SCROLL */}
          <View style={styles.lgaFilterContainer}>
            <Text style={styles.sectionHeaderLabel}>{leaderState.toUpperCase()} LOCAL GOVERNMENT AREAS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled={true} style={{ marginTop: 8 }}>
              {["All LGAs", ...lgaList].map((lga) => (
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

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${leaderState} LGA, Supervisor, or Agent...`}
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* TAB 1: ALL 44 LGAS OVERVIEW GRID */}
          {activeTab === "lgas" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>LOCAL GOVERNMENTS STATUS MATRIX</Text>
                <TouchableOpacity style={styles.actionPillBtn} onPress={() => setEnrollModalVisible(true)}>
                  <Ionicons name="add-circle" size={14} color="#0a1224" />
                  <Text style={styles.actionPillBtnText}>ASSIGN SUPERVISOR</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.lgaGridContainer}>
                {lgaList.map((lgaName) => {
                  const supForLga = supervisors.find(
                    (s) => s.lga && s.lga.toLowerCase() === lgaName.toLowerCase()
                  );
                  const agentsInLga = agents.filter(
                    (a) => a.lga && a.lga.toLowerCase() === lgaName.toLowerCase()
                  );

                  return (
                    <View key={lgaName} style={styles.lgaCard}>
                      <View style={styles.lgaCardHeader}>
                        <Text style={styles.lgaNameTitle}>{lgaName}</Text>
                        <View
                          style={[
                            styles.lgaStatusDot,
                            { backgroundColor: supForLga ? "#10b981" : "#ef4444" },
                          ]}
                        />
                      </View>

                      {supForLga ? (
                        <>
                          <Text style={styles.lgaSupervisorName}>
                            👤 {supForLga.name || supForLga.phone}
                          </Text>
                          <Text style={styles.lgaStatsSummary}>
                            {agentsInLga.length} Agents • {supForLga.teamPerformance || 0} GB
                          </Text>
                          <TouchableOpacity
                            style={styles.lgaManageBtn}
                            onPress={() => {
                              setTargetSupervisor(supForLga);
                              setTargetModalVisible(true);
                            }}
                          >
                            <Text style={styles.lgaManageBtnText}>ASSIGN TARGET</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <View style={{ alignItems: "center", paddingVertical: 8 }}>
                          <Text style={styles.lgaUnassignedText}>No Supervisor Assigned</Text>
                          <TouchableOpacity
                            style={styles.lgaAppointBtn}
                            onPress={() => {
                              setNewSupLga(lgaName);
                              setEnrollModalVisible(true);
                            }}
                          >
                            <Text style={styles.lgaAppointBtnText}>+ Appoint Lead</Text>
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
                <Text style={styles.sectionHeaderLabel}>LGA SUPERVISORS ({filteredSupervisors.length})</Text>
              </View>

              {filteredSupervisors.map((sup) => (
                <View key={sup._id || sup.id} style={styles.supCard}>
                  <View style={styles.supCardHeader}>
                    <View style={styles.supMainInfo}>
                      <View style={styles.supAvatar}>
                        <FontAwesome5 name="user-tie" size={17} color="#d4af37" />
                      </View>
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={styles.supNameText}>{sup.name || "LGA Lead"}</Text>
                        <Text style={styles.supLgaTag}>
                          📍 {sup.lga || "Unassigned"} LGA • {sup.phone}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.statsSummaryRow}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Agents</Text>
                      <Text style={styles.summaryBoxValue}>{sup.teamSize || 0}</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Performance</Text>
                      <Text style={styles.summaryBoxValue}>{sup.teamPerformance || 0} GB</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Quota Goal</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#d4af37" }]}>
                        {sup.dataGoal || 500} GB
                      </Text>
                    </View>
                  </View>

                  <View style={styles.supActionRow}>
                    <TouchableOpacity
                      style={styles.supActionBtn}
                      onPress={() => Linking.openURL(`tel:${sup.phone}`)}
                    >
                      <Ionicons name="call" size={15} color="#38bdf8" />
                      <Text style={[styles.supActionBtnText, { color: "#38bdf8" }]}>Call Lead</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.supActionBtn}
                      onPress={() => {
                        setTargetSupervisor(sup);
                        setTargetModalVisible(true);
                      }}
                    >
                      <FontAwesome5 name="bullseye" size={14} color="#d4af37" />
                      <Text style={[styles.supActionBtnText, { color: "#d4af37" }]}>Deploy Target</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 3: AGENTS LIST */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>GRASSROOT AGENTS ({filteredAgents.length})</Text>
              </View>

              {filteredAgents.map((ag) => (
                <View key={ag._id || ag.id} style={styles.agentCard}>
                  <View style={styles.agentCardTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.agentNameText}>{ag.name || "Retail Agent"}</Text>
                      <Text style={styles.agentSupervisorTag}>
                        Supervisor: {ag.assignedSupervisorName || "LGA Hub"} ({ag.lga || "LGA"})
                      </Text>
                    </View>
                    <Text style={styles.agentSalesText}>
                      ₦{Number(ag.walletBalance || ag.balance || 0).toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* TAB 4: LIVE LOGS */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME TERRITORIAL LOGS</Text>
              </View>

              {activityLogs.map((log) => (
                <View key={log._id || Math.random().toString()} style={styles.logCard}>
                  <Text style={styles.logDetailsText}>{log.details || log.action || "Field activity recorded."}</Text>
                  <Text style={styles.logActorText}>
                    Actor: {log.user?.phone || log.actorRole || "Leader Node"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* MODAL 1: ASSIGN TARGET TO SUPERVISOR */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy LGA Target Quota</Text>
                <Text style={styles.modalCardSubtitle}>
                  Assigned Lead: {targetSupervisor?.name || targetSupervisor?.phone} ({targetSupervisor?.lga} LGA)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>TARGET MONTH / CYCLE</Text>
            <TextInput
              style={styles.textInputStyle}
              value={targetMonth}
              onChangeText={setTargetMonth}
            />

            <Text style={styles.formFieldLabel}>AGENT RECRUITMENT GOAL (HEADCOUNT)</Text>
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
              onPress={handleDispatchLgaTarget}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#0a1224" />
              ) : (
                <Text style={styles.primaryActionBtnText}>DEPLOY LGA TARGET</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ENROLL / APPOINT LGA SUPERVISOR */}
      <Modal visible={enrollModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Appoint LGA Supervisor</Text>
                <Text style={styles.modalCardSubtitle}>Deploy territory coordinator in {leaderState}</Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
                <Ionicons name="close" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
              <Text style={styles.formFieldLabel}>SELECT LOCAL GOVERNMENT (LGA)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
                {lgaList.map((lga) => (
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
                placeholder="e.g. Ibrahim Adamu"
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
                placeholder="e.g. lead@ayaxdata.online"
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
  lgaStatusDot: { width: 8, height: 8, borderRadius: 4 },
  lgaSupervisorName: { color: "#d4af37", fontSize: 11, fontWeight: "700", marginTop: 6 },
  lgaStatsSummary: { color: "#64748b", fontSize: 10, marginTop: 2 },
  lgaManageBtn: {
    backgroundColor: "#0f172a",
    paddingVertical: 5,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  lgaManageBtnText: { color: "#d4af37", fontSize: 10, fontWeight: "800" },
  lgaUnassignedText: { color: "#ef4444", fontSize: 10, fontWeight: "600" },
  lgaAppointBtn: {
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  lgaAppointBtnText: { color: "#d4af37", fontSize: 10, fontWeight: "800" },
  supCard: { backgroundColor: "#0a1224", borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: "#1e293b" },
  supCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  supMainInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  supAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#0f172a", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  supNameText: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  supLgaTag: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
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
  agentSupervisorTag: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  agentSalesText: { color: "#10b981", fontSize: 14, fontWeight: "900" },
  logCard: { backgroundColor: "#0a1224", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "#1e293b" },
  logDetailsText: { color: "#f8fafc", fontSize: 12, fontWeight: "600" },
  logActorText: { color: "#64748b", fontSize: 10, marginTop: 4 },
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