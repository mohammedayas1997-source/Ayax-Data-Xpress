import React from "react";
import { ScrollView, Text, StyleSheet, View, Image } from "react-native";

const AboutScreen = () => {
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.headerTitle}>About Ayax Xpress</Text>

      <Text style={styles.sectionTitle}>Our Identity</Text>
      <Text style={styles.bodyText}>
        Ayax Xpress is a flagship digital product of Ayax Digital Solutions,
        founded by Abdulrahman Mohammed Ayas. We are a premier technology firm
        based in Kano State, Nigeria, dedicated to bridging the gap between
        complex digital infrastructure and everyday utility needs.
      </Text>

      <Text style={styles.sectionTitle}>Our Mission</Text>
      <Text style={styles.bodyText}>
        Our mission is to empower individuals and businesses by providing the
        most aggressive data rates, seamless airtime top-ups, and lightning-fast
        bill payment solutions. We believe that connectivity is a right, not a
        luxury, and we strive to make it affordable for everyone.
      </Text>

      <Text style={styles.sectionTitle}>Why Choose Us?</Text>
      <Text style={styles.bodyText}>
        • Unmatched Speed: Our automated systems ensure your transactions are
        processed in seconds.
        {"\n"}• Cost Efficiency: We negotiate the best rates to save you money
        on every Naira spent.
        {"\n"}• Local Expertise: Built in Nigeria, for Nigeria, understanding
        our unique digital landscape.
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
  bodyText: {
    fontSize: 15,
    color: "#475569",
    lineHeight: 24,
    fontWeight: "500",
  },
});

export default AboutScreen;
