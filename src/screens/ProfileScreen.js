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
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const ProfileScreen = ({ navigation }) => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Amfani da useFocusEffect domin Refreshing automatic daga sabar
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
      
      const response = await axios.get(`${BASE_URL}/auth/profile`, config);
      const user = response.data.user || response.data.data || response.data;

      if (user) {
        setUserData(user);
        await AsyncStorage.setItem("userData", JSON.stringify(user));
      }
    } catch (e) {
      if (e.response && e.response.status === 401) {
        await AsyncStorage.clear();
        navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
      } else {
        console.error("Error fetching profile from server:", e);
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

  const handleLogout = async () => {
    Alert.alert(
      "Logout Confirmation",
      "Are you sure you want to log out from Ayax Xpress?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            navigation?.reset({ index: 0, routes: [{ name: "Login" }] });
          },
        },
      ]
    );
  };

  // Duba ko mai amfani yana da PIN ko babu ta hanyar properties daban-daban
  const hasPinConfigured = Boolean(
  userData?.pin && userData.pin !== "0000" && !userData.pin.startsWith("0000")
);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#1e3a8a" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" backgroundColor="#1e3a8a" />

      {/* Header Section */}
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          {userData?.profileImage ? (
            <Image
              source={{ uri: userData.profileImage }}
              style={styles.profileImg}
            />
          ) : (
            <Text style={styles.avatarText}>
              {userData?.firstName ? userData.firstName[0].toUpperCase() : "A"}
            </Text>
          )}
        </View>
        <Text style={styles.name}>
          {userData?.firstName || ""} {userData?.surname || userData?.lastName || ""}
        </Text>
        <Text style={styles.email}>{userData?.email}</Text>

        <View style={styles.badgeContainer}>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color="#0369a1" />
            <Text style={styles.badgeText}>
              {userData?.role || userData?.accountType || "Verified Member"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.infoSection}>
        {/* Institutional Profile Data */}
        <Text style={styles.sectionLabel}>Institutional Profile Data</Text>

        <View style={styles.infoBox}>
          {/* Phone Number Field */}
          <View style={styles.infoItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="call-outline" size={18} color="#1e3a8a" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Primary Contact</Text>
              <Text style={styles.infoValue}>
                {userData?.phone || userData?.phoneNumber || "Not Configured"}
              </Text>
            </View>
          </View>

          {/* Date of Birth Field */}
          <View style={styles.infoItem}>
            <View style={styles.iconCircle}>
              <Ionicons name="calendar-outline" size={18} color="#1e3a8a" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Date of Birth</Text>
              <Text style={styles.infoValue}>
                {userData?.dob ? new Date(userData.dob).toLocaleDateString() : "Not Provided"}
              </Text>
            </View>
          </View>

          {/* Address Field */}
          <View style={[styles.infoItem, { borderBottomWidth: 0 }]}>
            <View style={styles.iconCircle}>
              <Ionicons name="location-outline" size={18} color="#1e3a8a" />
            </View>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Registered Address</Text>
              <Text style={styles.infoValue}>
                {userData?.address || "Location data not synchronized"}
              </Text>
            </View>
          </View>
        </View>

        {/* Security & Quick Actions */}
        <Text style={[styles.sectionLabel, { marginTop: 25 }]}>Security & Settings</Text>

        <View style={styles.infoBox}>
          {/* Change or Setup Transaction PIN Action */}
          <TouchableOpacity
            style={styles.actionRow}
            onPress={() => navigation.navigate("UpdatePin", { isUpdating: hasPinConfigured })}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
              <MaterialCommunityIcons name="lock-reset" size={18} color="#16a34a" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.actionTextTitle}>Transaction PIN</Text>
              <Text style={styles.actionTextSub}>
                {hasPinConfigured ? "Change / Reset PIN" : "Setup Transaction PIN"}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>

          {/* Log Out Action */}
          <TouchableOpacity
            style={[styles.actionRow, { borderBottomWidth: 0 }]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: "#fef2f2" }]}>
              <Ionicons name="log-out-outline" size={18} color="#dc2626" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.actionTextTitle, { color: "#dc2626" }]}>Session Termination</Text>
              <Text style={[styles.actionTextSub, { color: "#fca5a5" }]}>Log Out of Terminal</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Modify Profile Credentials Button */}
      <TouchableOpacity
        style={styles.editBtn}
        onPress={() => navigation.navigate("EditProfile")}
        activeOpacity={0.9}
      >
        <View style={styles.btnContent}>
          <Ionicons
            name="create-outline"
            size={20}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={styles.editBtnText}>MODIFY PROFILE CREDENTIALS</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.footerNote}>
        <Text style={styles.footerText}>Ayax Xpress Terminal v2.0</Text>
        <Text style={styles.footerSub}>Powered by Ayax Digital Solutions</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 35,
    backgroundColor: "#1e3a8a",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
  },
  avatar: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    backgroundColor: "#3b82f6",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#ffffff",
  },
  profileImg: { width: "100%", height: "100%" },
  avatarText: { color: "#fff", fontSize: 38, fontWeight: "bold" },
  name: { fontSize: 22, fontWeight: "800", marginTop: 12, color: "#ffffff" },
  email: { color: "#93c5fd", fontSize: 13, fontWeight: "500", marginTop: 2 },
  badgeContainer: { marginTop: 12 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  badgeText: { color: "#0369a1", fontSize: 11, fontWeight: "bold", marginLeft: 5 },
  infoSection: { padding: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  infoBox: {
    backgroundColor: "#fff",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 1,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  infoText: { marginLeft: 14, flex: 1 },
  infoTitle: {
    fontSize: 11,
    color: "#94a3b8",
    textTransform: "uppercase",
    fontWeight: "bold",
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    marginTop: 2,
  },
  actionTextTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1e293b",
  },
  actionTextSub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  editBtn: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: "#1e3a8a",
    height: 55,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
  },
  btnContent: { flexDirection: "row", alignItems: "center" },
  editBtnText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  footerNote: { alignItems: "center", marginVertical: 20 },
  footerText: { color: "#64748b", fontSize: 12, fontWeight: "bold" },
  footerSub: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
});

export default ProfileScreen;