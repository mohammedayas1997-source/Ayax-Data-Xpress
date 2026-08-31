import React, { useState, useEffect, useContext, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  ToastAndroid,
  Linking,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  AppState,
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
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

let ThemeContext;
try {
  ThemeContext = require("../../context/ThemeContext").ThemeContext;
} catch (e) {
  try {
    ThemeContext = require("../context/ThemeContext").ThemeContext;
  } catch (err) {
    ThemeContext = React.createContext({ isDarkMode: false });
  }
}

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";
const VIRTUAL_ACC_KEY = "userVirtualAccount";

const AgentDashboard = ({ navigation }) => {
  const contextValue = useContext(ThemeContext) || {};
  const isDarkMode = contextValue.isDarkMode !== undefined ? contextValue.isDarkMode : false;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Dedicated Virtual Account States
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

  // AppState Ref don gano lokacin da ya dawo cikin app
  const appState = useRef(AppState.currentState);

  // Validation don gano sahihiyar lambar asusu
  const isValidAccountNumber = (accNo) => {
    if (!accNo) return false;
    const str = String(accNo).trim();
    if (
      str.toLowerCase().includes("pending") ||
      str.toLowerCase().includes("null") ||
      str.toLowerCase().includes("undefined") ||
      str.length < 7
    ) {
      return false;
    }
    return true;
  };

  const extractVirtualAccount = (user) => {
    if (!user) return null;

    const rawNum =
      user.virtualAccount?.accountNumber ||
      user.virtualAccount?.account_number ||
      user.dva?.accountNumber ||
      user.dva?.account_number ||
      user.accountNumber ||
      user.virtualAccountNumber;

    if (isValidAccountNumber(rawNum)) {
      return {
        bankName:
          user.virtualAccount?.bankName ||
          user.virtualAccount?.bank_name ||
          user.dva?.bankName ||
          user.dva?.bank_name ||
          user.bankName ||
          "Wema Bank",
        accountName:
          user.virtualAccount?.accountName ||
          user.virtualAccount?.account_name ||
          user.dva?.accountName ||
          user.dva?.account_name ||
          user.accountName ||
          user.name ||
          "Ayax Agent",
        accountNumber: String(rawNum).trim(),
      };
    } else if (Array.isArray(user.virtualAccounts) && user.virtualAccounts.length > 0) {
      const first = user.virtualAccounts[0];
      const firstNum = first.accountNumber || first.account_number;
      if (isValidAccountNumber(firstNum)) {
        return {
          bankName: first.bankName || first.bank_name || "Wema Bank",
          accountName: first.accountName || first.account_name || user.name,
          accountNumber: String(firstNum).trim(),
        };
      }
    }
    return null;
  };

  // 1. Dauko adanannen asusu nan take ba tare da jiran internet ba
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [cachedAcc, cachedUser] = await Promise.all([
          AsyncStorage.getItem(VIRTUAL_ACC_KEY),
          AsyncStorage.getItem("userData"),
        ]);

        if (cachedAcc) {
          const parsed = JSON.parse(cachedAcc);
          if (isValidAccountNumber(parsed?.accountNumber)) {
            setVirtualAccount(parsed);
          }
        }
        if (cachedUser) {
          const parsedUser = JSON.parse(cachedUser);
          setUserData(parsedUser);
          if (!cachedAcc) {
            const extracted = extractVirtualAccount(parsedUser);
            if (extracted) {
              setVirtualAccount(extracted);
              await AsyncStorage.setItem(VIRTUAL_ACC_KEY, JSON.stringify(extracted));
            }
          }
        }
      } catch (e) {
        console.log("Cache load error:", e.message);
      }
    };
    loadCachedData();
  }, []);

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

  // 2. Real-time Live Synchronization (Ba zai taba daskarewa ba)
  const fetchAgentDashboardData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (!token) {
        if (!isBackground) {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
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
        timeout: 10000,
      };

      const [profileRes, perfRes, supRes, notifRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/profile`, config).catch(() => ({ data: { success: false } })),
        axios.get(`${BASE_URL}/agent/performance`, config).catch(() => ({ data: { data: null } })),
        axios.get(`${BASE_URL}/agent/my-supervisor`, config).catch(() => ({ data: { data: null } })),
        axios.get(`${BASE_URL}/notifications`, config).catch(() =>
          axios.get(`${BASE_URL}/notifications/my-notifications`, config).catch(() => ({ data: [] }))
        ),
      ]);

      const user = profileRes.data?.user || profileRes.data?.data || parsedLocalUser;
      if (user) {
        setUserData(user);
        await AsyncStorage.setItem("userData", JSON.stringify(user));

        const activeAcc = extractVirtualAccount(user);
        if (activeAcc && isValidAccountNumber(activeAcc.accountNumber)) {
          setVirtualAccount(activeAcc);
          await AsyncStorage.setItem(VIRTUAL_ACC_KEY, JSON.stringify(activeAcc));
        } else {
          const cached = await AsyncStorage.getItem(VIRTUAL_ACC_KEY);
          if (cached) {
            const parsedCached = JSON.parse(cached);
            if (isValidAccountNumber(parsedCached?.accountNumber)) {
              setVirtualAccount(parsedCached);
            }
          }
        }

        const tg = user.targets || {};
        setAgentQuota({
          dataGoal: Number(tg.dataGoal || user.dataGoal || 100),
          airtimeGoal: Number(tg.airtimeGoal || user.airtimeGoal || 10000),
          dataSold: Number(user.dataSold || user.dataVolumeSold || 0),
          airtimeSold: Number(user.airtimeSold || 0),
          currentMonth: tg.currentMonth || "August 2026",
        });
      }

      if (perfRes.data?.data) {
        setPerformance(perfRes.data.data);
      }

      if (supRes.data?.data || user?.assignedSupervisor) {
        const sup = supRes.data?.data || user?.assignedSupervisor;
        setAssignedSupervisor(typeof sup === "object" ? sup : { name: "LGA Supervisor", phone: "" });
      }

      const rawNotifs = notifRes.data?.notifications || notifRes.data?.data || notifRes.data || [];
      const notifsList = Array.isArray(rawNotifs) ? rawNotifs : [];
      setNotifications(notifsList);
      setUnreadCount(notifsList.filter((n) => n.isRead === false || n.read === false || n.status === "unread").length);
    } catch (err) {
      if (err.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } finally {
      if (!isBackground) setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // REAL LIVE HEARTBEAT & AUTO-REFRESH ENGINE (Kowane 3.5 Seconds a Raye)
  useFocusEffect(
    useCallback(() => {
      fetchAgentDashboardData(true);
      const liveInterval = setInterval(() => {
        fetchAgentDashboardData(true);
      }, 3500);

      return () => clearInterval(liveInterval);
    }, [fetchAgentDashboardData])
  );

  // AppState Listener: Idan Agent ya tura kudi ta bank ya dawo app din, yayi refreshing a take
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === "active") {
        fetchAgentDashboardData(true);
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [fetchAgentDashboardData]);

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchAgentDashboardData(false);
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

  // 3. Kirkirar Virtual Account da Adana shi Dindindin
  const handleGetVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const response = await axios.post(`${BASE_URL}/virtual-account/create`, {}, { headers });

      if (response.data && response.data.success) {
        const accData = response.data.data || response.data.virtualAccount || response.data.account;
        const accNum = accData?.accountNumber || accData?.account_number;

        if (isValidAccountNumber(accNum)) {
          const formattedAcc = {
            bankName: accData?.bankName || accData?.bank_name || "Wema Bank",
            accountName: accData?.accountName || accData?.account_name || userData?.name || "Ayax Agent",
            accountNumber: String(accNum).trim(),
          };

          setVirtualAccount(formattedAcc);
          await AsyncStorage.setItem(VIRTUAL_ACC_KEY, JSON.stringify(formattedAcc));

          if (Platform.OS === "android") {
            ToastAndroid.show("Virtual account ready!", ToastAndroid.SHORT);
          } else {
            Alert.alert("Success", "Dedicated account generated successfully!");
          }
          await fetchAgentDashboardData(true);
          return;
        }
      }
      Alert.alert("Notice", response.data?.message || "Could not generate account. Please try again.");
    } catch (error) {
      console.error("Virtual Account Error:", error.response?.data || error.message);
      Alert.alert("Error", error.response?.data?.message || "Could not generate virtual account.");
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
    const phoneNumber = "+2349033738409";
    const message = `Hello Ayax Data Xpress Support, I am Retail Agent ${userData?.name || userData?.phone}. I need assistance with my account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`)
    );
  };

  const dataPercent = Math.min(Math.round(((agentQuota.dataSold || 0) / (agentQuota.dataGoal || 1)) * 100), 100);
  const airtimePercent = Math.min(Math.round(((agentQuota.airtimeSold || 0) / (agentQuota.airtimeGoal || 1)) * 100), 100);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <ActivityIndicator size="large" color="#0284c7" />
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
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={24} color="#0284c7" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {userData
              ? `${userData.firstName || userData.name || userData.surname || "Retail Agent"}`
              : "Synchronizing..."}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onManualRefresh}
            tintColor="#0284c7"
            colors={["#0284c7"]}
          />
        }
      >
        {/* WALLET FLOATING BALANCE CARD */}
        <LinearGradient
          colors={["#0284c7", "#0369a1", "#075985"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.walletCard}
        >
          <View style={styles.walletTop}>
            <View style={styles.shieldRow}>
              <Ionicons name="shield-checkmark" size={15} color="#e0f2fe" />
              <Text style={styles.walletLabel}>AVAILABLE WALLET BALANCE</Text>
            </View>
            <TouchableOpacity
              style={styles.historyPill}
              onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
              activeOpacity={0.7}
            >
              <Text style={styles.historyText}>History</Text>
              <Ionicons name="chevron-forward" size={12} color="#ffffff" />
            </TouchableOpacity>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.currency}>₦</Text>
            <Text style={styles.balanceText}>
              {isBalanceVisible
                ? Number(userData?.walletBalance || userData?.balance || 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "••••••••"}
            </Text>
            <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)} style={styles.eyeToggle}>
              <Ionicons
                name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                size={22}
                color="#e0f2fe"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.walletActions}>
            <TouchableOpacity
              style={styles.fundBtn}
              onPress={() => navigation.navigate("FundWallet")}
              activeOpacity={0.85}
            >
              <View style={styles.fundBtnInner}>
                <Ionicons name="add-circle" size={18} color="#0369a1" />
                <Text style={styles.actionBtnText}>FUND WALLET</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.supportBtn}
              onPress={openWhatsApp}
              activeOpacity={0.85}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
              <Text style={styles.supportBtnText}>WHATSAPP</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* REAL-TIME TARGET & PERFORMANCE TRACKING */}
        <View style={styles.executiveTargetCardDark}>
          <View style={styles.execHeaderRowDark}>
            <View>
              <Text style={styles.execBadgeTextDark}>OFFICIAL SUPERVISOR QUOTA ALLOCATION</Text>
              <Text style={styles.execTitleTextDark}>{agentQuota.currentMonth.toUpperCase()} PERFORMANCE</Text>
            </View>
            <View style={styles.cycleBadgeDark}>
              <Ionicons name="calendar" size={12} color="#38bdf8" />
              <Text style={styles.cycleBadgeTextDark}>{agentQuota.currentMonth}</Text>
            </View>
          </View>

          <View style={styles.execMetricsRow}>
            {/* Data Quota */}
            <View style={styles.execMetricBoxDark}>
              <Text style={[styles.execMetricLabelDark, { color: "#38bdf8" }]}>DATA QUOTA (GB)</Text>
              <Text style={styles.execMetricValueDark}>
                {agentQuota.dataSold} / {agentQuota.dataGoal} GB
              </Text>
              <View style={styles.execProgressBarBgDark}>
                <View style={[styles.execProgressBarFill, { width: `${dataPercent}%`, backgroundColor: "#38bdf8" }]} />
              </View>
              <Text style={styles.execPercentSubDark}>{dataPercent}% Delivered</Text>
            </View>

            {/* Airtime Quota */}
            <View style={styles.execMetricBoxDark}>
              <Text style={[styles.execMetricLabelDark, { color: "#fbbf24" }]}>AIRTIME SALES (₦)</Text>
              <Text style={styles.execMetricValueDark}>
                ₦{Number(agentQuota.airtimeSold).toLocaleString()} / ₦{Number(agentQuota.airtimeGoal).toLocaleString()}
              </Text>
              <View style={styles.execProgressBarBgDark}>
                <View style={[styles.execProgressBarFill, { width: `${airtimePercent}%`, backgroundColor: "#fbbf24" }]} />
              </View>
              <Text style={styles.execPercentSubDark}>{airtimePercent}% Delivered</Text>
            </View>
          </View>
        </View>

        {/* DEDICATED VIRTUAL ACCOUNT CARD (AUTOMATED FUNDING) */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>DEDICATED AUTOMATED ACCOUNT</Text>
          <View style={styles.autoPill}>
            <View style={styles.greenPulse} />
            <Text style={styles.autoPillText}>Instant Credit</Text>
          </View>
        </View>

        <View style={styles.dvaCard}>
          {virtualAccount && isValidAccountNumber(virtualAccount.accountNumber) ? (
            <View>
              <View style={styles.dvaTopRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.bankNameText}>{virtualAccount.bankName}</Text>
                  <Text style={styles.accountNameText}>{virtualAccount.accountName}</Text>
                </View>
                <TouchableOpacity
                  style={styles.copyAccBtn}
                  onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={14} color="#ffffff" />
                  <Text style={styles.copyText}>COPY</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accNumberRow}>
                <Text style={styles.accountNumberVal}>{virtualAccount.accountNumber}</Text>
              </View>
              <Text style={styles.dvaNote}>
                Transfer directly to this account to fund your wallet automatically.
              </Text>
            </View>
          ) : (
            <View style={styles.noAccountContainer}>
              <Ionicons name="card-outline" size={28} color="#0284c7" style={{ marginBottom: 6 }} />
              <Text style={styles.noAccText}>
                Your personal automated deposit bank account is ready for generation.
              </Text>
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={handleGetVirtualAccount}
                disabled={loadingAccount}
                activeOpacity={0.85}
              >
                {loadingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={14} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.generateBtnText}>Activate Virtual Account</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* AGENT UTILITIES SERVICES */}
        <Text style={styles.sectionLabel}>RETAIL SERVICES & DISPENSER</Text>
        <View style={styles.servicesContainer}>
          <View style={styles.grid}>
            <ServiceItem
              icon="wifi"
              color="#0284c7"
              bg="#e0f2fe"
              label="Buy Data"
              onPress={() => navigation.navigate("BuyData")}
            />
            <ServiceItem
              icon="phone-alt"
              color="#16a34a"
              bg="#dcfce7"
              label="Airtime VTU"
              onPress={() => navigation.navigate("BuyAirtime")}
            />
            <ServiceItem
              icon="bolt"
              color="#d97706"
              bg="#fef3c7"
              label="Electricity"
              onPress={() => navigation.navigate("Electricity")}
            />
            <ServiceItem
              icon="tv"
              color="#7c3aed"
              bg="#ede9fe"
              label="Cable TV"
              onPress={() => navigation.navigate("Cable")}
            />
            <ServiceItem
              icon="id-card"
              color="#0284c7"
              bg="#e0f2fe"
              label="NIMC Verify"
              onPress={() => navigation.navigate("NIMC")}
            />
            <ServiceItem
              icon="fingerprint"
              color="#e11d48"
              bg="#ffe4e6"
              label="NIMC Mod"
              onPress={() => navigation.navigate("NIMCModification")}
            />
            <ServiceItem
              icon="user-shield"
              color="#ea580c"
              bg="#ffedd5"
              label="BVN Desk"
              onPress={() => navigation.navigate("BVNScreen")}
            />
            <ServiceItem
              icon="shield-alt"
              color="#4f46e5"
              bg="#e0e7ff"
              label="NIN Validate"
              onPress={() => navigation.navigate("NINValidation")}
            />
            <ServiceItem
              icon="history"
              color="#0284c7"
              bg="#e0f2fe"
              label="History"
              onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
            />
          </View>
        </View>

        {/* ASSIGNED FIELD SUPERVISOR SECTION */}
        <Text style={styles.sectionLabel}>LGA FIELD SUPERVISOR LEAD</Text>
        <View style={styles.supervisorCard}>
          <View style={styles.supAvatar}>
            <FontAwesome5 name="user-tie" size={18} color="#0284c7" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.supName}>
              {assignedSupervisor?.name || "Field Operations Desk"}
            </Text>
            <Text style={styles.supSub}>
              {userData?.lga ? `${userData.lga} LGA Coordinator` : "LGA Coordinator"} • {assignedSupervisor?.phone || "09033738409"}
            </Text>
          </View>
          {assignedSupervisor?.phone && (
            <TouchableOpacity
              style={styles.supCallBtn}
              onPress={() => Linking.openURL(`tel:${assignedSupervisor.phone}`)}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={15} color="#0284c7" />
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
                <MaterialCommunityIcons name="cellphone-wireless" size={26} color="#0284c7" />
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
                <View style={[styles.navIconBox, { backgroundColor: "#e0f2fe" }]}>
                  <FontAwesome5 name="wifi" size={14} color="#0284c7" />
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
                <View style={[styles.navIconBox, { backgroundColor: "#dcfce7" }]}>
                  <FontAwesome5 name="phone-alt" size={14} color="#16a34a" />
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
                <View style={[styles.navIconBox, { backgroundColor: "#e0f2fe" }]}>
                  <Ionicons name="person-outline" size={16} color="#0284c7" />
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
                <View style={[styles.navIconBox, { backgroundColor: "#dcfce7" }]}>
                  <Ionicons name="logo-whatsapp" size={16} color="#16a34a" />
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
        <TabItem icon="home" label="Home" active onPress={() => {}} />
        <TabItem
          icon="receipt-outline"
          label="History"
          onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
        />
        <TabItem
          icon="person-outline"
          label="Profile"
          onPress={() => navigation.navigate("Profile")}
        />
        <TabItem
          icon="chatbubble-ellipses-outline"
          label="Support"
          onPress={openWhatsApp}
        />
      </View>
    </View>
  );
};

const ServiceItem = ({ icon, label, color, bg, onPress }) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.75}>
    <View style={[styles.iconBox, { backgroundColor: bg }]}>
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text style={styles.gridLabel} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
    <Ionicons name={icon} size={22} color={active ? "#0284c7" : "#64748b"} />
    <Text
      style={[
        styles.tabLabel,
        { color: active ? "#0284c7" : "#64748b", fontWeight: active ? "800" : "600" },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 10 },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 52 : 40,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  menuIconBtn: { padding: 4 },
  agentBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a", marginRight: 6 },
  agentBadgeText: { color: "#0369a1", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  notifBtn: { position: "relative", padding: 4 },
  badge: {
    position: "absolute",
    right: 0,
    top: 0,
    backgroundColor: "#ef4444",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 9, fontWeight: "bold" },
  welcomeSection: { marginTop: 4 },
  welcomeText: { color: "#64748b", fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  userName: { color: "#0f172a", fontSize: 21, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  scrollContent: { paddingHorizontal: isLargeScreen ? 24 : 16, paddingTop: 14, paddingBottom: 110 },

  walletCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  shieldRow: { flexDirection: "row", alignItems: "center" },
  walletLabel: { color: "#e0f2fe", fontSize: 10.5, fontWeight: "900", letterSpacing: 0.8, marginLeft: 6 },
  historyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 9,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  historyText: { color: "#ffffff", fontSize: 10.5, fontWeight: "800", marginRight: 2 },
  balanceContainer: { flexDirection: "row", alignItems: "center", marginVertical: 14 },
  currency: { color: "#e0f2fe", fontSize: 24, fontWeight: "900" },
  balanceText: { color: "#ffffff", fontSize: 30, fontWeight: "900", marginLeft: 6, letterSpacing: -0.5 },
  eyeToggle: { padding: 6, marginLeft: 8 },
  walletActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 6 },
  fundBtn: { flex: 0.48, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: "#ffffff" },
  fundBtnInner: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  supportBtn: {
    flex: 0.48,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  actionBtnText: { color: "#0369a1", fontWeight: "900", fontSize: 11.5, marginLeft: 6, letterSpacing: 0.5 },
  supportBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 11.5, marginLeft: 6, letterSpacing: 0.5 },

  // EXECUTIVE TARGET CARD DARK
  executiveTargetCardDark: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderLeftWidth: 5,
    borderLeftColor: "#38bdf8",
    elevation: 3,
  },
  execHeaderRowDark: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingBottom: 8,
    marginBottom: 10,
  },
  execBadgeTextDark: { color: "#94a3b8", fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  execTitleTextDark: { color: "#ffffff", fontSize: 12.5, fontWeight: "900", marginTop: 2 },
  cycleBadgeDark: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
  },
  cycleBadgeTextDark: { color: "#38bdf8", fontSize: 10, fontWeight: "800", marginLeft: 3 },
  execMetricsRow: { flexDirection: "row", justifyContent: "space-between" },
  execMetricBoxDark: {
    flex: 0.485,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  execMetricLabelDark: { fontSize: 9.5, fontWeight: "800" },
  execMetricValueDark: { fontSize: 14, fontWeight: "900", marginVertical: 3, color: "#ffffff" },
  execProgressBarBgDark: { height: 6, backgroundColor: "#334155", borderRadius: 3, overflow: "hidden", marginVertical: 3 },
  execProgressBarFill: { height: 6, borderRadius: 3 },
  execPercentSubDark: { color: "#94a3b8", fontSize: 9.5, fontWeight: "700" },

  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.8,
    color: "#475569",
    marginBottom: 8,
  },
  autoPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  greenPulse: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: "#16a34a", marginRight: 5 },
  autoPillText: { color: "#15803d", fontSize: 9.5, fontWeight: "900" },

  dvaCard: {
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dvaTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  bankNameText: { fontSize: 13.5, fontWeight: "900", color: "#0284c7" },
  accountNameText: { fontSize: 11.5, color: "#64748b", fontWeight: "600", marginTop: 1 },
  copyAccBtn: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 5.5,
    borderRadius: 8,
  },
  copyText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },
  accNumberRow: { marginVertical: 4 },
  accountNumberVal: { fontSize: 22, fontWeight: "900", letterSpacing: 2, color: "#0f172a" },
  dvaNote: { fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: "600" },
  noAccountContainer: { alignItems: "center", paddingVertical: 10 },
  noAccText: { fontSize: 11.5, textAlign: "center", color: "#64748b", marginBottom: 10, lineHeight: 16 },
  generateBtn: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  generateBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },

  servicesContainer: {
    borderRadius: 18,
    paddingTop: 16,
    paddingHorizontal: 8,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 16,
    elevation: 2,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: "31%", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  gridLabel: { fontSize: 11, textAlign: "center", fontWeight: "800", color: "#1e293b" },

  supervisorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  supAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#e0f2fe",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  supName: { color: "#0f172a", fontSize: 13.5, fontWeight: "800" },
  supSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  supCallBtn: {
    backgroundColor: "#e0f2fe",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },

  bottomTab: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === "ios" ? 82 : 66,
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingBottom: Platform.OS === "ios" ? 20 : 6,
    paddingTop: 8,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLabel: { fontSize: 10, marginTop: 3 },

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
  sidebarRoleText: { color: "#0284c7", fontSize: 10.5, fontWeight: "700" },
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
  navIconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: "center", alignItems: "center" },
  navItemText: { color: "#334155", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
  },
  logoutBtnText: { color: "#dc2626", fontSize: 13, fontWeight: "800", marginLeft: 10 },
});

export default AgentDashboard;