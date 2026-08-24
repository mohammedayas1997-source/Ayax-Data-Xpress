import React, { useState, useEffect, useCallback } from "react";
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
  Dimensions,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
  Feather,
  MaterialIcons,
} from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AdminDashboard = () => {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalSupervisors: 0,
    totalTransactions: 0,
    pendingRefunds: 0,
    totalRevenue: 0,
    pendingNIMC: 0,
    pendingBVN: 0,
    totalWalletLiabilities: 0,
  });

  const fetchDashboardStats = useCallback(async (isBackground = false) => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground) {
          setLoading(false);
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      };

      const res = await axios.get(`${BASE_URL}/admin/dashboard-stats`, config);

      if (res.data?.stats) {
        setStats(res.data.stats);
      } else if (res.data?.success && res.data?.data) {
        setStats(res.data.data);
      }
    } catch (err) {
      if (!isBackground) {
        console.error("Admin Dashboard Fetch Error:", err.response?.data || err.message);
        if (err.response && err.response.status === 401) {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        } else {
          Alert.alert("Connection Error", "Failed to retrieve real-time operational statistics.");
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(() => {
      fetchDashboardStats(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchDashboardStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardStats();
  };

  const handleLogout = async () => {
    if (Platform.OS === "web") {
      const confirm = window.confirm("Sign out of the Admin Management Console?");
      if (confirm) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    } else {
      Alert.alert("Sign Out", "Sign out of the Admin Management Console?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]);
    }
  };

  const MetricCard = ({ title, count, icon, iconLib: IconLib, color, sub, onPress }) => (
    <TouchableOpacity
      style={[styles.metricCard, { borderTopColor: color }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.metricCardHeader}>
        <Text style={styles.metricCardLabel} numberOfLines={1}>{title}</Text>
        <View style={[styles.metricIconWrap, { backgroundColor: `${color}18` }]}>
          <IconLib name={icon} size={16} color={color} />
        </View>
      </View>
      <Text style={[styles.metricCardValue, { color }]} numberOfLines={1}>{count}</Text>
      {sub && <Text style={styles.metricCardSub} numberOfLines={1}>{sub}</Text>}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <ActivityIndicator size="large" color="#00f0ff" />
        <Text style={styles.loaderTitle}>AYAX ENTERPRISE PORTAL</Text>
        <Text style={styles.loaderSub}>Synchronizing Operations Engine...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* Top Application Bar */}
      <View style={styles.topBar}>
        <View>
          <View style={styles.statusBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.statusBadgeText}>OPERATIONS ACTIVE</Text>
          </View>
          <Text style={styles.brandTitle}>AYAX ADMIN PORTAL</Text>
        </View>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.actionIconBtn}
            onPress={onRefresh}
            activeOpacity={0.7}
          >
            <Feather name="rotate-cw" size={17} color="#00f0ff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconBtn, styles.logoutBtn]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Feather name="log-out" size={17} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00f0ff" />
        }
      >
        {/* Core Financial & Operation Telemetry */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>FINANCIAL & SETTLEMENT TELEMETRY</Text>
          <Text style={styles.sectionHeaderLive}>LIVE METRICS</Text>
        </View>

        <View style={styles.metricGrid}>
          <MetricCard
            title="Total Revenue"
            count={`₦${Number(stats.totalRevenue || 0).toLocaleString()}`}
            icon="wallet"
            iconLib={Ionicons}
            color="#10b981"
            sub={`${stats.totalTransactions || 0} Total Transactions`}
            onPress={() => navigation.navigate("TransactionsList")}
          />

          <MetricCard
            title="Wallet Liabilities"
            count={`₦${Number(stats.totalWalletLiabilities || 0).toLocaleString()}`}
            icon="cash-multiple"
            iconLib={MaterialCommunityIcons}
            color="#00f0ff"
            sub="Active Float Capital"
            onPress={() => navigation.navigate("AllUsers")}
          />

          <MetricCard
            title="Pending Refunds"
            count={stats.pendingRefunds || 0}
            icon="refresh-circle"
            iconLib={Ionicons}
            color="#f87171"
            sub="Failed & Unsettled Items"
            onPress={() => navigation.navigate("PendingRefunds")}
          />

          <MetricCard
            title="Total Users"
            count={Number(stats.totalUsers || 0).toLocaleString()}
            icon="people"
            iconLib={Ionicons}
            color="#c084fc"
            sub={`${stats.totalSupervisors || 0} Super • ${stats.totalAgents || 0} Agents`}
            onPress={() => navigation.navigate("AllUsers")}
          />
        </View>

        {/* Identity & Verification Queue */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeaderLabel}>IDENTITY SERVICES QUEUE</Text>
        </View>

        <View style={styles.metricGrid}>
          <MetricCard
            title="NIMC Requests"
            count={stats.pendingNIMC || 0}
            icon="id-card"
            iconLib={Ionicons}
            color="#38bdf8"
            sub="Awaiting Verification"
            onPress={() => navigation.navigate("NimcRequests")}
          />

          <MetricCard
            title="BVN Requests"
            count={stats.pendingBVN || 0}
            icon="fingerprint"
            iconLib={FontAwesome5}
            color="#fbbf24"
            sub="Awaiting Verification"
            onPress={() => navigation.navigate("BvnRequests")}
          />
        </View>

        {/* Command & Control Navigation */}
        <Text style={[styles.sectionHeaderLabel, { marginTop: 12, marginBottom: 12 }]}>
          MANAGEMENT MODULES
        </Text>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("DataPlans")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#0284c7" }]}>
            <Ionicons name="wifi" size={22} color="#ffffff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={styles.tileTitle}>Data Package Pricing & Margins</Text>
            <Text style={styles.tileDescription}>
              Sync live Ayax provider packages and set retail/agent tariffs.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("PendingRefunds")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#dc2626" }]}>
            <Ionicons name="refresh-circle" size={24} color="#ffffff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={[styles.tileTitle, { color: "#f87171" }]}>
              Process Pending Refunds
            </Text>
            <Text style={styles.tileDescription}>
              Review failed utility or VTU purchases and disburse instant wallet refunds.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("NimcRequests")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#4338ca" }]}>
            <Ionicons name="card" size={22} color="#ffffff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={styles.tileTitle}>NIMC & NIN Verification Queue</Text>
            <Text style={styles.tileDescription}>
              Approve slip print requests, upload PDFs, and update resolution states.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("BvnRequests")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#d97706" }]}>
            <FontAwesome5 name="fingerprint" size={20} color="#ffffff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={styles.tileTitle}>BVN Verification Desk</Text>
            <Text style={styles.tileDescription}>
              Inspect BVN demographics, standard slip generations, and status overrides.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("SupervisorsList")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#7c3aed" }]}>
            <FontAwesome5 name="user-tie" size={18} color="#ffffff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={styles.tileTitle}>Supervisor Network & Targets</Text>
            <Text style={styles.tileDescription}>
              Assign monthly agent quotas, data volume goals, and review performance.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.commandTile}
          onPress={() => navigation.navigate("SupportActivities")}
          activeOpacity={0.8}
        >
          <View style={[styles.tileIconContainer, { backgroundColor: "#334155" }]}>
            <Feather name="activity" size={20} color="#00f0ff" />
          </View>
          <View style={styles.tileInfo}>
            <Text style={styles.tileTitle}>Forensic Audit Logs</Text>
            <Text style={styles.tileDescription}>
              Track real-time staff activities, authentication audits, and user records.
            </Text>
          </View>
          <Feather name="chevron-right" size={20} color="#64748b" />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#050811" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#050811",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#00f0ff",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
  loaderSub: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0b1120",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 16,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#00f0ff",
    marginRight: 6,
  },
  statusBadgeText: { color: "#00f0ff", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  brandTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  topActions: { flexDirection: "row", alignItems: "center" },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginLeft: 8,
  },
  logoutBtn: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  scrollArea: { flex: 1 },
  scrollContent: { padding: 16 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sectionHeaderLive: {
    color: "#10b981",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metricCard: {
    width: "48.5%",
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderTopWidth: 3,
  },
  metricCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metricCardLabel: { color: "#94a3b8", fontSize: 11, fontWeight: "700", flex: 1 },
  metricIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  metricCardValue: { fontSize: 16, fontWeight: "900", marginVertical: 6 },
  metricCardSub: { color: "#64748b", fontSize: 10, fontWeight: "600" },
  commandTile: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  tileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  tileInfo: { flex: 1, marginLeft: 12, marginRight: 8 },
  tileTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  tileDescription: { color: "#64748b", fontSize: 11, marginTop: 2, lineHeight: 15 },
});

export default AdminDashboard;