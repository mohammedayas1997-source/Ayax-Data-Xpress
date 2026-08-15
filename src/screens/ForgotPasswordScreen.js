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

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Helper to validate email format before sending to server
  const validateEmail = (text) => {
    let reg = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w\w+)+$/;
    return reg.test(text);
  };

  const handleReset = async () => {
    if (!email) {
      return Alert.alert("Required", "Please enter your email address.");
    }

    if (!validateEmail(email)) {
      return Alert.alert(
        "Invalid Email",
        "Please enter a valid email address format.",
      );
    }

    setLoading(true);
    try {
      // Points to your production-ready API endpoint
      const response = await axios.post(
        "https://ayax-data-xpress-server.vercel.app/api/v1/auth/forgot-password",
        { email },
        { timeout: 15000 }, // 15 second timeout for slow connections
      );

      if (response.data.success || response.status === 200) {
        Alert.alert(
          "Check Your Inbox",
          "If an account exists with that email, you will receive password reset instructions shortly.",
          [{ text: "OK", onPress: () => navigation.navigate("Login") }],
        );
      }
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Unable to connect to the server. Please check your internet and try again.";
      Alert.alert("Request Failed", errorMessage);
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
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

        <TouchableOpacity
          style={styles.backArrow}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={28} color="#38bdf8" />
        </TouchableOpacity>

        <View style={styles.iconCircle}>
          <Ionicons name="lock-open-outline" size={45} color="#38bdf8" />
        </View>

        <Text style={styles.title}>Forgot Password?</Text>
        <Text style={styles.subtitle}>
          No worries! Enter your registered email address and we will send you a
          link to reset your password.
        </Text>

        <View style={styles.inputWrapper}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#94a3b8"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.inputText}
            placeholder="Email Address"
            placeholderTextColor="#64748b"
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
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.resetText}>SEND RESET LINK</Text>
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
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  backArrow: {
    position: "absolute",
    top: 50,
    left: 20,
    padding: 10,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    shadowColor: "#38bdf8",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#f8fafc",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
    fontSize: 15,
    paddingHorizontal: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    backgroundColor: "#1e293b",
    borderRadius: 16,
    height: 60,
    marginBottom: 24,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    height: "100%",
    color: "#f8fafc",
    fontSize: 16,
  },
  resetBtn: {
    width: "100%",
    backgroundColor: "#1d4ed8",
    borderRadius: 16,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#1d4ed8",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  resetText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  footer: {
    flexDirection: "row",
    marginTop: 40,
    alignItems: "center",
  },
  footerText: {
    color: "#94a3b8",
    fontSize: 15,
  },
  loginLink: {
    color: "#38bdf8",
    fontWeight: "bold",
    fontSize: 15,
  },
});

export default ForgotPasswordScreen;
