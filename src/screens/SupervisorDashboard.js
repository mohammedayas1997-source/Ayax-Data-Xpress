import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupervisorDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("agents"); // 'agents', 'targets', 'live_feed'
  const [searchQuery, setSearchQuery] = useState("");

  const [supervisorData, setSupervisorData] = useState({
    name: "Field Supervisor",
    phone: "",
    state: "Kano",
    lga: "Nasarawa",
    referralId: "AX0000",
    agents: [],
    targets: {
      dataGoal: 500,
      airtimeGoal: 50000,
      agentGoal: 10,
      dataSold: 0,
      airtimeSold: 0,
      currentMonth: "August 2026",
    },
  });

  const [activityLogs, setActivityLogs] = useState([]);

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Agent Inspection Modal
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

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

  const fetchSupervisorData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      let parsedUser = {};
      if (storedUserData) {
        try {
          parsedUser = JSON.parse(storedUserData);
        } catch (e) {
          parsedUser = {};
        }
      }

      const headers = { Authorization: `Bearer ${token}` };

      const [profRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/supervisor/profile`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
        axios.get(`${BASE_URL}/leader/live-audit-stream`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
      ]);

      const result = profRes.data || {};
      const data = result.data || result.supervisor || result;
      const assignedAgents = data.agents || [];
      const tg = data.targets || {};

      const totalTeamData = assignedAgents.reduce((acc, curr) => acc + Number(curr.dataSold || curr.totalGB || 0), 0);
      const totalTeamAirtime = assignedAgents.reduce((acc, curr) => acc + Number(curr.airtimeSold || 0), 0);

      setSupervisorData({
        name: data.name || (data.firstName ? `${data.firstName} ${data.surname || ""}` : parsedUser.name || "Field Supervisor"),
        phone: data.phone || parsedUser.phone || "",
        state: data.state || parsedUser.state || "Kano",
        lga: data.lga || parsedUser.lga || "Nasarawa",
        referralId: data.referralId || data.supervisorId || data.code || parsedUser.referralId || "AX0000",
        agents: assignedAgents,
        targets: {
          dataGoal: tg.dataGoal || 500,
          airtimeGoal: tg.airtimeGoal || 50000,
          agentGoal: tg.agentGoal || 10,
          dataSold: totalTeamData || data.teamPerformance || 0,
          airtimeSold: totalTeamAirtime || data.airtimeSold || 0,
          currentMonth: tg.currentMonth || tg.month || "August 2026",
        },
      });

      setActivityLogs(logsRes.data?.logs || []);
    } catch (error) {
      if (error.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        console.error("Supervisor Sync Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchSupervisorData();
    }, [fetchSupervisorData])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      fetchSupervisorData(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchSupervisorData]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchSupervisorData();
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Do you want to log out from Field Supervisor session?")) doLogout();
    } else {
      Alert.alert("Confirm Logout", "Exit current Supervisor desk?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const copyReferralCode = () => {
    showAlert("Referral ID", `Official Code: ${supervisorData.referralId}`);
  };

  const filteredAgents = supervisorData.agents.filter((ag) => {
    const q = searchQuery.toLowerCase();
    const name = (ag.name || `${ag.firstName || ""} ${ag.surname || ""}`).toLowerCase();
    const phone = ag.phone || "";
    return name.includes(q) || phone.includes(q);
  });

  const dataProgress = Math.min(Math.round(((supervisorData.targets.dataSold || 0) / (supervisorData.targets.dataGoal || 1)) * 100), 100);
  const airtimeProgress = Math.min(Math.round(((supervisorData.targets.airtimeSold || 0) / (supervisorData.targets.airtimeGoal || 1)) * 100), 100);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderTitle}>FIELD SUPERVISOR DESK</Text>
        <Text style={styles.loaderText}>Syncing Real-time LGA Agents & Quota Streams...</Text>
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
            <Text style={styles.stateBadgeText}>
              {supervisorData.lga.toUpperCase()} LGA • {supervisorData.state.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.topBrandTitle}>FIELD SUPERVISOR (FS)</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => navigation.navigate("Signup")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.avatarBtn, styles.logoutIconBtn]} onPress={handleLogout} activeOpacity={0.7}>
            <Feather name="log-out" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* NAVIGATION TABS */}
      <View style={styles.mainNavBar}>
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
            LGA Agents ({supervisorData.agents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "targets" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("targets")}
        >
          <FontAwesome5
            name="bullseye"
            size={14}
            color={activeTab === "targets" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "targets" && styles.mainNavTabTextActive]}>
            Quota & Goals
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "live_feed" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("live_feed")}
        >
          <Feather
            name="activity"
            size={14}
            color={activeTab === "live_feed" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "live_feed" && styles.mainNavTabTextActive]}>
            Live Feed
          </Text>
        </TouchableOpacity>
      </View>

      {/* DASHBOARD BODY */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onManualRefresh} tintColor="#1e40af" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* OFFICIAL SUPERVISOR IDENTIFICATION CARD */}
          <View style={styles.idCard}>
            <View style={styles.idInfo}>
              <Text style={styles.idLabel}>OFFICIAL AGENT ONBOARDING CODE</Text>
              <Text style={styles.idValue}>{supervisorData.referralId}</Text>
              <Text style={styles.idSub}>Provide this referral code to your new LGA agents during onboarding</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyReferralCode} activeOpacity={0.8}>
              <Ionicons name="copy-outline" size={15} color="#ffffff" />
              <Text style={styles.copyText}>COPY CODE</Text>
            </TouchableOpacity>
          </View>

          {/* SUPERVISOR ASSIGNED QUOTA PROGRESS CARD (DARK BLUE EXECUTIVE CARD) */}
          <View style={styles.executiveTargetCardDark}>
            <View style={styles.execHeaderRowDark}>
              <View>
                <Text style={styles.execBadgeTextDark}>STATE MANAGER QUOTA ASSIGNMENT</Text>
                <Text style={styles.execTitleTextDark}>{supervisorData.targets.currentMonth.toUpperCase()} PERFORMANCE</Text>
              </View>
              <View style={styles.cycleBadgeDark}>
                <Ionicons name="calendar" size={12} color="#38bdf8" />
                <Text style={styles.cycleBadgeTextDark}>{supervisorData.targets.currentMonth}</Text>
              </View>
            </View>

            <View style={styles.execMetricsRow}>
              {/* Data Quota */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#38bdf8" }]}>DATA QUOTA (GB)</Text>
                <Text style={styles.execMetricValueDark}>
                  {supervisorData.targets.dataSold} / {supervisorData.targets.dataGoal} GB
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{dataProgress}% Completed</Text>
              </View>

              {/* Airtime Quota */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#fbbf24" }]}>AIRTIME SALES (₦)</Text>
                <Text style={styles.execMetricValueDark}>
                  ₦{Number(supervisorData.targets.airtimeSold).toLocaleString()} / ₦{Number(supervisorData.targets.airtimeGoal).toLocaleString()}
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${airtimeProgress}%`, backgroundColor: "#fbbf24" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{airtimeProgress}% Completed</Text>
              </View>
            </View>
          </View>

          {/* TELEMETRY SUMMARY CARDS */}
          <View style={styles.telemetrySection}>
            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>LGA Retail Agents</Text>
                  <Ionicons name="people" size={16} color="#34d399" />
                </View>
                <Text style={styles.metricValueDark}>{supervisorData.agents.length}</Text>
                <Text style={styles.metricSubDark}>Assigned Field Resellers</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Total Data Delivered</Text>
                  <Ionicons name="server" size={15} color="#a78bfa" />
                </View>
                <Text style={styles.metricValueDark}>{supervisorData.targets.dataSold} GB</Text>
                <Text style={styles.metricSubDark}>LGA Telecom Bundles</Text>
              </View>

              <View style={[styles.metricCard, styles.cardDarkBlueBg]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={styles.metricLabelDark}>Gross Airtime Sales</Text>
                  <Ionicons name="call" size={14} color="#fbbf24" />
                </View>
                <Text style={styles.metricValueDark}>
                  ₦{Number(supervisorData.targets.airtimeSold).toLocaleString()}
                </Text>
                <Text style={styles.metricSubDark}>VTU Gross Recharge Value</Text>
              </View>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agent by name or phone..."
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

          {/* TAB 1: AGENTS LIST */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>LGA RETAIL AGENTS DIRECTORY ({filteredAgents.length})</Text>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => navigation.navigate("Signup")}
                >
                  <Ionicons name="person-add" size={13} color="#ffffff" />
                  <Text style={styles.actionPillBtnText}>REGISTER AGENT</Text>
                </TouchableOpacity>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag) => {
                  const agId = ag._id || ag.id;
                  const agName = ag.name || (ag.firstName ? `${ag.firstName} ${ag.surname || ""}` : "Retail Agent");
                  const agPhone = ag.phone || "No phone";
                  const agDataSold = ag.dataSold || ag.totalGB || 0;
                  const agAirtimeSold = ag.airtimeSold || 0;

                  return (
                    <TouchableOpacity
                      key={agId}
                      style={styles.agentCard}
                      activeOpacity={0.9}
                      onPress={() => {
                        setSelectedAgent(ag);
                        setInspectModalVisible(true);
                      }}
                    >
                      <View style={styles.agentCardTop}>
                        <View style={styles.agentInfoLeft}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: ag.isSuspended ? "#dc2626" : "#059669" },
                            ]}
                          />
                          <View>
                            <Text style={styles.agentNameText}>{agName}</Text>
                            <Text style={styles.agentPhoneText}>📞 {agPhone}</Text>
                          </View>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.agentSalesText}>
                            ₦{Number(ag.walletBalance || ag.balance || 0).toLocaleString()}
                          </Text>
                          <Text style={styles.agentSalesSub}>Float</Text>
                        </View>
                      </View>

                      {/* Performance Metrics Row */}
                      <View style={styles.statsSummaryRow}>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Data Delivered</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#1e40af" }]}>{agDataSold} GB</Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Airtime Sold</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                            ₦{Number(agAirtimeSold).toLocaleString()}
                          </Text>
                        </View>
                        <View style={styles.summaryBox}>
                          <Text style={styles.summaryBoxLabel}>Performance</Text>
                          <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>Active</Text>
                        </View>
                      </View>

                      {/* Action Row */}
                      <View style={styles.agentActionRow}>
                        <TouchableOpacity
                          style={styles.agentActionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL(`tel:${agPhone}`);
                          }}
                        >
                          <Ionicons name="call" size={13} color="#0284c7" />
                          <Text style={[styles.agentActionBtnText, { color: "#0284c7" }]}>Call Agent</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.agentActionBtn}
                          onPress={(e) => {
                            e.stopPropagation();
                            Linking.openURL(`https://wa.me/234${agPhone.replace(/^0/, "")}`);
                          }}
                        >
                          <Ionicons name="logo-whatsapp" size={13} color="#059669" />
                          <Text style={[styles.agentActionBtnText, { color: "#059669" }]}>WhatsApp</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.agentActionBtn, styles.inspectPillBtn]}
                          onPress={() => {
                            setSelectedAgent(ag);
                            setInspectModalVisible(true);
                          }}
                        >
                          <Feather name="activity" size={12} color="#1e40af" />
                          <Text style={[styles.agentActionBtnText, { color: "#1e40af", fontWeight: "900" }]}>
                            Performance Profile
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={36} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No agents registered in this LGA yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: QUOTA & GOALS */}
          {activeTab === "targets" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>OFFICIAL LGA QUOTA SPECIFICATIONS</Text>
              </View>

              <View style={styles.targetDetailGrid}>
                <View style={[styles.targetDetailCard, { borderLeftColor: "#1e40af" }]}>
                  <Text style={styles.targetDetailLabel}>Monthly Data Quota</Text>
                  <Text style={[styles.targetDetailValue, { color: "#1e40af" }]}>
                    {supervisorData.targets.dataGoal} GB
                  </Text>
                  <Text style={styles.targetDetailSub}>Target for {supervisorData.lga} LGA</Text>
                </View>

                <View style={[styles.targetDetailCard, { borderLeftColor: "#d97706" }]}>
                  <Text style={styles.targetDetailLabel}>Monthly Airtime Quota</Text>
                  <Text style={[styles.targetDetailValue, { color: "#d97706" }]}>
                    ₦{Number(supervisorData.targets.airtimeGoal).toLocaleString()}
                  </Text>
                  <Text style={styles.targetDetailSub}>VTU Sales Goal</Text>
                </View>

                <View style={[styles.targetDetailCard, { borderLeftColor: "#059669" }]}>
                  <Text style={styles.targetDetailLabel}>Agent Headcount Quota</Text>
                  <Text style={[styles.targetDetailValue, { color: "#059669" }]}>
                    {supervisorData.targets.agentGoal} Agents
                  </Text>
                  <Text style={styles.targetDetailSub}>LGA Network Expansion</Text>
                </View>

                <View style={[styles.targetDetailCard, { borderLeftColor: "#0284c7" }]}>
                  <Text style={styles.targetDetailLabel}>Assigned Territory</Text>
                  <Text style={styles.targetDetailValue}>
                    {supervisorData.lga} LGA, {supervisorData.state}
                  </Text>
                  <Text style={styles.targetDetailSub}>Deployment Operational Desk</Text>
                </View>
              </View>
            </View>
          )}

          {/* TAB 3: LIVE FEED AUDIT LOGS */}
          {activeTab === "live_feed" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME TERRITORY ACTIVITY LOG</Text>
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
                    <Text style={styles.logActorText}>Actor: {log.user?.phone || log.actorRole || "Field Agent"}</Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={34} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No real-time activities logged yet.</Text>
                </View>
              )}
            </View>
          )}
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
                  <Text style={styles.sidebarBrandText}>Field Supervisor</Text>
                  <Text style={styles.sidebarRoleText}>{supervisorData.lga} LGA Desk</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>NAVIGATION</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "agents" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("agents");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="people" size={16} color="#1e40af" />
                </View>
                <Text style={[styles.navItemText, activeTab === "agents" && { color: "#1e40af", fontWeight: "900" }]}>
                  LGA Agents List
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "targets" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("targets");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#fef3c7" }]}>
                  <FontAwesome5 name="bullseye" size={14} color="#d97706" />
                </View>
                <Text style={[styles.navItemText, activeTab === "targets" && { color: "#d97706", fontWeight: "900" }]}>
                  Quota & Goals
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "live_feed" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("live_feed");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Feather name="activity" size={15} color="#059669" />
                </View>
                <Text style={[styles.navItemText, activeTab === "live_feed" && { color: "#059669", fontWeight: "900" }]}>
                  Live Feed Logs
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("Signup");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Register New Agent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  copyReferralCode();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#f0f9ff" }]}>
                  <Ionicons name="copy-outline" size={16} color="#0284c7" />
                </View>
                <Text style={styles.navItemText}>Copy Onboarding Code</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Exit Supervisor Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* MODAL 1: DRILL-DOWN AGENT PERFORMANCE INSPECTION */}
      <Modal visible={inspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "88%", width: isLargeScreen ? "60%" : "95%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>{selectedAgent?.name?.toUpperCase() || "AGENT OVERVIEW"}</Text>
                <Text style={styles.modalCardSubtitle}>Phone: {selectedAgent?.phone} • LGA: {supervisorData.lga}</Text>
              </View>
              <TouchableOpacity onPress={() => setInspectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Agent Performance Summary Banner */}
              <View style={styles.inspectSummaryBanner}>
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Wallet Balance</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#059669" }]}>
                    ₦{Number(selectedAgent?.walletBalance || selectedAgent?.balance || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Data Sold</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#1e40af" }]}>
                    {selectedAgent?.dataSold || selectedAgent?.totalGB || 0} GB
                  </Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Airtime Sold</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#d97706" }]}>
                    ₦{Number(selectedAgent?.airtimeSold || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.formFieldLabel}>DIRECT AGENT ACTIONS</Text>

              <View style={styles.inspectActionGrid}>
                <TouchableOpacity
                  style={[styles.inspectActionCardBtn, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}
                  onPress={() => Linking.openURL(`tel:${selectedAgent?.phone}`)}
                >
                  <Ionicons name="call" size={16} color="#0284c7" />
                  <Text style={[styles.inspectActionCardBtnText, { color: "#0284c7" }]}>Direct Phone Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inspectActionCardBtn, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}
                  onPress={() => Linking.openURL(`https://wa.me/234${(selectedAgent?.phone || "").replace(/^0/, "")}`)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                  <Text style={[styles.inspectActionCardBtnText, { color: "#059669" }]}>WhatsApp Message</Text>
                </TouchableOpacity>
              </View>
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

  idCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 16,
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 5,
    borderLeftColor: "#0284c7",
    elevation: 2,
  },
  idInfo: { flex: 1, marginRight: 10 },
  idLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  idValue: { color: "#0f172a", fontSize: 20, fontWeight: "900", marginTop: 2 },
  idSub: { color: "#94a3b8", fontSize: 10.5, marginTop: 2 },
  copyBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  copyText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },

  // Executive Target Card Dark
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
  cycleBadgeDark: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  cycleBadgeTextDark: { color: "#38bdf8", fontSize: 10.5, fontWeight: "800", marginLeft: 4 },
  execMetricsRow: { flexDirection: isLargeScreen ? "row" : "column", justifyContent: "space-between" },
  execMetricBoxDark: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: isLargeScreen ? 4 : 0,
    borderWidth: 1,
    borderColor: "#334155",
  },
  execMetricLabelDark: { fontSize: 10, fontWeight: "800" },
  execMetricValueDark: { fontSize: 16, fontWeight: "900", marginVertical: 4, color: "#ffffff" },
  execProgressBarBgDark: { height: 7, backgroundColor: "#334155", borderRadius: 4, overflow: "hidden", marginVertical: 4 },
  execProgressBarFill: { height: 7, borderRadius: 4 },
  execPercentSubDark: { color: "#94a3b8", fontSize: 10, fontWeight: "700" },

  // Telemetry Section
  telemetrySection: { paddingHorizontal: isLargeScreen ? 24 : 16, marginTop: 12 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  metricCard: {
    width: isLargeScreen ? "31.5%" : "100%",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
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
    marginTop: 14,
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 12 },
  tabContentWrapper: { paddingHorizontal: isLargeScreen ? 24 : 16 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 },
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

  agentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  agentCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  agentInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  agentNameText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  agentPhoneText: { color: "#64748b", fontSize: 11, marginTop: 2 },
  agentSalesText: { color: "#059669", fontSize: 14, fontWeight: "900" },
  agentSalesSub: { color: "#94a3b8", fontSize: 9.5 },
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
  summaryBox: { flex: 1, alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },
  summaryBoxValue: { fontSize: 13, fontWeight: "900", marginTop: 2 },
  agentActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  agentActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  agentActionBtnText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  inspectPillBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  targetDetailGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  targetDetailCard: {
    width: isLargeScreen ? "48.5%" : "100%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
  },
  targetDetailLabel: { color: "#64748b", fontSize: 10.5, fontWeight: "700" },
  targetDetailValue: { color: "#0f172a", fontSize: 16, fontWeight: "900", marginVertical: 4 },
  targetDetailSub: { color: "#94a3b8", fontSize: 10 },

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
  inspectSummaryBanner: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  inspectBannerBox: { flex: 1, alignItems: "center" },
  inspectBannerLabel: { color: "#1e40af", fontSize: 10, fontWeight: "700" },
  inspectBannerValue: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  inspectBannerDivider: { width: 1, height: 30, backgroundColor: "#bfdbfe" },
  formFieldLabel: { color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 10, marginBottom: 6 },
  inspectActionGrid: { marginTop: 4 },
  inspectActionCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  inspectActionCardBtnText: { fontSize: 12, fontWeight: "800", marginLeft: 10 },
});

export default SupervisorDashboard;