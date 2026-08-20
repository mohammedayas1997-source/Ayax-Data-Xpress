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
  RefreshControl,
  Dimensions,
  Linking,
  StatusBar,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useFocusEffect } from "@react-navigation/native";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";
const DVA_CACHE_KEY = "@ayax_permanent_virtual_account";

const FundWalletScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);

  const [walletBalance, setWalletBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [userName, setUserName] = useState("");
  const [amount, setAmount] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingInit, setLoadingInit] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // 1. Dauko tsohon asusu da aka riga aka ajiye a waya nan take
  const loadCachedAccount = async () => {
    try {
      const savedAcc = await AsyncStorage.getItem(DVA_CACHE_KEY);
      if (savedAcc) {
        setVirtualAccount(JSON.parse(savedAcc));
      }
      const savedUser = await AsyncStorage.getItem("userData");
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        setUserName(parsed?.name || `${parsed?.firstName || ""} ${parsed?.surname || ""}`.trim());
      }
    } catch (e) {
      console.log("Cache load error:", e.message);
    }
  };

  // 2. Dauko sabbin bayanai daga Server
  const fetchWalletData = useCallback(
    async (isSilent = false) => {
      try {
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
          axios.get(`${BASE_URL}/user/profile`, { headers }).catch(() =>
            axios.get(`${BASE_URL}/auth/profile`, { headers })
          ),
          axios.get(`${BASE_URL}/wallet/balance`, { headers }),
        ]);

        if (profileRes.status === "fulfilled" && profileRes.value?.data?.success) {
          const user = profileRes.value.data.user || profileRes.value.data.data;
          setUserName(
            user?.name || `${user?.firstName || ""} ${user?.surname || ""}`.trim()
          );

          const liveBal = Number(user.walletBalance ?? user.balance ?? 0);
          setWalletBalance(liveBal);

          const accNum =
            user.virtualAccount?.accountNumber ||
            user.accountNumber ||
            user.virtualAccountNumber;

          if (accNum) {
            const acc = {
              bankName:
                user.virtualAccount?.bankName || user.bankName || "Wema Bank",
              accountNumber: accNum,
              accountName:
                user.virtualAccount?.accountName ||
                user.accountName ||
                user.name ||
                `${user.firstName || ""} ${user.surname || ""}`.trim(),
            };
            setVirtualAccount(acc);
            await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(acc));
          }
        }

        if (balanceRes.status === "fulfilled" && balanceRes.value?.data?.success) {
          const bal = Number(
            balanceRes.value.data.balance ??
              balanceRes.value.data.walletBalance ??
              0
          );
          setWalletBalance(bal);
        }
      } catch (err) {
        if (!isSilent) {
          console.log("Wallet fetch error:", err.message);
        }
      } finally {
        if (!isSilent) setFetchingData(false);
      }
    },
    [navigation]
  );

  useFocusEffect(
    useCallback(() => {
      loadCachedAccount();
      fetchWalletData(false);

      const intervalId = setInterval(() => {
        fetchWalletData(true);
      }, 10000);

      return () => clearInterval(intervalId);
    }, [fetchWalletData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletData(false);
    setRefreshing(false);
  };

  // 3. Samar da Virtual Account tare da Ajiye shi Dindindin
  const handleGenerateVirtualAccount = async () => {
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

      // Gwada hanyoyi biyu kamar na HomeScreen
      try {
        response = await axios.post(
          `${BASE_URL}/wallet/generate-virtual-account`,
          {},
          { headers }
        );
      } catch (e1) {
        lastError = e1;
        try {
          response = await axios.post(
            `${BASE_URL}/virtual-account/create`,
            {},
            { headers }
          );
        } catch (e2) {
          lastError = e2;
        }
      }

      if (response && response.data && (response.data.success || response.status === 200)) {
        const acc =
          response.data.virtualAccount ||
          response.data.data ||
          response.data.account;

        const accNum =
          acc?.accountNumber ||
          acc?.virtualAccountNumber ||
          response.data?.accountNumber;

        if (accNum) {
          const finalAcc = {
            bankName: acc?.bankName || "Wema Bank",
            accountNumber: accNum,
            accountName:
              acc?.accountName ||
              userName ||
              "Ayax User",
          };

          setVirtualAccount(finalAcc);
          await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(finalAcc));
          await fetchWalletData(true);

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
        "Could not generate virtual account. Please try again.";
      Alert.alert("Notice", errorMsg);
    } catch (error) {
      console.error("DVA Generation Error:", error.response?.data || error.message);
      Alert.alert(
        "Provisioning Failed",
        error.response?.data?.message || "Could not generate virtual account."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  // 4. Online Card / USSD Payment Gateway
  const handleOnlinePayment = async () => {
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
        { amount: numAmount },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.success && response.data?.data?.authorization_url) {
        const authUrl = response.data.data.authorization_url;
        await Linking.openURL(authUrl);
      } else {
        Alert.alert("Error", "Could not retrieve payment gateway link.");
      }
    } catch (error) {
      console.error("Initialize error:", error.response?.data || error.message);
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "Failed to initialize online payment."
      );
    } finally {
      setLoadingInit(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    if (Platform.OS === "android") {
      ToastAndroid.show("Account Number Copied", ToastAndroid.SHORT);
    } else {
      Alert.alert("Copied", text);
    }
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#080c14" : "#f4f7fb" },
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0284c7", "#38bdf8"]}
            tintColor="#38bdf8"
          />
        }
      >
        {/* Tier-1 Executive Hero Header */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0c1322", "#080c14"]
              : ["#0284c7", "#0369a1"]
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
              <Text style={styles.secureText}>256-BIT ENCRYPTED</Text>
            </View>
          </View>

          <View style={styles.balanceDisplayCard}>
            <Text style={styles.balanceLabel}>AVAILABLE WALLET BALANCE</Text>
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
                { color: isDarkMode ? "#ffffff" : "#0f172a" },
              ]}
            >
              Method 1: Instant Bank Transfer
            </Text>
            <View style={styles.badgeRecommended}>
              <Text style={styles.badgeRecommendedText}>RECOMMENDED</Text>
            </View>
          </View>

          {fetchingData && !virtualAccount ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loadingText}>Fetching payment channels...</Text>
            </View>
          ) : virtualAccount && virtualAccount.accountNumber ? (
            <LinearGradient
              colors={
                isDarkMode
                  ? ["#111927", "#0d131f"]
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
                  <Text
                    style={[
                      styles.dvaBeneficiaryName,
                      { color: isDarkMode ? "#94a3b8" : "#64748b" },
                    ]}
                  >
                    {virtualAccount.accountName || userName || "Ayax User"}
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
                  {virtualAccount.accountNumber.match(/.{1,4}/g)?.join(" ") ||
                    virtualAccount.accountNumber}
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
                  Transfer any amount from your bank app to this account number. Your wallet will be credited automatically within seconds.
                </Text>
              </View>
            </LinearGradient>
          ) : (
            <View
              style={[
                styles.emptyProvisionCard,
                {
                  backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#e2e8f0",
                },
              ]}
            >
              <View style={styles.emptyIconWrap}>
                <Ionicons name="card-outline" size={32} color="#0284c7" />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDarkMode ? "#ffffff" : "#0f172a" },
                ]}
              >
                No Virtual Account Assigned
              </Text>
              <Text style={styles.emptySub}>
                Click below to generate a permanent dedicated bank account number for instant auto-funding.
              </Text>
              <TouchableOpacity
                style={styles.provisionBtn}
                onPress={handleGenerateVirtualAccount}
                disabled={loadingAccount}
                activeOpacity={0.85}
              >
                {loadingAccount ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color="#ffffff" />
                    <Text style={styles.provisionBtnText}>
                      GENERATE DEDICATED ACCOUNT
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Method 2: Online Card / USSD Payment */}
          <Text
            style={[
              styles.sectionTitle,
              {
                color: isDarkMode ? "#ffffff" : "#0f172a",
                marginTop: 28,
                marginBottom: 12,
              },
            ]}
          >
            Method 2: Debit Card / USSD Online Top-up
          </Text>

          <View
            style={[
              styles.cardPaymentBox,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            <Text style={styles.inputLabel}>ENTER AMOUNT (₦)</Text>
            <View
              style={[
                styles.inputRow,
                {
                  backgroundColor: isDarkMode ? "#1a2436" : "#f8fafc",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#cbd5e1",
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
                      backgroundColor: isDarkMode ? "#131c2e" : "#f1f5f9",
                      borderColor:
                        amount === preset.toString()
                          ? "#0284c7"
                          : isDarkMode
                          ? "rgba(255,255,255,0.05)"
                          : "transparent",
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
              onPress={handleOnlinePayment}
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
                    <Ionicons name="lock-closed" size={16} color="#ffffff" />
                    <Text style={styles.payOnlineBtnText}>
                      PROCEED TO SECURE CHECKOUT
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
    backgroundColor: "rgba(0, 0, 0, 0.2)",
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
  },
  bodyContent: { paddingHorizontal: 18, marginTop: 22 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  badgeRecommended: {
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeRecommendedText: { color: "#10b981", fontSize: 9, fontWeight: "900" },
  loadingBox: {
    paddingVertical: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
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
    fontSize: 12,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});

export default FundWalletScreen;