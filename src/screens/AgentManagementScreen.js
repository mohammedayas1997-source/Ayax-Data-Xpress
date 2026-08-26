import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Linking,
  Platform,
  Alert,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const AgentManagementScreen = ({ navigation }) => {
  const [agents, setAgents] = useState([]);
  const [targetStats, setTargetStats] = useState({
    totalRegistered: 0,
    totalDataSold: 0,
    totalAirtimeSold: 0,
    monthlyGoal: 10,
    dataGoal: 500,
    airtimeGoal: 50000,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal 1: Agent Drill-down Inspection
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [inspectModalVisible, setInspectModalVisible] = useState(false);

  // Modal 2: Assign Quota to Agent
  const [targetModalVisible, setTargetModalVisible] = useState(false);
  const [targetAgentItem, setTargetAgentItem] = useState(null);
  const [targetDataGoal, setTargetDataGoal] = useState("100");
  const [targetAirtimeGoal, setTargetAirtimeGoal] = useState("10000");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAgentStats = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem("userToken");

      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      const response = await axios.get(`${BASE_URL}/supervisor/my-agents`, {
        headers,
        timeout: 15000,
      });

      const fetchedAgents = response.data?.agents || response.data?.data || [];
      setAgents(fetchedAgents);

      if (response.data?.stats) {
        setTargetStats(response.data.stats);
      } else {
        const totalData = fetchedAgents.reduce((acc, curr) => acc + Number(curr.dataSold || curr.totalGB || 0), 0);
        const totalAirtime = fetchedAgents.reduce((acc, curr) => acc + Number(curr.airtimeSold || 0), 0);
        setTargetStats((prev) => ({
          ...prev,
          totalRegistered: fetchedAgents.length,
          totalDataSold: totalData,
          totalAirtimeSold: totalAirtime,
        }));
      }
    } catch (err) {
      if (err.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        setError("Failed to load real-time agent performance metrics.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchAgentStats();
    const interval = setInterval(() => {
      fetchAgentStats(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchAgentStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgentStats();
  };

  const handleDeployAgentTarget = async () => {
    if (!targetAgentItem?._id && !targetAgentItem?.id) return;
    setActionLoading(true);

    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/leader/assign-target`,
        {
          mode: "single_agent",
          agentId: targetAgentItem._id || targetAgentItem.id,
          dataGoal: Number(targetDataGoal),
          airtimeGoal: Number(targetAirtimeGoal),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data?.success || res.status === 200) {
        Alert.alert(
          "Quota Updated 🎯",
          `Assigned ${targetDataGoal} GB Data & ₦${Number(targetAirtimeGoal).toLocaleString()} Airtime to ${targetAgentItem.name || targetAgentItem.phone}`
        );
        setTargetModalVisible(false);
        setTargetAgentItem(null);
        fetchAgentStats();
      }
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Could not update agent quota.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAgents = agents.filter((ag) => {
    const q = searchQuery.toLowerCase();
    const name = (ag.fullName || ag.name || `${ag.firstName || ""} ${ag.surname || ""}`).toLowerCase();
    const phone = ag.phone || "";
    return name.includes(q) || phone.includes(q);
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Syncing Live Agent Performance Metrics...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP COMMAND HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>LGA AGENTS MANAGEMENT</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={() => fetchAgentStats()}>
          <Ionicons name="reload" size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentBody}>
        {/* EXECUTIVE PERFORMANCE SUMMARY CARDS */}
        <View style={styles.statsGrid}>
          {/* Card 1: Headcount */}
          <View style={[styles.statCard, { borderLeftColor: "#1e40af" }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.statLabel}>Active Agents</Text>
              <Ionicons name="people" size={14} color="#1e40af" />
            </View>
            <Text style={[styles.statValue, { color: "#1e40af" }]}>
              {targetStats.totalRegistered} / {targetStats.monthlyGoal || 10}
            </Text>
            <Text style={styles.statSub}>Recruited Outlets</Text>
          </View>

          {/* Card 2: Data Sold */}
          <View style={[styles.statCard, { borderLeftColor: "#059669" }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.statLabel}>Data Delivered</Text>
              <Ionicons name="server" size={14} color="#059669" />
            </View>
            <Text style={[styles.statValue, { color: "#059669" }]}>
              {targetStats.totalDataSold} / {targetStats.dataGoal || 500} GB
            </Text>
            <Text style={styles.statSub}>Monthly Quota</Text>
          </View>

          {/* Card 3: Airtime Sold */}
          <View style={[styles.statCard, { borderLeftColor: "#d97706" }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.statLabel}>Airtime Sold</Text>
              <Ionicons name="call" size={14} color="#d97706" />
            </View>
            <Text style={[styles.statValue, { color: "#d97706" }]}>
              ₦{Number(targetStats.totalAirtimeSold || 0).toLocaleString()}
            </Text>
            <Text style={styles.statSub}>VTU Recharge Volume</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agents by name or phone number..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color="#64748b" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            FIELD AGENTS DIRECTORY ({filteredAgents.length})
          </Text>
          <TouchableOpacity
            style={styles.actionPillBtn}
            onPress={() => navigation.navigate("Signup")}
          >
            <Ionicons name="person-add" size={12} color="#ffffff" />
            <Text style={styles.actionPillBtnText}>+ NEW AGENT</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={36} color="#dc2626" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchAgentStats()}>
              <Text style={styles.retryText}>Reload Data</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filteredAgents}
            keyExtractor={(item) => item._id || item.id || Math.random().toString()}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 60 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e40af" />
            }
            renderItem={({ item }) => {
              const agentName = item.fullName || item.name || `${item.firstName || ""} ${item.surname || ""}` || "Retail Agent";
              const dataSold = item.dataSold || item.todaySales || item.totalGB || 0;
              const airtimeSold = item.airtimeSold || 0;

              return (
                <TouchableOpacity
                  style={styles.agentCard}
                  activeOpacity={0.88}
                  onPress={() => {
                    setSelectedAgent(item);
                    setInspectModalVisible(true);
                  }}
                >
                  <View style={styles.agentCardHeader}>
                    <View style={styles.agentInfoLeft}>
                      <View style={[styles.statusDot, { backgroundColor: item.isSuspended ? "#dc2626" : "#059669" }]} />
                      <View>
                        <Text style={styles.agentName}>{agentName}</Text>
                        <Text style={styles.agentPhoneText}>📞 {item.phone || "No phone"}</Text>
                      </View>
                    </View>

                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.agentFloatText}>
                        ₦{Number(item.walletBalance || item.balance || 0).toLocaleString()}
                      </Text>
                      <Text style={styles.agentFloatSub}>Float Balance</Text>
                    </View>
                  </View>

                  {/* Performance Indicators */}
                  <View style={styles.statsSummaryRow}>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Data Delivered</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#1e40af" }]}>{dataSold} GB</Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Airtime Sold</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#d97706" }]}>
                        ₦{Number(airtimeSold).toLocaleString()}
                      </Text>
                    </View>
                    <View style={styles.summaryBox}>
                      <Text style={styles.summaryBoxLabel}>Monthly Quota</Text>
                      <Text style={[styles.summaryBoxValue, { color: "#059669" }]}>
                        {item.targets?.dataGoal || 100} GB
                      </Text>
                    </View>
                  </View>

                  {/* Action Row */}
                  <View style={styles.agentActionRow}>
                    <TouchableOpacity
                      style={styles.agentActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        setTargetAgentItem(item);
                        setTargetDataGoal(String(item.targets?.dataGoal || 100));
                        setTargetAirtimeGoal(String(item.targets?.airtimeGoal || 10000));
                        setTargetModalVisible(true);
                      }}
                    >
                      <FontAwesome5 name="bullseye" size={12} color="#1e40af" />
                      <Text style={[styles.agentActionBtnText, { color: "#1e40af" }]}>Set Quota</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.agentActionBtn}
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(`tel:${item.phone}`);
                      }}
                    >
                      <Ionicons name="call" size={13} color="#0284c7" />
                      <Text style={[styles.agentActionBtnText, { color: "#0284c7" }]}>Call</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.agentActionBtn, styles.inspectPillBtn]}
                      onPress={() => {
                        setSelectedAgent(item);
                        setInspectModalVisible(true);
                      }}
                    >
                      <Feather name="activity" size={12} color="#1e40af" />
                      <Text style={[styles.agentActionBtnText, { color: "#1e40af", fontWeight: "900" }]}>
                        Inspect Details
                      </Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={40} color="#94a3b8" />
                <Text style={styles.emptyText}>No retail agents enrolled in your LGA territory yet.</Text>
              </View>
            }
          />
        )}
      </View>

      {/* MODAL 1: DRILL-DOWN AGENT PERFORMANCE INSPECTION */}
      <Modal visible={inspectModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>{selectedAgent?.fullName || selectedAgent?.name || "AGENT AUDIT"}</Text>
                <Text style={styles.modalCardSubtitle}>Phone: {selectedAgent?.phone} • Role: Grassroot Agent</Text>
              </View>
              <TouchableOpacity onPress={() => setInspectModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inspectSummaryBanner}>
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Wallet Balance</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#059669" }]}>
                    ₦{Number(selectedAgent?.walletBalance || selectedAgent?.balance || 0).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Data Sold</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#1e40af" }]}>
                    {selectedAgent?.dataSold || selectedAgent?.totalGB || 0} GB
                  </Text>
                </View>
                <View style={styles.inspectBannerDivider} />
                <View style={styles.inspectBannerBox}>
                  <Text style={styles.inspectBannerLabel}>Airtime Sold</Text>
                  <Text style={[styles.inspectBannerValue, { color: "#d97706" }]}>
                    ₦{Number(selectedAgent?.airtimeSold || 0).toLocaleString()}
                  </Text>
                </View>
              </View>

              <Text style={styles.formFieldLabel}>DIRECT SUPERVISOR ACTIONS</Text>

              <View style={styles.inspectActionGrid}>
                <TouchableOpacity
                  style={[styles.inspectActionCardBtn, { backgroundColor: "#eff6ff", borderColor: "#bfdbfe" }]}
                  onPress={() => {
                    setInspectModalVisible(false);
                    setTargetAgentItem(selectedAgent);
                    setTargetDataGoal(String(selectedAgent?.targets?.dataGoal || 100));
                    setTargetAirtimeGoal(String(selectedAgent?.targets?.airtimeGoal || 10000));
                    setTargetModalVisible(true);
                  }}
                >
                  <FontAwesome5 name="bullseye" size={15} color="#1e40af" />
                  <Text style={[styles.inspectActionCardBtnText, { color: "#1e40af" }]}>Update Quota Targets</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inspectActionCardBtn, { backgroundColor: "#f0f9ff", borderColor: "#bae6fd" }]}
                  onPress={() => Linking.openURL(`tel:${selectedAgent?.phone}`)}
                >
                  <Ionicons name="call" size={16} color="#0284c7" />
                  <Text style={[styles.inspectActionCardBtnText, { color: "#0284c7" }]}>Direct Phone Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.inspectActionCardBtn, { backgroundColor: "#ecfdf5", borderColor: "#a7f3d0" }]}
                  onPress={() => Linking.openURL(`https://wa.me/234${(selectedAgent?.phone || "").replace(/^0/, "")}`)}
                >
                  <Ionicons name="logo-whatsapp" size={16} color="#059669" />
                  <Text style={[styles.inspectActionCardBtnText, { color: "#059669" }]}>WhatsApp Message</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: ASSIGN QUOTA TARGET GA AGENT */}
      <Modal visible={targetModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalCardTitle}>Deploy Agent Quota Target</Text>
                <Text style={styles.modalCardSubtitle}>Agent: {targetAgentItem?.name} ({targetAgentItem?.phone})</Text>
              </View>
              <TouchableOpacity onPress={() => setTargetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>DATA VOLUME QUOTA (GB GOAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              placeholder="e.g. 100"
              placeholderTextColor="#94a3b8"
              value={targetDataGoal}
              onChangeText={setTargetDataGoal}
            />

            <Text style={styles.formFieldLabel}>AIRTIME SALES QUOTA (₦ NAIRA GOAL)</Text>
            <TextInput
              style={styles.textInputStyle}
              keyboardType="numeric"
              placeholder="e.g. 10000"
              placeholderTextColor="#94a3b8"
              value={targetAirtimeGoal}
              onChangeText={setTargetAirtimeGoal}
            />

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleDeployAgentTarget}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>AUTHORIZE AGENT TARGET</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0f172a" },
  loadingText: { marginTop: 10, color: "#94a3b8", fontSize: 13, fontWeight: "600" },
  topBar: {
    backgroundColor: "#0f172a",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 14,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  backBtn: { padding: 4 },
  topBarTitle: { color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.8 },
  reloadBtn: { padding: 4 },
  contentBody: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  statsGrid: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  statCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    width: "31.5%",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderLeftWidth: 4,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  statLabel: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  statValue: { fontSize: 14, fontWeight: "900", marginVertical: 2 },
  statSub: { color: "#94a3b8", fontSize: 9.5 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 12 },

  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: "900", color: "#475569", letterSpacing: 0.8 },
  actionPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  actionPillBtnText: { color: "#ffffff", fontSize: 10, fontWeight: "900", marginLeft: 4 },

  agentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  agentCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  agentInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  agentName: { fontWeight: "800", color: "#0f172a", fontSize: 14 },
  agentPhoneText: { color: "#64748b", fontSize: 11, marginTop: 2 },
  agentFloatText: { color: "#059669", fontSize: 14, fontWeight: "900" },
  agentFloatSub: { color: "#94a3b8", fontSize: 9.5 },

  statsSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  summaryBox: { flex: 1, alignItems: "center" },
  summaryBoxLabel: { color: "#64748b", fontSize: 9.5, fontWeight: "700" },
  summaryBoxValue: { fontSize: 12.5, fontWeight: "900", marginTop: 2 },

  agentActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
  },
  agentActionBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 4, paddingHorizontal: 6 },
  agentActionBtnText: { fontSize: 11, fontWeight: "700", marginLeft: 4 },
  inspectPillBtn: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  errorContainer: { padding: 30, alignItems: "center", backgroundColor: "#ffffff", borderRadius: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  errorText: { color: "#dc2626", textAlign: "center", marginVertical: 10, fontSize: 12.5, fontWeight: "600" },
  retryBtn: { backgroundColor: "#1e40af", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retryText: { color: "#ffffff", fontWeight: "bold", fontSize: 12 },
  emptyContainer: { alignItems: "center", paddingVertical: 40 },
  emptyText: { color: "#94a3b8", fontSize: 12.5, marginTop: 8, textAlign: "center" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  modalCardTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  modalCardSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  inspectSummaryBanner: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  inspectBannerBox: { flex: 1, alignItems: "center" },
  inspectBannerLabel: { color: "#1e40af", fontSize: 10, fontWeight: "700" },
  inspectBannerValue: { fontSize: 14, fontWeight: "900", marginTop: 2 },
  inspectBannerDivider: { width: 1, height: 30, backgroundColor: "#bfdbfe" },
  formFieldLabel: { color: "#475569", fontSize: 10, fontWeight: "900", letterSpacing: 0.8, marginTop: 10, marginBottom: 6 },
  inspectActionGrid: { marginTop: 4 },
  inspectActionCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  inspectActionCardBtnText: { fontSize: 12, fontWeight: "800", marginLeft: 10 },
  textInputStyle: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "600",
  },
  primaryActionBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 18,
    elevation: 2,
  },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default AgentManagementScreen;