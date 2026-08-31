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
  Modal,
  Clipboard,
  Alert,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5, Feather } from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeContext } from "../context/ThemeContext";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const filterCategories = [
  "ALL",
  "DATA",
  "AIRTIME",
  "ELECTRICITY",
  "CABLE",
  "NIN",
  "BVN",
  "FUNDING",
  "REFUND",
];

const HistoryScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext) || { isDarkMode: false };
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Transaction Receipt / Details Modal State
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

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

      const headers = { Authorization: `Bearer ${token}` };

      // Query unified endpoints with graceful fallbacks
      const response = await axios
        .get(`${BASE_URL}/transactions/my-history`, { headers, timeout: 15000 })
        .catch(() => axios.get(`${BASE_URL}/transactions/history`, { headers, timeout: 15000 }))
        .catch(() => axios.get(`${BASE_URL}/vtu/history`, { headers, timeout: 15000 }))
        .catch(() => axios.get(`${BASE_URL}/transactions`, { headers, timeout: 15000 }));

      const result = response.data;
      if (result.success || result.status === "success") {
        const rawList = result.data || result.history || result.transactions || [];
        setHistory(Array.isArray(rawList) ? rawList : []);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.log("Transaction History Sync Notice:", error.response?.data?.message || error.message);
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

  const copyToClipboard = (text) => {
    if (!text) return;
    Clipboard.setString(String(text));
    if (Platform.OS === "web") {
      window.alert(`Copied: ${text}`);
    } else {
      Alert.alert("Copied to Clipboard", `${text}`);
    }
  };

  // Dynamic Service Metadata Resolver
  const getServiceMetadata = (item) => {
    const rawType = String(item.type || item.service || item.category || "").toUpperCase();

    if (rawType.includes("DATA")) {
      return { icon: "wifi", color: "#0284c7", label: "Data Bundle", bg: "rgba(2, 132, 199, 0.12)", isInflow: false };
    }
    if (rawType.includes("AIRTIME") || rawType.includes("VTU")) {
      return { icon: "phone-alt", color: "#16a34a", label: "Airtime Top-up", bg: "rgba(22, 163, 74, 0.12)", isInflow: false };
    }
    if (rawType.includes("ELECTRIC") || rawType.includes("POWER") || rawType.includes("TOKEN")) {
      return { icon: "bolt", color: "#eab308", label: "Electricity Token", bg: "rgba(234, 179, 8, 0.12)", isInflow: false };
    }
    if (rawType.includes("CABLE") || rawType.includes("TV") || rawType.includes("GOTV") || rawType.includes("DSTV")) {
      return { icon: "tv", color: "#8b5cf6", label: "Cable Subscription", bg: "rgba(139, 92, 246, 0.12)", isInflow: false };
    }
    if (rawType.includes("NIN") || rawType.includes("NIMC")) {
      return { icon: "fingerprint", color: "#2563eb", label: "NIN Verification", bg: "rgba(37, 99, 235, 0.12)", isInflow: false };
    }
    if (rawType.includes("BVN")) {
      return { icon: "id-card", color: "#06b6d4", label: "BVN Service", bg: "rgba(6, 182, 212, 0.12)", isInflow: false };
    }
    if (rawType.includes("REFUND")) {
      return { icon: "undo-alt", color: "#10b981", label: "Wallet Refund", bg: "rgba(16, 185, 129, 0.15)", isInflow: true };
    }
    if (rawType.includes("FUND") || rawType.includes("DEPOSIT") || rawType.includes("CREDIT") || rawType.includes("WALLET")) {
      return { icon: "wallet", color: "#10b981", label: "Wallet Deposit", bg: "rgba(16, 185, 129, 0.12)", isInflow: true };
    }
    return { icon: "receipt", color: "#64748b", label: item.service || "Utility Service", bg: "rgba(100, 116, 139, 0.12)", isInflow: false };
  };

  // Filter and Search Engine
  const filteredHistory = history.filter((item) => {
    const rawType = String(item.type || item.service || item.category || "").toUpperCase();
    const rawRef = String(item.reference || item.transactionId || item._id || "").toUpperCase();
    const rawPhone = String(item.phoneNumber || item.phone || item.recipient || item.meterNumber || item.nin || item.bvn || "").toUpperCase();
    const rawDesc = String(item.description || item.details || "").toUpperCase();
    const rawAmount = String(item.amount || "");
    const rawQuery = searchQuery.toUpperCase().trim();

    let matchesCategory = true;
    if (activeFilter === "DATA") matchesCategory = rawType.includes("DATA");
    else if (activeFilter === "AIRTIME") matchesCategory = rawType.includes("AIRTIME") || rawType.includes("VTU");
    else if (activeFilter === "ELECTRICITY") matchesCategory = rawType.includes("ELECTRIC") || rawType.includes("POWER");
    else if (activeFilter === "CABLE") matchesCategory = rawType.includes("CABLE") || rawType.includes("TV");
    else if (activeFilter === "NIN") matchesCategory = rawType.includes("NIN") || rawType.includes("NIMC");
    else if (activeFilter === "BVN") matchesCategory = rawType.includes("BVN");
    else if (activeFilter === "REFUND") matchesCategory = rawType.includes("REFUND");
    else if (activeFilter === "FUNDING") matchesCategory = rawType.includes("FUND") || rawType.includes("DEPOSIT") || rawType.includes("CREDIT") || rawType.includes("WALLET");

    const matchesSearch =
      !rawQuery ||
      rawRef.includes(rawQuery) ||
      rawPhone.includes(rawQuery) ||
      rawType.includes(rawQuery) ||
      rawDesc.includes(rawQuery) ||
      rawAmount.includes(rawQuery);

    return matchesCategory && matchesSearch;
  });

  const renderItem = ({ item }) => {
    const meta = getServiceMetadata(item);
    const status = String(item.status || "COMPLETED").toUpperCase();
    const isSuccess = status === "SUCCESS" || status === "SUCCESSFUL" || status === "DELIVERED" || status === "COMPLETED";
    const isPending = status === "PENDING" || status === "PROCESSING" || status === "QUEUED" || status === "PENDING-REFUND";
    const isRefunded = status === "REFUNDED";

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
      item.recipient ||
      item.phoneNumber ||
      item.phone ||
      item.meterNumber ||
      item.nin ||
      item.bvn ||
      item.description ||
      item.reference ||
      "Platform Node";

    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={() => {
          setSelectedTx(item);
          setModalVisible(true);
        }}
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
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text
                style={[
                  styles.serviceTitle,
                  { color: isDarkMode ? "#f8fafc" : "#0f172a" },
                ]}
                numberOfLines={1}
              >
                {meta.label}
              </Text>
              <Text style={styles.referenceText} numberOfLines={1}>
                Ref: {item.reference || item.transactionId || "N/A"}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: isRefunded
                  ? "rgba(139, 92, 246, 0.12)"
                  : isSuccess
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
                  color: isRefunded
                    ? "#8b5cf6"
                    : isSuccess
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
              { color: meta.isInflow ? "#10b981" : isDarkMode ? "#00f0ff" : "#0284c7" },
            ]}
          >
            {meta.isInflow ? "+" : "-"}₦{displayAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </TouchableOpacity>
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
        {navigation?.canGoBack() ? (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons
              name="arrow-back"
              size={24}
              color={isDarkMode ? "#f8fafc" : "#0f172a"}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />
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

      {/* Search Bar */}
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
          placeholder="Search by phone, meter, NIN, amount, or Ref..."
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
      <View style={{ height: 44, marginBottom: 10 }}>
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
            Loading transaction ledger...
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
                All airtime, data, electricity, cable, identity queries, and funding records will be securely preserved here.
              </Text>
            </View>
          }
        />
      )}

      {/* TRANSACTION DETAILS RECEIPT MODAL */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: isDarkMode ? "#0b1120" : "#ffffff", borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
                Transaction Receipt
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {selectedTx && (
              <View>
                <View style={styles.receiptAmountRow}>
                  <Text style={styles.receiptAmountLabel}>Amount</Text>
                  <Text
                    style={[
                      styles.receiptAmountVal,
                      { color: getServiceMetadata(selectedTx).isInflow ? "#10b981" : isDarkMode ? "#00f0ff" : "#0284c7" },
                    ]}
                  >
                    {getServiceMetadata(selectedTx).isInflow ? "+" : "-"}₦
                    {Number(selectedTx.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Text>
                </View>

                <View
                  style={[
                    styles.receiptDetailsBox,
                    { backgroundColor: isDarkMode ? "#050811" : "#f8fafc", borderColor: isDarkMode ? "#1e293b" : "#e2e8f0" },
                  ]}
                >
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Service</Text>
                    <Text style={[styles.receiptValue, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
                      {getServiceMetadata(selectedTx).label}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Status</Text>
                    <Text
                      style={[
                        styles.receiptValue,
                        {
                          color:
                            String(selectedTx.status).toUpperCase() === "REFUNDED"
                              ? "#8b5cf6"
                              : String(selectedTx.status).toUpperCase() === "SUCCESS" ||
                                String(selectedTx.status).toUpperCase() === "COMPLETED"
                              ? "#10b981"
                              : "#ef4444",
                          fontWeight: "800",
                        },
                      ]}
                    >
                      {String(selectedTx.status || "SUCCESS").toUpperCase()}
                    </Text>
                  </View>

                  {(selectedTx.recipient || selectedTx.phoneNumber || selectedTx.phone) && (
                    <View style={styles.receiptRow}>
                      <Text style={styles.receiptLabel}>Beneficiary</Text>
                      <Text style={[styles.receiptValue, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
                        {selectedTx.recipient || selectedTx.phoneNumber || selectedTx.phone}
                      </Text>
                    </View>
                  )}

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Date & Time</Text>
                    <Text style={[styles.receiptValue, { color: isDarkMode ? "#f8fafc" : "#0f172a" }]}>
                      {selectedTx.createdAt ? new Date(selectedTx.createdAt).toLocaleString() : "Recent"}
                    </Text>
                  </View>

                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Reference</Text>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center" }}
                      onPress={() => copyToClipboard(selectedTx.reference || selectedTx._id)}
                    >
                      <Text style={[styles.receiptValue, { color: "#0284c7" }]}>
                        {String(selectedTx.reference || selectedTx._id).slice(0, 16)}...
                      </Text>
                      <Feather name="copy" size={13} color="#0284c7" style={{ marginLeft: 5 }} />
                    </TouchableOpacity>
                  </View>

                  {selectedTx.description && (
                    <View style={[styles.receiptRow, { borderBottomWidth: 0 }]}>
                      <Text style={styles.receiptLabel}>Description</Text>
                      <Text style={[styles.receiptValue, { flex: 1, textAlign: "right", color: isDarkMode ? "#cbd5e1" : "#475569" }]}>
                        {selectedTx.description}
                      </Text>
                    </View>
                  )}
                </View>

                <TouchableOpacity
                  style={styles.closeBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.closeBtnText}>Close Receipt</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
    marginBottom: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    padding: 20,
    width: "100%",
    maxWidth: 440,
    borderWidth: 1,
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 15, fontWeight: "900" },
  receiptAmountRow: { alignItems: "center", marginVertical: 10 },
  receiptAmountLabel: { color: "#64748b", fontSize: 11, fontWeight: "700" },
  receiptAmountVal: { fontSize: 24, fontWeight: "900", marginTop: 2 },
  receiptDetailsBox: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(100, 116, 139, 0.1)",
  },
  receiptLabel: { color: "#64748b", fontSize: 11.5, fontWeight: "600" },
  receiptValue: { fontSize: 12, fontWeight: "700" },
  closeBtn: {
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 14,
  },
  closeBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "900" },
});

export default HistoryScreen;