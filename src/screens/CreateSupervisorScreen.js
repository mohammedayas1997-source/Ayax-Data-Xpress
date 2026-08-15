import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";

const BASE_URL = "https://ayax-data-xpress-server.onrender.com/api/v1";

const CreateSupervisorScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    address: "",
  });
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    // Validation
    if (
      !formData.name ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.address
    ) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("userToken");
      if (!token) {
        setLoading(false);
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      };

      const response = await axios.post(
        `${BASE_URL}/leader/create-supervisor`,
        formData,
        config
      );

      if (response.data.success || response.status === 200 || response.status === 201) {
        Alert.alert("Success", "New Supervisor added successfully!");
        navigation.goBack(); // Zai koma baya zuwa Dashboard
      }
    } catch (error) {
      console.error("Create Supervisor Error:", error);
      const errorMsg = error.response?.data?.message || "Something went wrong";
      Alert.alert("Failed", errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <FontAwesome5 name="user-plus" size={40} color="#d4af37" />
        <Text style={styles.title}>Register Supervisor</Text>
        <Text style={styles.subtitle}>Enter professional details below</Text>
      </View>

      <View style={styles.form}>
        {/* Full Name */}
        <View style={styles.inputGroup}>
          <MaterialIcons name="person" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="Full Name"
            placeholderTextColor="#94a3b8"
            value={formData.name}
            onChangeText={(txt) => setFormData({ ...formData, name: txt })}
          />
        </View>

        {/* Email */}
        <View style={styles.inputGroup}>
          <MaterialIcons name="email" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="Email Address"
            placeholderTextColor="#94a3b8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={formData.email}
            onChangeText={(txt) => setFormData({ ...formData, email: txt })}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <MaterialIcons name="phone" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="Phone Number"
            placeholderTextColor="#94a3b8"
            keyboardType="phone-pad"
            value={formData.phone}
            onChangeText={(txt) => setFormData({ ...formData, phone: txt })}
          />
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <MaterialIcons name="location-on" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="Office/Home Address"
            placeholderTextColor="#94a3b8"
            multiline
            value={formData.address}
            onChangeText={(txt) => setFormData({ ...formData, address: txt })}
          />
        </View>

        {/* Password */}
        <View style={styles.inputGroup}>
          <MaterialIcons name="lock" size={20} color="#1e3a8a" />
          <TextInput
            style={styles.input}
            placeholder="Secure Password"
            placeholderTextColor="#94a3b8"
            secureTextEntry
            value={formData.password}
            onChangeText={(txt) => setFormData({ ...formData, password: txt })}
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, loading && { backgroundColor: "#94a3b8" }]}
          onPress={handleCreate}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="check-circle" size={20} color="white" />
              <Text style={styles.submitBtnText}>CREATE ACCOUNT</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#0f172a",
    padding: 30,
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  title: { color: "white", fontSize: 22, fontWeight: "bold", marginTop: 10 },
  subtitle: { color: "#38bdf8", fontSize: 14 },
  form: { padding: 20, marginTop: 10 },
  inputGroup: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    paddingHorizontal: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    height: 55,
  },
  input: { flex: 1, marginLeft: 10, fontSize: 15, color: "#1e293b" },
  submitBtn: {
    backgroundColor: "#1e3a8a",
    height: 55,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    elevation: 4,
  },
  submitBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    marginLeft: 10,
  },
});

export default CreateSupervisorScreen;