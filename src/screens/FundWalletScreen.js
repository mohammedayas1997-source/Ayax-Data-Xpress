import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const FundWalletScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Fetch user profile and existing virtual accounts
  const fetchWalletDetails = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.get(
        "https://ayax-data-xpress-server.vercel.app/api/v1/auth/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (res.data.success) {
        const data = res.data.data;
        setUserData(data);

        // Auto-trigger generation if no account exists yet
        if (!data.virtualAccounts || data.virtualAccounts.length === 0) {
          handleGenerateAccount();
        }
      }
    } catch (e) {
      Alert.alert(
        "Connection Error",
        "Unable to sync wallet details. Please pull down to retry.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Explicitly call the backend to create Paystack Dedicated Virtual Account
  const handleGenerateAccount = async () => {
    setGenerating(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/auth/generate-virtual-account",
        {},
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setUserData(res.data.data);
      }
    } catch (error) {
      console.log("Virtual account processing or KYC required");
    } finally {
      setGenerating(false);
    }
  };

  useEffect(() => {
    fetchWalletDetails();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchWalletDetails();
  };

  const copyToClipboard = async (text, label) => {
    if (text) {
      await Clipboard.setStringAsync(text);
      Alert.alert("Copied", `${label} copied to clipboard!`);
    }
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loaderText}>Syncing Secure Accounts...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#38bdf8"
        />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={26} color="#38bdf8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fund Your Wallet</Text>
      </View>

      <View style={styles.heroSection}>
        <View style={styles.infoBadge}>
          <MaterialCommunityIcons
            name="shield-check"
            size={16}
            color="#10b981"
          />
          <Text style={styles.badgeText}>Automated via Paystack</Text>
        </View>
        <Text style={styles.heroSubtitle}>
          Funds transferred to the account details below will reflect in your
          wallet instantly.
        </Text>
      </View>

      {/* Check if virtualAccounts array exists and has data */}
      {userData?.virtualAccounts && userData.virtualAccounts.length > 0 ? (
        userData.virtualAccounts.map((acc, index) => (
          <View key={index} style={styles.bankCard}>
            <View style={styles.bankHeader}>
              <View>
                <Text style={styles.bankTag}>PROVIDER</Text>
                <Text style={styles.bankName}>
                  {acc.bankName.toUpperCase()}
                </Text>
              </View>
              <MaterialCommunityIcons
                name="bank-outline"
                size={28}
                color="#38bdf8"
              />
            </View>

            <View style={styles.accContainer}>
              <Text style={styles.label}>Account Number</Text>
              <TouchableOpacity
                style={styles.numberRow}
                onPress={() =>
                  copyToClipboard(acc.accountNumber, "Account Number")
                }
              >
                <Text style={styles.accountNumberText}>
                  {acc.accountNumber}
                </Text>
                <MaterialCommunityIcons
                  name="content-copy"
                  size={20}
                  color="#38bdf8"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <View style={styles.nameContainer}>
              <Text style={styles.label}>Account Name</Text>
              <Text style={styles.accountNameText}>{acc.accountName}</Text>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          {generating ? (
            <ActivityIndicator color="#38bdf8" />
          ) : (
            <>
              <MaterialCommunityIcons
                name="account-clock"
                size={40}
                color="#64748b"
              />
              <Text style={styles.emptyText}>
                Processing your dedicated bank account...
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
                <Text style={styles.retryText}>Check Status</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      <View style={styles.alternativeSection}>
        <Text style={styles.sectionTitle}>Other Payment Options</Text>
        <TouchableOpacity
          style={styles.cardBtn}
          onPress={() => navigation.navigate("PaystackWebview")}
        >
          <View style={styles.cardBtnIcon}>
            <MaterialCommunityIcons
              name="credit-card-plus"
              size={24}
              color="#fff"
            />
          </View>
          <View style={styles.cardBtnTextCont}>
            <Text style={styles.cardBtnTitle}>Card / USSD / QR</Text>
            <Text style={styles.cardBtnSub}>
              Instant funding via Paystack Secure Checkout
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#475569" />
        </TouchableOpacity>
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="information-circle" size={20} color="#38bdf8" />
        <Text style={styles.noticeText}>
          Standard Paystack processing fee of ₦50 applies to all automated
          transfers. Minimum deposit: ₦100.
        </Text>
      </View>

      <View style={{ height: 50 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f172a", paddingHorizontal: 20 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  loaderText: { marginTop: 15, color: "#94a3b8", fontSize: 14 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginLeft: 15,
    color: "#f8fafc",
  },
  heroSection: { marginBottom: 25 },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#064e3b",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },
  badgeText: {
    color: "#10b981",
    fontSize: 11,
    fontWeight: "bold",
    marginLeft: 5,
  },
  heroSubtitle: { color: "#94a3b8", fontSize: 14, lineHeight: 20 },
  bankCard: {
    backgroundColor: "#1e293b",
    borderRadius: 24,
    padding: 25,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  bankHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  bankTag: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  bankName: { color: "#38bdf8", fontSize: 18, fontWeight: "bold" },
  accContainer: { marginBottom: 15 },
  label: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 5,
  },
  numberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  accountNumberText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  divider: { height: 1, backgroundColor: "#334155", marginVertical: 18 },
  accountNameText: { color: "#f8fafc", fontSize: 16, fontWeight: "600" },
  emptyCard: {
    backgroundColor: "#1e293b",
    padding: 40,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#334155",
  },
  emptyText: {
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 15,
    fontSize: 14,
  },
  retryBtn: {
    marginTop: 20,
    backgroundColor: "#334155",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: "#38bdf8", fontWeight: "bold" },
  alternativeSection: { marginTop: 10 },
  sectionTitle: {
    color: "#f8fafc",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 15,
  },
  cardBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardBtnIcon: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#1d4ed8",
    justifyContent: "center",
    alignItems: "center",
  },
  cardBtnTextCont: { flex: 1, marginLeft: 15 },
  cardBtnTitle: { color: "#f8fafc", fontSize: 15, fontWeight: "bold" },
  cardBtnSub: { color: "#64748b", fontSize: 12, marginTop: 2 },
  noticeBox: {
    flexDirection: "row",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    padding: 15,
    borderRadius: 15,
    marginTop: 30,
    alignItems: "center",
  },
  noticeText: {
    flex: 1,
    color: "#94a3b8",
    fontSize: 12,
    marginLeft: 12,
    lineHeight: 18,
  },
});

export default FundWalletScreen;
