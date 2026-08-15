import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome,
} from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import axios from "axios";
import { CommonActions } from "@react-navigation/native";

const { width } = Dimensions.get("window");

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    checkLoginStatus();
    checkBiometricStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (token && storedUserData) {
        const user = JSON.parse(storedUserData);

        // AN GYARA: Matataccen tsarin kwaso role lokacin auto-login
        const detectedRole = (
          user?.role ||
          user?.user?.role ||
          user?.data?.user?.role ||
          user?.data?.role ||
          ""
        )
          .trim()
          .toLowerCase();

        console.log("[Auto-Login] Detected Saved Role:", detectedRole);

        if (detectedRole === "agent") {
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
        } else if (detectedRole) {
          navigation.reset({
            index: 0,
            routes: [{ name: "Main" }],
          });
          return;
        }
      }
    } catch (e) {
      console.error("Failed to fetch startup authentication states:", e);
    }
  };

  const checkBiometricStatus = async () => {
    try {
      const isEnabled = await AsyncStorage.getItem("useBiometricLogin");
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      // Mun cire layin da yake haifar da error
      if (isEnabled === "true" && hasHardware && isEnrolled) {
        setIsBiometricEnabled(true);
      }
    } catch (e) {
      console.log("Biometric check error:", e);
    }
  };

  const openWhatsApp = () => {
    Linking.openURL(
      "whatsapp://send?phone=+2349061244444&text=Hello Ayax Xpress Support",
    );
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@ayaxdata.online");
  };

  const makeCall = () => {
    Linking.openURL("tel:+2349061244444");
  };

  const handleLogin = async () => {
    setErrorMessage("");

    if (!email.trim() || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    // Zaɓi URL dangane da wanda yake login (User ko Supervisor)
    const loginUrl = isSupervisor
      ? "https://ayax-data-xpress-server.onrender.com/api/v1/auth/supervisor-login"
      : "https://ayax-data-xpress-server.onrender.com/api/v1/auth/login";

    try {
      console.log(
        `🚀 Attempting ${isSupervisor ? "Supervisor" : "User"} Login for:`,
        email.trim().toLowerCase(),
      );

      const response = await axios.post(loginUrl, {
        email: email.trim().toLowerCase(),
        password: password,
      });

      console.log("📥 Raw Server Response:", JSON.stringify(response.data));

      // Ciro Token da Bayanan Mai amfani
      const token =
        response?.data?.token ||
        response?.data?.accessToken ||
        response?.data?.data?.token ||
        "";
      const userPayload =
        response?.data?.user ||
        response?.data?.data?.user ||
        response?.data?.data ||
        {};

      // Gano role don tantance inda zai tafi
      const finalRole =
        userPayload?.role ||
        response?.data?.role ||
        response?.data?.data?.role ||
        "";
      const normalizedRole = finalRole.trim().toLowerCase();

      if (!token) {
        setErrorMessage("Authentication token missing from server.");
        return;
      }

      // Adana bayanan a Async Storage
      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify(userPayload));

      console.log("✅ Login Successful. Redirecting...");

      // Tsarin Kai mai amfani zuwa shafin da ya dace
      setTimeout(() => {
        if (isSupervisor) {
          // Idan Supervisor ne, tura shi Dashboard na Supervisor
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "SupervisorDashboard" }],
            }),
          );
        } else if (normalizedRole === "agent") {
          // Idan Agent ne
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: "Main",
                  state: { routes: [{ name: "AgentDashboard" }] },
                },
              ],
            }),
          );
        } else {
          // Idan User na yau da kullum ne
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Main" }],
            }),
          );
        }
      }, 300);
    } catch (error) {
      console.log("❌ Login Error:", error?.response?.data || error.message);

      if (error.response) {
        const status = error.response.status;
        const backendMessage =
          error.response.data?.message || "Invalid credentials.";
        setErrorMessage(
          status === 401 ? "Invalid email or password." : backendMessage,
        );
      } else {
        setErrorMessage("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: "Login to Ayax Xpress",
        fallbackLabel: "Use Password",
        disableDeviceFallback: false,
      });

      // ... sauran code ɗin naka ...

      console.log("📥 Raw Server Response:", JSON.stringify(response.data));

      // =========================
      // FIXED TOKEN EXTRACTION
      // =========================

      const token =
        response?.data?.token ||
        response?.data?.accessToken ||
        response?.data?.data?.token ||
        "";

      // =========================
      // FIXED USER EXTRACTION
      // =========================

      const userPayload =
        response?.data?.user ||
        response?.data?.data?.user ||
        response?.data?.data ||
        {};

      // =========================
      // FIXED ROLE EXTRACTION
      // =========================

      const finalRole =
        userPayload?.role ||
        response?.data?.role ||
        response?.data?.data?.role ||
        "";

      const normalizedRole = finalRole.trim().toLowerCase();

      console.log("🎯 FINAL ROLE:", normalizedRole);

      // =========================
      // VALIDATE TOKEN
      // =========================

      if (!token) {
        setErrorMessage("Authentication token missing from server.");
        return;
      }

      // =========================
      // SAVE DATA
      // =========================

      await AsyncStorage.setItem("userToken", token);

      await AsyncStorage.setItem("userData", JSON.stringify(userPayload));

      console.log("✅ TOKEN SAVED SUCCESSFULLY");

      // =========================
      // NAVIGATION (FIXED)
      // =========================
      setTimeout(() => {
        if (normalizedRole === "agent") {
          // Idan Agent ne, muna reset zuwa Main, amma muna sa initial route ya zama AgentDashboard
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [
                {
                  name: "Main", // Sunan Drawer Navigator ɗinka
                  state: {
                    index: 0,
                    routes: [{ name: "AgentDashboard" }], // Wannan shi ne zai tilasta AgentDashboard ya buɗe
                  },
                },
              ],
            }),
          );
        } else {
          // Idan ba Agent ba ne, reset zuwa Main kamar yadda kake da shi
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Main" }],
            }),
          );
        }
      }, 300);
    } catch (error) {
      console.log("❌ Login Error:", error?.response?.data || error.message);

      if (error.response) {
        const status = error.response.status;
        const backendMessage = error.response.data?.message || "";

        if (status === 401) {
          setErrorMessage(
            backendMessage || "Invalid email or password. Please try again.",
          );
        } else if (status === 404) {
          setErrorMessage("Account not found.");
        } else {
          setErrorMessage(backendMessage || "Server error encountered.");
        }
      } else if (error.request) {
        setErrorMessage(
          "Network error. Please check your internet connection.",
        );
      } else {
        setErrorMessage("Unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.desktopContainer}
    >
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
            <Text style={styles.tagline}>
              Swift & Reliable Utility Payments
            </Text>
          </View>

          <View style={styles.formSection}>
            {errorMessage ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={20} color="#b91c1c" />
                <Text style={styles.errorBannerText}>{errorMessage}</Text>
              </View>
            ) : null}

            <Text style={styles.label}>Email Address</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={20}
                color="#64748b"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="example@mail.com"
                placeholderTextColor="#94a3b8"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
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
            {/* Supervisor Toggle */}
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 20,
              }}
              onPress={() => setIsSupervisor(!isSupervisor)}
            >
              <Ionicons
                name={isSupervisor ? "checkbox" : "square-outline"}
                size={24}
                color={isSupervisor ? "#0a1d37" : "#64748b"}
              />
              <Text
                style={{
                  marginLeft: 8,
                  color: isSupervisor ? "#0a1d37" : "#64748b",
                  fontWeight: "600",
                }}
              >
                Login as Supervisor
              </Text>
            </TouchableOpacity>

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
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.loginBtnText}>Login to Dashboard</Text>
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
            <Text style={styles.phoneNumber}>+234 906 124 4444</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  desktopContainer: {
    flex: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContainer: {
    flexGrow: 1,
    paddingVertical: 40,
    width: "100%",
    alignItems: "center",
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
  forgotBtn: { alignSelf: "center" },
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
