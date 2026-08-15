import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

const PrivacyPolicyScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.headerTitle}>Privacy Policy</Text>
      <Text style={styles.date}>Effective Date: May 2026</Text>

      <Text style={styles.sectionTitle}>1. Data Collection</Text>
      <Text style={styles.bodyText}>
        We collect information necessary to provide our services, including your
        name, email address, and phone number. This data allows us to process
        utility payments and secure your account using biometric authentication.
      </Text>

      <Text style={styles.sectionTitle}>2. Security Measures</Text>
      <Text style={styles.bodyText}>
        Security is our priority. We implement industry-standard encryption to
        protect your sensitive information. Biometric data used for login (Touch
        ID/Face ID) is handled by your device's secure enclave and is never
        stored on our external servers.
      </Text>

      <Text style={styles.sectionTitle}>3. Third-Party Sharing</Text>
      <Text style={styles.bodyText}>
        Ayax Xpress does not sell your personal data. We only share information
        with service providers (like telecommunication networks) to fulfill your
        requested transactions.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#ffffff" },
  contentContainer: { padding: 25, paddingBottom: 50 },
  headerTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0a1d37",
    marginBottom: 5,
  },
  date: {
    fontSize: 13,
    color: "#94a3b8",
    marginBottom: 20,
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e3a8a",
    marginTop: 20,
    marginBottom: 10,
  },
  bodyText: { fontSize: 15, color: "#475569", lineHeight: 24 },
});

export default PrivacyPolicyScreen;
