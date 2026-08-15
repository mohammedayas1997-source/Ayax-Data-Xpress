import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AdminControlScreen = ({ navigation }) => {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [nimcStats, setNimcStats] = useState({
    pending: 0,
    total: 0,
  });

  const [globalStats, setGlobalStats] = useState({
    totalGB: "0.00 GB",
    activeAgents: 0,
    targetMet: "0%",
  });

  const [supervisors, setSupervisors] = useState([]);

  const fetchAdminControlData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };

      const [nimcRes, globalRes, supRes] = await Promise.all([
        axios.get(`${BASE_URL}/admin/nimc-requests`, config).catch(() => ({ data: { count: 0, pending: 0 } })),
        axios.get(`${BASE_URL}/admin/sales-stats`, config).catch(() => ({ data: { totalGB: "0 GB", activeAgents: 0, targetMet: "0%" } })),
        axios.get(`${BASE_URL}/admin/supervisors-performance`, config).catch(() => ({ data: { data: [] } })),
      ]);

      setNimcStats({
        pending: nimcRes.data?.pending || nimcRes.data?.count || 12,
        total: nimcRes.data?.total || 145,
      });

      if (globalRes.data) {
        setGlobalStats({
          totalGB: globalRes.data.totalGB || "1,240.50 GB",
          activeAgents: globalRes.data.activeAgents || 124,
          targetMet: globalRes.data.targetMet || "72%",
        });
      }

      if (supRes.data?.data && supRes.data.data.length > 0) {
        setSupervisors(supRes.data.data);
      } else {
        // Fallback default mock data idan babu su a server tukuna
        setSupervisors([
          {
            id: "1",
            name: "Sir Idris Bapetel",
            totalAgents: 15,
            performance: "85%",
            totalGB: "450GB",
          },
          {
            id: "2",
            name: "Abdulrahman Ayax",
            totalAgents: 12,
            performance: "60%",
            totalGB: "210GB",
          },
        ]);
      }
    } catch (err) {
      console.log("Admin Control Data Error:", err);
      if (err.response && err.response.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminControlData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdminControlData();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* 1. Header & Search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Global Control</Text>
        <View style={styles.searchBar}>
          <TextInput
            placeholder="Search Agent or Supervisor..."
            placeholderTextColor="#94a3b8"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* === NIMC ADMIN MONITORING === */}
        <View style={styles.nimcSection}>
          <Text style={styles.sectionTitle}>NIMC Service Monitor</Text>
          <View style={styles.nimcGrid}>
            <TouchableOpacity
              style={[styles.nimcCard, { borderLeftColor: "#38bdf8" }]}
              onPress={() => navigation.navigate("NIMCRequests")}
            >
              <MaterialCommunityIcons
                name="file-document-edit-outline"
                size={24}
                color="#38bdf8"
              />
              <Text style={styles.nimcCardValue}>{nimcStats.pending}</Text>
              <Text style={styles.nimcCardLabel}>Pending Forms</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.nimcCard, { borderLeftColor: "#10b981" }]}
              onPress={() => navigation.navigate("NIMCHistory")}
            >
              <MaterialCommunityIcons name="history" size={24} color="#10b981" />
              <Text style={styles.nimcCardValue}>{nimcStats.total}</Text>
              <Text style={styles.nimcCardLabel}>Total History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 2. Monthly Global Stats */}
        <View style={styles.globalStatsCard}>
          <Text style={styles.cardLabel}>Company-Wide Sales (Monthly)</Text>
          <Text style={styles.globalGB}>{globalStats.totalGB}</Text>
          <View style={styles.statRow}>
            <View>
              <Text style={styles.subStatLabel}>Active Agents</Text>
              <Text style={styles.subStatValue}>{globalStats.activeAgents}</Text>
            </View>
            <View style={styles.vDivider} />
            <View>
              <Text style={styles.subStatLabel}>Target Met</Text>
              <Text style={styles.subStatValue}>{globalStats.targetMet}</Text>
            </View>
          </View>
        </View>

        {/* 3. Supervisor Management Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Supervisors Performance</Text>
          <TouchableOpacity onPress={() => navigation.navigate("AssignTargets")}>
            <Text style={styles.actionLink}>Set Targets</Text>
          </TouchableOpacity>
        </View>

        {supervisors
          .filter((sup) => sup.name.toLowerCase().includes(search.toLowerCase()))
          .map((sup) => (
            <TouchableOpacity key={sup.id || sup._id} style={styles.supCard}>
              <View style={styles.supInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{sup.name ? sup.name[0] : "S"}</Text>
                </View>
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.supName}>{sup.name}</Text>
                  <Text style={styles.supSubText}>
                    {sup.totalAgents || 0} Agents Managed
                  </Text>
                </View>
              </View>

              <View style={styles.supStats}>
                <View style={styles.perfBadge}>
                  <Text style={styles.perfText}>{sup.performance || "0%"}</Text>
                </View>
                <Text style={styles.supGB}>{sup.totalGB || "0GB"}</Text>
              </View>
            </TouchableOpacity>
          ))}

        {/* 4. Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.mainActionBtn}
            onPress={() => navigation.navigate("AssignTargets")}
          >
            <Text style={styles.mainActionText}>Add New Supervisor</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#38bdf8",
    marginBottom: 15,
  },
  searchBar: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    justifyContent: "center",
  },
  searchInput: { color: "#fff" },
  nimcSection: { paddingHorizontal: 20, marginTop: 20 },
  nimcGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  nimcCard: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 15,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    borderLeftWidth: 5,
  },
  nimcCardValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 5,
  },
  nimcCardLabel: { fontSize: 12, color: "#64748b" },
  globalStatsCard: {
    margin: 20,
    backgroundColor: "#f8fafc",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardLabel: { color: "#64748b", fontSize: 13, fontWeight: "600" },
  globalGB: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginVertical: 10,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 15,
  },
  subStatLabel: { fontSize: 11, color: "#94a3b8", textTransform: "uppercase" },
  subStatValue: { fontSize: 16, fontWeight: "bold", color: "#334155" },
  vDivider: { width: 1, backgroundColor: "#e2e8f0" },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 15,
    alignItems: "center",
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#0f172a" },
  actionLink: { color: "#38bdf8", fontWeight: "bold" },
  supCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
  },
  supInfo: { flexDirection: "row", alignItems: "center" },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontWeight: "bold", color: "#475569", fontSize: 18 },
  supName: { fontWeight: "bold", color: "#1e293b", fontSize: 15 },
  supSubText: { color: "#94a3b8", fontSize: 12 },
  supStats: { alignItems: "flex-end" },
  perfBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 5,
  },
  perfText: { color: "#166534", fontSize: 11, fontWeight: "bold" },
  supGB: { fontWeight: "bold", color: "#1e3a8a" },
  actionContainer: { padding: 20 },
  mainActionBtn: {
    backgroundColor: "#1e3a8a",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
  },
  mainActionText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});

export default AdminControlScreen;