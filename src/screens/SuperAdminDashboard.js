import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SuperAdminDashboard = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const { data } = await axios.get(`${BASE_URL}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setStats(data.data || data.stats || {});
      setError(null);
    } catch (err) {
      console.error("Error fetching super admin stats", err);
      setError("Failed to load system statistics.");
      Alert.alert("Error", err.response?.data?.message || "Failed to load global overview.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a1d37" />
        <Text style={styles.loaderText}>Loading SuperAdmin Overview...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.loaderContainer}>
        <Ionicons name="alert-circle-outline" size={60} color="#ef4444" />
        <Text style={[styles.loaderText, { color: "#ef4444", marginTop: 10 }]}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchStats}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a1d37" />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>SuperAdmin Control Center</Text>
          <Text style={styles.headerSub}>Full System Override & Global Overview</Text>
        </View>
        <MaterialCommunityIcons name="shield-crown" size={32} color="#fbbf24" />
      </View>

      {/* Stats Cards Grid */}
      <View style={styles.gridContainer}>
        {/* Total Revenue */}
        <View style={[styles.statCard, { backgroundColor: "#1e3a8a" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total Revenue</Text>
            <Ionicons name="wallet-outline" size={22} color="#93c5fd" />
          </View>
          <Text style={styles.cardValue}>
            ₦{stats?.finance?.totalRevenue?.toLocaleString() || "0"}
          </Text>
        </View>

        {/* Successful Sales */}
        <View style={[styles.statCard, { backgroundColor: "#047857" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Successful Sales</Text>
            <Ionicons name="checkmark-done-circle-outline" size={22} color="#6ee7b7" />
          </View>
          <Text style={styles.cardValue}>
            {stats?.finance?.successfulTransactions?.toLocaleString() || "0"}
          </Text>
        </View>

        {/* Total Agents */}
        <View style={[styles.statCard, { backgroundColor: "#7c3aed" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total Agents</Text>
            <Ionicons name="people-outline" size={22} color="#c4b5fd" />
          </View>
          <Text style={styles.cardValue}>
            {stats?.users?.totalAgents?.toLocaleString() || "0"}
          </Text>
        </View>

        {/* Total Admins */}
        <View style={[styles.statCard, { backgroundColor: "#b91c1c" }]}>
          <View style={styles.cardTop}>
            <Text style={styles.cardLabel}>Total Admins</Text>
            <Ionicons name="shield-checkmark-outline" size={22} color="#fca5a5" />
          </View>
          <Text style={styles.cardValue}>
            {stats?.users?.totalAdmins?.toLocaleString() || "0"}
          </Text>
        </View>
      </View>

      {/* Quick Action Navigation Overrides */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>SuperAdmin Quick Management</Text>
      </View>

      <View style={styles.actionGrid}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("NIMCRequests")}
        >
          <Ionicons name="id-card-outline" size={26} color="#0a1d37" />
          <Text style={styles.actionText}>Manage NIMC Requests</Text>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate("NIMC History")}
        >
          <MaterialCommunityIcons name="history" size={26} color="#0a1d37" />
          <Text style={styles.actionText}>System Verification Logs</Text>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc", padding: 20 },
  loaderText: { marginTop: 10, color: "#64748b", fontWeight: "600", fontSize: 15 },
  retryBtn: { marginTop: 15, backgroundColor: "#0a1d37", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  retryText: { color: "#fff", fontWeight: "bold" },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: 50,
    paddingBottom: 25,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSub: { fontSize: 12, color: "#94a3b8", marginTop: 3, fontWeight: "600" },
  gridContainer: {
    padding: 20,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  cardLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },
  cardValue: { color: "#fff", fontSize: 22, fontWeight: "900" },
  sectionHeader: {
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  actionGrid: {
    paddingHorizontal: 20,
  },
  actionCard: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionText: { flex: 1, marginLeft: 15, fontSize: 14, fontWeight: "bold", color: "#1e293b" },
});

export default SuperAdminDashboard;