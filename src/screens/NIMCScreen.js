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

  // 5. Official NIMC Multi-Format Slip Generator (Download & Print)
  const handleDownloadPDF = async () => {
    if (userData?.pdfUrl || userData?.slipUrl) {
      const url = userData.pdfUrl || userData.slipUrl;
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else {
        await Linking.openURL(url);
      }
      return;
    }

    // A. Tace da Rarrabe Sunaye
    const rawFullName = (
      userData?.fullName ||
      userData?.name ||
      `${userData?.firstName || userData?.firstname || ""} ${userData?.middleName || userData?.middlename || ""} ${userData?.surname || ""}`
    ).trim();

    const nameParts = rawFullName.split(/\s+/).filter(Boolean);
    const surname = (userData?.surname || nameParts[0] || "MOHAMMED").toUpperCase();
    const firstName = (userData?.firstName || userData?.firstname || nameParts[1] || "CITIZEN").toUpperCase();
    const middleName = (userData?.middleName || userData?.middlename || nameParts.slice(2).join(" ") || "").toUpperCase();
    const givenNames = `${firstName}${middleName ? ", " + middleName : ""}`;

    // B. Tace Sauran Bayanai
    const rawNin = String(userData?.nin || userData?.ninNumber || searchValue || "").replace(/\D/g, "");
    const nin = rawNin.length === 11 ? rawNin : "68609193060";
    const formattedNin = `${nin.slice(0, 4)}  ${nin.slice(4, 7)}  ${nin.slice(7)}`;

    const trackingId = (userData?.trackingId || userData?.tracking_id || "TRK" + Date.now().toString().slice(-8)).toUpperCase();
    const dob = (userData?.birthdate || userData?.dob || "02 JUL 1997").toUpperCase();
    const gender = (userData?.gender || "Male").toUpperCase();

    // Adireshin zama
    const residence = (userData?.residence_address || userData?.address || "NO 37 BELLO AHMAD ROAD").toUpperCase();
    const town = (userData?.residence_town || userData?.city || "JIMETA").toUpperCase();
    const lga = (userData?.residence_lga || userData?.lga || "YOLA NORTH").toUpperCase();
    const state = (userData?.residence_state || userData?.state || "ADAMAWA").toUpperCase();

    // Kwanan watan bugawa
    const today = new Date();
    const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    const issueDate = `${String(today.getDate()).padStart(2, "0")} ${months[today.getMonth()]} ${today.getFullYear()}`;

    // Hoto da QR Code
    const userPhoto = userData?.photo || userData?.image
      ? (String(userData.photo || userData.image).startsWith("data:image")
          ? (userData.photo || userData.image)
          : `data:image/jpeg;base64,${userData.photo || userData.image}`)
      : "https://via.placeholder.com/150";

    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
      `NIN:${nin}|SURNAME:${surname}|GIVEN:${givenNames}|DOB:${dob}|SEX:${gender}`
    )}`;

    // Micro-watermark pattern mai lambobin NIN
    const watermarkSvg = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='70' viewBox='0 0 160 70'><text x='10' y='35' fill='%2315803d' opacity='0.12' font-size='11' font-family='Arial' font-weight='bold' transform='rotate(-20 80 35)'>${nin}</text></svg>")`;

    const selectedType = selectedSearch?.id || "standardSlip";
    let slipHtmlContent = "";

    // =========================================================================
    // 1. REGULAR SLIP (NINS TABLE FORMAT - BAKI DA FARI)
    // =========================================================================
    if (selectedType === "basicSlip") {
      slipHtmlContent = `
        <div style="width: 820px; margin: 30px auto; border: 2px solid #000; font-family: Arial, sans-serif; background: #fff; padding: 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; border-bottom: 2px solid #000;">
            <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 60px;" />
            <div style="text-align: center;">
              <h2 style="margin: 0; font-size: 20px; font-weight: bold; letter-spacing: 0.5px;">National Identity Management System</h2>
              <h4 style="margin: 3px 0; font-size: 14px; font-weight: normal;">Federal Republic of Nigeria</h4>
              <div style="font-size: 12px; font-weight: bold; margin-top: 2px;">National Identification Number Slip (NINS)</div>
            </div>
            <img src="https://nimc.gov.ng/wp-content/uploads/2020/07/nimc-logo.png" style="height: 48px;" />
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <tr>
              <td style="border: 1px solid #000; padding: 6px 8px; width: 14%;"><strong>Tracking ID:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px; width: 22%;">${trackingId}</td>
              <td style="border: 1px solid #000; padding: 6px 8px; width: 14%;"><strong>Surname:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px; width: 20%; font-weight: bold;">${surname}</td>
              <td style="border: 1px solid #000; padding: 6px 8px; width: 14%;"><strong>Address:</strong></td>
              <td rowspan="5" style="border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: center; width: 16%;">
                <img src="${userPhoto}" style="width: 115px; height: 135px; border: 1px solid #555; object-fit: cover;" />
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px 8px;"><strong>NIN:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold; font-size: 13px;">${nin}</td>
              <td style="border: 1px solid #000; padding: 6px 8px;"><strong>First Name:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px; font-weight: bold;">${firstName}</td>
              <td rowspan="4" style="border: 1px solid #000; padding: 8px; vertical-align: top; font-size: 11px; line-height: 16px;">
                ${residence}<br/>
                ${town}<br/>
                ${lga}<br/>
                ${state}
              </td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px 8px;"></td>
              <td style="border: 1px solid #000; padding: 6px 8px;"></td>
              <td style="border: 1px solid #000; padding: 6px 8px;"><strong>Middle Name:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${middleName || "-"}</td>
            </tr>
            <tr>
              <td style="border: 1px solid #000; padding: 6px 8px;"></td>
              <td style="border: 1px solid #000; padding: 6px 8px;"></td>
              <td style="border: 1px solid #000; padding: 6px 8px;"><strong>Gender:</strong></td>
              <td style="border: 1px solid #000; padding: 6px 8px;">${gender}</td>
            </tr>
          </table>

          <div style="padding: 6px 12px; font-size: 9.5px; border-bottom: 2px solid #000; background: #fff; line-height: 14px;">
            <strong>Note:</strong> The National Identification Number (NIN) is your identity. It is confidential and may only be released for legitimate transactions.<br/>
            You will be notified when your National Identity Card is ready (For any enquiries, please contact)
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 15px; font-size: 10px; background: #fff;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>✉</span> <strong>helpdesk@nimc.gov.ng</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>🌐</span> <strong>www.nimc.gov.ng</strong>
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span>📞</span> <strong>0700-CALL-NIMC</strong>
            </div>
            <div style="text-align: right;">
              <strong>National Identity Management Commission</strong><br/>
              <span style="font-size: 8px; color: #555;">11 Sokode Crescent, Off Dalaba Street, Zone 5, Wuse, Abuja Nigeria</span>
            </div>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // 2. PREMIUM GREEN DIGITAL SLIP (COAT OF ARMS & WATERMARK BACKGROUND)
    // =========================================================================
    else if (selectedType === "premiumCard") {
      slipHtmlContent = `
        <div style="width: 880px; margin: 40px auto; border: 1.5px solid #000; background: #fff; display: flex; font-family: Arial, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden;">
          <!-- Front Leaf -->
          <div style="flex: 1.18; padding: 16px 20px; border-right: 1.5px solid #000; background-color: #f2fcf5; background-image: ${watermarkSvg}; position: relative; overflow: hidden;">
            <!-- Coat of Arms Watermark a Tsakiya -->
            <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); opacity: 0.08; pointer-events: none; z-index: 1;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 150px;" />
            </div>

            <div style="position: relative; z-index: 2;">
              <div style="color: #15803d; font-weight: 900; font-size: 13px; letter-spacing: 0.5px;">FEDERAL REPUBLIC OF NIGERIA</div>
              <div style="font-size: 10px; color: #166534; font-weight: bold; margin-bottom: 12px;">DIGITAL NIN SLIP</div>

              <div style="display: flex; align-items: flex-start;">
                <!-- Hoto Mai Koren Border -->
                <div style="text-align: center;">
                  <img src="${userPhoto}" style="width: 95px; height: 112px; border: 2px solid #16a34a; object-fit: cover; border-radius: 2px;" />
                </div>

                <!-- Cikakkun Bayanai -->
                <div style="margin-left: 14px; font-size: 10px; flex: 1;">
                  <span style="color: #64748b; font-size: 8px; font-weight: bold;">SURNAME/NOM</span>
                  <div style="font-weight: 900; font-size: 13.5px; color: #000; margin-bottom: 5px; letter-spacing: 0.5px;">${surname}</div>

                  <span style="color: #64748b; font-size: 8px; font-weight: bold;">GIVEN NAMES/PRÉNOMS</span>
                  <div style="font-weight: 900; font-size: 12px; color: #000; margin-bottom: 5px; letter-spacing: 0.3px;">${givenNames}</div>

                  <div style="display: flex; gap: 18px; margin-top: 2px;">
                    <div>
                      <span style="color: #64748b; font-size: 8px; font-weight: bold;">DATE OF BIRTH</span>
                      <div style="font-weight: 900; font-size: 11px; color: #000;">${dob}</div>
                    </div>
                    <div>
                      <span style="color: #64748b; font-size: 8px; font-weight: bold;">SEX/SEXE</span>
                      <div style="font-weight: 900; font-size: 11px; color: #000;">${gender}</div>
                    </div>
                  </div>

                  <div style="margin-top: 5px;">
                    <span style="color: #64748b; font-size: 8px; font-weight: bold;">ISSUE DATE</span>
                    <div style="font-weight: 900; font-size: 11px; color: #000;">${issueDate}</div>
                  </div>
                </div>

                <!-- QR Code & NGA -->
                <div style="text-align: center; margin-left: 10px;">
                  <img src="${qrCodeUrl}" style="width: 86px; height: 86px; border: 1px solid #16a34a; padding: 2px; background: #fff;" />
                  <div style="font-weight: 900; font-size: 15px; margin-top: 4px; color: #000; letter-spacing: 1px;">NGA</div>
                </div>
              </div>

              <!-- Lambobin NIN a Kasa -->
              <div style="margin-top: 14px; text-align: center; border-top: 1.5px solid #86efac; padding-top: 4px;">
                <div style="font-size: 10.5px; color: #166534; font-weight: bold;">National Identification Number (NIN)</div>
                <div style="font-size: 27px; font-weight: 900; letter-spacing: 4px; color: #022c22; line-height: 32px;">${formattedNin}</div>
              </div>
            </div>
          </div>

          <!-- Back Leaf (Disclaimer) -->
          <div style="flex: 0.82; padding: 24px 22px; display: flex; flex-direction: column; justify-content: center; text-align: center; background: #fff;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 1px;">DISCLAIMER</h3>
            <p style="font-size: 11px; font-style: italic; margin: 4px 0 14px; color: #333; font-family: 'Georgia', serif;">Trust, but verify</p>
            <p style="font-size: 8.5px; line-height: 13.5px; color: #111; text-align: justify; margin-bottom: 10px;">
              Kindly ensure each time this ID is presented, that you verify the credentials using a Government APPROVED verification resource. The details on the front of this NIN Slip must EXACTLY match the verification result.
            </p>
            <h4 style="margin: 6px 0 3px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">CAUTION!</h4>
            <p style="font-size: 8.2px; line-height: 12.5px; color: #222; text-align: justify; margin-bottom: 10px;">
              If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein. You are only permitted to scan the barcode for the purpose of identity verification.
            </p>
            <p style="font-size: 7.8px; line-height: 11.5px; color: #444; text-align: justify; margin: 0;">
              The FEDERAL GOVERNMENT of NIGERIA assumes no responsibility if you accept any variance on the scan result or do not scan the 2D barcode overleaf.
            </p>
          </div>
        </div>
      `;
    }

    // =========================================================================
    // 3. STANDARD SLIP (WALLET ID CARD TSARI MAI COAT OF ARMS WATERMARK)
    // =========================================================================
    else {
      const cardWatermark = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='60' viewBox='0 0 140 60'><text x='5' y='30' fill='%2364748b' opacity='0.12' font-size='10' font-family='Arial' font-weight='bold' transform='rotate(-25 70 30)'>${nin}</text></svg>")`;

      slipHtmlContent = `
        <div style="display: flex; gap: 24px; justify-content: center; margin-top: 50px; font-family: Arial, sans-serif;">
          <!-- Front Side -->
          <div style="width: 380px; height: 235px; border: 1.5px solid #333; border-radius: 10px; padding: 12px; position: relative; background-color: #fff; background-image: ${cardWatermark}; box-shadow: 0 4px 10px rgba(0,0,0,0.15); overflow: hidden;">
            <!-- Watermark Coat of Arms a Tsakiya -->
            <div style="position: absolute; top: 20px; left: 50%; transform: translateX(-50%); opacity: 0.14; z-index: 1; pointer-events: none;">
              <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 140px;" />
            </div>

            <div style="position: relative; z-index: 2;">
              <div style="display: flex; justify-content: center; margin-bottom: 4px;">
                <img src="https://upload.wikimedia.org/wikipedia/commons/b/bc/Coat_of_arms_of_Nigeria.svg" style="height: 38px;" />
              </div>

              <div style="display: flex;">
                <img src="${userPhoto}" style="width: 85px; height: 105px; border: 1px solid #666; object-fit: cover; border-radius: 3px;" />
                <div style="margin-left: 10px; font-size: 10px; flex: 1;">
                  <span style="color: #64748b; font-size: 8px;">Surname/Nom</span>
                  <div style="font-weight: 900; font-size: 13px; color: #000;">${surname}</div>

                  <span style="color: #64748b; font-size: 8px; margin-top: 3px; display: block;">Given Names/Prénoms</span>
                  <div style="font-weight: 800; font-size: 11.5px; color: #000;">${givenNames}</div>

                  <span style="color: #64748b; font-size: 8px; margin-top: 3px; display: block;">Date of Birth</span>
                  <div style="font-weight: bold; font-size: 11px; color: #000;">${dob}</div>
                </div>

                <div style="text-align: center; margin-left: 6px;">
                  <div style="font-weight: 900; font-size: 14px; color: #000;">NGA</div>
                  <div style="font-size: 8px; color: #64748b; margin-bottom: 2px;">09066160989</div>
                  <img src="${qrCodeUrl}" style="width: 78px; height: 78px;" />
                </div>
              </div>

              <div style="margin-top: 8px; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 3px;">
                <div style="font-size: 8.5px; color: #333; font-weight: bold;">National Identification Number (NIN)</div>
                <div style="font-size: 22px; font-weight: 900; letter-spacing: 2.5px; color: #000;">${formattedNin}</div>
                <div style="font-size: 6.5px; color: #64748b; font-style: italic;">Kindly ensure you scan the barcode to verify the credentials.</div>
              </div>
            </div>
          </div>

          <!-- Back Side -->
          <div style="width: 380px; height: 235px; border: 1.5px solid #333; border-radius: 10px; padding: 18px; position: relative; background: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column; justify-content: center; text-align: center;">
            <h3 style="margin: 0; font-size: 16px; font-weight: 900; letter-spacing: 0.5px;">DISCLAIMER</h3>
            <p style="font-size: 10px; font-style: italic; margin: 3px 0 10px; color: #444; font-family: 'Georgia', serif;">Trust, but verify</p>
            <p style="font-size: 8.5px; line-height: 12.5px; color: #222; text-align: justify; margin-bottom: 6px;">
              Kindly ensure each time this ID is presented, that you verify the credentials using a Government APPROVED verification resource. The details on the front of this NIN Slip must EXACTLY match the verification result.
            </p>
            <h4 style="margin: 4px 0 2px; font-size: 11.5px; font-weight: bold;">CAUTION!</h4>
            <p style="font-size: 8px; line-height: 11.5px; color: #333; text-align: justify; margin-bottom: 6px;">
              If this NIN was not issued to the person on the front of this document, please DO NOT attempt to scan, photocopy or replicate the personal data contained herein. You are only permitted to scan the barcode for the purpose of identity verification.
            </p>
            <p style="font-size: 7.5px; line-height: 11px; color: #555; text-align: justify; margin: 0;">
              The FEDERAL GOVERNMENT of NIGERIA assumes no responsibility if you accept any variance on the scan result or do not scan the 2D barcode overleaf.
            </p>
          </div>
        </div>
      `;
    }

    // D. Buɗe Allon Buga Takarda (Print Preview & Save as PDF)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>NIMC Official Slip - ${nin}</title>
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
      showAlert("Slip Ready", "Your official NIMC document is ready. Save or screenshot this slip.");
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