import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SystemAudit = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  const fetchAuditData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const BASE_URL = "https://ayax-api.com/api/v1/superadmin";

      const [statsRes, logsRes] = await Promise.all([
        axios.get(`${BASE_URL}/stats`, config),
        axios.get(`${BASE_URL}/audit-logs`, config),
      ]);

      setStats(statsRes.data.data);
      setAuditLogs(logsRes.data.data);
    } catch (err) {
      Alert.alert("Access Denied", "Unable to load administrative data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAuditData();
  };

  const LogItem = ({ item }) => (
    <View style={styles.logCard}>
      <View style={styles.logHeader}>
        <Text style={styles.staffName}>
          {item.staffId?.firstName} {item.staffId?.surname}
          <Text style={styles.staffRole}> ({item.staffId?.role})</Text>
        </Text>
        <Text style={styles.logTime}>
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.actionText}>{item.action}</Text>
      <Text style={styles.logDetail}>{item.details}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>System Audit & Insights</Text>
          <Text style={styles.subtitle}>
            Global Governance & Activity Monitoring
          </Text>
        </View>

        <View style={styles.statsGrid}>
          <View style={styles.mainStat}>
            <Text style={styles.statLabel}>Total Revenue</Text>
            <Text style={styles.revenueText}>
              ₦{stats?.finance?.totalRevenue.toLocaleString()}
            </Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.miniStat, { backgroundColor: "#eef2ff" }]}>
              <Text style={styles.miniLabel}>Total Users</Text>
              <Text style={styles.miniValue}>{stats?.users?.totalUsers}</Text>
            </View>
            <View style={[styles.miniStat, { backgroundColor: "#f0fdf4" }]}>
              <Text style={styles.miniLabel}>Admins</Text>
              <Text style={styles.miniValue}>{stats?.users?.totalAdmins}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Administrative Audit Logs</Text>
          {auditLogs.length === 0 ? (
            <Text style={styles.emptyText}>
              No recent staff activities recorded.
            </Text>
          ) : (
            auditLogs.map((log) => <LogItem key={log._id} item={log} />)
          )}
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              Alert.alert("Action", "Navigate to Global Transactions list")
            }
          >
            <Text style={styles.actionBtnText}>
              View Global Transaction Ledger
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: "#4f46e5" }]}
            onPress={() =>
              Alert.alert("Action", "Navigate to User Role Management")
            }
          >
            <Text style={[styles.actionBtnText, { color: "#4f46e5" }]}>
              Manage Permissions & Roles
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { padding: 25, backgroundColor: "#111827" },
  title: { fontSize: 22, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  statsGrid: { padding: 20 },
  mainStat: {
    backgroundColor: "#4f46e5",
    padding: 20,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: "center",
  },
  statLabel: { color: "#c7d2fe", fontSize: 14, fontWeight: "600" },
  revenueText: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 8,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  miniStat: { width: "48%", padding: 15, borderRadius: 12 },
  miniLabel: { fontSize: 12, color: "#4b5563", fontWeight: "600" },
  miniValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },
  section: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 15,
  },
  logCard: {
    backgroundColor: "#fafafa",
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  logHeader: { flexDirection: "row", justifyContent: "space-between" },
  staffName: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  staffRole: { color: "#6366f1", fontSize: 12 },
  logTime: { fontSize: 11, color: "#9ca3af" },
  actionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 5,
  },
  logDetail: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  actionSection: { padding: 20, paddingBottom: 40 },
  actionBtn: {
    padding: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    marginBottom: 10,
  },
  actionBtnText: { fontSize: 14, fontWeight: "bold", color: "#374151" },
  emptyText: { textAlign: "center", color: "#9ca3af", marginTop: 20 },
});

export default SystemAudit;
