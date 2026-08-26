import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StatusBar,
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

const AssignTargetScreen = ({ navigation, route }) => {
  const [loading, setLoading] = useState(false);
  const [fetchingSupervisors, setFetchingSupervisors] = useState(true);
  const [supervisorsList, setSupervisorsList] = useState([]);
  
  // Param da aka turo idan an danna supervisor daga wani shafin
  const initialSup = route?.params?.supervisor || null;

  const [selectedSupervisor, setSelectedSupervisor] = useState(initialSup);
  const [dataGoal, setDataGoal] = useState(initialSup?.dataGoal ? String(initialSup.dataGoal) : "500");
  const [airtimeGoal, setAirtimeGoal] = useState(initialSup?.airtimeGoal ? String(initialSup.airtimeGoal) : "50000");
  const [agentGoal, setAgentGoal] = useState(initialSup?.agentGoal ? String(initialSup.agentGoal) : "10");
  const [targetMonth, setTargetMonth] = useState("August 2026");

  // Selector Modal
  const [pickerModalVisible, setPickerModalVisible] = useState(false);

  const fetchSupervisors = useCallback(async () => {
    try {
      setFetchingSupervisors(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      const res = await axios.get(`${BASE_URL}/leader/dashboard`, config);
      const sups = res.data?.data?.supervisors || res.data?.supervisors || [];
      
      setSupervisorsList(sups);

      // Idan babu wanda aka zaɓa a farko, sanya na farko a list
      if (!selectedSupervisor && sups.length > 0) {
        setSelectedSupervisor(sups[0]);
        if (sups[0].targets) {
          setDataGoal(String(sups[0].targets.dataGoal || 500));
          setAirtimeGoal(String(sups[0].targets.airtimeGoal || 50000));
          setAgentGoal(String(sups[0].targets.agentGoal || 10));
        }
      }
    } catch (err) {
      console.log("Error fetching supervisors:", err.message);
    } finally {
      setFetchingSupervisors(false);
    }
  }, [navigation, selectedSupervisor]);

  useEffect(() => {
    fetchSupervisors();
  }, [fetchSupervisors]);

  const handleAssign = async () => {
    if (!selectedSupervisor) {
      return Alert.alert("Required", "Da fatan za a zaɓi Field Supervisor.");
    }
    if (!dataGoal || !airtimeGoal || !agentGoal) {
      return Alert.alert("Required", "Da fatan za a cika dukkan ma'aunan target.");
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const payload = {
        mode: "single_sup",
        supervisorId: selectedSupervisor._id || selectedSupervisor.id,
        dataGoal: Number(dataGoal),
        airtimeGoal: Number(airtimeGoal),
        agentGoal: Number(agentGoal),
        month: targetMonth.trim(),
        state: selectedSupervisor.state,
        lga: selectedSupervisor.lga,
      };

      const res = await axios.post(`${BASE_URL}/leader/assign-target`, payload, config);

      if (res.data?.success || res.status === 200) {
        Alert.alert(
          "Target Activated! 🎯",
          `An tura Target zuwa ga ${selectedSupervisor.name || selectedSupervisor.phone} (${selectedSupervisor.lga || "LGA"}):\n\n• Data: ${dataGoal} GB\n• Airtime: ₦${Number(airtimeGoal).toLocaleString()}\n• Agents: ${agentGoal} Headcount\n• Month: ${targetMonth}`,
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || "Kuskure wajen tura bayanan target.";
      Alert.alert("Assignment Error", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* TOP HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>DEPLOY FIELD TARGET</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.bannerCard}>
          <MaterialCommunityIcons name="bullseye-arrow" size={28} color="#1e40af" />
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={styles.bannerTitle}>Field Supervisor Allocation</Text>
            <Text style={styles.bannerSub}>Assign real-time data & airtime performance quotas</Text>
          </View>
        </View>

        <View style={styles.formCard}>
          {/* SUPERVISOR SELECTOR */}
          <Text style={styles.label}>ASSIGNED FIELD SUPERVISOR</Text>
          {fetchingSupervisors ? (
            <ActivityIndicator size="small" color="#1e40af" style={{ marginVertical: 15 }} />
          ) : (
            <TouchableOpacity
              style={styles.selectorBtn}
              onPress={() => setPickerModalVisible(true)}
              activeOpacity={0.8}
            >
              <View style={styles.supAvatar}>
                <FontAwesome5 name="user-tie" size={16} color="#1e40af" />
              </View>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={styles.selectorMainText}>
                  {selectedSupervisor ? (selectedSupervisor.name || selectedSupervisor.phone) : "Select Supervisor"}
                </Text>
                <Text style={styles.selectorSubText}>
                  {selectedSupervisor ? `📍 ${selectedSupervisor.lga || "LGA"} • 📞 ${selectedSupervisor.phone}` : "Tap to pick from list"}
                </Text>
              </View>
              <Feather name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
          )}

          {/* TARGET MONTH */}
          <Text style={styles.label}>TARGET MONTH / CYCLE</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. August 2026"
              placeholderTextColor="#94a3b8"
              value={targetMonth}
              onChangeText={setTargetMonth}
            />
            <Ionicons name="calendar-outline" size={20} color="#1e40af" />
          </View>

          {/* DATA SALES GOAL */}
          <Text style={styles.label}>DATA VOLUME QUOTA (GB)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 500"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={dataGoal}
              onChangeText={setDataGoal}
            />
            <Text style={[styles.unitText, { color: "#1e40af" }]}>GB</Text>
          </View>

          {/* AIRTIME SALES GOAL */}
          <Text style={styles.label}>AIRTIME SALES QUOTA (₦ NAIRA)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 50000"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={airtimeGoal}
              onChangeText={setAirtimeGoal}
            />
            <Text style={[styles.unitText, { color: "#d97706" }]}>₦ NAIRA</Text>
          </View>

          {/* AGENT REGISTRATION GOAL */}
          <Text style={styles.label}>AGENT RECRUITMENT QUOTA (HEADCOUNT)</Text>
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="e.g. 10"
              keyboardType="numeric"
              placeholderTextColor="#94a3b8"
              value={agentGoal}
              onChangeText={setAgentGoal}
            />
            <Text style={[styles.unitText, { color: "#059669" }]}>Agents</Text>
          </View>

          {/* SUBMIT BUTTON */}
          <TouchableOpacity
            style={[styles.assignBtn, { opacity: loading ? 0.7 : 1 }]}
            onPress={handleAssign}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.assignBtnText}>AUTHORIZE & DEPLOY TARGET</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.cancelBtnText}>Discard and Return</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* SUPERVISOR PICKER MODAL */}
      <Modal visible={pickerModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Select Field Supervisor</Text>
              <TouchableOpacity onPress={() => setPickerModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
              {supervisorsList.length > 0 ? (
                supervisorsList.map((sup) => (
                  <TouchableOpacity
                    key={sup._id || sup.id}
                    style={[
                      styles.pickerItem,
                      selectedSupervisor?._id === sup._id && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setSelectedSupervisor(sup);
                      if (sup.targets) {
                        setDataGoal(String(sup.targets.dataGoal || 500));
                        setAirtimeGoal(String(sup.targets.airtimeGoal || 50000));
                        setAgentGoal(String(sup.targets.agentGoal || 10));
                      }
                      setPickerModalVisible(false);
                    }}
                  >
                    <View style={styles.supAvatar}>
                      <FontAwesome5 name="user-tie" size={14} color="#1e40af" />
                    </View>
                    <View style={{ marginLeft: 10, flex: 1 }}>
                      <Text style={styles.pickerItemName}>{sup.name || sup.phone}</Text>
                      <Text style={styles.pickerItemSub}>
                        📍 {sup.lga || "LGA"} • 📞 {sup.phone}
                      </Text>
                    </View>
                    {selectedSupervisor?._id === sup._id && (
                      <Ionicons name="checkmark-circle" size={20} color="#1e40af" />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={{ textAlign: "center", color: "#64748b", marginVertical: 20 }}>
                  No supervisors available.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
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
  topBarTitle: { color: "#ffffff", fontSize: 14, fontWeight: "900", letterSpacing: 0.8 },
  scrollContainer: { padding: 18, paddingBottom: 60 },
  bannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  bannerTitle: { color: "#1e40af", fontSize: 14, fontWeight: "900" },
  bannerSub: { color: "#64748b", fontSize: 11, marginTop: 2 },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "900",
    color: "#475569",
    marginBottom: 6,
    letterSpacing: 0.8,
  },
  selectorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginBottom: 16,
  },
  supAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  selectorMainText: { color: "#0f172a", fontSize: 14, fontWeight: "800" },
  selectorSubText: { color: "#64748b", fontSize: 11, marginTop: 1 },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    marginBottom: 16,
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  unitText: { fontWeight: "900", fontSize: 12 },
  assignBtn: {
    backgroundColor: "#1e40af",
    height: 52,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  assignBtnText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  cancelBtn: { marginTop: 16, alignItems: "center" },
  cancelBtnText: { color: "#dc2626", fontWeight: "700", fontSize: 12.5 },

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
  modalTitle: { color: "#0f172a", fontSize: 15, fontWeight: "900" },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 8,
  },
  pickerItemActive: { backgroundColor: "#eff6ff", borderColor: "#1e40af" },
  pickerItemName: { color: "#0f172a", fontSize: 13.5, fontWeight: "800" },
  pickerItemSub: { color: "#64748b", fontSize: 11, marginTop: 1 },
});

export default AssignTargetScreen;