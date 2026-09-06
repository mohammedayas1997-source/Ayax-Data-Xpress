import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StatusBar,
  Modal,
  Platform,
  ToastAndroid,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const allDiscos = [
  { label: "Abuja Electricity (AEDC)", value: "abuja-electric", short: "AEDC" },
  { label: "Eko Electricity (EKEDC)", value: "eko-electric", short: "EKEDC" },
  { label: "Ikeja Electricity (IKEDC)", value: "ikeja-electric", short: "IKEDC" },
  { label: "Kano Electricity (KEDCO)", value: "kano-electric", short: "KEDCO" },
  { label: "Port Harcourt (PHED)", value: "portharcourt-electric", short: "PHED" },
  { label: "Jos Electricity (JED)", value: "jos-electric", short: "JED" },
  { label: "Enugu Electricity (EEDC)", value: "enugu-electric", short: "EEDC" },
  { label: "Ibadan Electricity (IBEDC)", value: "ibadan-electric", short: "IBEDC" },
  { label: "Kaduna Electricity (KAEDCO)", value: "kaduna-electric", short: "KAEDCO" },
  { label: "Benin Electricity (BEDC)", value: "benin-electric", short: "BEDC" },
  { label: "Yola Electricity (YEDC)", value: "yola-electric", short: "YEDC" },
];

const ElectricityScreen = ({ navigation }) => {
  const [disco, setDisco] = useState("abuja-electric");
  const [meterNo, setMeterNo] = useState("");
  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState("");
  const [meterType, setMeterType] = useState("prepaid");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Fixed Standard Service Fee
  const SERVICE_FEE = 50;

  // Verification & Purchasing States
  const [verifying, setVerifying] = useState(false);
  const [paying, setPaying] = useState(false);

  // PIN Modal
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [pin, setPin] = useState("");

  // Token Success Receipt Modal
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [purchasedTokenData, setPurchasedTokenData] = useState(null);
  const [copied, setCopied] = useState(false);

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

  useEffect(() => {
    const loadPhone = async () => {
      const user = await AsyncStorage.getItem("userData");
      if (user) {
        try {
          const parsed = JSON.parse(user);
          if (parsed.phone) setPhone(parsed.phone);
        } catch (e) {}
      }
    };
    loadPhone();
  }, []);

  // 1. Meter Verification Matching Backend
  const verifyMeter = async () => {
    if (!disco || !meterNo.trim()) {
      return showAlert("Required", "Please select a DISCO and enter Meter Number.");
    }

    setVerifying(true);
    setCustomerName("");
    setCustomerAddress("");

    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const res = await axios.post(
        `${BASE_URL}/bills/electricity/verify`,
        {
          disco,
          electricCompany: disco,
          meterNo: meterNo.trim(),
          meterNumber: meterNo.trim(),
          meterType,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 25000,
        }
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        const name =
          result.customerName ||
          result.name ||
          result.data?.customerName ||
          result.data?.name ||
          "Verified Consumer";
        const address =
          result.address ||
          result.customerAddress ||
          result.data?.address ||
          "";

        setCustomerName(name);
        setCustomerAddress(address);
      } else {
        throw new Error(result.message || "Meter verification failed.");
      }
    } catch (e) {
      showAlert(
        "Verification Failed",
        e.response?.data?.message || e.message || "Could not verify meter number."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleInitiatePayment = () => {
    if (!customerName) {
      return showAlert("Action Required", "Please verify your meter number first.");
    }
    const numericAmount = Number(amount);
    if (!amount || isNaN(numericAmount) || numericAmount < 500) {
      return showAlert("Invalid Amount", "Minimum recharge amount is ₦500.");
    }
    if (!phone || phone.trim().length < 10) {
      return showAlert("Phone Required", "Please provide a valid recipient phone number.");
    }

    setPinModalVisible(true);
  };

  // 2. Purchase Electricity Token Matching Backend
  const handlePayment = async () => {
    if (!pin || pin.length < 4) {
      return showAlert("Error", "Please enter your valid 4-digit Transaction PIN.");
    }

    setPaying(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setPinModalVisible(false);
        return showAlert("Session Expired", "Please login again.", () => {
          navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        });
      }

      const finalAmount = Number(amount.trim());
      const res = await axios.post(
        `${BASE_URL}/bills/electricity/buy`,
        {
          disco,
          electricCompany: disco,
          meterNo: meterNo.trim(),
          meterNumber: meterNo.trim(),
          meterType,
          amount: finalAmount,
          phone: phone.trim(),
          phoneNo: phone.trim(),
          phoneNumber: phone.trim(),
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

        const tokenGenerated =
          result.token ||
          result.data?.token ||
          result.data?.meterToken ||
          result.tokenValue ||
          "Token Generated (Check SMS)";

        const unitsGenerated =
          result.units ||
          result.unit ||
          result.data?.units ||
          "Units credited to meter";

        const receiptPayload = {
          token: tokenGenerated,
          units: unitsGenerated,
          meterNo: meterNo.trim(),
          customerName,
          discoName: allDiscos.find((d) => d.value === disco)?.label || disco,
          amount: finalAmount,
          fee: SERVICE_FEE,
          total: finalAmount + SERVICE_FEE,
          date: new Date().toLocaleString("en-GB"),
          reference: result.reference || result.data?.reference || `ELEC_${Date.now()}`,
        };

        setPurchasedTokenData(receiptPayload);
        setSuccessModalVisible(true);
      } else {
        throw new Error(result.message || "Transaction Error occurred.");
      }
    } catch (e) {
      const errorMsg =
        e.response?.data?.message ||
        e.message ||
        "Server communication failure. Please check your connection.";
      showAlert("Payment Failed", errorMsg);
    } finally {
      setPaying(false);
    }
  };

  const copyTokenToClipboard = async (tokenValue) => {
    if (!tokenValue) return;
    await Clipboard.setStringAsync(tokenValue);
    setCopied(true);
    if (Platform.OS === "android") {
      ToastAndroid.show("Token copied to clipboard!", ToastAndroid.SHORT);
    }
    setTimeout(() => setCopied(false), 3000);
  };

  const totalPayable = (Number(amount) || 0) + SERVICE_FEE;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#050811" />

      {/* Top Navigation */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f8fafc" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Electricity Token Purchase</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Meter Type Selector */}
        <Text style={styles.sectionLabel}>METER CLASSIFICATION</Text>
        <View style={styles.typeRow}>
          {["prepaid", "postpaid"].map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, meterType === t && styles.activeTypeBtn]}
              onPress={() => {
                setMeterType(t);
                setCustomerName("");
              }}
            >
              <Ionicons
                name={t === "prepaid" ? "flash-outline" : "receipt-outline"}
                size={18}
                color={meterType === t ? "#00f0ff" : "#64748b"}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.typeBtnText, meterType === t && styles.activeTypeBtnText]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Distribution Companies (DISCO) Horizontal List */}
        <Text style={styles.sectionLabel}>DISTRIBUTION COMPANY (DISCO)</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.discoScroll}>
          {allDiscos.map((item) => {
            const isSelected = disco === item.value;
            return (
              <TouchableOpacity
                key={item.value}
                style={[styles.discoChip, isSelected && styles.activeDiscoChip]}
                onPress={() => {
                  setDisco(item.value);
                  setCustomerName("");
                }}
              >
                <Text style={[styles.discoChipText, isSelected && styles.activeDiscoChipText]}>
                  {item.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Meter Number & Verification */}
        <Text style={styles.sectionLabel}>METER / ACCOUNT NUMBER</Text>
        <View style={styles.meterInputContainer}>
          <TextInput
            style={styles.meterInput}
            placeholder="Enter 11-digit Meter Number"
            placeholderTextColor="#64748b"
            keyboardType="numeric"
            value={meterNo}
            onChangeText={(val) => {
              setMeterNo(val);
              setCustomerName("");
            }}
          />
          <TouchableOpacity
            style={[styles.verifyInlineBtn, (!meterNo || verifying) && { opacity: 0.7 }]}
            onPress={verifyMeter}
            disabled={verifying || !meterNo}
          >
            {verifying ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.verifyInlineBtnText}>VERIFY</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Consumer Card (Post-verification) */}
        {customerName ? (
          <View style={styles.consumerCard}>
            <View style={styles.consumerIconWrap}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.consumerLabel}>VERIFIED CONSUMER</Text>
              <Text style={styles.consumerName}>{customerName}</Text>
              {customerAddress ? (
                <Text style={styles.consumerAddress} numberOfLines={1}>
                  {customerAddress}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Recipient Phone Number */}
        <Text style={styles.sectionLabel}>RECIPIENT PHONE NUMBER (FOR TOKEN SMS)</Text>
        <TextInput
          style={styles.inputField}
          placeholder="e.g. 08012345678"
          placeholderTextColor="#64748b"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />

        {/* Amount & Automatic Fee Breakdown */}
        <View style={styles.billingRow}>
          <View style={{ flex: 1.2, marginRight: 10 }}>
            <Text style={styles.sectionLabel}>PURCHASE AMOUNT (₦)</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Min ₦500"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
          </View>

          <View style={{ flex: 0.8 }}>
            <Text style={styles.sectionLabel}>SERVICE FEE (₦)</Text>
            <View style={styles.feeFieldBox}>
              <Text style={styles.feeFieldText}>₦{SERVICE_FEE}</Text>
              <Text style={styles.autoTag}>FLAT</Text>
            </View>
          </View>
        </View>

        {/* Total Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Recharge Value</Text>
            <Text style={styles.summaryVal}>₦{Number(amount || 0).toLocaleString()}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Convenience Charge</Text>
            <Text style={styles.summaryVal}>₦{SERVICE_FEE}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Payable</Text>
            <Text style={styles.totalVal}>₦{totalPayable.toLocaleString()}</Text>
          </View>
        </View>

        {/* Purchase Action Button */}
        <TouchableOpacity
          style={[styles.submitBtn, (!customerName || !amount) && { opacity: 0.5 }]}
          onPress={handleInitiatePayment}
          disabled={!customerName || !amount}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["#0284c7", "#2563eb"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            <Ionicons name="flash" size={18} color="#fff" style={{ marginRight: 6 }} />
            <Text style={styles.submitBtnText}>
              PROCEED TO PAY ₦{totalPayable.toLocaleString()}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>

      {/* Transaction PIN Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="shield-checkmark" size={36} color="#00f0ff" style={{ marginBottom: 10 }} />
            <Text style={styles.modalTitle}>Enter Security PIN</Text>
            <Text style={styles.modalSubtitle}>
              Authorize token purchase of ₦{totalPayable.toLocaleString()} for {customerName} (Includes ₦{SERVICE_FEE} service fee)
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
              style={[styles.modalSubmitBtn, paying && { opacity: 0.7 }]}
              onPress={handlePayment}
              disabled={paying}
            >
              {paying ? (
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
              <Text style={{ color: "#ef4444", fontWeight: "bold", fontSize: 13 }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Clean Screen-Capturable Token Success Receipt Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={styles.receiptOverlay}>
          <View style={styles.receiptCard}>
            <View style={styles.receiptHeader}>
              <Ionicons name="checkmark-circle" size={48} color="#10b981" />
              <Text style={styles.receiptTitle}>TOKEN GENERATED</Text>
              <Text style={styles.receiptSubtitle}>Take a screenshot or copy token for your meter</Text>
            </View>

            {/* Token Display Box */}
            <View style={styles.tokenHighlightBox}>
              <Text style={styles.tokenBoxLabel}>20-DIGIT METER TOKEN</Text>
              <Text style={styles.tokenDigitText} selectable>
                {purchasedTokenData?.token}
              </Text>
              <TouchableOpacity
                style={styles.copyTokenBtn}
                onPress={() => copyTokenToClipboard(purchasedTokenData?.token)}
                activeOpacity={0.8}
              >
                <Ionicons name={copied ? "checkmark" : "copy-outline"} size={16} color="#00f0ff" />
                <Text style={styles.copyTokenBtnText}>{copied ? "COPIED!" : "COPY TOKEN"}</Text>
              </TouchableOpacity>
            </View>

            {/* Detailed Transaction Breakdown */}
            <View style={styles.receiptDetails}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Consumer Name</Text>
                <Text style={styles.receiptRowVal}>{purchasedTokenData?.customerName}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Meter Number</Text>
                <Text style={styles.receiptRowVal}>{purchasedTokenData?.meterNo}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Units Allocated</Text>
                <Text style={[styles.receiptRowVal, { color: "#10b981", fontWeight: "900" }]}>
                  {purchasedTokenData?.units}
                </Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Token Amount</Text>
                <Text style={styles.receiptRowVal}>₦{purchasedTokenData?.amount?.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Service Fee</Text>
                <Text style={styles.receiptRowVal}>₦{purchasedTokenData?.fee}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Total Paid</Text>
                <Text style={styles.receiptRowVal}>₦{purchasedTokenData?.total?.toLocaleString()}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Reference</Text>
                <Text style={[styles.receiptRowVal, { fontSize: 11 }]}>
                  {purchasedTokenData?.reference}
                </Text>
              </View>
            </View>

            {/* Done Action */}
            <TouchableOpacity
              style={styles.receiptDoneBtn}
              onPress={() => {
                setSuccessModalVisible(false);
                navigation.goBack();
              }}
            >
              <Text style={styles.receiptDoneBtnText}>DONE</Text>
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
    paddingTop: Platform.OS === "ios" ? 52 : 38,
    paddingBottom: 15,
  },
  headerTitle: { color: "#f8fafc", fontSize: 16, fontWeight: "900" },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  sectionLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginTop: 14,
    marginBottom: 8,
  },
  typeRow: { flexDirection: "row", justifyContent: "space-between" },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    marginHorizontal: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0b1120",
  },
  activeTypeBtn: { backgroundColor: "#0b192e", borderColor: "#00f0ff" },
  typeBtnText: { color: "#64748b", fontWeight: "800", fontSize: 12 },
  activeTypeBtnText: { color: "#fff" },
  discoScroll: { flexDirection: "row" },
  discoChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#0b1120",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  activeDiscoChip: { backgroundColor: "#0284c7", borderColor: "#00f0ff" },
  discoChipText: { color: "#94a3b8", fontWeight: "800", fontSize: 12 },
  activeDiscoChipText: { color: "#fff" },
  meterInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    paddingHorizontal: 10,
    height: 52,
  },
  meterInput: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700" },
  verifyInlineBtn: {
    backgroundColor: "#0284c7",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  verifyInlineBtnText: { color: "#fff", fontWeight: "900", fontSize: 11 },
  consumerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#07172c",
    padding: 14,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#00f0ff",
  },
  consumerIconWrap: { marginRight: 12 },
  consumerLabel: { color: "#00f0ff", fontSize: 10, fontWeight: "900", letterSpacing: 0.5 },
  consumerName: { color: "#fff", fontWeight: "900", fontSize: 14, marginTop: 2 },
  consumerAddress: { color: "#94a3b8", fontSize: 11, marginTop: 2 },
  billingRow: { flexDirection: "row", justifyContent: "space-between" },
  inputField: {
    backgroundColor: "#0b1120",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  feeFieldBox: {
    backgroundColor: "#070c18",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  feeFieldText: { color: "#94a3b8", fontSize: 14, fontWeight: "800" },
  autoTag: {
    color: "#10b981",
    fontSize: 9,
    fontWeight: "900",
    backgroundColor: "rgba(16,185,129,0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  summaryCard: {
    backgroundColor: "#0b1120",
    borderRadius: 14,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 4,
  },
  summaryLabel: { color: "#64748b", fontSize: 12, fontWeight: "600" },
  summaryVal: { color: "#94a3b8", fontSize: 12, fontWeight: "700" },
  divider: { height: 1, backgroundColor: "#1e293b", marginVertical: 8 },
  totalLabel: { color: "#fff", fontSize: 13, fontWeight: "900" },
  totalVal: { color: "#00f0ff", fontSize: 16, fontWeight: "900" },
  submitBtn: { borderRadius: 14, overflow: "hidden", marginTop: 18 },
  submitBtnGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  submitBtnText: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },

  // PIN Modal
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

  // Token Success Receipt
  receiptOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  receiptCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#0b1120",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "#1e293b",
    alignItems: "center",
  },
  receiptHeader: { alignItems: "center", marginBottom: 16 },
  receiptTitle: { color: "#fff", fontSize: 16, fontWeight: "900", marginTop: 8 },
  receiptSubtitle: { color: "#64748b", fontSize: 11, textAlign: "center", marginTop: 4 },
  tokenHighlightBox: {
    width: "100%",
    backgroundColor: "#071328",
    borderWidth: 1,
    borderColor: "#00f0ff",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  tokenBoxLabel: { color: "#00f0ff", fontSize: 10, fontWeight: "900", letterSpacing: 1 },
  tokenDigitText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 2,
    marginVertical: 10,
    textAlign: "center",
  },
  copyTokenBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 240, 255, 0.12)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyTokenBtnText: { color: "#00f0ff", fontSize: 11, fontWeight: "900", marginLeft: 4 },
  receiptDetails: { width: "100%", marginBottom: 18 },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  receiptRowLabel: { color: "#64748b", fontSize: 11, fontWeight: "600" },
  receiptRowVal: { color: "#fff", fontSize: 12, fontWeight: "800", maxWidth: "60%" },
  receiptDoneBtn: {
    width: "100%",
    backgroundColor: "#10b981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  receiptDoneBtnText: { color: "#fff", fontSize: 13, fontWeight: "900", letterSpacing: 0.5 },
});

export default ElectricityScreen;