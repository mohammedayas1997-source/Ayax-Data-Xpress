import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HistoryScreen = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(
        "https://ayax-api-v2.vercel.app/api/v1/vtu/history",
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setHistory(response.data.data);
    } catch (error) {
      console.log("History Error:", error);
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
        <Text style={styles.type}>{item.type.toUpperCase()}</Text>
        <Text
          style={[
            styles.status,
            { color: item.status === "success" ? "#2ecc71" : "#e74c3c" },
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.detail}>{item.phoneNumber || item.reference}</Text>
      <View style={styles.row}>
        <Text style={styles.date}>
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
        <Text style={styles.amount}>₦{item.amount}</Text>
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
      <FlatList
        data={history}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No transaction history found.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 15 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  type: { fontWeight: "bold", fontSize: 16, color: "#1e293b" },
  status: { fontWeight: "bold", fontSize: 12, textTransform: "capitalize" },
  detail: { color: "#64748b", fontSize: 14, marginBottom: 10 },
  date: { color: "#94a3b8", fontSize: 12 },
  amount: { fontWeight: "bold", fontSize: 16, color: "#1e3a8a" },
  empty: { textAlign: "center", marginTop: 50, color: "#64748b" },
});

export default HistoryScreen;
