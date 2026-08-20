import React, { useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Switch,
  Alert,
  StatusBar,
  Platform,
  Dimensions,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as LocalAuthentication from "expo-local-authentication";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ProfileScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // States don toggles na Biometrics (Logic na asali)
  const [isFingerprintLoginEnabled, setIsFingerprintLoginEnabled] = useState(false);
  const [isFingerprintTxEnabled, setIsFingerprintTxEnabled] = useState(false);

  // Amfani da useFocusEffect domin Refreshing automatic daga server
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
      loadSecurityPreferences();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.get(`${BASE_URL}/auth/profile`, config);
      const user = response.data.user || response.data.data || response.data;

      if (user) {
        setUserData(user);
        await AsyncStorage.setItem("userData", JSON.stringify(user));
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Error fetching profile from server:", e);
        try {
          const cachedValue = await AsyncStorage.getItem("userData");
          if (cachedValue != null) {
            setUserData(JSON.parse(cachedValue));
          }
        } catch (cacheErr) {
          console.error("Error reading cache:", cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityPreferences = async () => {
    try {
      const loginBio = await AsyncStorage.getItem("fingerprint_login");
      const txBio = await AsyncStorage.getItem("fingerprint_tx");
      if (loginBio !== null) setIsFingerprintLoginEnabled(JSON.parse(loginBio));
      if (txBio !== null) setIsFingerprintTxEnabled(JSON.parse(txBio));
    } catch (error) {
      console.error("Error loading security preferences", error);
    }
  };

  // Real-Live Biometric Check & Toggle for Login
  const toggleFingerprintLogin = async (value) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert("Unsupported", "Biometric hardware is not supported on this device.");
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert("No Biometrics", "No fingerprints or face IDs are enrolled on this device settings.");
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to enable Biometric Login",
        fallbackLabel: "Use Passcode",
      });

      if (!auth.success) {
        return;
      }
    }

    setIsFingerprintLoginEnabled(value);
    await AsyncStorage.setItem("fingerprint_login", JSON.stringify(value));
    Alert.alert("Success", value ? "Biometric Login Enabled" : "Biometric Login Disabled");
  };

  // Real-Live Biometric Check & Toggle for Transactions
  const toggleFingerprintTx = async (value) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      if (!compatible) {
        Alert.alert("Unsupported", "Biometric hardware is not supported on this device.");
        return;
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!enrolled) {
        Alert.alert("No Biometrics", "No fingerprints or face IDs are enrolled on this device settings.");
        return;
      }

      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to authorize Biometric Transactions",
        fallbackLabel: "Use Passcode",
      });

      if (!auth.success) {
        return;
      }
    }

    setIsFingerprintTxEnabled(value);
    await AsyncStorage.setItem("fingerprint_tx", JSON.stringify(value));
    Alert.alert("Success", value ? "Biometric Authorization Enabled" : "Biometric Authorization Disabled");
  };

  const handleLogout = () => {
    Alert.alert("Terminate Session", "Are you sure you want to log out from this device?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.clear();
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDarkMode ? "#080c14" : "#f4f7fb",
            justifyContent: "center",
            alignItems: "center",
          },
        ]}
      >
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={{ color: "#64748b", marginTop: 12, fontSize: 13, fontWeight: "600" }}>
          Synchronizing Security Keys...
        </Text>
      </View>
    );
  }

  const userInitial = userData?.firstName ? userData.firstName[0].toUpperCase() : "A";
  const fullName = `${userData?.firstName || ""} ${userData?.surname || userData?.lastName || ""}`.trim() || userData?.name || "Enterprise User";

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
        style={styles.scrollArea}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 50 }}
      >
        {/* Tier-1 Executive Profile Header */}
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
              style={styles.navActionBtn}
              onPress={() => navigation?.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="chevron-back" size={20} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.kycActiveBadge}>
              <MaterialCommunityIcons name="shield-check" size={13} color="#10b981" />
              <Text style={styles.kycActiveText}>VERIFIED IDENTITY</Text>
            </View>
          </View>

          {/* Profile Identity Holographic Entity */}
          <View style={styles.identityContainer}>
            <View style={styles.avatarGlowContainer}>
              <View style={styles.avatarSurface}>
                {userData?.profileImage ? (
                  <Image
                    source={{ uri: userData.profileImage }}
                    style={styles.profileImg}
                  />
                ) : (
                  <LinearGradient
                    colors={["#38bdf8", "#0284c7"]}
                    style={styles.avatarGradient}
                  >
                    <Text style={styles.avatarText}>{userInitial}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={styles.onlineBadgeDot} />
            </View>

            <Text style={styles.profileFullName} numberOfLines={1}>
              {fullName}
            </Text>
            <Text style={styles.profileEmailTypography} numberOfLines={1}>
              {userData?.email}
            </Text>

            <View style={styles.roleChip}>
              <Text style={styles.roleChipText}>
                {userData?.role?.toUpperCase() || "STANDARD ACCOUNT"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.bodyWrapper}>
          {/* Institutional Profile Data Card */}
          <Text style={styles.sectionHeaderLabel}>Institutional Profile Data</Text>

          <View
            style={[
              styles.executiveCardSurface,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            <ProfileRow
              icon="call-outline"
              title="Primary Contact"
              value={userData?.phone || userData?.phoneNumber || "Not Configured"}
              isDarkMode={isDarkMode}
            />

            <ProfileRow
              icon="calendar-outline"
              title="Date of Birth"
              value={userData?.dob ? new Date(userData.dob).toLocaleDateString() : "Not Provided"}
              isDarkMode={isDarkMode}
            />

            <ProfileRow
              icon="location-outline"
              title="Registered Address"
              value={userData?.address || "Location data not synchronized"}
              isDarkMode={isDarkMode}
              isLast
            />
          </View>

          {/* Security & Cryptographic Controls */}
          <Text style={[styles.sectionHeaderLabel, { marginTop: 24 }]}>
            Security & Authentication
          </Text>

          <View
            style={[
              styles.executiveCardSurface,
              {
                backgroundColor: isDarkMode ? "#111927" : "#ffffff",
                borderColor: isDarkMode
                  ? "rgba(255,255,255,0.06)"
                  : "#e2e8f0",
              },
            ]}
          >
            {/* Password Management */}
            <TouchableOpacity
              style={styles.clickableRowItem}
              onPress={() => navigation.navigate("ChangePassword")}
              activeOpacity={0.7}
            >
              <View style={[styles.rowIconContainer, { backgroundColor: "rgba(2,132,199,0.1)" }]}>
                <Ionicons name="lock-closed-outline" size={18} color="#0284c7" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitleText}>Password Management</Text>
                <Text
                  style={[
                    styles.rowSubText,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Change Account Password
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>

            {/* Set / Change Transaction PIN */}
            <TouchableOpacity
              style={styles.clickableRowItem}
              onPress={() => {
                const hasPinSet = userData?.hasPin || userData?.has_transaction_pin;
                navigation.navigate("UpdatePin", { isUpdating: hasPinSet });
              }}
              activeOpacity={0.7}
            >
              <View style={[styles.rowIconContainer, { backgroundColor: "rgba(16,185,129,0.1)" }]}>
                <Ionicons name="key-outline" size={18} color="#10b981" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitleText}>Transaction PIN</Text>
                <Text
                  style={[
                    styles.rowSubText,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  {userData?.hasPin || userData?.has_transaction_pin
                    ? "Change / Reset PIN"
                    : "Setup Transaction PIN"}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#64748b" />
            </TouchableOpacity>

            {/* Fingerprint Login Switch */}
            <View style={styles.toggleRowItem}>
              <View style={[styles.rowIconContainer, { backgroundColor: "rgba(245,158,11,0.1)" }]}>
                <Ionicons name="finger-print-outline" size={18} color="#f59e0b" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitleText}>Biometric Login</Text>
                <Text
                  style={[
                    styles.rowSubText,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Quick Unlock with Fingerprint
                </Text>
              </View>
              <Switch
                value={isFingerprintLoginEnabled}
                onValueChange={toggleFingerprintLogin}
                trackColor={{ false: "#cbd5e1", true: "#38bdf8" }}
                thumbColor={isFingerprintLoginEnabled ? "#0284c7" : "#f4f3f4"}
              />
            </View>

            {/* Fingerprint Transaction Switch */}
            <View style={[styles.toggleRowItem, { borderBottomWidth: 0 }]}>
              <View style={[styles.rowIconContainer, { backgroundColor: "rgba(139,92,246,0.1)" }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color="#8b5cf6" />
              </View>
              <View style={styles.rowTextContainer}>
                <Text style={styles.rowTitleText}>Biometric Transaction</Text>
                <Text
                  style={[
                    styles.rowSubText,
                    { color: isDarkMode ? "#94a3b8" : "#64748b" },
                  ]}
                >
                  Authorize payments with Fingerprint
                </Text>
              </View>
              <Switch
                value={isFingerprintTxEnabled}
                onValueChange={toggleFingerprintTx}
                trackColor={{ false: "#cbd5e1", true: "#38bdf8" }}
                thumbColor={isFingerprintTxEnabled ? "#0284c7" : "#f4f3f4"}
              />
            </View>
          </View>

          {/* Action Buttons Hub */}
          <TouchableOpacity
            style={styles.modifyProfileBtn}
            onPress={() => navigation.navigate("EditProfile")}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={["#0284c7", "#0369a1"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBtnSurface}
            >
              <Ionicons name="create-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.modifyBtnText}>MODIFY PROFILE CREDENTIALS</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.logoutButton,
              {
                backgroundColor: isDarkMode ? "#131b2a" : "#ffffff",
                borderColor: isDarkMode ? "rgba(239,68,68,0.2)" : "#fee2e2",
              },
            ]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
            <Text style={styles.logoutButtonText}>TERMINATE ACTIVE SESSION</Text>
          </TouchableOpacity>

          <View style={styles.appVersionFooter}>
            <Text style={styles.versionFooterText}>Ayax Xpress Terminal • Enterprise v2.4.0</Text>
            <Text style={styles.encryptionNotice}>PCI-DSS & ISO-27001 Certified Vault</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const ProfileRow = ({ icon, title, value, isDarkMode, isLast }) => (
  <View
    style={[
      styles.profileDataRow,
      isLast && { borderBottomWidth: 0 },
      { borderBottomColor: isDarkMode ? "rgba(255,255,255,0.05)" : "#f1f5f9" },
    ]}
  >
    <View style={[styles.rowIconContainer, { backgroundColor: isDarkMode ? "#1a2436" : "#f1f5f9" }]}>
      <Ionicons name={icon} size={18} color="#0284c7" />
    </View>
    <View style={styles.rowTextContainer}>
      <Text style={styles.rowTitleText}>{title}</Text>
      <Text
        style={[
          styles.rowValueText,
          { color: isDarkMode ? "#f8fafc" : "#0f172a" },
        ]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollArea: { flex: 1 },
  heroHeader: {
    paddingTop: Platform.OS === "ios" ? 54 : 44,
    paddingHorizontal: 20,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  topNavigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  kycActiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  kycActiveText: {
    color: "#10b981",
    fontSize: 9.5,
    fontWeight: "800",
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  identityContainer: { alignItems: "center", marginTop: 14 },
  avatarGlowContainer: { position: "relative" },
  avatarSurface: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3.5,
    borderColor: "rgba(255, 255, 255, 0.3)",
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 38,
    fontWeight: "900",
  },
  profileImg: { width: "100%", height: "100%" },
  onlineBadgeDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10b981",
    position: "absolute",
    bottom: 4,
    right: 4,
    borderWidth: 3,
    borderColor: "#080c14",
  },
  profileFullName: {
    color: "#ffffff",
    fontSize: 21,
    fontWeight: "900",
    marginTop: 14,
    letterSpacing: -0.3,
  },
  profileEmailTypography: {
    color: "#94a3b8",
    fontSize: 12.5,
    fontWeight: "500",
    marginTop: 2,
  },
  roleChip: {
    backgroundColor: "rgba(2, 132, 199, 0.22)",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  roleChipText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  bodyWrapper: { paddingHorizontal: 18, marginTop: 22 },
  sectionHeaderLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginLeft: 2,
  },
  executiveCardSurface: {
    borderRadius: 22,
    paddingHorizontal: 16,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  profileDataRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  clickableRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  toggleRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  rowIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  rowTextContainer: { marginLeft: 12, flex: 1 },
  rowTitleText: {
    fontSize: 10.5,
    color: "#64748b",
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  rowValueText: {
    fontSize: 13.5,
    fontWeight: "700",
    marginTop: 2,
  },
  rowSubText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  modifyProfileBtn: {
    marginTop: 24,
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  gradientBtnSurface: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  modifyBtnText: {
    color: "#ffffff",
    fontSize: 12.5,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  logoutButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  logoutButtonText: {
    color: "#ef4444",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  appVersionFooter: { alignItems: "center", marginTop: 28, marginBottom: 10 },
  versionFooterText: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  encryptionNotice: { color: "#94a3b8", fontSize: 9.5, marginTop: 3, fontWeight: "500" },
});

export default ProfileScreen;