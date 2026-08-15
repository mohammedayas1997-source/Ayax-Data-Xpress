import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from "react-native";
import axios from "axios";

const AdminUserControl = () => {
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState("");

  // 1. Ikon rufe Wallet (Block Wallet)
  const handleBlockWallet = async () => {
    try {
      const res = await axios.post("https://ayax-api.com/admin/block-wallet", {
        userId: targetUserId,
      });
      if (res.data.success) Alert.alert("Success", "User wallet blocked!");
    } catch (err) {
      Alert.alert("Error", "Failed to block wallet");
    }
  };

  // 2. Ikon cire kudi (Debit User)
  const handleDebitUser = async () => {
    if (!amount) return Alert.alert("Error", "Enter amount to debit");

    Alert.alert(
      "Confirm Transaction",
      `Are you sure you want to debit ₦${amount} from this user?`,
      [
        { text: "Cancel" },
        {
          text: "Yes, Debit",
          onPress: async () => {
            try {
              const res = await axios.post(
                "https://ayax-api.com/admin/debit-user",
                {
                  userId: targetUserId,
                  amount: parseFloat(amount),
                },
              );
              if (res.data.success)
                Alert.alert("Success", "Funds debited successfully!");
            } catch (err) {
              Alert.alert("Error", "Could not debit user.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Admin Control Panel</Text>

      <TextInput
        style={styles.input}
        placeholder="Enter User ID or Phone"
        value={targetUserId}
        onChangeText={setTargetUserId}
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={[styles.btn, styles.blockBtn]}
          onPress={handleBlockWallet}
        >
          <Text style={styles.btnText}>BLOCK WALLET</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={[styles.input, { marginTop: 30 }]}
        placeholder="Amount to Debit (₦)"
        keyboardType="numeric"
        value={amount}
        onChangeText={setAmount}
      />

      <TouchableOpacity
        style={[styles.btn, styles.debitBtn]}
        onPress={handleDebitUser}
      >
        <Text style={styles.btnText}>CONFIRM DEBIT</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  title: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1e3a8a",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  btn: { padding: 15, borderRadius: 8, alignItems: "center" },
  blockBtn: { backgroundColor: "#e74c3c" },
  debitBtn: { backgroundColor: "#f39c12" },
  btnText: { color: "#fff", fontWeight: "bold" },
});

export default AdminUserControl;
