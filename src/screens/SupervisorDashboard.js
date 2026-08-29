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

const SupervisorDashboard = ({ navigation }) => {
  const [supervisorProfile, setSupervisorProfile] = useState({
    name: "Field Supervisor",
    phone: "",
    email: "",
    state: "Kano",
    lga: "Ajingi",
  });

  const [agents, setAgents] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);

  // Supervisor's Official Target Quota (Daga State Manager)
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

  // Search & Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("agents");

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 340);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  // Modal 1: Agent Target Assignment Modal
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("100");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("10000");

  // Modal 2: Enroll New Retail Agent Modal
  const [enrollAgentModalVisible, setEnrollAgentModalVisible] = useState(false);
  const [newAgentName, setNewAgentName] = useState("");
  const [newAgentPhone, setNewAgentPhone] = useState("");
  const [newAgentEmail, setNewAgentEmail] = useState("");
  const [newAgentPassword, setNewAgentPassword] = useState("Password123@");
  const [newAgentAddress, setNewAgentAddress] = useState("");

  // Modal 3: Smart Auto-Split to Agents Modal
  const [autoSplitModalVisible, setAutoSplitModalVisible] = useState(false);
  const [allocatedList, setAllocatedList] = useState([]);

  // Modal 4: Broadcast Directive to Agents
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

  // KARBO DUKKAN BAYANAI NA REAL LIVE (SUPERVISOR TARGET & AGENTS TELEMETRY)
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
            setSupervisorProfile({
              name: parsedUser.name || `${parsedUser.firstName || ""} ${parsedUser.surname || ""}`.trim() || "Field Supervisor",
              phone: parsedUser.phone || "",
              email: parsedUser.email || "",
              state: parsedUser.state || "Kano",
              lga: parsedUser.lga || "Ajingi",
            });
          } catch (e) {}
        }

        const headers = { Authorization: `Bearer ${token}` };

        const [supDashRes, targetRes, agentsRes, logsRes] = await Promise.all([
          axios.get(`${BASE_URL}/supervisor/dashboard`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/supervisor/my-target`, { headers, timeout: 15000 }).catch(() => ({ data: {} })),
          axios.get(`${BASE_URL}/supervisor/agents`, { headers, timeout: 15000 }).catch(() => ({ data: { agents: [] } })),
          axios.get(`${BASE_URL}/supervisor/activity-logs`, { headers, timeout: 15000 }).catch(() => ({ data: { logs: [] } })),
        ]);

        const dashData = supDashRes.data?.data || supDashRes.data || {};
        const fetchedAgents = agentsRes.data?.agents || dashData.agents || [];
        const fetchedLogs = logsRes.data?.logs || dashData.activityLogs || [];

        // Kwaso Target din da State Manager ya tura wa wannan Supervisor
        const fetchedTarget =
          targetRes.data?.targets ||
          targetRes.data?.data ||
          dashData.myTarget ||
          dashData.targets ||
          parsedUser.targets ||
          {};

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

  // SMART AUTO-SPLIT TARGET TO RETAIL AGENTS
  const handleOpenSmartAutoSplit = () => {
    if (agents.length === 0) {
      return showAlert(
        "No Agents Registered",
        "You do not have any retail agents registered in your LGA to allocate quota to. Click '+ Enroll Retail Agent' to create accounts."
      );
    }

    const count = agents.length;
    const autoDataPerAgent = Math.floor((myTarget.dataGoal || 0) / count);
    const autoAirtimePerAgent = Math.floor((myTarget.airtimeGoal || 0) / count);

    const initialList = agents.map((item) => ({
      id: item._id || item.id,
      name: item.name || `${item.firstName || ""} ${item.surname || ""}` || "Agent",
      phone: item.phone || "N/A",
      email: item.email || `${item.phone}@ayaxdata.online`,
      lga: item.lga || supervisorProfile.lga,
      dataGoal: String(autoDataPerAgent),
      airtimeGoal: String(autoAirtimePerAgent),
    }));

    setAllocatedList(initialList);
    setAutoSplitModalVisible(true);
  };

  const handleUpdateItemTarget = (id, field, value) => {
    setAllocatedList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Tura sakamakon rabon Quota ga Agents
  const handleDeployAllocatedTargets = async () => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      for (const item of allocatedList) {
        await axios.post(
          `${BASE_URL}/supervisor/assign-agent-target`,
          {
            agentId: item.id,
            dataGoal: Number(item.dataGoal) || 0,
            airtimeGoal: Number(item.airtimeGoal) || 0,
            month: myTarget.currentMonth,
          },
          { headers }
        );
      }

      showAlert(
        "Agent Targets Deployed 🎯",
        `Quotas have been successfully dispatched to ${allocatedList.length} retail agents in ${supervisorProfile.lga} LGA.`
      );
      setAutoSplitModalVisible(false);
      fetchDashboardData();
    } catch (err) {
      showAlert("Deployment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Saita Target ga Agent guda ɗaya
  const handleSetSingleAgentTarget = async () => {
    if (!selectedAgent) return;
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const headers = { Authorization: `Bearer ${token}` };

      await axios.post(
        `${BASE_URL}/supervisor/assign-agent-target`,
        {
          agentId: selectedAgent._id || selectedAgent.id,
          dataGoal: Number(targetDataGoal) || 0,
          airtimeGoal: Number(targetAirtimeGoal) || 0,
          month: myTarget.currentMonth,
        },
        { headers }
      );

      showAlert(
        "Agent Quota Set 🎯",
        `Target for ${selectedAgent.name} updated: ${targetDataGoal}GB Data & ₦${Number(targetAirtimeGoal).toLocaleString()} Airtime.`
      );
      setTargetModalVisible(false);
      fetchDashboardData();
    } catch (err) {
      showAlert("Target Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // ENROLL NEW RETAIL AGENT (PERSISTS DIRECTLY TO DATABASE)
  const handleEnrollAgent = async () => {
    if (!newAgentName.trim() || !newAgentPhone.trim()) {
      return showAlert("Validation Error", "Agent Full Name and Phone Number are required.");
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/supervisor/create-agent`,
        {
          name: newAgentName.trim(),
          phone: newAgentPhone.trim(),
          email: newAgentEmail.trim() ? newAgentEmail.trim().toLowerCase() : undefined,
          password: newAgentPassword.trim() || "Password123@",
          address: newAgentAddress.trim() || undefined,
          state: supervisorProfile.state,
          lga: supervisorProfile.lga,
          role: "agent",
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert(
          "Retail Agent Enrolled 🎉",
          `${newAgentName} has been officially registered under your supervision in ${supervisorProfile.lga} LGA.`
        );
        setEnrollAgentModalVisible(false);
        setNewAgentName("");
        setNewAgentPhone("");
        setNewAgentEmail("");
        setNewAgentPassword("Password123@");
        setNewAgentAddress("");
        fetchDashboardData();
      }
    } catch (err) {
      showAlert("Enrollment Error", err.response?.data?.message || err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Broadcast Directive to Agents
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
        <Text style={styles.loaderTitle}>{supervisorProfile.lga.toUpperCase()} LGA FIELD COMMAND</Text>
        <Text style={styles.loaderText}>Connecting to Grassroot Network Matrix...</Text>
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
          {/* QUICK TARGET SPLIT ICON */}
          <TouchableOpacity
            style={[styles.avatarBtn, styles.targetQuickIconBtn, { marginRight: 8 }]}
            onPress={handleOpenSmartAutoSplit}
            activeOpacity={0.7}
          >
            <FontAwesome5 name="bullseye" size={16} color="#fbbf24" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => setEnrollAgentModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#38bdf8" />
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
            Quota Matrix
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
          
          {/* SECTION 1: SUPERVISOR'S OFFICIAL TARGET CARD (DAGA STATE MANAGER) */}
          <View style={styles.executiveTargetCardDark}>
            <View style={styles.execHeaderRowDark}>
              <View>
                <Text style={styles.execBadgeTextDark}>OFFICIAL STATE MANAGER LGA QUOTA ALLOCATION</Text>
                <Text style={styles.execTitleTextDark}>{myTarget.currentMonth.toUpperCase()} TARGET MATRIX</Text>
              </View>
              <TouchableOpacity
                style={styles.autoSplitBadgeBtn}
                onPress={handleOpenSmartAutoSplit}
                activeOpacity={0.8}
              >
                <MaterialCommunityIcons name="calculator-variant" size={14} color="#ffffff" />
                <Text style={styles.autoSplitBadgeBtnText}>AUTO-SPLIT TO AGENTS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.execMetricsGrid}>
              {/* Data Target */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#38bdf8" }]}>LGA DATA QUOTA (GB)</Text>
                <Text style={styles.execMetricValueDark}>
                  {myTarget.dataSold} / {myTarget.dataGoal} GB
                </Text>
                <View style={styles.execProgressBarBgDark}>
                  <View style={[styles.execProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.execPercentSubDark}>{dataProgress}% Dispatched</Text>
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
                <Text style={styles.execPercentSubDark}>Retail Agents Active</Text>
              </View>

              {/* Team Float */}
              <View style={styles.execMetricBoxDark}>
                <Text style={[styles.execMetricLabelDark, { color: "#a78bfa" }]}>TOTAL TEAM FLOAT</Text>
                <Text style={styles.execMetricValueDark}>
                  ₦{Number(stats.totalTeamFloat).toLocaleString()}
                </Text>
                <Text style={styles.execPercentSubDark}>Active Working Balance</Text>
              </View>
            </View>
          </View>

          {/* SECTION 2: SUMMARY ACTION BANNER */}
          <View style={styles.targetCommandBanner}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={styles.targetBannerIconWrap}>
                <FontAwesome5 name="store" size={18} color="#1e40af" />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.targetBannerTitle}>Grassroot Retail Network Lead</Text>
                <Text style={styles.targetBannerSub}>
                  Coordinator: {supervisorProfile.name} • 📞 {supervisorProfile.phone} • ✉️ {supervisorProfile.email}
                </Text>
              </View>
            </View>

            <View style={styles.targetBannerBtnRow}>
              <TouchableOpacity
                style={styles.bannerActionBtnPrimary}
                onPress={() => setEnrollAgentModalVisible(true)}
              >
                <Ionicons name="person-add" size={13} color="#ffffff" />
                <Text style={styles.bannerActionBtnTextPrimary}>ENROLL RETAIL AGENT</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bannerActionBtnSecondary}
                onPress={handleOpenSmartAutoSplit}
              >
                <MaterialCommunityIcons name="calculator-variant" size={15} color="#059669" />
                <Text style={styles.bannerActionBtnTextSecondary}>AUTO-SPLIT QUOTA</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.bannerActionBtnTertiary}
                onPress={() => setNotifModalVisible(true)}
              >
                <Ionicons name="megaphone-outline" size={14} color="#0284c7" />
                <Text style={styles.bannerActionBtnTextTertiary}>DISPATCH DIRECTIVE</Text>
              </TouchableOpacity>
            </View>
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
                  ACTIVE RETAIL OUTLETS DIRECTORY ({filteredAgents.length})
                </Text>
                <TouchableOpacity
                  style={styles.actionPillBtn}
                  onPress={() => setEnrollAgentModalVisible(true)}
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

                      {/* Quota Breakdown */}
                      <View style={styles.agentQuotaRow}>
                        <Text style={styles.agentQuotaText}>
                          Data Quota: <Text style={{ color: "#1e40af", fontWeight: "bold" }}>{ag.targets?.dataGoal || ag.dataGoal || 0} GB</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Airtime Quota: <Text style={{ color: "#d97706", fontWeight: "bold" }}>₦{Number(ag.targets?.airtimeGoal || ag.airtimeGoal || 0).toLocaleString()}</Text>
                        </Text>
                        <Text style={styles.agentQuotaText}>
                          Volume Sold: <Text style={{ color: "#059669", fontWeight: "bold" }}>{ag.dataVolumeSold || ag.dataSold || 0} GB</Text>
                        </Text>
                      </View>

                      {/* Action Row */}
                      <View style={styles.agentCardBottom}>
                        <TouchableOpacity
                          style={styles.agentActionMiniBtn}
                          onPress={() => {
                            setSelectedAgent(ag);
                            setTargetDataGoal(String(ag.targets?.dataGoal || ag.dataGoal || 100));
                            setTargetAirtimeGoal(String(ag.targets?.airtimeGoal || ag.airtimeGoal || 10000));
                            setTargetModalVisible(true);
                          }}
                        >
                          <FontAwesome5 name="edit" size={11} color="#1e40af" />
                          <Text style={[styles.agentActionMiniText, { color: "#1e40af" }]}>Set Target</Text>
                        </TouchableOpacity>

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

          {/* TAB 2: QUOTA PERFORMANCE MATRIX */}
          {activeTab === "performance" && (
            <View style={styles.tabContentWrapper}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderLabel}>LGA QUOTA ALLOCATION MATRIX</Text>
              </View>

              <View style={styles.performanceCard}>
                <Text style={styles.perfCardTitle}>Data Quota Performance</Text>
                <View style={styles.perfProgressBarBg}>
                  <View style={[styles.perfProgressBarFill, { width: `${dataProgress}%`, backgroundColor: "#38bdf8" }]} />
                </View>
                <Text style={styles.perfSubText}>
                  {myTarget.dataSold} GB dispatched out of {myTarget.dataGoal} GB assigned target ({dataProgress}%).
                </Text>
              </View>

              <View style={styles.performanceCard}>
                <Text style={styles.perfCardTitle}>Airtime Sales Performance</Text>
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
                    <Text style={styles.logDetailsText}>{log.details || log.action || "Agent quota updated."}</Text>
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
          MODAL 1: SMART AUTO-SPLIT TO RETAIL AGENTS
         ========================================================================= */}
      <Modal visible={autoSplitModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { width: isLargeScreen ? "75%" : "96%", maxHeight: "92%" }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Auto-Split Quota to Retail Agents</Text>
                <Text style={styles.modalCardSubtitle}>
                  LGA Pool: {myTarget.dataGoal} GB Data & ₦{Number(myTarget.airtimeGoal).toLocaleString()} Airtime ({allocatedList.length} Outlets)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAutoSplitModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.splitInstructionBanner}>
                <Ionicons name="information-circle" size={18} color="#1e40af" />
                <Text style={styles.splitInstructionText}>
                  System has calculated equal quota distribution. You can increase (+) or reduce (-) individual targets before deploying.
                </Text>
              </View>

              {/* TABLE LIST OF AGENTS */}
              {allocatedList.map((item, index) => (
                <View key={item.id} style={styles.editableQuotaCard}>
                  <View style={styles.editableQuotaHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editableQuotaName}>
                        {index + 1}. {item.name}
                      </Text>
                      <Text style={styles.editableQuotaLga}>
                        📞 {item.phone} • ✉️ {item.email}
                      </Text>
                    </View>
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
                    CONFIRM & DEPLOY TARGETS TO AGENTS
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 2: SET SINGLE AGENT TARGET
         ========================================================================= */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Set Quota: {selectedAgent?.name}</Text>
                <Text style={styles.modalCardSubtitle}>📞 {selectedAgent?.phone} • ✉️ {selectedAgent?.email || "N/A"}</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DATA VOLUME GOAL (GB)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              placeholder="e.g. 100"
              value={targetDataGoal}
              onChangeText={setTargetDataGoal}
            />

            <Text style={styles.formFieldLabel}>AIRTIME SALES GOAL (₦)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              placeholder="e.g. 10000"
              value={targetAirtimeGoal}
              onChangeText={setTargetAirtimeGoal}
            />

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handleSetSingleAgentTarget}
              disabled={actionLoading}
            >
              {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionBtnText}>SAVE AGENT QUOTA</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* =========================================================================
          MODAL 3: ENROLL NEW RETAIL AGENT
         ========================================================================= */}
      <Modal visible={enrollAgentModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Enroll Retail Agent</Text>
                <Text style={styles.modalCardSubtitle}>Create grassroots agent account in {supervisorProfile.lga} LGA</Text>
              </View>
              <TouchableOpacity onPress={() => setEnrollAgentModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.formFieldLabel}>AGENT FULL NAME</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Mustapha Ibrahim"
                placeholderTextColor="#94a3b8"
                value={newAgentName}
                onChangeText={setNewAgentName}
              />

              <Text style={styles.formFieldLabel}>PHONE NUMBER (LOGIN USERNAME)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. 08012345678"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={newAgentPhone}
                onChangeText={setNewAgentPhone}
              />

              <Text style={styles.formFieldLabel}>EMAIL ADDRESS (FOR NOTIFICATIONS & LOGIN)</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. agent@ayaxdata.online"
                placeholderTextColor="#94a3b8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={newAgentEmail}
                onChangeText={setNewAgentEmail}
              />

              <Text style={styles.formFieldLabel}>SHOP / OUTLET ADDRESS</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Main Market, Shop No. 12, Ajingi"
                placeholderTextColor="#94a3b8"
                value={newAgentAddress}
                onChangeText={setNewAgentAddress}
              />

              <Text style={styles.formFieldLabel}>LOGIN PASSWORD</Text>
              <TextInput
                style={styles.textInputStyle}
                placeholder="e.g. Password123@"
                placeholderTextColor="#94a3b8"
                value={newAgentPassword}
                onChangeText={setNewAgentPassword}
              />

              <TouchableOpacity
                style={styles.primaryActionBtn}
                onPress={handleEnrollAgent}
                disabled={actionLoading}
              >
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryActionBtnText}>CREATE RETAIL OUTLET</Text>}
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
                <MaterialCommunityIcons name="shield-check" size={28} color="#1e40af" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>{supervisorProfile.lga} LGA</Text>
                  <Text style={styles.sidebarRoleText}>Field Operations Command</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>COMMAND ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  handleOpenSmartAutoSplit();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <FontAwesome5 name="bullseye" size={15} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Auto-Split Quota to Agents</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  setEnrollAgentModalVisible(true);
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#059669" />
                </View>
                <Text style={styles.navItemText}>Enroll Retail Agent</Text>
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
  agentActionMiniBtn: { flexDirection: "row", alignItems: "center", paddingHorizontal: 6, paddingVertical: 4 },
  agentActionMiniText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
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
});

export default SupervisorDashboard;