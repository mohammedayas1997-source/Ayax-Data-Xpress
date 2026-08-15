import React, { createContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const ThemeContext = createContext({
  isDarkMode: false,
  toggleTheme: () => {},
  setIsDarkMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem("darkMode");
      if (savedTheme !== null) {
        setIsDarkMode(JSON.parse(savedTheme));
      }
    } catch (error) {
      console.log("Error loading theme:", error);
    }
  };

  const toggleTheme = async () => {
    try {
      const value = !isDarkMode;
      setIsDarkMode(value);
      await AsyncStorage.setItem("darkMode", JSON.stringify(value));
    } catch (error) {
      console.log("Error toggling theme:", error);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        isDarkMode,
        setIsDarkMode,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};