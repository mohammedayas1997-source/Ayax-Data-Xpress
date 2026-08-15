import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";

const NIMCRequests = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const { data } = await axios.get("/api/v1/admin/nimc-requests");
      setRequests(data.data);
    } catch (err) {
      console.log(err);
    }
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await axios.put(`/api/v1/admin/update-nimc/${id}`, { status });
      Alert.alert("Success", `Request marked as ${status}`);
      setModalVisible(false);
      fetchRequests();
    } catch (err) {
      Alert.alert("Error", "Action failed");
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedReq(item);
        setModalVisible(true);
      }}
    >
      <View>
        <Text style={styles.userName}>{item.user?.name || "User"}</Text>
        <Text style={styles.serviceType}>{item.serviceType.toUpperCase()}</Text>
      </View>
      <View style={styles.statusBox}>
        <Text
          style={[
            styles.statusText,
            { color: item.status === "completed" ? "#10b981" : "#f59e0b" },
          ]}
        >
          {item.status}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NIMC Requests</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
      />

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              Details for {selectedReq?.serviceType.toUpperCase()}
            </Text>

            <ScrollView style={{ maxHeight: 400 }}>
              <DetailRow label="NIN Number" value={selectedReq?.ninNumber} />
              {/* Wannan bangaren yana nuna dukkan bayanan da user ya cika dalla-dalla */}
              {selectedReq?.formData &&
                Object.entries(selectedReq.formData).map(([key, value]) => (
                  <DetailRow
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1")}
                    value={value}
                  />
                ))}
            </ScrollView>

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#ef4444" }]}
                onPress={() => handleStatusUpdate(selectedReq._id, "rejected")}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}
                onPress={() =>
                  handleStatusUpdate(selectedReq._id, "processing")
                }
              >
                <Text style={styles.btnText}>Process</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: "#10b981" }]}
                onPress={() => handleStatusUpdate(selectedReq._id, "completed")}
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={{ color: "#64748b", fontWeight: "bold" }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#1e3a8a",
    padding: 25,
    paddingTop: 50,
    flexDirection: "row",
    alignItems: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginLeft: 15,
  },
  requestCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 2,
  },
  userName: { fontWeight: "bold", fontSize: 16, color: "#1e293b" },
  serviceType: { fontSize: 12, color: "#64748b", marginTop: 4 },
  statusBox: { flexDirection: "row", alignItems: "center" },
  statusText: { fontSize: 12, fontWeight: "bold", marginRight: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
  },
  modalHeader: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#1e3a8a",
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 10,
  },
  detailLabel: { color: "#64748b", fontSize: 13, textTransform: "capitalize" },
  detailValue: { fontWeight: "bold", color: "#1e293b" },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  actionBtn: {
    padding: 12,
    borderRadius: 10,
    width: "31%",
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  closeBtn: { marginTop: 20, alignItems: "center" },
});

export default NIMCRequests;
