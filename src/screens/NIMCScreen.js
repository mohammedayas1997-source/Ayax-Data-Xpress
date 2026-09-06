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
    length: 11,
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
    desc: "Concise confirmation paper format slip",
  },
];

const NIMCScreen = ({ navigation }) => {
  const [view, setView] = useState("main");
  const [selectedSearch, setSelectedSearch] = useState(null);
  const [searchValue, setSearchValue] = useState("");

  // Prices State (Live from backend)
  const [prices, setPrices] = useState({
    nin: 100,
    phone: 150,
    trackingId: 100,
    standardSlip: 200,
    premiumCard: 300,
    basicSlip: 100,
  });
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // Admin Control States
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminPriceModal, setAdminPriceModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [newPriceInput, setNewPriceInput] = useState("");
  const [updatingPrice, setUpdatingPrice] = useState(false);

  // Verification & PIN States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState(null);

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
      console.log("Prices fetch fallback:", err.message);
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
          setIsAdmin(parsed.role === "admin" || parsed.isAdmin === true);
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

    if (!editingService?.id) {
      return showAlert("Error", "No service selected for price update.");
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

  // 3. Initiate Verification & Prompt Security PIN
  const handleInitiateVerification = () => {
    if (!searchValue.trim() || searchValue.trim().length < 6) {
      return showAlert(
        "Invalid Input",
        `Please enter a valid ${selectedSearch?.name || "ID / Number"}.`
      );
    }
    setPinModalVisible(true);
  };

  // 4. Verify & Fetch Slip Data
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

      const serviceId = selectedSearch?.id || "nin";
      const activeAmount = prices[serviceId] || 100;

      const res = await axios.post(
        `${BASE_URL}/nimc/submit-request`,
        {
          nin: searchValue.trim(),
          searchValue: searchValue.trim(),
          serviceType: serviceId,
          amount: activeAmount,
          pin: pin.trim(),
          transactionPin: pin.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 35000,
        }
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");
        setUserData(result.data || result);
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
    // 1. Idan uwar garke ta bayar da direct PDF link, buɗe shi
    if (userData?.pdfUrl || userData?.slipUrl) {
      const url = userData.pdfUrl || userData.slipUrl;
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        await Linking.openURL(url);
      }
      return;
    }

    // 2. Ciro dukkan bayanan mutum
    const fullName =
      userData?.fullName ||
      userData?.name ||
      `${userData?.firstName || userData?.firstname || ""} ${userData?.middleName || userData?.middlename || ""} ${userData?.surname || ""}`.trim();
    const surname = userData?.surname || fullName.split(" ")[0] || "N/A";
    const givenNames =
      userData?.firstname || userData?.firstName
        ? `${userData?.firstname || userData?.firstName} ${userData?.middlename || userData?.middleName || ""}`.trim()
        : fullName.replace(surname, "").trim() || "N/A";

    const nin = userData?.nin || userData?.ninNumber || "N/A";
    const formattedNin = nin.length === 11 ? `${nin.slice(0, 4)} ${nin.slice(4, 7)} ${nin.slice(7)}` : nin;
    const trackingId = userData?.trackingId || userData?.tracking_id || "N/A";
    const dob = userData?.birthdate || userData?.dob || "N/A";
    const gender = (userData?.gender || "MALE").toUpperCase();
    const address = userData?.residence_address || userData?.address || "N/A";
    const lga = userData?.lga || userData?.lgaOfOrigin || "";
    const state = userData?.state || userData?.stateOfOrigin || "";

    const userPhoto = userData?.photo
      ? (userData.photo.startsWith("data:image") ? userData.photo : `data:image/jpeg;base64,${userData.photo}`)
      : "https://via.placeholder.com/150";

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `NIN:${nin}|Name:${fullName}|DOB:${dob}|Gender:${gender}`
    )}`;

    const selectedType = selectedSearch?.id || "standardSlip";

    // 3. Zana Template gwargwadon wanda aka zaɓa
    let slipHtmlContent = "";

    if (selectedType === "basicSlip") {
      // KALA TA 1: REGULAR WHITE SLIP (NINS)
      slipHtmlContent = `
        <div style="border: 2px solid #000; width: 750px; margin: 20px auto; font-family: Arial, sans-serif; background: #fff;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; border-bottom: 2px solid #000;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 60px;" />
            <div style="text-align: center;">
              <h2 style="margin: 0; font-size: 18px;">National Identity Management System</h2>
              <h3 style="margin: 2px 0; font-size: 14px;">Federal Republic of Nigeria</h3>
              <p style="margin: 0; font-size: 12px; font-weight: bold;">National Identification Number Slip (NINS)</p>
            </div>
            <img src="https://nimc.gov.ng/wp-content/uploads/2020/07/nimc-logo.png" style="height: 50px;" />
          </div>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr>
              <td style="border: 1px solid #000; padding: 6px; width: 15%;"><strong>Tracking ID:</strong></td>
              <td style="border: 1px solid #000; padding: 6px; width: 35%;">${trackingId}</td>
              <td style="border: 1px solid #000; padding: 6px; width: 15%;"><strong>Address:</strong></td>
              <td rowspan="4" style="border: 1px solid #000; padding: 6px; vertical-align: top; width: 20%;">${address}<br/>${lga} ${state}</td>
              <td rowspan="5" style="border: 1px solid #000; padding: 6px; text-align: center; width: 15%;">
                <img src="${userPhoto}" style="width: 100px; height: 110px; border: 1px solid #999;" />
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>NIN:</strong></td>
              <td style="border: 1px solid #000; padding: 6px; font-weight: bold; font-size: 14px;">${nin}</td>
              <td style="border: 1px solid #000; padding: 6px;"><strong>Surname:</strong></td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>Gender:</strong></td>
              <td style="border: 1px solid #000; padding: 6px;">${gender}</td>
              <td style="border: 1px solid #000; padding: 6px;"><strong>First Name:</strong></td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px;"><strong>DOB:</strong></td>
              <td style="border: 1px solid #000; padding: 6px;">${dob}</td>
              <td style="border: 1px solid #000; padding: 6px;"><strong>Middle Name:</strong></td>
            </tr>
          </table>
          <div style="padding: 8px; font-size: 10px; border-top: 1px solid #000; background: #f9f9f9;">
            <strong>Note:</strong> The National Identification Number (NIN) is your identity. It is confidential and may only be released for legitimate transactions.
          </div>
        </div>
      `;
    } else if (selectedType === "premiumCard") {
      // KALA TA 2: PREMIUM PLASTIC WALLET CARD
      slipHtmlContent = `
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 40px; font-family: Arial, sans-serif;">
          <!-- Front Side -->
          <div style="width: 360px; height: 225px; border-radius: 12px; border: 1px solid #ccc; padding: 12px; position: relative; background: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.1); overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 35px;" />
              <span style="font-weight: bold; font-size: 16px; color: #111;">NGA</span>
            </div>
            <div style="display: flex; margin-top: 10px;">
              <img src="${userPhoto}" style="width: 85px; height: 100px; border-radius: 6px; object-fit: cover; border: 1px solid #059669;" />
              <div style="margin-left: 12px; font-size: 11px; flex: 1;">
                <span style="color: #666; font-size: 9px;">Surname/Nom</span>
                <div style="font-weight: bold; font-size: 12px;">${surname}</div>
                <span style="color: #666; font-size: 9px; margin-top: 4px; display: block;">Given Names/Prénoms</span>
                <div style="font-weight: bold; font-size: 12px;">${givenNames}</div>
                <div style="display: flex; justify-content: space-between; margin-top: 4px;">
                  <div><span style="color: #666; font-size: 8px;">Date of Birth</span><div style="font-weight: bold;">${dob}</div></div>
                  <div><span style="color: #666; font-size: 8px;">Sex</span><div style="font-weight: bold;">${gender}</div></div>
                </div>
              </div>
              <img src="${qrCodeUrl}" style="width: 75px; height: 75px; margin-top: 5px;" />
            </div>
            <div style="position: absolute; bottom: 8px; left: 12px; right: 12px; text-align: center; border-top: 1px dashed #ddd; padding-top: 4px;">
              <div style="font-size: 8px; color: #555;">National Identification Number (NIN)</div>
              <div style="font-size: 19px; font-weight: 900; letter-spacing: 2px; color: #000;">${formattedNin}</div>
            </div>
          </div>

          <!-- Back Side -->
          <div style="width: 360px; height: 225px; border-radius: 12px; border: 1px solid #ccc; padding: 18px; position: relative; background: #fff; box-shadow: 0 4px 8px rgba(0,0,0,0.1); text-align: center;">
            <h3 style="margin: 0; font-size: 14px; text-transform: uppercase;">Disclaimer</h3>
            <p style="font-size: 9px; color: #555; margin: 4px 0 10px;">Trust, but verify</p>
            <p style="font-size: 8.5px; line-height: 12px; color: #333; text-align: justify;">
              Kindly ensure each time this ID is presented, that you verify the credentials using a Government APPROVED verification resource. The details on the front of this NIN Slip must EXACTLY match the verification result.
            </p>
            <h4 style="margin: 8px 0 4px; font-size: 11px;">CAUTION!</h4>
            <p style="font-size: 8px; line-height: 11px; color: #444; text-align: justify;">
              If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein.
            </p>
          </div>
        </div>
      `;
    } else {
      // KALA TA 3: STANDARD DIGITAL GREEN SLIP (DEFAULT)
      slipHtmlContent = `
        <div style="width: 820px; margin: 40px auto; border: 2px solid #ccc; border-radius: 8px; background: #fff; display: flex; font-family: Arial, sans-serif; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
          <!-- Front Leaf -->
          <div style="flex: 1.1; padding: 16px; border-right: 2px dashed #bbb; background: #f0fdf4; position: relative;">
            <div style="color: #15803d; font-weight: 900; font-size: 12px;">FEDERAL REPUBLIC OF NIGERIA</div>
            <div style="font-size: 10px; color: #166534; font-weight: bold;">DIGITAL NIN SLIP</div>
            
            <div style="display: flex; margin-top: 12px;">
              <img src="${userPhoto}" style="width: 90px; height: 105px; border-radius: 4px; border: 1.5px solid #16a34a; object-fit: cover;" />
              <div style="margin-left: 12px; font-size: 11px; flex: 1;">
                <span style="color: #666; font-size: 9px;">SURNAME / NOM</span>
                <div style="font-weight: 900; font-size: 13px; color: #111;">${surname}</div>
                <span style="color: #666; font-size: 9px; margin-top: 3px; display: block;">GIVEN NAMES / PRENOMS</span>
                <div style="font-weight: 800; font-size: 12px; color: #111;">${givenNames}</div>
                <div style="display: flex; gap: 15px; margin-top: 4px;">
                  <div><span style="color: #666; font-size: 8px;">DATE OF BIRTH</span><div style="font-weight: bold;">${dob}</div></div>
                  <div><span style="color: #666; font-size: 8px;">SEX / SEXE</span><div style="font-weight: bold;">${gender}</div></div>
                </div>
              </div>
              <div style="text-align: center;">
                <img src="${qrCodeUrl}" style="width: 80px; height: 80px;" />
                <div style="font-weight: 900; font-size: 13px; margin-top: 2px;">NGA</div>
              </div>
            </div>

            <div style="margin-top: 15px; text-align: center; border-top: 1px solid #86efac; padding-top: 6px;">
              <div style="font-size: 10px; color: #166534; font-weight: bold;">National Identification Number (NIN)</div>
              <div style="font-size: 24px; font-weight: 900; letter-spacing: 3px; color: #052e16;">${formattedNin}</div>
            </div>
          </div>

          <!-- Back Leaf -->
          <div style="flex: 0.9; padding: 20px; display: flex; flex-direction: column; justify-content: center; text-align: center; background: #fff;">
            <h3 style="margin: 0; font-size: 15px; font-weight: 900; letter-spacing: 1px;">DISCLAIMER</h3>
            <p style="font-size: 10px; font-style: italic; margin: 4px 0 10px; color: #555;">Trust, but verify</p>
            <p style="font-size: 9px; line-height: 13px; color: #333; text-align: justify;">
              Kindly ensure each time this ID is presented, that you verify the credentials using a Government APPROVED verification resource. The details on the front of this NIN Slip must EXACTLY match the verification result.
            </p>
            <h4 style="margin: 8px 0 4px; font-size: 12px; color: #000;">CAUTION!</h4>
            <p style="font-size: 8.5px; line-height: 12px; color: #444; text-align: justify;">
              If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein. You are only permitted to scan the barcode for identity verification purposes.
            </p>
          </div>
        </div>
      `;
    }

    // 4. Buga a matsayin Printable Page / Save as PDF
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>NIMC Official Printable Slip - ${nin}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; background: #fff; }
                  @page { size: auto; margin: 10mm; }
                }
              </style>
            </head>
            <body onload="window.print();">
              ${slipHtmlContent}
            </body>
          </html>
        `);
        printWindow.document.close();
      } else {
        window.print();
      }
    } else {
      showAlert("Slip Ready", "Official slip template created. Save or capture this document.");
    }
  };

  const copyToClipboard = async (text, label) => {
    if (!text) return;
    await Clipboard.setStringAsync(text);
    showAlert("Copied", `${label || "Value"} copied to clipboard.`);
  };

  // ---------------- VIEW 1: SELECTION MENU ----------------
  if (view === "main" && !selectedSearch) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#050811" />
        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#f8fafc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Slip Services</Text>
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
              <Text style={styles.bannerTitle}>NIMC Slip Printing</Text>
              <Text style={styles.bannerSub}>
                Instant verified reprint using NIN, Phone number, or Tracking ID.
              </Text>
            </View>
          </LinearGradient>

          <Text style={styles.sectionHeading}>SELECT VERIFICATION CHANNEL</Text>

          <View style={styles.gridContainer}>
            {searchOptions.map((opt) => {
              const currentPrice = prices[opt.id] || 100;
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
                    <Text style={styles.priceLabel}>Fee:</Text>
                    <Text style={styles.priceValue}>₦{Number(currentPrice).toLocaleString()}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={styles.modCard}
            onPress={() => navigation.navigate("NIMCModification")}
            activeOpacity={0.85}
          >
            <View style={styles.modIconWrap}>
              <FontAwesome5 name="user-edit" size={18} color="#0284c7" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.modTitle}>NIMC Data Modifications</Text>
              <Text style={styles.modSub}>Update Date of Birth, Name, or Phone Number</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748b" />
          </TouchableOpacity>
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

  // ---------------- VIEW 2: SEARCH FORM ----------------
  if (view === "main" && selectedSearch) {
    const activePrice = prices[selectedSearch.id] || 100;

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
                <Text style={styles.feeRowLabel}>Service Type</Text>
                <Text style={styles.feeRowVal}>{selectedSearch.name}</Text>
              </View>
              <View style={styles.feeRow}>
                <Text style={styles.feeRowLabel}>Portal Printing Fee</Text>
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

  // ---------------- VIEW 3: RESULT SLIP PREVIEW ----------------
  if (view === "result") {
    const fullName =
      userData?.fullName ||
      userData?.name ||
      `${userData?.firstName || ""} ${userData?.middleName || ""} ${userData?.surname || ""}`.trim() ||
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
              {userData?.photo ? (
                <Image
                  source={{
                    uri: userData.photo.startsWith("data:image")
                      ? userData.photo
                      : `data:image/jpeg;base64,${userData.photo}`,
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
              <ResultRow label="Full Name" value={fullName} />
              <ResultRow
                label="National Identity Number (NIN)"
                value={userData?.nin || userData?.ninNumber || "N/A"}
                copyable
                onCopy={() => copyToClipboard(userData?.nin || userData?.ninNumber, "NIN")}
              />
              <ResultRow
                label="Tracking ID"
                value={userData?.trackingId || userData?.tracking_id || "N/A"}
                copyable
                onCopy={() => copyToClipboard(userData?.trackingId || userData?.tracking_id, "Tracking ID")}
              />
              <ResultRow label="Phone Number" value={userData?.telephoneno || userData?.phone || "N/A"} />
              <ResultRow label="Date of Birth" value={userData?.birthdate || userData?.dob || "N/A"} />
              <ResultRow label="Gender" value={userData?.gender || "N/A"} />
              <ResultRow label="State of Origin" value={userData?.state || userData?.stateOfOrigin || "N/A"} />
              <ResultRow label="LGA of Origin" value={userData?.lga || userData?.lgaOfOrigin || "N/A"} />
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
    marginBottom: 18,
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
  bannerTitle: { color: "#fff", fontSize: 16, fontWeight: "900" },
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
    borderColor: "rgba(0, 240, 255, 0.2)",
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
  modCard: {
    backgroundColor: "#0b1120",
    flexDirection: "row",
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  modIconWrap: {
    width: 42,
    height: 42,
    backgroundColor: "#071328",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modTitle: { fontWeight: "800", color: "#f8fafc", fontSize: 13 },
  modSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
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
    borderColor: "#00f0ff",
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
  copySmallBtn: { padding: 6, backgroundColor: "rgba(0, 240, 255, 0.1)", borderRadius: 6 },
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

export default NIMCScreen;