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
  Alert,
  Platform,
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
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);

  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
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
      });

      if (response.data && response.data.success) {
        // Centralized data object to prevent "Undefined" errors
        setUserData(response.data.user || response.data.data);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Profile Synchronization Failure:", err.message);
      }
    }
  };

  const copyToClipboard = (text) => {
    if (!text) return;
    Clipboard.setStringAsync(text);
    if (Platform.OS === "android") {
      ToastAndroid.show("Copied to clipboard", ToastAndroid.SHORT);
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
        {
          backgroundColor: isDarkMode ? "#020617" : "#f8fafc",
        },
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
              ? ["rgba(2,6,23,0.7)", "rgba(2,6,23,0.95)"]
              : ["rgba(255,255,255,0.6)", "rgba(248,250,252,0.95)"]
          }
          style={styles.fullOverlay}
        />

        <View style={styles.topHeader}>
          <View style={styles.navRow}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/Logo.png")}
                style={styles.logoImg}
              />
            </View>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation(); // Wannan yana dakatar da event ɗin daga isa ga sauran abubuwa
                navigation.navigate("Notifications"); // Ko kuma sunan shafin naka
              }}
            >
              <Ionicons
                name="notifications-outline"
                size={28}
                color="#0f172a"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text
              style={[
                styles.userName,
                { color: isDarkMode ? "#fff" : "#0f172a" },
              ]}
            >
              {userData
                ? `${userData.firstName} ${userData.surname}`
                : "Loading..."}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* 1. Wallet Card */}
          <LinearGradient
            colors={["#1e40af", "#1e3a8a"]}
            style={styles.walletCard}
          >
            <View style={styles.walletTop}>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
              >
                <Text style={styles.historyText}>
                  Transactions <Ionicons name="chevron-forward" size={12} />
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.balanceContainer}>
              <Text style={styles.currency}>₦</Text>
              <Text style={styles.balanceText}>
                {isBalanceVisible ? userData?.walletBalance || "0.00" : "****"}
              </Text>
              <TouchableOpacity
                onPress={() => setIsBalanceVisible(!isBalanceVisible)}
              >
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
                <LinearGradient
                  colors={["#38bdf8", "#0ea5e9"]}
                  style={styles.innerBtnGradient}
                >
                  <Ionicons name="add-circle" size={18} color="#fff" />
                  <Text style={styles.actionBtnText}>FUND WALLET</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: "rgba(255,255,255,0.15)" },
                ]}
                onPress={openWhatsApp}
              >
                <Ionicons name="logo-whatsapp" size={18} color="#22c55e" />
                <Text style={[styles.actionBtnText, { color: "#fff" }]}>
                  SUPPORT
                </Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* 2. Funding Accounts Section - REAL LIVE DATA */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDarkMode ? "#fff" : "#1e293b" },
            ]}
          >
            Automatic Funding Accounts
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.bankScroll}
          >
            {userData?.accountNumber ? (
              <BankCard
                bank={userData.bankName || "Wema Bank"}
                acc={userData.accountNumber}
                code="WB"
                onCopy={() => copyToClipboard(userData.accountNumber)}
              />
            ) : (
              <BankCard
                bank="Initializing..."
                acc="Generating Account"
                code=".."
                onCopy={() =>
                  Alert.alert(
                    "Wait",
                    "Your unique virtual account is being provisioned.",
                  )
                }
              />
            )}
            <BankCard
              bank="Paystack Terminal"
              acc="Automated Funding"
              code="PAY"
              onCopy={() =>
                Alert.alert(
                  "Note",
                  "Transfer to the Wema account for instant wallet credit.",
                )
              }
            />
          </ScrollView>

          {/* 3. Quick Services Grid */}
          <Text
            style={[
              styles.sectionLabel,
              { color: isDarkMode ? "#fff" : "#1e293b" },
            ]}
          >
            Our Services
          </Text>
          <View style={styles.servicesContainer}>
            <View style={styles.grid}>
              <ServiceItem
                icon="wifi"
                color="#0ea5e9"
                label="Data"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyData")}
              />
              <ServiceItem
                icon="phone-alt"
                color="#22c55e"
                label="Airtime"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("BuyAirtime")}
              />
              <ServiceItem
                icon="bolt"
                color="#eab308"
                label="Power"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Electricity")}
              />
              <ServiceItem
                icon="tv"
                color="#8b5cf6"
                label="Cable"
                isDarkMode={isDarkMode}
                onPress={() => navigation.navigate("Cable")}
              />
              <ServiceItem
                icon="id-card"
                color="#f43f5e"
                label="NIMC Varify"
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
                label="BVN"
                isDarkMode={isDarkMode}
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
                isDarkMode={isDarkMode}
                onPress={() =>
                  navigation.navigate("Main", { screen: "Wallet History" })
                }
              />
            </View>
          </View>

          {/* 4. Branding & Trust */}
          <View style={styles.footerBranding}>
            <Text style={styles.footerHeadline}>Why Choose Ayax Xpress?</Text>
            <View style={styles.trustGrid}>
              <TrustItem
                icon="shield-check"
                color="#16a34a"
                bg="#dcfce7"
                title="100% Secure"
                sub="Encrypted"
              />
              <TrustItem
                icon="flash"
                color="#ca8a04"
                bg="#fef9c3"
                title="Instant"
                sub="Automated"
              />
              <TrustItem
                icon="headset"
                color="#0284c7"
                bg="#e0f2fe"
                title="24/7 Support"
                sub="Reliable"
              />
            </View>
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>
      </ImageBackground>

      {/* Bottom Navigation */}
      <View style={styles.bottomTab}>
        <TabItem icon="home" label="Home" active onPress={() => {}} />
        <TabItem
          icon="time-outline"
          label="History"
          onPress={() =>
            navigation.navigate("Main", { screen: "Wallet History" })
          }
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

// Sub-Components
const BankCard = ({ bank, acc, code, onCopy }) => (
  <TouchableOpacity style={styles.bankBox} onPress={onCopy}>
    <View style={styles.bankInfo}>
      <View style={styles.bankLogoCircle}>
        <Text style={styles.bankLogoText}>{code}</Text>
      </View>
      <View>
        <Text style={styles.bankTitle}>{bank}</Text>
        <Text style={styles.accNo}>{acc}</Text>
      </View>
    </View>
    <Ionicons name="copy-outline" size={18} color="#1e40af" />
  </TouchableOpacity>
);

const ServiceItem = ({ icon, label, color, onPress, isDarkMode }) => (
  <TouchableOpacity style={styles.gridItem} onPress={onPress}>
    <View style={styles.iconBox}>
      <FontAwesome5 name={icon} size={20} color={color} />
    </View>

    <Text
      style={[
        styles.gridLabel,
        {
          color: isDarkMode ? "#fff" : "#475569",
        },
      ]}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const TrustItem = ({ icon, color, bg, title, sub }) => (
  <View style={styles.trustItem}>
    <View style={[styles.trustIconCircle, { backgroundColor: bg }]}>
      {icon === "flash" ? (
        <Ionicons name={icon} size={28} color={color} />
      ) : (
        <MaterialCommunityIcons name={icon} size={28} color={color} />
      )}
    </View>
    <Text style={styles.trustTitle}>{title}</Text>
    <Text style={styles.trustSub}>{sub}</Text>
  </View>
);

const TabItem = ({ icon, label, active, onPress }) => (
  <TouchableOpacity style={styles.tabItem} onPress={onPress}>
    <Ionicons name={icon} size={24} color={active ? "#1e40af" : "#94a3b8"} />
    <Text style={[styles.tabLabel, { color: active ? "#1e40af" : "#94a3b8" }]}>
      {label}
    </Text>
  </TouchableOpacity>
);

// Styles are consistent with your design
const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: "#f8fafc" },
  backgroundImage: { flex: 1, width: "100%", height: "100%" },
  fullOverlay: { position: "absolute", width: "100%", height: "100%" },
  topHeader: { paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  navRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  logoCircle: {
    width: 45,
    height: 45,
    backgroundColor: "#0f172a",
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },
  logoImg: { width: 32, height: 32, resizeMode: "contain" },
  welcomeSection: { marginBottom: 10 },
  welcomeText: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  userName: { color: "#0f172a", fontSize: 24, fontWeight: "bold" },
  content: { flex: 1, paddingHorizontal: 16 },
  walletCard: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 25,
    elevation: 10,
  },
  walletTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  walletLabel: { color: "#dbeafe", fontSize: 13 },
  historyText: { color: "#38bdf8", fontSize: 12, fontWeight: "600" },
  balanceContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 15,
  },
  currency: { color: "#fff", fontSize: 24, fontWeight: "600" },
  balanceText: {
    color: "#fff",
    fontSize: 34,
    fontWeight: "bold",
    marginLeft: 8,
  },
  walletActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  actionBtn: { flex: 0.48, height: 48, borderRadius: 14, overflow: "hidden" },
  innerBtnGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  actionBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
    marginLeft: 8,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 10,
    marginBottom: 15,
    paddingLeft: 4,
  },
  bankScroll: { marginBottom: 25 },
  bankBox: {
    backgroundColor: "#fff",
    width: width * 0.75,
    padding: 16,
    borderRadius: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginRight: 15,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: "#1e40af",
  },
  bankInfo: { flexDirection: "row", alignItems: "center" },
  bankLogoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bankLogoText: { color: "#1e40af", fontWeight: "bold", fontSize: 12 },
  bankTitle: { fontSize: 12, color: "#64748b" },
  accNo: { fontSize: 17, color: "#0f172a", fontWeight: "bold" },
  servicesContainer: {
    borderRadius: 28,
    padding: 20,
    elevation: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: { width: "23%", alignItems: "center", marginBottom: 22 },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 1,
  },
  gridLabel: {
    color: "#475569",
    fontSize: 11,
    textAlign: "center",
    fontWeight: "600",
  },
  bottomTab: {
    height: 85,
    backgroundColor: "#fff",
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingBottom: 20,
    elevation: 20,
  },
  tabItem: { flex: 1, justifyContent: "center", alignItems: "center" },
  tabLabel: { fontSize: 10, marginTop: 4, fontWeight: "600" },
  footerBranding: {
    marginTop: 30,
    paddingBottom: 40,
    backgroundColor: "#f8fafc",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
  },
  footerHeadline: {
    textAlign: "center",
    fontSize: 16,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 20,
    textTransform: "uppercase",
  },
  trustGrid: { flexDirection: "row", justifyContent: "space-around" },
  trustItem: { alignItems: "center", width: "30%" },
  trustIconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    elevation: 3,
  },
  trustTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1e293b",
    textAlign: "center",
  },
  trustSub: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "center",
    marginTop: 2,
  },
});

export default HomeScreen;
