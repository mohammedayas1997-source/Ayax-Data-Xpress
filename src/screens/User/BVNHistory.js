import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Alert,
} from "react-native";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NIMCHistory = ({ navigation }) => {
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyHistory = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const { data } = await axios.get(`${BASE_URL}/nimc/my-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setMyRequests(data.data || data.requests || []);
    } catch (err) {
      console.log("Error fetching history", err);
      Alert.alert("Error", err.response?.data?.message || "Could not fetch history");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyHistory();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyHistory();
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "pending":
        return "#64748b"; // Grey
      case "processing":
        return "#f59e0b"; // Orange
      case "completed":
        return "#10b981"; // Green
      case "rejected":
        return "#ef4444"; // Red
      default:
        return "#94a3b8";
    }
  };

  const downloadFile = (url) => {
    if (url) {
      Linking.openURL(url).catch((err) =>
        Alert.alert("Error", "Couldn't open download link."),
      );
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.historyCard}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.serviceType}>
            {item.serviceType?.toUpperCase()}
          </Text>
          <Text style={styles.dateText}>
            {item.createdAt
              ? new Date(item.createdAt).toDateString()
              : "Date N/A"}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={item.status === "completed" ? "check-circle" : "clock-outline"}
          size={24}
          color={getStatusColor(item.status)}
        />
      </View>

      <View
        style={[
          styles.statusTag,
          { backgroundColor: getStatusColor(item.status) },
        ]}
      >
        <Text style={styles.statusText}>
          {item.status === "processing"
            ? "🕒 PROCESSING..."
            : item.status?.toUpperCase()}
        </Text>
      </View>

      {item.status === "completed" && item.slipUrl && (
        <TouchableOpacity
          style={styles.downloadBtn}
          onPress={() => downloadFile(item.slipUrl)}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons name="file-download" size={20} color="#fff" />
          <Text style={styles.downloadText}>Download Result Slip</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

      {/* Custom Header */}
      <View style={styles.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Application History</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#0a1d37" />
          <Text style={{ marginTop: 10, color: "#64748b", fontWeight: "600" }}>
            Loading history...
          </Text>
        </View>
      ) : (
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item._id || Math.random().toString()}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 20 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0a1d37" />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="folder-open-outline"
                size={80}
                color="#cbd5e1"
              />
              <Text style={styles.emptyText}>
                Baka da wani aiki a halin yanzu.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  headerContainer: {
    backgroundColor: "#0f172a",
    paddingTop: 45,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  historyCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  serviceType: { fontSize: 15, fontWeight: "800", color: "#1e293b" },
  dateText: { fontSize: 12, color: "#94a3b8", marginTop: 2 },
  statusTag: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  downloadBtn: {
    backgroundColor: "#0a1d37",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 14,
    borderRadius: 12,
    marginTop: 5,
  },
  downloadText: {
    color: "#fff",
    marginLeft: 8,
    fontWeight: "bold",
    fontSize: 14,
  },
  emptyState: { flex: 1, alignItems: "center", marginTop: 100 },
  emptyText: { color: "#94a3b8", marginTop: 15, fontSize: 16, fontWeight: "600" },
});

export default NIMCHistory;