// --- 1. IMPORT SCREENS ---
import SuperAdminDashboard from "../screens/SuperAdminDashboard";
import AdminDashboard from "../screens/AdminDashboard";
import SupervisorDashboard from "../screens/SupervisorDashboard";
import UserNIMCHistory from "../screens/User/NIMCHistory";

// --- 2. INSIDE <Stack.Navigator> ---

{/* SUPERADMIN DASHBOARD */}
<Stack.Screen
  name="SuperAdminDashboard"
  component={SuperAdminDashboard}
  options={{
    headerShown: false,
  }}
/>

{/* ADMIN DASHBOARD */}
<Stack.Screen
  name="AdminDashboard"
  component={AdminDashboard}
  options={{
    headerShown: false,
  }}
/>

{/* SUPERVISOR DASHBOARD */}
<Stack.Screen
  name="SupervisorDashboard"
  component={SupervisorDashboard}
  options={{
    headerShown: false,
  }}
/>

{/* NIMC HISTORY SCREEN */}
<Stack.Screen
  name="UserNIMCHistory"
  component={UserNIMCHistory}
  options={{
    headerShown: true,
    title: "NIMC Verification History",
    headerStyle: { backgroundColor: "#0f172a" },
    headerTintColor: "#fff",
    headerTitleStyle: { fontWeight: "bold" },
  }}
/>