import React, { useContext } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
} from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createDrawerNavigator } from "@react-navigation/drawer";

// --- CONTEXT ---
import { ThemeProvider, ThemeContext } from "./src/context/ThemeContext";

// --- COMPONENTS ---
import CustomDrawerContent from "./src/components/CustomDrawerContent";
import NotificationsScreen from "./src/screens/NotificationsScreen"; // Ka tabbatar wannan path ɗin daidai yake
// --- SCREENS ---
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import BuyDataScreen from "./src/screens/BuyDataScreen";
import HistoryScreen from "./src/screens/HistoryScreen";
import ElectricityScreen from "./src/screens/ElectricityScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import NIMCScreen from "./src/screens/NIMCScreen";
import CableScreen from "./src/screens/CableScreen";
import SignupScreen from "./src/screens/SignupScreen";
import ForgotPasswordScreen from "./src/screens/ForgotPasswordScreen";
import AirtimeScreen from "./src/screens/AirtimeScreen";
import FundWalletScreen from "./src/screens/FundWalletScreen";
import ContactScreen from "./src/screens/ContactScreen";
import SupervisorDashboard from "./src/screens/SupervisorDashboard";
import AdminControlScreen from "./src/screens/AdminControlScreen";
import AssignTargetScreen from "./src/screens/AssignTargetScreen";
import AgentDashboard from "./src/screens/AgentDashboard";
import SettingsScreen from "./src/screens/SettingsScreen";
import SuccessScreen from "./src/screens/SuccessScreen";
import LeaderDashboard from "./src/screens/LeaderDashboard";
import CreateSupervisorScreen from "./src/screens/CreateSupervisorScreen";
import ManageAgentsScreen from "./src/screens/ManageAgentsScreen";
import UserManagement from "./src/screens/superadmin/UserManagement";
import SuperAdminDashboard from "./src/screens/SuperAdminDashboard";
import NIMCModificationScreen from "./src/screens/Services/NIMCModificationScreen";
import NIMCRequests from "./src/screens/Admin/NIMCRequests";
import NIMCHistory from "./src/screens/User/NIMCHistory";
import BVNScreen from "./src/screens/BVNScreen";
import BVNHistory from "./src/screens/User/BVNHistory";
import UpdatePin from "./src/screens/UpdatePin";
import SupportDashboard from "./src/screens/SupportDashboard";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import AboutScreen from "./src/screens/AboutScreen";
import PrivacyPolicyScreen from "./src/screens/PrivacyPolicyScreen";
import TermsScreen from "./src/screens/TermsScreen";
import NINValidation from "./src/screens/NINValidation";

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#38bdf8",
      }}
    >
      <Drawer.Screen name="Dashboard" component={HomeScreen} />
      <Drawer.Screen name="AgentDashboard" component={AgentDashboard} />
      <Drawer.Screen name="Wallet History" component={HistoryScreen} />
      <Drawer.Screen name="BVN History" component={BVNHistory} />
      <Drawer.Screen name="NIMC History" component={NIMCHistory} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
    </Drawer.Navigator>
  );
}

function AppContent() {
  const { isDarkMode } = useContext(ThemeContext);
  return (
    <NavigationContainer theme={isDarkMode ? DarkTheme : DefaultTheme}>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#38bdf8",
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Signup"
          component={SignupScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Main"
          component={DrawerNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen name="BuyAirtime" component={AirtimeScreen} />
        <Stack.Screen name="FundWallet" component={FundWalletScreen} />
        <Stack.Screen name="BuyData" component={BuyDataScreen} />
        <Stack.Screen name="Electricity" component={ElectricityScreen} />
        <Stack.Screen name="NIMC" component={NIMCScreen} />
        <Stack.Screen name="BVNScreen" component={BVNScreen} />
        <Stack.Screen name="Cable" component={CableScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Contact" component={ContactScreen} />
        <Stack.Screen name="AdminControl" component={AdminControlScreen} />
        <Stack.Screen
          name="SupervisorDashboard"
          component={SupervisorDashboard}
        />

        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen name="AssignTarget" component={AssignTargetScreen} />
        <Stack.Screen name="LeaderDashboard" component={LeaderDashboard} />
        <Stack.Screen
          name="CreateSupervisor"
          component={CreateSupervisorScreen}
        />
        <Stack.Screen name="ManageAgents" component={ManageAgentsScreen} />
        <Stack.Screen name="SuperAdminUsers" component={UserManagement} />
        <Stack.Screen
          name="SuperAdminDashboard"
          component={SuperAdminDashboard}
        />
        <Stack.Screen name="SupportDashboard" component={SupportDashboard} />
        <Stack.Screen name="NIMCRequests" component={NIMCRequests} />
        <Stack.Screen
          name="NIMCModification"
          component={NIMCModificationScreen}
        />
        <Stack.Screen name="UpdatePin" component={UpdatePin} />
        <Stack.Screen name="About" component={AboutScreen} />
        <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
        <Stack.Screen name="Terms" component={TermsScreen} />
        <Stack.Screen name="NINValidation" component={NINValidation} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}
