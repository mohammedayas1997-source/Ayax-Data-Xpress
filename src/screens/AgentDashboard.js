import React, { useState, useEffect, useContext } from "react";
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
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AgentDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { isDarkMode } = useContext(ThemeContext);

  // States na Virtual Account
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const [performance, setPerformance] = useState({
    totalGB: 0,
    totalSalesValue: 0,
    commissionsEarned: 0,
    bonusEarned: 0,
    monthlyTargetSales: 100000,
  });

  const [supervisor, setSupervisor] = useState(null);

  const fetchAgentAndProfileData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      };

      const [profileRes, perfRes, supRes] = await Promise.all([
        axios.get(`${BASE_URL}/user/profile`, config).catch(() => ({ data: { success: false } })),
        axios.get(`${BASE_URL}/agent/performance`, config).catch(() => ({ data: { data: null } })),
        axios.get(`${BASE_URL}/agent/my-supervisor`, config).catch(() => ({ data: { data: null } })),
      ]);

      if (profileRes.data && (profileRes.data.success || profileRes.data.user || profileRes.data.data)) {
        const user = profileRes.data.user || profileRes.data.data;
        setUserData(user);
        if (user.virtualAccount && user.virtualAccount.accountNumber) {
          setVirtualAccount(user.virtualAccount);
        }
      }

      if (perfRes.data?.data) {
        setPerformance(perfRes.data.data);
      }

      if (supRes.data?.data) {
        setSupervisor(supRes.data.data);
      } else {
        setSupervisor("No Supervisor Assigned Yet");
      }
    } catch (err) {
      console.log("Comprehensive Agent Dashboard Fetch Error:", err);

      if (err.response && err.response.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgentAndProfileData();
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await axios.get(`${BASE_URL}/notifications`);
        const data = response.data || [];
        setNotifications(data);
        const unread = data.filter((n) => n.read === false).length;
        setUnreadCount(unread);
      } catch (error) {
        console.log("Notification fetch error:", error);
      }
    };
    fetchNotifications();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgentAndProfileData();
  };

  // Aikin fetch ko kirkirar Virtual Account
  const handleGetVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");
      
      const response = await axios.post(
        `${BASE_URL}/virtual-account/create`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.data && response.data.success) {
        setVirtualAccount(response.data.data);
        if (Platform.OS === "android") {
          ToastAndroid.show("Virtual account ready!", ToastAndroid.SHORT);
        } else {
          Alert.alert("Success", "Virtual account generated successfully!");
        }
      }
    } catch (error) {
      console.error("Virtual Account Error:", error.response?.data || error.message);
      Alert.alert("Error", "Could not fetch or create virtual account. Try again later.");
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
    const message = `Hello Ayax Xpress Support, I need assistance with my Agent account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`)
    );
  };

  const currentSales = performance.totalSalesValue || 0;
  const targetSales = performance.monthlyTargetSales || 100000;
  const remainingToTarget = targetSales - currentSales > 0 ? targetSales - currentSales : 0;
  const achievementPercentage =
    targetSales > 0 ? Math.min(Math.round((currentSales / targetSales) * 100), 100) : 0;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDarkMode ? "#020617" : "#f8fafc" }]}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ImageBackground
        source={require("../assets/ayax_promo_hijab.png")}
        resizeMode="cover"
        style={{ flex: 1 }}
        imageStyle={{ opacity: 0.15 }}
      >
        <View style={styles.fullOverlayGradient}>
          <LinearGradient
            colors={["rgba(255,255,255,0.6)", "rgba(248,250,252,0.95)"]}
            style={styles.fullOverlay}
          />
        </View>

        <View style={styles.topHeader}>
          <View style={styles.navRow}>
            <View style={styles.logoCircle}>
              <Image source={require("../assets/Logo.png")} style={styles.logoImg} />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate("Notifications")}
              style={{ marginRight: 20 }}
            >
              <Ionicons
                name="notifications-outline"
                size={28}
                color={isDarkMode ? "#fff" : "#0f172a"}
              />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.openDrawer?.()}>
              <Ionicons name="menu" size={32} color={isDarkMode ? "#fff" : "#0f172a"} />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Agent Control Panel,</Text>
            <Text style={styles.userName}>
              {userData
                ? `${userData.firstName || userData.name || ""} ${userData.surname || ""}`
                : "Welcome Agent"}
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 180,
            flexGrow: 1,
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* Wallet Card */}
          <LinearGradient colors={["#1e40af", "#1e3a8a"]} style={styles.walletCard}>
            <View style={styles.walletTop}>
              <Text style={styles.walletLabel}>Agent Available Balance</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
              >
                <Text style={styles.historyText}>
                  Transactions <Ionicons name="chevron-forward" size={12} />
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceContainer}>
              <Text style={styles.currency}>₦</Text>
              <Text style={styles.balanceText}>
                {isBalanceVisible
                  ? userData?.walletBalance || userData?.balance || "0.00"
                  : "****"}
              </Text>
              <TouchableOpacity onPress={() => setIsBalanceVisible(!isBalanceVisible)}>
                <Ionicons
                  name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                  size={24}
                  color="#38bdf8"
                  style={{ marginLeft: 15 }}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.walletActions}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate("FundWallet")}
              >
                <LinearGradient colors={["#38bdf8", "#0ea5e9"]} style={styles.innerBtnGradient}>
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>FUND WALLET</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "rgba(255,255,255,0.15)" }]}
                onPress={openWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>SUPPORT</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Dedicated Virtual Account Section */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDarkMode ? "#fff" : "#1e293b" },
            ]}
          >
            My Dedicated Account
          </Text>

          <View
            style={[
              styles.dvaCard,
              { backgroundColor: isDarkMode ? "#0f172a" : "#fff" },
            ]}
          >
            {virtualAccount ? (
              <View>
                <View style={styles.dvaTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bankNameText, { color: isDarkMode ? "#38bdf8" : "#1e40af" }]}>
                      {virtualAccount.bankName}
                    </Text>
                    <Text style={[styles.accountNameText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                      {virtualAccount.accountName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyAccBtn}
                    onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                  >
                    <Ionicons name="copy-outline" size={18} color="#fff" />
                    <Text style={styles.copyText}>Copy</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.accNumberRow}>
                  <Text style={[styles.accountNumberVal, { color: isDarkMode ? "#fff" : "#0f172a" }]}>
                    {virtualAccount.accountNumber}
                  </Text>
                </View>
                <Text style={styles.dvaNote}>
                  Transfer any amount to this account for instant wallet funding.
                </Text>
              </View>
            ) : (
              <View style={styles.noAccountContainer}>
                <Text style={[styles.noAccText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                  You don't have an automated account assigned yet.
                </Text>
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
                      <Text style={styles.generateBtnText}>Get Virtual Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text style={styles.sectionLabel}>Performance Metrics</Text>

          <View style={styles.statsGrid}>
            <StatCard
              title="Monthly Volume"
              value={performance.totalGB || 0}
              unit="GB"
              color="#2563eb"
            />
            <StatCard
              title="Monthly Revenue"
              value={`₦${currentSales}`}
              unit=""
              color="#059669"
            />
          </View>

          <View style={styles.statsGridAlt}>
            <StatCard
              title="Commissions Earned"
              value={`₦${performance.commissionsEarned || 0}`}
              unit=""
              color="#d4af37"
            />
            <StatCard
              title="Bonus Earned"
              value={`₦${performance.bonusEarned || 0}`}
              unit=""
              color="#dc2626"
            />
          </View>

          <View style={styles.targetTrackingSection}>
            <Text style={styles.sectionTitle}>Target & Performance Tracking</Text>
            <View style={styles.targetCard}>
              <View style={styles.targetRow}>
                <View>
                  <Text style={styles.targetLabel}>Monthly Target</Text>
                  <Text style={styles.targetValue}>₦{targetSales}</Text>
                </View>
                <View style={styles.rightAlign}>
                  <Text style={styles.targetLabel}>Achievement</Text>
                  <Text style={styles.percentageText}>{achievementPercentage}%</Text>
                </View>
              </View>

              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${achievementPercentage}%` }]} />
              </View>

              <View style={styles.targetRowAlt}>
                <Text style={styles.progressSubText}>
                  Current: <Text style={styles.boldText}>₦{currentSales}</Text>
                </Text>
                <Text style={styles.remainingText}>
                  Remaining: <Text style={styles.boldTextRed}>₦{remainingToTarget}</Text>
                </Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionLabel}>Agent Utilities Services</Text>
          <View style={styles.servicesContainer}>
            <View style={styles.grid}>
              <ServiceItem
                icon="wifi"
                color="#0ea5e9"
                label="Data"
                onPress={() => navigation.navigate("BuyData")}
              />
              <ServiceItem
                icon="phone-alt"
                color="#22c55e"
                label="Airtime"
                onPress={() => navigation.navigate("BuyAirtime")}
              />
              <ServiceItem
                icon="bolt"
                color="#eab308"
                label="Power"
                onPress={() => navigation.navigate("Electricity")}
              />
              <ServiceItem
                icon="tv"
                color="#8b5cf6"
                label="Cable"
                onPress={() => navigation.navigate("Cable")}
              />
              <ServiceItem
                icon="id-card"
                color="#f43f5e"
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
                color="#64748b"
                label="BVN"
                onPress={() => navigation.navigate("BVNScreen")}
              />
              <ServiceItem
                icon="shield-alt"
                color="#1e40af"
                label="NIN Valid"
                onPress={() => navigation.navigate("NINValidation")}
              />
              <ServiceItem
                icon="history"
                color="#f97316"
                label="History"
                onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
              />
            </View>
          </View>

          <View style={styles.supervisorSection}>
            <Text style={styles.sectionTitle}>Assigned Supervisor</Text>
            <View style={styles.infoBox}>
              {typeof supervisor === "string" ? (
                <Text style={styles.infoText}>{supervisor}</Text>
              ) : (
                <View>
                  <Text style={styles.supName}>{supervisor?.name || "N/A"}</Text>
                  <Text style={styles.supPhone}>{supervisor?.phone || "No Contact"}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.actionSection}>
            <Text style={styles.sectionTitle}>Quick Agent Actions</Text>
            <TouchableOpacity
              style={styles.actionBtnFull}
              onPress={() => navigation.navigate("NewSale")}
            >
              <Text style={styles.actionBtnTextFull}>Process New Sale</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtnFull}
              onPress={() => navigation.navigate("SalesHistory")}
            >
              <Text style={styles.actionBtnTextFull}>View Sales History</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>
      </ImageBackground>

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
          onPress={() => navigation.navigate("Contact")}
        />
      </View>
    </View>
  );
};

const ServiceItem = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress}>
    <View style={styles.iconBox}>
      <FontAwesome5 name={icon} size={20} color={color} />
    </View>
    <Text style={styles.gridLabel}>{label}</Text>
  </TouchableOpacity>
);

const StatCard = ({ title, value, unit, color }) => (
  <View style={[styles.statCard, { borderLeftColor: color }]}>
    <Text style={styles.statLabel}>{title}</Text>
    <Text style={styles.statValue}>
      {value} <Text style={styles.statUnit}>{unit}</Text>
    </Text>
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={active ? "#1e40af" : "#94a3b8"} />
    <Text style={[styles.tabLabel, { color: active ? "#1e40af" : "#94a3b8" }]}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, width: "100%" },
  fullOverlayGradient: { ...StyleSheet.absoluteFillObject },
  fullOverlay: { flex: 1 },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  topHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  navRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  logoCircle: { width: 45, height: 45, backgroundColor: "#0f172a", borderRadius: 22.5, justifyContent: "center", alignItems: "center", elevation: 4 },
  logoImg: { width: 32, height: 32, resizeMode: "contain" },
  welcomeSection: { marginBottom: 10 },
  welcomeText: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  userName: { color: "#0f172a", fontSize: 24, fontWeight: "bold" },
  walletCard: { borderRadius: 24, padding: 22, marginBottom: 25, elevation: 10 },
  walletTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  walletLabel: { color: "#dbeafe", fontSize: 13 },
  historyText: { color: "#38bdf8", fontSize: 12, fontWeight: "600" },
  balanceContainer: { flexDirection: "row", alignItems: "center", marginVertical: 15 },
  currency: { color: "#fff", fontSize: 24, fontWeight: "600" },
  balanceText: { color: "#fff", fontSize: 34, fontWeight: "bold", marginLeft: 8 },
  walletActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  actionBtn: { flex: 0.48, height: 48, borderRadius: 14, overflow: "hidden" },
  innerBtnGradient: { flex: 1, flexDirection: "row", justifyContent: "center", alignItems: "center" },
  actionBtnText: { color: "#fff", fontWeight: "bold", fontSize: 12, marginLeft: 8 },
  dvaCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 25,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  dvaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  bankNameText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  accountNameText: {
    fontSize: 12,
    marginTop: 2,
  },
  copyAccBtn: {
    backgroundColor: "#1e40af",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  copyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "bold",
    marginLeft: 4,
  },
  accNumberRow: {
    marginVertical: 4,
  },
  accountNumberVal: {
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  dvaNote: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  noAccountContainer: {
    alignItems: "center",
    paddingVertical: 10,
  },
  noAccText: {
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  generateBtn: {
    backgroundColor: "#1e40af",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  generateBtnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "bold",
  },
  sectionLabel: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginTop: 15, marginBottom: 15, paddingLeft: 4 },
  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statsGridAlt: { flexDirection: "row", justifyContent: "space-between", marginBottom: 15 },
  statCard: { backgroundColor: "#fff", width: "48%", padding: 15, borderRadius: 12, borderLeftWidth: 6, elevation: 3 },
  statLabel: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  statValue: { fontSize: 18, fontWeight: "bold", color: "#1e293b", marginTop: 5 },
  statUnit: { fontSize: 12, color: "#94a3b8" },
  targetTrackingSection: { marginTop: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#334155", marginBottom: 10 },
  targetCard: { backgroundColor: "#fff", padding: 20, borderRadius: 12, elevation: 3, borderWidth: 1, borderColor: "#e2e8f0" },
  targetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  targetRowAlt: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  targetLabel: { fontSize: 12, color: "#64748b" },
  targetValue: { fontSize: 16, fontWeight: "bold", color: "#0f172a" },
  rightAlign: { alignItems: "flex-end" },
  percentageText: { fontSize: 20, fontWeight: "800", color: "#059669" },
  progressTrack: { width: "100%", height: 10, backgroundColor: "#e2e8f0", borderRadius: 5, marginTop: 15, overflow: "hidden" },
  progressBar: { height: "100%", backgroundColor: "#059669", borderRadius: 5 },
  progressSubText: { fontSize: 12, color: "#64748b" },
  remainingText: { fontSize: 12, color: "#64748b" },
  boldText: { fontWeight: "700", color: "#0f172,a" },
  boldTextRed: { fontWeight: "700", color: "#dc2626" },
  servicesContainer: { borderRadius: 28, padding: 20, elevation: 4, marginBottom: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridItem: { width: "23%", alignItems: "center", marginBottom: 22 },
  iconBox: { width: 54, height: 54, borderRadius: 18, backgroundColor: "#f8fafc", justifyContent: "center", alignItems: "center", marginBottom: 8, elevation: 1 },
  gridLabel: { color: "#475569", fontSize: 11, textAlign: "center", fontWeight: "600" },
  supervisorSection: { marginBottom: 20 },
  infoBox: { backgroundColor: "#fff", padding: 15, borderRadius: 15, elevation: 2 },
  infoText: { color: "#64748b" },
  supName: { fontWeight: "bold", fontSize: 16 },
  supPhone: { color: "#1e40af", marginTop: 4 },
  actionSection: { marginBottom: 20 },
  actionBtnFull: { backgroundColor: "#1e40af", padding: 15, borderRadius: 12, marginBottom: 10, alignItems: "center" },
  actionBtnTextFull: { color: "#fff", fontWeight: "bold" },
  bottomTab: { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 999, height: 85, backgroundColor: "#fff", flexDirection: "row", borderTopWidth: 1, borderTopColor: "#f1f5f9", paddingBottom: 20, elevation: 20 },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },
  badge: { position: "absolute", right: -5, top: -5, backgroundColor: "#ef4444", borderRadius: 10, width: 18, height: 18, justifyContent: "center", alignItems: "center" },
  badgeText: { color: "#fff", fontSize: 10, fontWeight: "bold" },
});

export default AgentDashboard;