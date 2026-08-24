import React, { useState, useEffect, useContext, useCallback } from "react";
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
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";

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
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const HomeScreen = ({ navigation }) => {
  const contextValue = useContext(ThemeContext) || {};
  const isDarkMode = contextValue.isDarkMode !== undefined ? contextValue.isDarkMode : false;

  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Virtual Account States
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // 1. Load cached user profile and virtual account immediately on launch
  useEffect(() => {
    const loadCachedData = async () => {
      try {
        const [cachedAcc, cachedUser] = await Promise.all([
          AsyncStorage.getItem("userVirtualAccount"),
          AsyncStorage.getItem("userData"),
        ]);

        if (cachedAcc) {
          setVirtualAccount(JSON.parse(cachedAcc));
        }
        if (cachedUser) {
          const parsed = JSON.parse(cachedUser);
          setUserData(parsed);
          if (!cachedAcc && (parsed.virtualAccount || parsed.virtualAccounts || parsed.dva)) {
            const acc = extractVirtualAccount(parsed);
            if (acc) {
              setVirtualAccount(acc);
              await AsyncStorage.setItem("userVirtualAccount", JSON.stringify(acc));
            }
          }
        }
      } catch (e) {
        console.log("Error loading cached storage:", e.message);
      }
    };
    loadCachedData();
  }, []);

  const extractVirtualAccount = (user) => {
    if (!user) return null;
    let activeAcc = null;

    if (user.virtualAccount && (user.virtualAccount.accountNumber || user.virtualAccount.account_number)) {
      activeAcc = {
        bankName: user.virtualAccount.bankName || user.virtualAccount.bank_name || "Wema Bank",
        accountName: user.virtualAccount.accountName || user.virtualAccount.account_name || user.name || "Ayax Customer",
        accountNumber: user.virtualAccount.accountNumber || user.virtualAccount.account_number,
      };
    } else if (Array.isArray(user.virtualAccounts) && user.virtualAccounts.length > 0) {
      const first = user.virtualAccounts[0];
      activeAcc = {
        bankName: first.bankName || first.bank_name || "Wema Bank",
        accountName: first.accountName || first.account_name || user.name,
        accountNumber: first.accountNumber || first.account_number,
      };
    } else if (user.dva && (user.dva.accountNumber || user.dva.account_number)) {
      activeAcc = {
        bankName: user.dva.bankName || user.dva.bank_name || "Wema Bank",
        accountName: user.dva.accountName || user.dva.account_name || user.name,
        accountNumber: user.dva.accountNumber || user.dva.account_number,
      };
    }
    return activeAcc;
  };

  // 2. Real-time Live Synchronization
  const fetchUserData = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground) {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      const response = await axios.get(`${BASE_URL}/user/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        timeout: 10000,
      });

      if (response.data && (response.data.success || response.data.user)) {
        const user = response.data.user || response.data.data;
        setUserData(user);
        await AsyncStorage.setItem("userData", JSON.stringify(user));

        const activeAcc = extractVirtualAccount(user);
        if (activeAcc && activeAcc.accountNumber) {
          setVirtualAccount(activeAcc);
          await AsyncStorage.setItem("userVirtualAccount", JSON.stringify(activeAcc));
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } finally {
      setRefreshing(false);
    }
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      const interval = setInterval(() => {
        fetchUserData(true);
      }, 10000);
      return () => clearInterval(interval);
    }, [fetchUserData])
  );

  const onManualRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

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
        const accData = response.data.data || response.data.virtualAccount;
        const formattedAcc = {
          bankName: accData.bankName || accData.bank_name || "Wema Bank",
          accountName: accData.accountName || accData.account_name || userData?.name || "Ayax Customer",
          accountNumber: accData.accountNumber || accData.account_number,
        };

        setVirtualAccount(formattedAcc);
        await AsyncStorage.setItem("userVirtualAccount", JSON.stringify(formattedAcc));

        if (Platform.OS === "android") {
          ToastAndroid.show("Virtual account ready!", ToastAndroid.SHORT);
        } else {
          Alert.alert("Success", "Dedicated account generated successfully!");
        }
        fetchUserData();
      }
    } catch (error) {
      Alert.alert("Error", "Could not generate virtual account. Please try again later.");
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
    const message = `Hello Ayax Data Xpress Support, I need assistance with my account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`)
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Top Application Bar */}
      <View style={styles.topHeader}>
        <View style={styles.navRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="flash" size={22} color="#0284c7" />
            </View>
            <View style={{ marginLeft: 10 }}>
              <View style={styles.enterpriseBadge}>
                <View style={styles.livePulseDot} />
                <Text style={styles.enterpriseBadgeText}>ACTIVE SECURE</Text>
              </View>
              <Text style={styles.brandTitleText}>AYAX DATA XPRESS</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.iconBadgeBtn}
            onPress={() => navigation.navigate("Notifications")}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={21} color="#0284c7" />
            <View style={styles.badgeDot} />
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeText}>Welcome back,</Text>
          <Text style={styles.userName}>
            {userData
              ? `${userData.firstName || userData.name || userData.surname || "Customer"}`
              : "Synchronizing..."}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onManualRefresh}
            tintColor="#0284c7"
            colors={["#0284c7"]}
          />
        }
      >
        {/* Bright Vibrant Gradient Wallet Card */}
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
            <TouchableOpacity
              onPress={() => setIsBalanceVisible(!isBalanceVisible)}
              style={styles.eyeToggle}
            >
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

        {/* Dedicated Virtual Account Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>DEDICATED AUTOMATED ACCOUNT</Text>
          <View style={styles.autoPill}>
            <View style={styles.greenPulse} />
            <Text style={styles.autoPillText}>Instant Credit</Text>
          </View>
        </View>

        <View style={styles.dvaCard}>
          {virtualAccount ? (
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

        {/* Core Services Grid */}
        <Text style={styles.sectionLabel}>CORE PLATFORM SERVICES</Text>
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
              label="Airtime"
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

        {/* Security & Reliability */}
        <View style={styles.footerBranding}>
          <Text style={styles.footerHeadline}>ENTERPRISE GRADE INFRASTRUCTURE</Text>
          <View style={styles.trustGrid}>
            <TrustItem
              icon="shield-check"
              color="#16a34a"
              bg="#dcfce7"
              title="PCI Encrypted"
              sub="Secure Tokens"
            />
            <TrustItem
              icon="flash"
              color="#d97706"
              bg="#fef3c7"
              title="Instant Vending"
              sub="99.9% Up-time"
            />
            <TrustItem
              icon="headset"
              color="#0284c7"
              bg="#e0f2fe"
              title="24/7 Support"
              sub="Live Dispatch"
            />
          </View>
        </View>
      </ScrollView>

      {/* Bright Clean Bottom Navigation */}
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
          onPress={() => navigation.navigate("Contact")}
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

const TrustItem = ({ icon, color, bg, title, sub }) => (
  <View style={styles.trustItem}>
    <View style={[styles.trustIconCircle, { backgroundColor: bg }]}>
      {icon === "flash" ? (
        <Ionicons name={icon} size={22} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      )}
    </View>
    <Text style={styles.trustTitle}>{title}</Text>
    <Text style={styles.trustSub}>{sub}</Text>
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
    <Ionicons
      name={icon}
      size={22}
      color={active ? "#0284c7" : "#64748b"}
    />
    <Text
      style={[
        styles.tabLabel,
        {
          color: active ? "#0284c7" : "#64748b",
          fontWeight: active ? "800" : "600",
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  topHeader: {
    paddingHorizontal: 18,
    paddingTop: Platform.OS === "ios" ? 52 : 40,
    paddingBottom: 14,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoCircle: {
    width: 40,
    height: 40,
    backgroundColor: "#e0f2fe",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  enterpriseBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 8,
    marginBottom: 2,
    alignSelf: "flex-start",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#0284c7",
    marginRight: 5,
  },
  enterpriseBadgeText: { color: "#0369a1", fontSize: 8.5, fontWeight: "900", letterSpacing: 0.8 },
  brandTitleText: { color: "#0f172a", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  iconBadgeBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  badgeDot: {
    position: "absolute",
    top: 8,
    right: 9,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ef4444",
  },
  welcomeSection: { marginTop: 4 },
  welcomeText: { color: "#64748b", fontSize: 12, fontWeight: "700", letterSpacing: 0.3 },
  userName: { color: "#0f172a", fontSize: 21, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },
  walletCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 18,
    elevation: 4,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
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
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  currency: { color: "#e0f2fe", fontSize: 24, fontWeight: "900" },
  balanceText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: -0.5,
  },
  eyeToggle: { padding: 6, marginLeft: 8 },
  walletActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  fundBtn: { flex: 0.48, height: 44, borderRadius: 12, overflow: "hidden", backgroundColor: "#ffffff" },
  fundBtnInner: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
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
  actionBtnText: {
    color: "#0369a1",
    fontWeight: "900",
    fontSize: 11.5,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  supportBtnText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 11.5,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
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
    marginBottom: 18,
    elevation: 2,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  dvaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
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
  copyText: {
    color: "#ffffff",
    fontSize: 10.5,
    fontWeight: "900",
    marginLeft: 4,
  },
  accNumberRow: { marginVertical: 4 },
  accountNumberVal: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#0f172a",
  },
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
    marginBottom: 18,
    elevation: 2,
    shadowColor: "#64748b",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: { width: "31%", alignItems: "center", marginBottom: 16 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  gridLabel: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "800",
    color: "#1e293b",
  },
  footerBranding: {
    marginTop: 4,
    paddingBottom: 10,
    alignItems: "center",
  },
  footerHeadline: {
    fontSize: 10,
    fontWeight: "900",
    color: "#64748b",
    marginBottom: 12,
    letterSpacing: 1,
  },
  trustGrid: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  trustItem: { alignItems: "center", flex: 1 },
  trustIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  trustTitle: { fontSize: 10.5, fontWeight: "800", color: "#0f172a", textAlign: "center" },
  trustSub: { fontSize: 9.5, color: "#64748b", textAlign: "center", marginTop: 1, fontWeight: "600" },
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
});

export default HomeScreen;