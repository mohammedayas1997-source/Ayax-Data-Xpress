import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AgentTransferScreen = ({ navigation }) => {
  const [transferType, setTransferType] = useState("bulk");
  const [oldSupervisorRef, setOldSupervisorRef] = useState("");
  const [newSupervisorRef, setNewSupervisorRef] = useState("");
  const [agentIdentifier, setAgentIdentifier] = useState("");
  const [loading, setLoading] = useState(false);

  const notify = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleTransfer = async () => {
    const cleanNewRef = newSupervisorRef.trim().toUpperCase();
    const cleanOldRef = oldSupervisorRef.trim().toUpperCase();
    const cleanAgentIdent = agentIdentifier.trim();

    if (!cleanNewRef) {
      return notify("Validation Error", "Destination Supervisor Ref code is required.");
    }

    if (transferType === "bulk" && !cleanOldRef) {
      return notify("Validation Error", "Source Supervisor Ref code is required.");
    }

    if (transferType === "single" && !cleanAgentIdent) {
      return notify("Validation Error", "Agent Ref code or Phone number is required.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const endpoint =
        transferType === "bulk"
          ? `${BASE_URL}/supervisors/transfer-all-agents`
          : `${BASE_URL}/supervisors/transfer-single-agent`;

      const payload =
        transferType === "bulk"
          ? {
              oldSupervisorRef: cleanOldRef,
              oldSupervisorId: cleanOldRef,
              newSupervisorRef: cleanNewRef,
              newSupervisorId: cleanNewRef,
            }
          : {
              agentRef: cleanAgentIdent,
              agentId: cleanAgentIdent,
              newSupervisorRef: cleanNewRef,
              newSupervisorId: cleanNewRef,
            };

      const res = await axios.post(endpoint, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (res.data?.success) {
        notify("Transfer Complete", res.data.message || "Agent reassignment successful.");
        setOldSupervisorRef("");
        setNewSupervisorRef("");
        setAgentIdentifier("");
      } else {
        notify("Transfer Failed", res.data?.message || "Failed to process transfer.");
      }
    } catch (err) {
      notify(
        "Request Failed",
        err.response?.data?.message || err.message || "Server communication error."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 30 }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agent Reassignment</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, transferType === "bulk" && styles.activeTab]}
          onPress={() => setTransferType("bulk")}
        >
          <Text style={[styles.tabText, transferType === "bulk" && styles.activeTabText]}>
            Bulk Transfer
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, transferType === "single" && styles.activeTab]}
          onPress={() => setTransferType("single")}
        >
          <Text style={[styles.tabText, transferType === "single" && styles.activeTabText]}>
            Single Agent
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.descText}>
          {transferType === "bulk"
            ? "Reassign all retail agents from a terminated/suspended supervisor to a new supervisor using their Ref Codes."
            : "Select an individual agent to reassign to a new supervisor using their Ref Code or registered phone number."}
        </Text>

        {transferType === "bulk" ? (
          <>
            <Text style={styles.label}>Source Supervisor Ref Code (e.g. AYX-AJINGI-7764)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AYX-AJINGI-7764"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
              value={oldSupervisorRef}
              onChangeText={setOldSupervisorRef}
            />
          </>
        ) : (
          <>
            <Text style={styles.label}>Agent Ref Code or Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. AYX-AJINGI-1024 or 08012345678"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
              value={agentIdentifier}
              onChangeText={setAgentIdentifier}
            />
          </>
        )}

        <Text style={styles.label}>Destination Supervisor Ref Code (New Lead)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. AYX-KANO-9921"
          placeholderTextColor="#64748b"
          autoCapitalize="characters"
          autoCorrect={false}
          value={newSupervisorRef}
          onChangeText={setNewSupervisorRef}
        />

        <TouchableOpacity
          style={[styles.submitBtn, loading && { opacity: 0.7 }]}
          onPress={handleTransfer}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <MaterialCommunityIcons name="account-switch" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.submitText}>
                {transferType === "bulk" ? "Reassign All Agents" : "Reassign Agent"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050811", paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 40,
    paddingBottom: 20,
  },
  headerTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "bold" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#0b1120",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  activeTab: { backgroundColor: "#dc2626" },
  tabText: { color: "#94a3b8", fontWeight: "bold", fontSize: 13 },
  activeTabText: { color: "#fff" },
  card: {
    backgroundColor: "#0b1120",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  descText: { color: "#94a3b8", fontSize: 13, lineHeight: 18, marginBottom: 20 },
  label: { color: "#cbd5e1", fontSize: 12, fontWeight: "bold", marginBottom: 8 },
  input: {
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    color: "#fff",
    marginBottom: 16,
    fontSize: 14,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  submitBtn: {
    backgroundColor: "#dc2626",
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 14 },
});

export default AgentTransferScreen;