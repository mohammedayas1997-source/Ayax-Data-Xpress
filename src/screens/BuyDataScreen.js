import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Alert,
  StatusBar,
  Modal,
  Platform,
} from "react-native";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

// CIKAKKEN JERIN PLANS NA AL-IHSAN (FALLBACK DATABASE)
const FALLBACK_ALIHSAN_PLANS = [
  // ================= MTN DATA PLANS =================
  // MTN DC (30 Days Direct)
  { network: "MTN", planId: "140", planCode: "140", name: "1.0GB DC", planType: "DC", validity: "30 Days", userPrice: 230, agentPrice: 210 },
  { network: "MTN", planId: "133", planCode: "133", name: "1.5GB DC", planType: "DC", validity: "30 Days", userPrice: 340, agentPrice: 320 },
  { network: "MTN", planId: "134", planCode: "134", name: "2.0GB DC", planType: "DC", validity: "30 Days", userPrice: 440, agentPrice: 415 },
  { network: "MTN", planId: "135", planCode: "135", name: "3.0GB DC", planType: "DC", validity: "30 Days", userPrice: 650, agentPrice: 620 },
  { network: "MTN", planId: "136", planCode: "136", name: "5.0GB DC", planType: "DC", validity: "30 Days", userPrice: 1050, agentPrice: 1000 },
  { network: "MTN", planId: "141", planCode: "141", name: "750.0MB DC", planType: "DC", validity: "30 Days", userPrice: 190, agentPrice: 170 },
  { network: "MTN", planId: "144", planCode: "144", name: "750MB DC (7D)", planType: "DC", validity: "7 Days", userPrice: 180, agentPrice: 160 },
  { network: "MTN", planId: "145", planCode: "145", name: "1.0GB DC (7D)", planType: "DC", validity: "7 Days", userPrice: 290, agentPrice: 275 },
  { network: "MTN", planId: "146", planCode: "146", name: "3.0GB DC (30D)", planType: "DC", validity: "30 Days", userPrice: 760, agentPrice: 730 },

  // MTN CG (Corporate Gifting)
  { network: "MTN", planId: "26", planCode: "26", name: "500.0MB CG", planType: "CG", validity: "30 Days", userPrice: 350, agentPrice: 330 },
  { network: "MTN", planId: "27", planCode: "27", name: "1.0GB CG", planType: "CG", validity: "30 Days", userPrice: 450, agentPrice: 425 },
  { network: "MTN", planId: "28", planCode: "28", name: "2.0GB CG", planType: "CG", validity: "30 Days", userPrice: 900, agentPrice: 860 },
  { network: "MTN", planId: "38", planCode: "38", name: "5.0GB CG", planType: "CG", validity: "30 Days", userPrice: 2100, agentPrice: 2000 },
  { network: "MTN", planId: "64", planCode: "64", name: "10.0GB CG", planType: "CG", validity: "30 Days", userPrice: 4800, agentPrice: 4600 },
  { network: "MTN", planId: "78", planCode: "78", name: "3.0GB CG", planType: "CG", validity: "30 Days", userPrice: 1350, agentPrice: 1300 },
  { network: "MTN", planId: "83", planCode: "83", name: "2.0GB CG (2D)", planType: "CG", validity: "2 Days", userPrice: 870, agentPrice: 840 },
  { network: "MTN", planId: "84", planCode: "84", name: "2.5GB CG (2D)", planType: "CG", validity: "2 Days", userPrice: 1050, agentPrice: 1000 },

  // MTN SME & SME2
  { network: "MTN", planId: "17", planCode: "17", name: "500.0MB SME", planType: "SME", validity: "1 Day", userPrice: 290, agentPrice: 270 },
  { network: "MTN", planId: "112", planCode: "112", name: "1.0GB SME2", planType: "SME2", validity: "1 Day", userPrice: 270, agentPrice: 250 },
  { network: "MTN", planId: "293", planCode: "293", name: "100MB SME", planType: "SME", validity: "1 Day", userPrice: 110, agentPrice: 95 },
  { network: "MTN", planId: "294", planCode: "294", name: "200MB SME", planType: "SME", validity: "1 Day", userPrice: 180, agentPrice: 165 },

  // MTN DATASHARE & GIFTING
  { network: "MTN", planId: "18", planCode: "18", name: "1.5GB Gifting", planType: "GIFTING", validity: "7 Days", userPrice: 1050, agentPrice: 1000 },
  { network: "MTN", planId: "151", planCode: "151", name: "1.0GB DataShare", planType: "DATASHARE", validity: "30 Days", userPrice: 280, agentPrice: 260 },
  { network: "MTN", planId: "152", planCode: "152", name: "2.0GB DataShare", planType: "DATASHARE", validity: "30 Days", userPrice: 550, agentPrice: 520 },
  { network: "MTN", planId: "153", planCode: "153", name: "3.0GB DataShare", planType: "DATASHARE", validity: "30 Days", userPrice: 820, agentPrice: 780 },
  { network: "MTN", planId: "154", planCode: "154", name: "5.0GB DataShare", planType: "DATASHARE", validity: "30 Days", userPrice: 1350, agentPrice: 1300 },
  { network: "MTN", planId: "187", planCode: "187", name: "11GB Gifting", planType: "GIFTING", validity: "Weekly", userPrice: 3700, agentPrice: 3550 },
  { network: "MTN", planId: "192", planCode: "192", name: "1.5GB Gifting", planType: "GIFTING", validity: "2 Days", userPrice: 700, agentPrice: 670 },
  { network: "MTN", planId: "284", planCode: "284", name: "18GB Gifting", planType: "GIFTING", validity: "14 Days", userPrice: 6300, agentPrice: 6100 },
  { network: "MTN", planId: "285", planCode: "285", name: "28GB Gifting", planType: "GIFTING", validity: "14 Days", userPrice: 8500, agentPrice: 8200 },

  // ================= AIRTEL DATA PLANS =================
  // AIRTEL CG
  { network: "AIRTEL", planId: "262", planCode: "262", name: "1.2GB CG", planType: "CG", validity: "7 Days", userPrice: 280, agentPrice: 260 },
  { network: "AIRTEL", planId: "240", planCode: "240", name: "1.5GB CG", planType: "CG", validity: "7 Days", userPrice: 620, agentPrice: 590 },
  { network: "AIRTEL", planId: "263", planCode: "263", name: "6.5GB CG", planType: "CG", validity: "14 Days", userPrice: 1350, agentPrice: 1280 },

  // AIRTEL SME
  { network: "AIRTEL", planId: "257", planCode: "257", name: "250MB SME", planType: "SME", validity: "1 Day", userPrice: 130, agentPrice: 115 },
  { network: "AIRTEL", planId: "256", planCode: "256", name: "500MB SME", planType: "SME", validity: "2 Days", userPrice: 820, agentPrice: 790 },
  { network: "AIRTEL", planId: "200", planCode: "200", name: "1.0GB SME", planType: "SME", validity: "7 Days", userPrice: 350, agentPrice: 330 },
  { network: "AIRTEL", planId: "253", planCode: "253", name: "2.0GB SME", planType: "SME", validity: "30 Days", userPrice: 750, agentPrice: 700 },
  { network: "AIRTEL", planId: "255", planCode: "255", name: "3.0GB SME", planType: "SME", validity: "30 Days", userPrice: 2150, agentPrice: 2050 },
  { network: "AIRTEL", planId: "267", planCode: "267", name: "4.0GB SME", planType: "SME", validity: "7 Days", userPrice: 1650, agentPrice: 1570 },
  { network: "AIRTEL", planId: "268", planCode: "268", name: "6.0GB SME", planType: "SME", validity: "14 Days", userPrice: 2650, agentPrice: 2550 },
  { network: "AIRTEL", planId: "213", planCode: "213", name: "8.0GB SME", planType: "SME", validity: "30 Days", userPrice: 3250, agentPrice: 3100 },
  { network: "AIRTEL", planId: "184", planCode: "184", name: "10GB SME", planType: "SME", validity: "30 Days", userPrice: 3200, agentPrice: 3050 },
  { network: "AIRTEL", planId: "181", planCode: "181", name: "15GB SME", planType: "SME", validity: "30 Days", userPrice: 200, agentPrice: 150 },
  { network: "AIRTEL", planId: "258", planCode: "258", name: "18GB SME", planType: "SME", validity: "7 Days", userPrice: 5200, agentPrice: 5000 },

  // AIRTEL AWOOF
  { network: "AIRTEL", planId: "157", planCode: "157", name: "2.0GB Awoof", planType: "AWOOF", validity: "2 Days", userPrice: 400, agentPrice: 375 },
  { network: "AIRTEL", planId: "158", planCode: "158", name: "3.0GB Awoof", planType: "AWOOF", validity: "7 Days", userPrice: 630, agentPrice: 595 },
  { network: "AIRTEL", planId: "159", planCode: "159", name: "4.0GB Awoof", planType: "AWOOF", validity: "30 Days", userPrice: 1200, agentPrice: 1140 },
  { network: "AIRTEL", planId: "160", planCode: "160", name: "10GB Awoof", planType: "AWOOF", validity: "30 Days", userPrice: 2300, agentPrice: 2200 },
  { network: "AIRTEL", planId: "161", planCode: "161", name: "15GB Awoof", planType: "AWOOF", validity: "30 Days", userPrice: 3500, agentPrice: 3380 },

  // AIRTEL GIFTING
  { network: "AIRTEL", planId: "50", planCode: "50", name: "2.0GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 1650, agentPrice: 1580 },
  { network: "AIRTEL", planId: "51", planCode: "51", name: "3.0GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 2100, agentPrice: 2020 },
  { network: "AIRTEL", planId: "266", planCode: "266", name: "4GB + 2GB YouTube", planType: "GIFTING", validity: "7 Days", userPrice: 2150, agentPrice: 2050 },
  { network: "AIRTEL", planId: "269", planCode: "269", name: "13GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 5250, agentPrice: 5050 },

  // ================= 9MOBILE DATA PLANS =================
  { network: "9MOBILE", planId: "45", planCode: "45", name: "500.0MB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 550, agentPrice: 510 },
  { network: "9MOBILE", planId: "11", planCode: "11", name: "1.5GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 1000, agentPrice: 950 },

  // ================= GLO DATA PLANS =================
  { network: "GLO", planId: "28", planCode: "28", name: "1.0GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 480, agentPrice: 450 },
  { network: "GLO", planId: "29", planCode: "29", name: "2.0GB Gifting", planType: "GIFTING", validity: "30 Days", userPrice: 950, agentPrice: 900 }
];

const BuyDataScreen = ({ navigation }) => {
  const [selectedNetwork, setSelectedNetwork] = useState("MTN");
  const [selectedPlanType, setSelectedPlanType] = useState("ALL");
  const [availablePlans, setAvailablePlans] = useState([]);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [userRole, setUserRole] = useState("user");

  // State don bude da rufe zabin bundle
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");
  const [purchasing, setPurchasing] = useState(false);

  const showAlert = (title, message, onPressCallback) => {
    if (Platform.OS === "web") {
      window.alert(`${title}: ${message}`);
      if (onPressCallback) onPressCallback();
    } else {
      Alert.alert(title, message, [{ text: "OK", onPress: onPressCallback }]);
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const stored = await AsyncStorage.getItem("userData");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setUserRole(parsed.role || "user");
        } catch (e) {}
      }
    };
    fetchUserRole();
  }, []);

  // Normalizer don tantance ainihin Network na Plan
  const resolvePlanNetwork = (plan) => {
    const rawNet = String(
      plan.network || plan.networkName || plan.network_name || plan.networkId || ""
    ).toUpperCase().trim();
    const rawCode = String(plan.planCode || plan.code || "").toUpperCase().trim();
    const rawName = String(plan.name || plan.planLabel || "").toUpperCase().trim();

    if (rawNet.includes("MTN") || rawCode.startsWith("MTN") || rawName.includes("MTN")) return "MTN";
    if (rawNet.includes("AIRTEL") || rawCode.startsWith("AIRTEL") || rawName.includes("AIRTEL") || rawNet.includes("AIR")) return "AIRTEL";
    if (rawNet.includes("GLO") || rawCode.startsWith("GLO") || rawName.includes("GLO")) return "GLO";
    if (rawNet.includes("9MOB") || rawNet.includes("ETISALAT") || rawCode.startsWith("9MOB") || rawName.includes("9MOBILE")) return "9MOBILE";
    
    return rawNet;
  };

  // 1. Dauko Plans da Tace su ga Network din da aka zaba
  const fetchLivePlans = useCallback(async (currentNet) => {
    setLoadingPlans(true);
    let plansArray = [];

    try {
      const token = await AsyncStorage.getItem("userToken");
      const config = {
        headers: {
          Authorization: token ? `Bearer ${token}` : undefined,
          Accept: "application/json",
        },
        timeout: 15000,
      };

      let res;
      try {
        res = await axios.get(`${BASE_URL}/data/plans`, config);
      } catch (err1) {
        try {
          res = await axios.get(`${BASE_URL}/plans`, config);
        } catch (err2) {
          res = await axios.get(`${BASE_URL}/superadmin/plans`, config);
        }
      }

      if (res && res.data) {
        const rawPlans = res.data.data || res.data.plans || (Array.isArray(res.data) ? res.data : []);
        if (Array.isArray(rawPlans) && rawPlans.length > 0) {
          plansArray = rawPlans;
        }
      }
    } catch (err) {
      console.log("Remote plans fetch notice, using fallback database:", err.message);
    }

    if (plansArray.length === 0) {
      plansArray = FALLBACK_ALIHSAN_PLANS;
    }

    const targetNetwork = String(currentNet).toUpperCase().trim();
    const networkFiltered = plansArray.filter((p) => {
      const planNet = resolvePlanNetwork(p);
      return planNet === targetNetwork;
    });

    setAvailablePlans(networkFiltered);
    setLoadingPlans(false);
  }, []);

  useEffect(() => {
    fetchLivePlans(selectedNetwork);
    setSelectedPlan(null);
    setIsDropdownOpen(false);
  }, [selectedNetwork, fetchLivePlans]);

  // Tace plans dangane da nau'in bundle (DC, CG, SME, da sauransu)
  const filteredPlans = availablePlans.filter((p) => {
    if (selectedPlanType === "ALL") return true;
    const pType = String(p.planType || p.type || "").toUpperCase().trim();
    const sType = String(selectedPlanType).toUpperCase().trim();
    const pName = String(p.name || p.planLabel || "").toUpperCase().trim();

    return pType === sType || pType.includes(sType) || pName.includes(sType);
  });

  const handleInitiatePurchase = () => {
    if (!phoneNumber || phoneNumber.trim().length < 11) {
      return showAlert("Kuskure", "Shigar da lambar waya mai lamba 11 daidai.");
    }
    if (!selectedPlan) {
      return showAlert("Kuskure", "Da fatan za a zabi bundle din data da kake son saye.");
    }
    setPinModalVisible(true);
  };

  const handleExecutePurchase = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Kuskure", "Da fatan za a shigar da lambar PIN mai lamba 4.");
    }

    setPurchasing(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        showAlert("Matsalar Shiga", "Ba a samu damar shiga ba. Da fatan za a sake shiga.");
        return navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }

      const netName = selectedPlan?.networkName || selectedPlan?.network || selectedNetwork;
      
      // Ainihin lambar ID ta Al-Ihsan Datasub mai tsabta
      const cleanPlanCode = String(selectedPlan?.planId || selectedPlan?.planCode || selectedPlan?.code || "").trim();
      
      const finalAmount =
        userRole === "agent"
          ? (selectedPlan?.agentPrice ?? selectedPlan?.price ?? selectedPlan?.userPrice ?? 0)
          : (selectedPlan?.userPrice ?? selectedPlan?.price ?? 0);

      const requestBody = {
        network: netName,
        networkId: selectedPlan?.networkId || null,
        planCode: cleanPlanCode,
        plan_id: cleanPlanCode,
        phone: phoneNumber.trim(),
        phoneNumber: phoneNumber.trim(),
        amount: Number(finalAmount),
        planType: selectedPlan?.planType || "SME",
        validity: selectedPlan?.validity || "30 Days",
        pin: pin.trim(),
        transactionPin: pin.trim(),
      };

      const axiosConfig = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 25000,
      };

      let res;
      try {
        res = await axios.post(`${BASE_URL}/vtu/buy-data`, requestBody, axiosConfig);
      } catch (postErr) {
        if (postErr.response && postErr.response.status === 404) {
          res = await axios.post(`${BASE_URL}/data/buy`, requestBody, axiosConfig);
        } else {
          throw postErr;
        }
      }

      if (res.data?.success || res.data?.status === "success") {
        setPinModalVisible(false);
        setPin("");

        // Sabunta bayanan wallet a waya idan server ta dawo da sabon balance
        if (res.data?.newBalance !== undefined) {
          const stored = await AsyncStorage.getItem("userData");
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              parsed.walletBalance = res.data.newBalance;
              parsed.balance = res.data.newBalance;
              await AsyncStorage.setItem("userData", JSON.stringify(parsed));
            } catch (e) {}
          }
        }

        showAlert(
          "An Sayi Data Cikin Nasara 🎉",
          `An tura ${selectedPlan?.name || selectedPlan?.planLabel || `Plan ${cleanPlanCode}`} zuwa ga ${phoneNumber} cikin nasara!`,
          () => {
            setPhoneNumber("");
            setSelectedPlan(null);
          }
        );
      } else {
        throw new Error(res.data?.message || res.data?.desc || res.data?.error || "An samu matsalar saye");
      }
    } catch (err) {
      console.error("BUY DATA ERROR CAUGHT:", err);

      let errorMessage = "An samu matsalar hanyar sadarwa ko uwar garke.";
      if (err.response) {
        errorMessage = err.response.data?.message || err.response.data?.desc || err.response.data?.error || `Server ta mayar da kuskure: ${err.response.status}`;
      } else if (err.request) {
        errorMessage = "Babu amsa daga uwar garke. Da fatan za a duba intanet dinka.";
      } else {
        errorMessage = err.message;
      }

      showAlert("Cinikin Bai Yi Nasara Ba", errorMessage);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sayen Data Bundles</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Network Selector */}
        <Text style={styles.sectionLabel}>ZABI HANYAR SADARWA (NETWORK)</Text>
        <View style={styles.networkGrid}>
          {["MTN", "AIRTEL", "GLO", "9MOBILE"].map((net) => (
            <TouchableOpacity
              key={net}
              style={[styles.networkBtn, selectedNetwork === net && styles.networkBtnActive]}
              onPress={() => setSelectedNetwork(net)}
            >
              <Text style={[styles.networkBtnText, selectedNetwork === net && styles.networkBtnTextActive]}>
                {net}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Plan Type Selector */}
        <Text style={styles.sectionLabel}>NAU'IN BUNDLE (PLAN TYPE)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          {["ALL", "DC", "CG", "SME", "SME2", "AWOOF", "GIFTING", "DATASHARE"].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.typeChip, selectedPlanType === type && styles.typeChipActive]}
              onPress={() => setSelectedPlanType(type)}
            >
              <Text style={[styles.typeChipText, selectedPlanType === type && styles.typeChipTextActive]}>
                {type}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Phone Input */}
        <Text style={styles.sectionLabel}>LAMBAR WAYAR DA ZA A TURA WA</Text>
        <TextInput
          style={styles.input}
          placeholder="Misali: 08012345678"
          placeholderTextColor="#64748b"
          keyboardType="numeric"
          maxLength={11}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
        />

        {/* Maballin Zaɓen Bundle (Dropdown) */}
        <Text style={styles.sectionLabel}>KUNSHIN DATA (DATA BUNDLE)</Text>
        <TouchableOpacity
          style={[styles.dropdownBtn, isDropdownOpen && styles.dropdownBtnActive]}
          onPress={() => setIsDropdownOpen(!isDropdownOpen)}
          activeOpacity={0.8}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1, marginRight: 10 }}>
            <MaterialCommunityIcons
              name={selectedPlan ? "check-circle" : "layers-triple-outline"}
              size={22}
              color={selectedPlan ? "#10b981" : "#00f0ff"}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.dropdownBtnTitle} numberOfLines={1}>
                {selectedPlan
                  ? `${selectedPlan.name || selectedPlan.planLabel || selectedPlan.planCode} (₦${Number(
                      userRole === "agent"
                        ? (selectedPlan.agentPrice ?? selectedPlan.userPrice ?? selectedPlan.price)
                        : (selectedPlan.userPrice ?? selectedPlan.price)
                    ).toLocaleString()})`
                  : `Zabi Bundle din Data (${selectedNetwork})`}
              </Text>
              <Text style={styles.dropdownBtnSubtitle}>
                {selectedPlan
                  ? `Tsawon Lokaci: ${selectedPlan.validity || "30 Days"} • Nau'i: ${selectedPlan.planType || "SME"} • ID: ${selectedPlan.planId || selectedPlan.planCode}`
                  : `Danna don bude jerin bundles (${filteredPlans.length})`}
              </Text>
            </View>
          </View>
          <Ionicons
            name={isDropdownOpen ? "chevron-up" : "chevron-down"}
            size={22}
            color={isDropdownOpen ? "#00f0ff" : "#94a3b8"}
          />
        </TouchableOpacity>

        {/* Jerin Data Bundles */}
        {isDropdownOpen && (
          <View style={styles.plansContainer}>
            {loadingPlans ? (
              <View style={{ paddingVertical: 20, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#00f0ff" />
                <Text style={{ color: "#64748b", fontSize: 12, marginTop: 8 }}>Ana loda tsare-tsaren {selectedNetwork}...</Text>
              </View>
            ) : filteredPlans.length === 0 ? (
              <View style={styles.emptyCard}>
                <Feather name="wifi-off" size={26} color="#64748b" />
                <Text style={styles.emptyText}>Babu bundle na {selectedPlanType} a karkashin {selectedNetwork} a yanzu.</Text>
              </View>
            ) : (
              filteredPlans.map((plan) => {
                const uniqueKey = plan.planId || plan.planCode || plan._id || plan.id;
                const isSelected = selectedPlan && (
                  (selectedPlan.planId && selectedPlan.planId === plan.planId) ||
                  (selectedPlan.planCode && selectedPlan.planCode === plan.planCode) ||
                  (selectedPlan._id && selectedPlan._id === plan._id)
                );
                const finalPrice =
                  userRole === "agent"
                    ? (plan.agentPrice ?? plan.userPrice ?? plan.price ?? 0)
                    : (plan.userPrice ?? plan.price ?? 0);
                const planTitle = plan.name || plan.planLabel || `${plan.network || selectedNetwork} Plan ${plan.planId || plan.planCode}`;
                const validity = plan.validity ? (String(plan.validity).includes("Day") ? plan.validity : `${plan.validity} Days`) : "30 Days";
                const exactId = plan.planId || plan.planCode || "N/A";

                return (
                  <TouchableOpacity
                    key={uniqueKey}
                    style={[styles.planCard, isSelected && styles.planCardActive]}
                    onPress={() => {
                      setSelectedPlan(plan);
                      setIsDropdownOpen(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={[styles.planTitle, isSelected && { color: "#fff" }]} numberOfLines={1}>
                        {planTitle}
                      </Text>
                      <View style={styles.metaRow}>
                        <Text style={styles.planTypeTag}>
                          {plan.planType || "SME"} • ID: {exactId}
                        </Text>
                        <Text style={styles.validityTag}>⏳ {validity}</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[styles.planPrice, isSelected && { color: "#10b981" }]}>
                        ₦{Number(finalPrice).toLocaleString()}
                      </Text>
                      {isSelected && (
                        <View style={styles.selectedBadge}>
                          <Ionicons name="checkmark-circle" size={13} color="#10b981" />
                          <Text style={styles.selectedBadgeText}>AN ZABA</Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Maballin Saye */}
        <TouchableOpacity
          style={[styles.submitBtn, (!selectedPlan || !phoneNumber) && { opacity: 0.5 }]}
          onPress={handleInitiatePurchase}
          disabled={!selectedPlan || !phoneNumber}
        >
          <Text style={styles.submitBtnText}>
            SAYI DATA (₦
            {selectedPlan
              ? Number(
                  userRole === "agent"
                    ? (selectedPlan.agentPrice ?? selectedPlan.userPrice ?? selectedPlan.price)
                    : (selectedPlan.userPrice ?? selectedPlan.price)
                ).toLocaleString()
              : "0"}
            )
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal na Shigar da Transaction PIN */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={32} color="#00f0ff" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Shigar da PIN</Text>
            <Text style={styles.modalSubtitle}>Shigar da lambar PIN dinka mai lamba 4 domin kammala sayen data</Text>

            <TextInput
              style={styles.pinInput}
              placeholder="••••"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={setPin}
            />

            <TouchableOpacity
              style={[styles.modalSubmitBtn, purchasing && { opacity: 0.7 }]}
              onPress={handleExecutePurchase}
              disabled={purchasing}
            >
              {purchasing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.modalSubmitBtnText}>Tabbatar da Biya</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setPinModalVisible(false);
                setPin("");
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={{ color: "#ef4444", fontWeight: "bold" }}>Soke</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#050811", paddingHorizontal: 16 },
  headerBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 35,
    paddingBottom: 15,
  },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  sectionLabel: { color: "#64748b", fontSize: 11, fontWeight: "900", letterSpacing: 0.8, marginTop: 16, marginBottom: 8 },
  networkGrid: { flexDirection: "row", justifyContent: "space-between" },
  networkBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0b1120",
    marginHorizontal: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  networkBtnActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  networkBtnText: { color: "#94a3b8", fontWeight: "bold", fontSize: 12 },
  networkBtnTextActive: { color: "#fff" },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0b1120",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  typeChipActive: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  typeChipText: { color: "#94a3b8", fontSize: 11, fontWeight: "bold" },
  typeChipTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 50,
    color: "#f8fafc",
    fontSize: 15,
    fontWeight: "600",
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dropdownBtnActive: {
    borderColor: "#00f0ff",
    backgroundColor: "#071328",
  },
  dropdownBtnTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "900" },
  dropdownBtnSubtitle: { color: "#64748b", fontSize: 11, marginTop: 2 },
  plansContainer: {
    backgroundColor: "#070c18",
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginTop: 8,
    marginBottom: 4,
  },
  planCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    backgroundColor: "#0b1120",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  planCardActive: { borderColor: "#00f0ff", backgroundColor: "#071328" },
  planTitle: { color: "#f8fafc", fontSize: 13, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  planTypeTag: { color: "#64748b", fontSize: 11, marginRight: 10 },
  validityTag: { color: "#eab308", fontSize: 11, fontWeight: "700" },
  planPrice: { color: "#00f0ff", fontSize: 15, fontWeight: "900" },
  selectedBadge: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  selectedBadgeText: { color: "#10b981", fontSize: 10, fontWeight: "900", marginLeft: 3 },
  emptyCard: { backgroundColor: "#0b1120", padding: 20, borderRadius: 12, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  emptyText: { color: "#64748b", fontSize: 12, marginTop: 6, textAlign: "center" },
  submitBtn: { backgroundColor: "#0284c7", paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 15 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "900", letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center", padding: 20 },
  modalContent: { width: "100%", maxWidth: 320, backgroundColor: "#0b1120", borderRadius: 20, padding: 22, alignItems: "center", borderWidth: 1, borderColor: "#1e293b" },
  modalTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  modalSubtitle: { color: "#64748b", fontSize: 11, textAlign: "center", marginVertical: 8 },
  pinInput: {
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
  modalSubmitBtn: { width: "100%", backgroundColor: "#0284c7", paddingVertical: 12, borderRadius: 10, alignItems: "center" },
  modalSubmitBtnText: { color: "#fff", fontWeight: "bold", fontSize: 13 },
});

export default BuyDataScreen;