import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [
        {
          text: "OK",
          onPress: () => {
            if (onPressCallback) onPressCallback();
          },
        },
      ]);
    }
  };

  const validateEmail = (text) => {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  const handleReset = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      return showAlert("Required", "Please enter your email address.");
    }

    if (!validateEmail(trimmedEmail)) {
      return showAlert(
        "Invalid Email",
        "Please enter a valid email address format."
      );
    }

    setLoading(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/auth/forgot-password`,
        { email: trimmedEmail },
        {
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 15000,
        }
      );

      const result = response.data;
      if (result.success || response.status === 200 || result.status === "success") {
        showAlert(
          "OTP Sent 🎉",
          "A secure verification OTP has been generated and dispatched to your registered mobile phone and email address.",
          () => navigation.navigate("ResetPassword", { email: trimmedEmail })
        );
      } else {
        showAlert("Failed", result.message || "Unable to process request.");
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Unable to connect to the server. Please check your internet and try again.";
      showAlert("Request Failed", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container} bounces={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={26} color="#1e3a8a" />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="lock-open-outline" size={36} color="#1e3a8a" />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          Enter your registered email address. A real-time verification OTP will be sent directly to your registered phone number and email account.
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#64748b"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.inputText}
            placeholder="Email Address"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <TouchableOpacity
          style={[styles.resetBtn, loading && { opacity: 0.8 }]}
          onPress={handleReset}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.resetText}>SEND VERIFICATION OTP</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Remember your password? </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backArrow: {
    position: "absolute",
    top: 45,
    left: 20,
    padding: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#64748b",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 22,
    fontSize: 14,
    paddingHorizontal: 10,
    fontWeight: "500",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    height: 55,
    marginBottom: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    height: "100%",
    color: "#0f172a",
    fontSize: 15,
  },
  resetBtn: {
    width: "100%",
    backgroundColor: "#1e3a8a",
    borderRadius: 14,
    height: 55,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 5,
    elevation: 3,
  },
  resetText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 14,
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    marginTop: 35,
    alignItems: "center",
  },
  footerText: {
    color: "#64748b",
    fontSize: 14,
  },
  loginLink: {
    color: "#1e3a8a",
    fontWeight: "bold",
    fontSize: 14,
  },
});

export default ForgotPasswordScreen;