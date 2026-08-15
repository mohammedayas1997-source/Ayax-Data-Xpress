import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import axios from "axios";

const AdminUserControl = () => {
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState(""); // Track wanne button ake amfani da shi

  const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1/admin";

  const getAuthHeader = () => {
    const token = typeof localStorage !== "undefined" ? localStorage.getItem("token") : null;
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  // 1. Ikon rufe ko bude Wallet (Block/Unblock Wallet)
  const handleToggleWalletStatus = async (status) => {
    if (!targetUserId.trim()) {
      return Alert.alert("Validation Error", "Please enter a valid User ID or Phone Number.");
    }

    const actionText = status === "block" ? "BLOCK" : "UNBLOCK";

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${actionText} this user's wallet?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Yes, ${actionText}`,
          style: status === "block" ? "destructive" : "default",
          onPress: async () => {
            try {
              setLoading(true);
              setActiveAction(status);
              const endpoint = status === "block" ? `${BASE_URL}/block-wallet` : `${BASE_URL}/unblock-wallet`;

              const res = await axios.post(
                endpoint,
                { userId: targetUserId.trim() },
                getAuthHeader()
              );

              if (res.data.success) {
                Alert.alert("Success", `User wallet ${status === "block" ? "blocked" : "unblocked"} successfully!`);
              }
            } catch (err) {
              Alert.alert("Operation Failed", err.response?.data?.message || `Failed to ${status} wallet.`);
            } finally {
              setLoading(false);
              setActiveAction("");
            }
          },
        },
      ]
    );
  };

  // 2. Ikon cire ko sa kudi (Debit/Credit User)
  const handleWalletTransaction = async (type) => {
    if (!targetUserId.trim()) {
      return Alert.alert("Validation Error", "Please enter a valid User ID or Phone Number.");
    }
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      return Alert.alert("Validation Error", "Please enter a valid positive amount.");
    }

    const actionText = type === "debit" ? "DEBIT" : "CREDIT";

    Alert.alert(
      "Confirm Transaction",
      `Are you sure you want to ${actionText} ₦${numericAmount.toLocaleString()} ${type === "debit" ? "from" : "to"} this user?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: `Confirm ${actionText}`,
          onPress: async () => {
            try {
              setLoading(true);
              setActiveAction(type);
              const endpoint = type === "debit" ? `${BASE_URL}/debit-user` : `${BASE_URL}/credit-user`;

              const res = await axios.post(
                endpoint,
                {
                  userId: targetUserId.trim(),
                  amount: numericAmount,
                },
                getAuthHeader()
              );

              if (res.data.success) {
                Alert.alert("Success", `Account ${type === "debit" ? "debited" : "credited"} successfully!`);
                setAmount("");
              }
            } catch (err) {
              Alert.alert("Transaction Error", err.response?.data?.message || `Could not ${type} user account.`);
            } finally {
              setLoading(false);
              setActiveAction("");
            }
          },
        },
      ]
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Admin Control Panel</Text>
        <Text style={styles.subtitle}>Manage User Wallet Restrictions & Balances</Text>

        {/* User Search/Selection Section */}
        <View style={styles.card}>
          <Text style={styles.label}>Target User Identifier</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter User ID, Email or Phone"
            placeholderTextColor="#94a3b8"
            value={targetUserId}
            onChangeText={setTargetUserId}
            autoCapitalize="none"
          />
        </View>

        {/* Wallet Access Control Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Wallet Status Management</Text>
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.blockBtn, loading && styles.disabledBtn]}
              disabled={loading}
              onPress={() => handleToggleWalletStatus("block")}
            >
              {loading && activeAction === "block" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>BLOCK WALLET</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.unblockBtn, loading && styles.disabledBtn]}
              disabled={loading}
              onPress={() => handleToggleWalletStatus("unblock")}
            >
              {loading && activeAction === "unblock" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>UNBLOCK</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Wallet Funds Operation Card */}
        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Wallet Funds Adjustment</Text>
          <Text style={styles.label}>Amount (₦)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.btn, styles.creditBtn, loading && styles.disabledBtn]}
              disabled={loading}
              onPress={() => handleWalletTransaction("credit")}
            >
              {loading && activeAction === "credit" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>CREDIT USER</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, styles.debitBtn, loading && styles.disabledBtn]}
              disabled={loading}
              onPress={() => handleWalletTransaction("debit")}
            >
              {loading && activeAction === "debit" ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.btnText}>DEBIT USER</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#f8fafc" },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#ffffff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 12,
    borderRadius: 8,
    fontSize: 15,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    marginBottom: 12,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  blockBtn: { backgroundColor: "#dc2626" },
  unblockBtn: { backgroundColor: "#16a34a" },
  debitBtn: { backgroundColor: "#d97706" },
  creditBtn: { backgroundColor: "#2563eb" },
  disabledBtn: { opacity: 0.6 },
  btnText: { color: "#ffffff", fontWeight: "bold", fontSize: 13 },
});

export default AdminUserControl;