import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  StatusBar,
  Dimensions,
  ToastAndroid,
  ImageBackground,
  Linking,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import {
  MaterialCommunityIcons,
  Ionicons,
  FontAwesome5,
} from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { ThemeContext } from "../context/ThemeContext";

const { width } = Dimensions.get("window");
const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const HomeScreen = ({ navigation }) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [userData, setUserData] = useState(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [virtualAccount, setVirtualAccount] = useState(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  
  // PIN Verification States
  const [pinModalVisible, setPinModalVisible] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.get(`${BASE_URL}/user/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data?.success) {
        setUserData(response.data.user || response.data.data);
        if (response.data.user?.virtualAccount?.accountNumber) {
          setVirtualAccount(response.data.user.virtualAccount);
        }
      }
    } catch (err) {
      if (err.response?.status === 401) {
        await AsyncStorage.clear();
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      }
    }
  };

  // Logic na tabbatar da PIN kafin zuwa wani guri
  const verifyPinAndNavigate = (route) => {
    // Idan PIN din default ne ("0000"), wuce kai tsaye ko ka tura su saiti
    if (userData?.pin === "0000") {
      Alert.alert("Action Required", "Please set your Transaction PIN first.");
      navigation.navigate("Profile");
      return;
    }
    setSelectedRoute(route);
    setPinModalVisible(true);
  };

  const handlePinSubmit = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.post(`${BASE_URL}/user/verify-pin`, 
        { pin: enteredPin },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setPinModalVisible(false);
        setEnteredPin("");
        navigation.navigate(selectedRoute);
      }
    } catch (error) {
      Alert.alert("Error", "Invalid Transaction PIN");
      setEnteredPin("");
    }
  };

  const handleGetVirtualAccount = async () => {
    setLoadingAccount(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      const response = await axios.post(`${BASE_URL}/virtual-account/create`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setVirtualAccount(response.data.data);
        Alert.alert("Success", "Virtual account generated successfully!");
      }
    } catch (error) {
      Alert.alert("Error", "Could not create virtual account.");
    } finally {
      setLoadingAccount(false);
    }
  };

  const copyToClipboard = (text) => {
    Clipboard.setStringAsync(text);
    ToastAndroid.show("Copied!", ToastAndroid.SHORT);
  };

  return (
    <View style={[styles.mainContainer, { backgroundColor: isDarkMode ? "#020617" : "#f8fafc" }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} translucent backgroundColor="transparent" />
      
      {/* PIN Verification Modal */}
      <Modal visible={pinModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Transaction PIN</Text>
            <TextInput
              style={styles.pinInput}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              value={enteredPin}
              onChangeText={setEnteredPin}
            />
            <TouchableOpacity style={styles.verifyBtn} onPress={handlePinSubmit}>
              <Text style={{color: '#fff', fontWeight: 'bold'}}>Verify & Proceed</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setPinModalVisible(false)}>
              <Text style={{marginTop: 10, color: 'red'}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ImageBackground source={require("../assets/ayax_promo_hijab.png")} style={styles.backgroundImage}>
        <LinearGradient colors={isDarkMode ? ["rgba(2,6,23,0.7)", "rgba(2,6,23,0.95)"] : ["rgba(255,255,255,0.6)", "rgba(248,250,252,0.95)"]} style={styles.fullOverlay} />
        
        <View style={styles.topHeader}>
          <View style={styles.navRow}>
            <View style={styles.logoCircle}><Image source={require("../assets/Logo.png")} style={styles.logoImg} /></View>
            <TouchableOpacity onPress={() => navigation.navigate("Notifications")}>
              <Ionicons name="notifications-outline" size={28} color={isDarkMode ? "#fff" : "#0f172a"} />
            </TouchableOpacity>
          </View>
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={[styles.userName, { color: isDarkMode ? "#fff" : "#0f172a" }]}>
              {userData?.firstName || "User"}
            </Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <LinearGradient colors={["#1e40af", "#1e3a8a"]} style={styles.walletCard}>
            <Text style={styles.walletLabel}>Available Balance</Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.currency}>₦</Text>
              <Text style={styles.balanceText}>{isBalanceVisible ? userData?.walletBalance || "0.00" : "****"}</Text>
            </View>
            <View style={styles.walletActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate("FundWallet")}>
                <Text style={styles.actionBtnText}>FUND WALLET</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Services Grid da PIN verification */}
          <View style={[styles.servicesContainer, { backgroundColor: isDarkMode ? "#0f172a" : "#fff" }]}>
            <View style={styles.grid}>
              <ServiceItem icon="wifi" color="#0ea5e9" label="Data" isDarkMode={isDarkMode} onPress={() => verifyPinAndNavigate("BuyData")} />
              <ServiceItem icon="phone-alt" color="#22c55e" label="Airtime" isDarkMode={isDarkMode} onPress={() => verifyPinAndNavigate("BuyAirtime")} />
              {/* Sauran items... */}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
};

// Styles... (ka ajiye tsohon salon ka)
const styles = StyleSheet.create({
  // ... (Tsohon Styles din ka)
  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 20, alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  pinInput: { width: '100%', height: 50, borderWidth: 1, borderColor: '#ccc', borderRadius: 10, textAlign: 'center', fontSize: 20 },
  verifyBtn: { backgroundColor: '#1e40af', padding: 15, borderRadius: 10, marginTop: 15, width: '100%', alignItems: 'center' },
});

export default HomeScreen;