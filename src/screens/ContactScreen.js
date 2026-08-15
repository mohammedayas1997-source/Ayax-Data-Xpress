import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  StatusBar,
  Alert,
} from "react-native";

const ContactScreen = () => {
  const phoneNumber = "+2349061244444";
  const emailAddress = "support@ayaxdata.online";
  const whatsappNumber = "2349061244444";

  const makeCall = () => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const openWhatsApp = async () => {
    const message = "Hello Ayax Xpress Support, I need help with...";
    const url = `whatsapp://send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;
    const webUrl = `https://api.whatsapp.com/send?phone=${whatsappNumber}&text=${encodeURIComponent(message)}`;

    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // Fallback to Browser if WhatsApp App is not installed
        await Linking.openURL(webUrl);
      }
    } catch (error) {
      Alert.alert("Error", "Unable to open WhatsApp. Please try again.");
    }
  };

  const sendEmail = () => {
    Linking.openURL(
      `mailto:${emailAddress}?subject=Support Request - Ayax Xpress`,
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <Text style={styles.headerSub}>How can we help you today?</Text>
      </View>

      <View style={styles.content}>
        {/* Phone Call Option */}
        <TouchableOpacity style={styles.contactCard} onPress={makeCall}>
          <View style={[styles.iconCircle, { backgroundColor: "#eff6ff" }]}>
            <Text style={styles.icon}>📞</Text>
          </View>
          <View style={styles.infoText}>
            <Text style={styles.label}>Call Us</Text>
            <Text style={styles.value}>{phoneNumber}</Text>
          </View>
        </TouchableOpacity>

        {/* WhatsApp Option */}
        <TouchableOpacity style={styles.contactCard} onPress={openWhatsApp}>
          <View style={[styles.iconCircle, { backgroundColor: "#f0fdf4" }]}>
            <Text style={styles.icon}>💬</Text>
          </View>
          <View style={styles.infoText}>
            <Text style={styles.label}>WhatsApp Chat</Text>
            <Text style={styles.value}>Chat with Support</Text>
          </View>
        </TouchableOpacity>

        {/* Email Option */}
        <TouchableOpacity style={styles.contactCard} onPress={sendEmail}>
          <View style={[styles.iconCircle, { backgroundColor: "#fff7ed" }]}>
            <Text style={styles.icon}>✉️</Text>
          </View>
          <View style={styles.infoText}>
            <Text style={styles.label}>Email Address</Text>
            <Text style={styles.value}>{emailAddress}</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Response time is usually within 24 hours.
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  header: { padding: 30, backgroundColor: "#f8fafc", alignItems: "center" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#1e3a8a" },
  headerSub: { fontSize: 14, color: "#64748b", marginTop: 5 },
  content: { padding: 20 },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 2,
  },
  iconCircle: {
    width: 55,
    height: 55,
    borderRadius: 27.5,
    justifyContent: "center",
    alignItems: "center",
  },
  icon: { fontSize: 24 },
  infoText: { marginLeft: 20 },
  label: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  value: { fontSize: 16, color: "#0f172a", fontWeight: "bold", marginTop: 2 },
  footer: { marginTop: 40, marginBottom: 40, alignItems: "center" },
  footerText: { color: "#94a3b8", fontSize: 13 },
});

export default ContactScreen;
