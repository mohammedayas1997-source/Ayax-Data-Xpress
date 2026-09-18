import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
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
  AppState,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NotificationScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pollingTimerRef = useRef(null);

  /**
   * Tattaro duk sanarwa (Live Aggregator)
   * Yana hado kiran /notifications, /user/profile da Transactions
   */
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

      const headers = {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      };

      // Kiran APIs daban-daban a lokaci guda don tabbatar da babu sanarwar da ta salwanta
      const [notifRes, profileRes] = await Promise.allSettled([
        axios.get(`${BASE_URL}/notifications`, { headers, timeout: 15000 }),
        axios.get(`${BASE_URL}/user/profile`, { headers, timeout: 15000 }),
      ]);

      let combinedNotifications = [];

      // 1. Sanarwa daga ainihin /notifications endpoint
      if (notifRes.status === "fulfilled" && notifRes.value?.data) {
        const d = notifRes.value.data;
        const list =
          d.notifications ||
          d.data ||
          d.messages ||
          (Array.isArray(d) ? d : []);
        if (Array.isArray(list)) {
          combinedNotifications.push(...list);
        }
      }

      // 2. Sanarwa da aka ajiye a cikin User Profile (user.notifications)
      if (profileRes.status === "fulfilled" && profileRes.value?.data) {
        const u = profileRes.value.data.user || profileRes.value.data.data || {};
        if (Array.isArray(u.notifications) && u.notifications.length > 0) {
          combinedNotifications.push(...u.notifications);
        }
      }

      // 3. Cire duplicates dangane da ID ko title + message + date
      const seenIds = new Set();
      const uniqueList = [];

      for (const item of combinedNotifications) {
        const key =
          item._id ||
          item.id ||
          `${item.title}_${item.message || item.body}_${item.createdAt || item.date}`;

        if (!seenIds.has(key)) {
          seenIds.add(key);
          uniqueList.push({
            ...item,
            _id: key,
            createdAt: item.createdAt || item.date || new Date().toISOString(),
          });
        }
      }

      // Tsara su daga wanda ya fi kusa (Latest First)
      uniqueList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setNotifications(uniqueList);

      // Ajiye a cache don amfanin offline
      await AsyncStorage.setItem("cachedNotifications", JSON.stringify(uniqueList));
    } catch (err) {
      if (err.response && err.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.log("Fetch Notifications Warning:", err.message);
        // Load cache idan babu network
        const cached = await AsyncStorage.getItem("cachedNotifications");
        if (cached) {
          try {
            setNotifications(JSON.parse(cached));
          } catch (e) {}
        }
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  // Sabuntawa a duk lokacin da aka dawo kan Screen din
  useFocusEffect(
    useCallback(() => {
      fetchNotifications(false);

      // Fara real-time live polling (Kowace dakika 8)
      pollingTimerRef.current = setInterval(() => {
        fetchNotifications(true);
      }, 8000);

      return () => {
        if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
      };
    }, [fetchNotifications])
  );

  // Duba AppState (idan an rage app aka dawo ciki)
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        fetchNotifications(true);
      }
    });

    return () => subscription.remove();
  }, [fetchNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchNotifications(true);
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const updated = notifications.map((n) => ({ ...n, isRead: true, read: true }));
      setNotifications(updated);

      if (token) {
        await axios.put(
          `${BASE_URL}/notifications/mark-read`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        ).catch(() => {});
      }
    } catch (e) {
      console.log("Mark as read notice:", e.message);
    }
  };

  const getNotificationVisuals = (item) => {
    const rawCategory = String(item.category || item.type || "").toUpperCase();
    const rawTitle = String(item.title || "").toUpperCase();
    const rawMsg = String(item.message || item.body || "").toUpperCase();

    // 1. Data Delivery
    if (
      rawCategory.includes("DATA") ||
      rawTitle.includes("DATA") ||
      rawMsg.includes("DATA BUNDLE")
    ) {
      return {
        icon: "wifi",
        color: "#0284c7",
        bg: "rgba(2, 132, 199, 0.14)",
        typeLabel: "Data Delivery",
      };
    }

    // 2. Airtime & VTU
    if (
      rawCategory.includes("AIRTIME") ||
      rawTitle.includes("AIRTIME") ||
      rawMsg.includes("RECHARGE")
    ) {
      return {
        icon: "phone-portrait",
        color: "#16a34a",
        bg: "rgba(22, 163, 74, 0.14)",
        typeLabel: "Airtime VTU",
      };
    }

    // 3. Account Creation & Virtual Account Assignment
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

    // 4. Wallet Funding & Deposits
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

    // 5. Automated Refunds & Reversals
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

    // 6. Directives, Quotas & Command
    if (
      rawCategory.includes("DIRECTIVE") ||
      rawCategory.includes("TARGET") ||
      rawTitle.includes("DIRECTIVE") ||
      rawTitle.includes("QUOTA")
    ) {
      return {
        icon: "flag",
        color: "#8b5cf6",
        bg: "rgba(139, 92, 246, 0.14)",
        typeLabel: "Executive Directive",
      };
    }

    // 7. Admin Broadcast & Push Alerts
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

    // 8. Default System Alert
    return {
      icon: "notifications",
      color: "#64748b",
      bg: "rgba(100, 116, 139, 0.14)",
      typeLabel: "System Alert",
    };
  };

  const renderItem = ({ item }) => {
    const meta = getNotificationVisuals(item);
    const isUnread = item.isRead === false || item.read === false;

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
            borderColor: isUnread
              ? meta.color
              : isDarkMode
              ? "#1e293b"
              : "#e2e8f0",
            borderLeftWidth: isUnread ? 4 : 1,
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
                  isUnread && { fontWeight: "900" },
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
            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
              <Text style={styles.timeText}>{dateFormatted}</Text>
              {isUnread && <View style={styles.unreadDot} />}
            </View>
          </View>
        </View>

        <Text
          style={[
            styles.message,
            { color: isDarkMode ? "#cbd5e1" : "#334155" },
          ]}
        >
          {item.message || item.body || "No details provided."}
        </Text>
      </View>
    );
  };

  const unreadCount = notifications.filter(
    (n) => n.isRead === false || n.read === false
  ).length;

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

      {/* Header */}
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
          {unreadCount > 0 && (
            <View style={[styles.countBadge, { backgroundColor: "#e11d48", marginLeft: 4 }]}>
              <Text style={styles.countBadgeText}>{unreadCount} NEW</Text>
            </View>
          )}
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markReadBtn}>
              <Feather name="check-circle" size={14} color="#0284c7" />
              <Text style={styles.markReadText}>Mark Read</Text>
            </TouchableOpacity>
          )}
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
      </View>

      {/* Loading Indicator */}
      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text
            style={[
              styles.loadingText,
              { color: isDarkMode ? "#94a3b8" : "#64748b" },
            ]}
          >
            Syncing live notifications...
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
                Real-time updates on your data purchases, wallet credits, automated refunds, and supervisor directives will arrive here live.
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
  countBadgeText: { color: "#ffffff", fontSize: 10, fontWeight: "900" },
  markReadBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(2, 132, 199, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  markReadText: { color: "#0284c7", fontSize: 11, fontWeight: "800" },
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
  timeText: { fontSize: 10.5, color: "#64748b", fontWeight: "500" },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#e11d48",
    marginLeft: 6,
  },
  message: { fontSize: 12.5, lineHeight: 18, fontWeight: "500", marginTop: 2 },
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