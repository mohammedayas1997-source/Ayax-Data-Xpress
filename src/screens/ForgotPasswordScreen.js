import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Ionicons, Feather } from "@expo/vector-icons";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ForgotPasswordScreen = ({ navigation }) => {
  const [step, setStep] = useState(1); // Step 1: Request OTP/Link, Step 2: Enter OTP & New Password
  const [identifier, setIdentifier] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  // STEP 1: Send OTP & Reset Link
  const handleRequestReset = async () => {
    if (!identifier.trim()) {
      return showAlert("Input Error", "Please enter your registered Email or Phone Number.");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/forgot-password`, {
        identifier: identifier.trim(),
        email: identifier.trim(),
      });

      if (res.data?.success || res.status === 200) {
        showAlert("Dispatched", res.data.message || "Reset link and OTP sent to your registered email.");
        setStep(2);
      }
    } catch (err) {
      showAlert("Request Failed", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  // STEP 2: Submit OTP & Set New Password
  const handleSetNewPassword = async () => {
    if (!otpCode.trim() || otpCode.length < 4) {
      return showAlert("Validation Error", "Please enter the valid 4-digit OTP code sent to your email.");
    }
    if (!newPassword || newPassword.length < 6) {
      return showAlert("Validation Error", "Password must be at least 6 characters long.");
    }
    if (newPassword !== confirmPassword) {
      return showAlert("Validation Error", "Passwords do not match.");
    }

    setLoading(true);
    try {
      const res = await axios.post(`${BASE_URL}/auth/reset-password`, {
        identifier: identifier.trim(),
        email: identifier.trim(),
        otp: otpCode.trim(),
        newPassword: newPassword.trim(),
      });

      if (res.data?.success || res.status === 200) {
        showAlert("Success 🎉", "Your password has been reset successfully. Please login.");
        navigation.navigate("Login");
      }
    } catch (err) {
      showAlert("Reset Error", err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#0f172a" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.brandGroup}>
          <View style={styles.iconCircle}>
            <Ionicons name="lock-closed" size={28} color="#00f0ff" />
          </View>
          <Text style={styles.title}>Password Recovery</Text>
          <Text style={styles.subtitle}>
            {step === 1
              ? "Enter your registered email or phone to receive an automatic verification link and OTP code."
              : `Enter the 4-digit code sent to ${identifier} and choose your new password.`}
          </Text>
        </View>

        {/* STEP 1 FORM */}
        {step === 1 && (
          <View style={styles.formCard}>
            <Text style={styles.label}>EMAIL ADDRESS OR PHONE NUMBER</Text>
            <View style={styles.inputWrap}>
              <Feather name="mail" size={18} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="e.g. agent@ayaxdata.online"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                value={identifier}
                onChangeText={setIdentifier}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleRequestReset}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>SEND RESET LINK & OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* STEP 2 FORM */}
        {step === 2 && (
          <View style={styles.formCard}>
            <Text style={styles.label}>4-DIGIT VERIFICATION CODE (OTP)</Text>
            <View style={styles.inputWrap}>
              <Feather name="shield" size={18} color="#00f0ff" style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { letterSpacing: 4, fontWeight: "900", fontSize: 16 }]}
                placeholder="e.g. 4819"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                maxLength={4}
                value={otpCode}
                onChangeText={setOtpCode}
              />
            </View>

            <Text style={styles.label}>NEW STRONG PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Feather name="lock" size={18} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Enter new password (min 6 chars)"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>CONFIRM NEW PASSWORD</Text>
            <View style={styles.inputWrap}>
              <Feather name="check-circle" size={18} color="#64748b" style={{ marginRight: 10 }} />
              <TextInput
                style={styles.input}
                placeholder="Re-type new password"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { opacity: loading ? 0.7 : 1 }]}
              onPress={handleSetNewPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryBtnText}>RESET & AUTHORIZE PASSWORD</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.resendBtn} onPress={() => setStep(1)}>
              <Text style={styles.resendText}>Didn't receive email? Change identifier or resend</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 30,
    justifyContent: "center",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#1e293b",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  brandGroup: { alignItems: "center", marginBottom: 24 },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(0, 240, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.25)",
  },
  title: { color: "#f8fafc", fontSize: 20, fontWeight: "900", letterSpacing: 0.3 },
  subtitle: {
    color: "#94a3b8",
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  formCard: {
    backgroundColor: "#1e293b",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  label: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginBottom: 6, marginTop: 10 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0f172a",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: "#334155",
  },
  input: { flex: 1, color: "#f8fafc", fontSize: 13 },
  primaryBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 22,
  },
  primaryBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
  resendBtn: { alignItems: "center", marginTop: 14 },
  resendText: { color: "#00f0ff", fontSize: 11.5, fontWeight: "700" },
});

export default ForgotPasswordScreen;