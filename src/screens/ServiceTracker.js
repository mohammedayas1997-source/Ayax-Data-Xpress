import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ServiceTracker = () => {
  const [identifier, setIdentifier] = useState("");
  const [serviceType, setServiceType] = useState("data"); // Default type
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);

  const handleTrace = async () => {
    if (!identifier)
      return Alert.alert("Required", "Please enter a phone number or ID");

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const BASE_URL = "https://ayax-api.com/api/v1/support"; // Update your URL

      const response = await axios.get(
        `${BASE_URL}/trace/${serviceType}/${identifier}`,
        config,
      );
      setResults(response.data.data);
    } catch (err) {
      setResults([]);
      Alert.alert(
        "Not Found",
        `No records found for ${identifier} in ${serviceType.toUpperCase()}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const initiateRefund = (transactionId) => {
    Alert.prompt(
      "Confirm Refund Request",
      "Enter the reason for this refund:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Submit",
          onPress: async (reason) => {
            try {
              const token = await AsyncStorage.getItem("userToken");
              await axios.post(
                "https://ayax-api.com/api/v1/support/refund",
                { transactionId, reason },
                { headers: { Authorization: `Bearer ${token}` } },
              );
              Alert.alert("Success", "Refund request has been logged.");
            } catch (err) {
              Alert.alert("Error", "Could not process refund.");
            }
          },
        },
      ],
    );
  };

  const renderResultItem = ({ item }) => (
    <View style={styles.resultCard}>
      <View style={styles.cardHeader}>
        <Text style={styles.statusBadge}>{item.status || "Completed"}</Text>
        <Text style={styles.dateText}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.amountText}>
        {item.amount ? `₦${item.amount}` : `${item.dataAmountGB || 0} GB`}
      </Text>

      <Text style={styles.detailText}>
        Ref: {item.reference || item.transactionId}
      </Text>
      <Text style={styles.detailText}>
        User: {item.user?.firstName} {item.user?.surname}
      </Text>

      <TouchableOpacity
        style={styles.refundBtn}
        onPress={() => initiateRefund(item._id)}
      >
        <Text style={styles.refundBtnText}>Initiate Refund</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Service Investigation</Text>
        <Text style={styles.subtitle}>
          Trace NIMC, BVN, Data & Utility transactions
        </Text>
      </View>

      <View style={styles.searchSection}>
        <View style={styles.tabContainer}>
          {["data", "nimc", "bvn", "vtu"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.tab, serviceType === type && styles.activeTab]}
              onPress={() => setServiceType(type)}
            >
              <Text
                style={[
                  styles.tabText,
                  serviceType === type && styles.activeTabText,
                ]}
              >
                {type.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder={`Enter ${serviceType} number or Phone...`}
          value={identifier}
          onChangeText={setIdentifier}
        />

        <TouchableOpacity style={styles.searchBtn} onPress={handleTrace}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.searchBtnText}>Trace Request</Text>
          )}
        </TouchableOpacity>
      </View>

      <FlatList
        data={results}
        renderItem={renderResultItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          !loading && (
            <Text style={styles.emptyText}>
              Enter an identifier to begin investigation.
            </Text>
          )
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f6" },
  header: { padding: 20, backgroundColor: "#1e293b" },
  title: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  subtitle: { fontSize: 12, color: "#94a3b8", marginTop: 4 },
  searchSection: { padding: 20, backgroundColor: "#fff", elevation: 2 },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  tab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
  },
  activeTab: { backgroundColor: "#1e293b" },
  tabText: { fontSize: 10, fontWeight: "bold", color: "#64748b" },
  activeTabText: { color: "#fff" },
  input: {
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  searchBtn: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "bold" },
  listPadding: { padding: 20 },
  resultCard: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#059669",
    textTransform: "uppercase",
  },
  dateText: { fontSize: 11, color: "#94a3b8" },
  amountText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },
  detailText: { fontSize: 12, color: "#64748b", marginTop: 2 },
  refundBtn: {
    marginTop: 15,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#ef4444",
    alignItems: "center",
  },
  refundBtnText: { color: "#ef4444", fontWeight: "bold", fontSize: 12 },
  emptyText: { textAlign: "center", color: "#94a3b8", marginTop: 50 },
});

export default ServiceTracker;
