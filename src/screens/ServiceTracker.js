import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ServiceTracker = ({ navigation }) => {
  const [identifier, setIdentifier] = useState("");
  const [serviceType, setServiceType] = useState("data");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  // Refund Modal State (Madadin Alert.prompt da ke crashing a Android/Web)
  const [refundModalVisible, setRefundModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundLoading, setRefundLoading] = useState(false);

  const showAlert = (title, message) => {
    if (Platform.OS === "web") {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleTrace = async () => {
    const cleanId = identifier.trim();
    if (!cleanId) {
      return showAlert("Required", "Please enter a Phone Number, Reference, or Verification ID");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { 
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000 
      };

      const response = await axios.get(
        `${BASE_URL}/support/trace/${serviceType}/${cleanId}`,
        config
      );

      const data = response.data?.data || response.data?.results || response.data || [];
      const finalResults = Array.isArray(data) ? data : (data._id ? [data] : []);
      
      setResults(finalResults);

      if (finalResults.length === 0) {
        showAlert("Not Found", `No records found for "${cleanId}" in ${serviceType.toUpperCase()} directory.`);
      }
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        setResults([]);
        showAlert("Investigation Notice", err.response?.data?.message || `No records match "${cleanId}" in ${serviceType.toUpperCase()}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const openRefundModal = (item) => {
    setSelectedTransaction(item);
    setRefundReason("");
    setRefundModalVisible(true);
  };

  const submitRefundRequest = async () => {
    if (!refundReason.trim()) {
      return showAlert("Validation Error", "Please provide the justification or failure diagnostic for this refund.");
    }

    setRefundLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };

      const payload = {
        transactionId: selectedTransaction?._id || selectedTransaction?.id,
        reference: selectedTransaction?.reference || selectedTransaction?.transactionId,
        amount: Number(selectedTransaction?.amount || 0),
        reason: refundReason.trim(),
        user: selectedTransaction?.user?._id || selectedTransaction?.user,
        service: serviceType,
      };

      const res = await axios.post(`${BASE_URL}/support/refund`, payload, config).catch(() =>
        axios.post(`${BASE_URL}/support/escalate-refund`, payload, config)
      );

      if (res.data?.success || res.status === 200 || res.status === 201) {
        showAlert("Dispute Dispatched 🚀", "Refund claim has been logged and escalated to SuperAdmin approval queue.");
        setRefundModalVisible(false);
        handleTrace(); // Refresh telemetry
      }
    } catch (err) {
      showAlert("Submission Error", err.response?.data?.message || "Could not complete refund escalation.");
    } finally {
      setRefundLoading(false);
    }
  };

  const renderResultItem = ({ item }) => {
    const isSuccess = item.status === "success" || item.status === "completed";
    const isFailed = item.status === "failed";
    const ref = item.reference || item.transactionId || item.bvnNumber || item.ninNumber || item._id;

    return (
      <View style={styles.resultCard}>
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: isSuccess ? "#dcfce7" : (isFailed ? "#fee2e2" : "#fef3c7") }]}>
            <Text style={[styles.statusBadgeText, { color: isSuccess ? "#16a34a" : (isFailed ? "#dc2626" : "#d97706") }]}>
              {String(item.status || "COMPLETED").toUpperCase()}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleString() : "Real-Time"}
          </Text>
        </View>

        <Text style={styles.amountText}>
          {item.amount ? `₦${Number(item.amount).toLocaleString()}` : `${item.dataAmountGB || item.volume || 0} GB`}
        </Text>

        <View style={styles.detailsBox}>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Ref / ID: </Text>{ref}
          </Text>
          <Text style={styles.detailText}>
            <Text style={styles.detailLabel}>Account / User: </Text>
            {item.user?.name || `${item.user?.firstName || ""} ${item.user?.surname || ""}`.trim() || item.phone || "Customer"}
          </Text>
          {item.recipient && (
            <Text style={styles.detailText}>
              <Text style={styles.detailLabel}>Beneficiary: </Text>{item.recipient}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.refundBtn}
          onPress={() => openRefundModal(item)}
          activeOpacity={0.8}
        >
          <MaterialIcons name="report-problem" size={15} color="#dc2626" />
          <Text style={styles.refundBtnText}>Escalate Refund to SuperAdmin</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation?.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#ffffff" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.title}>Service Investigation</Text>
          <Text style={styles.subtitle}>Trace NIMC, BVN, Data & Utility transactions</Text>
        </View>
      </View>

      {/* SEARCH SECTION */}
      <View style={styles.searchSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {["data", "vtu", "bvn", "nimc", "cable", "utility"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.tab, serviceType === type && styles.activeTab]}
              onPress={() => setServiceType(type)}
            >
              <Text style={[styles.tabText, serviceType === type && styles.activeTabText]}>
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.searchBarRow}>
          <TextInput
            style={styles.input}
            placeholder={`Enter ${serviceType.toUpperCase()} Phone, Ref, or ID...`}
            placeholderTextColor="#94a3b8"
            value={identifier}
            onChangeText={setIdentifier}
          />
          {identifier ? (
            <TouchableOpacity onPress={() => setIdentifier("")} style={styles.clearIcon}>
              <Ionicons name="close-circle" size={18} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity style={styles.searchBtn} onPress={handleTrace} disabled={loading} activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={16} color="#ffffff" style={{ marginRight: 6 }} />
              <Text style={styles.searchBtnText}>Run Deep Diagnostic</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item, index) => item._id || item.id || item.reference || index.toString()}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          !loading && (
            <View style={styles.emptyContainer}>
              <FontAwesome5 name="search-location" size={36} color="#cbd5e1" />
              <Text style={styles.emptyText}>Enter an identifier above to begin investigation.</Text>
            </View>
          )
        }
      />

      {/* UNIVERSAL CROSS-PLATFORM REFUND MODAL */}
      <Modal visible={refundModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Initiate Refund Request</Text>
              <TouchableOpacity onPress={() => setRefundModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSub}>
              Ref: {selectedTransaction?.reference || selectedTransaction?._id}
            </Text>
            <Text style={styles.modalAmount}>
              Amount: ₦{Number(selectedTransaction?.amount || 0).toLocaleString()}
            </Text>

            <Text style={styles.modalFieldLabel}>FAILURE / DISPUTE DIAGNOSTIC</Text>
            <TextInput
              style={styles.modalTextArea}
              placeholder="State reason (e.g., Debited without bundle credit, VTU gateway error)..."
              placeholderTextColor="#94a3b8"
              multiline
              value={refundReason}
              onChangeText={setRefundReason}
            />

            <TouchableOpacity
              style={styles.modalSubmitBtn}
              onPress={submitRefundRequest}
              disabled={refundLoading}
            >
              {refundLoading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Submit to SuperAdmin</Text>
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
  header: {
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: "#0f172a",
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: { padding: 4 },
  title: { fontSize: 16, fontWeight: "900", color: "#ffffff", letterSpacing: 0.3 },
  subtitle: { fontSize: 11, color: "#38bdf8", marginTop: 2 },
  searchSection: {
    padding: 16,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    elevation: 2,
  },
  tabScroll: { marginBottom: 12 },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  activeTab: { backgroundColor: "#0284c7", borderColor: "#0284c7" },
  tabText: { fontSize: 10.5, fontWeight: "800", color: "#64748b" },
  activeTabText: { color: "#ffffff" },
  searchBarRow: { position: "relative", justifyContent: "center" },
  input: {
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 8,
    marginBottom: 10,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
    fontSize: 13,
  },
  clearIcon: { position: "absolute", right: 12, top: 12 },
  searchBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12, letterSpacing: 0.5 },
  listPadding: { padding: 16, paddingBottom: 50 },
  resultCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  dateText: { fontSize: 10.5, color: "#94a3b8" },
  amountText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#0f172a",
    marginBottom: 6,
  },
  detailsBox: {
    backgroundColor: "#f8fafc",
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailText: { fontSize: 11.5, color: "#334155", marginVertical: 1.5 },
  detailLabel: { fontWeight: "bold", color: "#475569" },
  refundBtn: {
    marginTop: 10,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  refundBtnText: { color: "#dc2626", fontWeight: "900", fontSize: 11 },
  emptyContainer: { alignItems: "center", marginTop: 60 },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 12, fontSize: 12 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    padding: 18,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  modalTitle: { fontSize: 15, fontWeight: "900", color: "#0f172a" },
  modalSub: { fontSize: 11, color: "#64748b" },
  modalAmount: { fontSize: 14, fontWeight: "bold", color: "#059669", marginVertical: 4 },
  modalFieldLabel: { fontSize: 10, fontWeight: "900", color: "#0284c7", marginTop: 10, marginBottom: 4 },
  modalTextArea: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 8,
    padding: 10,
    height: 70,
    textAlignVertical: "top",
    fontSize: 12,
    color: "#0f172a",
    marginBottom: 12,
  },
  modalSubmitBtn: {
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalSubmitBtnText: { color: "#ffffff", fontWeight: "900", fontSize: 12 },
});

export default ServiceTracker;