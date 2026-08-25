import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
  Linking,
} from "react-native";
import {
  Ionicons,
  FontAwesome5,
  Feather,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const { width } = Dimensions.get("window");
const isLargeScreen = width >= 1024;
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const SupervisorDashboard = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState("agents"); // 'agents', 'targets', 'history'

  const [supervisorData, setSupervisorData] = useState({
    name: "Field Supervisor",
    phone: "",
    state: "Kano",
    lga: "Nasarawa",
    referralId: "AX0000",
    agents: [],
    targets: {
      newAgentsCount: 0,
      totalAgentsTarget: 10,
      gbSold: 0,
      gbTarget: 100,
      month: "August 2026",
    },
  });

  // Sidebar Drawer Animation
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarWidth = isLargeScreen ? 320 : Math.min(width * 0.85, 320);
  const sidebarAnim = useRef(new Animated.Value(-sidebarWidth)).current;

  const toggleSidebar = (open) => {
    if (open) {
      setSidebarOpen(true);
      Animated.spring(sidebarAnim, {
        toValue: 0,
        useNativeDriver: false,
        friction: 8,
      }).start();
    } else {
      Animated.timing(sidebarAnim, {
        toValue: -sidebarWidth,
        duration: 220,
        useNativeDriver: false,
      }).start(() => setSidebarOpen(false));
    }
  };

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const fetchSupervisorProfile = async (isManualRefresh = false) => {
    try {
      if (!isManualRefresh) setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      const storedUserData = await AsyncStorage.getItem("userData");

      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      let parsedUser = {};
      if (storedUserData) {
        try {
          parsedUser = JSON.parse(storedUserData);
        } catch (e) {
          parsedUser = {};
        }
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      };

      const response = await axios.get(`${BASE_URL}/supervisor/profile`, config).catch(() => ({ data: {} }));
      const result = response.data;

      if (result.success || result.status === "success" || result.data) {
        const data = result.data || result.supervisor || result;
        const assignedAgents = data.agents || [];
        const tg = data.targets || {};

        setSupervisorData({
          name: data.name || (data.firstName ? `${data.firstName} ${data.surname || ""}` : parsedUser.name || "Field Supervisor"),
          phone: data.phone || parsedUser.phone || "",
          state: data.state || parsedUser.state || "Kano",
          lga: data.lga || parsedUser.lga || "Nasarawa",
          referralId: data.referralId || data.supervisorId || data.code || parsedUser.referralId || "AX0000",
          agents: assignedAgents,
          targets: {
            newAgentsCount: tg.agentGoal ? assignedAgents.length : (data.agentsCount || assignedAgents.length),
            totalAgentsTarget: tg.agentGoal || 10,
            gbSold: tg.gbSold || data.teamPerformance || data.dataSold || 0,
            gbTarget: tg.dataGoal || 500,
            month: tg.currentMonth || tg.month || "August 2026",
          },
        });
      } else if (parsedUser.name) {
        setSupervisorData((prev) => ({
          ...prev,
          name: parsedUser.name,
          phone: parsedUser.phone || "",
          state: parsedUser.state || "Kano",
          lga: parsedUser.lga || "Nasarawa",
          referralId: parsedUser.referralId || "AX0000",
        }));
      }
    } catch (error) {
      if (error.response?.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Supervisor Profile Sync Error:", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchSupervisorProfile();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSupervisorProfile(true);
  };

  const handleLogout = async () => {
    const performLogout = async () => {
      await AsyncStorage.clear();
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    };

    if (Platform.OS === "web") {
      if (window.confirm("Are you sure you want to log out from Field Supervisor Desk?")) {
        performLogout();
      }
    } else {
      Alert.alert("Logout Confirmation", "Terminate active Field Supervisor session?", [
        { text: "Cancel", style: "cancel" },
        { text: "Logout", style: "destructive", onPress: performLogout },
      ]);
    }
  };

  const copyToClipboard = () => {
    showAlert("Referral ID", `Official Code: ${supervisorData.referralId}`);
  };

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#060c18" />
        <ActivityIndicator size="large" color="#d4af37" />
        <Text style={styles.loaderTitle}>FIELD SUPERVISOR ENGINE</Text>
        <Text style={styles.loaderText}>Syncing LGA Agents & Quota Metrics...</Text>
      </View>
    );
  }

  const percentage = Math.min(
    Math.round(((supervisorData.targets.gbSold || 0) / (supervisorData.targets.gbTarget || 1)) * 100),
    100
  );

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="light-content" backgroundColor="#060c18" />

      {/* TOP COMMAND BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.menuIconBtn} onPress={() => toggleSidebar(true)} activeOpacity={0.7}>
          <Feather name="menu" size={24} color="#f8fafc" />
        </TouchableOpacity>

        <View style={styles.topBrandGroup}>
          <View style={styles.stateBadge}>
            <View style={styles.livePulseDot} />
            <Text style={styles.stateBadgeText}>
              {supervisorData.lga.toUpperCase()} LGA • {supervisorData.state.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.topBrandTitle}>FIELD SUPERVISOR (FS)</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            style={[styles.avatarBtn, { marginRight: 8 }]}
            onPress={() => navigation.navigate("Signup")}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={16} color="#d4af37" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.avatarBtn, styles.logoutIconBtn]} onPress={handleLogout} activeOpacity={0.7}>
            <Feather name="log-out" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* TABS SELECTOR */}
      <View style={styles.mainNavBar}>
        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "agents" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("agents")}
        >
          <Ionicons
            name="people"
            size={16}
            color={activeTab === "agents" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "agents" && styles.mainNavTabTextActive]}>
            Agents ({supervisorData.agents.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainNavTab, activeTab === "targets" && styles.mainNavTabActive]}
          onPress={() => setActiveTab("targets")}
        >
          <FontAwesome5
            name="bullseye"
            size={14}
            color={activeTab === "targets" ? "#d4af37" : "#64748b"}
          />
          <Text style={[styles.mainNavTabText, activeTab === "targets" && styles.mainNavTabTextActive]}>
            Quota & Goals
          </Text>
        </TouchableOpacity>
      </View>

      {/* SCROLLABLE MAIN CONTENT */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#d4af37" />
        }
      >
        <View style={styles.contentCenterWrapper}>
          {/* INSTITUTIONAL IDENTIFICATION CARD */}
          <View style={styles.idCard}>
            <View style={styles.idInfo}>
              <Text style={styles.idLabel}>OFFICIAL SUPERVISOR REFERRAL CODE</Text>
              <Text style={styles.idValue}>{supervisorData.referralId}</Text>
              <Text style={styles.idSub}>Share with new agents during onboarding</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={copyToClipboard} activeOpacity={0.8}>
              <Ionicons name="copy-outline" size={16} color="#060c18" />
              <Text style={styles.copyText}>COPY CODE</Text>
            </TouchableOpacity>
          </View>

          {/* TARGET OVERVIEW CARD */}
          <View style={styles.targetCard}>
            <View style={styles.targetCardHeader}>
              <Text style={styles.cardLabel}>{supervisorData.targets.month.toUpperCase()} QUOTA PROGRESS</Text>
              <Text style={styles.targetPercentText}>{percentage}% Completed</Text>
            </View>

            <View style={styles.progressRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>
                  {supervisorData.targets.newAgentsCount} / {supervisorData.targets.totalAgentsTarget}
                </Text>
                <Text style={styles.statSub}>Agents Recruited</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.statBox}>
                <Text style={[styles.statNum, { color: "#10b981" }]}>
                  {supervisorData.targets.gbSold} / {supervisorData.targets.gbTarget} GB
                </Text>
                <Text style={styles.statSub}>Data Volume Sold</Text>
              </View>
            </View>

            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
            </View>
          </View>

          {/* TAB 1: RETAIL AGENTS LIST */}
          {activeTab === "agents" && (
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  LGA FIELD AGENTS ({supervisorData.agents.length})
                </Text>
                <TouchableOpacity onPress={() => fetchSupervisorProfile(true)}>
                  <Ionicons name="reload" size={16} color="#38bdf8" />
                </TouchableOpacity>
              </View>

              {supervisorData.agents.length > 0 ? (
                supervisorData.agents.map((agent, index) => {
                  const agentName =
                    agent.name ||
                    (agent.firstName ? `${agent.firstName} ${agent.surname || ""}` : `Agent #${index + 1}`);
                  const agentPhone = agent.phone || "No phone";
                  const agentSales = agent.todayGB || agent.totalGB || agent.dataSold || "0 GB";

                  return (
                    <View key={agent._id || agent.id || index} style={styles.agentCard}>
                      <View style={styles.agentTopRow}>
                        <View style={styles.agentInfoLeft}>
                          <View
                            style={[
                              styles.statusDot,
                              { backgroundColor: agent.isSuspended ? "#ef4444" : "#22c55e" },
                            ]}
                          />
                          <View>
                            <Text style={styles.agentNameText}>{agentName}</Text>
                            <Text style={styles.agentPhoneText}>📞 {agentPhone}</Text>
                          </View>
                        </View>

                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={styles.gbSoldText}>{agentSales}</Text>
                          <Text style={styles.gbSoldSub}>Volume Sold</Text>
                        </View>
                      </View>

                      <View style={styles.agentBottomRow}>
                        <View style={styles.walletPill}>
                          <Text style={styles.walletPillLabel}>Balance: </Text>
                          <Text style={styles.walletPillValue}>
                            ₦{Number(agent.walletBalance || agent.balance || 0).toLocaleString()}
                          </Text>
                        </View>

                        {agent.phone && (
                          <TouchableOpacity
                            style={styles.agentCallBtn}
                            onPress={() => Linking.openURL(`tel:${agent.phone}`)}
                          >
                            <Ionicons name="call" size={14} color="#38bdf8" />
                            <Text style={styles.agentCallBtnText}>Call Agent</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="people-outline" size={40} color="#475569" />
                  <Text style={styles.emptyTitle}>No Agents Registered Yet</Text>
                  <Text style={styles.emptySubtitle}>
                    Use the button below or share your code {supervisorData.referralId} to onboard retailers.
                  </Text>
                </View>
              )}

              {/* ADD NEW AGENT BUTTON */}
              <TouchableOpacity
                style={styles.addAgentBtn}
                onPress={() => navigation.navigate("Signup")}
                activeOpacity={0.8}
              >
                <Ionicons name="person-add" size={18} color="#060c18" style={{ marginRight: 8 }} />
                <Text style={styles.addAgentText}>REGISTER NEW LGA AGENT</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* TAB 2: QUOTA DETAILS */}
          {activeTab === "targets" && (
            <View style={styles.sectionWrapper}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>OFFICIAL PERFORMANCE METRICS</Text>
              </View>

              <View style={styles.targetMetricGrid}>
                <View style={styles.targetDetailCard}>
                  <Text style={styles.targetDetailLabel}>Assigned Territory</Text>
                  <Text style={styles.targetDetailValue}>
                    {supervisorData.lga} LGA, {supervisorData.state}
                  </Text>
                </View>

                <View style={styles.targetDetailCard}>
                  <Text style={styles.targetDetailLabel}>Monthly Data Quota</Text>
                  <Text style={[styles.targetDetailValue, { color: "#d4af37" }]}>
                    {supervisorData.targets.gbTarget} GB
                  </Text>
                </View>

                <View style={styles.targetDetailCard}>
                  <Text style={styles.targetDetailLabel}>Agent Headcount Goal</Text>
                  <Text style={[styles.targetDetailValue, { color: "#38bdf8" }]}>
                    {supervisorData.targets.totalAgentsTarget} Agents
                  </Text>
                </View>

                <View style={styles.targetDetailCard}>
                  <Text style={styles.targetDetailLabel}>Target Deployment Cycle</Text>
                  <Text style={styles.targetDetailValue}>{supervisorData.targets.month}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FULL SIDEBAR DRAWER */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.sidebarBackdrop}
          activeOpacity={1}
          onPress={() => toggleSidebar(false)}
        >
          <Animated.View
            style={[
              styles.sidebarContainer,
              { width: sidebarWidth, transform: [{ translateX: sidebarAnim }] },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarBrandRow}>
                <MaterialCommunityIcons name="shield-star" size={26} color="#d4af37" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.sidebarBrandText}>Field Supervisor</Text>
                  <Text style={styles.sidebarRoleText}>
                    {supervisorData.lga} LGA Desk
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => toggleSidebar(false)}>
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.sidebarNavList} showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarCategory}>NAVIGATION</Text>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "agents" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("agents");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(212, 175, 55, 0.15)" }]}>
                  <Ionicons name="people" size={16} color="#d4af37" />
                </View>
                <Text style={[styles.navItemText, activeTab === "agents" && { color: "#d4af37" }]}>
                  LGA Agents List
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.navItem, activeTab === "targets" && styles.navItemActive]}
                onPress={() => {
                  toggleSidebar(false);
                  setActiveTab("targets");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(56, 189, 248, 0.15)" }]}>
                  <FontAwesome5 name="bullseye" size={14} color="#38bdf8" />
                </View>
                <Text style={[styles.navItemText, activeTab === "targets" && { color: "#d4af37" }]}>
                  Monthly Quota & Goals
                </Text>
              </TouchableOpacity>

              <Text style={styles.sidebarCategory}>FIELD ACTIONS</Text>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  navigation.navigate("Signup");
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="person-add-outline" size={16} color="#10b981" />
                </View>
                <Text style={styles.navItemText}>Register New Agent</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.navItem}
                onPress={() => {
                  toggleSidebar(false);
                  copyToClipboard();
                }}
              >
                <View style={[styles.navIconBox, { backgroundColor: "rgba(192, 132, 252, 0.15)" }]}>
                  <Ionicons name="copy-outline" size={16} color="#c084fc" />
                </View>
                <Text style={styles.navItemText}>Copy Referral ID</Text>
              </TouchableOpacity>
            </ScrollView>

            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Feather name="log-out" size={18} color="#ef4444" />
              <Text style={styles.logoutBtnText}>Logout Supervisor Session</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#060c18" },
  loaderContainer: {
    flex: 1,
    backgroundColor: "#060c18",
    justifyContent: "center",
    alignItems: "center",
  },
  loaderTitle: {
    color: "#d4af37",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 16,
  },
  loaderText: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 6 },
  topBar: {
    backgroundColor: "#0a1224",
    paddingTop: Platform.OS === "ios" ? 50 : 40,
    paddingBottom: 14,
    paddingHorizontal: isLargeScreen ? 32 : 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  menuIconBtn: { padding: 6 },
  topBrandGroup: { alignItems: "center" },
  stateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginBottom: 3,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#d4af37",
    marginRight: 6,
  },
  stateBadgeText: { color: "#d4af37", fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
  topBrandTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
  avatarBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0f172a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d4af37",
  },
  logoutIconBtn: {
    borderColor: "#ef4444",
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  mainNavBar: {
    flexDirection: "row",
    backgroundColor: "#0a1224",
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    paddingHorizontal: isLargeScreen ? 32 : 12,
  },
  mainNavTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  mainNavTabActive: {
    borderBottomColor: "#d4af37",
  },
  mainNavTabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    marginLeft: 6,
  },
  mainNavTabTextActive: {
    color: "#d4af37",
  },
  scrollArea: { flex: 1, width: "100%" },
  scrollContentContainer: {
    flexGrow: 1,
    alignItems: "center",
    paddingBottom: 60,
  },
  contentCenterWrapper: {
    width: "100%",
    maxWidth: 900,
    padding: isLargeScreen ? 24 : 16,
  },
  idCard: {
    backgroundColor: "#0a1224",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    borderLeftWidth: 4,
    borderLeftColor: "#d4af37",
  },
  idInfo: { flex: 1, marginRight: 10 },
  idLabel: { color: "#94a3b8", fontSize: 9.5, fontWeight: "900", letterSpacing: 0.8 },
  idValue: { color: "#f8fafc", fontSize: 20, fontWeight: "900", marginTop: 2 },
  idSub: { color: "#64748b", fontSize: 10, marginTop: 2 },
  copyBtn: {
    backgroundColor: "#d4af37",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  copyText: { color: "#060c18", fontSize: 10, fontWeight: "900", marginLeft: 4 },

  targetCard: {
    backgroundColor: "#0a1224",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  targetCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  targetPercentText: { color: "#d4af37", fontSize: 11, fontWeight: "900" },
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 14,
  },
  statBox: { alignItems: "center" },
  statNum: { color: "#f8fafc", fontSize: 20, fontWeight: "900" },
  statSub: { color: "#64748b", fontSize: 10.5, fontWeight: "600", marginTop: 2 },
  divider: { width: 1, height: 35, backgroundColor: "#1e293b" },
  progressBarBg: {
    height: 8,
    backgroundColor: "#0f172a",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 8,
    backgroundColor: "#d4af37",
    borderRadius: 4,
  },

  sectionWrapper: { marginTop: 4 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  agentCard: {
    backgroundColor: "#0a1224",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  agentTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agentInfoLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  agentNameText: { fontWeight: "800", color: "#f8fafc", fontSize: 14 },
  agentPhoneText: { color: "#64748b", fontSize: 11, marginTop: 2 },
  gbSoldText: { fontWeight: "900", color: "#10b981", fontSize: 15 },
  gbSoldSub: { color: "#64748b", fontSize: 9.5 },
  agentBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#172033",
    paddingTop: 8,
  },
  walletPill: { flexDirection: "row", alignItems: "center" },
  walletPillLabel: { color: "#64748b", fontSize: 11 },
  walletPillValue: { color: "#38bdf8", fontSize: 12, fontWeight: "900" },
  agentCallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
  },
  agentCallBtnText: { color: "#38bdf8", fontSize: 10.5, fontWeight: "700", marginLeft: 4 },

  emptyCard: {
    backgroundColor: "#0a1224",
    borderRadius: 14,
    padding: 30,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  emptyTitle: { color: "#f8fafc", fontSize: 14, fontWeight: "800", marginTop: 10 },
  emptySubtitle: {
    color: "#64748b",
    fontSize: 11.5,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 18,
  },
  addAgentBtn: {
    backgroundColor: "#d4af37",
    paddingVertical: 14,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  addAgentText: { color: "#060c18", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },

  targetMetricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  targetDetailCard: {
    width: "48.5%",
    backgroundColor: "#0a1224",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  targetDetailLabel: { color: "#64748b", fontSize: 10, fontWeight: "700" },
  targetDetailValue: { color: "#f8fafc", fontSize: 14, fontWeight: "900", marginTop: 4 },

  sidebarBackdrop: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    zIndex: 100,
  },
  sidebarContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "#060c18",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#1e293b",
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  sidebarBrandRow: { flexDirection: "row", alignItems: "center" },
  sidebarBrandText: { color: "#f8fafc", fontSize: 15, fontWeight: "900" },
  sidebarRoleText: { color: "#d4af37", fontSize: 10.5, fontWeight: "700" },
  sidebarNavList: { flex: 1, marginTop: 10 },
  sidebarCategory: {
    color: "#475569",
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 6,
    paddingLeft: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 3,
  },
  navItemActive: { backgroundColor: "rgba(212, 175, 55, 0.1)" },
  navIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  navItemText: { color: "#cbd5e1", fontSize: 12.5, fontWeight: "700", marginLeft: 12 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  logoutBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "800", marginLeft: 10 },
});

export default SupervisorDashboard;