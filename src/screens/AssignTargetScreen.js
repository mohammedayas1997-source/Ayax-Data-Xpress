import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AssignTargetScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [targetData, setTargetData] = useState({
    supervisorId: "65e4a1b2c3d4e5f6a7b8c9d1", // Za a iya canza shi idan akwai picker
    supervisorName: "Sir Idris Bapetel",
    agentGoal: "",
    dataGoal: "",
    month: "August 2026",
  });

  const handleAssign = async () => {
    if (!targetData.agentGoal || !targetData.dataGoal) {
      return Alert.alert("Required", "Don Allah cika dukkan bayanan target.");
    }

    try {
      setLoading(true);
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
        supervisorId: targetData.supervisorId,
        agentGoal: Number(targetData.agentGoal),
        dataGoal: Number(targetData.dataGoal),
        month: targetData.month,
      };

      await axios.post(`${BASE_URL}/admin/assign-target`, payload, config);

      Alert.alert(
        "Target Set Successfully!",
        `An bawa ${targetData.supervisorName} target din register agents ${targetData.agentGoal} da kuma sayar da ${targetData.dataGoal}GB a watan ${targetData.month}.`,
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error("Assign Target Error:", err);
      const errorMsg = err.response?.data?.message || "Kuskure wajen tura bayanan target zuwa server.";
      Alert.alert("Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Set Monthly Target</Text>
          <Text style={styles.subtitle}>Assign goals to your supervisors</Text>
        </View>

        <View style={styles.formCard}>
          {/* Supervisor Selection */}
          <Text style={styles.label}>Selected Supervisor</Text>
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>{targetData.supervisorName}</Text>
          </View>

          {/* Agent Registration Target */}
          <Text style={styles.label}>New Agents Registration Goal</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={targetData.agentGoal}
              onChangeText={(text) =>
                setTargetData({ ...targetData, agentGoal: text })
              }
            />
            <Text style={styles.unitText}>Agents</Text>
          </View>

          {/* Data Sales Target */}
          <Text style={styles.label}>Data Sales Goal (GB)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={targetData.dataGoal}
              onChangeText={(text) =>
                setTargetData({ ...targetData, dataGoal: text })
              }
            />
            <Text style={styles.unitText}>GB</Text>
          </View>

          {/* Target Period */}
          <Text style={styles.label}>Target Period</Text>
          <View style={styles.readOnlyBox}>
            <Text style={styles.readOnlyText}>{targetData.month}</Text>
          </View>

          <TouchableOpacity
            style={styles.assignBtn}
            onPress={handleAssign}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.assignBtnText}>ACTIVATE TARGET</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  scrollContainer: { padding: 25, flexGrow: 1, justifyContent: "center" },
  header: { marginBottom: 30 },
  title: { fontSize: 26, fontWeight: "bold", color: "#1e3a8a" },
  subtitle: { fontSize: 15, color: "#64748b", marginTop: 5 },
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },
  readOnlyBox: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  readOnlyText: { color: "#1e3a8a", fontWeight: "bold", fontSize: 16 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginBottom: 20,
    paddingHorizontal: 15,
  },
  input: {
    flex: 1,
    height: 55,
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
  },
  unitText: { color: "#64748b", fontWeight: "600", fontSize: 14 },
  assignBtn: {
    backgroundColor: "#1e3a8a",
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  assignBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  cancelBtn: { marginTop: 20, alignItems: "center" },
  cancelBtnText: { color: "#ef4444", fontWeight: "600" },
});

export default AssignTargetScreen;