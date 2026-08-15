import React, { useState, useEffect } from "react";
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
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const NIMCScreen = ({ navigation }) => {
  const [view, setView] = useState("main");
  const [searchType, setSearchType] = useState(null);
  const [formData, setFormData] = useState({ searchValue: "", pin: "" });
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState({});
  const [fetchingPrices, setFetchingPrices] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/nimc/prices`);
        if (res.data.success || res.data.status === "success") {
          setPrices(res.data.prices || res.data.data || {});
        }
      } catch (err) {
        console.log("Error fetching NIMC prices", err.message);
      } finally {
        setFetchingPrices(false);
      }
    };
    fetchPrices();
  }, []);

  const handleVerification = async () => {
    if (!formData.searchValue || !formData.pin) {
      Alert.alert("Required", "Please enter ID number and valid Transaction PIN.");
      return;
    }
    if (formData.pin.length < 4) {
      return Alert.alert("Error", "Enter a valid 4-digit Transaction PIN.");
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        Alert.alert("Session Expired", "Please login again.");
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const res = await axios.post(
        `${BASE_URL}/nimc/verify-and-charge`,
        {
          searchValue: formData.searchValue,
          searchType: searchType.id,
          pin: formData.pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      const result = res.data;
      if (result.success || result.status === "success") {
        setUserData(result.data || result);
        setView("result");
      } else {
        throw new Error(result.message || "Verification failed");
      }
    } catch (err) {
      Alert.alert(
        "Verification Failed",
        err.response?.data?.message || err.message || "Internal Server Error",
      );
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!userData) return;
    Alert.alert("Success", "Generating your document for printing...");
  };

  if (view === "main" && !searchType) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={26} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Printing Services</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.bannerCard}>
          <MaterialCommunityIcons name="printer-check" size={40} color="#fff" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.bannerText}>Print NIMC Slips</Text>
            <Text style={styles.bannerSub}>
              Verify and download official slips securely
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Verification & Printing Options</Text>

        <View style={styles.grid}>
          <ServiceCard
            title="NIN Verification"
            icon="fingerprint"
            price={prices.nin || 1000}
            onPress={() =>
              setSearchType({ id: "nin", name: "NIN Verification" })
            }
          />
          <ServiceCard
            title="Phone Search"
            icon="phone-alt"
            price={prices.phone || 1000}
            onPress={() =>
              setSearchType({ id: "phone", name: "Phone Number Search" })
            }
          />
          <ServiceCard
            title="Tracking ID"
            icon="barcode"
            price={prices.trackingId || 1000}
            onPress={() =>
              setSearchType({ id: "trackingId", name: "Tracking ID Search" })
            }
          />
          <ServiceCard
            title="Premium ID Card"
            icon="id-card"
            price={prices.premiumCard || 1500}
            onPress={() =>
              setSearchType({
                id: "premiumCard",
                name: "Premium Card Printing",
              })
            }
          />
          <ServiceCard
            title="Standard Slip"
            icon="file-alt"
            price={prices.standardSlip || 500}
            onPress={() =>
              setSearchType({ id: "standardSlip", name: "Standard NIMC Slip" })
            }
          />
          <ServiceCard
            title="Basic NIMC Slip"
            icon="print"
            price={prices.basicSlip || 300}
            onPress={() =>
              setSearchType({ id: "basicSlip", name: "Basic Slip Printing" })
            }
          />
        </View>

        <TouchableOpacity
          style={styles.modCard}
          onPress={() => navigation.navigate("NIMCModification")}
        >
          <View style={styles.modIconBox}>
            <FontAwesome5 name="edit" size={18} color="#1e3a8a" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.modTitle}>Data Modifications</Text>
            <Text style={styles.modSub}>Correct Name, DOB or Phone Number</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  if (view === "main" && searchType) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => setSearchType(null)}>
            <Ionicons name="arrow-back" size={26} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{searchType.name}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Identification Number / Value</Text>
          <TextInput
            placeholder="Enter ID or Number"
            placeholderTextColor="#94a3b8"
            style={styles.input}
            value={formData.searchValue}
            onChangeText={(v) => setFormData({ ...formData, searchValue: v })}
          />

          <Text style={styles.inputLabel}>Transaction PIN (Required)</Text>
          <TextInput
            placeholder="****"
            placeholderTextColor="#94a3b8"
            style={styles.pinInput}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            value={formData.pin}
            onChangeText={(v) => setFormData({ ...formData, pin: v })}
          />

          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Service Fee:</Text>
            <Text style={styles.priceValue}>₦{prices[searchType.id] || 1000}</Text>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleVerification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>VERIFY & PRINT SLIP</Text>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  if (view === "result") {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => { setView("main"); setSearchType(null); setFormData({ searchValue: "", pin: "" }); }}>
            <Ionicons name="close" size={26} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Successful</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.resultCard}>
          {userData?.photo ? (
            <Image
              source={{ uri: `data:image/jpeg;base64,${userData.photo}` }}
              style={styles.userPhoto}
            />
          ) : (
            <View style={[styles.userPhoto, { justifyContent: "center", alignItems: "center", backgroundColor: "#e2e8f0" }]}>
              <Ionicons name="person" size={50} color="#64748b" />
            </View>
          )}
          <View style={styles.infoBox}>
            <InfoRow label="Full Name" value={userData?.fullName || `${userData?.firstName || ""} ${userData?.surname || ""}`} />
            <InfoRow label="NIN Number" value={userData?.nin} />
            <InfoRow label="Tracking ID" value={userData?.trackingId} />
          </View>

          <TouchableOpacity style={styles.downloadBtn} onPress={generatePDF}>
            <MaterialCommunityIcons
              name="file-pdf-box"
              size={24}
              color="#fff"
            />
            <Text style={styles.downloadText}>Download Printing Slip</Text>
          </TouchableOpacity>
        </View>
        <View style={{ height: 50 }} />
      </ScrollView>
    );
  }

  return null;
};

const ServiceCard = ({ title, icon, price, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.8}>
    <View style={styles.iconCircle}>
      <FontAwesome5 name={icon} size={18} color="#1e3a8a" />
    </View>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardPrice}>₦{price}</Text>
  </TouchableOpacity>
);

const InfoRow = ({ label, value }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value || "N/A"}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc", paddingHorizontal: 20 },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 45,
    marginBottom: 20,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#1e3a8a" },
  bannerCard: {
    backgroundColor: "#1e3a8a",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  bannerText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bannerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#475569",
    marginBottom: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: (width - 50) / 2,
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  iconCircle: {
    width: 45,
    height: 45,
    backgroundColor: "#eff6ff",
    borderRadius: 22.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#475569",
    textAlign: "center",
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e3a8a",
    marginTop: 6,
  },
  modCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 16,
    borderRadius: 15,
    alignItems: "center",
    marginTop: 5,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modIconBox: {
    width: 42,
    height: 42,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modTitle: { fontWeight: "bold", color: "#1e3a8a", fontSize: 15 },
  modSub: { fontSize: 11, color: "#64748b", marginTop: 2 },
  formCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 10,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    fontSize: 16,
    color: "#0f172a",
  },
  pinInput: {
    backgroundColor: "#f8fafc",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 20,
    fontSize: 18,
    textAlign: "center",
    letterSpacing: 6,
    color: "#0f172a",
  },
  priceTag: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    backgroundColor: "#f1f5f9",
    padding: 12,
    borderRadius: 10,
  },
  priceLabel: { fontWeight: "bold", color: "#64748b", fontSize: 14 },
  priceValue: { fontWeight: "bold", color: "#16a34a", fontSize: 16 },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    padding: 18,
    borderRadius: 15,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  resultCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  userPhoto: {
    width: 110,
    height: 110,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#1e3a8a",
  },
  infoBox: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 15,
  },
  infoLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 15,
    color: "#1e293b",
    fontWeight: "bold",
    marginTop: 2,
  },
  downloadBtn: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    width: "100%",
    padding: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  downloadText: { color: "#fff", fontWeight: "bold", fontSize: 14, marginLeft: 8 },
});

export default NIMCScreen;