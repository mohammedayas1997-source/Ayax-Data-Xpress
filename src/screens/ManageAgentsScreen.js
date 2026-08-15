import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ManageAgentsScreen = ({ navigation }) => {
  const [agents, setAgents] = useState([]);
  const [supervisors, setSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSupervisor, setSelectedSupervisor] = useState({});

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const [agentsRes, supsRes] = await Promise.all([
        axios.get(`${BASE_URL}/leader/all-agents`, config),
        axios.get(`${BASE_URL}/leader/dashboard`, config),
      ]);

      setAgents(agentsRes.data.agents || agentsRes.data.data || []);
      const supList = supsRes.data.supervisors || supsRes.data.data?.supervisors || [];
      setSupervisors(supList);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Fetch Agents Error:", error);
        Alert.alert("Error", "Could not fetch agents or supervisors");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (agentId, supervisorId) => {
    if (!supervisorId) {
      Alert.alert("Notice", "Please select a supervisor first");
      return;
    }

    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const response = await axios.post(
        `${BASE_URL}/leader/assign-agent`,
        {
          agentId,
          supervisorId,
        },
        config
      );

      if (response.data.success || response.data) {
        Alert.alert("Success", "Agent reassigned successfully");
        fetchData(); // Refresh list
      }
    } catch (error) {
      Alert.alert("Error", "Failed to reassign agent");
    }
  };

  const renderAgent = ({ item }) => {
    const agentId = item._id || item.id;
    return (
      <View style={styles.agentCard}>
        <View style={styles.agentHeader}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <FontAwesome5 name="user-alt" size={20} color="#1e3a8a" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.agentName}>
                {item.name || `${item.firstName || ""} ${item.surname || ""}`}
              </Text>
              <Text style={styles.agentPhone}>{item.phone || item.phoneNumber}</Text>
            </View>
          </View>
          <MaterialIcons
            name="verified"
            size={20}
            color={item.assignedSupervisor ? "#22c55e" : "#94a3b8"}
          />
        </View>

        <Text style={styles.currentSup}>
          Current Supervisor:{" "}
          <Text style={{ fontWeight: "bold", color: "#d4af37" }}>
            {item.assignedSupervisor?.name || item.assignedSupervisor?.firstName || "Unassigned"}
          </Text>
        </Text>

        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedSupervisor[agentId]}
            onValueChange={(value) =>
              setSelectedSupervisor({ ...selectedSupervisor, [agentId]: value })
            }
            style={styles.picker}
          >
            <Picker.Item label="Select New Supervisor..." value="" />
            {supervisors.map((sup) => (
              <Picker.Item
                key={sup.id || sup._id}
                label={sup.name || `${sup.firstName || ""} ${sup.surname || ""}`}
                value={sup.id || sup._id}
              />
            ))}
          </Picker>

          <TouchableOpacity
            style={styles.transferBtn}
            onPress={() => handleAssign(agentId, selectedSupervisor[agentId])}
          >
            <MaterialIcons name="swap-horiz" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f1f5f9" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.headerInfo}>
        <Text style={styles.headerTitle}>Network Management</Text>
        <Text style={styles.headerSubtitle}>
          Assign or Transfer agents between supervisors
        </Text>
      </View>

      <FlatList
        data={agents}
        keyExtractor={(item) => item._id || item.id || Math.random().toString()}
        renderItem={renderAgent}
        contentContainerStyle={{ padding: 15 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  headerInfo: {
    backgroundColor: "#0f172a",
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: { color: "white", fontSize: 20, fontWeight: "bold" },
  headerSubtitle: { color: "#38bdf8", fontSize: 13, marginTop: 5 },
  agentCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
  },
  agentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  agentName: { fontSize: 16, fontWeight: "bold", color: "#1e293b" },
  agentPhone: { fontSize: 12, color: "#64748b" },
  currentSup: { fontSize: 13, marginTop: 10, color: "#475569" },
  pickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 15,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  picker: { flex: 1, height: 50 },
  transferBtn: {
    backgroundColor: "#1e3a8a",
    padding: 12,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
  },
});

export default ManageAgentsScreen;