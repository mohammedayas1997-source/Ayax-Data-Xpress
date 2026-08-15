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
  ActivityIndicator,
  StatusBar,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NIMCRequests = ({ navigation }) => {
  const [requests, setRequests] = useState([]);
  const [selectedReq, setSelectedReq] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const { data } = await axios.get(`${BASE_URL}/admin/nimc-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setRequests(data.data || data.requests || []);
    } catch (err) {
      console.log("Error fetching admin requests:", err);
      Alert.alert("Error", err.response?.data?.message || "Could not fetch requests.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequests();
  };

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      await axios.put(
        `${BASE_URL}/admin/update-nimc/${id}`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      Alert.alert("Success", `Request marked as ${status}`);
      setModalVisible(false);
      fetchRequests();
    } catch (err) {
      Alert.alert("Error", err.response?.data?.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#64748b";
      case "processing":
        return "#f59e0b";
      case "completed":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#94a3b8";
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.requestCard}
      onPress={() => {
        setSelectedReq(item);
        setModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.userName}>{item.user?.name || item.userName || "User"}</Text>
        <Text style={styles.serviceType}>
          {item.serviceType ? item.serviceType.replace("_", " ").toUpperCase() : "NIMC SERVICE"}
        </Text>
        <Text style={styles.dateText}>
          {item.createdAt ? new Date(item.createdAt).toDateString() : ""}
        </Text>
      </View>
      <View style={styles.statusBox}>
        <Text
          style={[
            styles.statusText,
            { color: getStatusColor(item.status) },
          ]}
        >
          {item.status?.toUpperCase()}
        </Text>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NIMC Requests Management</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0a1d37" />
          <Text style={{ marginTop: 10, color: "#64748b", fontWeight: "600" }}>
            Loading requests...
          </Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a1d37" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="folder-open-outline" size={80} color="#cbd5e1" />
              <Text style={styles.emptyText}>Babu wani request a halin yanzu.</Text>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalHeader}>
              {selectedReq?.serviceType ? selectedReq.serviceType.replace("_", " ").toUpperCase() : "DETAILS"}
            </Text>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              <DetailRow label="User Name" value={selectedReq?.user?.name || selectedReq?.userName || "N/A"} />
              <DetailRow label="User Email" value={selectedReq?.user?.email || selectedReq?.email || "N/A"} />
              <DetailRow label="NIN Number" value={selectedReq?.ninNumber || selectedReq?.formData?.ninNumber || "N/A"} />
              <DetailRow label="Status" value={selectedReq?.status?.toUpperCase()} />
              
              {/* Wannan bangaren yana nuna dukkan bayanan da user ya cika dalla-dalla */}
              {selectedReq?.formData &&
                Object.entries(selectedReq.formData).map(([key, value]) => (
                  <DetailRow
                    key={key}
                    label={key.replace(/([A-Z])/g, " $1")}
                    value={String(value)}
                  />
                ))}
            </ScrollView>

            {actionLoading ? (
              <View style={{ marginVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#0a1d37" />
                <Text style={{ fontSize: 12, color: "#64748b", marginTop: 5 }}>Processing action...</Text>
              </View>
            ) : (
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#ef4444" }]}
                  onPress={() => handleStatusUpdate(selectedReq._id, "rejected")}
                >
                  <Text style={styles.btnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}
                  onPress={() => handleStatusUpdate(selectedReq._id, "processing")}
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
            )}

            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
              disabled={actionLoading}
            >
              <Text style={{ color: "#64748b", fontWeight: "bold", fontSize: 15 }}>
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
    <Text style={styles.detailValue}>{value || "N/A"}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0f172a",
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "bold",
  },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  requestCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 15,
    marginBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userName: { fontWeight: "bold", fontSize: 15, color: "#1e293b" },
  serviceType: { fontSize: 12, color: "#64748b", marginTop: 3, fontWeight: "700" },
  dateText: { fontSize: 11, color: "#94a3b8", marginTop: 2 },
  statusBox: { flexDirection: "row", alignItems: "center" },
  statusText: { fontSize: 11, fontWeight: "900", marginRight: 5 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 25,
    maxHeight: "85%",
  },
  modalHeader: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0a1d37",
    textAlign: "center",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 8,
  },
  detailLabel: { color: "#64748b", fontSize: 13, textTransform: "capitalize", flex: 1 },
  detailValue: { fontWeight: "bold", color: "#1e293b", fontSize: 13, flex: 1, textAlign: "right" },
  btnRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  actionBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    width: "31%",
    alignItems: "center",
    elevation: 2,
  },
  btnText: { color: "#fff", fontWeight: "bold", fontSize: 12 },
  closeBtn: { marginTop: 15, alignItems: "center", paddingVertical: 10 },
  emptyState: { flex: 1, alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94a3b8", marginTop: 15, fontSize: 16, fontWeight: "600" },
});

export default NIMCRequests;