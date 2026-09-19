import React, { useState, useEffect, useCallback, useRef } from "react";
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
  Modal,
  Alert,
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
  const autoBiometricTriggered = useRef(false);

  // First Login PIN Setup States
  const [showPinSetupModal, setShowPinSetupModal] = useState(false);
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [savingPin, setSavingPin] = useState(false);
  const [pendingToken, setPendingToken] = useState("");
  const [pendingUserRole, setPendingUserRole] = useState("");

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [{ text: "OK", onPress: onPressCallback }]);
    }
  };

  const routeUserByRole = useCallback((rawRole, rawIdentifier = "") => {
    if (!navigation || typeof navigation.reset !== "function") return;

    const role = String(rawRole || "").trim().toLowerCase();
    const identifier = String(rawIdentifier || identifierInput || "").trim().toLowerCase();

    if (
      role === "superadmin" ||
      identifier === "mohammed.ayas@ayaxdata.online" ||
      identifier === "09033738409"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "SuperAdminDashboard" }] });
      return;
    }

    if (
      role === "admin" ||
      identifier === "mohammed@ayaxdata.online" ||
      identifier === "admin@ayaxdata.online" ||
      identifier === "08011112222"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "AdminDashboard" }] });
      return;
    }

    if (
      role === "national_sales_director" ||
      role === "super_leader" ||
      identifier === "nsd@ayaxdata.online" ||
      identifier === "08099990000"
    ) {
      navigation.reset({ index: 0, routes: [{ name: "NsdDashboard" }] });
      return;
    }

    if (role === "state_manager" || role === "leader") {
      navigation.reset({ index: 0, routes: [{ name: "LeaderDashboard" }] });
      return;
    }

    if (role === "supervisor" || role === "field_supervisor") {
      navigation.reset({ index: 0, routes: [{ name: "SupervisorDashboard" }] });
      return;
    }

    if (role === "agent") {
      navigation.reset({
        index: 0,
        routes: [{ name: "Main", state: { routes: [{ name: "AgentDashboard" }] } }],
      });
      return;
    }

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

    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  }, [identifierInput, navigation]);

  const executeDirectBiometricLogin = useCallback(async () => {
    try {
      if (Platform.OS === "web") return;

      const savedIdentifier = await AsyncStorage.getItem("savedIdentifier");
      const savedPassword = await AsyncStorage.getItem("savedPassword");

      if (!savedIdentifier || !savedPassword) {
        setErrorMessage("Please login with email and password first to enable quick access.");
        return;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: `Login to Ayax (${savedIdentifier})`,
        fallbackLabel: "Enter Password Manually",
        disableDeviceFallback: false,
      });

      if (!result.success) return;

      setIdentifierInput(savedIdentifier);
      setLoading(true);
      setErrorMessage("");

      const response = await axios.post(
        `${BASE_URL}/auth/login`,
        {
          identifier: savedIdentifier.trim(),
          email: savedIdentifier.trim(),
          phone: savedIdentifier.trim(),
          username: savedIdentifier.trim(),
          password: savedPassword.trim(),
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 25000,
        }
      );

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

      const cleanLower = savedIdentifier.toLowerCase();
      if (cleanLower === "mohammed.ayas@ayaxdata.online" || cleanLower === "09033738409") {
        userRole = "superadmin";
      } else if (
        cleanLower === "mohammed@ayaxdata.online" ||
        cleanLower === "admin@ayaxdata.online" ||
        cleanLower === "08011112222"
      ) {
        userRole = "admin";
      } else if (cleanLower === "support@ayaxdata.online" || cleanLower === "08077778888") {
        userRole = "support";
      }

      if (!token) {
        setErrorMessage("Authentication token missing from server response.");
        setLoading(false);
        return;
      }

      await AsyncStorage.setItem("userToken", token);
      await AsyncStorage.setItem("userData", JSON.stringify({ ...userPayload, role: userRole }));

      // Check first-time PIN configuration requirement
      const isPinSet = Boolean(userPayload.isPinSet ?? resData.isPinSet);
      if ((userRole === "user" || userRole === "agent") && !isPinSet) {
        setPendingToken(token);
        setPendingUserRole(userRole);
        setShowPinSetupModal(true);
        return;
      }

      routeUserByRole(userRole, savedIdentifier);
    } catch (err) {
      console.log("Biometric Login Failure:", err?.response?.data || err.message);
      setErrorMessage("Biometric verification failed. Please enter password.");
    } finally {
      setLoading(false);
    }
  }, [routeUserByRole]);

  useEffect(() => {
    const checkAndTriggerBiometric = async () => {
      try {
        const savedId = await AsyncStorage.getItem("savedIdentifier");
        if (savedId) {
          setIdentifierInput(savedId);
        }

        if (Platform.OS === "web") return;

        const isEnabled = await AsyncStorage.getItem("useBiometricLogin");
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();

        if (isEnabled === "true" && hasHardware && isEnrolled) {
          setIsBiometricEnabled(true);
          const savedPass = await AsyncStorage.getItem("savedPassword");
          
          if (savedId && savedPass && !autoBiometricTriggered.current) {
            autoBiometricTriggered.current = true;
            setTimeout(() => {
              executeDirectBiometricLogin();
            }, 350);
          }
        }
      } catch (e) {
        console.log("Biometric auto check error:", e?.message);
      }
    };

    checkAndTriggerBiometric();
  }, [executeDirectBiometricLogin]);

  const handleClearIdentifier = () => {
    setIdentifierInput("");
    setPassword("");
    setErrorMessage("");
  };

  const openWhatsApp = () => {
    Linking.openURL("whatsapp://send?phone=+2349061244444&text=Hello Ayax Xpress Support").catch(() => {
      Linking.openURL("https://wa.me/2349061244444");
    });
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@ayaxdata.online");
  };

  const makeCall = () => {
    Linking.openURL("tel:+2349061244444");
  };

  const openDeveloperApis = () => {
    Linking.openURL("https://www.ayaxapis.com").catch((err) => {
      console.log("Could not open Developer APIs URL:", err.message);
    });
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

      // Check first-time PIN configuration requirement
      const isPinSet = Boolean(userPayload.isPinSet ?? resData.isPinSet);
      if ((userRole === "user" || userRole === "agent") && !isPinSet) {
        setPendingToken(token);
        setPendingUserRole(userRole);
        setShowPinSetupModal(true);
        return;
      }

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

  const handleSaveFirstPin = async () => {
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      return showAlert("Invalid PIN", "PIN must be exactly 4 numeric digits.");
    }

    if (newPin !== confirmPin) {
      return showAlert("Mismatch", "The entered PINs do not match. Please verify.");
    }

    setSavingPin(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/user/setup-first-pin`,
        { pin: newPin, confirmPin },
        {
          headers: {
            Authorization: `Bearer ${pendingToken}`,
            "Content-Type": "application/json",
          },
          timeout: 20000,
        }
      );

      if (response.data?.success) {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          const parsed = JSON.parse(storedUserData);
          parsed.isPinSet = true;
          await AsyncStorage.setItem("userData", JSON.stringify(parsed));
        }

        showAlert("Success", "Transaction PIN created successfully!", () => {
          setShowPinSetupModal(false);
          setNewPin("");
          setConfirmPin("");
          routeUserByRole(pendingUserRole, identifierInput);
        });
      } else {
        showAlert("Error", response.data?.message || "Failed to configure PIN.");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Could not save PIN. Please try again.";
      showAlert("Error", errorMsg);
    } finally {
      setSavingPin(false);
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

            <View style={styles.labelRow}>
              <Text style={styles.label}>Email Address or Phone Number</Text>
              {identifierInput ? (
                <TouchableOpacity onPress={handleClearIdentifier} style={styles.switchAccountBtn}>
                  <Text style={styles.switchAccountText}>Clear</Text>
                </TouchableOpacity>
              ) : null}
            </View>

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
                autoComplete="username"
                textContentType="username"
                importantForAutofill="yes"
              />
              {identifierInput ? (
                <TouchableOpacity onPress={handleClearIdentifier} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={18} color="#94a3b8" />
                </TouchableOpacity>
              ) : null}
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
                autoComplete="password"
                textContentType="password"
                importantForAutofill="yes"
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
              {isBiometricEnabled ? (
                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={executeDirectBiometricLogin}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name="fingerprint"
                    size={30}
                    color="#0284c7"
                  />
                  <Text style={styles.biometricText}>Biometric Login</Text>
                </TouchableOpacity>
              ) : null}
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
            <Text style={styles.phoneNumber}>+234 906 124 4444</Text>
          </View>

          <TouchableOpacity
            style={styles.developerApiBtn}
            onPress={openDeveloperApis}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name="code-tags"
              size={20}
              color="#0284c7"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.developerApiBtnText}>Developer APIs</Text>
            <Ionicons
              name="open-outline"
              size={15}
              color="#0284c7"
              style={{ marginLeft: 6 }}
            />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* FIRST LOGIN PIN SETUP MODAL */}
      <Modal visible={showPinSetupModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.iconContainer}>
              <Ionicons name="lock-closed" size={28} color="#00f0ff" />
            </View>

            <Text style={styles.modalTitle}>Set Transaction PIN</Text>
            <Text style={styles.modalSubtitle}>
              Welcome! As a new user, you must set a secure 4-digit PIN to authorize
              all wallet and data transactions.
            </Text>

            <Text style={styles.inputLabel}>CREATE 4-DIGIT PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={newPin}
              onChangeText={setNewPin}
            />

            <Text style={styles.inputLabel}>CONFIRM 4-DIGIT PIN</Text>
            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={confirmPin}
              onChangeText={setConfirmPin}
            />

            <TouchableOpacity
              style={[styles.submitButton, savingPin && { opacity: 0.7 }]}
              onPress={handleSaveFirstPin}
              disabled={savingPin}
            >
              {savingPin ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>SAVE PIN & PROCEED</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  label: { color: "#475569", fontSize: 14, fontWeight: "600" },
  switchAccountBtn: { paddingVertical: 2, paddingHorizontal: 6 },
  switchAccountText: { color: "#0284c7", fontSize: 12, fontWeight: "700" },
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
  biometricBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bae6fd",
    gap: 6,
  },
  biometricText: {
    fontSize: 12,
    color: "#0284c7",
    fontWeight: "bold",
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
    marginTop: 25,
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
  developerApiBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f9ff",
    borderWidth: 1.5,
    borderColor: "#bae6fd",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 20,
    alignSelf: "center",
    width: "100%",
  },
  developerApiBtnText: {
    color: "#0284c7",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
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
  // PIN Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5, 8, 17, 0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0b1120",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: {
    color: "#f8fafc",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 6,
  },
  modalSubtitle: {
    color: "#94a3b8",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginBottom: 18,
  },
  inputLabel: {
    width: "100%",
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    marginBottom: 6,
    textAlign: "left",
  },
  pinInput: {
    width: "100%",
    height: 48,
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 8,
    color: "#f8fafc",
    fontWeight: "bold",
    marginBottom: 14,
  },
  submitButton: {
    width: "100%",
    height: 48,
    backgroundColor: "#0284c7",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
    letterSpacing: 0.5,
  },
});

export default LoginScreen;