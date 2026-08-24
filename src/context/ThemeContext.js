import React, { createContext, useState, useContext } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  const theme = {
    isDarkMode,
    colors: {
      background: isDarkMode ? "#050811" : "#f8fafc",
      card: isDarkMode ? "#0b1120" : "#ffffff",
      text: isDarkMode ? "#f8fafc" : "#0f172a",
      subText: "#64748b",
      primary: "#00f0ff",
      border: isDarkMode ? "#1e293b" : "#e2e8f0",
    },
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);