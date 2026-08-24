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
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  // Virtual Account States (Persistent across sessions)
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
          // Fallback extraction if account was embedded inside user payload
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

  // Helper function to resolve dynamic account formats
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

      if (response.data && response.data.success) {
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

  // 3. Focus and Polling Lifecycle
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

  // Virtual Account Creation Handler
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
          Alert.alert("Success", "Virtual account generated successfully!");
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
    const phoneNumber = "+2349061244444";
    const message = `Hello Ayax Xpress Support, I need assistance with my account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`),
    );
  };

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: isDarkMode ? "#030712" : "#f8fafc" },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <ImageBackground
        source={require("../assets/ayax_promo_hijab.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <LinearGradient
          colors={
            isDarkMode
              ? ["rgba(3,7,18,0.75)", "rgba(3,7,18,0.98)"]
              : ["rgba(255,255,255,0.7)", "rgba(248,250,252,0.98)"]
          }
          style={styles.fullOverlay}
        />

        {/* Global Navigation Header */}
        <View style={styles.topHeader}>
          <View style={styles.navRow}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/Logo.png")}
                style={styles.logoImg}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.iconBadgeBtn,
                { backgroundColor: isDarkMode ? "#111827" : "#ffffff" },
              ]}
              onPress={() => navigation.navigate("Notifications")}
            >
              <Ionicons
                name="notifications-outline"
                size={20}
                color={isDarkMode ? "#f8fafc" : "#0f172a"}
              />
              <View style={styles.badgeDot} />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text
              style={[
                styles.userName,
                { color: isDarkMode ? "#f8fafc" : "#0f172a" },
              ]}
            >
              {userData
                ? `${userData.firstName || userData.name || "Customer"}`
                : "Loading..."}
            </Text>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onManualRefresh}
              colors={["#2563eb"]}
              tintColor={isDarkMode ? "#38bdf8" : "#2563eb"}
            />
          }
        >
          {/* Main Wallet Card */}
          <LinearGradient
            colors={["#1e3a8a", "#0f172a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletCard}
          >
            <View style={styles.cardHeaderPattern}>
              <View style={styles.walletTop}>
                <View style={styles.shieldRow}>
                  <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
                  <Text style={styles.walletLabel}>ACTIVE BALANCE</Text>
                </View>
                <TouchableOpacity
                  style={styles.historyPill}
                  onPress={() =>
                    navigation.navigate("Main", { screen: "Wallet History" })
                  }
                >
                  <Text style={styles.historyText}>History</Text>
                  <Ionicons name="chevron-forward" size={12} color="#38bdf8" />
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
                    color="#94a3b8"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.walletActions}>
                <TouchableOpacity
                  style={styles.fundBtn}
                  onPress={() => navigation.navigate("FundWallet")}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={["#0284c7", "#2563eb"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.innerBtnGradient}
                  >
                    <Ionicons name="add-circle" size={18} color="#fff" />
                    <Text style={styles.actionBtnText}>FUND WALLET</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.supportBtn}
                  onPress={openWhatsApp}
                  activeOpacity={0.85}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                  <Text style={styles.supportBtnText}>SUPPORT</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>

          {/* Dedicated Virtual Account */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.sectionLabel,
                { color: isDarkMode ? "#f8fafc" : "#0f172a" },
              ]}
            >
              Dedicated Virtual Account
            </Text>
            <View style={styles.autoPill}>
              <Text style={styles.autoPillText}>Instant Credit</Text>
            </View>
          </View>

          <View
            style={[
              styles.dvaCard,
              {
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
              },
            ]}
          >
            {virtualAccount ? (
              <View>
                <View style={styles.dvaTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.bankNameText, { color: isDarkMode ? "#38bdf8" : "#2563eb" }]}>
                      {virtualAccount.bankName}
                    </Text>
                    <Text style={[styles.accountNameText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                      {virtualAccount.accountName}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.copyAccBtn}
                    onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="copy-outline" size={14} color="#fff" />
                    <Text style={styles.copyText}>COPY</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.accNumberRow}>
                  <Text style={[styles.accountNumberVal, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
                    {virtualAccount.accountNumber}
                  </Text>
                </View>
                <Text style={styles.dvaNote}>
                  Automated deposit assigned specifically to your wallet.
                </Text>
              </View>
            ) : (
              <View style={styles.noAccountContainer}>
                <Ionicons name="card-outline" size={28} color="#64748b" style={{ marginBottom: 6 }} />
                <Text style={[styles.noAccText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
                  Your dedicated automated deposit account is ready for activation.
                </Text>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGetVirtualAccount}
                  disabled={loadingAccount}
                  activeOpacity={0.85}
                >
                  {loadingAccount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={14} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.generateBtnText}>Get Dedicated Account</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Quick Wallet Funding Methods */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDarkMode ? "#f8fafc" : "#0f172a" },
            ]}
          >
            Deposit Channels
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bankScroll}
          >
            <FundingCard
              title="Bank Transfer"
              desc="Direct transfer to assigned account"
              icon="wallet-outline"
              color="#38bdf8"
              isDarkMode={isDarkMode}
              onPress={() => navigation.navigate("FundWallet")}
            />
            <FundingCard
              title="Instant Gateway"
              desc="Card, USSD & QR Payment"
              icon="flash-outline"
              color="#22c55e"
              isDarkMode={isDarkMode}
              onPress={() => navigation.navigate("FundWallet")}
            />
          </ScrollView>

          {/* Core Services Grid */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDarkMode ? "#f8fafc" : "#0f172a" },
            ]}
          >
            Utility Services
          </Text>
          <View
            style={[
              styles.servicesContainer,
              {
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
              },
            ]}
          >
            <View style={styles.grid}>
              <ServiceItem
                icon="wifi"
                color="#0284c7"
                label="Data"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyData")}
              />
              <ServiceItem
                icon="phone-alt"
                color="#16a34a"
                label="Airtime"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyAirtime")}
              />
              <ServiceItem
                icon="bolt"
                color="#eab308"
                label="Electricity"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Electricity")}
              />
              <ServiceItem
                icon="tv"
                color="#8b5cf6"
                label="Cable TV"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Cable")}
              />
              <ServiceItem
                icon="id-card"
                color="#f43f5e"
                label="NIMC Verify"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NIMC")}
              />
              <ServiceItem
                icon="fingerprint"
                color="#ec4899"
                label="NIMC Mod"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NIMCModification")}
              />
              <ServiceItem
                icon="user-shield"
                color="#64748b"
                label="BVN Service"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BVNScreen")}
              />
              <ServiceItem
                icon="shield-alt"
                color="#2563eb"
                label="NIN Validate"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NINValidation")}
              />
              <ServiceItem
                icon="history"
                color="#f97316"
                label="Logs"
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
              />
            </View>
          </View>

          {/* Security & Reliability Features */}
          <View style={styles.footerBranding}>
            <Text style={styles.footerHeadline}>System Reliability</Text>
            <View style={styles.trustGrid}>
              <TrustItem
                icon="shield-check"
                color="#16a34a"
                bg={isDarkMode ? "#064e3b" : "#dcfce7"}
                title="PCI Compliant"
                sub="Encrypted"
                isDarkMode={isDarkMode}
              />
              <TrustItem
                icon="flash"
                color="#ca8a04"
                bg={isDarkMode ? "#713f12" : "#fef9c3"}
                title="Instant Vending"
                sub="Automated"
                isDarkMode={isDarkMode}
              />
              <TrustItem
                icon="headset"
                color="#0284c7"
                bg={isDarkMode ? "#0c4a6e" : "#e0f2fe"}
                title="24/7 Monitoring"
                sub="Live Help"
                isDarkMode={isDarkMode}
              />
            </View>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </ImageBackground>

      {/* Global Bottom Navigation */}
      <View
        style={[
          styles.bottomTab,
          {
            backgroundColor: isDarkMode ? "#111827" : "#ffffff",
            borderTopColor: isDarkMode ? "#1f2937" : "#f1f5f9",
          },
        ]}
      >
        <TabItem icon="home" label="Home" active isDarkMode={isDarkMode} onPress={() => {}} />
        <TabItem
          icon="receipt-outline"
          label="History"
          isDarkMode={isDarkMode}
          onPress={() =>
            navigation.navigate("Main", { screen: "Wallet History" })
          }
        />
        <TabItem
          icon="person-outline"
          label="Profile"
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate("Profile")}
        />
        <TabItem
          icon="chatbubble-ellipses-outline"
          label="Support"
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate("Contact")}
        />
      </View>
    </View>
  );
};

// Sub-Components
const FundingCard = ({ title, desc, icon, color, isDarkMode, onPress }) => (
  <TouchableOpacity
    style={[
      styles.bankBox,
      {
        backgroundColor: isDarkMode ? "#111827" : "#ffffff",
        borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
      },
    ]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <View style={styles.bankInfo}>
      <View style={[styles.bankLogoCircle, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.bankTitle, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
          {title}
        </Text>
        <Text style={styles.accNo} numberOfLines={1}>{desc}</Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#64748b" />
  </TouchableOpacity>
);

const ServiceItem = ({ icon, label, color, onPress, isDarkMode }) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress} activeOpacity={0.75}>
    <View
      style={[
        styles.iconBox,
        {
          backgroundColor: isDarkMode ? "#1e293b" : "#f8fafc",
          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
        },
      ]}
    >
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text
      style={[
        styles.gridLabel,
        { color: isDarkMode ? "#e2e8f0" : "#334155" },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const TrustItem = ({ icon, color, bg, title, sub, isDarkMode }) => (
  <View style={styles.trustItem}>
    <View style={[styles.trustIconCircle, { backgroundColor: bg }]}>
      {icon === "flash" ? (
        <Ionicons name={icon} size={24} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      )}
    </View>
    <Text style={[styles.trustTitle, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
      {title}
    </Text>
    <Text style={styles.trustSub}>{sub}</Text>
  </View>
);

const TabItem = ({ icon, label, active, isDarkMode, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress} activeOpacity={0.8}>
    <Ionicons
      name={icon}
      size={22}
      color={active ? (isDarkMode ? "#38bdf8" : "#2563eb") : "#64748b"}
    />
    <Text
      style={[
        styles.tabLabel,
        {
          color: active ? (isDarkMode ? "#38bdf8" : "#2563eb") : "#64748b",
          fontWeight: active ? "700" : "500",
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  fullOverlay: { position: "absolute", width: "100%", height: "100%" },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 42,
    paddingBottom: 16,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  logoCircle: {
    width: 44,
    height: 44,
    backgroundColor: "#0f172a",
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoImg: { width: 30, height: 30, resizeMode: "contain" },
  iconBadgeBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  badgeDot: {
    position: "absolute",
    top: 10,
    right: 11,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#ef4444",
  },
  welcomeSection: { marginTop: 4 },
  welcomeText: { color: "#64748b", fontSize: 13, fontWeight: "600", letterSpacing: 0.3 },
  userName: { fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  content: { flex: 1, paddingHorizontal: 16 },
  walletCard: {
    borderRadius: 22,
    padding: 20,
    marginBottom: 20,
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  cardHeaderPattern: { flex: 1 },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  shieldRow: { flexDirection: "row", alignItems: "center" },
  walletLabel: { color: "#93c5fd", fontSize: 11, fontWeight: "800", letterSpacing: 1, marginLeft: 5 },
  historyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  historyText: { color: "#38bdf8", fontSize: 11, fontWeight: "700", marginRight: 2 },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  currency: { color: "#38bdf8", fontSize: 22, fontWeight: "700" },
  balanceText: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: -0.5,
  },
  eyeToggle: { padding: 6, marginLeft: 10 },
  walletActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  fundBtn: { flex: 0.48, height: 46, borderRadius: 14, overflow: "hidden" },
  supportBtn: {
    flex: 0.48,
    height: 46,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  innerBtnGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  supportBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.3,
    marginTop: 8,
    marginBottom: 10,
    paddingLeft: 2,
  },
  autoPill: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  autoPillText: { color: "#22c55e", fontSize: 10, fontWeight: "800" },
  dvaCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    elevation: 2,
    borderWidth: 1,
  },
  dvaTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  bankNameText: { fontSize: 14, fontWeight: "800" },
  accountNameText: { fontSize: 12, marginTop: 1, fontWeight: "500" },
  copyAccBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  copyText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  accNumberRow: { marginVertical: 4 },
  accountNumberVal: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  dvaNote: { fontSize: 11, color: "#64748b", marginTop: 4, fontWeight: "500" },
  noAccountContainer: { alignItems: "center", paddingVertical: 12 },
  noAccText: { fontSize: 12, textAlign: "center", marginBottom: 12, lineHeight: 18 },
  generateBtn: {
    backgroundColor: "#2563eb",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 11,
    paddingHorizontal: 22,
    borderRadius: 12,
  },
  generateBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  bankScroll: { marginBottom: 18 },
  bankBox: {
    width: width * 0.72,
    padding: 14,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    elevation: 2,
  },
  bankInfo: { flexDirection: "row", alignItems: "center", flex: 1 },
  bankLogoCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  bankTitle: { fontSize: 13, fontWeight: "800" },
  accNo: { fontSize: 11, color: "#64748b", marginTop: 2, fontWeight: "500" },
  servicesContainer: {
    borderRadius: 20,
    paddingTop: 18,
    paddingHorizontal: 12,
    elevation: 2,
    borderWidth: 1,
    marginBottom: 20,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: { width: "31%", alignItems: "center", marginBottom: 18 },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
    borderWidth: 1,
  },
  gridLabel: {
    fontSize: 11,
    textAlign: "center",
    fontWeight: "700",
  },
  footerBranding: {
    marginTop: 10,
    paddingBottom: 20,
    alignItems: "center",
  },
  footerHeadline: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 16,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  trustGrid: { flexDirection: "row", justifyContent: "space-between", width: "100%" },
  trustItem: { alignItems: "center", flex: 1 },
  trustIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  trustTitle: { fontSize: 11, fontWeight: "800", textAlign: "center" },
  trustSub: { fontSize: 10, color: "#64748b", textAlign: "center", marginTop: 1, fontWeight: "500" },
  bottomTab: {
    height: Platform.OS === "ios" ? 84 : 68,
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 22 : 8,
    paddingTop: 8,
    elevation: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLabel: { fontSize: 10, marginTop: 3 },
});

export default HomeScreen;