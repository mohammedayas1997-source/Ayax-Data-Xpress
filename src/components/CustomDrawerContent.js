import React, { useState, useEffect } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";

import { DrawerContentScrollView, DrawerItem } from "@react-navigation/drawer";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";

const CustomDrawerContent = (props) => {
  const { navigation, state } = props;
  const [userRole, setUserRole] = useState(null);
  const activeRoute = state?.routeNames[state?.index];

  // ================= LOGOUT =================
  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();

      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Login" }],
        }),
      );
    } catch (error) {
      console.log("Logout Error:", error);
      navigation.navigate("Login");
    }
  };

  useEffect(() => {
    const fetchUserRole = async () => {
      const userData = await AsyncStorage.getItem("userData");
      if (userData) {
        const parsedData = JSON.parse(userData);
        // Duba yadda data ɗinka yake, wani lokacin yana cikin parsedData.role ne
        const role = parsedData?.role || parsedData?.data?.role || "";
        setUserRole(role.trim().toLowerCase());
      }
    };
    fetchUserRole();
  }, []);

  // ================= NAV HELPER =================
  const navigateTo = (screen) => {
    navigation.closeDrawer();
    navigation.navigate(screen);
  };

  // ================= UI =================
  return (
    <View style={{ flex: 1 }}>
      <DrawerContentScrollView {...props} contentContainerStyle={styles.scroll}>
        {/* ================= HEADER ================= */}
        <View style={styles.header}>
          <Image source={require("../assets/Logo.png")} style={styles.logo} />
          <Text style={styles.version}>v2.0.1</Text>
        </View>

        {/* ================= MENU ================= */}
        <View style={styles.menu}>
          {/* DASHBOARD */}
          {userRole === "agent" ? (
            <DrawerItem
              label="Agent Dashboard"
              icon={() => (
                <MaterialCommunityIcons
                  name="account-tie"
                  size={22}
                  color={
                    activeRoute === "AgentDashboard" ? "#1e40af" : "#64748b"
                  }
                />
              )}
              labelStyle={[
                styles.label,
                activeRoute === "AgentDashboard" && styles.activeLabel,
              ]}
              onPress={() => navigateTo("AgentDashboard")}
            />
          ) : (
            <DrawerItem
              label="Dashboard"
              icon={() => (
                <Ionicons
                  name="grid-outline"
                  size={22}
                  color={activeRoute === "Dashboard" ? "#1e40af" : "#64748b"}
                />
              )}
              labelStyle={[
                styles.label,
                activeRoute === "Dashboard" && styles.activeLabel,
              ]}
              onPress={() => navigateTo("Dashboard")}
            />
          )}
          {/* WALLET */}
          <DrawerItem
            label="Wallet History"
            icon={() => (
              <MaterialCommunityIcons
                name="history"
                size={22}
                color={activeRoute === "Wallet History" ? "#1e40af" : "#64748b"}
              />
            )}
            labelStyle={styles.label}
            onPress={() =>
              navigation.navigate("Main", { screen: "Wallet History" })
            }
          />

          {/* BVN */}
          <DrawerItem
            label="BVN Logs"
            icon={() => (
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={22}
                color="#64748b"
              />
            )}
            labelStyle={styles.label}
            onPress={() => navigateTo("BVN History")}
          />

          {/* NIMC */}
          <DrawerItem
            label="NIMC Logs"
            icon={() => (
              <Ionicons name="id-card-outline" size={22} color="#64748b" />
            )}
            labelStyle={styles.label}
            onPress={() => navigateTo("NIMC History")}
          />

          <View style={styles.divider} />

          {/* SETTINGS */}
          <DrawerItem
            label="Settings"
            icon={() => (
              <Ionicons name="settings-outline" size={22} color="#64748b" />
            )}
            labelStyle={styles.label}
            onPress={() => navigateTo("Settings")}
          />
        </View>
      </DrawerContentScrollView>

      {/* ================= FOOTER ================= */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#ef4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ================= STYLES =================
const styles = StyleSheet.create({
  scroll: {
    paddingTop: 0,
  },

  header: {
    padding: 25,
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderColor: "#e2e8f0",
  },

  logo: {
    width: 120,
    height: 45,
    resizeMode: "contain",
  },

  version: {
    fontSize: 11,
    marginTop: 5,
    color: "#94a3b8",
    fontWeight: "600",
  },

  menu: {
    flex: 1,
    paddingTop: 10,
  },

  label: {
    fontWeight: "600",
    color: "#64748b",
    marginLeft: -10,
  },

  activeLabel: {
    color: "#1e40af",
    fontWeight: "bold",
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 20,
    marginVertical: 10,
  },

  footer: {
    borderTopWidth: 1,
    borderColor: "#e2e8f0",
    padding: 15,
    backgroundColor: "#fff",
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
  },

  logoutText: {
    marginLeft: 12,
    color: "#ef4444",
    fontWeight: "bold",
    fontSize: 15,
  },
});
export default CustomDrawerContent;
