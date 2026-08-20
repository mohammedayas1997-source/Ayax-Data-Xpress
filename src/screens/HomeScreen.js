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
const DVA_CACHE_KEY = "@ayax_user_dva_account";

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // States na Virtual Account
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  // 1. Dauko Profile da Virtual Account
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

      // Gwada /user/profile ko /auth/profile
      let response;
      try {
        response = await axios.get(`${BASE_URL}/user/profile`, { headers });
      } catch (err) {
        response = await axios.get(`${BASE_URL}/auth/profile`, { headers });
      }

      if (response.data && (response.data.success || response.status === 200)) {
        const user = response.data.user || response.data.data || response.data;
        setUserData(user);

        const accNumber =
          user.virtualAccount?.accountNumber ||
          user.accountNumber ||
          user.virtualAccountNumber;

        if (accNumber) {
          const accObj = {
            bankName:
              user.virtualAccount?.bankName || user.bankName || "Wema Bank",
            accountNumber: accNumber,
            accountName:
              user.virtualAccount?.accountName ||
              user.accountName ||
              user.name ||
              `${user.firstName || ""} ${user.surname || ""}`.trim(),
          };
          setVirtualAccount(accObj);
          await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(accObj));
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        if (!isSilent) {
          console.log("Profile sync:", err.message);
        }
      }
    }
  }, [navigation]);

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

  // 2. Aikin Samar da Virtual Account (Tare da Fallback Routes)
  const handleGetVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      };

      let response;
      let lastError = null;

      // Gwaji 1: Route na /wallet/generate-virtual-account
      try {
        response = await axios.post(
          `${BASE_URL}/wallet/generate-virtual-account`,
          {},
          { headers }
        );
      } catch (err1) {
        lastError = err1;
        // Gwaji 2: Route na /virtual-account/create
        try {
          response = await axios.post(
            `${BASE_URL}/virtual-account/create`,
            {},
            { headers }
          );
        } catch (err2) {
          lastError = err2;
        }
      }

      if (response && response.data && (response.data.success || response.status === 200)) {
        const acc =
          response.data.virtualAccount ||
          response.data.data ||
          response.data.account;

        if (acc && acc.accountNumber) {
          setVirtualAccount(acc);
          await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(acc));
          await fetchUserData(false);

          if (Platform.OS === "android") {
            ToastAndroid.show("Virtual account ready!", ToastAndroid.SHORT);
          } else {
            Alert.alert("Success", "Virtual account generated successfully!");
          }
          return;
        }
      }

      const errorMsg =
        lastError?.response?.data?.message ||
        "Could not generate virtual account from gateway. Please try again.";
      Alert.alert("Provisioning Notice", errorMsg);
    } catch (error) {
      console.error("Virtual Account Error:", error.response?.data || error.message);
      Alert.alert(
        "Error",
        error.response?.data?.message || "Could not fetch or create virtual account."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    if (Platform.OS === "android") {
      ToastAndroid.show("Copied to clipboard", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", text);
    }
  };

  const openWhatsApp = () => {
    const phoneNumber = "+2349061244444";
    const message = `Hello Ayax Xpress Support, I need assistance with my account.`;
    const url = `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(
      message
    )}`;
    Linking.openURL(url).catch(() =>
      Linking.openURL(`https://wa.me/${phoneNumber.replace("+", "")}`)
    );
  };

  const userDisplayName = userData
    ? `${userData.firstName || userData.name || "Member"}`
    : "Member";

  const rawBalance =
    userData?.walletBalance !== undefined
      ? userData.walletBalance
      : userData?.balance !== undefined
      ? userData.balance
      : 0;

  const formattedBalance = Number(rawBalance || 0).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <View
      style={[
        styles.mainContainer,
        { backgroundColor: isDarkMode ? "#080c14" : "#f4f7fb" },
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
              ? [
                  "rgba(8,12,20,0.85)",
                  "rgba(8,12,20,0.96)",
                  "rgba(8,12,20,1)",
                ]
              : [
                  "rgba(244,247,251,0.82)",
                  "rgba(244,247,251,0.95)",
                  "rgba(244,247,251,1)",
                ]
          }
          style={styles.fullOverlay}
        />

        {/* Global Executive Top Header */}
        <View style={styles.topHeader}>
          <View style={styles.navRow}>
            <View style={styles.brandGroup}>
              <LinearGradient
                colors={["#0284c7", "#0369a1"]}
                style={styles.logoBadge}
              >
                <Image
                  source={require("../assets/Logo.png")}
                  style={styles.logoImg}
                />
              </LinearGradient>
              <View style={styles.userGreetingBlock}>
                <Text style={styles.welcomeSubhead}>Welcome back,</Text>
                <Text
                  style={[
                    styles.userNameHeading,
                    { color: isDarkMode ? "#ffffff" : "#0f172a" },
                  ]}
                  numberOfLines={1}
                >
                  {userDisplayName}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.notificationIconBtn,
                {
                  backgroundColor: isDarkMode
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(15,23,42,0.05)",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(15,23,42,0.08)",
                },
              ]}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("Notifications");
              }}
              activeOpacity={0.7}
            >
              <Ionicons
                name="notifications-outline"
                size={21}
                color={isDarkMode ? "#f8fafc" : "#0f172a"}
              />
              <View style={styles.notificationLiveDot} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0284c7", "#38bdf8"]}
              tintColor="#38bdf8"
            />
          }
        >
          {/* 1. Global Holographic Smart Wallet Card */}
          <LinearGradient
            colors={["#0a192f", "#0f2e5c", "#07162c"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.walletHologramCard}
          >
            <View style={styles.walletCardBackdropShine} />

            <View style={styles.walletHeaderRow}>
              <View style={styles.securityTierTag}>
                <MaterialCommunityIcons
                  name="shield-check"
                  size={13}
                  color="#10b981"
                />
                <Text style={styles.securityTierText}>AYAX ENCRYPTED LEDGER</Text>
              </View>

              <TouchableOpacity
                style={styles.historyPill}
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
                activeOpacity={0.8}
              >
                <Text style={styles.historyPillText}>Statement</Text>
                <Ionicons name="chevron-forward" size={12} color="#38bdf8" />
              </TouchableOpacity>
            </View>

            <View style={styles.balanceDisplayWrapper}>
              <Text style={styles.balanceCurrencyTag}>₦</Text>
              <Text style={styles.balanceBigNumber}>
                {isBalanceVisible ? formattedBalance : "••••••••"}
              </Text>
              <TouchableOpacity
                style={styles.eyeToggleBtn}
                onPress={() => setIsBalanceVisible(!isBalanceVisible)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={isBalanceVisible ? "eye-outline" : "eye-off-outline"}
                  size={21}
                  color="#38bdf8"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.walletActionRow}>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => navigation.navigate("FundWallet")}
                activeOpacity={0.85}
              >
                <LinearGradient
                  colors={["#0284c7", "#0369a1"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.buttonGradientLayer}
                >
                  <Ionicons name="add-circle" size={17} color="#ffffff" />
                  <Text style={styles.primaryActionText}>ADD MONEY</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={openWhatsApp}
                activeOpacity={0.85}
              >
                <Ionicons name="logo-whatsapp" size={17} color="#22c55e" />
                <Text style={styles.secondaryActionText}>SUPPORT</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* 2. Automated Dedicated Virtual Account Card */}
          <View style={styles.sectionHeaderRow}>
            <Text
              style={[
                styles.modernSectionTitle,
                { color: isDarkMode ? "#ffffff" : "#0f172a" },
              ]}
            >
              My Dedicated Account
            </Text>
            <View style={styles.activeRouteBadge}>
              <Text style={styles.activeRouteText}>24/7 AUTO-CREDIT</Text>
            </View>
          </View>

          <View
            style={[
              styles.dvaCardSurface,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(2,132,199,0.15)",
              },
            ]}
          >
            {virtualAccount && virtualAccount.accountNumber ? (
              <View>
                <View style={styles.dvaMetaRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dvaBankHeading}>
                      {virtualAccount.bankName?.toUpperCase() || "WEMA BANK PLC"}
                    </Text>
                    <Text
                      style={[
                        styles.dvaBeneficiaryName,
                        { color: isDarkMode ? "#94a3b8" : "#64748b" },
                      ]}
                      numberOfLines={1}
                    >
                      {virtualAccount.accountName || userDisplayName}
                    </Text>
                  </View>

                  <MaterialCommunityIcons
                    name="integrated-circuit-chip"
                    size={38}
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
                    {virtualAccount.accountNumber?.match(/.{1,4}/g)?.join(" ") ||
                      virtualAccount.accountNumber}
                  </Text>

                  <TouchableOpacity
                    style={styles.dvaCopyPill}
                    onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="copy-outline" size={13} color="#ffffff" />
                    <Text style={styles.dvaCopyText}>COPY</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.dvaNoteWrapper}>
                  <Ionicons
                    name="flash-outline"
                    size={14}
                    color="#0284c7"
                    style={{ marginTop: 1 }}
                  />
                  <Text
                    style={[
                      styles.dvaExplanation,
                      { color: isDarkMode ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    Transfer any amount to this account for instant automated wallet funding.
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.provisioningCardWrapper}>
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
                <Text
                  style={[
                    styles.provisionDescription,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Click below to generate a permanent dedicated bank account number for instant funding.
                </Text>
                <TouchableOpacity
                  style={styles.provisionActionBtn}
                  onPress={handleGetVirtualAccount}
                  disabled={loadingAccount}
                  activeOpacity={0.85}
                >
                  {loadingAccount ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <>
                      <Ionicons
                        name="card-outline"
                        size={16}
                        color="#ffffff"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.provisionActionText}>
                        Get Virtual Account
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* 3. Quick Funding Channels */}
          <Text
            style={[
              styles.modernSectionTitle,
              {
                color: isDarkMode ? "#ffffff" : "#0f172a",
                marginTop: 24,
                marginBottom: 12,
              },
            ]}
          >
            Quick Wallet Funding
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingRight: 10 }}
            style={styles.bankHorizontalScroll}
          >
            <FundingChannelCard
              title="Automated Bank Transfer"
              desc="Instant deposit via your assigned bank"
              icon="card"
              color="#0284c7"
              isDarkMode={isDarkMode}
              onPress={() => navigation.navigate("FundWallet")}
            />
            <FundingChannelCard
              title="Online Payment Gateway"
              desc="Fund instantly using Card / USSD"
              icon="flash"
              color="#10b981"
              isDarkMode={isDarkMode}
              onPress={() => navigation.navigate("FundWallet")}
            />
          </ScrollView>

          {/* 4. Services Hub */}
          <Text
            style={[
              styles.modernSectionTitle,
              {
                color: isDarkMode ? "#ffffff" : "#0f172a",
                marginTop: 24,
                marginBottom: 12,
              },
            ]}
          >
            Our Services
          </Text>

          <View
            style={[
              styles.servicesBentoContainer,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
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
                label="Data"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyData")}
              />
              <ServiceHubItem
                icon="phone-alt"
                color="#10b981"
                label="Airtime"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyAirtime")}
              />
              <ServiceHubItem
                icon="bolt"
                color="#f59e0b"
                label="Power"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Electricity")}
              />
              <ServiceHubItem
                icon="tv"
                color="#8b5cf6"
                label="Cable"
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
                label="BVN"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BVNScreen")}
              />
              <ServiceHubItem
                icon="shield-alt"
                color="#0369a1"
                label="NIN Valid"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("NINValidation")}
              />
              <ServiceHubItem
                icon="history"
                color="#f97316"
                label="History"
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
              />
            </View>
          </View>

          {/* 5. Trust Infrastructure */}
          <View style={styles.trustInfrastructure}>
            <Text style={styles.trustHeadline}>Why Choose Ayax Xpress?</Text>
            <View style={styles.trustCardsRow}>
              <TrustBadge
                icon="shield-check"
                color="#10b981"
                bg={isDarkMode ? "rgba(16,185,129,0.12)" : "#dcfce7"}
                title="100% Secure"
                sub="Encrypted"
              />
              <TrustBadge
                icon="flash"
                color="#f59e0b"
                bg={isDarkMode ? "rgba(245,158,11,0.12)" : "#fef9c3"}
                title="Instant"
                sub="Automated"
              />
              <TrustBadge
                icon="headset"
                color="#0284c7"
                bg={isDarkMode ? "rgba(2,132,199,0.12)" : "#e0f2fe"}
                title="24/7 Support"
                sub="Reliable"
              />
            </View>
          </View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </ImageBackground>

      {/* Floating Bottom Navigation Hub */}
      <View
        style={[
          styles.bottomNavigationHub,
          {
            backgroundColor: isDarkMode ? "#0d131f" : "#ffffff",
            borderTopColor: isDarkMode
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <NavTabItem
          icon="home"
          label="Home"
          active
          isDarkMode={isDarkMode}
          onPress={() => {}}
        />
        <NavTabItem
          icon="time-outline"
          label="History"
          isDarkMode={isDarkMode}
          onPress={() =>
            navigation.navigate("Main", { screen: "Wallet History" })
          }
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

// Sub Components
const FundingChannelCard = ({ title, desc, icon, color, isDarkMode, onPress }) => (
  <TouchableOpacity
    style={[
      styles.fundingCardSurface,
      {
        backgroundColor: isDarkMode ? "#111927" : "#ffffff",
        borderColor: isDarkMode
          ? "rgba(255,255,255,0.06)"
          : "rgba(2,132,199,0.12)",
      },
    ]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={styles.fundingCardLeft}>
      <View
        style={[
          styles.fundingIconWrapper,
          { backgroundColor: `${color}15` },
        ]}
      >
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <View style={{ flex: 1, paddingRight: 6 }}>
        <Text
          style={[
            styles.fundingTitleText,
            { color: isDarkMode ? "#ffffff" : "#0f172a" },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={styles.fundingDescText} numberOfLines={1}>
          {desc}
        </Text>
      </View>
    </View>
    <Ionicons name="chevron-forward" size={16} color="#0284c7" />
  </TouchableOpacity>
);

const ServiceHubItem = ({ icon, label, color, onPress, isDarkMode }) => (
  <TouchableOpacity
    style={styles.serviceItemTouch}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.serviceIconPill,
        {
          backgroundColor: isDarkMode ? "#1a2436" : "#f8fafc",
          borderColor: isDarkMode
            ? "rgba(255,255,255,0.05)"
            : "#e2e8f0",
        },
      ]}
    >
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text
      style={[
        styles.serviceLabelTypography,
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
        <Ionicons name={icon} size={22} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={22} color={color} />
      )}
    </View>
    <Text style={styles.trustTitleText}>{title}</Text>
    <Text style={styles.trustSubText}>{sub}</Text>
  </View>
);

const NavTabItem = ({ icon, label, active, isDarkMode, onPress }) => (
  <TouchableOpacity
    style={styles.navTabButton}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <Ionicons
      name={icon}
      size={22}
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
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  fullOverlay: { position: "absolute", width: "100%", height: "100%" },
  topHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingBottom: 16,
  },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  brandGroup: { flexDirection: "row", alignItems: "center" },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  logoImg: { width: 28, height: 28, resizeMode: "contain" },
  userGreetingBlock: { marginLeft: 12 },
  welcomeSubhead: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  userNameHeading: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
    maxWidth: width * 0.55,
  },
  notificationIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    position: "relative",
  },
  notificationLiveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10b981",
    position: "absolute",
    top: 10,
    right: 10,
    borderWidth: 1.5,
    borderColor: "#080c14",
  },
  content: { flex: 1, paddingHorizontal: 18 },
  walletHologramCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 10,
    shadowColor: "#0284c7",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    overflow: "hidden",
    position: "relative",
  },
  walletCardBackdropShine: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
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
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
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
  eyeToggleBtn: { marginLeft: 12, padding: 4 },
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
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modernSectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  activeRouteBadge: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeRouteText: {
    color: "#0284c7",
    fontSize: 9,
    fontWeight: "900",
  },
  dvaCardSurface: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
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
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  dvaNumberRow: {
    marginVertical: 12,
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
  dvaNoteWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  dvaExplanation: {
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 6,
    flex: 1,
  },
  provisioningCardWrapper: {
    alignItems: "center",
    paddingVertical: 10,
  },
  provisionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  provisionTitle: { fontSize: 15, fontWeight: "800" },
  provisionDescription: {
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 17,
    paddingHorizontal: 10,
  },
  provisionActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  provisionActionText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
  },
  bankHorizontalScroll: { marginBottom: 12 },
  fundingCardSurface: {
    width: width * 0.72,
    padding: 14,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    elevation: 2,
  },
  fundingCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  fundingIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  fundingTitleText: {
    fontSize: 12,
    fontWeight: "800",
  },
  fundingDescText: {
    fontSize: 10.5,
    color: "#64748b",
    marginTop: 2,
  },
  servicesBentoContainer: {
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    elevation: 2,
  },
  gridMatrix: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceItemTouch: {
    width: "30%",
    alignItems: "center",
    marginVertical: 8,
  },
  serviceIconPill: {
    width: 54,
    height: 54,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    marginBottom: 6,
  },
  serviceLabelTypography: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
  },
  trustInfrastructure: {
    marginTop: 28,
    marginBottom: 10,
  },
  trustHeadline: {
    textAlign: "center",
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  trustCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  trustColumn: { alignItems: "center", width: "30%" },
  trustIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  trustTitleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    textAlign: "center",
  },
  trustSubText: {
    fontSize: 9.5,
    color: "#94a3b8",
    textAlign: "center",
  },
  bottomNavigationHub: {
    height: 80,
    flexDirection: "row",
    borderTopWidth: 1,
    paddingBottom: 16,
    elevation: 20,
  },
  navTabButton: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  navTabLabel: {
    fontSize: 10,
    marginTop: 4,
  },
});

export default HomeScreen;