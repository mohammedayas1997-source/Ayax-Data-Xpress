import React, { useState, useEffect, useContext, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ToastAndroid,
  Dimensions,
  Linking,
  StatusBar,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const FundWalletScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);

  const [userData, setUserData] = useState(null);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [amount, setAmount] = useState("");
  const [loadingInit, setLoadingInit] = useState(false);

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
    fetchUserData();
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
  const fetchUserData = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
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
      } else {
        console.error("Profile Synchronization Failure:", err.message);
      }
    }
  }, [navigation]);

  // 3. Virtual Account Creation Handler
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
      Alert.alert(
        "Error",
        "Could not generate virtual account. Please try again later."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  // 4. Secure Paystack Direct Checkout Integration
  const handlePaystackPayment = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < 100) {
      Alert.alert("Invalid Amount", "Minimum funding amount is ₦100.");
      return;
    }

    try {
      setLoadingInit(true);
      const token = await AsyncStorage.getItem("userToken");

      const response = await axios.post(
        `${BASE_URL}/wallet/initialize`,
        { amount: numAmount, gateway: "paystack" },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const authUrl =
        response.data?.data?.authorization_url ||
        response.data?.authorization_url ||
        response.data?.data?.checkout_url;

      if (response.data?.success && authUrl) {
        await Linking.openURL(authUrl);
      } else {
        Alert.alert("Error", "Could not retrieve Paystack payment checkout link.");
      }
    } catch (error) {
      console.error("Initialize error:", error.response?.data || error.message);
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "Failed to initialize Paystack checkout."
      );
    } finally {
      setLoadingInit(false);
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

  const walletBalance = Number(
    userData?.walletBalance !== undefined
      ? userData.walletBalance
      : userData?.balance !== undefined
      ? userData.balance
      : 0
  );

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#030712" : "#f8fafc" },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Modern Fintech Header */}
        <LinearGradient
          colors={
            isDarkMode ? ["#0f172a", "#030712"] : ["#0284c7", "#0369a1"]
          }
          style={styles.headerHero}
        >
          <View style={styles.topNavigation}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.secureBadge}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color="#10b981"
              />
              <Text style={styles.secureText}>256-BIT ENCRYPTION</Text>
            </View>
          </View>

          <View style={styles.balanceDisplayCard}>
            <Text style={styles.balanceLabel}>CURRENT WALLET BALANCE</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceSymbol}>₦</Text>
              <Text style={styles.balanceValue}>
                {walletBalance.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <Text style={styles.autoCreditNote}>
              ⚡ Real-time automated balance sync active
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.bodyContent}>
          {/* Method 1: Dedicated Virtual Account (Bank Transfer) */}
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? "#f8fafc" : "#0f172a" },
              ]}
            >
              Method 1: Direct Bank Transfer
            </Text>
            <View style={styles.badgeRecommended}>
              <Text style={styles.badgeRecommendedText}>INSTANT CREDIT</Text>
            </View>
          </View>

          {virtualAccount ? (
            <LinearGradient
              colors={
                isDarkMode ? ["#111827", "#0b1120"] : ["#ffffff", "#f8fafc"]
              }
              style={[
                styles.dvaCardSurface,
                {
                  borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
                },
              ]}
            >
              <View style={styles.dvaMetaRow}>
                <View>
                  <Text style={styles.dvaBankHeading}>
                    {virtualAccount.bankName}
                  </Text>
                  <Text
                    style={[
                      styles.dvaBeneficiaryName,
                      { color: isDarkMode ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    {virtualAccount.accountName}
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
                    { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                  ]}
                >
                  {virtualAccount.accountNumber}
                </Text>

                <TouchableOpacity
                  style={styles.dvaCopyBtn}
                  onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="copy-outline" size={14} color="#ffffff" />
                  <Text style={styles.dvaCopyText}>COPY</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.dvaInstructionBox}>
                <Ionicons name="information-circle" size={16} color="#0284c7" />
                <Text
                  style={[
                    styles.dvaInstructionText,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Transfer any amount to this account for automatic instant wallet funding.
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.emptyProvisionCard,
                {
                  backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                  borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
                },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={30} color="#0284c7" />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
              >
                No Virtual Account Assigned
              </Text>
              <Text style={styles.emptySub}>
                Your dedicated automated deposit account is ready for activation.
              </Text>
              <TouchableOpacity
                style={styles.provisionBtn}
                onPress={handleGetVirtualAccount}
                disabled={loadingAccount}
                activeOpacity={0.85}
              >
                {loadingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={15} color="#ffffff" />
                    <Text style={styles.provisionBtnText}>
                      Get Dedicated Account
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Network Fallback Warning Box */}
          <View
            style={[
              styles.networkNoticeBox,
              {
                backgroundColor: isDarkMode ? "#172554" : "#eff6ff",
                borderColor: isDarkMode ? "#1e40af" : "#bfdbfe",
              },
            ]}
          >
            <Ionicons name="swap-horizontal" size={18} color="#0284c7" style={{ marginTop: 2 }} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text
                style={[
                  styles.networkNoticeTitle,
                  { color: isDarkMode ? "#93c5fd" : "#1e40af" },
                ]}
              >
                Experiencing Bank Network Delays?
              </Text>
              <Text
                style={[
                  styles.networkNoticeSub,
                  { color: isDarkMode ? "#bfdbfe" : "#3b82f6" },
                ]}
              >
                Use the Paystack Gateway below to complete your payment with Zero Delays using Card, Bank App, or USSD.
              </Text>
            </View>
          </View>

          {/* Method 2: Paystack Gateway Checkout */}
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDarkMode ? "#f8fafc" : "#0f172a" },
              ]}
            >
              Method 2: Paystack Online Gateway
            </Text>
            <View style={styles.badgePaystack}>
              <Text style={styles.badgePaystackText}>SECURE GATEWAY</Text>
            </View>
          </View>

          <View
            style={[
              styles.cardPaymentBox,
              {
                backgroundColor: isDarkMode ? "#111827" : "#ffffff",
                borderColor: isDarkMode ? "#1f2937" : "#e2e8f0",
              },
            ]}
          >
            <Text style={styles.inputLabel}>ENTER AMOUNT (₦)</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDarkMode ? "#0f172a" : "#f8fafc",
                  borderColor: isDarkMode ? "#334155" : "#cbd5e1",
                },
              ]}
            >
              <Text style={styles.inputCurrencyPrefix}>₦</Text>
              <TextInput
                style={[
                  styles.amountInput,
                  { color: isDarkMode ? "#ffffff" : "#0f172a" },
                ]}
                placeholder="e.g. 2000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Quick Amount Chips */}
            <View style={styles.quickChipsRow}>
              {[500, 1000, 2000, 5000].map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.presetChip,
                    {
                      backgroundColor: isDarkMode ? "#0f172a" : "#f1f5f9",
                      borderColor:
                        amount === preset.toString()
                          ? "#0284c7"
                          : isDarkMode
                          ? "#1e293b"
                          : "#e2e8f0",
                    },
                  ]}
                  onPress={() => setAmount(preset.toString())}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      {
                        color:
                          amount === preset.toString()
                            ? "#0284c7"
                            : isDarkMode
                            ? "#94a3b8"
                            : "#475569",
                      },
                    ]}
                  >
                    ₦{preset.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.payOnlineBtn}
              onPress={handlePaystackPayment}
              disabled={loadingInit}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0284c7", "#0369a1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.payOnlineGradient}
              >
                {loadingInit ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="card" size={16} color="#ffffff" />
                    <Text style={styles.payOnlineBtnText}>
                      PAY VIA PAYSTACK (CARD / USSD / APP)
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  headerHero: {
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: 20,
    paddingBottom: 26,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  secureText: {
    color: "#10b981",
    fontSize: 9.5,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  balanceDisplayCard: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  balanceLabel: {
    color: "#cbd5e1",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  balanceSymbol: {
    color: "#38bdf8",
    fontSize: 24,
    fontWeight: "900",
    marginRight: 4,
  },
  balanceValue: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  autoCreditNote: {
    color: "#94a3b8",
    fontSize: 11,
    marginTop: 2,
    fontWeight: "500",
  },
  bodyContent: { paddingHorizontal: 18, marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 14, fontWeight: "800", letterSpacing: -0.2 },
  badgeRecommended: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeRecommendedText: { color: "#10b981", fontSize: 9, fontWeight: "900" },
  badgePaystack: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgePaystackText: { color: "#0284c7", fontSize: 9, fontWeight: "900" },
  dvaCardSurface: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    elevation: 2,
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
  dvaCopyBtn: {
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
    letterSpacing: 0.5,
  },
  dvaInstructionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(2, 132, 199, 0.08)",
    padding: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  dvaInstructionText: {
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 6,
    flex: 1,
    fontWeight: "500",
  },
  emptyProvisionCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800" },
  emptySub: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
    fontWeight: "500",
  },
  provisionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  provisionBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  networkNoticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 22,
    marginBottom: 20,
  },
  networkNoticeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 3,
  },
  networkNoticeSub: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  cardPaymentBox: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    elevation: 2,
  },
  inputLabel: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 50,
  },
  inputCurrencyPrefix: {
    color: "#0284c7",
    fontSize: 18,
    fontWeight: "900",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  quickChipsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 14,
  },
  presetChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  presetChipText: { fontSize: 11, fontWeight: "700" },
  payOnlineBtn: {
    height: 50,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  payOnlineGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  payOnlineBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});

export default FundWalletScreen;