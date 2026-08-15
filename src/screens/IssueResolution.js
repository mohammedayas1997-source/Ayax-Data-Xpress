import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { trackTx, getAllReports, resolveIssue } from "../api/adminApi";

const IssueResolution = () => {
  const [searchId, setSearchId] = useState("");
  const [foundData, setFoundData] = useState(null);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load all reports on component mount
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const res = await getAllReports();
      setReports(res.data.requests);
    } catch (err) {
      console.error("Fetch Error:", err);
    }
  };

  const handleSearch = async () => {
    if (!searchId)
      return Alert.alert("Input Required", "Please enter a Transaction ID.");

    setLoading(true);
    try {
      const res = await trackTx(searchId);
      setFoundData(res.data);
    } catch (err) {
      setFoundData(null);
      Alert.alert("Not Found", "This ID does not exist in the system records.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (id, action) => {
    try {
      await resolveIssue({
        requestId: id,
        action: action,
        adminNote: "Resolved via Administrative Portal",
      });
      Alert.alert("Success", `Ticket has been ${action}ed successfully.`);
      loadReports(); // Refresh the list after action
    } catch (err) {
      Alert.alert(
        "Operation Failed",
        "Could not complete the request. Please try again.",
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Issue Resolution Center</Text>

      {/* Transaction Tracker Section */}
      <View style={styles.card}>
        <Text style={styles.inputLabel}>Track Transaction</Text>
        <TextInput
          placeholder="Enter Transaction ID or Reference..."
          placeholderTextColor="#94a3b8"
          style={styles.input}
          value={searchId}
          onChangeText={setSearchId}
        />
        <TouchableOpacity
          style={styles.btnSearch}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>INVESTIGATE ID</Text>
          )}
        </TouchableOpacity>
      </View>

      {foundData && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>Search Result Details:</Text>
          <View style={styles.resultRow}>
            <Text style={styles.label}>User Name:</Text>
            <Text style={styles.value}>{foundData.userData.name}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.label}>Amount:</Text>
            <Text style={styles.value}>₦{foundData.transaction.amount}</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.label}>Status:</Text>
            <Text style={[styles.value, { color: "#2563eb" }]}>
              {foundData.transaction.status}
            </Text>
          </View>
        </View>
      )}

      {/* Pending Support Tickets */}
      <Text style={styles.subTitle}>Pending Support Reports</Text>

      {reports.length === 0 ? (
        <Text style={styles.emptyText}>No active support requests found.</Text>
      ) : (
        reports.map((item) => (
          <View key={item._id} style={styles.reportCard}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportId}>TX ID: {item.transactionId}</Text>
              <Text style={styles.timestamp}>
                {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </View>

            <Text style={styles.reasonTitle}>Reason for Dispute:</Text>
            <Text style={styles.reasonText}>{item.reason}</Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.btnApprove}
                onPress={() => handleAction(item._id, "resolve")}
              >
                <Text style={styles.btnText}>APPROVE REFUND</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnReject}
                onPress={() => handleAction(item._id, "reject")}
              >
                <Text style={styles.btnText}>REJECT</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0f172a",
    marginBottom: 20,
    marginTop: 10,
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    color: "#0f172a",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  btnSearch: {
    backgroundColor: "#1e3a8a",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  resultCard: {
    backgroundColor: "#eff6ff",
    padding: 15,
    marginTop: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e40af",
    marginBottom: 10,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  label: { color: "#64748b", fontSize: 13 },
  value: { color: "#1e293b", fontWeight: "bold", fontSize: 13 },
  reportCard: {
    backgroundColor: "#fff",
    padding: 18,
    marginTop: 15,
    borderRadius: 15,
    borderLeftWidth: 6,
    borderLeftColor: "#f59e0b",
    elevation: 2,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  reportId: { fontSize: 12, fontWeight: "bold", color: "#475569" },
  timestamp: { fontSize: 11, color: "#94a3b8" },
  reasonTitle: { fontSize: 12, fontWeight: "700", color: "#1e293b" },
  reasonText: {
    fontSize: 13,
    color: "#64748b",
    marginTop: 4,
    fontStyle: "italic",
  },
  btnApprove: {
    backgroundColor: "#059669",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
    alignItems: "center",
  },
  btnReject: {
    backgroundColor: "#dc2626",
    padding: 12,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  row: { flexDirection: "row", marginTop: 20 },
  subTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#334155",
    marginTop: 30,
    marginBottom: 10,
  },
  emptyText: {
    textAlign: "center",
    color: "#94a3b8",
    marginTop: 20,
    fontSize: 14,
  },
});

export default IssueResolution;
