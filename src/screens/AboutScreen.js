import React from "react";
import {
  ScrollView,
  Text,
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  StatusBar,
} from "react-native";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

const AboutScreen = ({ navigation }) => {
  const openWebsite = () => {
    Linking.openURL("https://www.ayaxapis.com").catch((err) =>
      console.error("Couldn't load page", err)
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />

      {/* Header Section */}
      <View style={styles.headerSection}>
        {navigation && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>About Ayax Xpress</Text>
        <Text style={styles.headerSubtitle}>
          Your Ultimate Plug for Fast, Secure, and Automated Digital Services.
        </Text>
      </View>

      {/* Identity Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <Ionicons name="shield-checkmark" size={22} color="#1e3a8a" />
          </View>
          <Text style={styles.sectionTitle}>Our Identity & Foundation</Text>
        </View>
        <Text style={styles.bodyText}>
          Ayax Xpress is a flagship digital product engineered and operated under
          <Text style={styles.boldText}> Ayax Digital Solutions</Text>, a premier technology firm rooted in Kano State, Nigeria. 
          Founded by <Text style={styles.boldText}>Abdulrahman Mohammed Ayas</Text>, our vision is to bridge the digital divide by transforming complex technological infrastructure into everyday consumer-friendly utilities. We specialize in robust, high-performance automated systems tailored specifically to meet the dynamic needs of the modern Nigerian populace.
        </Text>
      </View>

      {/* Mission & Vision Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <MaterialCommunityIcons name="rocket-launch" size={22} color="#1e3a8a" />
          </View>
          <Text style={styles.sectionTitle}>Our Core Mission & Vision</Text>
        </View>
        <Text style={styles.bodyText}>
          Our overarching mission is to empower individuals, SME vendors, and corporate enterprises by providing the most aggressive data rates, instant airtime top-ups, reliable electricity token vending, cable TV subscriptions, and seamless bill payment solutions. 
          {"\n\n"}
          We firmly operate under the philosophy that digital connectivity and financial inclusion are fundamental rights rather than luxuries. Consequently, we continuously optimize our backend routing to ensure maximum affordability without compromising on absolute reliability and speed.
        </Text>
      </View>

      {/* Ayax APIs Marketplace Section */}
      <View style={styles.highlightCard}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.iconBox, { backgroundColor: "#eff6ff" }]}>
            <FontAwesome5 name="network-wired" size={18} color="#0284c7" />
          </View>
          <Text style={[styles.sectionTitle, { color: "#0369a1" }]}>
            Ayax APIs Marketplace
          </Text>
        </View>
        <Text style={styles.bodyTextDark}>
          As part of our commitment to driving software innovation and developer growth across Africa, we proudly present the <Text style={styles.boldText}>Ayax APIs Marketplace</Text>. 
          This is a robust, developer-first infrastructure designed for tech entrepreneurs, VTU business owners, and software engineers looking to scale. 
          {"\n\n"}
          Our APIs offer seamless, high-uptime integration for automated data delivery, airtime conversion, cable subscriptions, electricity bills, and NIN/NIMC verification services. Build, scale, and automate your own platform with our enterprise-grade endpoints.
        </Text>

        <TouchableOpacity style={styles.linkButton} onPress={openWebsite} activeOpacity={0.8}>
          <Ionicons name="globe-outline" size={18} color="#fff" />
          <Text style={styles.linkButtonText}>Visit www.ayaxapis.com</Text>
        </TouchableOpacity>
      </View>

      {/* Why Choose Us Card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.iconBox}>
            <Ionicons name="star" size={22} color="#1e3a8a" />
          </View>
          <Text style={styles.sectionTitle}>Why Choose Ayax Xpress?</Text>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="flash" size={18} color="#16a34a" style={styles.featureIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Lightning-Fast Automation</Text>
            <Text style={styles.featureDesc}>Our fully automated infrastructure guarantees transaction fulfillment within seconds of request initiation.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="wallet" size={18} color="#16a34a" style={styles.featureIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Unbeatable Cost Efficiency</Text>
            <Text style={styles.featureDesc}>We negotiate optimal institutional pricing to pass massive savings directly to our retail users and API partners.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="shield-half" size={18} color="#16a34a" style={styles.featureIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Military-Grade Security</Text>
            <Text style={styles.featureDesc}>Advanced encryption standards, secure transaction PIN workflows, and protected database interactions safeguard your assets.</Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <Ionicons name="people" size={18} color="#16a34a" style={styles.featureIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.featureTitle}>Dedicated Local Support</Text>
            <Text style={styles.featureDesc}>Built right here in Nigeria, our support team completely understands your local utility demands and responds instantly.</Text>
          </View>
        </View>
      </View>

      {/* Footer Branding */}
      <View style={styles.footerContainer}>
        <Text style={styles.footerBrand}>Ayax Digital Solutions © 2026</Text>
        <Text style={styles.footerSub}>Empowering Digital Frontiers Across Nigeria</Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  contentContainer: { padding: 20, paddingBottom: 50 },
  headerSection: {
    marginBottom: 20,
    paddingTop: 10,
  },
  backBtn: {
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#1e3a8a",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  highlightCard: {
    backgroundColor: "#f0f9ff",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  iconBox: {
    width: 38,
    height: 38,
    backgroundColor: "#eff6ff",
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  bodyText: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 22,
    fontWeight: "500",
  },
  bodyTextDark: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 22,
    fontWeight: "500",
  },
  boldText: {
    fontWeight: "bold",
    color: "#0f172a",
  },
  featureItem: {
    flexDirection: "row",
    marginTop: 14,
    alignItems: "flex-start",
  },
  featureIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  featureTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e293b",
  },
  featureDesc: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    lineHeight: 18,
  },
  linkButton: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 15,
  },
  linkButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  footerContainer: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  footerBrand: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#1e3a8a",
  },
  footerSub: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 2,
  },
});

export default AboutScreen;