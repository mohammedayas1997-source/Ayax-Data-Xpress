import React, { useState, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
  StatusBar,
} from "react-native";
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const FundWalletScreen = ({ navigation, route }) => {
  const { isDarkMode } = useContext(ThemeContext);

  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  // Quick Amount Presets don saukin zaba
  const PRESET_AMOUNTS = [1000, 2000, 5000, 10000];

  // Ainihin tsarin logic na asali (Ba a canza komai ba)
  const handleFundWallet = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Error", "Don Allah saka adadin kuɗin da ya dace (Amount).");
      return;
    }

    setLoading(true);
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
          "Content-Type": "application/json",
        },
      };

      const payload = {
        amount: Number(amount),
        note: note || "User Wallet Funding",
      };

      const response = await axios.post(
        `${BASE_URL}/wallet/fund-wallet`,
        payload,
        config
      );

      if (response.data.success || response.status === 200 || response.status === 201) {
        Alert.alert(
          "Success!",
          `An yi nasarar zuba ₦${amount} a asusunka.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error("Fund Wallet Error:", error);
      const errorMsg = error.response?.data?.message || "An samu matsala wajen saka kuɗin.";
      Alert.alert("Failed", errorMsg);
    } finally {
      setLoading(false);
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
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Tier-1 Executive Hero Header */}
        <LinearGradient
          colors={
            isDarkMode
              ? ["#0c1322", "#080c14"]
              : ["#0284c7", "#0369a1"]
          }
          style={styles.heroHeader}
        >
          <View style={styles.topNavigation}>
            <TouchableOpacity
              style={styles.backNavBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.securityTag}>
              <MaterialCommunityIcons
                name="shield-check"
                size={14}
                color="#10b981"
              />
              <Text style={styles.securityTagText}>256-BIT ENCRYPTED</Text>
            </View>
          </View>

          <View style={styles.headerHeroBody}>
            <View style={styles.walletIconCircle}>
              <FontAwesome5 name="wallet" size={26} color="#38bdf8" />
            </View>
            <Text style={styles.heroTitle}>Fund Wallet</Text>
            <Text style={styles.heroSubtitle}>
              Add balance to your personal account
            </Text>
          </View>
        </LinearGradient>

        <View style={styles.bodyWrapper}>
          {/* Main Card Surface */}
          <View
            style={[
              styles.cardSurface,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            {/* Amount Field */}
            <Text style={styles.inputLabelTypography}>AMOUNT (₦)</Text>
            <View
              style={[
                styles.amountInputGroup,
                {
                  backgroundColor: isDarkMode ? "#1a2436" : "#f8fafc",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#cbd5e1",
                },
              ]}
            >
              <FontAwesome5 name="money-bill-wave" size={18} color="#0284c7" />
              <TextInput
                style={[
                  styles.amountInputTypography,
                  { color: isDarkMode ? "#ffffff" : "#0f172a" },
                ]}
                placeholder="e.g. 5000"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            {/* Quick Amount Selector Chips */}
            <View style={styles.presetChipsMatrix}>
              {PRESET_AMOUNTS.map((preset) => (
                <TouchableOpacity
                  key={preset}
                  style={[
                    styles.chipTouch,
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
                      styles.chipText,
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

            {/* Narration Field */}
            <Text
              style={[
                styles.inputLabelTypography,
                { marginTop: 18 },
              ]}
            >
              NARRATION / NOTE (OPTIONAL)
            </Text>
            <View
              style={[
                styles.standardInputGroup,
                {
                  backgroundColor: isDarkMode ? "#1a2436" : "#f8fafc",
                  borderColor: isDarkMode
                    ? "rgba(255,255,255,0.08)"
                    : "#cbd5e1",
                },
              ]}
            >
              <MaterialIcons name="note" size={20} color="#0284c7" />
              <TextInput
                style={[
                  styles.standardInputTypography,
                  { color: isDarkMode ? "#ffffff" : "#0f172a" },
                ]}
                placeholder="e.g. Top up for data"
                placeholderTextColor="#64748b"
                value={note}
                onChangeText={setNote}
              />
            </View>

            {/* Submit Action Button */}
            <TouchableOpacity
              style={styles.submitActionButton}
              onPress={handleFundWallet}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0284c7", "#0369a1"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.submitButtonGradient}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <>
                    <MaterialIcons
                      name="check-circle"
                      size={20}
                      color="#ffffff"
                    />
                    <Text style={styles.submitActionText}>
                      FUND WALLET
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Secure Clearing Information Note */}
          <View
            style={[
              styles.infoCardWrapper,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            <Ionicons name="flash-outline" size={20} color="#0284c7" />
            <Text
              style={[
                styles.infoCardText,
                { color: isDarkMode ? "#94a3b8" : "#64748b" },
              ]}
            >
              Funds are instantly synchronized across your entire enterprise ledger and available immediately for utility payments and data purchases.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: { flex: 1 },
  scrollContainer: { flex: 1 },
  heroHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  topNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  backNavBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  securityTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  securityTagText: {
    color: "#10b981",
    fontSize: 9.5,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerHeroBody: { alignItems: "center", marginTop: 4 },
  walletIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 12.5,
    marginTop: 4,
    fontWeight: "500",
  },
  bodyWrapper: { paddingHorizontal: 18, marginTop: 22 },
  cardSurface: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  inputLabelTypography: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.6,
    marginBottom: 8,
    marginLeft: 2,
  },
  amountInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 56,
  },
  amountInputTypography: {
    flex: 1,
    marginLeft: 12,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  presetChipsMatrix: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    marginBottom: 6,
  },
  chipTouch: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { fontSize: 11, fontWeight: "700" },
  standardInputGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 22,
  },
  standardInputTypography: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: "600",
  },
  submitActionButton: {
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  submitButtonGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  submitActionText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  infoCardWrapper: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 16,
  },
  infoCardText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    marginLeft: 10,
    fontWeight: "500",
  },
});

export default FundWalletScreen;