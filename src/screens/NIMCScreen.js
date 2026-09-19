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

const searchOptions = [
  {
    id: "nin",
    name: "NIN Number Search",
    placeholder: "Enter 11-digit NIN (e.g. 12345678901)",
    icon: "fingerprint",
    length: 11,
    desc: "Direct verification using national identity number",
  },
  {
    id: "phone",
    name: "Phone Number Search",
    placeholder: "Enter Linked Phone Number (e.g. 08012345678)",
    icon: "phone-alt",
    length: 14,
    desc: "Fetch identity profile linked to SIM number",
  },
  {
    id: "trackingId",
    name: "Tracking ID Search",
    placeholder: "Enter NIMC Tracking ID (e.g. TRK12345XYZ)",
    icon: "barcode",
    length: 20,
    desc: "Retrieve slip with NIMC enrollment tracking code",
  },
  {
    id: "standardSlip",
    name: "Standard NIN Slip",
    placeholder: "Enter 11-digit NIN or Tracking ID",
    icon: "file-alt",
    length: 20,
    desc: "Official full details identification printable slip",
  },
  {
    id: "premiumCard",
    name: "Premium ID Card Slip",
    placeholder: "Enter 11-digit NIN",
    icon: "id-card",
    length: 11,
    desc: "Wallet plastic-sized ready-to-laminate NIN card",
  },
  {
    id: "basicSlip",
    name: "Basic Identification Slip",
    placeholder: "Enter 11-digit NIN",
    icon: "print",
    length: 11,
    desc: "Official regular slip with Tracking ID and residential address",
  },
];

const NIMCScreen = ({ navigation }) => {
  const [view, setView] = useState("main");
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  const [prices, setPrices] = useState({
    nin: 150,
    phone: 200,
    trackingId: 150,
    standardSlip: 200,
    premiumCard: 300,
    basicSlip: 100,
  });
  const [fetchingPrices, setFetchingPrices] = useState(true);

  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPriceModal, setAdminPriceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);
  const [returnedBase64Pdf, setReturnedBase64Pdf] = useState(null);

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

  const fetchLivePrices = useCallback(async () => {
    try {
      setFetchingPrices(true);
      const res = await axios.get(`${BASE_URL}/nimc/prices`, { timeout: 10000 });
      if (res.data?.success && res.data?.prices) {
        if (typeof res.data.prices === "object" && !Array.isArray(res.data.prices)) {
          setPrices((prev) => ({ ...prev, ...res.data.prices }));
        } else if (Array.isArray(res.data.prices)) {
          const map = {};
          res.data.prices.forEach((p) => {
            if (p.serviceType) map[p.serviceType] = p.amount;
          });
          setPrices((prev) => ({ ...prev, ...map }));
        }
      }
    } catch (err) {
      console.log("Prices fallback active:", err.message);
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
          setIsAdmin(parsed.role === "admin" || parsed.isAdmin === true || parsed.role === "superadmin");
        }
      } catch (e) {}
    };
    checkRole();
    fetchLivePrices();
  }, [fetchLivePrices]);

  const handleSaveAdminPrice = async () => {
    const numericPrice = Number(newPriceInput);
    if (!newPriceInput || isNaN(numericPrice) || numericPrice < 0) {
      return showAlert("Error", "Please enter a valid numeric price.");
    }

    if (!editingService?.id) {
      return showAlert("Error", "No service selected.");
    }

    setUpdatingPrice(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/nimc/admin/set-price`,
        {
          serviceType: editingService.id,
          amount: numericPrice,
          name: editingService.name,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 15000,
        }
      );

      if (res.data?.success) {
        setPrices((prev) => ({ ...prev, [editingService.id]: numericPrice }));
        setAdminPriceModal(false);
        setNewPriceInput("");
        showAlert("Updated", `${editingService.name} price updated to ₦${numericPrice.toLocaleString()}`);
      } else {
        throw new Error(res.data?.message || "Failed to update price.");
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

  const handleInitiateVerification = () => {
    if (!searchValue.trim() || searchValue.trim().length < 6) {
      return showAlert(
        "Invalid Input",
        `Please enter a valid ${selectedSearch?.name || "ID / Number"}.`
      );
    }
    setPinModalVisible(true);
  };

  const handleVerification = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Security PIN", "Please enter your 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = (await AsyncStorage.getItem("userToken")) || (await AsyncStorage.getItem("token"));
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const serviceId = selectedSearch?.id || "nin";
      const activeAmount = prices[serviceId] || 150;

      let cleanInput = searchValue.trim();
      let payload = {
        serviceType: serviceId,
        type: serviceId,
        amount: activeAmount,
        pin: pin.trim(),
        transactionPin: pin.trim(),
        format: "pdf",
        generatePdf: true,
      };

      if (serviceId === "phone") {
        let phoneDigits = cleanInput.replace(/\D/g, "");
        if (phoneDigits.startsWith("234") && phoneDigits.length >= 13) {
          phoneDigits = "0" + phoneDigits.slice(3);
        } else if (phoneDigits.length === 10 && !phoneDigits.startsWith("0")) {
          phoneDigits = "0" + phoneDigits;
        }
        payload.phone = phoneDigits;
        payload.phoneNumber = phoneDigits;
        payload.searchValue = phoneDigits;
      } else if (serviceId === "trackingId") {
        payload.trackingId = cleanInput;
        payload.searchValue = cleanInput;
      } else {
        payload.nin = cleanInput;
        payload.ninNumber = cleanInput;
        payload.searchValue = cleanInput;
      }

      let res;
      try {
        res = await axios.post(`${BASE_URL}/nimc/submit`, payload, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 55000,
        });
      } catch (routeErr) {
        if (routeErr.response?.status === 404) {
          res = await axios.post(`${BASE_URL}/nimc/submit-request`, payload, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 55000,
          });
        } else {
          throw routeErr;
        }
      }

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        const parsedData = result.data || result.user_data || result;
        setUserData(parsedData);
        setReturnedBase64Pdf(result.pdf_base64 || parsedData.pdf_base64 || null);
        setView("result");
      } else {
        throw new Error(result.message || "Verification failed. Check your input.");
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

  const handleDownloadPDF = async () => {
    if (returnedBase64Pdf) {
      try {
        let base64String = returnedBase64Pdf;
        if (base64String.startsWith("data:application/pdf;base64,")) {
          base64String = base64String.replace("data:application/pdf;base64,", "");
        }

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
          link.download = `NIN_Slip_${userData?.nin || Date.now()}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          return;
        }
      } catch (e) {
        console.warn("Base64 decoding failed:", e);
      }
    }

    const directPdf =
      userData?.pdfUrl ||
      userData?.slipUrl ||
      userData?.downloadUrl ||
      userData?.fileUrl ||
      userData?.url ||
      userData?.slip;

    if (directPdf && typeof directPdf === "string" && directPdf.startsWith("http")) {
      if (Platform.OS === "web") {
        window.open(directPdf, "_blank");
      } else {
        await Linking.openURL(directPdf);
      }
      return;
    }

    const rawFullName = (
      userData?.fullName ||
      userData?.name ||
      `${userData?.firstName || userData?.firstname || ""} ${userData?.middleName || userData?.middlename || ""} ${userData?.surname || ""}`
    ).trim();

    const nameParts = rawFullName.split(/\s+/).filter(Boolean);
    const surname = (userData?.surname || userData?.last_name || nameParts[0] || "CITIZEN").toUpperCase();
    const firstName = (userData?.firstName || userData?.firstname || nameParts[1] || "").toUpperCase();
    const middleName = (userData?.middleName || userData?.middlename || nameParts.slice(2).join(" ") || "").toUpperCase();

    const rawNin = String(
      userData?.nin || userData?.ninNumber || userData?.idNumber || searchValue || ""
    ).replace(/\D/g, "");
    const nin = rawNin.length === 11 ? rawNin : "00000000000";

    const trackingId = String(
      userData?.trackingId ||
      userData?.tracking_id ||
      userData?.trackingID ||
      userData?.trackingNo ||
      "TRK" + nin.slice(-8)
    ).toUpperCase();

    const gender = (userData?.gender || "MALE").toUpperCase();
    const address = String(
      userData?.address ||
      userData?.residence_address ||
      userData?.residence_AdressLine1 ||
      [userData?.residence_town, userData?.lga, userData?.state].filter(Boolean).join(", ") ||
      "N/A"
    ).toUpperCase();

    const userPhoto = userData?.photo || userData?.image
      ? (String(userData.photo || userData.image).startsWith("data:image")
          ? (userData.photo || userData.image)
          : `data:image/jpeg;base64,${userData.photo || userData.image}`)
      : "https://via.placeholder.com/150";

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>NIMC Basic Regular Slip - ${nin}</title>
              <style>
                * { box-sizing: border-box; margin: 0; padding: 0; }
                body { font-family: Arial, Helvetica, sans-serif; background: #fff; padding: 20px; }
                .regular-card { width: 780px; margin: 0 auto; background: #fff; border: 2px solid #000; }
                .regular-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 18px; border-bottom: 2px solid #000; }
                .regular-table { width: 100%; border-collapse: collapse; font-size: 11px; }
                .regular-table td { border: 1px solid #000; padding: 6px 8px; }
                .regular-disclaimer { padding: 8px 10px; font-size: 9px; border-bottom: 2px solid #000; line-height: 14px; }
                .regular-footer { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 9px; }
                @media print { body { padding: 0; } @page { size: auto; margin: 5mm; } }
              </style>
            </head>
            <body onload="setTimeout(function(){ window.print(); }, 400);">
              <div class="regular-card">
                <div class="regular-header">
                  <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 55px;" />
                  <div style="text-align: center;">
                    <div style="font-size: 16px; font-weight: bold;">National Identity Management System</div>
                    <div style="font-size: 13px;">Federal Republic of Nigeria</div>
                    <div style="font-size: 11px; font-weight: bold; margin-top: 2px;">National Identification Number Slip (NINS)</div>
                  </div>
                  <img src="https://nimc.gov.ng/wp-content/uploads/2020/07/nimc-logo.png" style="height: 46px;" />
                </div>
                <table class="regular-table">
                  <tr>
                    <td style="width: 15%; font-weight: bold;">Tracking ID:</td>
                    <td style="width: 25%; font-weight: bold; color: #000;">${trackingId}</td>
                    <td style="width: 15%; font-weight: bold;">Surname:</td>
                    <td style="width: 20%; font-weight: bold;">${surname}</td>
                    <td style="width: 10%; font-weight: bold;">Address:</td>
                    <td rowspan="4" style="width: 15%; text-align: center; vertical-align: middle; padding: 4px;">
                      <img src="${userPhoto}" style="width: 105px; height: 125px; border: 1px solid #000; object-fit: cover; display: block; margin: 0 auto;" />
                    </td>
                  </tr>
                  <tr>
                    <td style="font-weight: bold;">NIN:</td>
                    <td style="font-weight: bold; font-size: 13px;">${nin}</td>
                    <td style="font-weight: bold;">First Name:</td>
                    <td style="font-weight: bold;">${firstName}</td>
                    <td rowspan="3" style="vertical-align: top; line-height: 14px; font-size: 10px;">
                      ${address}
                    </td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td style="font-weight: bold;">Middle Name:</td>
                    <td>${middleName}</td>
                  </tr>
                  <tr>
                    <td></td>
                    <td></td>
                    <td style="font-weight: bold;">Gender:</td>
                    <td>${gender}</td>
                  </tr>
                </table>
                <div class="regular-disclaimer">
                  <strong>Note:</strong> The National Identification Number (NIN) is your identity. It is confidential and may only be released for legitimate transactions.<br/>
                  You will be notified when your National Identity Card is ready.
                </div>
                <div class="regular-footer">
                  <div>✉ helpdesk@nimc.gov.ng</div>
                  <div>🌐 www.nimc.gov.ng</div>
                  <div>📞 0700-CALL-NIMC</div>
                  <div style="text-align: right;">
                    <strong>National Identity Management Commission</strong>
                  </div>
                </div>
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } else {
      showAlert("Slip Ready", "Your official NIMC document is ready.");
    }
  };

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showAlert("Copied", `${label || "Value"} copied to clipboard.`);
  };

  const resolvedAddress = String(
    userData?.address ||
    userData?.residence_address ||
    userData?.residence_AdressLine1 ||
    [userData?.residence_town, userData?.lga, userData?.state].filter(Boolean).join(", ") ||
    "N/A"
  ).trim();

  const trackingIdValue = String(
    userData?.trackingId ||
    userData?.tracking_id ||
    userData?.trackingID ||
    userData?.trackingNo ||
    "N/A"
  ).trim();

  if (view === "main" && !selectedSearch) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Verification Desk</Text>
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
              <MaterialCommunityIcons name="printer-check" size={32} color="#00f0ff" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.bannerTitle}>NIMC Verification & Slip Printing</Text>
              <Text style={styles.bannerSub}>
                Verify identity records and reprint official Standard, Premium, or Regular slips instantly.
              </Text>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeadingRow}>
            <Text style={styles.sectionHeading}>VERIFICATION & REPRINT CHANNELS</Text>
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>6 Channels</Text>
            </View>
          </View>

          <View style={styles.gridContainer}>
            {searchOptions.map((opt) => {
              const currentPrice = prices[opt.id] || 150;
              return (
                <TouchableOpacity
                  key={opt.id}
                  style={styles.serviceBox}
                  onPress={() => setSelectedSearch(opt)}
                  activeOpacity={0.8}
                >
                  <View style={styles.boxHeader}>
                    <View style={styles.iconCircle}>
                      <FontAwesome5 name={opt.icon} size={18} color="#00f0ff" />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>SLIP PRINT</Text>
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
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  <Text style={styles.boxTitle}>{opt.name}</Text>
                  <Text style={styles.boxDesc} numberOfLines={2}>
                    {opt.desc}
                  </Text>

                  <View style={styles.priceContainer}>
                    <Text style={styles.priceLabel}>Fee:</Text>
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
              <Text style={styles.modalTitle}>Update Service Price</Text>
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

  if (view === "main" && selectedSearch) {
    const activePrice = prices[selectedSearch.id] || 150;

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => setSelectedSearch(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedSearch.name}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.formCard}>
            <Text style={styles.inputLabel}>IDENTIFICATION NUMBER / VALUE</Text>
            <TextInput
              placeholder={selectedSearch.placeholder}
              placeholderTextColor="#64748b"
              style={styles.textInput}
              value={searchValue}
              onChangeText={setSearchValue}
              maxLength={selectedSearch.length}
              keyboardType={selectedSearch.id === "phone" || selectedSearch.id === "nin" ? "numeric" : "default"}
            />

            <View style={styles.feeBreakdownBox}>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Category Desk</Text>
                <Text style={[styles.feeRowVal, { color: "#38bdf8" }]}>SLIP REPRINT & VERIFICATION</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Service Channel</Text>
                <Text style={styles.feeRowVal}>{selectedSearch.name}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Official Portal Fee</Text>
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
                  VERIFY & PRINT SLIP (₦{Number(activePrice).toLocaleString()})
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
                Authorize ₦{Number(activePrice).toLocaleString()} fee for {selectedSearch.name}
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

  if (view === "result") {
    const fullName =
      userData?.fullName ||
      userData?.name ||
      `${userData?.firstName || userData?.firstname || ""} ${userData?.middleName || userData?.middlename || ""} ${userData?.surname || ""}`.trim() ||
      "N/A";

    const resolvedNin =
      userData?.nin ||
      userData?.ninNumber ||
      userData?.idNumber ||
      userData?.details?.nin ||
      userData?.details?.data?.nin ||
      searchValue ||
      "N/A";

    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity
            onPress={() => {
              setView("main");
              setSelectedSearch(null);
              setSearchValue("");
              setReturnedBase64Pdf(null);
            }}
            style={styles.backBtn}
          >
            <Ionicons name="close" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verified NIMC Profile</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
          <View style={styles.resultCard}>
            <View style={styles.photoContainer}>
              {userData?.photo || userData?.image ? (
                <Image
                  source={{
                    uri: String(userData.photo || userData.image).startsWith("data:image")
                      ? userData.photo || userData.image
                      : `data:image/jpeg;base64,${userData.photo || userData.image}`,
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
                <Text style={styles.statusVerifiedText}>NIMC VERIFIED</Text>
              </View>
            </View>

            <View style={styles.detailsList}>
              <ResultRow label="Full Legal Name" value={fullName} />
              <ResultRow
                label="National Identity Number (NIN)"
                value={resolvedNin}
                copyable
                onCopy={() => copyToClipboard(resolvedNin, "NIN")}
              />
              <ResultRow
                label="NIMC Tracking ID"
                value={trackingIdValue}
                copyable
                highlight
                onCopy={() => copyToClipboard(trackingIdValue, "Tracking ID")}
              />
              <ResultRow label="Date of Birth" value={userData?.birthdate || userData?.dob || "N/A"} />
              <ResultRow label="Gender" value={(userData?.gender || "N/A").toUpperCase()} />
              <ResultRow label="Residential Address" value={resolvedAddress} />
            </View>

            <TouchableOpacity style={styles.downloadPdfBtn} onPress={handleDownloadPDF} activeOpacity={0.85}>
              <MaterialCommunityIcons name="file-download-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
              <Text style={styles.downloadPdfBtnText}>DOWNLOAD OFFICIAL SLIP (PDF)</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return null;
};

const ResultRow = ({ label, value, copyable, highlight, onCopy }) => (
  <View style={styles.resultRowContainer}>
    <View style={{ flex: 1 }}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={[styles.resultValue, highlight && { color: "#00f0ff", fontWeight: "900" }]}>{value}</Text>
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
  sectionHeadingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 12,
  },
  sectionHeading: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
  },
  badgeCount: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeCountText: {
    color: "#38bdf8",
    fontSize: 10,
    fontWeight: "900",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  serviceBox: {
    backgroundColor: "#0b1120",
    width: (width - 44) / 2,
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
    borderRadius: 12,
    backgroundColor: "#071328",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 240, 255, 0.2)",
  },
  categoryTag: {
    backgroundColor: "rgba(2, 132, 199, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 5,
    marginRight: 4,
  },
  categoryTagText: {
    color: "#38bdf8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  adminEditPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  boxTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  boxDesc: { color: "#64748b", fontSize: 10.5, marginTop: 4, lineHeight: 14, minHeight: 28 },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.05)",
  },
  priceLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  priceValue: { color: "#10b981", fontSize: 13.5, fontWeight: "900" },
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
  downloadPdfBtn: {
    width: "100%",
    backgroundColor: "#16a34a",
    flexDirection: "row",
    paddingVertical: 15,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 18,
  },
  downloadPdfBtnText: { color: "#fff", fontWeight: "900", fontSize: 12.5, letterSpacing: 0.5 },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
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

export default NIMCScreen;