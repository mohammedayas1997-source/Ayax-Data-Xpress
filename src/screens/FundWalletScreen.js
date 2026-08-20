import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const FundWalletScreen = ({ navigation, route }) => {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const handleFundWallet = async () => {
    if (!amount || Number(amount) <= 0) {
      Alert.alert("Error", "Don Allah saka adadin kuɗin da ya dace (Amount).");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const payload = {
        amount: Number(amount),
        note: note || "User Wallet Funding",
      };

      const response = await axios.post(
        `${BASE_URL}/wallet/fund-wallet`,
        payload,
        config
      );

      if (response.data.success || response.status === 200 || response.status === 201) {
        Alert.alert(
          "Success!",
          `An yi nasarar zuba ₦${amount} a asusunka.`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      console.error("Fund Wallet Error:", error);
      const errorMsg = error.response?.data?.message || "An samu matsala wajen saka kuɗin.";
      Alert.alert("Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="wallet" size={40} color="#38bdf8" />
        <Text style={styles.title}>Fund Wallet</Text>
        <Text style={styles.subtitle}>Add balance to your personal account</Text>
      </View>

      <View style={styles.form}>
        {/* Amount Input */}
        <Text style={styles.label}>Amount (₦)</Text>
        <View style={styles.inputGroup}>
          <FontAwesome5 name="money-bill-wave" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="e.g. 5000"
            placeholderTextColor="#94a3b8"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
        </View>

        {/* Optional Note / Narration */}
        <Text style={styles.label}>Narration / Note (Optional)</Text>
        <View style={styles.inputGroup}>
          <MaterialIcons name="note" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="e.g. Top up for data"
            placeholderTextColor="#94a3b8"
            value={note}
            onChangeText={setNote}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { backgroundColor: "#94a3b8" }]}
          onPress={handleFundWallet}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="white" />
              <Text style={styles.submitBtnText}>FUND WALLET</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0f172a",
    padding: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#38bdf8", fontSize: 14 },
  form: { padding: 20, marginTop: 10 },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 55,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 16, color: "#1e293b", fontWeight: "600" },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    height: 55,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
  },
  submitBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});

export default FundWalletScreen;