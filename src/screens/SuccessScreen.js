import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SuccessScreen = ({ navigation }) => {
  const scaleValue = new Animated.Value(0);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    // Gyaran syntax na Animated.spring don cire jan kuskure
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();

    const fetchRegisteredRole = async () => {
      try {
        const storedUserData = await AsyncStorage.getItem("userData");
        if (storedUserData) {
          const user = JSON.parse(storedUserData);
          const detectedRole = (
            user?.role ||
            user?.data?.role ||
            user?.user?.role ||
            ""
          )
            .trim()
            .toLowerCase();
          setUserRole(detectedRole);
        }
      } catch (error) {
        console.log(
          "Error reading user role context on success screen:",
          error,
        );
      }
    };

    fetchRegisteredRole();
  }, []);

  const isAgent = userRole === "agent";

  return (
    <View style={styles.container}>
      <Animated.View
        style={[styles.iconCircle, { transform: [{ scale: scaleValue }] }]}
      >
        <Ionicons name="checkmark-done-circle" size={100} color="#10b981" />
      </Animated.View>

      <Text style={styles.title}>
        {isAgent ? "AGENT DEPLOYMENT COMPLETE" : "DEPLOYMENT COMPLETE"}
      </Text>

      <Text style={styles.subtitle}>
        {isAgent
          ? "Your elite agent profile, merchant terminal access, and corporate virtual banking infrastructure have been successfully integrated into the Ayax architecture."
          : "Your profile and virtual banking infrastructure have been successfully integrated into the Ayax architecture."}
      </Text>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.buttonText}>ACCESS TERMINAL</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  iconCircle: { marginBottom: 30 },
  title: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 1,
    textAlign: "center",
  },
  subtitle: {
    color: "#64748b",
    textAlign: "center",
    fontSize: 14,
    marginTop: 10,
    lineHeight: 22,
    width: "85%",
  },
  button: {
    marginTop: 40,
    backgroundColor: "#1e3a8a",
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1,
  },
});

export default SuccessScreen;
