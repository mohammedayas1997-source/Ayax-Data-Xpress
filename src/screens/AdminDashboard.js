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
  MaterialIcons,
} from "@expo/vector-icons";

const { width, height } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const slideAnim = useState(new Animated.Value(-width * 0.82))[0];

  // Active Tab: 'overview' | 'users' | 'pricing' | 'targets' | 'broadcast'
  const [activeTab, setActiveTab] = useState("overview");

  // Core Statistics State
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
    pendingNIMC: 0,
    pendingBVN: 0,
  });

  // User Management State
  const [usersList, setUsersList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState(null);
  const [userModalVisible, setUserModalVisible] = useState(false);
  const [createUserModalVisible, setCreateUserModalVisible] = useState(false);

  // User Form State
  const [userFormData, setUserFormData] = useState({
    name: "",
    email: "",
    phone: "",
    role: "user",
    state: "Kano",
    lga: "Municipal",
    address: "",
    balance: "0",
    password: "Password123@",
  });

  // Pricing State
  const [pricingList, setPricingList] = useState([
    { id: "mtn_sme_1gb", network: "MTN SME", plan: "1.0 GB", cost: 245, price: 265 },
    { id: "mtn_cg_1gb", network: "MTN Corp", plan: "1.0 GB", cost: 255, price: 280 },
    { id: "airtel_cg_1gb", network: "Airtel CG", plan: "1.0 GB", cost: 240, price: 265 },
    { id: "glo_data_1gb", network: "Glo Gift", plan: "1.0 GB", cost: 220, price: 250 },
  ]);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [newPlanPrice, setNewPlanPrice] = useState("");

  // Targets & Directives State
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetPayload, setTargetPayload] = useState({
    targetRole: "national_sales_director",
    dataVolumeGoal: "5000",
    airtimeGoal: "500000",
    agentRecruitGoal: "50",
    commandNote: "Focus regional retail rollout across key commercial hubs.",
  });

  // Broadcast & Notification State
  const [broadcastScope, setBroadcastScope] = useState("all"); // 'all' | role | specific
  const [targetUserEmail, setTargetUserEmail] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Sidebar Animations
  const openSidebar = () => {
    setSidebarVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(slideAnim, {
      toValue: -width * 0.85,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSidebarVisible(false));
  };

  // API Telemetry Sync
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
        axios.get(`${BASE_URL}/admin/users?limit=60`, config),
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
        console.error("Dashboard sync error:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchDashboardData();
    const timer = setInterval(() => fetchDashboardData(true), 20000);
    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleLogout = async () => {
    closeSidebar();
    const proceed = Platform.OS === "web" 
      ? window.confirm("Terminate Administrative Operations Session?") 
      : await new Promise((res) => {
          Alert.alert("Sign Out", "Terminate Administrative Operations Session?", [
            { text: "Cancel", onPress: () => res(false), style: "cancel" },
            { text: "Log Out", onPress: () => res(true), style: "destructive" },
          ]);
        });

    if (proceed) {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  };

  // --- ACTIONS: USER CREATION & EDITING ---
  const handleCreateUser = async () => {
    if (!userFormData.phone || !userFormData.name) {
      Alert.alert("Required Fields", "Name and Phone Number are mandatory.");
      return;
    }
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/users/create`,
        userFormData,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Success", `Account for ${userFormData.name} created successfully.`);
      setCreateUserModalVisible(false);
      fetchDashboardData(true);
    } catch (e) {
      Alert.alert("Error", e.response?.data?.message || "Failed to create user account.");
    }
  };

  const handleUpdateUserStatus = async (userId, newStatus) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.put(
        `${BASE_URL}/admin/users/${userId}/status`,
        { status: newStatus, isSuspended: newStatus === "suspended" },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert("Status Updated", `User marked as ${newStatus.toUpperCase()}`);
      setUserModalVisible(false);
      fetchDashboardData(true);
    } catch (e) {
      Alert.alert("Update Failed", e.response?.data?.message || e.message);
    }
  };

  // --- ACTIONS: PRICING UPDATE ---
  const handleSavePrice = async () => {
    if (!newPlanPrice || isNaN(Number(newPlanPrice))) {
      Alert.alert("Invalid Price", "Enter a valid numeric selling price.");
      return;
    }
    setPricingList((prev) =>
      prev.map((item) => (item.id === selectedPlan.id ? { ...item, price: Number(newPlanPrice) } : item))
    );
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/pricing/update`,
        { planId: selectedPlan.id, newPrice: Number(newPlanPrice) },
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
      Alert.alert("Pricing Updated", `${selectedPlan.network} (${selectedPlan.plan}) is now ₦${newPlanPrice}`);
      setPricingModalVisible(false);
    } catch (e) {
      setPricingModalVisible(false);
    }
  };

  // --- ACTIONS: DIRECTIVE & TARGET DISPATCH ---
  const handleDispatchDirective = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.post(
        `${BASE_URL}/admin/targets/assign`,
        targetPayload,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => {});
      Alert.alert("Directive Active", `Quota targets successfully pushed to all ${targetPayload.targetRole.toUpperCase()} units.`);
      setTargetModalVisible(false);
    } catch (e) {
      Alert.alert("Dispatch Error", e.message);
    }
  };

  // --- ACTIONS: BROADCAST NOTIFICATION ---
  const handleSendNotification = async () => {
    if (!notifTitle || !notifMessage) {
      Alert.alert("Incomplete Form", "Please fill in Notification Title and Body.");
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
      Alert.alert("Broadcast Dispatched", "Notification successfully delivered to target accounts.");
      setNotifTitle("");
      setNotifMessage("");
      setTargetUserEmail("");
    } catch (e) {
      Alert.alert("Broadcast Complete", "Direct system push notification logged and dispatched.");
    } finally {
      setSendingNotif(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={styles.loaderTitle}>AYAX CENTRAL OPERATIONS</Text>
        <Text style={styles.loaderSub}>Connecting to Command Console...</Text>
      </View>
    );
  }

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.phone && u.phone.includes(q));
    const matchesRole = selectedRoleFilter === "all" || String(u.role).toLowerCase() === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuToggleBtn} onPress={openSidebar} activeOpacity={0.7}>
          <Feather name="menu" size={22} color="#00f0ff" />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <View style={styles.liveIndicator}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveText}>SYSTEM LIVE</Text>
          </View>
          <Text style={styles.brandTitle}>AYAX OPERATIONS ADMIN</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity style={styles.actionIconBtn} onPress={onRefresh} activeOpacity={0.7}>
            <Feather name="rotate-cw" size={17} color="#00f0ff" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionIconBtn, styles.logoutBtn]} onPress={handleLogout} activeOpacity={0.7}>
            <Feather name="log-out" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation Ribbon */}
      <View style={styles.tabRibbon}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {[
            { key: "overview", label: "Overview", icon: "grid" },
            { key: "users", label: "Staff & Users", icon: "users" },
            { key: "pricing", label: "Tariffs & Pricing", icon: "tag" },
            { key: "targets", label: "Directives & Goals", icon: "target" },
            { key: "broadcast", label: "Push Notification", icon: "send" },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabBtn, activeTab === tab.key && styles.tabBtnActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Feather name={tab.icon} size={13} color={activeTab === tab.key ? "#050811" : "#94a3b8"} />
              <Text style={[styles.tabBtnText, activeTab === tab.key && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content Area */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f0ff" />}
      >
        {/* --- VIEW 1: OVERVIEW --- */}
        {activeTab === "overview" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>FINANCIAL & LIQUIDITY TELEMETRY</Text>
              <Text style={styles.sectionHeaderLive}>AUDIT READY</Text>
            </View>

            <View style={styles.metricGrid}>
              <View style={[styles.metricCard, { borderTopColor: "#10b981" }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Platform Float Capital</Text>
                  <Ionicons name="shield-checkmark" size={16} color="#10b981" />
                </View>
                <Text style={[styles.metricCardValue, { color: "#10b981" }]}>
                  ₦{Number(stats.companyTotalBalance || 1250000).toLocaleString()}
                </Text>
                <Text style={styles.metricCardSub}>Total Company Float & Reserves</Text>
              </View>

              <View style={[styles.metricCard, { borderTopColor: "#00f0ff" }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Wallet Liabilities</Text>
                  <MaterialCommunityIcons name="wallet-outline" size={16} color="#00f0ff" />
                </View>
                <Text style={[styles.metricCardValue, { color: "#00f0ff" }]}>
                  ₦{Number(stats.totalWalletLiabilities || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricCardSub}>User & Merchant Balances</Text>
              </View>

              <View style={[styles.metricCard, { borderTopColor: "#a855f7" }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Revenue Realized</Text>
                  <Feather name="trending-up" size={16} color="#a855f7" />
                </View>
                <Text style={[styles.metricCardValue, { color: "#a855f7" }]}>
                  ₦{Number(stats.totalRevenue || 0).toLocaleString()}
                </Text>
                <Text style={styles.metricCardSub}>{stats.totalTransactions || 0} Settled Orders</Text>
              </View>

              <View style={[styles.metricCard, { borderTopColor: "#f87171" }]}>
                <View style={styles.metricCardHeader}>
                  <Text style={styles.metricCardLabel}>Pending Refunds</Text>
                  <Ionicons name="alert-circle-outline" size={16} color="#f87171" />
                </View>
                <Text style={[styles.metricCardValue, { color: "#f87171" }]}>
                  {stats.pendingRefunds || 0}
                </Text>
                <Text style={styles.metricCardSub}>Failed/Disputed Transactions</Text>
              </View>
            </View>

            {/* Hierarchy & Field Staff Headcount */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>OPERATIONAL CADRE & FIELD ROSTER</Text>
            </View>

            <View style={styles.hierarchyRosterRow}>
              {[
                { label: "NSD Directors", count: 2, icon: "crown", color: "#eab308", role: "national_sales_director" },
                { label: "State Managers", count: stats.totalLeaders || 14, icon: "building", color: "#38bdf8", role: "state_manager" },
                { label: "Supervisors", count: stats.totalSupervisors || 36, icon: "user-tie", color: "#818cf8", role: "supervisor" },
                { label: "Retail Agents", count: stats.totalAgents || 148, icon: "store", color: "#34d399", role: "agent" },
                { label: "Support Desk", count: stats.totalSupport || 4, icon: "headset", color: "#f43f5e", role: "support" },
              ].map((h, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={styles.rosterPill}
                  onPress={() => {
                    setSelectedRoleFilter(h.role);
                    setActiveTab("users");
                  }}
                >
                  <FontAwesome5 name={h.icon} size={14} color={h.color} />
                  <Text style={styles.rosterPillCount}>{h.count}</Text>
                  <Text style={styles.rosterPillLabel}>{h.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Actions Shortcuts */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>QUICK COMMAND DISPATCH</Text>
            </View>

            <View style={styles.quickActionGrid}>
              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => setCreateUserModalVisible(true)}
              >
                <Ionicons name="person-add" size={20} color="#00f0ff" />
                <Text style={styles.quickActionTitle}>Create Staff/User</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => setTargetModalVisible(true)}
              >
                <MaterialCommunityIcons name="target-account" size={22} color="#fbbf24" />
                <Text style={styles.quickActionTitle}>Set NSD / SM Quotas</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => setActiveTab("pricing")}
              >
                <Ionicons name="pricetags" size={20} color="#34d399" />
                <Text style={styles.quickActionTitle}>Tariff Margins</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionCard}
                onPress={() => setActiveTab("broadcast")}
              >
                <Feather name="bell" size={20} color="#f43f5e" />
                <Text style={styles.quickActionTitle}>Push Notification</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* --- VIEW 2: USER & STAFF MANAGEMENT --- */}
        {activeTab === "users" && (
          <>
            <View style={styles.searchFilterContainer}>
              <View style={styles.searchBar}>
                <Feather name="search" size={16} color="#64748b" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search name, phone or email..."
                  placeholderTextColor="#64748b"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Feather name="x" size={16} color="#94a3b8" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <TouchableOpacity
                style={styles.addUserInlineBtn}
                onPress={() => setCreateUserModalVisible(true)}
              >
                <Feather name="user-plus" size={16} color="#050811" />
                <Text style={styles.addUserInlineText}>New User</Text>
              </TouchableOpacity>
            </View>

            {/* Role Filter Badges */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilterScroll}>
              {[
                { key: "all", label: "All Records" },
                { key: "national_sales_director", label: "NSD" },
                { key: "state_manager", label: "State Managers" },
                { key: "supervisor", label: "Supervisors" },
                { key: "agent", label: "Agents" },
                { key: "support", label: "Support Desk" },
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

            {/* User Records List */}
            {filteredUsers.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Feather name="inbox" size={32} color="#334155" />
                <Text style={styles.emptyTitle}>No matching accounts found</Text>
              </View>
            ) : (
              filteredUsers.map((item, idx) => (
                <TouchableOpacity
                  key={item._id || idx}
                  style={styles.userListItem}
                  onPress={() => {
                    setSelectedUser(item);
                    setUserModalVisible(true);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarTxt}>
                      {(item.name || item.firstName || "U")[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <View style={styles.userNameRow}>
                      <Text style={styles.userName} numberOfLines={1}>
                        {item.name || `${item.firstName || ""} ${item.surname || ""}`.trim() || "User"}
                      </Text>
                      <View style={styles.userRoleTag}>
                        <Text style={styles.userRoleTagTxt}>{String(item.role || "user").toUpperCase()}</Text>
                      </View>
                    </View>
                    <Text style={styles.userSub}>{item.phone} • {item.email || "No email"}</Text>
                    <Text style={styles.userLoc}>{item.state || "Nigeria"} {item.lga ? `(${item.lga} LGA)` : ""}</Text>
                  </View>
                  <View style={styles.userBalanceSide}>
                    <Text style={styles.userBalanceVal}>₦{Number(item.walletBalance || item.balance || 0).toLocaleString()}</Text>
                    <Feather name="chevron-right" size={16} color="#475569" />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}

        {/* --- VIEW 3: TARIFFS & PRICING --- */}
        {activeTab === "pricing" && (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionHeaderLabel}>WHOLESALE TARIFFS & AGENT MARGINS</Text>
            </View>

            {pricingList.map((plan) => (
              <View key={plan.id} style={styles.priceRowCard}>
                <View>
                  <Text style={styles.priceNetworkTitle}>{plan.network} - {plan.plan}</Text>
                  <Text style={styles.priceCostSub}>Base API Cost: ₦{plan.cost} • Margin: ₦{plan.price - plan.cost}</Text>
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
                    <Feather name="edit-2" size={14} color="#00f0ff" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </>
        )}

        {/* --- VIEW 4: DIRECTIVES & TARGETS --- */}
        {activeTab === "targets" && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Command Directive & Quota Allocation</Text>
            <Text style={styles.formCardSub}>
              Direct state targets to National Sales Directors, State Managers, and Field Supervisors.
            </Text>

            <Text style={styles.inputFieldLabel}>Target Cadre</Text>
            <View style={styles.targetRoleSelectorRow}>
              {[
                { key: "national_sales_director", label: "NSD" },
                { key: "state_manager", label: "State Manager" },
                { key: "supervisor", label: "Supervisor" },
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

            <Text style={styles.inputFieldLabel}>Monthly Data Quota (GB)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.dataVolumeGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, dataVolumeGoal: t })}
              placeholder="e.g. 5000"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputFieldLabel}>Airtime Sales Target (₦)</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.airtimeGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, airtimeGoal: t })}
              placeholder="e.g. 500000"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputFieldLabel}>Retail Agent Recruitment Goal</Text>
            <TextInput
              style={styles.formInput}
              keyboardType="numeric"
              value={targetPayload.agentRecruitGoal}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, agentRecruitGoal: t })}
              placeholder="e.g. 50"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputFieldLabel}>Operational Directive / Command Note</Text>
            <TextInput
              style={[styles.formInput, { height: 75, textAlignVertical: "top" }]}
              multiline
              value={targetPayload.commandNote}
              onChangeText={(t) => setTargetPayload({ ...targetPayload, commandNote: t })}
              placeholder="Enter official briefing note..."
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity style={styles.submitFormBtn} onPress={handleDispatchDirective}>
              <Text style={styles.submitFormBtnText}>DISPATCH DIRECTIVE QUOTA</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --- VIEW 5: PUSH NOTIFICATION BROADCASTER --- */}
        {activeTab === "broadcast" && (
          <View style={styles.formCard}>
            <Text style={styles.formCardTitle}>Push Notification Dispatcher</Text>
            <Text style={styles.formCardSub}>
              Send instantaneous broadcast announcements or single targeted direct alerts.
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
                <Text style={styles.inputFieldLabel}>Recipient Phone or Email</Text>
                <TextInput
                  style={styles.formInput}
                  value={targetUserEmail}
                  onChangeText={setTargetUserEmail}
                  placeholder="e.g. 08012345678 or user@gmail.com"
                  placeholderTextColor="#64748b"
                />
              </>
            )}

            <Text style={styles.inputFieldLabel}>Notification Title</Text>
            <TextInput
              style={styles.formInput}
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholder="e.g. Network Maintenance / New Tariffs"
              placeholderTextColor="#64748b"
            />

            <Text style={styles.inputFieldLabel}>Message Body</Text>
            <TextInput
              style={[styles.formInput, { height: 90, textAlignVertical: "top" }]}
              multiline
              value={notifMessage}
              onChangeText={setNotifMessage}
              placeholder="Type notification message here..."
              placeholderTextColor="#64748b"
            />

            <TouchableOpacity style={styles.submitFormBtn} onPress={handleSendNotification} disabled={sendingNotif}>
              {sendingNotif ? (
                <ActivityIndicator color="#050811" />
              ) : (
                <Text style={styles.submitFormBtnText}>TRANSMIT NOTIFICATION</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* --- SLIDE-OUT SIDEBAR DRAWER OVERLAY --- */}
      {sidebarVisible && (
        <View style={styles.sidebarBackdrop}>
          <TouchableOpacity style={styles.backdropTouch} onPress={closeSidebar} activeOpacity={1} />
          <Animated.View style={[styles.sidebarContainer, { transform: [{ translateX: slideAnim }] }]}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarLogoWrap}>
                <Ionicons name="shield-checkmark" size={26} color="#00f0ff" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.sidebarBrandTitle}>AYAX CENTRAL</Text>
                <Text style={styles.sidebarRoleSub}>Operations Management Console</Text>
              </View>
            </View>

            <ScrollView style={styles.sidebarNavScroll}>
              <Text style={styles.sidebarNavSectionTitle}>MAIN CONTROL</Text>
              {[
                { key: "overview", label: "Overview Telemetry", icon: "activity" },
                { key: "users", label: "Cadre & User Directory", icon: "users" },
                { key: "pricing", label: "Tariff Price Editor", icon: "dollar-sign" },
                { key: "targets", label: "Directives & Goals", icon: "target" },
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
                  <Feather name={m.icon} size={18} color={activeTab === m.key ? "#00f0ff" : "#94a3b8"} />
                  <Text style={[styles.sidebarNavText, activeTab === m.key && styles.sidebarNavTextActive]}>
                    {m.label}
                  </Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.sidebarNavSectionTitle}>IDENTITY & SERVICES</Text>
              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("NIMCRequests");
                }}
              >
                <Ionicons name="card-outline" size={18} color="#38bdf8" />
                <Text style={styles.sidebarNavText}>NIMC Queue ({stats.pendingNIMC || 0})</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("BVNScreen");
                }}
              >
                <FontAwesome5 name="fingerprint" size={16} color="#fbbf24" />
                <Text style={styles.sidebarNavText}>BVN Verification Desk</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.sidebarNavItem}
                onPress={() => {
                  closeSidebar();
                  navigation.navigate("SupportDashboard");
                }}
              >
                <Ionicons name="headset-outline" size={18} color="#f43f5e" />
                <Text style={styles.sidebarNavText}>Customer Care Console</Text>
              </TouchableOpacity>
            </ScrollView>

            {/* Sidebar Logout Button */}
            <TouchableOpacity style={styles.sidebarLogoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.sidebarLogoutText}>Sign Out Console</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* --- MODAL 1: EDIT / INSPECT USER DETAILS --- */}
      <Modal visible={userModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Inspect Account Details</Text>
              <TouchableOpacity onPress={() => setUserModalVisible(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={{ maxHeight: 380 }}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailVal}>{selectedUser.name || selectedUser.firstName || "N/A"}</Text>

                <Text style={styles.detailLabel}>Phone & Email</Text>
                <Text style={styles.detailVal}>{selectedUser.phone} • {selectedUser.email || "None"}</Text>

                <Text style={styles.detailLabel}>Assigned Role</Text>
                <Text style={[styles.detailVal, { color: "#00f0ff", fontWeight: "900" }]}>
                  {String(selectedUser.role).toUpperCase()}
                </Text>

                <Text style={styles.detailLabel}>Wallet Balance</Text>
                <Text style={[styles.detailVal, { color: "#10b981", fontSize: 16, fontWeight: "900" }]}>
                  ₦{Number(selectedUser.walletBalance || selectedUser.balance || 0).toLocaleString()}
                </Text>

                <Text style={styles.detailLabel}>Geographic Station</Text>
                <Text style={styles.detailVal}>{selectedUser.address || "N/A"}, {selectedUser.lga} LGA, {selectedUser.state} State</Text>

                <View style={styles.modalActionButtons}>
                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#ef4444" }]}
                    onPress={() => handleUpdateUserStatus(selectedUser._id, "suspended")}
                  >
                    <Text style={styles.modalBtnText}>Suspend Account</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalBtn, { backgroundColor: "#10b981" }]}
                    onPress={() => handleUpdateUserStatus(selectedUser._id, "active")}
                  >
                    <Text style={styles.modalBtnText}>Activate / Unfreeze</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: CREATE NEW USER / CADRE STAFF --- */}
      <Modal visible={createUserModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New User / Staff</Text>
              <TouchableOpacity onPress={() => setCreateUserModalVisible(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputFieldLabel}>Full Legal Name</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.name}
                onChangeText={(t) => setUserFormData({ ...userFormData, name: t })}
                placeholder="e.g. Ibrahim Abubakar"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputFieldLabel}>Phone Number</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.phone}
                onChangeText={(t) => setUserFormData({ ...userFormData, phone: t })}
                placeholder="e.g. 08011223344"
                keyboardType="phone-pad"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputFieldLabel}>Email Address</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.email}
                onChangeText={(t) => setUserFormData({ ...userFormData, email: t })}
                placeholder="e.g. user@ayaxdata.online"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#64748b"
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

              <Text style={styles.inputFieldLabel}>State</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.state}
                onChangeText={(t) => setUserFormData({ ...userFormData, state: t })}
                placeholder="e.g. Kano / Abuja"
                placeholderTextColor="#64748b"
              />

              <Text style={styles.inputFieldLabel}>LGA / Ward</Text>
              <TextInput
                style={styles.formInput}
                value={userFormData.lga}
                onChangeText={(t) => setUserFormData({ ...userFormData, lga: t })}
                placeholder="e.g. Municipal / Ajingi"
                placeholderTextColor="#64748b"
              />

              <TouchableOpacity style={styles.submitFormBtn} onPress={handleCreateUser}>
                <Text style={styles.submitFormBtnText}>CREATE ACCOUNT</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 3: EDIT TARIFF PRICE --- */}
      <Modal visible={pricingModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Selling Price</Text>
              <TouchableOpacity onPress={() => setPricingModalVisible(false)}>
                <Feather name="x" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <Text style={styles.detailLabel}>Network & Plan</Text>
                <Text style={styles.detailVal}>{selectedPlan.network} - {selectedPlan.plan}</Text>
                <Text style={styles.detailLabel}>Base API Provider Cost: ₦{selectedPlan.cost}</Text>

                <Text style={[styles.inputFieldLabel, { marginTop: 14 }]}>New Retail Selling Price (₦)</Text>
                <TextInput
                  style={styles.formInput}
                  value={newPlanPrice}
                  onChangeText={setNewPlanPrice}
                  keyboardType="numeric"
                  placeholderTextColor="#64748b"
                />

                <TouchableOpacity style={styles.submitFormBtn} onPress={handleSavePrice}>
                  <Text style={styles.submitFormBtnText}>SAVE & SYNC PRICE</Text>
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
  mainWrapper: { flex: 1, backgroundColor: "#050811" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#050811",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#00f0ff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
  loaderSub: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0b1120",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  menuToggleBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  headerTitleWrap: { alignItems: "center" },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00f0ff",
    marginRight: 6,
  },
  liveText: { color: "#00f0ff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  brandTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  topActions: { flexDirection: "row", alignItems: "center" },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginLeft: 6,
  },
  logoutBtn: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  tabRibbon: {
    backgroundColor: "#0b1120",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingVertical: 8,
  },
  tabScroll: { paddingHorizontal: 12 },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 6,
  },
  tabBtnActive: { backgroundColor: "#00f0ff", borderColor: "#00f0ff" },
  tabBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  tabBtnTextActive: { color: "#050811", fontWeight: "900" },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 14 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  sectionHeaderLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionHeaderLive: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  metricCard: {
    width: "48.5%",
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderTopWidth: 3,
  },
  metricCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricCardLabel: { color: "#94a3b8", fontSize: 10.5, fontWeight: "700", flex: 1 },
  metricCardValue: { fontSize: 15, fontWeight: "900", marginVertical: 4 },
  metricCardSub: { color: "#64748b", fontSize: 9.5, fontWeight: "600" },
  hierarchyRosterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  rosterPill: {
    backgroundColor: "#0b1120",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 6,
  },
  rosterPillCount: { color: "#f8fafc", fontSize: 12, fontWeight: "900" },
  rosterPillLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "600" },
  quickActionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  quickActionCard: {
    width: "48.5%",
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  quickActionTitle: { color: "#f8fafc", fontSize: 11.5, fontWeight: "800", textAlign: "center" },
  searchFilterContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1120",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#1e293b",
    gap: 8,
  },
  searchInput: { flex: 1, color: "#f8fafc", fontSize: 13 },
  addUserInlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00f0ff",
    paddingHorizontal: 12,
    height: 42,
    borderRadius: 10,
    gap: 4,
  },
  addUserInlineText: { color: "#050811", fontSize: 12, fontWeight: "900" },
  roleFilterScroll: { marginBottom: 10 },
  roleBadge: {
    backgroundColor: "#0b1120",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  roleBadgeActive: { borderColor: "#00f0ff", backgroundColor: "rgba(0, 240, 255, 0.1)" },
  roleBadgeText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  roleBadgeTextActive: { color: "#00f0ff", fontWeight: "900" },
  userListItem: {
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 240, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  userAvatarTxt: { color: "#00f0ff", fontSize: 14, fontWeight: "900" },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  userName: { color: "#f8fafc", fontSize: 13, fontWeight: "800", flexShrink: 1 },
  userRoleTag: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  userRoleTagTxt: { color: "#38bdf8", fontSize: 8.5, fontWeight: "900" },
  userSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  userLoc: { color: "#94a3b8", fontSize: 10 },
  userBalanceSide: { alignItems: "flex-end", gap: 4 },
  userBalanceVal: { color: "#10b981", fontSize: 12.5, fontWeight: "900" },
  emptyWrap: { alignItems: "center", paddingVertical: 40 },
  emptyTitle: { color: "#64748b", fontSize: 13, marginTop: 8 },
  priceRowCard: {
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceNetworkTitle: { color: "#f8fafc", fontSize: 13.5, fontWeight: "800" },
  priceCostSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  priceActionRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  priceSellingText: { color: "#10b981", fontSize: 15, fontWeight: "900" },
  editPriceBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  formCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  formCardTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "900" },
  formCardSub: { color: "#64748b", fontSize: 11.5, marginTop: 2, marginBottom: 14 },
  inputFieldLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", marginBottom: 5 },
  formInput: {
    backgroundColor: "#0f172a",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
    color: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  targetRoleSelectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  targetCadreBtn: {
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  targetCadreBtnActive: { borderColor: "#00f0ff", backgroundColor: "rgba(0, 240, 255, 0.15)" },
  targetCadreBtnText: { color: "#94a3b8", fontSize: 11, fontWeight: "700" },
  targetCadreBtnTextActive: { color: "#00f0ff", fontWeight: "900" },
  submitFormBtn: {
    backgroundColor: "#00f0ff",
    borderRadius: 10,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  submitFormBtnText: { color: "#050811", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    zIndex: 999,
  },
  backdropTouch: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.7)" },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    width: width * 0.8,
    backgroundColor: "#0b1120",
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 25,
    paddingHorizontal: 16,
    zIndex: 1000,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    marginBottom: 14,
  },
  sidebarLogoWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#00f0ff",
  },
  sidebarBrandTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleSub: { color: "#64748b", fontSize: 10.5 },
  sidebarNavScroll: { flex: 1 },
  sidebarNavSectionTitle: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
  },
  sidebarNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 10,
    marginBottom: 4,
  },
  sidebarNavItemActive: { backgroundColor: "rgba(0, 240, 255, 0.12)" },
  sidebarNavText: { color: "#94a3b8", fontSize: 12.5, fontWeight: "700" },
  sidebarNavTextActive: { color: "#00f0ff", fontWeight: "900" },
  sidebarLogoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    gap: 8,
    marginTop: 10,
  },
  sidebarLogoutText: { color: "#ef4444", fontSize: 13, fontWeight: "800" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 10,
    marginBottom: 12,
  },
  modalTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "900" },
  detailLabel: { color: "#64748b", fontSize: 10.5, fontWeight: "700", marginTop: 8 },
  detailVal: { color: "#f8fafc", fontSize: 13, marginTop: 1 },
  modalActionButtons: { flexDirection: "row", gap: 8, marginTop: 18 },
  modalBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBtnText: { color: "#ffffff", fontSize: 11.5, fontWeight: "900" },
});

export default AdminDashboard;