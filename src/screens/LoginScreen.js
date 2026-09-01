import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
  Dimensions,
  StatusBar,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import axios from "axios";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const LoginScreen = ({ navigation }) => {
  const [identifierInput, setIdentifierInput] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  // Safe Navigation Dispatcher
  const routeUserByRole = (rawRole, rawIdentifier = "") => {
    if (!navigation || typeof navigation.reset !== "function") return;

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

    // 8. Normal Customer
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const checkBiometricStatus = async () => {
    try {
      if (Platform.OS === "web") return;
      const isEnabled = await AsyncStorage.getItem("useBiometricLogin");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (isEnabled === "true" && hasHardware && isEnrolled) {
        setIsBiometricEnabled(true);
      }
    } catch (e) {
      console.log("Biometric check skipped:", e?.message);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL("whatsapp://send?phone=+2349033738409&text=Hello Ayax Xpress Support").catch(() => {
      Linking.openURL("https://wa.me/2349033738409");
    });
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@ayaxdata.online");
  };

  const makeCall = () => {
    Linking.openURL("tel:+2349033738409");
  };

  const handleLogin = async () => {
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

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));
      await AsyncStorage.setItem("savedIdentifier", cleanInput);
      await AsyncStorage.setItem("savedPassword", cleanPassword);

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

  const handleBiometricLogin = async () => {
    try {
      if (Platform.OS === "web") return;
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to Ayax Xpress",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      const savedIdentifier = await AsyncStorage.getItem("savedIdentifier");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      if (!savedIdentifier || !savedPassword) {
        setErrorMessage("Please login with password once first.");
        return;
      }

      setLoading(true);

      const response = await axios.post(`${BASE_URL}/auth/login`, {
        identifier: savedIdentifier,
        email: savedIdentifier,
        phone: savedIdentifier,
        username: savedIdentifier,
        password: savedPassword,
      });

      const resData = response.data || {};
      const token = resData.token || resData.accessToken || resData.data?.token || "";
      const userPayload = resData.user || resData.data?.user || resData.data || {};
      const userRole = (userPayload?.role || resData.role || "user").trim().toLowerCase();

      if (token) {
        await AsyncStorage.setItem("userToken", token);
        await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));
        routeUserByRole(userRole, savedIdentifier);
      }
    } catch (error) {
      setErrorMessage("Biometric authentication failed. Please enter password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.desktopContainer}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.contentWrapper}>
          <View style={styles.headerSection}>
            <View style={styles.logoCircle}>
              <Image
                source={require("../assets/Logo.png")}
                style={styles.logoImg}
              />
            </View>
            <Text style={styles.appName}>Ayax Xpress</Text>
            <Text style={styles.tagline}>Swift & Reliable Utility Payments</Text>
          </View>

          <View style={styles.formSection}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#b91c1c" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Email Address or Phone Number</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Email or 08012345678"
                placeholderTextColor="#94a3b8"
                value={identifierInput}
                onChangeText={(text) => {
                  setIdentifierInput(text);
                  if (errorMessage) setErrorMessage("");
                }}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <Text style={styles.label}>Password</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor="#94a3b8"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage("");
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color="#64748b"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              {isBiometricEnabled && (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricLogin}
                >
                  <MaterialCommunityIcons
                    name="fingerprint"
                    size={35}
                    color="#0a1d37"
                  />
                  <Text style={styles.biometricText}>Touch ID</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  if (navigation && typeof navigation.navigate === "function") {
                    navigation.navigate("ForgotPassword");
                  }
                }}
                style={styles.forgotBtn}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.loginBtn}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Login to Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footerLinks}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("About")}
              >
                <Text style={styles.linkText}>About Us</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("PrivacyPolicy")}
              >
                <Text style={styles.linkText}>Privacy Policy</Text>
              </TouchableOpacity>

              <View style={styles.divider} />

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate("Terms")}
              >
                <Text style={styles.linkText}>Terms</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signupContainer}>
              <Text style={styles.noAccountText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.contactContainer}>
            <Text style={styles.contactTitle}>Quick Support</Text>
            <View style={styles.iconRow}>
              <TouchableOpacity
                style={styles.contactIconCircle}
                onPress={openWhatsApp}
              >
                <FontAwesome name="whatsapp" size={24} color="#25D366" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactIconCircle, { marginHorizontal: 20 }]}
                onPress={makeCall}
              >
                <Ionicons name="call" size={24} color="#0a1d37" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.contactIconCircle}
                onPress={openEmail}
              >
                <Ionicons name="mail" size={24} color="#EA4335" />
              </TouchableOpacity>
            </View>
            <Text style={styles.phoneNumber}>+234 903 373 8409</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  desktopContainer: { flex: 1, backgroundColor: "#f8fafc" },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 40,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  contentWrapper: {
    width: width > 600 ? 500 : "90%",
    backgroundColor: "#ffffff",
    borderRadius: 25,
    padding: 25,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  headerSection: { alignItems: "center", marginBottom: 30 },
  logoCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  logoImg: { width: 60, height: 60, resizeMode: "contain" },
  appName: { fontSize: 28, fontWeight: "bold", color: "#0f172a" },
  tagline: { fontSize: 14, color: "#64748b", marginTop: 5 },
  formSection: { width: "100%" },
  label: { color: "#475569", fontSize: 14, marginBottom: 8, fontWeight: "600" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 50, color: "#0f172a", fontSize: 16 },
  errorBanner: {
    flexDirection: "row",
    backgroundColor: "#fef2f2",
    borderColor: "#fee2e2",
    borderWidth: 1,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: "center",
    gap: 8,
  },
  errorBannerText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },
  biometricBtn: { alignItems: "center" },
  biometricText: {
    fontSize: 10,
    color: "#0a1d37",
    fontWeight: "bold",
    marginTop: 2,
  },
  forgotBtn: { alignSelf: "center", marginLeft: "auto" },
  forgotText: { color: "#0a1d37", fontSize: 14, fontWeight: "600" },
  loginBtn: {
    backgroundColor: "#0a1d37",
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  loginBtnText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  signupContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 25,
  },
  noAccountText: { color: "#64748b", fontSize: 14 },
  signupText: { color: "#0a1d37", fontSize: 14, fontWeight: "bold" },
  contactContainer: {
    marginTop: 35,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 20,
  },
  contactTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
    marginBottom: 15,
    letterSpacing: 1,
  },
  iconRow: { flexDirection: "row", alignItems: "center" },
  contactIconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  phoneNumber: {
    marginTop: 15,
    fontSize: 16,
    fontWeight: "bold",
    color: "#0a1d37",
    textAlign: "center",
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
    width: "100%",
    flexWrap: "wrap",
  },
  linkText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    textDecorationLine: "underline",
    paddingHorizontal: 4,
  },
  divider: {
    width: 1,
    height: 14,
    backgroundColor: "#cbd5e1",
    marginHorizontal: 8,
  },
});

export default LoginScreen;