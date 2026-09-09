import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Linking,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";

const { width } = Dimensions.get("window");
const isDesktop = width > 768;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

export default function LandingScreen({ navigation }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  
  // Login States
  const [identifierInput, setIdentifierInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Safe Navigation Dispatcher (Daidai da LoginScreen na asali)
  const routeUserByRole = (rawRole, rawIdentifier = "") => {
    const role = String(rawRole || "").trim().toLowerCase();
    const identifier = String(rawIdentifier || identifierInput || "").trim().toLowerCase();

    // 1. SuperAdmin
    if (
      role === "superadmin" ||
      identifier === "mohammed.ayas@ayaxdata.online" ||
      identifier === "09033738409"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "SuperAdminDashboard" }] });
      return;
    }

    // 2. Operations Admin
    if (
      role === "admin" ||
      identifier === "mohammed@ayaxdata.online" ||
      identifier === "admin@ayaxdata.online" ||
      identifier === "08011112222"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "AdminDashboard" }] });
      return;
    }

    // 3. National Sales Director
    if (
      role === "national_sales_director" ||
      role === "super_leader" ||
      identifier === "nsd@ayaxdata.online" ||
      identifier === "08099990000"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "NsdDashboard" }] });
      return;
    }

    // 4. State Manager
    if (role === "state_manager" || role === "leader") {
      navigation.reset({ index: 0, routes: [{ name: "LeaderDashboard" }] });
      return;
    }

    // 5. Field Supervisor
    if (role === "supervisor" || role === "field_supervisor") {
      navigation.reset({ index: 0, routes: [{ name: "SupervisorDashboard" }] });
      return;
    }

    // 6. Retail Agent
    if (role === "agent") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main", state: { routes: [{ name: "AgentDashboard" }] } }],
      });
      return;
    }

    // 7. Support Desk
    if (
      role === "support" ||
      role === "customer_service" ||
      identifier === "support@ayaxdata.online" ||
      identifier === "08077778888" ||
      identifier === "09033738400"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "SupportDashboard" }] });
      return;
    }

    // 8. Normal Customer -> Kai tsaye zuwa Main Dashboard
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const handleLoginSubmit = async () => {
    setErrorMessage("");
    const cleanInput = identifierInput.trim();
    const cleanPassword = password.trim();

    if (!cleanInput || !cleanPassword) {
      setErrorMessage("Please enter your email/phone and password.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        identifier: cleanInput,
        email: cleanInput,
        phone: cleanInput,
        username: cleanInput,
        password: cleanPassword,
      };

      const response = await axios.post(`${BASE_URL}/auth/login`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 25000,
      });

      const resData = response.data || {};
      const token = resData.token || resData.accessToken || resData.data?.token || "";
      const userPayload = resData.user || resData.data?.user || resData.data || {};

      let userRole = (
        userPayload?.role ||
        resData.role ||
        resData.data?.role ||
        "user"
      )
        .trim()
        .toLowerCase();

      if (cleanInput.toLowerCase() === "mohammed.ayas@ayaxdata.online" || cleanInput === "09033738409") {
        userRole = "superadmin";
      } else if (
        cleanInput.toLowerCase() === "mohammed@ayaxdata.online" ||
        cleanInput.toLowerCase() === "admin@ayaxdata.online" ||
        cleanInput === "08011112222"
      ) {
        userRole = "admin";
      } else if (cleanInput.toLowerCase() === "support@ayaxdata.online" || cleanInput === "08077778888") {
        userRole = "support";
      }

      if (!token) {
        setErrorMessage("Authentication token missing from server response.");
        setLoading(false);
        return;
      }

      // Adana bayanan asusu a cikin AsyncStorage / localStorage
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));
      await AsyncStorage.setItem("savedIdentifier", cleanInput);
      await AsyncStorage.setItem("savedPassword", cleanPassword);

      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem("userToken", token);
        window.localStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));
      }

      setLoginModalOpen(false);

      // NAN TAKE TURA SHI ZUWA DASHBOARD!
      routeUserByRole(userRole, cleanInput);
    } catch (error) {
      console.log("Login Error:", error?.response?.data || error.message);
      if (error.response) {
        const status = error.response.status;
        const backendMessage = error.response.data?.message || "Invalid credentials.";
        setErrorMessage(status === 401 ? "Invalid email/phone or password." : backendMessage);
      } else {
        setErrorMessage("Network error. Please check your internet connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/2349061244444?text=Hello%20Ayax%20Xpress%20Support");
  };

  const makeCall = () => {
    Linking.openURL("tel:+2349061244444");
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@ayaxdata.online");
  };

  const openDeveloperApis = () => {
    Linking.openURL("https://www.ayaxapis.com");
  };

  // Hoton Logo mai tabbataccen hanyar budewa
  const renderLogo = () => {
    try {
      return (
        <Image
          source={require("../../assets/Logo.png")}
          style={styles.logoImg}
          resizeMode="contain"
        />
      );
    } catch (e) {
      return (
        <View style={styles.fallbackLogoCircle}>
          <Ionicons name="diamond" size={20} color="#0284c7" />
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.scrollBody}
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        {/* NAVBAR */}
        <View style={styles.navbar}>
          <View style={styles.navContainer}>
            <View style={styles.navBrand}>
              <View style={styles.logoBox}>
                {renderLogo()}
              </View>
              <View>
                <Text style={styles.navBrandTitle}>Ayax Xpress</Text>
                <Text style={styles.navBrandSub}>Global Ventures Ltd</Text>
              </View>
            </View>

            <View style={styles.navRight}>
              <TouchableOpacity
                style={styles.btnApiNav}
                onPress={openDeveloperApis}
              >
                <MaterialCommunityIcons name="code-tags" size={16} color="#38bdf8" />
                <Text style={styles.btnApiNavText}>Developer API</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.btnLoginNav} 
                onPress={() => setLoginModalOpen(true)}
              >
                <Text style={styles.btnLoginNavText}>Login to Portal</Text>
              </TouchableOpacity>

              {!isDesktop && (
                <TouchableOpacity
                  style={styles.mobileMenuToggle}
                  onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  <Ionicons
                    name={mobileMenuOpen ? "close" : "menu"}
                    size={24}
                    color="#ffffff"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* MOBILE DRAWER */}
          {mobileMenuOpen && !isDesktop && (
            <View style={styles.mobileDrawer}>
              <TouchableOpacity 
                style={styles.drawerItem} 
                onPress={() => {
                  setMobileMenuOpen(false);
                  setLoginModalOpen(true);
                }}
              >
                <Ionicons name="log-in-outline" size={20} color="#38bdf8" />
                <Text style={styles.drawerItemText}>Login to Portal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerItem} onPress={openDeveloperApis}>
                <MaterialCommunityIcons name="code-tags" size={20} color="#38bdf8" />
                <Text style={styles.drawerItemText}>Developer APIs</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.drawerItem} onPress={openWhatsApp}>
                <FontAwesome name="whatsapp" size={20} color="#25D366" />
                <Text style={styles.drawerItemText}>WhatsApp Support</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.heroTag}>
            <Ionicons name="flash" size={14} color="#38bdf8" />
            <Text style={styles.heroTagText}>Telecom • Identity Verification • Utility API</Text>
          </View>

          <Text style={styles.heroTitle}>
            Unified Digital <Text style={styles.heroHighlight}>Infrastructure</Text> for Nigeria.
          </Text>

          <Text style={styles.heroSubtitle}>
            AYAX GLOBAL VENTURES LTD delivers robust MTN SME & Corporate Gifting, Airtel enterprise pipelines, instant BVN, NIN, & CAC validations, and high-frequency utility bill payments.
          </Text>

          <View style={styles.heroBtnRow}>
            <TouchableOpacity 
              style={styles.btnHeroPrimary} 
              onPress={() => setLoginModalOpen(true)}
            >
              <Text style={styles.btnHeroPrimaryText}>Launch Web Portal</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnHeroSecondary} onPress={openDeveloperApis}>
              <Text style={styles.btnHeroSecondaryText}>API Documentation</Text>
            </TouchableOpacity>
          </View>

          {/* CORPORATE ENTITY CARD */}
          <View style={styles.corpCard}>
            <View style={styles.corpCardHeader}>
              <View>
                <Text style={styles.corpLabel}>Certified Corporate Entity</Text>
                <Text style={styles.corpName}>AYAX GLOBAL VENTURES LTD</Text>
              </View>
              <View style={styles.rcBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
                <Text style={styles.rcBadgeText}>RC: 9345377</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>99.99%</Text>
                <Text style={styles.metricLabel}>Gateway Uptime</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>Instant</Text>
                <Text style={styles.metricLabel}>Data Dispatch</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>Real-Time</Text>
                <Text style={styles.metricLabel}>BVN / NIN Check</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>24/7</Text>
                <Text style={styles.metricLabel}>Automated Engine</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SERVICES SECTION */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionPre}>ENTERPRISE SUITE</Text>
          <Text style={styles.sectionTitle}>Everything in One Unified Ecosystem</Text>

          <View style={styles.cardsGrid}>
            <View style={styles.serviceBox}>
              <Ionicons name="cellular-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>MTN SME & CG Data</Text>
              <Text style={styles.serviceBoxDesc}>High-speed automated bulk data delivery with instant network receipt.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="radio-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Airtel Business Data</Text>
              <Text style={styles.serviceBoxDesc}>Direct enterprise Airtel corporate gifting pipelines with balance sync.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="person-circle-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>BVN & NIN Verification</Text>
              <Text style={styles.serviceBoxDesc}>Certified identity queries, NIBSS validation, and biometric verification slips.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="business-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>CAC Entity Search</Text>
              <Text style={styles.serviceBoxDesc}>Real-time corporate verification for Nigerian registered companies and status.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="flash-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Electricity & DisCo Bills</Text>
              <Text style={styles.serviceBoxDesc}>Prepaid meter token generation and postpaid bill settlement across all DisCos.</Text>
            </View>

            <View style={styles.serviceBox}>
              <MaterialCommunityIcons name="code-tags" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Developer API Marketplace</Text>
              <Text style={styles.serviceBoxDesc}>Integrate data and verification directly into your apps via ayaxapis.com.</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>AYAX GLOBAL VENTURES LTD</Text>
          <Text style={styles.footerText}>RC Number: 9345377</Text>
          <Text style={styles.footerText}>Suite C13 & C14, Yammusa Plaza, Kano State</Text>

          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactCircle} onPress={openWhatsApp}>
              <FontAwesome name="whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactCircle, { marginHorizontal: 15 }]} onPress={makeCall}>
              <Ionicons name="call" size={18} color="#38bdf8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCircle} onPress={openEmail}>
              <Ionicons name="mail" size={18} color="#EA4335" />
            </TouchableOpacity>
          </View>
          <Text style={styles.footerPhone}>+234 906 124 4444</Text>
        </View>
      </ScrollView>

      {/* ================= MODAL LOGIN DIALOGUE ================= */}
      {loginModalOpen && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <TouchableOpacity 
              style={styles.modalCloseBtn}
              onPress={() => setLoginModalOpen(false)}
            >
              <Ionicons name="close" size={22} color="#64748b" />
            </TouchableOpacity>

            <View style={styles.modalHeader}>
              <View style={styles.modalLogoCircle}>
                {renderLogo()}
              </View>
              <Text style={styles.modalTitle}>Ayax Xpress</Text>
              <Text style={styles.modalSub}>Sign in to access your dashboard</Text>
            </View>

            {errorMessage ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color="#991b1b" />
                <Text style={styles.errorBoxText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.inputLabel}>Email Address or Phone Number</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="person-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="08012345678 or email"
                placeholderTextColor="#94a3b8"
                value={identifierInput}
                onChangeText={(t) => {
                  setIdentifierInput(t);
                  if (errorMessage) setErrorMessage("");
                }}
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.inputWrap}>
              <Ionicons name="lock-closed-outline" size={18} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.modalInput}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  if (errorMessage) setErrorMessage("");
                }}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.btnModalLogin}
              onPress={handleLoginSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.btnModalLoginText}>Login to Account</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.signupNavRow}
              onPress={() => {
                setLoginModalOpen(false);
                navigation.navigate("Signup");
              }}
            >
              <Text style={{ color: "#64748b", fontSize: 13 }}>Don't have an account? </Text>
              <Text style={{ color: "#0284c7", fontSize: 13, fontWeight: "bold" }}>Create Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    width: "100%",
    ...(Platform.OS === "web"
      ? {
          height: "100vh",
          overflowY: "auto",
        }
      : {}),
  },
  scrollWrapper: {
    flex: 1,
    width: "100%",
  },
  scrollBody: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  navbar: {
    backgroundColor: "rgba(10, 25, 47, 0.96)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
    width: "100%",
    zIndex: 10,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  logoImg: { width: 30, height: 30 },
  fallbackLogoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },
  navBrandTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  navBrandSub: { color: "#38bdf8", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnApiNav: {
    display: isDesktop ? "flex" : "none",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
  },
  btnApiNavText: { color: "#38bdf8", fontSize: 12, fontWeight: "bold" },
  btnLoginNav: {
    backgroundColor: "#0284c7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnLoginNavText: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
  mobileMenuToggle: { padding: 4, marginLeft: 6 },
  mobileDrawer: {
    backgroundColor: "#081930",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  drawerItemText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  heroSection: {
    backgroundColor: "#0a192f",
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: "center",
    width: "100%",
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTagText: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  heroTitle: {
    color: "#ffffff",
    fontSize: isDesktop ? 44 : 30,
    fontWeight: "900",
    textAlign: "center",
    maxWidth: 750,
    lineHeight: isDesktop ? 52 : 36,
    marginBottom: 16,
  },
  heroHighlight: { color: "#38bdf8" },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 620,
    lineHeight: 22,
    marginBottom: 26,
  },
  heroBtnRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  btnHeroPrimary: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnHeroPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  btnHeroSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  btnHeroSecondaryText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  corpCard: {
    marginTop: 35,
    width: "100%",
    maxWidth: 650,
    backgroundColor: "rgba(15, 36, 68, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 20,
    padding: 20,
  },
  corpCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 12,
  },
  corpLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "bold" },
  corpName: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  rcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  rcBadgeText: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  metricsGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 15, width: "100%" },
  metricItem: { alignItems: "center" },
  metricValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  metricLabel: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
  servicesSection: { paddingVertical: 50, paddingHorizontal: 20, alignItems: "center", width: "100%" },
  sectionPre: { color: "#0284c7", fontSize: 11, fontWeight: "bold", letterSpacing: 1 },
  sectionTitle: { color: "#0f172a", fontSize: 24, fontWeight: "bold", marginTop: 4, marginBottom: 25, textAlign: "center" },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15, justifyContent: "center", maxWidth: 1100, width: "100%" },
  serviceBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    width: isDesktop ? 330 : "100%",
  },
  serviceBoxTitle: { color: "#0f172a", fontSize: 16, fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  serviceBoxDesc: { color: "#64748b", fontSize: 13, lineHeight: 18 },
  footerSection: { backgroundColor: "#050e1d", paddingVertical: 40, alignItems: "center", width: "100%" },
  footerTitle: { color: "#ffffff", fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  footerText: { color: "#94a3b8", fontSize: 12, marginBottom: 3 },
  contactRow: { flexDirection: "row", marginVertical: 18 },
  contactCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  footerPhone: { color: "#38bdf8", fontSize: 14, fontWeight: "bold" },

  // MODAL STYLES
  modalBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 25, 47, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    width: "100%",
    maxWidth: 440,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 8,
    position: "relative",
  },
  modalCloseBtn: {
    position: "absolute",
    top: 16,
    right: 16,
    padding: 4,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  modalLogoCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#0f172a",
  },
  modalSub: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 2,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fee2e2",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
  },
  errorBoxText: {
    color: "#991b1b",
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  modalInput: {
    flex: 1,
    height: "100%",
    color: "#0f172a",
    fontSize: 14,
  },
  btnModalLogin: {
    backgroundColor: "#0a1d37",
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 6,
  },
  btnModalLoginText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "bold",
  },
  signupNavRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
});