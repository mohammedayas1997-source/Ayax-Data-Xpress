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
    checkLoginStatus();
    checkBiometricStatus();
  }, []);

  // Precise Navigation Dispatcher na Dukkan Roles
  const routeUserByRole = (rawRole, rawIdentifier = "") => {
    const role = String(rawRole || "").trim().toLowerCase();
    const identifier = String(rawIdentifier || identifierInput || "").trim().toLowerCase();

    console.log("[Dispatcher] Routing Account:", { role, identifier });

    if (
      role === "superadmin" ||
      identifier === "mohammed.ayas@ayaxdata.online" ||
      identifier === "09033738409"
    ) {
      navigation.reset({
        index: 0,
        routes: [{ name: "SuperAdminDashboard" }],
      });
      return;
    }

    if (role === "admin") {
      navigation.reset({
        index: 0,
        routes: [{ name: "AdminDashboard" }],
      });
      return;
    }

    if (role === "leader") {
      navigation.reset({
        index: 0,
        routes: [{ name: "LeaderDashboard" }],
      });
      return;
    }

    if (role === "supervisor") {
      navigation.reset({
        index: 0,
        routes: [{ name: "SupervisorDashboard" }],
      });
      return;
    }

    if (role === "support" || role === "customer_service") {
      navigation.reset({
        index: 0,
        routes: [{ name: "SupportActivities" }],
      });
      return;
    }

    if (role === "agent") {
      navigation.reset({
        index: 0,
        routes: [
          {
            name: "Main",
            state: { routes: [{ name: "AgentDashboard" }] },
          },
        ],
      });
      return;
    }

    // Default Customer App View
    navigation.reset({
      index: 0,
      routes: [{ name: "Main" }],
    });
  };

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");
      const savedIdentifier = await AsyncStorage.getItem("savedIdentifier");

      if (token) {
        const user = storedUserData ? JSON.parse(storedUserData) : {};
        const detectedRole = (user?.role || "").trim().toLowerCase();

        if (
          detectedRole === "superadmin" ||
          savedIdentifier === "mohammed.ayas@ayaxdata.online" ||
          savedIdentifier === "09033738409"
        ) {
          routeUserByRole("superadmin", savedIdentifier);
          return;
        }

        if (detectedRole) {
          routeUserByRole(detectedRole, savedIdentifier);
        }
      }
    } catch (e) {
      console.error("Auth initialization error:", e);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const isEnabled = await AsyncStorage.getItem("useBiometricLogin");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (isEnabled === "true" && hasHardware && isEnrolled) {
        setIsBiometricEnabled(true);
      }
    } catch (e) {
      console.log("Biometric hardware verification skipped:", e);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL("whatsapp://send?phone=+2349033738409&text=Hello Ayax Xpress Support");
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
    if (!cleanInput || !password) {
      setErrorMessage("Please provide your email address/phone and password.");
      return;
    }

    setLoading(true);

    try {
      const isPhone = /^[0-9+]+$/.test(cleanInput);

      // Shirya payload yadda zai dace da kowane irin backend login query
      const payload = {
        password: password.trim(),
        identifier: cleanInput,
        emailOrPhone: cleanInput,
        phone: isPhone ? cleanInput : undefined,
        email: !isPhone ? cleanInput.toLowerCase() : undefined,
      };

      // Tabbatar an tura ko wanne field idan backend yana neman daya tak
      if (isPhone) {
        payload.email = cleanInput; // fallback
      } else {
        payload.phone = cleanInput; // fallback
      }

      const response = await axios.post(`${BASE_URL}/auth/login`, payload);

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

      if (cleanInput === "mohammed.ayas@ayaxdata.online" || cleanInput === "09033738409") {
        userRole = "superadmin";
      }

      if (!token) {
        setErrorMessage("Authentication token missing from server response.");
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));
      await AsyncStorage.setItem("savedIdentifier", cleanInput);
      await AsyncStorage.setItem("savedPassword", password);

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
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Authenticate to Ayax Xpress",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      const savedIdentifier = await AsyncStorage.getItem("savedIdentifier");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      if (!savedIdentifier || !savedPassword) {
        setErrorMessage("Please login using password once before enabling biometrics.");
        return;
      }

      setLoading(true);
      const isPhone = /^[0-9+]+$/.test(savedIdentifier);

      const response = await axios.post(`${BASE_URL}/auth/login`, {
        identifier: savedIdentifier,
        emailOrPhone: savedIdentifier,
        email: savedIdentifier,
        phone: savedIdentifier,
        password: savedPassword,
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

      if (savedIdentifier === "mohammed.ayas@ayaxdata.online" || savedIdentifier === "09033738409") {
        userRole = "superadmin";
      }

      if (!token) {
        setErrorMessage("Authentication token missing from server.");
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));

      routeUserByRole(userRole, savedIdentifier);
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
                style={styles.forgotBtn}
                onPress={() => navigation.navigate("ForgotPassword")}
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