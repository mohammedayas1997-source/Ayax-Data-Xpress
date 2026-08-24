import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Platform,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const filterCategories = ["ALL", "DATA", "AIRTIME", "ELECTRICITY", "NIN", "BVN", "FUNDING"];

const HistoryScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchHistory = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        if (!isBackground && navigation) {
          navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        }
        return;
      }

      // Query complete transaction ledger across all services
      const response = await axios.get(`${BASE_URL}/vtu/history`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 15000,
      });

      const result = response.data;
      if (result.success || result.status === "success") {
        const rawList = result.data || result.history || result.transactions || [];
        setHistory(rawList);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.log("Transaction History Sync Error:", error.response?.data || error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [navigation]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory(true);
  };

  // Resolve dynamic category icon and color
  const getServiceMetadata = (type = "") => {
    const t = String(type).toUpperCase();
    if (t.includes("DATA")) {
      return { icon: "wifi", color: "#0284c7", label: "Data Bundle", bg: "rgba(2, 132, 199, 0.12)" };
    }
    if (t.includes("AIRTIME") || t.includes("VTU")) {
      return { icon: "phone-alt", color: "#16a34a", label: "Airtime Top-up", bg: "rgba(22, 163, 74, 0.12)" };
    }
    if (t.includes("ELECTRIC") || t.includes("POWER")) {
      return { icon: "bolt", color: "#eab308", label: "Electricity Token", bg: "rgba(234, 179, 8, 0.12)" };
    }
    if (t.includes("NIN") || t.includes("NIMC")) {
      return { icon: "fingerprint", color: "#2563eb", label: "NIN Service", bg: "rgba(37, 99, 235, 0.12)" };
    }
    if (t.includes("BVN")) {
      return { icon: "id-card", color: "#8b5cf6", label: "BVN Service", bg: "rgba(139, 92, 246, 0.12)" };
    }
    if (t.includes("FUND") || t.includes("DEPOSIT") || t.includes("WALLET")) {
      return { icon: "wallet", color: "#10b981", label: "Wallet Deposit", bg: "rgba(16, 185, 129, 0.12)" };
    }
    return { icon: "receipt", color: "#64748b", label: "Utility Service", bg: "rgba(100, 116, 139, 0.12)" };
  };

  // Filter and search computation
  const filteredHistory = history.filter((item) => {
    const rawType = String(item.type || item.service || "").toUpperCase();
    const rawRef = String(item.reference || "").toUpperCase();
    const rawPhone = String(item.phoneNumber || item.phone || item.meterNumber || item.nin || item.bvn || "").toUpperCase();
    const rawQuery = searchQuery.toUpperCase().trim();

    const matchesCategory =
      activeFilter === "ALL" ||
      (activeFilter === "DATA" && rawType.includes("DATA")) ||
      (activeFilter === "AIRTIME" && (rawType.includes("AIRTIME") || rawType.includes("VTU"))) ||
      (activeFilter === "ELECTRICITY" && (rawType.includes("ELECTRIC") || rawType.includes("POWER"))) ||
      (activeFilter === "NIN" && (rawType.includes("NIN") || rawType.includes("NIMC"))) ||
      (activeFilter === "BVN" && rawType.includes("BVN")) ||
      (activeFilter === "FUNDING" && (rawType.includes("FUND") || rawType.includes("WALLET") || rawType.includes("DEPOSIT")));

    const matchesSearch =
      !rawQuery ||
      rawRef.includes(rawQuery) ||
      rawPhone.includes(rawQuery) ||
      rawType.includes(rawQuery);

    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item }) => {
    const meta = getServiceMetadata(item.type || item.service);
    const status = String(item.status || "COMPLETED").toUpperCase();
    const isSuccess = status === "SUCCESS" || status === "SUCCESSFUL" || status === "DELIVERED";
    const isPending = status === "PENDING" || status === "PROCESSING" || status === "QUEUED";

    const displayAmount = Number(item.amount || item.totalAmount || 0);
    const dateFormatted = item.createdAt
      ? new Date(item.createdAt).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Recent";

    const detailText =
      item.phoneNumber ||
      item.phone ||
      item.meterNumber ||
      item.nin ||
      item.bvn ||
      item.description ||
      item.reference ||
      "N/A";

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
        <View style={styles.cardHeaderRow}>
          <View style={styles.serviceMeta}>
            <View style={[styles.serviceIconWrap, { backgroundColor: meta.bg }]}>
              <FontAwesome5 name={meta.icon} size={15} color={meta.color} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text
                style={[
                  styles.serviceTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
              >
                {meta.label}
              </Text>
              <Text style={styles.referenceText}>Ref: {item.reference || "N/A"}</Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isSuccess
                  ? "rgba(16, 185, 129, 0.12)"
                  : isPending
                  ? "rgba(234, 179, 8, 0.12)"
                  : "rgba(239, 68, 68, 0.12)",
              },
            ]}
          >
            <Text
              style={[
                styles.statusText,
                {
                  color: isSuccess
                    ? "#10b981"
                    : isPending
                    ? "#eab308"
                    : "#ef4444",
                },
              ]}
            >
              {status}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooterRow}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={styles.detailValue} numberOfLines={1}>
              {detailText}
            </Text>
            <Text style={styles.dateText}>{dateFormatted}</Text>
          </View>

          <Text
            style={[
              styles.amountText,
              { color: isDarkMode ? "#00f0ff" : "#0284c7" },
            ]}
          >
            ₦{displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
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

      {/* Header Bar */}
      <View style={styles.header}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? "#f8fafc" : "#0f172a"}
            />
          </TouchableOpacity>
        )}
        <Text
          style={[
            styles.headerTitle,
            { color: isDarkMode ? "#f8fafc" : "#0f172a" },
          ]}
        >
          Transaction Ledger
        </Text>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Ionicons
            name="reload-outline"
            size={20}
            color={isDarkMode ? "#00f0ff" : "#0284c7"}
          />
        </TouchableOpacity>
      </View>

      {/* Live Search Bar */}
      <View
        style={[
          styles.searchBarContainer,
          {
            backgroundColor: isDarkMode ? "#0b1120" : "#ffffff",
            borderColor: isDarkMode ? "#1e293b" : "#e2e8f0",
          },
        ]}
      >
        <Ionicons name="search-outline" size={18} color="#64748b" style={{ marginRight: 8 }} />
        <TextInput
          style={[
            styles.searchInput,
            { color: isDarkMode ? "#ffffff" : "#0f172a" },
          ]}
          placeholder="Search by phone, meter, NIN, or Ref"
          placeholderTextColor="#64748b"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={18} color="#64748b" />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Filter Chips */}
      <View style={{ height: 42, marginBottom: 12 }}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filterCategories}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item;
            return (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isSelected
                      ? "#0284c7"
                      : isDarkMode
                      ? "#0b1120"
                      : "#ffffff",
                    borderColor: isSelected
                      ? "#00f0ff"
                      : isDarkMode
                      ? "#1e293b"
                      : "#e2e8f0",
                  },
                ]}
                onPress={() => setActiveFilter(item)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: isSelected
                        ? "#ffffff"
                        : isDarkMode
                        ? "#94a3b8"
                        : "#64748b",
                      fontWeight: isSelected ? "800" : "600",
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={[styles.loadingText, { color: isDarkMode ? "#94a3b8" : "#64748b" }]}>
            Fetching transaction history...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredHistory}
          keyExtractor={(item, index) => item._id || item.id || item.reference || index.toString()}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
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
              <MaterialCommunityIcons
                name="receipt-text-remove-outline"
                size={54}
                color="#64748b"
              />
              <Text
                style={[
                  styles.emptyTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
              >
                No Records Found
              </Text>
              <Text style={styles.emptySub}>
                Transactions performed across data, airtime, electricity, and NIN will be displayed here automatically.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 52 : 38,
    paddingBottom: 14,
  },
  headerTitle: { fontSize: 16, fontWeight: "900", letterSpacing: -0.3 },
  backBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "center" },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  searchInput: { flex: 1, fontSize: 13, fontWeight: "600" },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  filterChipText: { fontSize: 11 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 12, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  serviceMeta: { flexDirection: "row", alignItems: "center", flex: 1 },
  serviceIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  serviceTitle: { fontSize: 13, fontWeight: "800" },
  referenceText: { fontSize: 10, color: "#64748b", marginTop: 2, fontWeight: "500" },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 9.5, fontWeight: "900", letterSpacing: 0.5 },
  divider: {
    height: 1,
    backgroundColor: "rgba(100, 116, 139, 0.12)",
    marginVertical: 10,
  },
  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  detailValue: { fontSize: 12, color: "#64748b", fontWeight: "600" },
  dateText: { fontSize: 10.5, color: "#94a3b8", marginTop: 2, fontWeight: "500" },
  amountText: { fontSize: 15, fontWeight: "900", letterSpacing: -0.3 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 80,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", marginTop: 12 },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 18,
    fontWeight: "500",
  },
});

export default HistoryScreen;