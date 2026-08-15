import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ImageBackground,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const OnboardingScreen = ({ navigation }) => {
  return (
    <View style={styles.desktopWrapper}>
      <ImageBackground
        source={require("../assets/ayax_promo_hijab.png")}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />

        <LinearGradient
          colors={["rgba(15, 23, 42, 0.7)", "rgba(15, 23, 42, 0.3)"]}
          style={styles.gradientOverlay}
        />

        <View style={styles.container}>
          {/* Logo pushed higher to clear the upper-middle area */}
          <View style={styles.logoContainer}>
            <Image
              source={require("../assets/Logo.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.contentContainer}>
            {/* Slimmer card with reduced padding and margin to show more background */}
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(255,255,255,0.8)"]}
              style={styles.textCard}
            >
              <Text style={styles.title}>DOMINATE YOUR DIGITAL WORLD</Text>

              <Text style={styles.description}>
                Ayax Xpress delivers aggressive data rates and lightning-fast
                payments.
              </Text>

              <View style={styles.motivationBox}>
                <Text style={styles.motivation}>
                  "Success favors the efficient. Conquer your digital world with
                  the right connection."
                </Text>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.replace("Login")}
            >
              <LinearGradient
                colors={["#0ea5e9", "#1e3a8a"]}
                style={styles.button}
              >
                <Text style={styles.buttonText}>GET STARTED</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  desktopWrapper: {
    flex: 1,
    backgroundColor: "#0f172a",
    alignItems: "center",
    justifyContent: "center",
  },
  backgroundImage: {
    flex: 1,
    width: width > 600 ? 600 : "100%",
    height: "100%",
    alignSelf: "center",
  },
  gradientOverlay: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  container: {
    flex: 1,
    paddingHorizontal: 25,
    justifyContent: "space-between",
    paddingBottom: 40,
  },
  logoContainer: {
    flex: 0.25, // Reduced flex to pull it up
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 30, // Positioned near the very top
  },
  logo: {
    width: 130, // Slightly smaller logo to maximize space
    height: 130,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  contentContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  textCard: {
    paddingVertical: 15, // Reduced height padding
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#fff",
    width: "95%", // Slightly narrower card
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
  },
  title: {
    fontSize: 20, // Slightly smaller title
    fontWeight: "900",
    color: "#1e3a8a",
    textAlign: "center",
    marginBottom: 8,
    letterSpacing: 1,
  },
  description: {
    fontSize: 14, // Condensed description
    color: "#334155",
    textAlign: "center",
    lineHeight: 20,
    fontWeight: "600",
    marginBottom: 10,
  },
  motivationBox: {
    borderTopWidth: 1,
    borderTopColor: "#cbd5e1",
    paddingTop: 10,
  },
  motivation: {
    fontSize: 12, // More compact motivation text
    color: "#1e293b",
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "700",
    lineHeight: 18,
  },
  buttonContainer: {
    flex: 0.15,
    justifyContent: "center",
    paddingBottom: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});

export default OnboardingScreen;
