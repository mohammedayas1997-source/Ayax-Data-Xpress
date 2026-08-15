import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Amfani da useFocusEffect domin Refreshing automatic daga sabar idan an dawo daga Edit Profile
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  const fetchUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Dauko sabbin bayanai daga sabar
      const response = await axios.get(`${BASE_URL}/auth/profile`, config);
      const user = response.data.user || response.data.data || response.data;

      if (user) {
        setUserData(user);
        // Sabunta a cikin AsyncStorage
        await AsyncStorage.setItem("userData", JSON.stringify(user));
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Error fetching profile from server:", e);
        // Idan akwai matsala tanetwork, gwada dauka daga AsyncStorage
        try {
          const cachedValue = await AsyncStorage.getItem("userData");
          if (cachedValue != null) {
            setUserData(JSON.parse(cachedValue));
          }
        } catch (cacheErr) {
          console.error("Error reading cache:", cacheErr);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {userData?.profileImage ? (
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImg}
            />
          ) : (
            <Text style={styles.avatarText}>
              {userData?.firstName ? userData.firstName[0] : "A"}
            </Text>
          )}
        </View>
        <Text style={styles.name}>
          {userData?.firstName || ""} {userData?.surname || userData?.lastName || ""}
        </Text>
        <Text style={styles.email}>{userData?.email}</Text>
      </View>

      <View style={styles.infoSection}>
        <Text style={styles.sectionLabel}>Institutional Profile Data</Text>

        <View style={styles.infoBox}>
          {/* Phone Number Field */}
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={20} color="#1e3a8a" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Primary Contact</Text>
              <Text style={styles.infoValue}>
                {userData?.phone || userData?.phoneNumber || "Not Configured"}
              </Text>
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#1e3a8a" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Date of Birth</Text>
              <Text style={styles.infoValue}>
                {userData?.dob ? new Date(userData.dob).toLocaleDateString() : "Not Provided"}
              </Text>
            </View>
          </View>

          {/* Address Field */}
          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <Ionicons name="location-outline" size={20} color="#1e3a8a" />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Registered Address</Text>
              <Text style={styles.infoValue}>
                {userData?.address || "Location data not synchronized"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate("EditProfile")}
        activeOpacity={0.8}
      >
        <View style={styles.btnContent}>
          <Ionicons
            name="create-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.editBtnText}>Modify Profile Credentials</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>Ayax Xpress Terminal v2.0</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 45,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    elevation: 4,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#f1f5f9",
  },
  profileImg: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 45, fontWeight: "bold" },
  name: { fontSize: 24, fontWeight: "800", marginTop: 15, color: "#0f172a" },
  email: { color: "#64748b", fontSize: 14, fontWeight: "500" },
  infoSection: { padding: 25, marginTop: 5 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#94a3b8",
    marginBottom: 15,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  infoText: { marginLeft: 18, flex: 1 },
  infoTitle: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "700",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 2,
  },
  editBtn: {
    marginHorizontal: 25,
    marginBottom: 10,
    backgroundColor: "#1e3a8a",
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#1e3a8a",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
  },
  btnContent: { flexDirection: "row", alignItems: "center" },
  editBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.5,
  },
  footerNote: { alignItems: "center", marginVertical: 20 },
  footerText: { color: "#cbd5e1", fontSize: 11, fontWeight: "600" },
});

export default ProfileScreen;