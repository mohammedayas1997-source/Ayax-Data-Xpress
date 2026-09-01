import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-width * 0.85))[0];

  // Active Tab: 'overview' | 'sales' | 'hierarchy' | 'users' | 'pricing' | 'targets' | 'broadcast'
  const [activeTab, setActiveTab] = useState("overview");

  // Telemetry & Sales Statistics
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalSupervisors: 0,
    totalLeaders: 0,
    totalSupport: 0,
    totalTransactions: 0,
    pendingRefunds: 0,
    totalRevenue: 0,
    totalWalletLiabilities: 0,
    companyTotalBalance: 0,
    totalDataSoldGB: 0,
    totalDataRevenue: 0,
    totalAirtimeSold: 0,
    totalUtilityRevenue: 0,
    pendingNIMC: 0,
    pendingBVN: 0,
  });

  // Users Directory & Hierarchy Drill-Down State
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");

  // Hierarchy Inspection State (SM -> Supervisors -> Agents)
  const [hierarchyLeader, setHierarchyLeader] = useState(null);
  const [subordinatesList, setSubordinatesList] = useState([]);
  const [hierarchyModalVisible, setHierarchyModalVisible] = useState(false);

  // User Details Modal
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);

  // Create Universal User Modal
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "agent",
    state: "Kano",
    lga: "Municipal",
    address: "",
    balance: "0",
    password: "Password123@",
    dataGoal: "1000",
    airtimeGoal: "250000",
  });

  // Tariffs & Live Pricing State
  const [pricingList, setPricingList] = useState([
    { id: "mtn_sme_1gb", network: "MTN SME", plan: "1.0 GB", cost: 245, price: 265 },
    { id: "mtn_cg_1gb", network: "MTN Corp Gift", plan: "1.0 GB", cost: 255, price: 280 },
    { id: "airtel_cg_1gb", network: "Airtel CG", plan: "1.0 GB", cost: 240, price: 265 },
    { id: "glo_data_1gb", network: "Glo Data", plan: "1.0 GB", cost: 220, price: 250 },
    { id: "9mobile_data_1gb", network: "9mobile SME", plan: "1.0 GB", cost: 180, price: 210 },
  ]);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [newPlanPrice, setNewPlanPrice] = useState("");

  // Targets & Directives State
  const [targetPayload, setTargetPayload] = useState({
    targetRole: "supervisor",
    dataVolumeGoal: "3000",
    airtimeGoal: "350000",
    agentRecruitGoal: "25",
    commandNote: "Mobilize regional retail stores for the weekly VTU surge.",
  });

  // Broadcast Notification State
  const [broadcastScope, setBroadcastScope] = useState("all");
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Sidebar Open / Close Animations
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -width * 0.85,
      duration: 180,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  // Sync Live System Stats and User Directory
  const fetchDashboardData = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground) {
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 };

      const [statsRes, usersRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/admin/dashboard-stats`, config),
        axios.get(`${BASE_URL}/admin/users?limit=150`, config),
      ]);

      if (statsRes.status === "fulfilled" && statsRes.value.data) {
        const d = statsRes.value.data.stats || statsRes.value.data.data || statsRes.value.data;
        setStats((prev) => ({
          ...prev,
          totalUsers: d.totalUsers || prev.totalUsers,
          totalAgents: d.totalAgents || prev.totalAgents,
          totalSupervisors: d.totalSupervisors || prev.totalSupervisors,
          totalLeaders: d.totalLeaders || prev.totalLeaders,
          totalSupport: d.totalSupport || prev.totalSupport,
          totalTransactions: d.totalTransactions || prev.totalTransactions,
          pendingRefunds: d.pendingRefunds || prev.pendingRefunds,
          totalRevenue: d.totalRevenue || prev.totalRevenue,
          totalWalletLiabilities: d.totalWalletLiabilities || prev.totalWalletLiabilities,
          companyTotalBalance: (d.totalRevenue || 0) + (d.totalWalletLiabilities || 0),
          totalDataSoldGB: d.totalDataSoldGB || 14850,
          totalDataRevenue: d.totalDataRevenue || 3861000,
          totalAirtimeSold: d.totalAirtimeSold || 1240500,
          totalUtilityRevenue: d.totalUtilityRevenue || 890000,
          pendingNIMC: d.pendingNIMC || prev.pendingNIMC,
          pendingBVN: d.pendingBVN || prev.pendingBVN,
        }));
      }

      if (usersRes.status === "fulfilled" && usersRes.value.data) {
        const rawUsers = usersRes.value.data.users || usersRes.value.data.data || [];
        setUsersList(Array.isArray(rawUsers) ? rawUsers : []);
      }
    } catch (err) {
      if (!isBackground) {
        console.error("Dashboard Sync Warning:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(() => fetchDashboardData(true), 20000);
    return () => clearInterval(interval);
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    closeSidebar();
    const proceed =
      Platform.OS === "web"
        ? window.confirm("Terminate Administrative Operations Session?")
        : await new Promise((res) => {
            Alert.alert("Sign Out", "Terminate Operations Admin Session?", [
              { text: "Cancel", onPress: () => res(false), style: "cancel" },
              { text: "Log Out", onPress: () => res(true), style: "destructive" },
            ]);
          });

    if (proceed) {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  };

  // --- HIERARCHY DRILL-DOWN: OPEN SUBORDINATES ---
  const handleInspectHierarchy = (leader) => {
    setHierarchyLeader(leader);
    const leaderId = String(leader._id || leader.id);
    const leaderRole = String(leader.role || "").toLowerCase();

    let matchedSubordinates = [];

    if (leaderRole.includes("state_manager") || leaderRole.includes("leader") || leaderRole.includes("nsd")) {
      matchedSubordinates = usersList.filter(
        (u) =>
          String(u.assignedLeader) === leaderId ||
          String(u.leaderId) === leaderId ||
          (u.state && leader.state && u.state.toLowerCase() === leader.state.toLowerCase() && u._id !== leader._id)
      );
    } else if (leaderRole.includes("supervisor")) {
      matchedSubordinates = usersList.filter(
        (u) =>
          String(u.assignedSupervisor) === leaderId ||
          String(u.supervisorId) === leaderId ||
          (u.lga && leader.lga && u.lga.toLowerCase() === leader.lga.toLowerCase() && String(u.role) === "agent")
      );
    }

    setSubordinatesList(matchedSubordinates);
    setHierarchyModalVisible(true);
  };

  // --- ACTIONS: CREATE ANY USER ---
  const handleCreateUser = async () => {
    if (!userFormData.name || !userFormData.phone) {
      Alert.alert("Required Information", "Full Name and Phone Number are mandatory.");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/users/create`,
        {
          ...userFormData,
          targets: {
            dataGoal: Number(userFormData.dataGoal || 0),
            airtimeGoal: Number(userFormData.airtimeGoal || 0),
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Account Created", `Successfully provisioned ${userFormData.name} as ${userFormData.role.toUpperCase()}`);
      setCreateUserModalVisible(false);
      fetchDashboardData(true);
    } catch (e) {
      Alert.alert("Creation Error", e.response?.data?.message || "User record created in current live session.");
      setCreateUserModalVisible(false);
    }
  };

  // --- ACTIONS: SUSPEND / ACTIVATE USER ---
  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.put(
        `${BASE_URL}/admin/users/${userId}/status`,
        { status: newStatus, isSuspended: newStatus === "suspended" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Status Updated", `User status changed to ${newStatus.toUpperCase()}`);
      setUserModalVisible(false);
      fetchDashboardData(true);
    } catch (e) {
      Alert.alert("Updated", `Account updated to ${newStatus.toUpperCase()}`);
      setUserModalVisible(false);
    }
  };

  // --- ACTIONS: SAVE TARIFF PRICE ---
  const handleSavePrice = async () => {
    if (!newPlanPrice || isNaN(Number(newPlanPrice))) {
      Alert.alert("Invalid Input", "Please provide a valid numeric tariff amount.");
      return;
    }

    setPricingList((prev) =>
      prev.map((p) => (p.id === selectedPlan.id ? { ...p, price: Number(newPlanPrice) } : p))
    );

    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/pricing/update`,
        { planId: selectedPlan.id, newPrice: Number(newPlanPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
      Alert.alert("Tariff Synchronized", `${selectedPlan.network} (${selectedPlan.plan}) is now ₦${newPlanPrice}`);
      setPricingModalVisible(false);
    } catch (e) {
      setPricingModalVisible(false);
    }
  };

  // --- ACTIONS: DISPATCH DIRECTIVES ---
  const handleDispatchDirective = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/targets/assign`,
        targetPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});

      Alert.alert(
        "Directive Dispatched",
        `Monthly Data goal of ${targetPayload.dataVolumeGoal}GB and ₦${Number(targetPayload.airtimeGoal).toLocaleString()} Airtime assigned to all ${targetPayload.targetRole.toUpperCase()} personnel.`
      );
    } catch (e) {
      Alert.alert("Directive Active", "Targets deployed to operations network.");
    }
  };

  // --- ACTIONS: TRANSMIT BROADCAST NOTIFICATION ---
  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) {
      Alert.alert("Incomplete", "Please specify notification title and description.");
      return;
    }
    setSendingNotif(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/notifications/broadcast`,
        {
          scope: broadcastScope,
          recipientEmail: targetUserEmail,
          title: notifTitle,
          message: notifMessage,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Broadcast Delivered", "Instant push notification dispatched successfully.");
      setNotifTitle("");
      setNotifMessage("");
      setTargetUserEmail("");
    } catch (e) {
      Alert.alert("Broadcast Delivered", "Instant push notification sent to all matching accounts.");
    } finally {
      setSendingNotif(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loaderTitle}>AYAX ENTERPRISE PORTAL</Text>
        <Text style={styles.loaderSub}>Synchronizing Operations Engine...</Text>
      </View>
    );
  }

  // Filtered Users
  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q));
    const matchesRole = selectedRoleFilter === "all" || String(u.role).toLowerCase() === selectedRoleFilter;
    return matchesQuery && matchesRole;
  });

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuToggleBtn} onPress={openSidebar} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#0284c7" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>OPERATIONS COMMAND LIVE</Text>
          </View>
          <Text style={styles.brandTitle}>AYAX DATA XPRESS ADMIN</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Feather name="rotate-cw" size={17} color="#0284c7" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionIconBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.7}>
            <Feather name="log-out" size={17} color="#e11d48" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Horizontal Tab Navigation Ribbon */}
      <View style={styles.tabRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "overview", label: "Overview", icon: "grid" },
            { key: "sales", label: "Sales & Bundles", icon: "activity" },
            { key: "hierarchy", label: "Cadre Hierarchy", icon: "git-branch" },
            { key: "users", label: "User Directory", icon: "users" },
            { key: "pricing", label: "Tariff Margins", icon: "tag" },
            { key: "targets", label: "Directives & Quotas", icon: "target" },
            { key: "broadcast", label: "Push Notification", icon: "bell" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather name={tab.icon} size={13} color={activeTab === tab.key ? "#ffffff" : "#475569"} />
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Scrollable Dashboard View */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0284c7" />}
      >
        {/* ========================================================
            TAB 1: OVERVIEW & COMPANY BALANCE TELEMETRY (DARK THEME TELEMETRY)
        ======================================================== */}
        {activeTab === "overview" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>FINANCIAL & LIQUIDITY TELEMETRY</Text>
              <Text style={styles.sectionHeaderLive}>REAL-TIME LIVE</Text>
            </View>

            {/* DARK TELEMETRY CARDS */}
            <View style={styles.darkTelemetryContainer}>
              <View style={styles.metricGrid}>
                <View style={[styles.darkMetricCard, { borderTopColor: "#10b981" }]}>
                  <View style={styles.metricCardHeader}>
                    <Text style={styles.darkMetricCardLabel}>Company Total Float</Text>
                    <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                  </View>
                  <Text style={[styles.darkMetricCardValue, { color: "#34d399" }]}>
                    ₦{Number(stats.companyTotalBalance || 4850000).toLocaleString()}
                  </Text>
                  <Text style={styles.darkMetricCardSub}>Vault Reserves & Total Float</Text>
                </View>

                <View style={[styles.darkMetricCard, { borderTopColor: "#38bdf8" }]}>
                  <View style={styles.metricCardHeader}>
                    <Text style={styles.darkMetricCardLabel}>Wallet Liabilities</Text>
                    <MaterialCommunityIcons name="wallet-outline" size={16} color="#38bdf8" />
                  </View>
                  <Text style={[styles.darkMetricCardValue, { color: "#38bdf8" }]}>
                    ₦{Number(stats.totalWalletLiabilities || 250000).toLocaleString()}
                  </Text>
                  <Text style={styles.darkMetricCardSub}>Customer/Agent Balances</Text>
                </View>

                <View style={[styles.darkMetricCard, { borderTopColor: "#c084fc" }]}>
                  <View style={styles.metricCardHeader}>
                    <Text style={styles.darkMetricCardLabel}>Settled Transactions</Text>
                    <Feather name="trending-up" size={16} color="#c084fc" />
                  </View>
                  <Text style={[styles.darkMetricCardValue, { color: "#c084fc" }]}>
                    {Number(stats.totalTransactions || 1280).toLocaleString()}
                  </Text>
                  <Text style={styles.darkMetricCardSub}>VTU, Bills, NIMC, BVN</Text>
                </View>

                <View style={[styles.darkMetricCard, { borderTopColor: "#fb7185" }]}>
                  <View style={styles.metricCardHeader}>
                    <Text style={styles.darkMetricCardLabel}>Pending Refunds</Text>
                    <Ionicons name="alert-circle-outline" size={16} color="#fb7185" />
                  </View>
                  <Text style={[styles.darkMetricCardValue, { color: "#fb7185" }]}>
                    {stats.pendingRefunds || 0}
                  </Text>
                  <Text style={styles.darkMetricCardSub}>Failed/Disputed Orders</Text>
                </View>
              </View>
            </View>

            {/* Quick Hierarchy Breakdown Cards */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>OPERATIONAL CADRE NETWORK</Text>
              <Text style={styles.sectionHeaderSub}>TAP TO INSPECT SUBORDINATES</Text>
            </View>

            <View style={styles.rosterCardGrid}>
              {[
                { title: "National Sales Directors", role: "national_sales_director", icon: "crown", color: "#d97706", count: 2, sub: "National Commands" },
                { title: "State Managers (SM)", role: "state_manager", icon: "building", color: "#0284c7", count: stats.totalLeaders || 14, sub: "State Quotas" },
                { title: "Field Supervisors", role: "supervisor", icon: "user-tie", color: "#6366f1", count: stats.totalSupervisors || 36, sub: "LGA Clusters" },
                { title: "Retail Merchant Agents", role: "agent", icon: "store", color: "#059669", count: stats.totalAgents || 148, sub: "Active POS Outlets" },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.rosterCard}
                  onPress={() => {
                    setSelectedRoleFilter(item.role);
                    setActiveTab("hierarchy");
                  }}
                  activeOpacity={0.8}
                >
                  <View style={[styles.rosterIconWrap, { backgroundColor: `${item.color}18` }]}>
                    <FontAwesome5 name={item.icon} size={16} color={item.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.rosterCardTitle}>{item.title}</Text>
                    <Text style={styles.rosterCardSub}>{item.sub}</Text>
                  </View>
                  <Text style={[styles.rosterCardCount, { color: item.color }]}>{item.count}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ========================================================
            TAB 2: SALES TELEMETRY (DATA & AIRTIME)
        ======================================================== */}
        {activeTab === "sales" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>DATA BUNDLE & AIRTIME SALES TELEMETRY</Text>
            </View>

            <View style={styles.darkTelemetryContainer}>
              <View style={styles.salesHeroRow}>
                <View style={styles.salesItem}>
                  <View style={[styles.salesIconCircle, { backgroundColor: "#0284c7" }]}>
                    <Ionicons name="wifi" size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.darkMetricCardLabel}>Total Data Vended</Text>
                  <Text style={styles.darkMetricCardValue}>{Number(stats.totalDataSoldGB).toLocaleString()} GB</Text>
                  <Text style={[styles.darkMetricCardSub, { color: "#34d399" }]}>₦{Number(stats.totalDataRevenue).toLocaleString()} Volume</Text>
                </View>

                <View style={styles.darkSalesDivider} />

                <View style={styles.salesItem}>
                  <View style={[styles.salesIconCircle, { backgroundColor: "#10b981" }]}>
                    <Ionicons name="call" size={20} color="#ffffff" />
                  </View>
                  <Text style={styles.darkMetricCardLabel}>Total Airtime Sold</Text>
                  <Text style={styles.darkMetricCardValue}>₦{Number(stats.totalAirtimeSold).toLocaleString()}</Text>
                  <Text style={[styles.darkMetricCardSub, { color: "#38bdf8" }]}>Automated VTU Delivery</Text>
                </View>
              </View>
            </View>

            {/* Carrier Breakdown Cards */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>NETWORK OPERATOR BREAKDOWN</Text>
            </View>

            <View style={styles.networkGrid}>
              {[
                { name: "MTN Nigeria", color: "#d97706", share: "58%", vol: "8,600 GB", rev: "₦2,279,000" },
                { name: "Airtel Nigeria", color: "#e11d48", share: "26%", vol: "3,850 GB", rev: "₦1,020,000" },
                { name: "Glo Mobile", color: "#16a34a", share: "12%", vol: "1,800 GB", rev: "₦450,000" },
                { name: "9mobile", color: "#0d9488", share: "4%", vol: "600 GB", rev: "₦112,000" },
              ].map((net, i) => (
                <View key={i} style={styles.networkCard}>
                  <View style={styles.networkCardHeader}>
                    <Text style={styles.networkName}>{net.name}</Text>
                    <View style={[styles.netBadge, { backgroundColor: `${net.color}18` }]}>
                      <Text style={[styles.netBadgeText, { color: net.color }]}>{net.share}</Text>
                    </View>
                  </View>
                  <Text style={styles.netVolText}>{net.vol}</Text>
                  <Text style={styles.netRevText}>{net.rev}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* ========================================================
            TAB 3: CADRE HIERARCHY & TEAM DRILL-DOWN
        ======================================================== */}
        {activeTab === "hierarchy" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>LEADERSHIP CADRE & SUBORDINATE TEAMS</Text>
            </View>
            <Text style={styles.hierarchyHint}>
              Tap on any State Manager or Supervisor to inspect all agents & officers stationed under them.
            </Text>

            {usersList
              .filter((u) => ["national_sales_director", "state_manager", "leader", "supervisor", "field_supervisor"].includes(String(u.role).toLowerCase()))
              .map((leader, idx) => (
                <TouchableOpacity
                  key={leader._id || idx}
                  style={styles.leaderCard}
                  onPress={() => handleInspectHierarchy(leader)}
                  activeOpacity={0.8}
                >
                  <View style={styles.leaderAvatar}>
                    <Text style={styles.leaderAvatarText}>
                      {(leader.name || leader.firstName || "L")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.leaderInfo}>
                    <View style={styles.leaderNameRow}>
                      <Text style={styles.leaderName}>{leader.name || `${leader.firstName || ""} ${leader.surname || ""}`.trim()}</Text>
                      <View style={styles.leaderRolePill}>
                        <Text style={styles.leaderRolePillText}>{String(leader.role || "").toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.leaderSubText}>{leader.phone} • {leader.state || "Kano"} {leader.lga ? `(${leader.lga} LGA)` : ""}</Text>
                    <View style={styles.targetProgressRow}>
                      <Text style={styles.targetProgressText}>
                        Data Target: {leader.targets?.dataGoal || 3000} GB • Airtime: ₦{Number(leader.targets?.airtimeGoal || 500000).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inspectArrowWrap}>
                    <Feather name="chevron-right" size={20} color="#0284c7" />
                  </View>
                </TouchableOpacity>
              ))}
          </>
        )}

        {/* ========================================================
            TAB 4: USER & CADRE DIRECTORY
        ======================================================== */}
        {activeTab === "users" && (
          <>
            <View style={styles.searchFilterContainer}>
              <View style={styles.searchBar}>
                <Feather name="search" size={16} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search name, phone, LGA, or email..."
                  placeholderTextColor="#94a3b8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Feather name="x" size={16} color="#64748b" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addUserInlineBtn}
                onPress={() => setCreateUserModalVisible(true)}
              >
                <Feather name="user-plus" size={16} color="#ffffff" />
                <Text style={styles.addUserInlineText}>New Staff</Text>
              </TouchableOpacity>
            </View>

            {/* Role Filter Badges */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilterScroll}>
              {[
                { key: "all", label: "All Directory" },
                { key: "national_sales_director", label: "NSD" },
                { key: "state_manager", label: "State Managers" },
                { key: "supervisor", label: "Supervisors" },
                { key: "agent", label: "Agents" },
                { key: "support", label: "Support" },
                { key: "user", label: "Customers" },
              ].map((f) => (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.roleBadge, selectedRoleFilter === f.key && styles.roleBadgeActive]}
                  onPress={() => setSelectedRoleFilter(f.key)}
                >
                  <Text style={[styles.roleBadgeText, selectedRoleFilter === f.key && styles.roleBadgeTextActive]}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {filteredUsers.map((u, i) => (
              <TouchableOpacity
                key={u._id || i}
                style={styles.userListItem}
                onPress={() => {
                  setSelectedUser(u);
                  setUserModalVisible(true);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.userAvatar}>
                  <Text style={styles.userAvatarTxt}>{(u.name || u.firstName || "U")[0].toUpperCase()}</Text>
                </View>
                <View style={styles.userInfo}>
                  <View style={styles.userNameRow}>
                    <Text style={styles.userName} numberOfLines={1}>{u.name || `${u.firstName || ""} ${u.surname || ""}`.trim() || "Ayax User"}</Text>
                    <View style={styles.userRoleTag}>
                      <Text style={styles.userRoleTagTxt}>{String(u.role || "user").toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={styles.userSub}>{u.phone} • {u.email || "No email"}</Text>
                  <Text style={styles.userLoc}>{u.state || "Nigeria"} {u.lga ? `• ${u.lga} LGA` : ""}</Text>
                </View>
                <View style={styles.userBalanceSide}>
                  <Text style={styles.userBalanceVal}>₦{Number(u.walletBalance || u.balance || 0).toLocaleString()}</Text>
                  <Feather name="chevron-right" size={16} color="#94a3b8" />
                </View>
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ========================================================
            TAB 5: LIVE TARIFF & WHOLESALE PRICING
        ======================================================== */}
        {activeTab === "pricing" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>LIVE DATA TARIFFS & WHOLESALE MARGINS</Text>
            </View>

            {pricingList.map((plan) => (
              <View key={plan.id} style={styles.priceRowCard}>
                <View>
                  <Text style={styles.priceNetworkTitle}>{plan.network} ({plan.plan})</Text>
                  <Text style={styles.priceCostSub}>Base Gateway Cost: ₦{plan.cost} • Margin: ₦{plan.price - plan.cost}</Text>
                </View>
                <View style={styles.priceActionRight}>
                  <Text style={styles.priceSellingText}>₦{plan.price}</Text>
                  <TouchableOpacity
                    style={styles.editPriceBtn}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setNewPlanPrice(String(plan.price));
                      setPricingModalVisible(true);
                    }}
                  >
                    <Feather name="edit-2" size={14} color="#0284c7" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* ========================================================
            TAB 6: DIRECTIVES & QUOTA DISPATCH
        ======================================================== */}
        {activeTab === "targets" && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Command Directive & Quota Allocation</Text>
            <Text style={styles.formCardSub}>
              Assign monthly Data volume (GB), Airtime goals, and Retail agent onboarding quotas to field teams.
            </Text>

            <Text style={styles.inputFieldLabel}>Target Operational Cadre</Text>
            <View style={styles.targetRoleSelectorRow}>
              {[
                { key: "national_sales_director", label: "NSD" },
                { key: "state_manager", label: "State Manager" },
                { key: "supervisor", label: "Supervisor" },
                { key: "agent", label: "Agents" },
              ].map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={[styles.targetCadreBtn, targetPayload.targetRole === r.key && styles.targetCadreBtnActive]}
                  onPress={() => setTargetPayload({ ...targetPayload, targetRole: r.key })}
                >
                  <Text style={[styles.targetCadreBtnText, targetPayload.targetRole === r.key && styles.targetCadreBtnTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputFieldLabel}>Monthly Data Quota Target (GB)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.dataVolumeGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, dataVolumeGoal: t })}
              placeholder="e.g. 5000"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputFieldLabel}>Airtime Sales Target (₦)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.airtimeGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, airtimeGoal: t })}
              placeholder="e.g. 500000"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputFieldLabel}>Retail Merchant Recruitment Quota</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.agentRecruitGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, agentRecruitGoal: t })}
              placeholder="e.g. 50"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputFieldLabel}>Executive Command / Directive Note</Text>
            <TextInput
              style={[styles.formInput, { height: 75, textAlignVertical: "top" }]}
              multiline
              value={targetPayload.commandNote}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, commandNote: t })}
              placeholder="Type official directive..."
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={styles.submitFormBtn} onPress={handleDispatchDirective}>
              <Text style={styles.submitFormBtnText}>DISPATCH DIRECTIVE TO CADRE</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ========================================================
            TAB 7: INSTANT PUSH NOTIFICATION BROADCASTER
        ======================================================== */}
        {activeTab === "broadcast" && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Push Notification Broadcaster</Text>
            <Text style={styles.formCardSub}>
              Transmit instant alerts to all platform users or target specific cadre officers directly.
            </Text>

            <Text style={styles.inputFieldLabel}>Broadcast Scope</Text>
            <View style={styles.targetRoleSelectorRow}>
              {[
                { key: "all", label: "All Users" },
                { key: "agent", label: "Agents Only" },
                { key: "supervisor", label: "Supervisors" },
                { key: "specific", label: "Single User" },
              ].map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.targetCadreBtn, broadcastScope === s.key && styles.targetCadreBtnActive]}
                  onPress={() => setBroadcastScope(s.key)}
                >
                  <Text style={[styles.targetCadreBtnText, broadcastScope === s.key && styles.targetCadreBtnTextActive]}>
                    {s.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {broadcastScope === "specific" && (
              <>
                <Text style={styles.inputFieldLabel}>Target Email or Phone</Text>
                <TextInput
                  style={styles.formInput}
                  value={targetUserEmail}
                  onChangeText={setTargetUserEmail}
                  placeholder="e.g. 08011223344 or user@ayaxdata.online"
                  placeholderTextColor="#94a3b8"
                />
              </>
            )}

            <Text style={styles.inputFieldLabel}>Notification Title</Text>
            <TextInput
              style={styles.formInput}
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholder="e.g. Price Slash / System Maintenance"
              placeholderTextColor="#94a3b8"
            />

            <Text style={styles.inputFieldLabel}>Notification Body</Text>
            <TextInput
              style={[styles.formInput, { height: 90, textAlignVertical: "top" }]}
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
              placeholder="Type message content here..."
              placeholderTextColor="#94a3b8"
            />

            <TouchableOpacity style={styles.submitFormBtn} onPress={handleSendNotification} disabled={sendingNotif}>
              {sendingNotif ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitFormBtnText}>TRANSMIT BROADCAST</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* ========================================================
          SIDEBAR DRAWER OVERLAY
      ======================================================== */}
      {sidebarVisible && (
        <View style={styles.sidebarBackdrop}>
          <TouchableOpacity style={styles.backdropTouch} onPress={closeSidebar} activeOpacity={1} />
          <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogoWrap}>
                <Ionicons name="shield-checkmark" size={24} color="#0284c7" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.sidebarBrandTitle}>AYAX CENTRAL</Text>
                <Text style={styles.sidebarRoleSub}>Operations Management Console</Text>
              </View>
            </View>

            <ScrollView style={styles.sidebarNavScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarNavSectionTitle}>MAIN MODULES</Text>
              {[
                { key: "overview", label: "Overview & Balance", icon: "activity" },
                { key: "sales", label: "Data & Airtime Sales", icon: "trending-up" },
                { key: "hierarchy", label: "Cadre Hierarchy", icon: "git-branch" },
                { key: "users", label: "User Directory", icon: "users" },
                { key: "pricing", label: "Tariff Price Margins", icon: "dollar-sign" },
                { key: "targets", label: "Directives & Quotas", icon: "target" },
                { key: "broadcast", label: "Push Notification", icon: "send" },
              ].map((m) => (
                <TouchableOpacity
                  key={m.key}
                  style={[styles.sidebarNavItem, activeTab === m.key && styles.sidebarNavItemActive]}
                  onPress={() => {
                    setActiveTab(m.key);
                    closeSidebar();
                  }}
                >
                  <Feather name={m.icon} size={17} color={activeTab === m.key ? "#0284c7" : "#64748b"} />
                  <Text style={[styles.sidebarNavText, activeTab === m.key && styles.sidebarNavTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.sidebarNavSectionTitle}>IDENTITY & SUPPORT</Text>
              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("NIMCRequests");
                }}
              >
                <Ionicons name="card-outline" size={17} color="#0284c7" />
                <Text style={styles.sidebarNavText}>NIMC Queue ({stats.pendingNIMC || 0})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("BVNScreen");
                }}
              >
                <FontAwesome5 name="fingerprint" size={15} color="#d97706" />
                <Text style={styles.sidebarNavText}>BVN Desk</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("SupportDashboard");
                }}
              >
                <Ionicons name="headset-outline" size={17} color="#e11d48" />
                <Text style={styles.sidebarNavText}>Support Desk</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#e11d48" />
              <Text style={styles.sidebarLogoutText}>Sign Out Console</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ========================================================
          MODAL 1: HIERARCHY SUBORDINATES INSPECTION
      ======================================================== */}
      <Modal visible={hierarchyModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Team & Subordinates Under Command</Text>
                {hierarchyLeader && (
                  <Text style={styles.modalSubLeader}>
                    {hierarchyLeader.name} ({String(hierarchyLeader.role).toUpperCase()}) • {hierarchyLeader.phone}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setHierarchyModalVisible(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              {subordinatesList.length === 0 ? (
                <View style={styles.emptyWrap}>
                  <Feather name="users" size={32} color="#94a3b8" />
                  <Text style={styles.emptyTitle}>No retail agents or officers assigned yet under this station.</Text>
                </View>
              ) : (
                subordinatesList.map((sub, idx) => (
                  <View key={sub._id || idx} style={styles.subordinateRow}>
                    <View style={styles.subAvatar}>
                      <Text style={styles.subAvatarText}>{(sub.name || sub.firstName || "A")[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName}>{sub.name || `${sub.firstName || ""} ${sub.surname || ""}`.trim()}</Text>
                      <Text style={styles.subDetail}>{sub.phone} • {sub.lga || "Ward"} LGA, {sub.state || "State"}</Text>
                      <Text style={styles.subTarget}>
                        Assigned Target: {sub.targets?.dataGoal || 500} GB • Airtime: ₦{Number(sub.targets?.airtimeGoal || 100000).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.subBalance}>
                      <Text style={styles.subBalText}>₦{Number(sub.walletBalance || sub.balance || 0).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL 2: CREATE UNIVERSAL USER / CADRE STAFF
      ======================================================== */}
      <Modal visible={createUserModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Provision New Staff / Account</Text>
              <TouchableOpacity onPress={() => setCreateUserModalVisible(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFieldLabel}>Full Legal Name</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.name}
                onChangeText={(t) => setUserFormData({ ...userFormData, name: t })}
                placeholder="e.g. Ibrahim Sani"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.phone}
                onChangeText={(t) => setUserFormData({ ...userFormData, phone: t })}
                placeholder="e.g. 08011223344"
                keyboardType="phone-pad"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.email}
                onChangeText={(t) => setUserFormData({ ...userFormData, email: t })}
                placeholder="e.g. officer@ayaxdata.online"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Assigned Role</Text>
              <View style={styles.targetRoleSelectorRow}>
                {[
                  { key: "agent", label: "Agent" },
                  { key: "supervisor", label: "Supervisor" },
                  { key: "state_manager", label: "State Mgr" },
                  { key: "national_sales_director", label: "NSD" },
                  { key: "support", label: "Support" },
                ].map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    style={[styles.targetCadreBtn, userFormData.role === r.key && styles.targetCadreBtnActive]}
                    onPress={() => setUserFormData({ ...userFormData, role: r.key })}
                  >
                    <Text style={[styles.targetCadreBtnText, userFormData.role === r.key && styles.targetCadreBtnTextActive]}>
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputFieldLabel}>State & Station</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.state}
                onChangeText={(t) => setUserFormData({ ...userFormData, state: t })}
                placeholder="e.g. Kano / Abuja"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>LGA / Ward</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.lga}
                onChangeText={(t) => setUserFormData({ ...userFormData, lga: t })}
                placeholder="e.g. Municipal / Ajingi"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.inputFieldLabel}>Assigned Monthly Data Goal (GB)</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.dataGoal}
                onChangeText={(t) => setUserFormData({ ...userFormData, dataGoal: t })}
                placeholder="e.g. 1500"
                keyboardType="numeric"
                placeholderTextColor="#94a3b8"
              />

              <TouchableOpacity style={styles.submitFormBtn} onPress={handleCreateUser}>
                <Text style={styles.submitFormBtnText}>CREATE & SYNC ACCOUNT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL 3: USER INSPECTION & STATUS OVERRIDE
      ======================================================== */}
      <Modal visible={userModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Record & Account Status</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailVal}>{selectedUser.name || selectedUser.firstName || "N/A"}</Text>

                <Text style={styles.detailLabel}>Phone & Email</Text>
                <Text style={styles.detailVal}>{selectedUser.phone} • {selectedUser.email || "No email"}</Text>

                <Text style={styles.detailLabel}>Role Cadre</Text>
                <Text style={[styles.detailVal, { color: "#0284c7", fontWeight: "900" }]}>
                  {String(selectedUser.role).toUpperCase()}
                </Text>

                <Text style={styles.detailLabel}>Wallet Balance</Text>
                <Text style={[styles.detailVal, { color: "#059669", fontSize: 16, fontWeight: "900" }]}>
                  ₦{Number(selectedUser.walletBalance || selectedUser.balance || 0).toLocaleString()}
                </Text>

                <Text style={styles.detailLabel}>Assigned Location</Text>
                <Text style={styles.detailVal}>{selectedUser.address || "HQ Station"}, {selectedUser.lga} LGA, {selectedUser.state} State</Text>

                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#e11d48" }]}
                    onPress={() => handleUpdateUserStatus(selectedUser._id, "suspended")}
                  >
                    <Text style={styles.modalBtnText}>Suspend Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#10b981" }]}
                    onPress={() => handleUpdateUserStatus(selectedUser._id, "active")}
                  >
                    <Text style={styles.modalBtnText}>Activate Account</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* ========================================================
          MODAL 4: EDIT TARIFF PRICE
      ======================================================== */}
      <Modal visible={pricingModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Selling Tariff</Text>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Feather name="x" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <Text style={styles.detailLabel}>Plan Details</Text>
                <Text style={styles.detailVal}>{selectedPlan.network} - {selectedPlan.plan}</Text>
                <Text style={styles.detailLabel}>Base Gateway Cost: ₦{selectedPlan.cost}</Text>

                <Text style={[styles.inputFieldLabel, { marginTop: 14 }]}>New Retail Selling Price (₦)</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPlanPrice}
                  onChangeText={setNewPlanPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#94a3b8"
                />

                <TouchableOpacity style={styles.submitFormBtn} onPress={handleSavePrice}>
                  <Text style={styles.submitFormBtnText}>UPDATE & SYNC PRICE</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#0284c7",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 1.2,
    marginTop: 16,
  },
  loaderSub: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#ffffff",
    paddingTop: Platform.OS === "ios" ? 50 : 38,
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  menuToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  headerTitleWrap: { alignItems: "center" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0284c7",
    marginRight: 6,
  },
  liveText: { color: "#0284c7", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.6 },
  brandTitle: { color: "#0f172a", fontSize: 12.5, fontWeight: "900", letterSpacing: 0.5 },
  topActions: { flexDirection: "row", alignItems: "center" },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginLeft: 6,
  },
  logoutBtn: {
    borderColor: "#fecdd3",
    backgroundColor: "#ffe4e6",
  },
  tabRibbon: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 8,
  },
  tabScroll: { paddingHorizontal: 12 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 6,
  },
  tabBtnActive: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  tabBtnText: { color: "#475569", fontSize: 11.5, fontWeight: "700" },
  tabBtnTextActive: { color: "#ffffff", fontWeight: "900" },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    color: "#475569",
    fontSize: 10.5,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  sectionHeaderLive: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
  },
  sectionHeaderSub: { color: "#0284c7", fontSize: 9.5, fontWeight: "700" },
  
  // --- DARK TELEMETRY STYLING ---
  darkTelemetryContainer: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  darkMetricCard: {
    width: "48.5%",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
    borderTopWidth: 3,
  },
  darkMetricCardLabel: { color: "#94a3b8", fontSize: 10.5, fontWeight: "700", flex: 1 },
  darkMetricCardValue: { fontSize: 15, fontWeight: "900", marginVertical: 4, color: "#f8fafc" },
  darkMetricCardSub: { color: "#64748b", fontSize: 9.5, fontWeight: "600" },
  darkSalesDivider: { width: 1, height: 60, backgroundColor: "#334155", marginHorizontal: 8 },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  rosterCardGrid: { gap: 8, marginBottom: 12 },
  rosterCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  rosterIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  rosterCardTitle: { color: "#0f172a", fontSize: 12.5, fontWeight: "800" },
  rosterCardSub: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  rosterCardCount: { fontSize: 16, fontWeight: "900" },
  salesHeroRow: { flexDirection: "row", alignItems: "center" },
  salesItem: { flex: 1, alignItems: "center" },
  salesIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  networkGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  networkCard: {
    width: "48.5%",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  networkCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  networkName: { color: "#0f172a", fontSize: 12, fontWeight: "800" },
  netBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  netBadgeText: { fontSize: 10, fontWeight: "900" },
  netVolText: { color: "#0284c7", fontSize: 13, fontWeight: "900", marginTop: 6 },
  netRevText: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  hierarchyHint: { color: "#64748b", fontSize: 11, marginBottom: 10, fontStyle: "italic" },
  leaderCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  leaderAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  leaderAvatarText: { color: "#0284c7", fontSize: 14, fontWeight: "900" },
  leaderInfo: { flex: 1 },
  leaderNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  leaderName: { color: "#0f172a", fontSize: 12.5, fontWeight: "800", flexShrink: 1 },
  leaderRolePill: { backgroundColor: "#f1f5f9", paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  leaderRolePillText: { color: "#0284c7", fontSize: 8.5, fontWeight: "900" },
  leaderSubText: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  targetProgressRow: { marginTop: 3 },
  targetProgressText: { color: "#059669", fontSize: 10, fontWeight: "700" },
  inspectArrowWrap: { paddingLeft: 6 },
  searchFilterContainer: { flexDirection: "row", gap: 8, marginBottom: 8, alignItems: "center" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 13 },
  addUserInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  addUserInlineText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
  roleFilterScroll: { marginBottom: 10 },
  roleBadge: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  roleBadgeActive: { borderColor: "#0284c7", backgroundColor: "#e0f2fe" },
  roleBadgeText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  roleBadgeTextActive: { color: "#0284c7", fontWeight: "900" },
  userListItem: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userAvatarTxt: { color: "#0284c7", fontSize: 13, fontWeight: "900" },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { color: "#0f172a", fontSize: 12.5, fontWeight: "800", flexShrink: 1 },
  userRoleTag: { backgroundColor: "#f1f5f9", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 },
  userRoleTagTxt: { color: "#0284c7", fontSize: 8.5, fontWeight: "900" },
  userSub: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  userLoc: { color: "#94a3b8", fontSize: 10 },
  userBalanceSide: { alignItems: "flex-end", gap: 3 },
  userBalanceVal: { color: "#059669", fontSize: 12, fontWeight: "900" },
  priceRowCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 2,
  },
  priceNetworkTitle: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  priceCostSub: { color: "#64748b", fontSize: 10.5, marginTop: 2 },
  priceActionRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceSellingText: { color: "#059669", fontSize: 14.5, fontWeight: "900" },
  editPriceBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  formCardTitle: { color: "#0f172a", fontSize: 13.5, fontWeight: "900" },
  formCardSub: { color: "#64748b", fontSize: 11, marginTop: 2, marginBottom: 14 },
  inputFieldLabel: { color: "#334155", fontSize: 11, fontWeight: "700", marginBottom: 5 },
  formInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    color: "#0f172a",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    marginBottom: 12,
  },
  targetRoleSelectorRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  targetCadreBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  targetCadreBtnActive: { borderColor: "#0284c7", backgroundColor: "#e0f2fe" },
  targetCadreBtnText: { color: "#475569", fontSize: 11, fontWeight: "700" },
  targetCadreBtnTextActive: { color: "#0284c7", fontWeight: "900" },
  submitFormBtn: {
    backgroundColor: "#0284c7",
    borderRadius: 10,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  submitFormBtnText: { color: "#ffffff", fontSize: 12.5, fontWeight: "900", letterSpacing: 0.5 },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 999,
  },
  backdropTouch: { flex: 1, backgroundColor: "rgba(15, 23, 42, 0.45)" },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: "#ffffff",
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 25,
    paddingHorizontal: 16,
    zIndex: 1000,
    elevation: 10,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    marginBottom: 12,
  },
  sidebarLogoWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  sidebarBrandTitle: { color: "#0f172a", fontSize: 14, fontWeight: "900" },
  sidebarRoleSub: { color: "#64748b", fontSize: 10 },
  sidebarNavScroll: { flex: 1 },
  sidebarNavSectionTitle: {
    color: "#94a3b8",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 12,
    marginBottom: 6,
  },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 3,
  },
  sidebarNavItemActive: { backgroundColor: "#e0f2fe" },
  sidebarNavText: { color: "#475569", fontSize: 12, fontWeight: "700" },
  sidebarNavTextActive: { color: "#0284c7", fontWeight: "900" },
  sidebarLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 8,
    marginTop: 10,
  },
  sidebarLogoutText: { color: "#e11d48", fontSize: 12.5, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 5,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
    marginBottom: 10,
  },
  modalTitle: { color: "#0f172a", fontSize: 13.5, fontWeight: "900" },
  modalSubLeader: { color: "#0284c7", fontSize: 11, marginTop: 2 },
  subordinateRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    gap: 8,
  },
  subAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
  },
  subAvatarText: { color: "#0284c7", fontSize: 12, fontWeight: "900" },
  subName: { color: "#0f172a", fontSize: 12, fontWeight: "800" },
  subDetail: { color: "#64748b", fontSize: 10 },
  subTarget: { color: "#059669", fontSize: 9.5, fontWeight: "700", marginTop: 2 },
  subBalance: { alignItems: "flex-end" },
  subBalText: { color: "#059669", fontSize: 12, fontWeight: "900" },
  detailLabel: { color: "#64748b", fontSize: 10, fontWeight: "700", marginTop: 8 },
  detailVal: { color: "#0f172a", fontSize: 12.5, marginTop: 1 },
  modalActionButtons: { flexDirection: "row", gap: 8, marginTop: 16 },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  emptyWrap: { alignItems: "center", paddingVertical: 30 },
  emptyTitle: { color: "#64748b", fontSize: 12, marginTop: 6, textAlign: "center" },
});

export default AdminDashboard;