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
} from "react-native";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-api-v2.vercel.app/api/v1";

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
        if (res.data.success) {
          setPrices(res.data.prices);
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
      Alert.alert("Required", "Please enter ID number and Transaction PIN.");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const res = await axios.post(
        `${BASE_URL}/nimc/verify-and-charge`,
        {
          searchValue: formData.searchValue,
          searchType: searchType.id,
          pin: formData.pin,
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (res.data.success) {
        setUserData(res.data.data);
        setView("result");
      }
    } catch (err) {
      Alert.alert(
        "Verification Failed",
        err.response?.data?.message || "Internal Server Error",
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
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>NIMC Printing Services</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.bannerCard}>
          <MaterialCommunityIcons name="printer-check" size={40} color="#fff" />
          <View style={{ marginLeft: 15 }}>
            <Text style={styles.bannerText}>Print NIMC Slips</Text>
            <Text style={styles.bannerSub}>
              Verify and download official slips
            </Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Verification & Printing Options</Text>

        <View style={styles.grid}>
          {/* Search Methods */}
          <ServiceCard
            title="NIN Verification"
            icon="fingerprint"
            price={prices.nin || 0}
            onPress={() =>
              setSearchType({ id: "nin", name: "NIN Verification" })
            }
          />
          <ServiceCard
            title="Phone Search"
            icon="phone-alt"
            price={prices.phone || 0}
            onPress={() =>
              setSearchType({ id: "phone", name: "Phone Number Search" })
            }
          />
          <ServiceCard
            title="Tracking ID"
            icon="barcode"
            price={prices.trackingId || 0}
            onPress={() =>
              setSearchType({ id: "trackingId", name: "Tracking ID Search" })
            }
          />

          {/* Printing Services */}
          <ServiceCard
            title="Premium ID Card"
            icon="id-card"
            price={prices.premiumCard || 0}
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
            price={prices.standardSlip || 0}
            onPress={() =>
              setSearchType({ id: "standardSlip", name: "Standard NIMC Slip" })
            }
          />
          <ServiceCard
            title="Basic NIMC Slip"
            icon="print"
            price={prices.basicSlip || 0}
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
            <FontAwesome5 name="edit" size={20} color="#1e3a8a" />
          </View>
          <View style={{ flex: 1, marginLeft: 15 }}>
            <Text style={styles.modTitle}>Data Modifications</Text>
            <Text style={styles.modSub}>Correct Name, DOB or Phone Number</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
        </TouchableOpacity>
      </ScrollView>
    );
  }

  if (view === "main" && searchType) {
    return (
      <View style={styles.container}>
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => setSearchType(null)}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{searchType.name}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.formCard}>
          <Text style={styles.inputLabel}>Identification Number / Face ID</Text>
          <TextInput
            placeholder={`Enter ID or Number`}
            style={styles.input}
            onChangeText={(v) => setFormData({ ...formData, searchValue: v })}
          />

          <Text style={styles.inputLabel}>Transaction PIN</Text>
          <TextInput
            placeholder="****"
            style={styles.input}
            secureTextEntry
            keyboardType="numeric"
            maxLength={4}
            onChangeText={(v) => setFormData({ ...formData, pin: v })}
          />

          <View style={styles.priceTag}>
            <Text style={styles.priceLabel}>Service Fee:</Text>
            <Text style={styles.priceValue}>₦{prices[searchType.id] || 0}</Text>
          </View>

          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleVerification}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Verify & Print</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (view === "result") {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.headerSection}>
          <TouchableOpacity onPress={() => setView("main")}>
            <Ionicons name="close" size={24} color="#1e3a8a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Verification Success</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.resultCard}>
          {userData?.photo && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${userData.photo}` }}
              style={styles.userPhoto}
            />
          )}
          <View style={styles.infoBox}>
            <InfoRow label="Full Name" value={userData?.fullName} />
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
      </ScrollView>
    );
  }

  return null;
};

const ServiceCard = ({ title, icon, price, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <View style={styles.iconCircle}>
      <FontAwesome5 name={icon} size={20} color="#1e3a8a" />
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
  container: { flex: 1, backgroundColor: "#f8fafc", padding: 20 },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 40,
    marginBottom: 25,
  },
  headerTitle: { fontSize: 18, fontWeight: "900", color: "#1e3a8a" },
  bannerCard: {
    backgroundColor: "#1e3a8a",
    padding: 20,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },
  bannerText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  bannerSub: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  sectionLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#334155",
    marginBottom: 15,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    backgroundColor: "#fff",
    width: (width - 55) / 2,
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
  },
  iconCircle: {
    width: 50,
    height: 50,
    backgroundColor: "#eff6ff",
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    textAlign: "center",
  },
  cardPrice: {
    fontSize: 14,
    fontWeight: "900",
    color: "#1e3a8a",
    marginTop: 5,
  },
  modCard: {
    backgroundColor: "#fff",
    flexDirection: "row",
    padding: 15,
    borderRadius: 20,
    alignItems: "center",
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modIconBox: {
    width: 45,
    height: 45,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  modTitle: { fontWeight: "800", color: "#1e3a8a" },
  modSub: { fontSize: 11, color: "#64748b" },
  formCard: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 25,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    backgroundColor: "#f1f5f9",
    padding: 18,
    borderRadius: 15,
    marginBottom: 20,
    fontSize: 16,
    fontWeight: "600",
  },
  priceTag: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 25,
  },
  priceLabel: { fontWeight: "700", color: "#64748b" },
  priceValue: { fontWeight: "900", color: "#16a34a", fontSize: 16 },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    padding: 20,
    borderRadius: 18,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontWeight: "900", fontSize: 16 },
  resultCard: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 25,
    alignItems: "center",
  },
  userPhoto: {
    width: 120,
    height: 120,
    borderRadius: 15,
    marginBottom: 20,
    borderWidth: 3,
    borderColor: "#1e3a8a",
  },
  infoBox: {
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    paddingTop: 20,
  },
  infoLabel: {
    fontSize: 11,
    color: "#94a3b8",
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    fontSize: 16,
    color: "#1e293b",
    fontWeight: "800",
    marginBottom: 15,
  },
  downloadBtn: {
    backgroundColor: "#dc2626",
    flexDirection: "row",
    width: "100%",
    padding: 18,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  downloadText: { color: "#fff", fontWeight: "900", marginLeft: 10 },
});

export default NIMCScreen;
