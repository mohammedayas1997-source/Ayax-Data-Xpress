import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons, FontAwesome, MaterialCommunityIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const isDesktop = width > 768;

export default function LandingScreen({ navigation }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const openWhatsApp = () => {
    Linking.openURL("https://wa.me/2349061244444?text=Hello%20Ayax%20Xpress%20Support");
  };

  const makeCall = () => {
    Linking.openURL("tel:+2349061244444");
  };

  const openEmail = () => {
    Linking.openURL("mailto:support@ayaxdata.online");
  };

  const openDeveloperApis = () => {
    Linking.openURL("https://www.ayaxapis.com");
  };

  const goToLogin = () => {
    setMobileMenuOpen(false);
    navigation.navigate("Login");
  };

  return (
    <View style={styles.container}>
      {/* NAVBAR */}
      <View style={styles.navbar}>
        <View style={styles.navContainer}>
          <View style={styles.navBrand}>
            <View style={styles.logoBox}>
              <Image
                source={require("../../assets/Logo.png")}
                style={styles.logoImg}
                resizeMode="contain"
              />
            </View>
            <View>
              <Text style={styles.navBrandTitle}>Ayax Xpress</Text>
              <Text style={styles.navBrandSub}>Global Ventures Ltd</Text>
            </View>
          </View>

          <View style={styles.navRight}>
            <TouchableOpacity
              style={styles.btnApiNav}
              onPress={openDeveloperApis}
            >
              <MaterialCommunityIcons name="code-tags" size={16} color="#38bdf8" />
              <Text style={styles.btnApiNavText}>Developer API</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnLoginNav} onPress={goToLogin}>
              <Text style={styles.btnLoginNavText}>Login to Portal</Text>
            </TouchableOpacity>

            {!isDesktop && (
              <TouchableOpacity
                style={styles.mobileMenuToggle}
                onPress={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <Ionicons
                  name={mobileMenuOpen ? "close" : "menu"}
                  size={24}
                  color="#ffffff"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && !isDesktop && (
          <View style={styles.mobileDrawer}>
            <TouchableOpacity style={styles.drawerItem} onPress={goToLogin}>
              <Ionicons name="log-in-outline" size={20} color="#38bdf8" />
              <Text style={styles.drawerItemText}>Login to Portal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={openDeveloperApis}>
              <MaterialCommunityIcons name="code-tags" size={20} color="#38bdf8" />
              <Text style={styles.drawerItemText}>Developer APIs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.drawerItem} onPress={openWhatsApp}>
              <FontAwesome name="whatsapp" size={20} color="#25D366" />
              <Text style={styles.drawerItemText}>WhatsApp Support</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <View style={styles.heroTag}>
            <Ionicons name="flash" size={14} color="#38bdf8" />
            <Text style={styles.heroTagText}>Telecom • Identity Verification • Utility API</Text>
          </View>

          <Text style={styles.heroTitle}>
            Unified Digital <Text style={styles.heroHighlight}>Infrastructure</Text> for Nigeria.
          </Text>

          <Text style={styles.heroSubtitle}>
            AYAX GLOBAL VENTURES LTD delivers robust MTN SME & Corporate Gifting, Airtel enterprise pipelines, instant BVN, NIN, & CAC validations, and high-frequency utility bill payments.
          </Text>

          <View style={styles.heroBtnRow}>
            <TouchableOpacity style={styles.btnHeroPrimary} onPress={goToLogin}>
              <Text style={styles.btnHeroPrimaryText}>Launch Web Portal</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" style={{ marginLeft: 6 }} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.btnHeroSecondary} onPress={openDeveloperApis}>
              <Text style={styles.btnHeroSecondaryText}>API Documentation</Text>
            </TouchableOpacity>
          </View>

          {/* CORPORATE GLASS CARD */}
          <View style={styles.corpCard}>
            <View style={styles.corpCardHeader}>
              <View>
                <Text style={styles.corpLabel}>Certified Corporate Entity</Text>
                <Text style={styles.corpName}>AYAX GLOBAL VENTURES LTD</Text>
              </View>
              <View style={styles.rcBadge}>
                <Ionicons name="shield-checkmark" size={14} color="#38bdf8" />
                <Text style={styles.rcBadgeText}>RC: 9345377</Text>
              </View>
            </View>

            <View style={styles.metricsGrid}>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>99.99%</Text>
                <Text style={styles.metricLabel}>Gateway Uptime</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>Instant</Text>
                <Text style={styles.metricLabel}>Data Dispatch</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>Real-Time</Text>
                <Text style={styles.metricLabel}>BVN / NIN Check</Text>
              </View>
              <View style={styles.metricItem}>
                <Text style={styles.metricValue}>24/7</Text>
                <Text style={styles.metricLabel}>Automated Engine</Text>
              </View>
            </View>
          </View>
        </View>

        {/* SERVICES SECTION */}
        <View style={styles.servicesSection}>
          <Text style={styles.sectionPre}>ENTERPRISE SUITE</Text>
          <Text style={styles.sectionTitle}>Everything in One Unified Ecosystem</Text>

          <View style={styles.cardsGrid}>
            <View style={styles.serviceBox}>
              <Ionicons name="cellular-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>MTN SME & CG Data</Text>
              <Text style={styles.serviceBoxDesc}>High-speed automated bulk data delivery with instant network receipt.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="radio-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Airtel Business Data</Text>
              <Text style={styles.serviceBoxDesc}>Direct enterprise Airtel corporate gifting pipelines with balance sync.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="person-circle-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>BVN & NIN Verification</Text>
              <Text style={styles.serviceBoxDesc}>Certified identity queries, NIBSS validation, and biometric verification slips.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="business-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>CAC Entity Search</Text>
              <Text style={styles.serviceBoxDesc}>Real-time corporate verification for Nigerian registered companies and status.</Text>
            </View>

            <View style={styles.serviceBox}>
              <Ionicons name="flash-outline" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Electricity & DisCo Bills</Text>
              <Text style={styles.serviceBoxDesc}>Prepaid meter token generation and postpaid bill settlement across all DisCos.</Text>
            </View>

            <View style={styles.serviceBox}>
              <MaterialCommunityIcons name="code-tags" size={28} color="#0284c7" />
              <Text style={styles.serviceBoxTitle}>Developer API Marketplace</Text>
              <Text style={styles.serviceBoxDesc}>Integrate data and verification directly into your apps via ayaxapis.com.</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footerSection}>
          <Text style={styles.footerTitle}>AYAX GLOBAL VENTURES LTD</Text>
          <Text style={styles.footerText}>RC Number: 9345377</Text>
          <Text style={styles.footerText}>Suite C13 & C14, Yammusa Plaza, Kano State</Text>

          <View style={styles.contactRow}>
            <TouchableOpacity style={styles.contactCircle} onPress={openWhatsApp}>
              <FontAwesome name="whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.contactCircle, { marginHorizontal: 15 }]} onPress={makeCall}>
              <Ionicons name="call" size={18} color="#38bdf8" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.contactCircle} onPress={openEmail}>
              <Ionicons name="mail" size={18} color="#EA4335" />
            </TouchableOpacity>
          </View>
          <Text style={styles.footerPhone}>+234 906 124 4444</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  navbar: {
    backgroundColor: "rgba(10, 25, 47, 0.96)",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(56, 189, 248, 0.2)",
    zIndex: 10,
  },
  navContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  navBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
  },
  logoImg: { width: 28, height: 28 },
  navBrandTitle: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
  navBrandSub: { color: "#38bdf8", fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  navRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  btnApiNav: {
    display: isDesktop ? "flex" : "none",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    backgroundColor: "rgba(2, 132, 199, 0.15)",
  },
  btnApiNavText: { color: "#38bdf8", fontSize: 12, fontWeight: "bold" },
  btnLoginNav: {
    backgroundColor: "#0284c7",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnLoginNavText: { color: "#ffffff", fontSize: 13, fontWeight: "bold" },
  mobileMenuToggle: { padding: 4, marginLeft: 6 },
  mobileDrawer: {
    backgroundColor: "#081930",
    padding: 15,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.2)",
  },
  drawerItem: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  drawerItemText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  scrollBody: { paddingBottom: 40 },
  heroSection: {
    backgroundColor: "#0a192f",
    paddingVertical: 50,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  heroTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    marginBottom: 16,
  },
  heroTagText: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  heroTitle: {
    color: "#ffffff",
    fontSize: isDesktop ? 44 : 30,
    fontWeight: "900",
    textAlign: "center",
    maxWidth: 750,
    lineHeight: isDesktop ? 52 : 36,
    marginBottom: 16,
  },
  heroHighlight: { color: "#38bdf8" },
  heroSubtitle: {
    color: "#cbd5e1",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 620,
    lineHeight: 22,
    marginBottom: 26,
  },
  heroBtnRow: { flexDirection: "row", gap: 12, flexWrap: "wrap", justifyContent: "center" },
  btnHeroPrimary: {
    backgroundColor: "#0284c7",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  btnHeroPrimaryText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  btnHeroSecondary: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  btnHeroSecondaryText: { color: "#ffffff", fontSize: 14, fontWeight: "bold" },
  corpCard: {
    marginTop: 35,
    width: "100%",
    maxWidth: 650,
    backgroundColor: "rgba(15, 36, 68, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.25)",
    borderRadius: 20,
    padding: 20,
  },
  corpCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
    paddingBottom: 12,
  },
  corpLabel: { color: "#94a3b8", fontSize: 10, fontWeight: "bold" },
  corpName: { color: "#ffffff", fontSize: 15, fontWeight: "bold" },
  rcBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  rcBadgeText: { color: "#38bdf8", fontSize: 11, fontWeight: "bold" },
  metricsGrid: { flexDirection: "row", justifyContent: "space-between", marginTop: 15 },
  metricItem: { alignItems: "center" },
  metricValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  metricLabel: { color: "#94a3b8", fontSize: 10, marginTop: 2 },
  servicesSection: { paddingVertical: 50, paddingHorizontal: 20, alignItems: "center" },
  sectionPre: { color: "#0284c7", fontSize: 11, fontWeight: "bold", letterSpacing: 1 },
  sectionTitle: { color: "#0f172a", fontSize: 24, fontWeight: "bold", marginTop: 4, marginBottom: 25, textAlign: "center" },
  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 15, justifyContent: "center", maxWidth: 1100 },
  serviceBox: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 16,
    padding: 20,
    width: isDesktop ? 330 : "100%",
  },
  serviceBoxTitle: { color: "#0f172a", fontSize: 16, fontWeight: "bold", marginTop: 10, marginBottom: 6 },
  serviceBoxDesc: { color: "#64748b", fontSize: 13, lineHeight: 18 },
  footerSection: { backgroundColor: "#050e1d", paddingVertical: 40, alignItems: "center" },
  footerTitle: { color: "#ffffff", fontSize: 15, fontWeight: "bold", marginBottom: 4 },
  footerText: { color: "#94a3b8", fontSize: 12, marginBottom: 3 },
  contactRow: { flexDirection: "row", marginVertical: 18 },
  contactCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
  footerPhone: { color: "#38bdf8", fontSize: 14, fontWeight: "bold" },
});