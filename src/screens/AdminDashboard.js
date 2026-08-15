import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    nimc: 0,
    bvn: 0,
    reports: 0,
    sales: 0,
  });

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const BASE_URL = "https://ayax-api.com/api/v1/admin";

      const [usersRes, nimcRes, bvnRes, reportRes, salesRes] =
        await Promise.all([
          axios.get(`${BASE_URL}/users`, config),
          axios.get(`${BASE_URL}/nimc-requests`, config),
          axios.get(`${BASE_URL}/bvn-requests`, config),
          axios.get(`${BASE_URL}/all-reports`, config),
          axios.get(`${BASE_URL}/sales-stats`, config),
        ]);

      setStats({
        users: usersRes.data.data.length,
        nimc: nimcRes.data.count,
        bvn: bvnRes.data.count,
        reports: reportRes.data.requests.length,
        sales: salesRes.data.total || 0,
      });
    } catch (err) {
      console.error(err);
      Alert.alert("Connection Error", "Failed to load dashboard statistics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  const MenuCard = ({ title, count, icon, color, onPress }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCount}>{count}</Text>
      </View>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>{icon}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.welcome}>Ayax Admin Panel</Text>
        <Text style={styles.subText}>Management & Systems Control</Text>
      </View>

      <View style={styles.grid}>
        {/* --- CORE MANAGEMENT --- */}
        <MenuCard
          title="Total Users"
          count={stats.users}
          icon="U"
          color="#1e3a8a"
          onPress={() => navigation.navigate("AllUsers")}
        />

        <MenuCard
          title="Total Sales"
          count={`₦${stats.sales}`}
          icon="₦"
          color="#059669"
          onPress={() => navigation.navigate("SalesLogs")}
        />

        <MenuCard
          title="Issue Resolution"
          count={stats.reports}
          icon="!"
          color="#dc2626"
          onPress={() => navigation.navigate("IssueResolution")}
        />

        <MenuCard
          title="System Pricing"
          count="Update"
          icon="P"
          color="#7c3aed"
          onPress={() => navigation.navigate("PricingSettings")}
        />

        <MenuCard
          title="NIMC Requests"
          count={stats.nimc}
          icon="N"
          color="#2563eb"
          onPress={() => navigation.navigate("NimcRequests")}
        />

        <MenuCard
          title="BVN Requests"
          count={stats.bvn}
          icon="B"
          color="#d97706"
          onPress={() => navigation.navigate("BvnRequests")}
        />
      </View>

      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Service Configuration</Text>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("DataPlans")}
        >
          <Text style={styles.actionText}>Manage Data & Airtime Plans</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("CableTvPlans")}
        >
          <Text style={styles.actionText}>
            Configure Cable TV & Utility Rates
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("AssignTargets")}
        >
          <Text style={styles.actionText}>Assign Supervisor Targets</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("SupportActivities")}
        >
          <Text style={styles.actionText}>Audit Support Logs</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    padding: 25,
    backgroundColor: "#1e3a8a",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  welcome: { fontSize: 24, fontWeight: "bold", color: "#fff" },
  subText: { color: "#cbd5e1", marginTop: 5 },
  grid: {
    padding: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: "47%",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 5,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: { fontSize: 13, color: "#64748b", fontWeight: "600" },
  cardCount: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e293b",
    marginTop: 5,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  actionSection: { padding: 20 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 15,
  },
  actionBtn: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionText: { fontSize: 15, color: "#334155", fontWeight: "500" },
});

export default AdminDashboard;
