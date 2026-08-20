import React, { useState, useContext, useCallback } from "react";
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
const DVA_CACHE_KEY = "@ayax_user_dva_account";

const FundWalletScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);

  // States
  const [activeTab, setActiveTab] = useState("transfer"); // "transfer" | "card"
  const [walletBalance, setWalletBalance] = useState(0);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [userName, setUserName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loadingAccount, setLoadingAccount] = useState(false);
  const [loadingPayment, setLoadingPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);

  // 1. Fetch Fresh Ledger Balance & Virtual Account Matrix
  const fetchWalletDetails = useCallback(async (isSilent = false) => {
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
        setUserName(user?.name || `${user?.firstName || ""} ${user?.surname || ""}`.trim());

        const liveBal = Number(user.walletBalance ?? user.balance ?? 0);
        setWalletBalance(liveBal);

        if (user.virtualAccount?.accountNumber || user.accountNumber) {
          const acc = {
            bankName: user.virtualAccount?.bankName || user.bankName || "Wema Bank",
            accountNumber: user.virtualAccount?.accountNumber || user.accountNumber,
            accountName: user.virtualAccount?.accountName || user.accountName || user.name,
          };
          setVirtualAccount(acc);
          await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(acc));
        }
      }

      if (balanceRes.status === "fulfilled" && balanceRes.value.data?.success) {
        const bal = Number(balanceRes.value.data.balance ?? balanceRes.value.data.walletBalance ?? 0);
        setWalletBalance(bal);
      }
    } catch (err) {
      if (!isSilent) {
        console.log("Wallet fetch error:", err.message);
      }
    } finally {
      if (!isSilent) setFetchingData(false);
    }
  }, [navigation]);

  // Real-time Background Polling
  useFocusEffect(
    useCallback(() => {
      fetchWalletDetails(false);

      const intervalId = setInterval(() => {
        fetchWalletDetails(true);
      }, 10000);

      return () => clearInterval(intervalId);
    }, [fetchWalletDetails])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchWalletDetails(false);
    setRefreshing(false);
  };

  // 2. Generate Dedicated NUBAN Virtual Account
  const handleGenerateVirtualAccount = async () => {
    try {
      setLoadingAccount(true);
      const token = await AsyncStorage.getItem("userToken");

      const response = await axios.post(
        `${BASE_URL}/wallet/generate-virtual-account`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.data?.success) {
        const acc = response.data.virtualAccount || response.data.data;
        setVirtualAccount(acc);
        await AsyncStorage.setItem(DVA_CACHE_KEY, JSON.stringify(acc));
        await fetchWalletDetails(false);
        showToast("Dedicated Virtual Account Assigned Successfully!");
      }
    } catch (error) {
      console.error("DVA Generation Error:", error.response?.data || error.message);
      Alert.alert(
        "Provisioning Failed",
        error.response?.data?.message || "Could not generate virtual account. Please try again."
      );
    } finally {
      setLoadingAccount(false);
    }
  };

  // 3. Online Gateway Payment (Paystack / Web)
  const handleOnlinePayment = async () => {
    const numAmount = Number(amount);
    if (!amount || isNaN(numAmount) || numAmount < 100) {
      Alert.alert("Invalid Parameter", "Minimum deposit amount is ₦100.00");
      return;
    }

    try {
      setLoadingPayment(true);
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
        Alert.alert("Gateway Notice", "Could not establish secure checkout tunnel.");
      }
    } catch (error) {
      console.error("Payment initialization error:", error.response?.data || error.message);
      Alert.alert(
        "Payment Blocked",
        error.response?.data?.message || "Failed to initialize payment gateway."
      );
    } finally {
      setLoadingPayment(false);
    }
  };

  const copyToClipboard = async (text) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showToast("NUBAN Copied to Clipboard");
  };

  const showToast = (msg) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert("Notice", msg);
    }
  };

  return (
    <View
      style={[
        styles.rootContainer,
        { backgroundColor: isDarkMode ? "#080c14" : "#f4f7fb" },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
        backgroundColor="transparent"
      />

      <ScrollView
        style={styles.scrollWrapper}
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
        {/* World-Class Executive Hero */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0c1322", "#080c14"]
              : ["#0284c7", "#0369a1"]
          }
          style={styles.executiveHero}
        >
          <View style={styles.topNavigationRow}>
            <TouchableOpacity
              style={styles.backButtonBubble}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.securityShieldPill}>
              <MaterialCommunityIcons name="shield-check" size={14} color="#10b981" />
              <Text style={styles.securityShieldText}>PCI-DSS SECURED</Text>
            </View>
          </View>

          <View style={styles.ledgerBalanceCard}>
            <Text style={styles.ledgerTitle}>AVAILABLE BALANCE</Text>
            <View style={styles.balanceValueRow}>
              <Text style={styles.nairaCurrencyTag}>₦</Text>
              <Text style={styles.ledgerNumericAmount}>
                {walletBalance.toLocaleString("en-NG", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
            <View style={styles.liveSyncBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.liveSyncText}>Real-time Automated Ledger Active</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.mainBodyContainer}>
          {/* Segmented Mode Selector */}
          <View
            style={[
              styles.segmentedTabContainer,
              {
                backgroundColor: isDarkMode ? "#111927" : "#e2e8f0",
                borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#cbd5e1",
              },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === "transfer" && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab("transfer")}
            >
              <MaterialCommunityIcons
                name="bank-transfer"
                size={18}
                color={activeTab === "transfer" ? "#ffffff" : isDarkMode ? "#64748b" : "#475569"}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === "transfer" && styles.segmentButtonTextActive,
                  { color: activeTab === "transfer" ? "#ffffff" : isDarkMode ? "#64748b" : "#475569" },
                ]}
              >
                Bank Transfer (DVA)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentButton,
                activeTab === "card" && styles.segmentButtonActive,
              ]}
              onPress={() => setActiveTab("card")}
            >
              <Ionicons
                name="card-outline"
                size={16}
                color={activeTab === "card" ? "#ffffff" : isDarkMode ? "#64748b" : "#475569"}
              />
              <Text
                style={[
                  styles.segmentButtonText,
                  activeTab === "card" && styles.segmentButtonTextActive,
                  { color: activeTab === "card" ? "#ffffff" : isDarkMode ? "#64748b" : "#475569" },
                ]}
              >
                Instant Gateway
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab 1: Automated Dedicated Bank Account */}
          {activeTab === "transfer" ? (
            <View style={styles.tabContentWrapper}>
              <View style={styles.featureHeaderRow}>
                <Text
                  style={[
                    styles.featureHeadingTitle,
                    { color: isDarkMode ? "#ffffff" : "#0f172a" },
                  ]}
                >
                  Dedicated Virtual Account
                </Text>
                <View style={styles.badgeZeroFees}>
                  <Text style={styles.badgeZeroFeesText}>24/7 AUTO-CREDIT</Text>
                </View>
              </View>

              {fetchingData ? (
                <View style={styles.loaderBox}>
                  <ActivityIndicator size="large" color="#0284c7" />
                  <Text style={styles.loaderSubtitle}>Synchronizing bank nodes...</Text>
                </View>
              ) : virtualAccount?.accountNumber ? (
                /* Premium Hologram Smart Card */
                <LinearGradient
                  colors={["#0a192f", "#0f2e5c", "#07162c"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.smartHologramCard}
                >
                  <View style={styles.smartCardHeader}>
                    <View>
                      <Text style={styles.smartBankName}>
                        {virtualAccount.bankName?.toUpperCase() || "WEMA BANK PLC"}
                      </Text>
                      <Text style={styles.smartSubRoute}>AUTOMATED NUBAN SETTLEMENT</Text>
                    </View>
                    <MaterialCommunityIcons
                      name="integrated-circuit-chip"
                      size={40}
                      color="#f59e0b"
                    />
                  </View>

                  <View style={styles.smartCardBody}>
                    <Text style={styles.smartAccountNumber}>
                      {virtualAccount.accountNumber.match(/.{1,4}/g)?.join(" ") ||
                        virtualAccount.accountNumber}
                    </Text>

                    <TouchableOpacity
                      style={styles.smartCopyBadge}
                      onPress={() => copyToClipboard(virtualAccount.accountNumber)}
                    >
                      <Ionicons name="copy-outline" size={14} color="#ffffff" />
                      <Text style={styles.smartCopyBadgeText}>COPY</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.smartCardFooter}>
                    <View>
                      <Text style={styles.smartHolderLabel}>BENEFICIARY HOLDER</Text>
                      <Text style={styles.smartHolderName} numberOfLines={1}>
                        {virtualAccount.accountName || userName || "Ayax Member"}
                      </Text>
                    </View>
                    <View style={styles.activeStatusPill}>
                      <Text style={styles.activeStatusPillText}>PERMANENT & ACTIVE</Text>
                    </View>
                  </View>
                </LinearGradient>
              ) : (
                /* Provisioning Trigger Card */
                <View
                  style={[
                    styles.provisioningCard,
                    {
                      backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                      borderColor: isDarkMode
                        ? "rgba(255,255,255,0.08)"
                        : "#e2e8f0",
                    },
                  ]}
                >
                  <View style={styles.provisionIconContainer}>
                    <Ionicons name="card" size={32} color="#0284c7" />
                  </View>
                  <Text
                    style={[
                      styles.provisionCardTitle,
                      { color: isDarkMode ? "#ffffff" : "#0f172a" },
                    ]}
                  >
                    No Virtual Account Assigned
                  </Text>
                  <Text style={styles.provisionCardSubtitle}>
                    Generate your permanent dedicated bank account number to enable instant bank-to-wallet top-ups.
                  </Text>
                  <TouchableOpacity
                    style={styles.provisionActionTrigger}
                    onPress={handleGenerateVirtualAccount}
                    disabled={loadingAccount}
                  >
                    {loadingAccount ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="sparkles" size={16} color="#ffffff" />
                        <Text style={styles.provisionActionTriggerText}>
                          GENERATE INSTANT VIRTUAL ACCOUNT
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Informational Advisory Notice */}
              <View
                style={[
                  styles.advisoryNoticeBox,
                  {
                    backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                    borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#e2e8f0",
                  },
                ]}
              >
                <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={[
                      styles.advisoryTitle,
                      { color: isDarkMode ? "#ffffff" : "#0f172a" },
                    ]}
                  >
                    Zero-Delay Settlement
                  </Text>
                  <Text style={styles.advisoryBody}>
                    Direct bank transfers made to this dedicated NUBAN will instantly reflect in your available balance 24/7 without manual receipt confirmation.
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            /* Tab 2: Online Payment Gateway (Cards / USSD) */
            <View style={styles.tabContentWrapper}>
              <Text
                style={[
                  styles.featureHeadingTitle,
                  { color: isDarkMode ? "#ffffff" : "#0f172a", marginBottom: 12 },
                ]}
              >
                Enter Deposit Amount
              </Text>

              <View
                style={[
                  styles.paymentInputCard,
                  {
                    backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                    borderColor: isDarkMode ? "rgba(255,255,255,0.06)" : "#e2e8f0",
                  },
                ]}
              >
                <Text style={styles.fieldLabelMeta}>AMOUNT TO FUND (₦)</Text>
                <View
                  style={[
                    styles.inputFieldContainer,
                    {
                      backgroundColor: isDarkMode ? "#1a2436" : "#f8fafc",
                      borderColor: isDarkMode ? "rgba(255,255,255,0.08)" : "#cbd5e1",
                    },
                  ]}
                >
                  <Text style={styles.inputPrefix}>₦</Text>
                  <TextInput
                    style={[
                      styles.textInputField,
                      { color: isDarkMode ? "#ffffff" : "#0f172a" },
                    ]}
                    placeholder="e.g. 5,000"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                  />
                </View>

                {/* Fast Preset Chips */}
                <View style={styles.chipsContainer}>
                  {[1000, 2000, 5000, 10000].map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.quickChip,
                        {
                          backgroundColor: isDarkMode ? "#1a2436" : "#f1f5f9",
                          borderColor:
                            amount === preset.toString()
                              ? "#0284c7"
                              : isDarkMode
                              ? "rgba(255,255,255,0.06)"
                              : "#e2e8f0",
                        },
                      ]}
                      onPress={() => setAmount(preset.toString())}
                    >
                      <Text
                        style={[
                          styles.quickChipText,
                          {
                            color:
                              amount === preset.toString()
                                ? "#0284c7"
                                : isDarkMode
                                ? "#cbd5e1"
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
                  style={styles.actionGatewayBtn}
                  onPress={handleOnlinePayment}
                  disabled={loadingPayment}
                >
                  <LinearGradient
                    colors={["#0284c7", "#0369a1"]}
                    style={styles.actionGatewayBtnGradient}
                  >
                    {loadingPayment ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={16} color="#ffffff" />
                        <Text style={styles.actionGatewayBtnText}>
                          PROCEED WITH SECURE GATEWAY
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  scrollWrapper: { flex: 1 },
  executiveHero: {
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNavigationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  backButtonBubble: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  securityShieldPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  securityShieldText: {
    color: "#10b981",
    fontSize: 9.5,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  ledgerBalanceCard: {
    backgroundColor: "rgba(0, 0, 0, 0.22)",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  ledgerTitle: {
    color: "#cbd5e1",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  balanceValueRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  nairaCurrencyTag: {
    color: "#38bdf8",
    fontSize: 24,
    fontWeight: "900",
    marginRight: 4,
  },
  ledgerNumericAmount: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  liveSyncBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10b981",
    marginRight: 6,
  },
  liveSyncText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
  },
  mainBodyContainer: { paddingHorizontal: 20, marginTop: 20 },
  segmentedTabContainer: {
    flexDirection: "row",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
  },
  segmentButton: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  segmentButtonActive: {
    backgroundColor: "#0284c7",
    elevation: 3,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  segmentButtonTextActive: {
    fontWeight: "800",
  },
  tabContentWrapper: { width: "100%" },
  featureHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  featureHeadingTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  badgeZeroFees: {
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeZeroFeesText: { color: "#0284c7", fontSize: 9, fontWeight: "900" },
  loaderBox: {
    paddingVertical: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderSubtitle: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  smartHologramCard: {
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 8,
  },
  smartCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smartBankName: {
    color: "#38bdf8",
    fontSize: 15,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  smartSubRoute: {
    color: "#94a3b8",
    fontSize: 9.5,
    fontWeight: "800",
    marginTop: 2,
  },
  smartCardBody: {
    marginVertical: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  smartAccountNumber: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  smartCopyBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  smartCopyBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "900",
    marginLeft: 4,
  },
  smartCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  smartHolderLabel: {
    color: "#64748b",
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  smartHolderName: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
    maxWidth: width * 0.5,
  },
  activeStatusPill: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  activeStatusPillText: {
    color: "#10b981",
    fontSize: 9,
    fontWeight: "900",
  },
  provisioningCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
  },
  provisionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(2, 132, 199, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  provisionCardTitle: { fontSize: 16, fontWeight: "800" },
  provisionCardSubtitle: {
    color: "#64748b",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 18,
    lineHeight: 18,
  },
  provisionActionTrigger: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  provisionActionTriggerText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "900",
    letterSpacing: 0.5,
    marginLeft: 6,
  },
  advisoryNoticeBox: {
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    marginTop: 18,
    alignItems: "center",
    borderWidth: 1,
  },
  advisoryTitle: { fontSize: 13, fontWeight: "800", marginBottom: 3 },
  advisoryBody: { color: "#64748b", fontSize: 11.5, lineHeight: 17 },
  paymentInputCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    elevation: 2,
  },
  fieldLabelMeta: {
    color: "#64748b",
    fontSize: 10.5,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputFieldContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
  },
  inputPrefix: {
    color: "#0284c7",
    fontSize: 18,
    fontWeight: "900",
    marginRight: 8,
  },
  textInputField: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  chipsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 16,
  },
  quickChip: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  quickChipText: { fontSize: 11, fontWeight: "700" },
  actionGatewayBtn: {
    height: 48,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 4,
  },
  actionGatewayBtnGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionGatewayBtnText: {
    color: "#ffffff",
    fontSize: 11.5,
    fontWeight: "900",
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});

export default FundWalletScreen;