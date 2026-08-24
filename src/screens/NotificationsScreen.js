import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  StatusBar,
  Platform,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NotificationScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground && navigation) {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      const res = await axios.get(`${BASE_URL}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const dataList =
        res.data.notifications ||
        res.data.data ||
        res.data.messages ||
        (Array.isArray(res.data) ? res.data : []);

      setNotifications(dataList);
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Fetch Notifications Error:", err.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  const getNotificationVisuals = (item) => {
    const rawCategory = String(item.category || item.type || "").toUpperCase();
    const rawTitle = String(item.title || "").toUpperCase();
    const rawMsg = String(item.message || item.body || "").toUpperCase();

    // 1. Account Creation & Virtual Account Assignment
    if (
      rawCategory.includes("ACCOUNT") ||
      rawCategory.includes("WELCOME") ||
      rawTitle.includes("WELCOME") ||
      rawTitle.includes("ACCOUNT CREATED") ||
      rawTitle.includes("VIRTUAL ACCOUNT")
    ) {
      return {
        icon: "sparkles",
        color: "#0284c7",
        bg: "rgba(2, 132, 199, 0.14)",
        typeLabel: "Account Setup",
      };
    }

    // 2. Wallet Funding & Deposits
    if (
      rawCategory.includes("CREDIT") ||
      rawCategory.includes("FUND") ||
      rawCategory.includes("DEPOSIT") ||
      rawTitle.includes("WALLET FUNDED") ||
      rawTitle.includes("CREDIT ALERT") ||
      rawMsg.includes("CREDITED")
    ) {
      return {
        icon: "arrow-down-circle",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.14)",
        typeLabel: "Wallet Credit",
      };
    }

    // 3. Automated Refunds
    if (
      rawCategory.includes("REFUND") ||
      rawTitle.includes("REFUND") ||
      rawMsg.includes("REFUND") ||
      rawMsg.includes("REVERSED")
    ) {
      return {
        icon: "refresh-circle",
        color: "#f59e0b",
        bg: "rgba(245, 158, 11, 0.14)",
        typeLabel: "Refund Reversal",
      };
    }

    // 4. Admin Broadcast & Customer Service Direct Messages
    if (
      rawCategory.includes("BROADCAST") ||
      rawCategory.includes("ADMIN") ||
      rawCategory.includes("SUPPORT") ||
      rawTitle.includes("ADMIN") ||
      rawTitle.includes("SUPPORT") ||
      rawTitle.includes("ANNOUNCEMENT")
    ) {
      return {
        icon: "megaphone",
        color: "#ec4899",
        bg: "rgba(236, 72, 153, 0.14)",
        typeLabel: "Customer Support",
      };
    }

    // 5. Default General Notifications
    return {
      icon: "notifications",
      color: "#64748b",
      bg: "rgba(100, 116, 139, 0.14)",
      typeLabel: "System Alert",
    };
  };

  const renderItem = ({ item }) => {
    const meta = getNotificationVisuals(item);
    const dateFormatted = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Just now";

    return (
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDarkMode ? "#0b1120" : "#ffffff",
            borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
          },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <Ionicons name={meta.icon} size={18} color={meta.color} />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <View style={styles.topRow}>
              <Text
                style={[
                  styles.title,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
                numberOfLines={1}
              >
                {item.title || meta.typeLabel}
              </Text>
              <View style={[styles.badgePill, { backgroundColor: meta.bg }]}>
                <Text style={[styles.badgeText, { color: meta.color }]}>
                  {meta.typeLabel}
                </Text>
              </View>
            </View>
            <Text style={styles.timeText}>{dateFormatted}</Text>
          </View>
        </View>

        <Text
          style={[
            styles.message,
            { color: isDarkMode ? "#94a3b8" : "#475569" },
          ]}
        >
          {item.message || item.body || "No details provided."}
        </Text>
      </View>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDarkMode ? "#050811" : "#f8fafc" },
      ]}
    >
      <StatusBar
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        backgroundColor={isDarkMode ? "#050811" : "#f8fafc"}
      />

      <View style={styles.header}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text
            style={[
              styles.headerTitle,
              { color: isDarkMode ? "#f8fafc" : "#0f172a" },
            ]}
          >
            Notifications
          </Text>
          {notifications.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{notifications.length}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons
            name="close"
            size={22}
            color={isDarkMode ? "#94a3b8" : "#64748b"}
          />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text
            style={[
              styles.loadingText,
              { color: isDarkMode ? "#94a3b8" : "#64748b" },
            ]}
          >
            Syncing notifications...
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item, index) =>
            item._id || item.id || item.reference || index.toString()
          }
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#0284c7"]}
              tintColor={isDarkMode ? "#00f0ff" : "#0284c7"}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View
                style={[
                  styles.emptyIconCircle,
                  { backgroundColor: isDarkMode ? "#0b1120" : "#ffffff" },
                ]}
              >
                <MaterialCommunityIcons
                  name="bell-badge-outline"
                  size={46}
                  color="#64748b"
                />
              </View>
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
              >
                No Notifications Yet
              </Text>
              <Text style={styles.emptySub}>
                Updates on wallet deposits, account activations, refunds, and support broadcasts will show up here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 38,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", letterSpacing: -0.3 },
  countBadge: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countBadgeText: { color: "#ffffff", fontSize: 11, fontWeight: "900" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(100, 116, 139, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 12, fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 13.5, fontWeight: "800", flex: 1, paddingRight: 6 },
  badgePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: { fontSize: 9.5, fontWeight: "900", letterSpacing: 0.3 },
  timeText: { fontSize: 10.5, color: "#64748b", marginTop: 2, fontWeight: "500" },
  message: { fontSize: 12, lineHeight: 18, fontWeight: "500", marginTop: 2 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 90,
    paddingHorizontal: 24,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(100, 116, 139, 0.2)",
    marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    fontWeight: "500",
  },
});

export default NotificationScreen;