import * as LocalAuthentication from "expo-local-authentication";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Toggle biometric authentication from Settings
const handleToggleBiometrics = async (enable, currentPassword) => {
  try {
    if (enable) {
      // 1. Verify hardware capability and enrollment
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        alert("Device does not support biometrics or no biometric profile is enrolled.");
        return;
      }

      // 2. Authenticate fingerprint/FaceID
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: "Confirm your fingerprint to enable biometric login",
        fallbackLabel: "Cancel",
      });

      if (!auth.success) {
        alert("Biometric verification failed.");
        return;
      }

      // 3. Store required credentials for direct authentication in LoginScreen
      await AsyncStorage.setItem("useBiometricLogin", "true");
      if (userProfile?.email || userProfile?.phone) {
        await AsyncStorage.setItem("savedIdentifier", userProfile.email || userProfile.phone);
      }
      if (currentPassword) {
        await AsyncStorage.setItem("savedPassword", currentPassword);
      }

      setIsBiometricActive(true);
      alert("Biometric Login Enabled Successfully!");
    } else {
      // Disable biometric authentication
      await AsyncStorage.setItem("useBiometricLogin", "false");
      await AsyncStorage.removeItem("savedPassword");
      setIsBiometricActive(false);
      alert("Biometric Login Disabled.");
    }
  } catch (error) {
    console.error("Biometric setup error:", error.message);
  }
};