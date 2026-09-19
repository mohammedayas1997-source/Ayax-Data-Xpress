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
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const bvnTiers = [
  {
    id: "bvn_full_details",
    name: "Full Details Slip",
    desc: "Official identification sheet containing full personal details and photograph",
  },
  {
    id: "bvn_premium",
    name: "Premium Slip",
    desc: "Plastic card wallet format with security barcode",
  },
];

const BVNScreen = ({ navigation }) => {
  const [view, setView] = useState("main");
  const [selectedTier, setSelectedTier] = useState("bvn_full_details");
  const [bvnNumber, setBvnNumber] = useState("");
  const [pin, setPin] = useState("");
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [prices, setPrices] = useState({ bvn_full_details: 150, bvn_premium: 150 });
  const [slipResult, setSlipResult] = useState(null);

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

  const fetchPrices = useCallback(async () => {
    try {
      const res = await axios.get(`${BASE_URL}/bvn/prices`, { timeout: 10000 });
      if (res.data?.success && res.data?.prices) {
        setPrices((prev) => ({ ...prev, ...res.data.prices }));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    fetchPrices();
  }, [fetchPrices]);

  const handleInitiate = () => {
    const clean = bvnNumber.replace(/\D/g, "");
    if (!clean || clean.length !== 11) {
      return showAlert("Invalid BVN", "Please enter a valid 11-digit Bank Verification Number.");
    }
    setPinModalVisible(true);
  };

  const handleVerifyBVN = async () => {
    if (!pin || pin.trim().length !== 4) {
      return showAlert("Security PIN", "Please enter your 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token =
        (await AsyncStorage.getItem("userToken")) ||
        (await AsyncStorage.getItem("token"));

      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const activeAmount = prices[selectedTier] || 150;
      const cleanBvn = bvnNumber.replace(/\D/g, "").trim();

      const payload = {
        bvn: cleanBvn,
        bvnNumber: cleanBvn,
        serviceType: selectedTier,
        type: selectedTier,
        amount: activeAmount,
        pin: pin.trim(),
        transactionPin: pin.trim(),
        format: "pdf",
        generatePdf: true,
      };

      let res;
      try {
        res = await axios.post(`${BASE_URL}/bvn/verify-and-generate`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          timeout: 65000,
        });
      } catch (postErr) {
        if (postErr.response?.status === 404) {
          res = await axios.post(`${BASE_URL}/bvn/verify`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            timeout: 65000,
          });
        } else {
          throw postErr;
        }
      }

      const result = res.data;
      const isOk =
        result.success === true ||
        result.status === "success" ||
        String(result.message || "").toLowerCase().includes("pdf generated") ||
        String(result.message || "").toLowerCase().includes("successful");

      const base64Content =
        result.pdf_base64 ||
        result.pdfBase64 ||
        result.data?.pdf_base64 ||
        result.data?.pdf;

      const profileData =
        result.data?.userData ||
        result.userData ||
        result.data ||
        result.user_data ||
        {};

      if (isOk) {
        setPinModalVisible(false);
        setPin("");

        setSlipResult({
          bvn: cleanBvn,
          slipType: selectedTier === "bvn_premium" ? "Premium Slip" : "Full Details Slip",
          base64: base64Content || null,
          userData: profileData,
        });

        setView("result");
      } else {
        throw new Error(result.message || "Failed to generate BVN slip.");
      }
    } catch (err) {
      showAlert(
        "Verification Notice",
        err.response?.data?.message ||
          err.response?.data?.desc ||
          err.message ||
          "Service request timed out."
      );
    } finally {
      setLoading(false);
    }
  };

  const downloadSlipFile = () => {
    if (!slipResult?.base64) {
      const directPdf =
        slipResult?.userData?.pdfUrl ||
        slipResult?.userData?.slipUrl ||
        slipResult?.userData?.downloadUrl;

      if (directPdf && typeof directPdf === "string" && directPdf.startsWith("http")) {
        if (Platform.OS === "web") {
          window.open(directPdf, "_blank");
        } else {
          Linking.openURL(directPdf);
        }
        return;
      }
      return showAlert("Notice", "Official PDF data is not available for this record.");
    }

    setDownloading(true);
    try {
      let base64String = slipResult.base64;
      if (base64String.startsWith("data:application/pdf;base64,")) {
        base64String = base64String.replace("data:application/pdf;base64,", "");
      }

      const fileName = `BVN_Slip_${slipResult?.bvn || "DOCUMENT"}.pdf`;

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const byteCharacters = atob(base64String);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: "application/pdf" });

        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        showAlert("Document Ready", "Your official BVN PDF slip is ready.");
      }
    } catch (err) {
      showAlert("Download Notice", "Could not trigger download: " + err.message);
    } finally {
      setTimeout(() => setDownloading(false), 800);
    }
  };

  const copyToClipboard = async (text, label) => {
    if (!text || text === "N/A") return;
    await Clipboard.setStringAsync(text);
    showAlert("Copied", `${label || "Value"} copied to clipboard.`);
  };

  // ==========================================
  // VIEW 1: SELECTION & VERIFY FORM
  // ==========================================
  if (view === "main") {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>BVN Verification Desk</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <LinearGradient
            colors={["#0369a1", "#0f172a"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroBanner}
          >
            <View style={styles.bannerIconWrap}>
              <MaterialCommunityIcons name="shield-account" size={30} color="#00f0ff" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.bannerTitle}>BVN Verification & Reprint</Text>
              <Text style={styles.bannerSub}>
                Verify banking identity records and print verified regular or premium BVN slips.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Select Verification Slip Format</Text>

            <View style={styles.tierContainer}>
              {bvnTiers.map((tier) => {
                const isSelected = selectedTier === tier.id;
                const cost = prices[tier.id] || 150;

                return (
                  <TouchableOpacity
                    key={tier.id}
                    style={[styles.tierBox, isSelected && styles.tierBoxActive]}
                    onPress={() => setSelectedTier(tier.id)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Ionicons
                        name={isSelected ? "radio-button-on" : "radio-button-off"}
                        size={20}
                        color={isSelected ? "#00f0ff" : "#64748b"}
                      />
                      <View style={{ marginLeft: 12, flex: 1 }}>
                        <Text style={[styles.tierTitle, isSelected && { color: "#fff" }]}>
                          {tier.name}
                        </Text>
                        <Text style={styles.tierDesc}>{tier.desc}</Text>
                        <Text style={styles.tierPrice}>Fee: ₦{cost.toLocaleString()}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 20 }]}>Bank Verification Number (11 Digits)</Text>
            <TextInput
              placeholder="Enter 11-digit BVN"
              placeholderTextColor="#64748b"
              style={styles.textInput}
              value={bvnNumber}
              onChangeText={setBvnNumber}
              maxLength={11}
              keyboardType="numeric"
            />

            <View style={styles.feeBreakdownBox}>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Category Desk</Text>
                <Text style={[styles.feeRowVal, { color: "#38bdf8" }]}>BVN IDENTITY LOOKUP</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Document Format</Text>
                <Text style={styles.feeRowVal}>
                  {selectedTier === "bvn_premium" ? "Premium Card Slip" : "Full Details Slip"}
                </Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Official Portal Fee</Text>
                <Text style={[styles.feeRowVal, { color: "#10b981" }]}>
                  ₦{(prices[selectedTier] || 150).toLocaleString()}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleInitiate}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#0284c7", "#2563eb"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <FontAwesome5 name="print" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>
                  VERIFY & PRINT BVN SLIP (₦{(prices[selectedTier] || 150).toLocaleString()})
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={pinModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="shield-checkmark" size={36} color="#00f0ff" style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitle}>Enter Security PIN</Text>
              <Text style={styles.modalSubtitle}>
                Authorize ₦{(prices[selectedTier] || 150).toLocaleString()} fee for {selectedTier === "bvn_premium" ? "Premium Slip" : "Full Details Slip"}
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
                onPress={handleVerifyBVN}
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
                style={{ marginTop: 14 }}
              >
                <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ==========================================
  // VIEW 2: PROFILE & SLIP RESULT SCREEN
  // ==========================================
  const rawUser = slipResult?.userData || {};
  const fullName =
    rawUser.fullName ||
    rawUser.name ||
    `${rawUser.firstName || rawUser.firstname || ""} ${rawUser.middleName || rawUser.middlename || ""} ${rawUser.lastName || rawUser.surname || ""}`.trim() ||
    "Verified Citizen";

  const resolvedBvn = String(
    rawUser.bvn ||
    rawUser.bvnNumber ||
    slipResult?.bvn ||
    bvnNumber ||
    "N/A"
  ).trim();

  const photo = rawUser.photo || rawUser.image || rawUser.base64Image;

  const resolvedAddress = String(
    rawUser.address ||
    rawUser.residentialAddress ||
    rawUser.residence_address ||
    [rawUser.lga, rawUser.state].filter(Boolean).join(", ") ||
    "N/A"
  ).trim();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={() => {
            setView("main");
            setBvnNumber("");
            setSlipResult(null);
          }}
          style={styles.backBtn}
        >
          <Ionicons name="close" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verified BVN Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        <View style={styles.resultCard}>
          <View style={styles.photoContainer}>
            {photo ? (
              <Image
                source={{
                  uri: String(photo).startsWith("data:image")
                    ? photo
                    : `data:image/jpeg;base64,${photo}`,
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
              <Text style={styles.statusVerifiedText}>BVN VERIFIED</Text>
            </View>
          </View>

          <View style={styles.detailsList}>
            <ResultRow label="Full Legal Name" value={fullName} />
            <ResultRow
              label="Bank Verification Number (BVN)"
              value={resolvedBvn}
              copyable
              onCopy={() => copyToClipboard(resolvedBvn, "BVN")}
            />
            <ResultRow
              label="NIN Number"
              value={rawUser.nin || rawUser.ninNumber || "N/A"}
              copyable
              onCopy={() => copyToClipboard(rawUser.nin || rawUser.ninNumber, "NIN")}
            />
            <ResultRow
              label="Registration Date of Birth"
              value={rawUser.dob || rawUser.dateOfBirth || rawUser.birthdate || "N/A"}
            />
            <ResultRow
              label="Gender"
              value={(rawUser.gender || "N/A").toUpperCase()}
            />
            <ResultRow
              label="Document Format"
              value={slipResult?.slipType || "Full Details Slip"}
            />
            <ResultRow label="Residential Address" value={resolvedAddress} />
          </View>

          <TouchableOpacity
            style={[styles.downloadBigBtn, downloading && { opacity: 0.7 }]}
            onPress={downloadSlipFile}
            disabled={downloading}
            activeOpacity={0.85}
          >
            {downloading ? (
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
            ) : (
              <MaterialCommunityIcons name="file-download-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            )}
            <Text style={styles.downloadBigBtnText}>
              {downloading ? "PREPARING SLIP..." : "DOWNLOAD OFFICIAL SLIP (PDF)"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.newSearchBtn}
            onPress={() => {
              setView("main");
              setBvnNumber("");
              setSlipResult(null);
            }}
          >
            <Text style={styles.newSearchBtnText}>Perform New Verification</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const ResultRow = ({ label, value, copyable, onCopy }) => (
  <View style={styles.resultRowContainer}>
    <View style={{ flex: 1 }}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
    </View>
    {copyable && value !== "N/A" && (
      <TouchableOpacity onPress={onCopy} style={styles.copySmallBtn}>
        <Ionicons name="copy-outline" size={14} color="#00f0ff" />
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#00f0ff",
  },
  bannerIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerTitle: { color: "#fff", fontSize: 15.5, fontWeight: "900" },
  bannerSub: { color: "#cbd5e1", fontSize: 11, marginTop: 3, lineHeight: 16 },
  card: {
    backgroundColor: "#0b1120",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  sectionLabel: { color: "#64748b", fontSize: 10.5, fontWeight: "800", marginBottom: 10, letterSpacing: 0.5 },
  tierContainer: { gap: 10 },
  tierBox: {
    backgroundColor: "#050811",
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
    borderRadius: 14,
  },
  tierBoxActive: {
    borderColor: "#00f0ff",
    backgroundColor: "rgba(0, 240, 255, 0.05)",
  },
  tierTitle: { color: "#94a3b8", fontSize: 13.5, fontWeight: "800" },
  tierDesc: { color: "#64748b", fontSize: 10.5, marginTop: 2, lineHeight: 14 },
  tierPrice: { color: "#10b981", fontSize: 12.5, fontWeight: "900", marginTop: 4 },
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
    marginVertical: 4,
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
    height: 125,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "#00f0ff",
  },
  photoPlaceholder: {
    width: 110,
    height: 125,
    borderRadius: 14,
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
  resultValue: { color: "#f8fafc", fontSize: 13, fontWeight: "800", marginTop: 2, textAlign: "right" },
  copySmallBtn: { padding: 6, backgroundColor: "rgba(0, 240, 255, 0.1)", borderRadius: 6, marginLeft: 8 },
  downloadBigBtn: {
    width: "100%",
    backgroundColor: "#16a34a",
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  downloadBigBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.5 },
  newSearchBtn: { marginTop: 14, padding: 8 },
  newSearchBtnText: { color: "#00f0ff", fontSize: 12, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 340,
    backgroundColor: "#0b1120",
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  modalSubtitle: { color: "#64748b", fontSize: 11, textAlign: "center", marginVertical: 8 },
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