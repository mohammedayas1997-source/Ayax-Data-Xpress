import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  ToastAndroid,
  ImageBackground,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
  Feather,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AgentDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDarkMode } = useContext(ThemeContext);

  // Dedicated Virtual Account
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Real-Time Quota Targets & Performance
  const [agentQuota, setAgentQuota] = useState({
    dataGoal: 100,
    airtimeGoal: 10000,
    dataSold: 0,
    airtimeSold: 0,
    currentMonth: "August 2026",
  });

  const [performance, setPerformance] = useState({
    totalGB: 0,
    totalSalesValue: 0,
    commissionsEarned: 0,
    bonusEarned: 0,
  });

  const [assignedSupervisor, setAssignedSupervisor] = useState(null);

  // Sidebar Drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 320);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

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

  const fetchAgentDashboardData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      let parsedLocalUser = {};
      if (storedUserData) {
        try {
          parsedLocalUser = JSON.parse(storedUserData);
        } catch (e) {
          parsedLocalUser = {};
        }
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 15000,
      };

      const [profileRes, perfRes, supRes, notifRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/profile`, config).catch(() => ({ data: { success: false } })),
        axios.get(`${BASE_URL}/agent/performance`, config).catch(() => ({ data: { data: null } })),
        axios.get(`${BASE_URL}/agent/my-supervisor`, config).catch(() => ({ data: { data: null } })),
        axios.get(`${BASE_URL}/notifications`, config).catch(() => ({ data: [] })),
      ]);

      // 1. Profile Data
      const user = profileRes.data?.user || profileRes.data?.data || parsedLocalUser;
      if (user) {
        setUserData(user);
        if (user.virtualAccount?.accountNumber) {
          setVirtualAccount(user.virtualAccount);
        } else if (user.accountNumber && user.accountNumber !== "Pending") {
          setVirtualAccount({
            bankName: user.bankName || "Wema Bank",
            accountNumber: user.accountNumber,
            accountName: user.accountName || user.name,
          });
        }

        // Quotas da Targets
        const tg = user.targets || {};
        setAgentQuota({
          dataGoal: Number(tg.dataGoal) || 100,
          airtimeGoal: Number(tg.airtimeGoal) || 10000,
          dataSold: Number(user.dataSold || user.dataVolumeSold || 0),
          airtimeSold: Number(user.airtimeSold || 0),
          currentMonth: tg.currentMonth || "August 2026",
        });
      }

      // 2. Performance Metrics
      if (perfRes.data?.data) {
        setPerformance(perfRes.data.data);
      }

      // 3. Supervisor Assignment
      if (supRes.data?.data || user?.assignedSupervisor) {
        const sup = supRes.data?.data || user.assignedSupervisor;
        setAssignedSupervisor(typeof sup === "object" ? sup : { name: "LGA Supervisor", phone: "" });
      }

      // 4. Notifications
      const notifs = Array.isArray(notifRes.data) ? notifRes.data : notifRes.data?.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => n.read === false || !n.isRead).length);
    } catch (err) {
      if (err.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        console.log("Agent Dashboard Sync Error:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchAgentDashboardData();
    const interval = setInterval(() => {
      fetchAgentDashboardData(true);
    }, 20000);
    return () => clearInterval(interval);
  }, [fetchAgentDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgentDashboardData();
  };

  const handleLogout = async () => {
    const doLogout = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Do you want to log out of your Agent terminal?")) doLogout();
    } else {
      Alert.alert("Confirm Logout", "Exit current Agent session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: doLogout },
      ]);
    }
  };

  const handleGetVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.post(
        `${BASE_URL}/virtual-account/create`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data?.success) {
        setVirtualAccount(response.data.data);
        showAlert("Success", "Virtual bank account provisioned!");
      }
    } catch (error) {
      showAlert("Error", error.response?.data?.message || "Could not generate account.");
    } finally {
      setLoadingAccount(false);
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    Clipboard.setStringAsync(text);
    if (Platform.OS === "android") {
      ToastAndroid.show("Copied to clipboard", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", text);
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = "+2349061244444";
    const message = `Hello Ayax Support, I am Retail Agent ${userData?.name || userData?.phone}. I need assistance.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() => Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`));
  };

  const dataPercent = Math.min(Math.round(((agentQuota.dataSold || 0) / (agentQuota.dataGoal || 1)) * 100), 100);
  const airtimePercent = Math.min(Math.round(((agentQuota.airtimeSold || 0) / (agentQuota.airtimeGoal || 1)) * 100), 100);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color="#1e40af" />
        <Text style={styles.loaderText}>Connecting to Retail Telecom Node...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      {/* TOP HEADER */}
      <View style={styles.topHeader}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
            <Feather name="menu" size={24} color="#0f172a" />
          </TouchableOpacity>

          <View style={styles.agentBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.agentBadgeText}>
              {userData?.lga ? `${userData.lga.toUpperCase()} LGA` : "RETAIL AGENT"} • {userData?.state ? userData.state.toUpperCase() : "NIGERIA"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => navigation.navigate("Notifications")}
            style={styles.notifBtn}
          >
            <Ionicons name="notifications-outline" size={24} color="#0f172a" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Agent Retail Terminal,</Text>
          <Text style={styles.userName}>
            {userData?.name || `${userData?.firstName || "Retail"} ${userData?.surname || "Agent"}`}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e40af" />}
      >
        {/* WALLET FLOATING BALANCE CARD */}
        <LinearGradient colors={["#0f172a", "#1e40af"]} style={styles.walletCard}>
          <View style={styles.walletTop}>
            <Text style={styles.walletLabel}>AGENT WORKING FLOAT</Text>
            <TouchableOpacity onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}>
              <Text style={styles.historyText}>
                Transactions <Ionicons name="chevron-forward" size={12} />
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.currency}>₦</Text>
            <Text style={styles.balanceText}>
              {isBalanceVisible ? Number(userData?.walletBalance || userData?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "••••••••"}
            </Text>
            <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)}>
              <Ionicons
                name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#38bdf8"
                style={{ marginLeft: 12 }}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.walletActions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => navigation.navigate("FundWallet")}
              activeOpacity={0.85}
            >
              <LinearGradient colors={["#0284c7", "#1e40af"]} style={styles.innerBtnGradient}>
                <Ionicons name="add-circle" size={16} color="#fff" />
                <Text style={styles.actionBtnText}>FUND FLOAT</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.12)" }]}
              onPress={openWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#22c55e" />
              <Text style={[styles.actionBtnText, { color: "#fff" }]}>SUPPORT</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* REAL-TIME TARGET & PERFORMANCE TRACKING (DATA + AIRTIME) */}
        <View style={styles.executiveTargetCard}>
          <View style={styles.execHeaderRow}>
            <View>
              <Text style={styles.execBadgeText}>OFFICIAL SUPERVISOR QUOTA ALLOCATION</Text>
              <Text style={styles.execTitleText}>{agentQuota.currentMonth.toUpperCase()} PERFORMANCE</Text>
            </View>
            <View style={styles.cycleBadge}>
              <Ionicons name="calendar" size={12} color="#1e40af" />
              <Text style={styles.cycleBadgeText}>{agentQuota.currentMonth}</Text>
            </View>
          </View>

          <View style={styles.execMetricsRow}>
            {/* Data Quota */}
            <View style={styles.execMetricBox}>
              <Text style={styles.execMetricLabel}>DATA QUOTA (GB)</Text>
              <Text style={[styles.execMetricValue, { color: "#1e40af" }]}>
                {agentQuota.dataSold} / {agentQuota.dataGoal} GB
              </Text>
              <View style={styles.execProgressBarBg}>
                <View style={[styles.execProgressBarFill, { width: `${dataPercent}%`, backgroundColor: "#1e40af" }]} />
              </View>
              <Text style={styles.execPercentSub}>{dataPercent}% Delivered</Text>
            </View>

            {/* Airtime Quota */}
            <View style={styles.execMetricBox}>
              <Text style={styles.execMetricLabel}>AIRTIME SALES (₦)</Text>
              <Text style={[styles.execMetricValue, { color: "#d97706" }]}>
                ₦{Number(agentQuota.airtimeSold).toLocaleString()} / ₦{Number(agentQuota.airtimeGoal).toLocaleString()}
              </Text>
              <View style={styles.execProgressBarBg}>
                <View style={[styles.execProgressBarFill, { width: `${airtimePercent}%`, backgroundColor: "#d97706" }]} />
              </View>
              <Text style={styles.execPercentSub}>{airtimePercent}% Delivered</Text>
            </View>
          </View>
        </View>

        {/* DEDICATED VIRTUAL ACCOUNT CARD */}
        <Text style={styles.sectionLabel}>Automated Funding Account</Text>
        <View style={styles.dvaCard}>
          {virtualAccount ? (
            <View>
              <View style={styles.dvaTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankNameText}>{virtualAccount.bankName || "Wema Bank"}</Text>
                  <Text style={styles.accountNameText}>{virtualAccount.accountName || userData?.name}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyAccBtn}
                  onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                >
                  <Ionicons name="copy-outline" size={15} color="#fff" />
                  <Text style={styles.copyText}>Copy</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accNumberRow}>
                <Text style={styles.accountNumberVal}>{virtualAccount.accountNumber}</Text>
              </View>
              <Text style={styles.dvaNote}>
                Transfer any amount to this dedicated account for instant automated float credit.
              </Text>
            </View>
          ) : (
            <View style={styles.noAccountContainer}>
              <Text style={styles.noAccText}>No dedicated bank account generated yet.</Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGetVirtualAccount}
                disabled={loadingAccount}
              >
                {loadingAccount ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="card-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                    <Text style={styles.generateBtnText}>Get Dedicated Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AGENT UTILITIES SERVICES */}
        <Text style={styles.sectionLabel}>Retail Services & Dispenser</Text>
        <View style={styles.servicesCard}>
          <View style={styles.grid}>
            <ServiceItem
              icon="wifi"
              color="#0284c7"
              label="Buy Data"
              onPress={() => navigation.navigate("BuyData")}
            />
            <ServiceItem
              icon="phone-alt"
              color="#059669"
              label="Airtime VTU"
              onPress={() => navigation.navigate("BuyAirtime")}
            />
            <ServiceItem
              icon="bolt"
              color="#d97706"
              label="Electricity"
              onPress={() => navigation.navigate("Electricity")}
            />
            <ServiceItem
              icon="tv"
              color="#7c3aed"
              label="Cable TV"
              onPress={() => navigation.navigate("Cable")}
            />
            <ServiceItem
              icon="id-card"
              color="#dc2626"
              label="NIMC Verify"
              onPress={() => navigation.navigate("NIMC")}
            />
            <ServiceItem
              icon="fingerprint"
              color="#ec4899"
              label="NIMC Mod"
              onPress={() => navigation.navigate("NIMCModification")}
            />
            <ServiceItem
              icon="user-shield"
              color="#475569"
              label="BVN Search"
              onPress={() => navigation.navigate("BVNScreen")}
            />
            <ServiceItem
              icon="shield-alt"
              color="#1e40af"
              label="NIN Validation"
              onPress={() => navigation.navigate("NINValidation")}
            />
          </View>
        </View>

        {/* ASSIGNED FIELD SUPERVISOR SECTION */}
        <Text style={styles.sectionLabel}>LGA Field Supervisor Lead</Text>
        <View style={styles.supervisorCard}>
          <View style={styles.supAvatar}>
            <FontAwesome5 name="user-tie" size={18} color="#1e40af" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.supName}>
              {assignedSupervisor?.name || "Field Operations Desk"}
            </Text>
            <Text style={styles.supSub}>
              {userData?.lga || "LGA"} Coordinator • {assignedSupervisor?.phone || "08000000000"}
            </Text>
          </View>
          {assignedSupervisor?.phone && (
            <TouchableOpacity
              style={styles.supCallBtn}
              onPress={() => Linking.openURL(`tel:${assignedSupervisor.phone}`)}
            >
              <Ionicons name="call" size={15} color="#1e40af" />
            </TouchableOpacity>
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
                <MaterialCommunityIcons name="cellphone-wireless" size={26} color="#1e40af" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>Ayax Retail</Text>
                  <Text style={styles.sidebarRoleText}>Agent Terminal Node</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>SERVICES & UTILITIES</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("BuyData");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <FontAwesome5 name="wifi" size={14} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Dispense Data Bundles</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("BuyAirtime");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <FontAwesome5 name="phone-alt" size={14} color="#059669" />
                </View>
                <Text style={styles.navItemText}>Recharge Airtime VTU</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("Main", { screen: "Wallet History" });
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#fef3c7" }]}>
                  <FontAwesome5 name="history" size={14} color="#d97706" />
                </View>
                <Text style={styles.navItemText}>Transaction Records</Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>ACCOUNT</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("Profile");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#eff6ff" }]}>
                  <Ionicons name="person-outline" size={16} color="#1e40af" />
                </View>
                <Text style={styles.navItemText}>Agent Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  openWhatsApp();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "#ecfdf5" }]}>
                  <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                </View>
                <Text style={styles.navItemText}>Supervisor Help Desk</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={17} color="#dc2626" />
              <Text style={styles.logoutBtnText}>Logout Agent Terminal</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}

      {/* BOTTOM NAVIGATION TAB */}
      <View style={styles.bottomTab}>
        <TabItem icon="home" label="Dashboard" active onPress={() => {}} />
        <TabItem
          icon="time-outline"
          label="History"
          onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
        />
        <TabItem
          icon="person-outline"
          label="Profile"
          onPress={() => navigation.navigate("Profile")}
        />
        <TabItem
          icon="help-buoy-outline"
          label="Support"
          onPress={openWhatsApp}
        />
      </View>
    </View>
  );
};

const ServiceItem = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.75}>
    <View style={styles.iconBox}>
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text style={styles.gridLabel}>{label}</Text>
  </TouchableOpacity>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <Ionicons name={icon} size={22} color={active ? "#1e40af" : "#94a3b8"} />
    <Text style={[styles.tabLabel, { color: active ? "#1e40af" : "#94a3b8", fontWeight: active ? "800" : "500" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 10 },
  topHeader: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  menuIconBtn: { padding: 4 },
  agentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#059669", marginRight: 6 },
  agentBadgeText: { color: "#1e40af", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  notifBtn: { position: "relative", padding: 4 },
  badge: { position: "absolute", right: 0, top: 0, backgroundColor: "#ef4444", borderRadius: 8, width: 16, height: 16, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  welcomeSection: { marginTop: 4 },
  welcomeText: { color: "#64748b", fontSize: 12.5, fontWeight: "500" },
  userName: { color: "#0f172a", fontSize: 20, fontWeight: "900", marginTop: 1 },
  scrollContent: { paddingHorizontal: isLargeScreen ? 24 : 16, paddingTop: 14, paddingBottom: 100 },

  walletCard: { borderRadius: 16, padding: 18, marginBottom: 14, elevation: 4 },
  walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  walletLabel: { color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  historyText: { color: "#38bdf8", fontSize: 11.5, fontWeight: "700" },
  balanceContainer: { flexDirection: "row", alignItems: "center", marginVertical: 10 },
  currency: { color: "#fff", fontSize: 22, fontWeight: "600" },
  balanceText: { color: "#fff", fontSize: 30, fontWeight: "900", marginLeft: 6 },
  walletActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  actionBtn: { flex: 0.48, height: 42, borderRadius: 10, overflow: "hidden", justifyContent: "center", alignItems: "center", flexDirection: "row" },
  innerBtnGradient: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center", height: "100%" },
  actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 11, marginLeft: 6 },

  executiveTargetCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    borderLeftColor: "#1e40af",
    elevation: 2,
  },
  execHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#f1f5f9", paddingBottom: 8, marginBottom: 10 },
  execBadgeText: { color: "#64748b", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  execTitleText: { color: "#0f172a", fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  cycleBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "#eff6ff", paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: "#bfdbfe" },
  cycleBadgeText: { color: "#1e40af", fontSize: 10, fontWeight: "800", marginLeft: 3 },
  execMetricsRow: { flexDirection: "row", justifyContent: "space-between" },
  execMetricBox: { flex: 0.485, backgroundColor: "#f8fafc", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#e2e8f0" },
  execMetricLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "800" },
  execMetricValue: { fontSize: 14, fontWeight: "900", marginVertical: 3 },
  execProgressBarBg: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3, overflow: "hidden", marginVertical: 3 },
  execProgressBarFill: { height: 6, borderRadius: 3 },
  execPercentSub: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },

  sectionLabel: { fontSize: 12, fontWeight: "900", color: "#475569", letterSpacing: 0.8, marginTop: 6, marginBottom: 8, textTransform: "uppercase" },
  dvaCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0", elevation: 2 },
  dvaTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  bankNameText: { color: "#1e40af", fontSize: 13.5, fontWeight: "900" },
  accountNameText: { color: "#64748b", fontSize: 11, marginTop: 1 },
  copyAccBtn: { backgroundColor: "#1e40af", flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  copyText: { color: "#fff", fontSize: 11, fontWeight: "bold", marginLeft: 4 },
  accNumberRow: { marginVertical: 4 },
  accountNumberVal: { color: "#0f172a", fontSize: 20, fontWeight: "900", letterSpacing: 1 },
  dvaNote: { fontSize: 10, color: "#64748b", marginTop: 2 },
  noAccountContainer: { alignItems: "center", paddingVertical: 8 },
  noAccText: { fontSize: 11.5, color: "#64748b", marginBottom: 8 },
  generateBtn: { backgroundColor: "#1e40af", flexDirection: "row", alignItems: "center", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  generateBtnText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  servicesCard: { backgroundColor: "#ffffff", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0", elevation: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: "23%", alignItems: "center", marginVertical: 8 },
  iconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", marginBottom: 6, borderWidth: 1, borderColor: "#e2e8f0" },
  gridLabel: { color: "#334155", fontSize: 10.5, textAlign: "center", fontWeight: "700" },

  supervisorCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#ffffff", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "#e2e8f0", elevation: 1 },
  supAvatar: { width: 38, height: 38, borderRadius: 10, backgroundColor: "#eff6ff", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "#bfdbfe" },
  supName: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  supSub: { color: "#64748b", fontSize: 11, marginTop: 1 },
  supCallBtn: { backgroundColor: "#eff6ff", padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#bfdbfe" },

  bottomTab: { position: "absolute", bottom: 0, left: 0, right: 0, height: 60, backgroundColor: "#ffffff", flexDirection: "row", borderTopWidth: 1, borderTopColor: "#e2e8f0", alignItems: "center" },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLabel: { fontSize: 9.5, marginTop: 2 },

  sidebarBackdrop: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", zIndex: 100 },
  sidebarContainer: { position: "absolute", top: 0, bottom: 0, backgroundColor: "#ffffff", paddingTop: Platform.OS === "ios" ? 50 : 35, paddingHorizontal: 16, borderRightWidth: 1, borderRightColor: "#e2e8f0" },
  sidebarHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#1e40af", fontSize: 10.5, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 10 },
  sidebarCategory: { color: "#64748b", fontSize: 9.5, fontWeight: "900", letterSpacing: 1, marginTop: 16, marginBottom: 6, paddingLeft: 6 },
  navItem: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingHorizontal: 10, borderRadius: 10, marginBottom: 3 },
  navIconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  navItemText: { color: "#334155", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 16, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  logoutBtnText: { color: "#dc2626", fontSize: 13, fontWeight: "800", marginLeft: 10 },
});

export default AgentDashboard;