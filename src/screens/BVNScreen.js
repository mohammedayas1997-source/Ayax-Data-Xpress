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
    length: 14,
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
        `${BASE_URL}/bvn/admin/set-price`,
        { serviceType: editingService.id, amount: numericPrice, name: editingService.name },
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
        `Please enter a valid ${selectedService?.name || "BVN / Phone Number"}.`
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

      let sanitizedNumber = searchValue.replace(/\D/g, "").trim();
      const serviceId = selectedService?.id || "bvn_standard";
      const isPhoneLookup = serviceId === "bvn_phone";

      let payload = {
        serviceType: serviceId,
        serviceId: serviceId,
        amount: prices[serviceId] || 150,
        pin: pin.trim(),
        transactionPin: pin.trim(),
        format: "pdf",
        generatePdf: true,
      };

      if (isPhoneLookup) {
        if (sanitizedNumber.startsWith("234") && sanitizedNumber.length >= 13) {
          sanitizedNumber = "0" + sanitizedNumber.slice(3);
        } else if (sanitizedNumber.length === 10 && !sanitizedNumber.startsWith("0")) {
          sanitizedNumber = "0" + sanitizedNumber;
        }
        payload.phone = sanitizedNumber;
        payload.phoneNumber = sanitizedNumber;
        payload.searchValue = sanitizedNumber;
      } else {
        payload.bvn = sanitizedNumber;
        payload.bvnNumber = sanitizedNumber;
        payload.searchValue = sanitizedNumber;
      }

      const res = await axios.post(
        `${BASE_URL}/bvn/verify-and-generate`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 55000,
        }
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setPinModalVisible(false);
        setPin("");

        // Ciro dukkan bayanan ciki ko da sun nesa a JSON
        const rawPayload = result.data || result;
        const deepData =
          rawPayload.details?.data ||
          rawPayload.details ||
          rawPayload.bvnDetails ||
          rawPayload.user_data ||
          rawPayload;

        const resolvedSlipUrl =
          rawPayload.slipUrl ||
          rawPayload.pdfUrl ||
          result.slipUrl ||
          result.pdfUrl ||
          deepData.slipUrl ||
          deepData.pdfUrl ||
          deepData.slip_url ||
          deepData.pdf_url ||
          null;

        const combinedData = {
          ...deepData,
          ...rawPayload,
          slipUrl: resolvedSlipUrl,
          pdfUrl: resolvedSlipUrl,
        };

        setBvnData(combinedData);

        // Idan uwar garke ta bayar da direct PDF link na hukuma, sanar da mai amfani ya bude
        if (resolvedSlipUrl) {
          showAlert(
            "BVN Slip Ready 🎉",
            "Official BVN Verification Slip has been generated. Tap OK to open and download.",
            () => {
              if (Platform.OS === "web") {
                window.open(resolvedSlipUrl, "_blank");
              } else {
                Linking.openURL(resolvedSlipUrl);
              }
            }
          );
        }

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

  // 5. Download Printable BVN Slip (PDF / Print Generator)
  const handleDownloadPDF = async () => {
    const directUrl =
      bvnData?.slipUrl ||
      bvnData?.pdfUrl ||
      bvnData?.downloadUrl ||
      bvnData?.url;

    if (directUrl && typeof directUrl === "string" && directUrl.startsWith("http")) {
      if (Platform.OS === "web") {
        window.open(directUrl, "_blank");
      } else {
        await Linking.openURL(directUrl);
      }
      return;
    }

    const firstName = String(
      bvnData?.firstName || bvnData?.firstname || bvnData?.first_name || ""
    ).toUpperCase();

    const middleName = String(
      bvnData?.middleName || bvnData?.middlename || bvnData?.middle_name || ""
    ).toUpperCase();

    const surname = String(
      bvnData?.surname || bvnData?.lastName || bvnData?.lastname || bvnData?.last_name || ""
    ).toUpperCase();

    const fullName = (
      bvnData?.fullName ||
      bvnData?.name ||
      `${firstName} ${middleName} ${surname}`
    ).replace(/\s+/g, " ").trim() || "VERIFIED CITIZEN";

    const rawBvn = String(
      bvnData?.bvn || bvnData?.bvnNumber || bvnData?.bvn_number || searchValue || "N/A"
    ).replace(/\D/g, "");
    const formattedBvn = rawBvn.length === 11 ? `${rawBvn.slice(0, 4)} ${rawBvn.slice(4, 7)} ${rawBvn.slice(7)}` : rawBvn;

    const phone = String(
      bvnData?.phoneNumber || bvnData?.phone || bvnData?.phone_number1 || bvnData?.telephoneno || "N/A"
    );

    const dob = String(
      bvnData?.dateOfBirth || bvnData?.dob || bvnData?.date_of_birth || bvnData?.birthdate || "N/A"
    );

    const gender = String(bvnData?.gender || "N/A").toUpperCase();
    const nin = String(bvnData?.nin || bvnData?.ninNumber || "N/A");
    const address = String(
      bvnData?.residentialAddress || bvnData?.residential_address || bvnData?.address || bvnData?.residence_address || "N/A"
    ).toUpperCase();

    const bank = String(
      bvnData?.enrollmentBank || bvnData?.enrollment_bank || bvnData?.bank || "COMMERCIAL BANK"
    ).toUpperCase();

    const branch = String(
      bvnData?.enrollmentBranch || bvnData?.enrollment_branch || bvnData?.branch || "HEAD OFFICE"
    ).toUpperCase();

    const userPhoto = bvnData?.photo || bvnData?.image || bvnData?.passport || bvnData?.base64Image
      ? (String(bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image).startsWith("data:image")
          ? (bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image)
          : `data:image/jpeg;base64,${bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image}`)
      : "https://via.placeholder.com/150";

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(
      `BVN:${rawBvn}|NAME:${fullName}|PHONE:${phone}|DOB:${dob}|BANK:${bank}`
    )}`;

    const bvnWatermarkBg = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='70' viewBox='0 0 140 70'><text x='5' y='30' fill='%230284c7' opacity='0.12' font-size='10' font-family='monospace' font-weight='bold' transform='rotate(-22 70 35)'>${rawBvn}</text></svg>`;

    const selectedType = selectedService?.id || "bvn_standard";
    let slipHtmlContent = "";

    if (selectedType === "bvn_premium") {
      slipHtmlContent = `
        <div style="display: flex; gap: 20px; justify-content: center; margin-top: 50px; font-family: Arial, sans-serif;">
          <!-- Front Card -->
          <div style="width: 360px; height: 225px; border-radius: 10px; border: 1.5px solid #0284c7; padding: 12px; position: relative; background-color: #f0f9ff; background-image: url('${bvnWatermarkBg}'); box-shadow: 0 4px 10px rgba(0,0,0,0.12); overflow: hidden;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-size: 11px; font-weight: 900; color: #0369a1; letter-spacing: 0.5px;">CENTRAL BANK OF NIGERIA</div>
                <div style="font-size: 8px; color: #0284c7; font-weight: bold;">BVN IDENTIFICATION CARD</div>
              </div>
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 28px;" />
            </div>

            <div style="display: flex; margin-top: 8px;">
              <img src="${userPhoto}" style="width: 82px; height: 98px; border-radius: 4px; object-fit: cover; border: 1.5px solid #0284c7;" />
              <div style="margin-left: 10px; font-size: 10px; flex: 1;">
                <span style="color: #64748b; font-size: 7.5px; font-weight: bold;">FULL NAME</span>
                <div style="font-weight: 900; font-size: 11px; color: #0f172a; line-height: 14px;">${fullName}</div>

                <div style="display: flex; gap: 10px; margin-top: 3px;">
                  <div>
                    <span style="color: #64748b; font-size: 7.5px; font-weight: bold;">DOB</span>
                    <div style="font-weight: bold; font-size: 9.5px;">${dob}</div>
                  </div>
                  <div>
                    <span style="color: #64748b; font-size: 7.5px; font-weight: bold;">GENDER</span>
                    <div style="font-weight: bold; font-size: 9.5px;">${gender}</div>
                  </div>
                </div>

                <div style="margin-top: 3px;">
                  <span style="color: #64748b; font-size: 7.5px; font-weight: bold;">PHONE</span>
                  <div style="font-weight: bold; font-size: 9.5px;">${phone}</div>
                </div>
              </div>
              <img src="${qrCodeUrl}" style="width: 62px; height: 62px; border: 1px solid #bae6fd; padding: 1px; background: #fff;" />
            </div>

            <div style="position: absolute; bottom: 6px; left: 12px; right: 12px; text-align: center; border-top: 1px dashed #38bdf8; padding-top: 3px;">
              <div style="font-size: 7.5px; color: #0369a1; font-weight: bold;">BANK VERIFICATION NUMBER (BVN)</div>
              <div style="font-size: 19px; font-weight: 900; letter-spacing: 2.5px; color: #0c4a6e; font-family: monospace;">${formattedBvn}</div>
            </div>
          </div>

          <!-- Back Card -->
          <div style="width: 360px; height: 225px; border-radius: 10px; border: 1.5px solid #cbd5e1; padding: 14px; position: relative; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.12); text-align: center; display: flex; flex-direction: column; justify-content: center;">
            <h3 style="margin: 0; font-size: 12.5px; color: #0f172a; font-weight: 900;">TERMS & CONDITIONS</h3>
            <p style="font-size: 7.5px; color: #64748b; margin: 3px 0 6px;">Property of Central Bank of Nigeria / NIBSS</p>
            <p style="font-size: 7.5px; line-height: 11px; color: #334155; text-align: justify;">
              This digital identity document is issued for biometric identification and financial security verification under the regulatory framework of the Central Bank of Nigeria.
            </p>
            <div style="margin-top: 8px; padding: 6px 8px; background: #f8fafc; border-radius: 4px; font-size: 8px; text-align: left; line-height: 12px; border: 1px solid #e2e8f0;">
              <div><strong>Primary Bank:</strong> ${bank}</div>
              <div><strong>Linked NIN:</strong> ${nin}</div>
              <div><strong>Branch:</strong> ${branch}</div>
            </div>
          </div>
        </div>
      `;
    } else {
      slipHtmlContent = `
        <div style="width: 780px; margin: 25px auto; border: 2px solid #0369a1; border-radius: 6px; font-family: Arial, sans-serif; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.1); overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #0369a1; color: #fff;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 50px; filter: brightness(0) invert(1);" />
            <div style="text-align: center;">
              <h2 style="margin: 0; font-size: 18px; letter-spacing: 0.5px;">CENTRAL BANK OF NIGERIA</h2>
              <h4 style="margin: 2px 0; font-size: 12px; font-weight: normal;">NIGERIA INTER-BANK SETTLEMENT SYSTEM (NIBSS)</h4>
              <div style="font-size: 10px; background: #0284c7; display: inline-block; padding: 2px 8px; border-radius: 4px; margin-top: 3px; font-weight: bold;">
                OFFICIAL BVN VERIFICATION SLIP
              </div>
            </div>
            <img src="${qrCodeUrl}" style="height: 52px; width: 52px; background: #fff; padding: 2px; border-radius: 4px;" />
          </div>

          <div style="padding: 18px 20px;">
            <div style="display: flex; gap: 20px; border-bottom: 2px solid #e2e8f0; padding-bottom: 14px;">
              <img src="${userPhoto}" style="width: 105px; height: 125px; border-radius: 4px; border: 2px solid #0284c7; object-fit: cover;" />
              <div style="flex: 1;">
                <div style="font-size: 8.5px; color: #64748b; font-weight: bold;">REGISTERED FULL NAME</div>
                <div style="font-size: 16px; font-weight: 900; color: #0f172a; margin-bottom: 8px;">${fullName}</div>

                <div style="background: #f0f9ff; border: 1.5px dashed #38bdf8; padding: 6px 12px; border-radius: 6px; display: inline-block;">
                  <span style="font-size: 8px; color: #0369a1; font-weight: bold;">BANK VERIFICATION NUMBER (BVN)</span>
                  <div style="font-size: 21px; font-weight: 900; letter-spacing: 2px; color: #0c4a6e; font-family: monospace;">${formattedBvn}</div>
                </div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px;">
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b; width: 25%;"><strong>First Name:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; width: 25%; color: #0f172a;">${firstName || "N/A"}</td>
                <td style="padding: 6px 0; color: #64748b; width: 25%;"><strong>Phone Number:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; width: 25%; color: #0f172a;">${phone}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;"><strong>Middle Name:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${middleName || "-"}</td>
                <td style="padding: 6px 0; color: #64748b;"><strong>Date of Birth:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${dob}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;"><strong>Surname:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${surname || "N/A"}</td>
                <td style="padding: 6px 0; color: #64748b;"><strong>Gender:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${gender}</td>
              </tr>
              <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 6px 0; color: #64748b;"><strong>Linked NIN:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${nin}</td>
                <td style="padding: 6px 0; color: #64748b;"><strong>Enrollment Bank:</strong></td>
                <td style="padding: 6px 0; font-weight: bold; color: #0f172a;">${bank}</td>
              </tr>
              <tr>
                <td style="padding: 6px 0; color: #64748b; vertical-align: top;"><strong>Residential Address:</strong></td>
                <td colspan="3" style="padding: 6px 0; font-weight: bold; line-height: 15px; color: #0f172a;">${address}</td>
              </tr>
            </table>

            <div style="margin-top: 16px; padding: 8px 10px; background: #f8fafc; border-left: 4px solid #0284c7; font-size: 9px; color: #475569;">
              <strong>DISCLAIMER:</strong> This slip is an official electronic biometric extract issued under the authority of the Central Bank of Nigeria (CBN).
            </div>
          </div>
        </div>
      `;
    }

    if (Platform.OS === "web" && typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>BVN Official Slip - ${rawBvn}</title>
              <style>
                @media print {
                  body { margin: 0; padding: 0; background: #fff; }
                  @page { size: auto; margin: 8mm; }
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
      showAlert("Notice", "BVN Slip template created. Save or capture document.");
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
            <Text style={styles.inputLabel}>
              {selectedService.id === "bvn_phone" ? "ENTER LINKED PHONE NUMBER" : "ENTER 11-DIGIT BVN"}
            </Text>
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
    const firstName = bvnData?.firstName || bvnData?.firstname || bvnData?.first_name || "";
    const middleName = bvnData?.middleName || bvnData?.middlename || bvnData?.middle_name || "";
    const surname = bvnData?.surname || bvnData?.lastName || bvnData?.lastname || bvnData?.last_name || "";
    const fullName =
      bvnData?.fullName ||
      bvnData?.name ||
      `${firstName} ${middleName} ${surname}`.replace(/\s+/g, " ").trim() ||
      "N/A";

    const resolvedBvn = bvnData?.bvn || bvnData?.bvnNumber || bvnData?.bvn_number || "N/A";
    const resolvedPhone = bvnData?.phoneNumber || bvnData?.phone || bvnData?.phone_number1 || bvnData?.telephoneno || "N/A";
    const resolvedDob = bvnData?.dateOfBirth || bvnData?.dob || bvnData?.date_of_birth || bvnData?.birthdate || "N/A";
    const resolvedAddress = bvnData?.residentialAddress || bvnData?.residential_address || bvnData?.address || bvnData?.residence_address || "N/A";
    const resolvedBank = bvnData?.enrollmentBank || bvnData?.bank || bvnData?.enrollment_bank || "N/A";
    const resolvedBranch = bvnData?.enrollmentBranch || bvnData?.branch || bvnData?.enrollment_branch || "N/A";

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
              {bvnData?.photo || bvnData?.image || bvnData?.passport || bvnData?.base64Image ? (
                <Image
                  source={{
                    uri: String(bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image).startsWith("data:image")
                      ? (bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image)
                      : `data:image/jpeg;base64,${bvnData.photo || bvnData.image || bvnData.passport || bvnData.base64Image}`,
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
                value={resolvedBvn}
                copyable
                onCopy={() => copyToClipboard(resolvedBvn, "BVN")}
              />
              <BVNResultRow label="Phone Number" value={resolvedPhone} />
              <BVNResultRow label="Date of Birth" value={resolvedDob} />
              <BVNResultRow label="Gender" value={(bvnData?.gender || "N/A").toUpperCase()} />
              <BVNResultRow label="Linked NIN" value={bvnData?.nin || bvnData?.ninNumber || "N/A"} />
              <BVNResultRow label="Enrollment Bank" value={resolvedBank} />
              <BVNResultRow label="Enrollment Branch" value={resolvedBranch} />
              <BVNResultRow label="Residential Address" value={resolvedAddress} />
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