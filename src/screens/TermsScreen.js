import React from "react";
import { ScrollView, Text, StyleSheet } from "react-native";

const TermsScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.headerTitle}>Terms of Service</Text>

      <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
      <Text style={styles.bodyText}>
        By accessing Ayax Xpress, you agree to be bound by these Terms of
        Service. If you do not agree, you must cease use of the application
        immediately.
      </Text>

      <Text style={styles.sectionTitle}>2. Account Responsibility</Text>
      <Text style={styles.bodyText}>
        Users are responsible for maintaining the confidentiality of their login
        credentials. Any transaction performed through your account is
        considered authorized by you.
      </Text>

      <Text style={styles.sectionTitle}>3. Transaction Policy</Text>
      <Text style={styles.bodyText}>
        All utility payments and data purchases are final. Please verify the
        recipient's phone number or account details before confirming payment,
        as digital goods cannot be refunded once successfully delivered by the
        network provider.
      </Text>

      <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
      <Text style={styles.bodyText}>
        Ayax Xpress shall not be liable for any indirect or consequential
        damages arising from the use of this service or network delays outside
        of our control.
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
    marginBottom: 20,
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

export default TermsScreen;
