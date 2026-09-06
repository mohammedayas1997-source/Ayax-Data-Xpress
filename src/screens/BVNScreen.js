import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
  Linking,
} from "react-native";
import {
  Ionicons,
  MaterialCommunityIcons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
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
    if (!pin || pin.length < 4) {
      return showAlert("Security PIN", "Please enter your 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.");
      }

      const activeAmount = prices[selectedTier] || 150;
      const cleanBvn = bvnNumber.replace(/\D/g, "").trim();

      const res = await axios.post(
        `${BASE_URL}/bvn/verify-and-generate`,
        {
          bvn: cleanBvn,
          bvnNumber: cleanBvn,
          serviceType: selectedTier,
          amount: activeAmount,
          pin: pin.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 65000,
        }
      );

      const result = res.data;

      const isOk =
        result.success === true ||
        result.status === "success" ||
        String(result.message || "").toLowerCase().includes("pdf generated");

      if (isOk) {
        setPinModalVisible(false);
        setPin("");

        let resolvedPdfUrl =
          result.slipUrl ||
          result.pdfUrl ||
          result.downloadUrl ||
          result.url ||
          result.data?.slipUrl ||
          result.data?.pdfUrl ||
          result.data?.downloadUrl ||
          null;

        if (resolvedPdfUrl && !String(resolvedPdfUrl).startsWith("http")) {
          resolvedPdfUrl = `https://abjiktech.com.ng/${String(resolvedPdfUrl).replace(/^\/+/, "")}`;
        }

        setSlipResult({
          bvn: cleanBvn,
          slipType: selectedTier === "bvn_premium" ? "Premium Slip" : "Full Details Slip",
          url: resolvedPdfUrl,
        });

        setView("result");
      } else {
        throw new Error(result.message || "Failed to generate BVN slip.");
      }
    } catch (err) {
      showAlert(
        "Verification Failed",
        err.response?.data?.message || err.message || "Service request timed out."
      );
    } finally {
      setLoading(false);
    }
  };

const downloadSlipFile = async () => {
    const targetUrl = slipResult?.url;
    if (!targetUrl) {
      return showAlert("Notice", "Document link is not available.");
    }

    try {
      setLoading(true);

      // Idan a Yanar Gizo (Web/Browser) ne
      if (Platform.OS === "web") {
        const response = await fetch(targetUrl);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = `BVN_${slipResult?.bvn || "SLIP"}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Idan a waya ce (Android/iOS)
        await Linking.openURL(targetUrl);
      }
    } catch (err) {
      // Idan server din uwar garke ta toshe direct fetch, bude shi a sabon shafi a matsayin fallback
      if (Platform.OS === "web") {
        window.open(targetUrl, "_blank");
      } else {
        showAlert("Download Notice", "Could not complete download: " + err.message);
      }
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.headerTitle}>BVN Verification</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={styles.pageSub}>
            Verify a Bank Verification Number (BVN) using your preferred method. Enter the required details and your transaction PIN.
          </Text>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Select Slip Type</Text>

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
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.tierTitle, isSelected && { color: "#fff" }]}>
                          {tier.name}
                        </Text>
                        <Text style={styles.tierPrice}>NGN {cost}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>BVN Number</Text>
            <TextInput
              placeholder="Enter 11-digit BVN"
              placeholderTextColor="#64748b"
              style={styles.textInput}
              value={bvnNumber}
              onChangeText={setBvnNumber}
              maxLength={11}
              keyboardType="numeric"
            />

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleInitiate}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#dc2626", "#b91c1c"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnGradient}
              >
                <FontAwesome5 name="check-circle" size={16} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.actionBtnText}>Verify BVN (NGN {prices[selectedTier] || 150})</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <Modal visible={pinModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Ionicons name="shield-checkmark" size={36} color="#00f0ff" style={{ marginBottom: 10 }} />
              <Text style={styles.modalTitle}>Transaction PIN</Text>
              <Text style={styles.modalSubtitle}>
                Authorize NGN {prices[selectedTier] || 150} for {selectedTier === "bvn_premium" ? "Premium Slip" : "Full Details Slip"}
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
                  <Text style={styles.modalSubmitBtnText}>Authorize & Generate</Text>
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
  // VIEW 2: SUCCESS & DOWNLOAD SCREEN
  // ==========================================
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
        <Text style={styles.headerTitle}>Official BVN Document</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={styles.resultCard}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark-done-circle" size={54} color="#10b981" />
          </View>

          <Text style={styles.resultTitle}>Verification Successful!</Text>
          <Text style={styles.resultSub}>
            Your official government-standard BVN slip has been generated and is ready for immediate access.
          </Text>

          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>BVN Number</Text>
              <Text style={styles.infoValue}>{slipResult?.bvn}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Document Tier</Text>
              <Text style={styles.infoValue}>{slipResult?.slipType}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status</Text>
              <Text style={[styles.infoValue, { color: "#10b981" }]}>Verified & Available</Text>
            </View>
          </View>

          {/* DIRECT PDF OPEN/DOWNLOAD BUTTON */}
          {Platform.OS === "web" && slipResult?.url ? (
            <a
              href={slipResult.url}
              target="_blank"
              rel="noopener noreferrer"
              download={`BVN_${slipResult?.bvn || "SLIP"}.pdf`}
              style={{ width: "100%", textDecoration: "none" }}
            >
              <View style={styles.downloadBigBtn}>
                <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.downloadBigBtnText}>OPEN & DOWNLOAD OFFICIAL SLIP (PDF)</Text>
              </View>
            </a>
          ) : (
            <TouchableOpacity style={styles.downloadBigBtn} onPress={openDocument} activeOpacity={0.85}>
              <MaterialCommunityIcons name="file-pdf-box" size={22} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.downloadBigBtnText}>OPEN & DOWNLOAD OFFICIAL SLIP (PDF)</Text>
            </TouchableOpacity>
          )}

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050811", paddingHorizontal: 16 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 52 : 38,
    paddingBottom: 12,
  },
  headerTitle: { color: "#f8fafc", fontSize: 17, fontWeight: "900" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  pageSub: { color: "#94a3b8", fontSize: 12, lineHeight: 18, marginBottom: 18 },
  card: {
    backgroundColor: "#0b1120",
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  sectionLabel: { color: "#cbd5e1", fontSize: 12, fontWeight: "800", marginBottom: 10 },
  tierContainer: { gap: 12 },
  tierBox: {
    backgroundColor: "#050811",
    borderWidth: 1.5,
    borderColor: "#1e293b",
    padding: 16,
    borderRadius: 14,
  },
  tierBoxActive: {
    borderColor: "#00f0ff",
    backgroundColor: "rgba(0, 240, 255, 0.05)",
  },
  tierTitle: { color: "#94a3b8", fontSize: 14, fontWeight: "800" },
  tierPrice: { color: "#dc2626", fontSize: 13, fontWeight: "900", marginTop: 2 },
  textInput: {
    backgroundColor: "#050811",
    paddingHorizontal: 14,
    height: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    fontSize: 16,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
  },
  actionBtn: { borderRadius: 12, overflow: "hidden" },
  actionBtnGradient: {
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  actionBtnText: { color: "#fff", fontWeight: "900", fontSize: 14 },
  resultCard: {
    backgroundColor: "#0b1120",
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    marginTop: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  resultTitle: { color: "#f8fafc", fontSize: 18, fontWeight: "900" },
  resultSub: { color: "#94a3b8", fontSize: 12, textAlign: "center", marginTop: 6, lineHeight: 18 },
  infoBox: {
    width: "100%",
    backgroundColor: "#050811",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 14,
    marginVertical: 20,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 5,
  },
  infoLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  infoValue: { color: "#f8fafc", fontSize: 13, fontWeight: "bold" },
  downloadBigBtn: {
    width: "100%",
    backgroundColor: "#dc2626",
    paddingVertical: 15,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  downloadBigBtnText: { color: "#fff", fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  newSearchBtn: { marginTop: 16, padding: 8 },
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
    backgroundColor: "#dc2626",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSubmitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});

export default BVNScreen;