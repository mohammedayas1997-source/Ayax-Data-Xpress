import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import axios from "axios";

const AgentManagementScreen = () => {
  const [agents, setAgents] = useState([]);
  const [targetStats, setTargetStats] = useState({
    totalRegistered: 0,
    totalDataSold: 0,
    monthlyGoal: 10,
    dataGoal: 100,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Kira dukkan bayanan Agents karkashin wannan Supervisor din
  const fetchAgentStats = async () => {
    try {
      setError(null);
      const token = localStorage ? localStorage.getItem("token") : null; // Ko SecureStore idan kana amfani da shi a Mobile app din Expo
      
      const response = await axios.get(
        "https://ayax-data-xpress-server.onrender.com/api/v1/supervisor/my-agents",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      setAgents(response.data.agents || []);
      if (response.data.stats) {
        setTargetStats(response.data.stats);
      }
    } catch (err) {
      console.error("Error loading agents:", err);
      setError("Failed to load agent performance metrics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgentStats();
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
        <Text style={styles.loadingText}>Loading Agent Metrics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Monthly Performance</Text>

      {/* Target Progress Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>New Agents</Text>
          <Text style={styles.statValue}>
            {targetStats.totalRegistered}/{targetStats.monthlyGoal}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Data Sold</Text>
          <Text style={styles.statValue}>
            {targetStats.totalDataSold}GB / {targetStats.dataGoal}GB
          </Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Agent List & Daily Sales</Text>
      
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchAgentStats}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item._id || Math.random().toString()}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e3a8a" />
          }
          renderItem={({ item }) => (
            <View style={styles.agentCard}>
              <View>
                <Text style={styles.agentName}>{item.fullName || item.name}</Text>
                <Text style={styles.agentInfo}>
                  Today's Sale: {item.todaySales || 0}GB
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.viewBtn}
                onPress={() => {
                  // Anan zaka iya sanya navigation zuwa shafin History din agent din
                  alert(`Viewing history for ${item.fullName || item.name}`);
                }}
              >
                <Text style={styles.viewText}>View History</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No agents assigned yet.</Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff", padding: 20 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 10, color: "#64748b", fontSize: 14 },
  header: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 30,
  },
  statCard: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 15,
    width: "48%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statLabel: { color: "#64748b", fontSize: 12 },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#0f172a",
    marginTop: 5,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 15, color: "#0f172a" },
  agentCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  agentName: { fontWeight: "bold", color: "#1e293b", fontSize: 15 },
  agentInfo: { color: "#64748b", fontSize: 13, marginTop: 2 },
  viewBtn: { backgroundColor: "#0284c7", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  viewText: { color: "#fff", fontSize: 12, fontWeight: "bold" },
  errorContainer: { padding: 20, alignItems: "center" },
  errorText: { color: "#dc2626", textAlign: "center", marginBottom: 10 },
  retryBtn: { backgroundColor: "#1e3a8a", paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  retryText: { color: "#fff", fontWeight: "bold" },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 20 },
});

export default AgentManagementScreen;