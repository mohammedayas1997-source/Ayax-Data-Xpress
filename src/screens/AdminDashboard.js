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
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    users: 0,
    nimc: 0,
    bvn: 0,
    pendingRefunds: 0,
    totalRevenue: 0,
  });

  const fetchStats = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000 
      };

      // Ɗauko bayanai daga Admin Endpoints
      const [statsRes, usersRes, nimcRes, bvnRes, refundsRes] =
        await Promise.all([
          axios.get(`${BASE_URL}/admin/stats`, config).catch(() => ({ data: { stats: {} } })),
          axios.get(`${BASE_URL}/admin/users`, config).catch(() => ({ data: { data: [] } })),
          axios.get(`${BASE_URL}/admin/nimc-requests`, config).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/admin/bvn-requests`, config).catch(() => ({ data: { count: 0 } })),
          axios.get(`${BASE_URL}/admin/pending-refunds`, config).catch(() => ({ data: { data: [] } })),
        ]);

      const globalStats = statsRes.data?.stats || {};

      setStats({
        users: usersRes.data?.data?.length || globalStats.totalUsers || 0,
        nimc: nimcRes.data?.count || nimcRes.data?.data?.length || 0,
        bvn: bvnRes.data?.count || bvnRes.data?.data?.length || 0,
        pendingRefunds: refundsRes.data?.data?.length || globalStats.pendingRefunds || 0,
        totalRevenue: globalStats.totalRevenue || 0,
      });
    } catch (err) {
      console.error("Admin Dashboard Error:", err);
      if (err.response && err.response.status === 401) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        Alert.alert("Connection Error", "Failed to load dashboard statistics.");
      }
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

  const MenuCard = ({ title, count, iconName, color, onPress }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardCount}>{count}</Text>
      </View>
      <View style={[styles.iconCircle, { backgroundColor: color }]}>
        <Ionicons name={iconName} size={18} color="#fff" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0a1d37" />
        <Text style={styles.loadingText}>Loading Admin Console...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0a1d37"]} />
      }
    >
      <StatusBar barStyle="light-content" backgroundColor="#0a1d37" />

      {/* Header Banner */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Ayax Admin Portal</Text>
          <Text style={styles.subText}>Operations & Management Console</Text>
        </View>
        <TouchableOpacity
          style={styles.refreshIconBtn}
          onPress={onRefresh}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Grid Menu */}
      <View style={styles.grid}>
        <MenuCard
          title="Total Users"
          count={Number(stats.users).toLocaleString()}
          iconName="people"
          color="#1e40af"
          onPress={() => navigation.navigate("AllUsers")}
        />

        <MenuCard
          title="Total Revenue"
          count={`₦${Number(stats.totalRevenue).toLocaleString()}`}
          iconName="wallet"
          color="#059669"
          onPress={() => navigation.navigate("TransactionsList")}
        />

        <MenuCard
          title="Pending Refunds"
          count={stats.pendingRefunds}
          iconName="refresh-circle"
          color="#dc2626"
          onPress={() => navigation.navigate("PendingRefunds")}
        />

        <MenuCard
          title="NIMC Requests"
          count={stats.nimc}
          iconName="card"
          color="#2563eb"
          onPress={() => navigation.navigate("NimcRequests")}
        />

        <MenuCard
          title="BVN Requests"
          count={stats.bvn}
          iconName="finger-print"
          color="#d97706"
          onPress={() => navigation.navigate("BvnRequests")}
        />

        <MenuCard
          title="Supervisors"
          count="View All"
          iconName="shield-checkmark"
          color="#7c3aed"
          onPress={() => navigation.navigate("SupervisorsList")}
        />
      </View>

      {/* Action Links */}
      <View style={styles.actionSection}>
        <Text style={styles.sectionTitle}>Management & Services</Text>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("DataPlans")}
        >
          <Ionicons name="wifi" size={22} color="#0a1d37" style={styles.btnIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionText}>Manage Data Packages</Text>
            <Text style={styles.actionSubText}>View active network bundles</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("AssignTargets")}
        >
          <Ionicons name="trophy-outline" size={22} color="#0a1d37" style={styles.btnIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionText}>Assign Supervisor Targets</Text>
            <Text style={styles.actionSubText}>Set monthly goals for field agents</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionBtn}
          onPress={() => navigation.navigate("SupportActivities")}
        >
          <Ionicons name="reader-outline" size={22} color="#0a1d37" style={styles.btnIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.actionText}>Audit Activity Logs</Text>
            <Text style={styles.actionSubText}>Review staff actions & history</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
        </TouchableOpacity>
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  loadingText: { marginTop: 10, color: "#64748b", fontSize: 13, fontWeight: "600" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 25,
    backgroundColor: "#0a1d37",
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: { fontSize: 22, fontWeight: "800", color: "#fff" },
  subText: { color: "#94a3b8", fontSize: 13, marginTop: 3 },
  refreshIconBtn: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    padding: 10,
    borderRadius: 12,
  },
  grid: {
    padding: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: "48%",
    padding: 14,
    borderRadius: 16,
    marginBottom: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardTitle: { fontSize: 12, color: "#64748b", fontWeight: "700" },
  cardCount: {
    fontSize: 15,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 4,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
  },
  actionSection: { paddingHorizontal: 16, marginTop: 5 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 12,
  },
  actionBtn: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  btnIcon: { marginRight: 12 },
  actionText: { fontSize: 14, color: "#0f172a", fontWeight: "700" },
  actionSubText: { fontSize: 11, color: "#64748b", marginTop: 2 },
});

export default AdminDashboard;