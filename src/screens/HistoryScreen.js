import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const HistoryScreen = ({ navigation }) => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const response = await axios.get(`${BASE_URL}/vtu/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const result = response.data;
      if (result.success || result.status === "success") {
        setHistory(result.data || result.history || []);
      } else {
        setHistory(result.data || []);
      }
    } catch (error) {
      console.log("History Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.type}>
          {item.type ? item.type.toUpperCase() : "TRANSACTION"}
        </Text>
        <Text
          style={[
            styles.status,
            {
              color:
                item.status === "success" || item.status === "successful"
                  ? "#16a34a"
                  : item.status === "pending"
                  ? "#ca8a04"
                  : "#dc2626",
            },
          ]}
        >
          {item.status || "Completed"}
        </Text>
      </View>
      <Text style={styles.detail}>
        {item.phoneNumber || item.reference || item.description || "N/A"}
      </Text>
      <View style={styles.row}>
        <Text style={styles.date}>
          {item.createdAt
            ? new Date(item.createdAt).toLocaleString()
            : "Recent"}
        </Text>
        <Text style={styles.amount}>
          ₦{item.amount ? Number(item.amount).toLocaleString() : "0"}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>Transaction History</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={history}
        keyExtractor={(item, index) => item._id || item.id || index.toString()}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={60} color="#94a3b8" />
            <Text style={styles.empty}>No transaction history found.</Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1e3a8a" },
  backBtn: { padding: 5 },
  card: {
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
    alignItems: "center",
  },
  type: { fontWeight: "bold", fontSize: 15, color: "#1e293b" },
  status: { fontWeight: "bold", fontSize: 12, textTransform: "capitalize" },
  detail: { color: "#64748b", fontSize: 14, marginBottom: 10 },
  date: { color: "#94a3b8", fontSize: 12 },
  amount: { fontWeight: "900", fontSize: 16, color: "#1e3a8a" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 100,
  },
  empty: { textAlign: "center", marginTop: 15, color: "#64748b", fontSize: 15, fontWeight: "600" },
});

export default HistoryScreen;