import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      const res = await axios.get(`${BASE_URL}/notifications`, config);
      setNotifications(res.data.notifications || res.data.data || res.data || []);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Fetch Notifications Error:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8fafc" }}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );

  return (
    <View style={styles.container}>
      {/* Close Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close-circle" size={32} color="#64748b" />
        </TouchableOpacity>
      </View>

      {notifications.length === 0 ? (
        <Text style={styles.emptyText}>No notifications yet.</Text>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id || item.id || Math.random().toString()}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.title}>{item.title || "Notification"}</Text>
              <Text style={styles.message}>{item.message || item.body}</Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingTop: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 22, fontWeight: "bold", color: "#0f172a" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    elevation: 2,
  },
  title: { fontWeight: "bold", fontSize: 16, marginBottom: 5, color: "#0f172a" },
  message: { color: "#475569", fontSize: 13 },
  emptyText: { textAlign: "center", marginTop: 50, color: "#64748b", fontSize: 14 },
});

export default NotificationScreen;