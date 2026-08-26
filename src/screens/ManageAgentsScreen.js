import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  RefreshControl,
  Linking,
} from "react-native";
import {
  MaterialIcons,
  FontAwesome5,
  Ionicons,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ManageAgentsScreen = ({ navigation }) => {
  const [agents, setAgents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Bulk Selection
  const [selectedAgentIds, setSelectedAgentIds] = useState([]);

  // Modal State ga Reassign / Transfer
  const [transferModalVisible, setTransferModalVisible] = useState(false);
  const [transferTargetAgent, setTransferTargetAgent] = useState(null); // null idan bulk ne
  const [selectedSupervisorId, setSelectedSupervisorId] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      };

      const [agentsRes, supsRes] = await Promise.all([
        axios.get(`${BASE_URL}/leader/agents-stream`, config).catch(() => ({ data: { agents: [] } })),
        axios.get(`${BASE_URL}/leader/dashboard`, config).catch(() => ({ data: { data: {} } })),
      ]);

      const fetchedAgents = agentsRes.data?.agents || agentsRes.data?.data || [];
      const dashData = supsRes.data?.data || supsRes.data || {};
      const supList = dashData.supervisors || [];

      setAgents(fetchedAgents);
      setSupervisors(supList);
    } catch (error) {
      if (error.response?.status === 401 && !isBackground) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else if (!isBackground) {
        Alert.alert("Sync Error", "Could not fetch network agents or supervisors.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // 1. BULK SELECTION
  const handleSelectAll = () => {
    if (selectedAgentIds.length === filteredAgents.length) {
      setSelectedAgentIds([]);
    } else {
      setSelectedAgentIds(filteredAgents.map((a) => a._id || a.id));
    }
  };

  const handleToggleSelect = (id) => {
    if (selectedAgentIds.includes(id)) {
      setSelectedAgentIds(selectedAgentIds.filter((item) => item !== id));
    } else {
      setSelectedAgentIds([...selectedAgentIds, id]);
    }
  };

  // 2. REASSIGN ACTION (SINGLE KO BULK)
  const handleExecuteTransfer = async () => {
    if (!selectedSupervisorId) {
      Alert.alert("Notice", "Please select a Field Supervisor to assign.");
      return;
    }

    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const isBulk = !transferTargetAgent && selectedAgentIds.length > 0;
      const targetSup = supervisors.find((s) => (s._id || s.id) === selectedSupervisorId);

      if (isBulk) {
        // Bulk Transfer
        await Promise.all(
          selectedAgentIds.map((agentId) =>
            axios.post(
              `${BASE_URL}/leader/assign-agent`,
              { agentId, supervisorId: selectedSupervisorId },
              config
            )
          )
        );

        Alert.alert(
          "Bulk Reassignment Complete! 🎯",
          `Successfully reassigned ${selectedAgentIds.length} agents to ${targetSup?.name || "Field Supervisor"}.`
        );
        setSelectedAgentIds([]);
      } else if (transferTargetAgent) {
        // Single Transfer
        const agentId = transferTargetAgent._id || transferTargetAgent.id;
        await axios.post(
          `${BASE_URL}/leader/assign-agent`,
          { agentId, supervisorId: selectedSupervisorId },
          config
        );

        Alert.alert(
          "Reassigned Successfully! 🎉",
          `${transferTargetAgent.name || "Agent"} is now assigned to ${targetSup?.name || "Field Supervisor"}.`
        );
      }

      setTransferModalVisible(false);
      setTransferTargetAgent(null);
      setSelectedSupervisorId("");
      fetchData();
    } catch (error) {
      Alert.alert("Transfer Error", error.response?.data?.message || "Failed to reassign agent network.");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredAgents = agents.filter((item) => {
    const q = searchQuery.toLowerCase();
    const name = (item.name || `${item.firstName || ""} ${item.surname || ""}`).toLowerCase();
    const phone = item.phone || item.phoneNumber || "";
    const lga = (item.lga || "").toLowerCase();
    const supName = (item.assignedSupervisorName || item.assignedSupervisor?.name || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || lga.includes(q) || supName.includes(q);
  });

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.loadingText}>Syncing Agent Network Nodes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>NETWORK & AGENTS REASSIGNMENT</Text>
        <TouchableOpacity style={styles.reloadBtn} onPress={() => fetchData()}>
          <Ionicons name="reload" size={18} color="#38bdf8" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentBody}>
        {/* BANNER CARD */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerIconBox}>
            <MaterialCommunityIcons name="account-switch" size={24} color="#1e40af" />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.bannerTitle}>Territory Network Management</Text>
            <Text style={styles.bannerSub}>Assign, migrate, and balance retail agents across LGA Field Supervisors</Text>
          </View>
        </View>

        {/* SEARCH BAR */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color="#64748b" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search agents by name, phone, LGA, or supervisor..."
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

        {/* BULK ACTION RIBBON */}
        <View style={styles.bulkRibbon}>
          <TouchableOpacity style={styles.bulkSelectBtn} onPress={handleSelectAll}>
            <MaterialIcons
              name={
                selectedAgentIds.length === filteredAgents.length && filteredAgents.length > 0
                  ? "check-box"
                  : "check-box-outline-blank"
              }
              size={20}
              color="#1e40af"
            />
            <Text style={styles.bulkSelectBtnText}>
              {selectedAgentIds.length === filteredAgents.length && filteredAgents.length > 0
                ? "Deselect All"
                : `Select All (${selectedAgentIds.length}/${filteredAgents.length})`}
            </Text>
          </TouchableOpacity>

          {selectedAgentIds.length > 0 && (
            <TouchableOpacity
              style={styles.bulkReassignBtn}
              onPress={() => {
                setTransferTargetAgent(null);
                setTransferModalVisible(true);
              }}
            >
              <MaterialIcons name="swap-horiz" size={16} color="#ffffff" />
              <Text style={styles.bulkReassignBtnText}>Reassign ({selectedAgentIds.length})</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* AGENTS LIST */}
        <FlatList
          data={filteredAgents}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1e40af" />}
          renderItem={({ item }) => {
            const agentId = item._id || item.id;
            const agentName = item.name || `${item.firstName || ""} ${item.surname || ""}` || "Retail Agent";
            const isSelected = selectedAgentIds.includes(agentId);
            const supName = item.assignedSupervisorName || item.assignedSupervisor?.name || "Unassigned";

            return (
              <View style={[styles.agentCard, isSelected && styles.agentCardSelected]}>
                <View style={styles.agentCardHeader}>
                  {/* Select Checkbox */}
                  <TouchableOpacity style={{ marginRight: 8 }} onPress={() => handleToggleSelect(agentId)}>
                    <MaterialIcons
                      name={isSelected ? "check-box" : "check-box-outline-blank"}
                      size={20}
                      color={isSelected ? "#1e40af" : "#94a3b8"}
                    />
                  </TouchableOpacity>

                  <View style={styles.agentAvatar}>
                    <FontAwesome5 name="user" size={14} color="#1e40af" />
                  </View>

                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={styles.agentName}>{agentName}</Text>
                    <Text style={styles.agentPhone}>📞 {item.phone || item.phoneNumber || "No contact"}</Text>
                  </View>

                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.floatVal}>
                      ₦{Number(item.walletBalance || item.balance || 0).toLocaleString()}
                    </Text>
                    <Text style={styles.floatSub}>Float Balance</Text>
                  </View>
                </View>

                {/* Supervisor Indicator */}
                <View style={styles.supervisorInfoRow}>
                  <Text style={styles.supLabelText}>
                    Assigned Lead:{" "}
                    <Text style={{ fontWeight: "800", color: supName === "Unassigned" ? "#dc2626" : "#1e40af" }}>
                      {supName}
                    </Text>
                  </Text>
                  <Text style={styles.lgaBadgeText}>📍 {item.lga || "LGA"}</Text>
                </View>

                {/* Action Buttons */}
                <View style={styles.cardActionRow}>
                  <TouchableOpacity
                    style={styles.reassignSingleBtn}
                    onPress={() => {
                      setTransferTargetAgent(item);
                      setTransferModalVisible(true);
                    }}
                  >
                    <MaterialIcons name="swap-horiz" size={16} color="#1e40af" />
                    <Text style={styles.reassignSingleBtnText}>Change Supervisor</Text>
                  </TouchableOpacity>

                  {item.phone && (
                    <TouchableOpacity
                      style={styles.callIconBtn}
                      onPress={() => Linking.openURL(`tel:${item.phone}`)}
                    >
                      <Ionicons name="call" size={14} color="#0284c7" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Ionicons name="people-outline" size={40} color="#94a3b8" />
              <Text style={styles.emptyText}>No agents match your search criteria.</Text>
            </View>
          }
        />
      </View>

      {/* REASSIGNMENT SUPERVISOR SELECTOR MODAL */}
      <Modal visible={transferModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalTitle}>
                  {transferTargetAgent ? "Reassign Agent" : `Bulk Reassign (${selectedAgentIds.length} Agents)`}
                </Text>
                <Text style={styles.modalSubtitle}>
                  {transferTargetAgent
                    ? `Assign new supervisor for ${transferTargetAgent.name}`
                    : `Migrate selected agents to a new supervisor`}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setTransferModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.formFieldLabel}>SELECT NEW FIELD SUPERVISOR</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 300, marginVertical: 8 }}>
              {supervisors.length > 0 ? (
                supervisors.map((sup) => {
                  const supId = sup._id || sup.id;
                  const isPicked = selectedSupervisorId === supId;

                  return (
                    <TouchableOpacity
                      key={supId}
                      style={[styles.supervisorPickItem, isPicked && styles.supervisorPickItemActive]}
                      onPress={() => setSelectedSupervisorId(supId)}
                    >
                      <View style={styles.supAvatarSmall}>
                        <FontAwesome5 name="user-tie" size={13} color="#1e40af" />
                      </View>
                      <View style={{ marginLeft: 10, flex: 1 }}>
                        <Text style={styles.supPickName}>{sup.name || sup.phone}</Text>
                        <Text style={styles.supPickSub}>
                          📍 {sup.lga || "LGA"} • 👥 {sup.teamSize || sup.agentsCount || 0} Agents
                        </Text>
                      </View>
                      {isPicked && <Ionicons name="checkmark-circle" size={20} color="#1e40af" />}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text style={{ textAlign: "center", color: "#64748b", marginVertical: 20 }}>
                  No field supervisors available.
                </Text>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.primaryActionBtn, { opacity: actionLoading ? 0.7 : 1 }]}
              onPress={handleExecuteTransfer}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryActionBtnText}>CONFIRM & MIGRATE NETWORK</Text>
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
  },
  backBtn: { padding: 4 },
  topBarTitle: { color: "#ffffff", fontSize: 13.5, fontWeight: "900", letterSpacing: 0.8 },
  reloadBtn: { padding: 4 },
  contentBody: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  bannerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  bannerTitle: { color: "#1e40af", fontSize: 13.5, fontWeight: "900" },
  bannerSub: { color: "#64748b", fontSize: 10.5, marginTop: 2 },

  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    borderRadius: 10,
    height: 42,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    marginBottom: 10,
  },
  searchInput: { flex: 1, color: "#0f172a", fontSize: 12 },

  bulkRibbon: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bulkSelectBtn: { flexDirection: "row", alignItems: "center" },
  bulkSelectBtnText: { color: "#1e40af", fontSize: 11.5, fontWeight: "800", marginLeft: 6 },
  bulkReassignBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e40af",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bulkReassignBtnText: { color: "#ffffff", fontSize: 10.5, fontWeight: "900", marginLeft: 4 },

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
  agentCardSelected: { borderColor: "#1e40af", backgroundColor: "#f0f7ff" },
  agentCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  agentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  agentName: { color: "#0f172a", fontSize: 13.5, fontWeight: "800" },
  agentPhone: { color: "#64748b", fontSize: 11, marginTop: 1 },
  floatVal: { color: "#059669", fontSize: 13.5, fontWeight: "900" },
  floatSub: { color: "#94a3b8", fontSize: 9.5 },

  supervisorInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    padding: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  supLabelText: { color: "#64748b", fontSize: 11 },
  lgaBadgeText: { color: "#0f172a", fontSize: 11, fontWeight: "700" },

  cardActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 8,
  },
  reassignSingleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  reassignSingleBtnText: { color: "#1e40af", fontSize: 11, fontWeight: "800", marginLeft: 4 },
  callIconBtn: {
    backgroundColor: "#eff6ff",
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  emptyBox: { alignItems: "center", paddingVertical: 40 },
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
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingBottom: 10,
  },
  modalTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  modalSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formFieldLabel: {
    color: "#475569",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 6,
    marginBottom: 4,
  },
  supervisorPickItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
    backgroundColor: "#f8fafc",
  },
  supervisorPickItemActive: { backgroundColor: "#eff6ff", borderColor: "#1e40af" },
  supAvatarSmall: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  supPickName: { color: "#0f172a", fontSize: 13, fontWeight: "800" },
  supPickSub: { color: "#64748b", fontSize: 10.5, marginTop: 1 },
  primaryActionBtn: {
    backgroundColor: "#1e40af",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  primaryActionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900", letterSpacing: 0.6 },
});

export default ManageAgentsScreen;