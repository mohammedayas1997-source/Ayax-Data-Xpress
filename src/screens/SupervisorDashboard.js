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
  Clipboard,
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
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupervisorDashboard = ({ navigation }) => {
  const [supervisorProfile, setSupervisorProfile] = useState({
    name: "Field Supervisor",
    phone: "",
    email: "",
    state: "Kano",
    lga: "Ajingi",
    referralCode: "AYX-FS",
  });

  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Supervisor's Target (Karɓa daga State Manager kawai don bibiya)
  const [myTarget, setMyTarget] = useState({
    dataGoal: 0,
    airtimeGoal: 0,
    agentGoal: 10,
    currentMonth: "August 2026",
    dataSold: 0,
    airtimeSold: 0,
  });

  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgentsCount: 0,
    overallDataSold: 0,
    overallAirtimeSold: 0,
    totalTeamFloat: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Search & Navigation Tabs
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("agents");

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 340 : Math.min(width * 0.88, 360);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modal: Dalla-dallar Duban Agent (Inspector Modal)
  const [inspectModalVisible, setInspectModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Modal: Directive Broadcast
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
    if (Platform.OS === "web") {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleCopyReferral = () => {
    const code = supervisorProfile.referralCode || supervisorProfile.phone;
    if (Clipboard && Clipboard.setString) {
      Clipboard.setString(code);
    }
    showAlert("Copied 📋", `Referral Code: ${code} copied to clipboard.`);
  };

  // KAI TSAYE ZUWA SIGNUP SCREEN TARE DA REFERRAL CODE DA LGA NA SUPERVISOR
  const handleNavigateToSignup = () => {
    const registrationParams = {
      role: "agent",
      referralCode: supervisorProfile.referralCode,
      referredBy: supervisorProfile.referralCode,
      supervisorId: supervisorProfile.referralCode,
      state: supervisorProfile.state,
      lga: supervisorProfile.lga,
      assignedSupervisor: supervisorProfile.phone,
    };

    if (navigation && typeof navigation.navigate === "function") {
      try {
        navigation.navigate("Signup", registrationParams);
      } catch (e1) {
        try {
          navigation.navigate("Register", registrationParams);
        } catch (e2) {
          navigation.navigate("SignupScreen", registrationParams);
        }
      }
    } else {
      showAlert(
        "Agent Registration Link",
        `Share this code with your Agent: ${supervisorProfile.referralCode}`
      );
    }
  };

  // 1. Kwaso dukkan bayanan Supervisor da Agents a Real Live
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
          } catch (e) {}
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [supDashRes, targetRes, agentsRes, logsRes] = await Promise.all([
          axios.get(`${BASE_URL}/supervisor/dashboard`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/supervisor/my-target`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/supervisor/agents`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/supervisor/activity-logs`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
        ]);

        const dashData = supDashRes.data?.data || supDashRes.data || {};
        
        // CIKAKKEN GYARA: Tace duk inda aka dawo da agents din kar a rasa kowa
        const listA = Array.isArray(dashData.agents) ? dashData.agents : [];
        const listB = Array.isArray(agentsRes.data?.agents) ? agentsRes.data.agents : [];
        const listC = Array.isArray(agentsRes.data?.data) ? agentsRes.data.data : [];
        const listD = Array.isArray(agentsRes.data) ? agentsRes.data : [];

        let combinedAgents = [...listA, ...listB, ...listC, ...listD];
        // Cire duplicates ta hanyar _id ko id
        const uniqueAgentsMap = new Map();
        combinedAgents.forEach((ag) => {
          const id = ag._id || ag.id;
          if (id && !uniqueAgentsMap.has(String(id))) {
            uniqueAgentsMap.set(String(id), ag);
          }
        });
        const fetchedAgents = Array.from(uniqueAgentsMap.values());

        const fetchedLogs =
          dashData.activityLogs ||
          logsRes.data?.logs ||
          logsRes.data?.data?.logs ||
          logsRes.data?.data ||
          (Array.isArray(logsRes.data) ? logsRes.data : []) ||
          [];

        const fetchedTarget =
          targetRes.data?.targets ||
          targetRes.data?.data?.targets ||
          targetRes.data?.data ||
          dashData.myTarget ||
          dashData.targets ||
          parsedUser.targets ||
          {};

        const currentPhone = String(dashData.phone || parsedUser.phone || "").trim();
        const currentName = dashData.name || parsedUser.name || `${dashData.firstName || parsedUser.firstName || "Field"} ${dashData.surname || parsedUser.surname || "Supervisor"}`.trim();
        const currentEmail = dashData.email || parsedUser.email || (currentPhone ? `${currentPhone}@ayaxdata.online` : "supervisor@ayaxdata.online");
        const currentLga = dashData.lga || parsedUser.lga || "Ajingi";
        const currentState = dashData.state || parsedUser.state || "Kano";

        const cleanRefCode =
          dashData.referralCode ||
          parsedUser.referralCode ||
          dashData.referralId ||
          `AYX-${String(currentLga).toUpperCase()}-${String(currentPhone).slice(-4)}`;

        setSupervisorProfile({
          name: currentName,
          phone: currentPhone,
          email: currentEmail,
          state: currentState,
          lga: currentLga,
          referralCode: cleanRefCode,
        });

        setAgents(fetchedAgents);
        setActivityLogs(fetchedLogs);

        const totalFloat = fetchedAgents.reduce(
          (acc, curr) => acc + Number(curr.walletBalance || curr.balance || 0),
          0
        );

        const totalDataSold = fetchedAgents.reduce(
          (acc, curr) => acc + Number(curr.dataVolumeSold || curr.dataSold || 0),
          0
        );

        const totalAirtimeSold = fetchedAgents.reduce(
          (acc, curr) => acc + Number(curr.airtimeSold || curr.totalAirtime || 0),
          0
        );

        setMyTarget({
          dataGoal: Number(fetchedTarget.dataGoal || 0),
          airtimeGoal: Number(fetchedTarget.airtimeGoal || 0),
          agentGoal: Number(fetchedTarget.agentGoal || 10),
          currentMonth: fetchedTarget.currentMonth || fetchedTarget.month || "August 2026",
          dataSold: totalDataSold,
          airtimeSold: totalAirtimeSold,
        });

        setStats({
          totalAgents: fetchedAgents.length,
          activeAgentsCount: fetchedAgents.filter((a) => (a.walletBalance || a.balance || 0) > 0 || (a.dataSold || 0) > 0).length,
          overallDataSold: totalDataSold,
          overallAirtimeSold: totalAirtimeSold,
          totalTeamFloat: totalFloat,
        });
      } catch (error) {
        if (error.response?.status === 401 && !isBackground) {
          await AsyncStorage.clear();
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        } else if (!isBackground) {
          console.error("Supervisor Dashboard Sync Error:", error.message);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData(true);
    }, [fetchDashboardData])
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
      if (window.confirm("Do you want to log out from Field Supervisor session?")) {
        doLogout();
      }
    } else {
      Alert.alert("Confirm Logout", "Exit current Field Supervisor session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const handleBroadcastToAgents = async () => {
    if (!notifTitle.trim() || !notifMessage.trim()) {
      return showAlert("Validation Error", "Directive Title and Message Body are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/notifications/send`,
        {
          title: notifTitle.trim(),
          message: notifMessage.trim(),
          category: "LGA_DIRECTIVE",
          lga: supervisorProfile.lga,
          state: supervisorProfile.state,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        showAlert("Directive Dispatched 🚀", `Alert sent to all agents in ${supervisorProfile.lga} LGA.`);
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

  const filteredAgents = agents.filter((ag) => {
    const matchSearch =
      (ag.name || `${ag.firstName || ""} ${ag.surname || ""}`).toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ag.phone || "").includes(searchQuery) ||
      (ag.email || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ag.address || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchSearch;
  });

  const dataProgress = myTarget.dataGoal > 0 
    ? Math.min(Math.round(((myTarget.dataSold || 0) / myTarget.dataGoal) * 100), 100)
    : 0;

  const airtimeProgress = myTarget.airtimeGoal > 0 
    ? Math.min(Math.round(((myTarget.airtimeSold || 0) / myTarget.airtimeGoal) * 100), 100)
    : 0;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderTitle}>{supervisorProfile.lga.toUpperCase()} LGA FIELD TRACKER</Text>
        <Text style={styles.loaderText}>Connecting to Live Grassroot Outlets...</Text>
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
              {supervisorProfile.lga.toUpperCase()} LGA FIELD SUPERVISOR (FS)
            </Text>
          </View>
          <Text style={styles.topBrandTitle}>
            {supervisorProfile.state.toUpperCase()} STATE • {stats.totalAgents} OUTLETS
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={handleNavigateToSignup}
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
          style={[styles.mainNavTab, activeTab === "agents" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("agents")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "agents" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "agents" && styles.mainNavTabTextActive]}>
            Retail Outlets ({filteredAgents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "performance" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("performance")}
        >
          <MaterialCommunityIcons
            name="chart-timeline-variant-shimmer"
            size={16}
            color={activeTab === "performance" ? "#1e40af" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "performance" && styles.mainNavTabTextActive]}>
            Target Overview
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
            Live Logs
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
          
          {/* SECTION 1: SUPERVISOR'S TARGET MONITORING CARD (DAGA STATE MANAGER) */}
          <View style={styles.executiveTargetCardDark}>
            <View style={styles.execHeaderRowDark}>
              <View>
                <Text style={styles.execBadgeTextDark}>STATE MANAGER TARGET ALLOCATION</Text>
                <Text style={styles.execTitleTextDark}>{myTarget.currentMonth.toUpperCase()} QUOTA PROGRESS</Text>
              </View>
              <View style={styles.liveTrackingBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.liveTrackingBadgeText}>LIVE TRACKING</Text>
              </View>
            </View>

            <View style={styles.execMetricsGrid}>
              {/* Data Target */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#38bdf8" }]}>LGA DATA TARGET (GB)</Text>
                <Text style={styles.execMetricValueDark}>
                  {myTarget.dataSold} / {myTarget.dataGoal} GB
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{dataProgress}% Sold by Agents</Text>
              </View>

              {/* Airtime Target */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#fbbf24" }]}>AIRTIME SALES (₦)</Text>
                <Text style={styles.execMetricValueDark}>
                  ₦{Number(myTarget.airtimeSold).toLocaleString()} / ₦{Number(myTarget.airtimeGoal).toLocaleString()}
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${airtimeProgress}%`, backgroundColor: "#fbbf24" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{airtimeProgress}% Completed</Text>
              </View>

              {/* New Agents Goal */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#34d399" }]}>OUTLETS ENROLLED</Text>
                <Text style={styles.execMetricValueDark}>
                  {stats.totalAgents} / {myTarget.agentGoal || 10}
                </Text>
                <Text style={styles.execPercentSubDark}>Active Resellers</Text>
              </View>

              {/* Team Float */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#a78bfa" }]}>TOTAL TEAM FLOAT</Text>
                <Text style={styles.execMetricValueDark}>
                  ₦{Number(stats.totalTeamFloat).toLocaleString()}
                </Text>
                <Text style={styles.execPercentSubDark}>Live Wallet Balance</Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: REFERRAL CODE & OUTLET INVITATION CARD */}
          <View style={styles.referralBannerCard}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 }}>
                <View style={styles.referralIconWrap}>
                  <MaterialCommunityIcons name="ticket-percent" size={22} color="#1e40af" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.referralCardTitle}>Supervisor Referral Code (Real-Time)</Text>
                  <Text style={styles.referralCardSub}>Auto-binds agent to your LGA supervision during Signup</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.copyRefBtn} onPress={handleCopyReferral} activeOpacity={0.8}>
                <Feather name="copy" size={13} color="#ffffff" />
                <Text style={styles.copyRefBtnText}>{supervisorProfile.referralCode}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* SECTION 3: SUMMARY ACTIONS ROW */}
          <View style={styles.actionRowContainer}>
            <TouchableOpacity
              style={styles.actionBtnFull}
              onPress={handleNavigateToSignup}
              activeOpacity={0.8}
            >
              <Ionicons name="person-add" size={15} color="#ffffff" />
              <Text style={styles.actionBtnFullText}>+ OPEN SIGNUP SCREEN TO REGISTER AGENT</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionBtnSecondary}
              onPress={() => setNotifModalVisible(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="megaphone-outline" size={15} color="#0284c7" />
              <Text style={styles.actionBtnSecondaryText}>DISPATCH DIRECTIVE</Text>
            </TouchableOpacity>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchBar}>
            <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder={`Search ${supervisorProfile.lga} Agents by name, phone, email, or address...`}
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

          {/* TAB 1: RETAIL AGENTS LIST (WITH REAL LIVE INFORMATION & EMAIL) */}
          {activeTab === "agents" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>
                  GRASSROOT RETAIL OUTLETS DIRECTORY ({filteredAgents.length})
                </Text>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={handleNavigateToSignup}
                >
                  <Ionicons name="person-add" size={13} color="#ffffff" />
                  <Text style={styles.actionPillBtnText}>+ ADD AGENT</Text>
                </TouchableOpacity>
              </View>

              {filteredAgents.length > 0 ? (
                filteredAgents.map((ag, index) => {
                  const agId = ag._id || ag.id;
                  const agName = ag.name || `${ag.firstName || ""} ${ag.surname || ""}` || "Retail Agent";
                  const agPhone = ag.phone || "No Phone";
                  const agEmail = ag.email || `${agPhone}@ayaxdata.online`;
                  const agFloat = Number(ag.walletBalance || ag.balance || 0);

                  return (
                    <View key={agId || index.toString()} style={styles.agentCard}>
                      <View style={styles.agentCardTop}>
                        <View style={styles.agentMainInfo}>
                          <View style={styles.agentAvatar}>
                            <FontAwesome5 name="store" size={15} color="#059669" />
                          </View>
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={styles.agentNameText}>{agName}</Text>
                            <Text style={styles.agentLocationTag}>
                              📍 {ag.lga || supervisorProfile.lga} LGA • 📞 {agPhone}
                            </Text>
                            <Text style={styles.emailTagText}>
                              ✉️ {agEmail}
                            </Text>
                            {ag.address ? (
                              <Text style={styles.addressTagText}>
                                🏬 Address: {ag.address}
                              </Text>
                            ) : null}
                          </View>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.agentSalesText}>
                            ₦{agFloat.toLocaleString()}
                          </Text>
                          <Text style={styles.agentSalesSub}>Float Balance</Text>
                        </View>
                      </View>

                      {/* Quota Breakdown da SM ya sa masa da abinda ya sayar */}
                      <View style={styles.agentQuotaRow}>
                        <Text style={styles.agentQuotaText}>
                          Data Target: <Text style={{ color: "#1e40af", fontWeight: "bold" }}>{ag.targets?.dataGoal || ag.dataGoal || 0} GB</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Airtime Target: <Text style={{ color: "#d97706", fontWeight: "bold" }}>₦{Number(ag.targets?.airtimeGoal || ag.airtimeGoal || 0).toLocaleString()}</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Data Sold: <Text style={{ color: "#059669", fontWeight: "bold" }}>{ag.dataVolumeSold || ag.dataSold || 0} GB</Text>
                        </Text>
                      </View>

                      {/* Action Row: Call, Email, da Inspect */}
                      <View style={styles.agentCardBottom}>
                        <TouchableOpacity
                          style={styles.inspectBtn}
                          onPress={() => {
                            setSelectedAgent(ag);
                            setInspectModalVisible(true);
                          }}
                        >
                          <Feather name="eye" size={12} color="#1e40af" />
                          <Text style={styles.inspectBtnText}>Inspect Live Outlet</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: "row", alignItems: "center" }}>
                          <TouchableOpacity
                            style={styles.agentCallIconBtn}
                            onPress={() => Linking.openURL(`tel:${agPhone}`)}
                          >
                            <Ionicons name="call" size={13} color="#1e40af" />
                          </TouchableOpacity>

                          {ag.email ? (
                            <TouchableOpacity
                              style={[styles.agentCallIconBtn, { marginLeft: 6 }]}
                              onPress={() => Linking.openURL(`mailto:${ag.email}`)}
                            >
                              <Ionicons name="mail" size={13} color="#0284c7" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyFeed}>
                  <Ionicons name="people-outline" size={36} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No retail agents registered in {supervisorProfile.lga} LGA yet.</Text>
                </View>
              )}
            </View>
          )}

          {/* TAB 2: TARGET OVERVIEW */}
          {activeTab === "performance" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>SM TARGET QUOTA BREAKDOWN</Text>
              </View>

              <View style={styles.performanceCard}>
                <Text style={styles.perfCardTitle}>Data Target Assigned by State Manager</Text>
                <View style={styles.perfProgressBarBg}>
                  <View style={[styles.perfProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.perfSubText}>
                  {myTarget.dataSold} GB sold out of {myTarget.dataGoal} GB assigned target ({dataProgress}%).
                </Text>
              </View>

              <View style={styles.performanceCard}>
                <Text style={styles.perfCardTitle}>Airtime Sales Target</Text>
                <View style={styles.perfProgressBarBg}>
                  <View style={[styles.perfProgressBarFill, { width: `${airtimeProgress}%`, backgroundColor: "#fbbf24" }]} />
                </View>
                <Text style={styles.perfSubText}>
                  ₦{Number(myTarget.airtimeSold).toLocaleString()} sold out of ₦{Number(myTarget.airtimeGoal).toLocaleString()} quota ({airtimeProgress}%).
                </Text>
              </View>
            </View>
          )}

          {/* TAB 3: LIVE LOGS */}
          {activeTab === "history" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>REAL-TIME FIELD DISPATCH LOGS</Text>
              </View>

              {activityLogs.length > 0 ? (
                activityLogs.map((log) => (
                  <View key={log._id || Math.random().toString()} style={styles.logCard}>
                    <Text style={styles.logDetailsText}>{log.details || log.action || "Field operation recorded."}</Text>
                    <Text style={styles.logActorText}>
                      Time: {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : "Live"}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={styles.emptyFeed}>
                  <Feather name="activity" size={34} color="#94a3b8" />
                  <Text style={styles.emptyFeedText}>No dispatch logs recorded yet.</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {/* =========================================================================
          MODAL 1: INSPECT LIVE AGENT TELEMETRY
         ========================================================================= */}
      <Modal visible={inspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "60%" : "95%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>{selectedAgent?.name}</Text>
                <Text style={styles.modalCardSubtitle}>
                  📞 {selectedAgent?.phone} • ✉️ {selectedAgent?.email}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setInspectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
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
                    {selectedAgent?.dataVolumeSold || selectedAgent?.dataSold || 0} GB
                  </Text>
                </View>
              </View>

              <Text style={styles.formFieldLabel}>TARGET ALLOCATED BY STATE MANAGER</Text>
              <View style={styles.quotaInfoBox}>
                <Text style={styles.quotaInfoText}>
                  🎯 Data Quota: <Text style={{ fontWeight: "bold", color: "#1e40af" }}>{selectedAgent?.targets?.dataGoal || 0} GB</Text>
                </Text>
                <Text style={styles.quotaInfoText}>
                  🎯 Airtime Quota: <Text style={{ fontWeight: "bold", color: "#d97706" }}>₦{Number(selectedAgent?.targets?.airtimeGoal || 0).toLocaleString()}</Text>
                </Text>
              </View>

              <Text style={styles.formFieldLabel}>OUTLET LOCATION</Text>
              <Text style={styles.outletAddressText}>
                📍 {selectedAgent?.address || "Registered under " + supervisorProfile.lga + " LGA"}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 2: DIRECTIVE BROADCAST
         ========================================================================= */}
      <Modal visible={notifModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Broadcast LGA Directive</Text>
                <Text style={styles.modalCardSubtitle}>Send alert to all retail agents in {supervisorProfile.lga}</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DIRECTIVE TITLE</Text>
            <TextInput
              style={styles.textInputStyle}
              placeholder="e.g. Fast Data Sales Incentive"
              placeholderTextColor="#94a3b8"
              value={notifTitle}
              onChangeText={setNotifTitle}
            />

            <Text style={styles.formFieldLabel}>DIRECTIVE BODY</Text>
            <TextInput
              style={[styles.textInputStyle, { height: 80, textAlignVertical: "top" }]}
              placeholder="Type your announcement to all retail agents..."
              placeholderTextColor="#94a3b8"
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
            />

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleBroadcastToAgents}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionBtnText}>DISPATCH TO AGENTS</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          SIDEBAR DRAWER (TARE DA CIKAKKEN SUPERVISOR PROFILE A SAMAN SITEBAR)
         ========================================================================= */}
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
            {/* 1. SUPERVISOR PROFILE HEADER A SAMAN SITEBAR */}
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandRow}>
                <View style={styles.sidebarSupervisorAvatar}>
                  <FontAwesome5 name="user-tie" size={20} color="#1e40af" />
                </View>
                <View style={{ marginLeft: 10, flex: 1 }}>
                  <Text style={styles.sidebarBrandText} numberOfLines={1}>
                    {supervisorProfile.name}
                  </Text>
                  <Text style={styles.sidebarRoleText}>
                    {supervisorProfile.lga} LGA Field Lead
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)} style={{ padding: 4 }}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* 2. CIKAKKEN SUPERVISOR CONTACTS & REFERRAL CARD A CIKIN SITEBAR */}
            <View style={styles.sidebarProfileDetailsCard}>
              <Text style={styles.sidebarProfileDetailText} numberOfLines={1}>
                📞 Phone: <Text style={{ color: "#0f172a", fontWeight: "700" }}>{supervisorProfile.phone || "N/A"}</Text>
              </Text>
              <Text style={styles.sidebarProfileDetailText} numberOfLines={1}>
                ✉️ Email: <Text style={{ color: "#0284c7", fontWeight: "700" }}>{supervisorProfile.email}</Text>
              </Text>
              <Text style={styles.sidebarProfileDetailText} numberOfLines={1}>
                📍 Jurisdiction: <Text style={{ color: "#0f172a", fontWeight: "700" }}>{supervisorProfile.lga} LGA, {supervisorProfile.state}</Text>
              </Text>

              <View style={styles.sidebarRefRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sidebarRefLabel}>REFERRAL CODE</Text>
                  <Text style={styles.sidebarRefCodeText}>{supervisorProfile.referralCode}</Text>
                </View>
                <TouchableOpacity style={styles.sidebarCopyRefBtn} onPress={handleCopyReferral}>
                  <Feather name="copy" size={12} color="#ffffff" />
                  <Text style={styles.sidebarCopyRefBtnText}>COPY</Text>
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>COMMAND ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  handleNavigateToSignup();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Open Signup Screen to Register Agent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  handleCopyReferral();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <MaterialCommunityIcons name="ticket-percent" size={16} color="#059669" />
                </View>
                <Text style={styles.navItemText}>Copy Referral Code</Text>
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
                <Text style={styles.navItemText}>Broadcast to Outlets</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Exit Supervisor Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
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
  liveTrackingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  liveTrackingBadgeText: { color: "#38bdf8", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.5 },

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

  referralBannerCard: {
    backgroundColor: "#ffffff",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 12,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  referralIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  referralCardTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  referralCardSub: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  copyRefBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  copyRefBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "900", marginLeft: 4 },

  actionRowContainer: {
    flexDirection: "row",
    marginHorizontal: isLargeScreen ? 24 : 16,
    marginTop: 10,
  },
  actionBtnFull: {
    flex: 1.5,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1e40af",
    paddingVertical: 12,
    borderRadius: 10,
    marginRight: 6,
  },
  actionBtnFullText: { color: "#ffffff", fontSize: 11, fontWeight: "900", marginLeft: 6 },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#eff6ff",
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginLeft: 6,
  },
  actionBtnSecondaryText: { color: "#0284c7", fontSize: 11, fontWeight: "900", marginLeft: 6 },

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
    marginVertical: 12,
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

  agentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  agentCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  agentMainInfo: { flexDirection: "row", alignItems: "flex-start", flex: 1, marginRight: 10 },
  agentAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#ecfdf5",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#a7f3d0",
    marginTop: 2,
  },
  agentNameText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  agentLocationTag: { color: "#64748b", fontSize: 11, marginTop: 2 },
  emailTagText: { color: "#0284c7", fontSize: 11, marginTop: 1, fontWeight: "600" },
  addressTagText: { color: "#475569", fontSize: 10.5, marginTop: 2, fontStyle: "italic" },
  agentSalesText: { color: "#059669", fontSize: 14, fontWeight: "900" },
  agentSalesSub: { color: "#94a3b8", fontSize: 9.5 },
  agentQuotaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  agentQuotaText: { fontSize: 10.5, color: "#64748b" },
  agentCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  inspectBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  inspectBtnText: { color: "#1e40af", fontSize: 11, fontWeight: "800", marginLeft: 4 },
  agentCallIconBtn: {
    backgroundColor: "#eff6ff",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  performanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  perfCardTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800", marginBottom: 8 },
  perfProgressBarBg: { height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden", marginBottom: 6 },
  perfProgressBarFill: { height: 8, borderRadius: 4 },
  perfSubText: { color: "#64748b", fontSize: 11 },

  logCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logDetailsText: { color: "#0f172a", fontSize: 12, fontWeight: "600", marginBottom: 4 },
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

  // ==========================================
  // SIDEBAR STYLES (TARE DA SUPERVISOR PROFILE A SAMA)
  // ==========================================
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
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center", flex: 1 },
  sidebarSupervisorAvatar: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  sidebarBrandText: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  sidebarRoleText: { color: "#1e40af", fontSize: 10.5, fontWeight: "700" },

  sidebarProfileDetailsCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sidebarProfileDetailText: { fontSize: 11, color: "#64748b", marginVertical: 1.5 },
  sidebarRefRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  sidebarRefLabel: { fontSize: 8.5, color: "#1e40af", fontWeight: "800" },
  sidebarRefCodeText: { fontSize: 11.5, color: "#0f172a", fontWeight: "900" },
  sidebarCopyRefBtn: {
    backgroundColor: "#1e40af",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  sidebarCopyRefBtnText: { color: "#ffffff", fontSize: 9.5, fontWeight: "900", marginLeft: 4 },

  sidebarNavList: { flex: 1, marginTop: 6 },
  sidebarCategory: {
    color: "#64748b",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 12,
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
    maxWidth: 540,
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
    marginBottom: 8,
  },
  primaryActionBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
    elevation: 2,
  },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },

  // Inspector Card Styles
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
  quotaInfoBox: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  quotaInfoText: { fontSize: 12, color: "#475569", marginVertical: 2 },
  outletAddressText: { fontSize: 12, color: "#0f172a", fontWeight: "600", marginTop: 2 },
});

export default SupervisorDashboard;