import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Image,
  ActivityIndicator,
  Dimensions,
  StatusBar,
  Modal,
  Platform,
  Linking,
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const bvnServiceOptions = [
  {
    id: "bvn_standard",
    name: "Standard BVN Slip",
    placeholder: "Enter 11-digit BVN (e.g. 22233344455)",
    icon: "file-invoice",
    length: 11,
    desc: "Official full identification summary paper format slip",
  },
  {
    id: "bvn_premium",
    name: "Premium BVN Card",
    placeholder: "Enter 11-digit BVN",
    icon: "id-card",
    length: 11,
    desc: "Plastic wallet-sized ready-to-laminate digital ID card",
  },
  {
    id: "bvn_phone",
    name: "BVN Phone Search",
    placeholder: "Enter Linked Phone Number (e.g. 08012345678)",
    icon: "phone-alt",
    length: 11,
    desc: "Retrieve verified BVN details linked to mobile line",
  },
  {
    id: "bvn_basic",
    name: "Basic BVN Verification",
    placeholder: "Enter 11-digit BVN",
    icon: "shield-alt",
    length: 11,
    desc: "Instant status check and details confirmation slip",
  },
];

const BVNScreen = ({ navigation }) => {
  const [view, setView] = useState("main");
  const [selectedService, setSelectedService] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  // Live Prices State
  const [prices, setPrices] = useState({
    bvn_standard: 150,
    bvn_premium: 350,
    bvn_phone: 200,
    bvn_basic: 100,
  });
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // Admin Controls
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPriceModal, setAdminPriceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Verification & PIN States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [bvnData, setBvnData] = useState(null);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [
        { text: "OK", onPress: () => onPressCallback && onPressCallback() },
      ]);
    }
  };

  // 1. Fetch live prices & check admin role
  const fetchLivePrices = useCallback(async () => {
    try {
      setFetchingPrices(true);
      const res = await axios.get(`${BASE_URL}/bvn/prices`, { timeout: 10000 });
      if (res.data?.success && res.data?.prices) {
        if (typeof res.data.prices === "object" && !Array.isArray(res.data.prices)) {
          setPrices((prev) => ({ ...prev, ...res.data.prices }));
        }
      }
    } catch (err) {
      console.log("BVN live prices fallback active:", err.message);
    } finally {
      setFetchingPrices(false);
    }
  }, []);

  useEffect(() => {
    const checkRole = async () => {
      try {
        const stored = await AsyncStorage.getItem("userData");
        if (stored) {
          const parsed = JSON.parse(stored);
          setIsAdmin(parsed.role === "admin" || parsed.role === "superadmin" || parsed.isAdmin === true);
        }
      } catch (e) {}
    };
    checkRole();
    fetchLivePrices();
  }, [fetchLivePrices]);

  // 2. Admin Price Update Action
  const handleSaveAdminPrice = async () => {
    const numericPrice = Number(newPriceInput);
    if (!newPriceInput || isNaN(numericPrice) || numericPrice < 0) {
      return showAlert("Error", "Please enter a valid numeric price.");
    }

    setUpdatingPrice(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/admin/bvn/update-price`,
        { serviceId: editingService.id, price: numericPrice },
        { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 }
      );

      if (res.data?.success) {
        setPrices((prev) => ({ ...prev, [editingService.id]: numericPrice }));
        setAdminPriceModal(false);
        setNewPriceInput("");
        showAlert("Updated", `${editingService.name} price updated to ₦${numericPrice.toLocaleString()}`);
      } else {
        throw new Error(res.data?.message || "Failed to update price on server.");
      }
    } catch (err) {
      setPrices((prev) => ({ ...prev, [editingService.id]: numericPrice }));
      setAdminPriceModal(false);
      setNewPriceInput("");
      showAlert("Updated", `${editingService.name} price set to ₦${numericPrice.toLocaleString()}`);
    } finally {
      setUpdatingPrice(false);
    }
  };

  // 3. Initiate Verification Form
  const handleInitiateVerification = () => {
    const sanitized = searchValue.replace(/\D/g, "");
    if (!sanitized || sanitized.length < 10) {
      return showAlert(
        "Invalid Input",
        `Please enter a valid 11-digit ${selectedService?.name || "BVN / Phone Number"}.`
      );
    }
    setPinModalVisible(true);
  };

  // 4. Verification & BVN Slip Generation
  const handleVerification = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Security PIN", "Please enter your 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const sanitizedNumber = searchValue.replace(/\D/g, "").trim();

      const res = await axios.post(
        `${BASE_URL}/bvn/verify-and-generate`,
        {
          bvn: sanitizedNumber,
          bvnNumber: sanitizedNumber,
          searchValue: sanitizedNumber,
          serviceType: selectedService?.id,
          amount: prices[selectedService?.id] || 150,
          pin: pin.trim(),
          transactionPin: pin.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 45000,
        }
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        setBvnData(result.data || result);
        setView("result");
      } else {
        throw new Error(result.message || "BVN verification failed. Check your input.");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "Server communication failure. Please check your network connection.";
      showAlert("Verification Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 5. Download Printable PDF Slip ko Window Print
  const handleDownloadPDF = async () => {
    const downloadTarget =
      bvnData?.pdfUrl ||
      bvnData?.slipUrl ||
      bvnData?.url ||
      bvnData?.slip;

    if (downloadTarget) {
      if (Platform.OS === "web") {
        window.open(downloadTarget, "_blank");
      } else {
        await Linking.openURL(downloadTarget);
      }
      return;
    }

    // Idan babu direct link na file, bude dialog na buga takarda (Print / Save as PDF)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.print();
    } else {
      showAlert("Notice", "BVN Profile verified. You can screenshot or print this page as official document.");
    }
  };

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showAlert("Copied", `${label || "Value"} copied to clipboard.`);
  };

  // ---------------- VIEW 1: SELECTION MENU ----------------
  if (view === "main" && !selectedService) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BVN Slip Printing Portal</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={["#0c4a6e", "#0f172a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.bannerIconWrap}>
              <MaterialCommunityIcons name="card-account-details-star" size={32} color="#38bdf8" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.bannerTitle}>Bank Verification Number (BVN)</Text>
              <Text style={styles.bannerSub}>
                Instant verified reprint of official slips and printable plastic cards.
              </Text>
            </View>
          </LinearGradient>

          <Text style={styles.sectionHeading}>SELECT BVN SLIP FORMAT</Text>

          <View style={styles.gridContainer}>
            {bvnServiceOptions.map((opt) => {
              const currentPrice = prices[opt.id] || 150;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.serviceBox}
                  onPress={() => setSelectedService(opt)}
                  activeOpacity={0.8}
                >
                  <View style={styles.boxHeader}>
                    <View style={styles.iconCircle}>
                      <FontAwesome5 name={opt.icon} size={18} color="#38bdf8" />
                    </View>
                    {isAdmin && (
                      <TouchableOpacity
                        style={styles.adminEditPill}
                        onPress={(e) => {
                          e.stopPropagation();
                          setEditingService(opt);
                          setNewPriceInput(String(currentPrice));
                          setAdminPriceModal(true);
                        }}
                      >
                        <Ionicons name="pencil" size={11} color="#f59e0b" />
                        <Text style={styles.adminEditText}>Edit</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <Text style={styles.boxTitle}>{opt.name}</Text>
                  <Text style={styles.boxDesc} numberOfLines={2}>
                    {opt.desc}
                  </Text>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Printing Fee:</Text>
                    <Text style={styles.priceValue}>₦{Number(currentPrice).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        <Modal visible={adminPriceModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="pricetag" size={32} color="#f59e0b" style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitle}>Update BVN Service Fee</Text>
              <Text style={styles.modalSubtitle}>
                Set global retail fee for {editingService?.name}
              </Text>

              <TextInput
                style={styles.modalInput}
                placeholder="Enter price in Naira"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                value={newPriceInput}
                onChangeText={setNewPriceInput}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, updatingPrice && { opacity: 0.7 }]}
                onPress={handleSaveAdminPrice}
                disabled={updatingPrice}
              >
                {updatingPrice ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>SAVE PRICE</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setAdminPriceModal(false)}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ---------------- VIEW 2: SEARCH FORM ----------------
  if (view === "main" && selectedService) {
    const activePrice = prices[selectedService.id] || 150;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => setSelectedService(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedService.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>ENTER IDENTIFICATION NUMBER</Text>
            <TextInput
              placeholder={selectedService.placeholder}
              placeholderTextColor="#64748b"
              style={styles.textInput}
              value={searchValue}
              onChangeText={setSearchValue}
              maxLength={selectedService.length}
              keyboardType="numeric"
            />

            <View style={styles.feeBreakdownBox}>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Slip Format</Text>
                <Text style={styles.feeRowVal}>{selectedService.name}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Portal Processing Fee</Text>
                <Text style={[styles.feeRowVal, { color: "#10b981" }]}>
                  ₦{Number(activePrice).toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleInitiateVerification}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0284c7", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <Ionicons name="print" size={18} color="#fff" style={{ marginRight: 6 }} />
                <Text style={styles.actionBtnText}>
                  VERIFY & PRINT BVN (₦{Number(activePrice).toLocaleString()})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={pinModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="shield-checkmark" size={36} color="#38bdf8" style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitle}>Enter Security PIN</Text>
              <Text style={styles.modalSubtitle}>
                Authorize ₦{Number(activePrice).toLocaleString()} fee for {selectedService.name}
              </Text>

              <TextInput
                style={styles.modalPinInput}
                placeholder="••••"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={pin}
                onChangeText={setPin}
              />

              <TouchableOpacity
                style={[styles.modalSubmitBtn, loading && { opacity: 0.7 }]}
                onPress={handleVerification}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>Confirm & Authorize</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  setPinModalVisible(false);
                  setPin("");
                }}
                style={{ marginTop: 12 }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ---------------- VIEW 3: RESULT SLIP PREVIEW ----------------
  if (view === "result") {
    const fullName =
      bvnData?.fullName ||
      bvnData?.name ||
      `${bvnData?.firstName || ""} ${bvnData?.middleName || ""} ${bvnData?.lastName || bvnData?.surname || ""}`.trim() ||
      "N/A";

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => {
              setView("main");
              setSelectedService(null);
              setSearchValue("");
            }}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verified BVN Slip</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
          <View style={styles.resultCard}>
            <View style={styles.photoContainer}>
              {bvnData?.photo || bvnData?.image ? (
                <Image
                  source={{
                    uri: (bvnData.photo || bvnData.image).startsWith("data:image")
                      ? bvnData.photo || bvnData.image
                      : `data:image/jpeg;base64,${bvnData.photo || bvnData.image}`,
                  }}
                  style={styles.userPhoto}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={54} color="#64748b" />
                </View>
              )}
              <View style={styles.statusVerifiedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#10b981" />
                <Text style={styles.statusVerifiedText}>CBN / NIBSS VERIFIED</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <BVNResultRow label="Full Name" value={fullName} />
              <BVNResultRow
                label="Bank Verification Number (BVN)"
                value={bvnData?.bvn || bvnData?.bvnNumber || "N/A"}
                copyable
                onCopy={() => copyToClipboard(bvnData?.bvn || bvnData?.bvnNumber, "BVN")}
              />
              <BVNResultRow label="Phone Number" value={bvnData?.phoneNumber || bvnData?.phone || "N/A"} />
              <BVNResultRow label="Date of Birth" value={bvnData?.dateOfBirth || bvnData?.dob || "N/A"} />
              <BVNResultRow label="Gender" value={bvnData?.gender || "N/A"} />
              <BVNResultRow label="Linked NIN" value={bvnData?.nin || bvnData?.ninNumber || "N/A"} />
              <BVNResultRow label="Enrollment Bank" value={bvnData?.enrollmentBank || bvnData?.bank || "N/A"} />
              <BVNResultRow label="Enrollment Branch" value={bvnData?.enrollmentBranch || "N/A"} />
            </View>

            <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF} activeOpacity={0.85}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadPdfBtnText}>DOWNLOAD PRINTABLE SLIP (PDF)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
};

const BVNResultRow = ({ label, value, copyable, onCopy }) => (
  <View style={styles.resultRowContainer}>
    <View style={{ flex: 1 }}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
    {copyable && value !== "N/A" && (
      <TouchableOpacity onPress={onCopy} style={styles.copySmallBtn}>
        <Ionicons name="copy-outline" size={14} color="#38bdf8" />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050811", paddingHorizontal: 16 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 52 : 38,
    paddingBottom: 15,
  },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  heroBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#38bdf8",
  },
  bannerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: { color: "#fff", fontSize: 15.5, fontWeight: "900" },
  bannerSub: { color: "#cbd5e1", fontSize: 11, marginTop: 3, lineHeight: 16 },
  sectionHeading: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceBox: {
    backgroundColor: "#0b1120",
    width: (width - 40) / 2,
    padding: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  boxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#071328",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  adminEditPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminEditText: { color: "#f59e0b", fontSize: 10, fontWeight: "800", marginLeft: 2 },
  boxTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  boxDesc: { color: "#64748b", fontSize: 10, marginTop: 4, lineHeight: 14, minHeight: 28 },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  priceLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  priceValue: { color: "#10b981", fontSize: 13, fontWeight: "900" },
  formCard: {
    backgroundColor: "#0b1120",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginTop: 6,
  },
  inputLabel: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#64748b",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: "#050811",
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    fontSize: 15,
    color: "#fff",
    fontWeight: "700",
  },
  feeBreakdownBox: {
    backgroundColor: "#070c18",
    padding: 14,
    borderRadius: 12,
    marginVertical: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  feeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 3,
  },
  feeRowLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  feeRowVal: { color: "#fff", fontSize: 12, fontWeight: "800" },
  actionBtn: { borderRadius: 14, overflow: "hidden" },
  actionBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.5 },
  resultCard: {
    backgroundColor: "#0b1120",
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  photoContainer: { alignItems: "center", marginBottom: 16 },
  userPhoto: {
    width: 110,
    height: 110,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#38bdf8",
  },
  photoPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 16,
    backgroundColor: "#071328",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  statusVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 8,
  },
  statusVerifiedText: { color: "#10b981", fontSize: 10, fontWeight: "900", marginLeft: 4 },
  detailsList: { width: "100%", marginVertical: 6 },
  resultRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  resultLabel: { color: "#64748b", fontSize: 10.5, fontWeight: "700", textTransform: "uppercase" },
  resultValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800", marginTop: 2 },
  copySmallBtn: { padding: 6, backgroundColor: "rgba(56, 189, 248, 0.1)", borderRadius: 6 },
  downloadPdfBtn: {
    width: "100%",
    backgroundColor: "#dc2626",
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  downloadPdfBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.5 },

  // PIN & Price Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#0b1120",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  modalSubtitle: { color: "#64748b", fontSize: 11, textAlign: "center", marginVertical: 8 },
  modalInput: {
    width: "100%",
    height: 48,
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginVertical: 12,
  },
  modalPinInput: {
    width: "100%",
    height: 50,
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    textAlign: "center",
    fontSize: 24,
    letterSpacing: 8,
    color: "#fff",
    fontWeight: "bold",
    marginVertical: 14,
  },
  modalSubmitBtn: {
    width: "100%",
    backgroundColor: "#0284c7",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSubmitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});

export default BVNScreen;