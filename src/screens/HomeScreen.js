import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
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
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  RefreshControl,
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
import { useFocusEffect } from "@react-navigation/native";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";
const DVA_CACHE_KEY = "@ayax_user_dva_account";

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Dedicated Virtual Account States
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // Pulse Animation don Live Indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);

  // 1. Scalable Multi-Source Synchronization (Parallel Fetch)
  const fetchUserData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) {
        const cachedDva = await AsyncStorage.getItem(DVA_CACHE_KEY);
        if (cachedDva) {
          setVirtualAccount(JSON.parse(cachedDva));
        }
      }

      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      const [profileRes, balanceRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/user/profile`, { headers }),
        axios.get(`${BASE_URL}/wallet/balance`, { headers }),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.data?.success) {
        const user = profileRes.value.data.user || profileRes.value.data.data;
        setUserData(user);

        const currentBal = Number(user.walletBalance ?? user.balance ?? 0);
        setWalletBalance(currentBal);

        // Multi-tier Fallback don Virtual Account
        const accNumber =
          user.virtualAccount?.accountNumber ||
          user.accountNumber ||
          user.virtualAccountNumber;

        if (accNumber) {
          const formattedAccount = {
            bankName: user.virtualAccount?.bankName || user.bankName || "Wema Bank",
            accountNumber: accNumber,
            accountName:
              user.virtualAccount?.accountName ||
              user.accountName ||
              `${user.firstName || ""} ${user.surname || ""}`.trim() ||
              user.name,
          };
          setVirtualAccount(formattedAccount);
          await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(formattedAccount));
        }
      }

      if (balanceRes.status === "fulfilled" && balanceRes.value.data?.success) {
        const liveBal = Number(
          balanceRes.value.data.balance ?? balanceRes.value.data.walletBalance ?? 0
        );
        setWalletBalance(liveBal);
      }
    } catch (err) {
      if (err.response?.status === 401) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        if (!isSilent) {
          console.log("[Data Sync Notice]:", err.message);
        }
      }
    }
  }, [navigation]);

  // 2. Real-time Background Polling kowane daƙiƙa 10
  useFocusEffect(
    useCallback(() => {
      fetchUserData(false);

      const intervalId = setInterval(() => {
        fetchUserData(true);
      }, 10000);

      return () => clearInterval(intervalId);
    }, [fetchUserData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData(false);
    setRefreshing(false);
  };

  // 3. Automated Virtual Account Generation
  const handleGetVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");

      // Gwada sabon endpoint na wallet sannan fallback zuwa na baya
      let response;
      try {
        response = await axios.post(
          `${BASE_URL}/wallet/generate-virtual-account`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (e) {
        response = await axios.post(
          `${BASE_URL}/virtual-account/create`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (response.data?.success) {
        const acc = response.data.virtualAccount || response.data.data;
        setVirtualAccount(acc);
        await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(acc));
        await fetchUserData(false);

        showToast("Dedicated Virtual Account Assigned Successfully!");
      }
    } catch (error) {
      console.error("Virtual Account Error:", error.response?.data || error.message);
      Alert.alert(
        "Provisioning Error",
        error.response?.data?.message || "Virtual account provisioning temporarily unavailable. Please try again."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showToast("NUBAN Account Copied to Clipboard");
  };

  const showToast = (msg) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Notice", msg);
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = "+2349061244444";
    const message = `Hello Ayax Xpress Support, I need real-time assistance with my account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`)
    );
  };

  const displayName = userData?.firstName || userData?.name?.split(" ")[0] || "Partner";

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: isDarkMode ? "#06090e" : "#f1f5f9" },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7", "#38bdf8"]}
            tintColor="#38bdf8"
          />
        }
      >
        {/* Tier-1 Executive Header */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0c1322", "#06090e"]
              : ["#ffffff", "#f8fafc"]
          }
          style={styles.heroHeader}
        >
          <View style={styles.topBar}>
            <View style={styles.brandRow}>
              <View style={styles.logoBadge}>
                <Image
                  source={require("../assets/Logo.png")}
                  style={styles.logoImg}
                />
              </View>
              <View style={styles.greetingBox}>
                <Text style={styles.welcomeSubtitle}>Executive Terminal</Text>
                <Text
                  style={[
                    styles.userNameHeading,
                    { color: isDarkMode ? "#ffffff" : "#0f172a" },
                  ]}
                  numberOfLines={1}
                >
                  {displayName}
                </Text>
              </View>
            </View>

            <View style={styles.headerRightActions}>
              <TouchableOpacity
                style={[
                  styles.iconButton,
                  { backgroundColor: isDarkMode ? "#131c2e" : "#e2e8f0" },
                ]}
                onPress={() => navigation.navigate("Notifications")}
              >
                <Ionicons
                  name="notifications-outline"
                  size={19}
                  color={isDarkMode ? "#ffffff" : "#0f172a"}
                />
                <Animated.View
                  style={[
                    styles.liveDot,
                    { transform: [{ scale: pulseAnim }] },
                  ]}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Holographic Obsidian Wallet Card */}
          <LinearGradient
            colors={["#0a192f", "#0f2e5c", "#07162c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletHologramCard}
          >
            <View style={styles.walletHeaderRow}>
              <View style={styles.securityTierTag}>
                <MaterialCommunityIcons name="shield-check" size={13} color="#10b981" />
                <Text style={styles.securityTierText}>REAL-TIME LEDGER ACTIVE</Text>
              </View>

              <TouchableOpacity
                style={styles.historyPill}
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
              >
                <Text style={styles.historyPillText}>Statement</Text>
                <Ionicons name="chevron-forward" size={11} color="#38bdf8" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceDisplayWrapper}>
              <Text style={styles.balanceCurrencyTag}>₦</Text>
              <Text style={styles.balanceBigNumber}>
                {isBalanceVisible
                  ? walletBalance.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })
                  : "••••••••"}
              </Text>
              <TouchableOpacity
                style={styles.eyeToggle}
                onPress={() => setIsBalanceVisible(!isBalanceVisible)}
              >
                <Ionicons
                  name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                  size={20}
                  color="#38bdf8"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => navigation.navigate("FundWallet")}
              >
                <LinearGradient
                  colors={["#0284c7", "#0369a1"]}
                  style={styles.buttonGradientLayer}
                >
                  <Ionicons name="add-circle" size={16} color="#ffffff" />
                  <Text style={styles.primaryActionText}>ADD FUNDS</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={openWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={16} color="#22c55e" />
                <Text style={styles.secondaryActionText}>24/7 DESK</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </LinearGradient>

        <View style={styles.bodyWrapper}>
          {/* Dedicated Virtual Account Terminal */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.modernSectionTitle,
                { color: isDarkMode ? "#ffffff" : "#0f172a" },
              ]}
            >
              Permanent Settlement Route
            </Text>
            <View style={styles.activeRouteBadge}>
              <Text style={styles.activeRouteText}>AUTO-SETTLE</Text>
            </View>
          </View>

          {virtualAccount?.accountNumber ? (
            <LinearGradient
              colors={
                isDarkMode
                  ? ["#101826", "#0b101b"]
                  : ["#ffffff", "#f8fafc"]
              }
              style={[
                styles.dvaCardSurface,
                {
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(2,132,199,0.18)",
                },
              ]}
            >
              <View style={styles.dvaMetaRow}>
                <View>
                  <Text style={styles.dvaBankHeading}>
                    {virtualAccount.bankName?.toUpperCase() || "WEMA BANK PLC"}
                  </Text>
                  <Text style={styles.dvaBeneficiaryName}>
                    {virtualAccount.accountName || displayName}
                  </Text>
                </View>

                <MaterialCommunityIcons
                  name="integrated-circuit-chip"
                  size={36}
                  color="#f59e0b"
                />
              </View>

              <View style={styles.dvaNumberRow}>
                <Text
                  style={[
                    styles.dvaNumberText,
                    { color: isDarkMode ? "#ffffff" : "#0f172a" },
                  ]}
                >
                  {virtualAccount.accountNumber.match(/.{1,4}/g)?.join(" ") ||
                    virtualAccount.accountNumber}
                </Text>

                <TouchableOpacity
                  style={styles.dvaCopyPill}
                  onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                >
                  <Ionicons name="copy-outline" size={13} color="#ffffff" />
                  <Text style={styles.dvaCopyText}>COPY</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.dvaExplanation}>
                Transfers made to this permanent NUBAN automatically reflect on your available balance within sub-seconds.
              </Text>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.provisioningCard,
                {
                  backgroundColor: isDarkMode ? "#101826" : "#ffffff",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#e2e8f0",
                },
              ]}
            >
              <View style={styles.provisionIconContainer}>
                <Ionicons name="card" size={26} color="#0284c7" />
              </View>
              <Text
                style={[
                  styles.provisionTitle,
                  { color: isDarkMode ? "#ffffff" : "#0f172a" },
                ]}
              >
                No Virtual Account Assigned
              </Text>
              <Text style={styles.provisionDescription}>
                Assign a dedicated NUBAN settlement channel for instant 24/7 bank transfers directly to your wallet.
              </Text>
              <TouchableOpacity
                style={styles.provisionActionBtn}
                onPress={handleGetVirtualAccount}
                disabled={loadingAccount}
              >
                {loadingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={15} color="#ffffff" />
                    <Text style={styles.provisionActionText}>
                      PROVISION INSTANT ACCOUNT
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Executive Services Hub */}
          <Text
            style={[
              styles.modernSectionTitle,
              {
                color: isDarkMode ? "#ffffff" : "#0f172a",
                marginTop: 26,
                marginBottom: 14,
              },
            ]}
          >
            Digital Services Hub
          </Text>

          <View
            style={[
              styles.servicesBentoGrid,
              {
                backgroundColor: isDarkMode ? "#101826" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            <View style={styles.gridMatrix}>
              <ServiceHubItem
                icon="wifi"
                color="#0284c7"
                label="Data Bundles"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyData")}
              />
              <ServiceHubItem
                icon="phone-alt"
                color="#10b981"
                label="Airtime VTU"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyAirtime")}
              />
              <ServiceHubItem
                icon="bolt"
                color="#f59e0b"
                label="Electricity"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Electricity")}
              />
              <ServiceHubItem
                icon="tv"
                color="#8b5cf6"
                label="Cable TV"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Cable")}
              />
              <ServiceHubItem
                icon="id-card"
                color="#ef4444"
                label="NIMC Verify"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NIMC")}
              />
              <ServiceHubItem
                icon="fingerprint"
                color="#ec4899"
                label="NIMC Mod"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NIMCModification")}
              />
              <ServiceHubItem
                icon="user-shield"
                color="#64748b"
                label="BVN Validate"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BVNScreen")}
              />
              <ServiceHubItem
                icon="shield-alt"
                color="#0369a1"
                label="NIN Search"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NINValidation")}
              />
            </View>
          </View>

          {/* Tier-1 Security & Infrastructure Certification */}
          <View style={styles.trustInfrastructure}>
            <Text style={styles.trustHeading}>Enterprise Grade Reliability</Text>
            <View style={styles.trustCardsRow}>
              <TrustBadge
                icon="shield-check"
                color="#10b981"
                bg="rgba(16,185,129,0.1)"
                title="PCI-DSS Ready"
                sub="256-Bit Encrypted"
              />
              <TrustBadge
                icon="flash"
                color="#f59e0b"
                bg="rgba(245,158,11,0.1)"
                title="Sub-Second"
                sub="Automated Nodes"
              />
              <TrustBadge
                icon="headset"
                color="#0284c7"
                bg="rgba(2,132,199,0.1)"
                title="Tier-3 Support"
                sub="Live SLA Desk"
              />
            </View>
          </View>
        </View>

        <View style={{ height: 110 }} />
      </ScrollView>

      {/* Modern Floating Bottom Nav Hub */}
      <View
        style={[
          styles.bottomNavigationHub,
          {
            backgroundColor: isDarkMode ? "#0a0f18" : "#ffffff",
            borderTopColor: isDarkMode
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <NavTabItem icon="home" label="Home" active isDarkMode={isDarkMode} onPress={() => {}} />
        <NavTabItem
          icon="time-outline"
          label="History"
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate("Main", { screen: "Wallet History" })}
        />
        <NavTabItem
          icon="person-outline"
          label="Profile"
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate("Profile")}
        />
        <NavTabItem
          icon="help-buoy-outline"
          label="Support"
          isDarkMode={isDarkMode}
          onPress={() => navigation.navigate("Contact")}
        />
      </View>
    </View>
  );
};

// Reusable Presentation Sub-Components
const ServiceHubItem = ({ icon, label, color, onPress, isDarkMode }) => (
  <TouchableOpacity style={styles.serviceBox} onPress={onPress} activeOpacity={0.7}>
    <View
      style={[
        styles.serviceIconContainer,
        {
          backgroundColor: isDarkMode ? "#172233" : "#f1f5f9",
          borderColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#e2e8f0",
        },
      ]}
    >
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text
      style={[
        styles.serviceLabelText,
        { color: isDarkMode ? "#cbd5e1" : "#334155" },
      ]}
      numberOfLines={1}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const TrustBadge = ({ icon, color, bg, title, sub }) => (
  <View style={styles.trustColumn}>
    <View style={[styles.trustIconWrap, { backgroundColor: bg }]}>
      {icon === "flash" ? (
        <Ionicons name={icon} size={20} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      )}
    </View>
    <Text style={styles.trustTitleText}>{title}</Text>
    <Text style={styles.trustSubText}>{sub}</Text>
  </View>
);

const NavTabItem = ({ icon, label, active, isDarkMode, onPress }) => (
  <TouchableOpacity style={styles.navTabButton} onPress={onPress} activeOpacity={0.7}>
    <Ionicons
      name={icon}
      size={21}
      color={active ? "#0284c7" : isDarkMode ? "#64748b" : "#94a3b8"}
    />
    <Text
      style={[
        styles.navTabLabel,
        {
          color: active ? "#0284c7" : isDarkMode ? "#64748b" : "#94a3b8",
          fontWeight: active ? "800" : "600",
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1 },
  content: { flex: 1 },
  heroHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: 20,
    paddingBottom: 22,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#0284c7",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  logoImg: { width: 28, height: 28, resizeMode: "contain" },
  greetingBox: { marginLeft: 12 },
  welcomeSubtitle: { color: "#94a3b8", fontSize: 11.5, fontWeight: "600", letterSpacing: 0.2 },
  userNameHeading: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  headerRightActions: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#10b981",
    position: "absolute",
    top: 9,
    right: 9,
  },
  walletHologramCard: {
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 8,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
  },
  walletHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  securityTierTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  securityTierText: {
    color: "#10b981",
    fontSize: 9,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  historyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.18)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  historyPillText: {
    color: "#38bdf8",
    fontSize: 11,
    fontWeight: "700",
    marginRight: 2,
  },
  balanceDisplayWrapper: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 18,
  },
  balanceCurrencyTag: {
    color: "#38bdf8",
    fontSize: 24,
    fontWeight: "900",
    marginRight: 6,
  },
  balanceBigNumber: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  eyeToggle: { marginLeft: 12, padding: 4 },
  walletActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  primaryActionButton: {
    flex: 0.58,
    height: 46,
    borderRadius: 13,
    overflow: "hidden",
  },
  buttonGradientLayer: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  primaryActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  secondaryActionButton: {
    flex: 0.38,
    height: 46,
    borderRadius: 13,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  secondaryActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "800",
    marginLeft: 6,
  },
  bodyWrapper: { paddingHorizontal: 20, marginTop: 22 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modernSectionTitle: { fontSize: 15.5, fontWeight: "800", letterSpacing: -0.2 },
  activeRouteBadge: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeRouteText: { color: "#0284c7", fontSize: 9, fontWeight: "900" },
  dvaCardSurface: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    elevation: 3,
  },
  dvaMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dvaBankHeading: {
    color: "#0284c7",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  dvaBeneficiaryName: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  dvaNumberRow: {
    marginVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dvaNumberText: {
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  dvaCopyPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  dvaCopyText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 4,
  },
  dvaExplanation: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
  },
  provisioningCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
  },
  provisionIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  provisionTitle: { fontSize: 15, fontWeight: "800" },
  provisionDescription: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
  },
  provisionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  provisionActionText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  servicesBentoGrid: {
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
  },
  gridMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceBox: { width: "24%", alignItems: "center", marginVertical: 8 },
  serviceIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 6,
  },
  serviceLabelText: {
    fontSize: 10.5,
    fontWeight: "700",
    textAlign: "center",
  },
  trustInfrastructure: { marginTop: 30, marginBottom: 10 },
  trustHeading: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  trustCardsRow: { flexDirection: "row", justifyContent: "space-between" },
  trustColumn: { alignItems: "center", width: "30%" },
  trustIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  trustTitleText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
    textAlign: "center",
  },
  trustSubText: { fontSize: 9.5, color: "#94a3b8", textAlign: "center" },
  bottomNavigationHub: {
    height: 78,
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 14,
    elevation: 20,
  },
  navTabButton: { flex: 1, justifyContent: "center", alignItems: "center" },
  navTabLabel: { fontSize: 10, marginTop: 4 },
});

export default HomeScreen;