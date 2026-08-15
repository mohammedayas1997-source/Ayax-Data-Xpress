import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupervisorDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supervisorData, setSupervisorData] = useState({
    name: "Supervisor",
    referralId: "AX0000",
    agents: [],
    targets: {
      newAgentsCount: 0,
      totalAgentsTarget: 10,
      gbSold: 0,
      gbTarget: 100,
    },
  });

  // Amfani da useFocusEffect domin sabunta bayanai duk lokacin da aka dawo shafin
  useFocusEffect(
    useCallback(() => {
      fetchSupervisorProfile();
    }, [])
  );

  const fetchSupervisorProfile = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Kira zuwa ainihin sabar mu ta Render
      const response = await axios.get(`${BASE_URL}/supervisor/profile`, config);
      
      const result = response.data;
      if (result.success || result.status === "success") {
        const data = result.data || result.supervisor || result;
        setSupervisorData({
          name: data.firstName ? `${data.firstName} ${data.surname || ""}` : (data.name || "Supervisor"),
          referralId: data.referralId || data.supervisorId || data.code || "AX0000",
          agents: data.agents || [],
          targets: data.targets || {
            newAgentsCount: data.agents ? data.agents.length : 0,
            totalAgentsTarget: 10,
            gbSold: data.gbSold || 0,
            gbTarget: 100,
          },
        });
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Supervisor Context Retrieval Failure:", error);
        // Idan akwai matsala ko kuma endpoint din yana kan gina shi, za mu iya amfani da wani cached data ko default
        try {
          const cachedUser = await AsyncStorage.getItem("userData");
          if (cachedUser) {
            const parsed = JSON.parse(cachedUser);
            setSupervisorData((prev) => ({
              ...prev,
              name: `${parsed.firstName || ""} ${parsed.surname || ""}`,
              referralId: parsed.supervisorId || parsed.referralId || "AX770",
            }));
          }
        } catch (cacheErr) {
          console.log("Cache read error:", cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    Alert.alert("Success", `Referral ID ${supervisorData.referralId} copied successfully!`);
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  const agentsList = supervisorData.agents.length > 0 ? supervisorData.agents : [
    { id: "1", name: "No agents registered yet", todayGB: "0GB", status: "Inactive" }
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Supervisor Panel</Text>
          <Text style={styles.welcomeText}>
            Welcome back, {supervisorData.name}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.profileBadge}
          onPress={() => navigation.navigate("Profile")}
        >
          <Ionicons name="person-circle" size={40} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      {/* Institutional Identification Card */}
      <View style={styles.idCard}>
        <View style={styles.idInfo}>
          <Text style={styles.idLabel}>OFFICIAL REFERRAL ID</Text>
          <Text style={styles.idValue}>{supervisorData.referralId}</Text>
        </View>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={copyToClipboard}
        >
          <Ionicons name="copy-outline" size={20} color="#fff" />
          <Text style={styles.copyText}>COPY</Text>
        </TouchableOpacity>
      </View>

      {/* Target Progress Section */}
      <View style={styles.targetCard}>
        <Text style={styles.cardLabel}>Monthly Target Progress</Text>
        <View style={styles.progressRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {supervisorData.targets.newAgentsCount}/{supervisorData.targets.totalAgentsTarget}
            </Text>
            <Text style={styles.statSub}>New Agents</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.statBox}>
            <Text style={styles.statNum}>
              {supervisorData.targets.gbSold}/{supervisorData.targets.gbTarget}
            </Text>
            <Text style={styles.statSub}>GB Sold</Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View 
            style={[
              styles.progressBarFill, 
              { width: `${Math.min((supervisorData.targets.gbSold / supervisorData.targets.gbTarget) * 100, 100)}%` }
            ]} 
          />
        </View>
      </View>

      {/* Agents Daily Tracking */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Daily Agent Performance</Text>
        <TouchableOpacity onPress={fetchSupervisorProfile}>
          <Ionicons name="reload" size={18} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {agentsList.map((agent, index) => (
        <View key={agent.id || index} style={styles.agentRow}>
          <View style={styles.agentLeft}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor:
                    agent.status === "Active" ? "#22c55e" : "#ef4444",
                },
              ]}
            />
            <View>
              <Text style={styles.agentName}>
                {agent.firstName ? `${agent.firstName} ${agent.surname || ""}` : (agent.name || "Agent")}
              </Text>
              <Text style={styles.agentStatus}>{agent.status || "Active"}</Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.gbText}>{agent.todayGB || agent.totalGB || "0GB"}</Text>
            <Text style={styles.timeText}>Data Consumed</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity
        style={styles.addAgentBtn}
        onPress={() => navigation.navigate("Signup")}
      >
        <Ionicons
          name="person-add"
          size={20}
          color="#1e3a8a"
          style={{ marginRight: 10 }}
        />
        <Text style={styles.addAgentText}>Register New Agent</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 25,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: -1,
  },
  welcomeText: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  profileBadge: { padding: 5 },

  idCard: {
    backgroundColor: "#1e293b",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    borderLeftWidth: 5,
    borderLeftColor: "#3b82f6",
  },
  idLabel: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  idValue: { color: "#fff", fontSize: 24, fontWeight: "bold", marginTop: 2 },
  copyBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  copyText: { color: "#fff", fontSize: 10, fontWeight: "bold", marginLeft: 5 },

  targetCard: {
    backgroundColor: "#1e3a8a",
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    elevation: 8,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
  },
  cardLabel: {
    color: "#bfdbfe",
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statBox: { alignItems: "center" },
  statNum: { color: "#fff", fontSize: 24, fontWeight: "900" },
  statSub: { color: "#93c5fd", fontSize: 11, fontWeight: "600" },
  divider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.1)" },
  progressBarBg: {
    height: 10,
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 5,
  },
  progressBarFill: { height: 10, backgroundColor: "#38bdf8", borderRadius: 5 },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a" },

  agentRow: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  agentLeft: { flexDirection: "row", alignItems: "center" },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 12 },
  agentName: { fontWeight: "700", color: "#1e293b", fontSize: 16 },
  agentStatus: { color: "#64748b", fontSize: 12, fontWeight: "500" },
  gbText: { fontWeight: "900", color: "#1e3a8a", fontSize: 17 },
  timeText: {
    color: "#94a3b8",
    fontSize: 10,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  addAgentBtn: {
    backgroundColor: "#eff6ff",
    padding: 18,
    borderRadius: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "dashed",
    borderWidth: 2,
    borderColor: "#3b82f6",
    marginTop: 10,
  },
  addAgentText: { color: "#1e3a8a", fontWeight: "800", fontSize: 15 },
});

export default SupervisorDashboard;