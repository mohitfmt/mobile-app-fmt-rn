// ThemeProvider.tsx
//
// This file provides a global theme context for managing light, dark, and system themes.
// It allows users to toggle between themes and persists their preferences using mmkv.
// Network connectivity is checked manually using axios to ensure reliable online/offline detection.
//
// Key responsibilities:
// - Support light, dark, and system-based themes
// - Save user theme preferences in mmkv
// - Detect system theme changes when set to "system"
// - Provide online/offline status to the app
//
// Usage: Wrap your app with <ThemeProvider> to provide theme context to all components.
//
// -----------------------------------------------------------------------------

import { storage } from "@/app/lib/storage";
import axios from "axios";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react";
import { Appearance, AppState, AppStateStatus } from "react-native";

// Define themes: These are the color palettes for light and dark modes.
const themes = {
  light: { backgroundColor: "#ffffff", textColor: "#000000" },
  dark: { backgroundColor: "#000000", textColor: "#ffffff" },
};

// ThemeContextType: The shape of the context value provided to consumers.
type ThemeContextType = {
  theme: { backgroundColor: string; textColor: string };
  toggleTheme: (selectedTheme?: "light" | "dark" | "system") => void;
  isOnline: boolean;
  setIsOnline: (status: boolean) => void;
};

// ThemeContext: Provides theme, toggleTheme, and online status to consumers.
export const ThemeContext = createContext<ThemeContextType>({
  theme: themes.light,
  toggleTheme: () => {
    // console.warn('toggleTheme function is not implemented.');
  },
  isOnline: true,
  setIsOnline: () => {
    // console.warn('setIsOnline function is not implemented.');
  },
});

// ThemeProviderProps: Props for the ThemeProvider component (children only).
type ThemeProviderProps = {
  children: ReactNode;
};

/**
 * ThemeProvider component
 *
 * - Manages theme selection (light, dark, or system).
 * - Loads saved theme preferences from mmkv.
 * - Applies system theme changes dynamically if "system" mode is selected.
 * - Checks internet accessibility manually using axios.head.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState(themes.light); // Default theme
  const [selectedTheme, setSelectedTheme] = useState<string>("system"); // Track user's theme preference
  const [isOnline, setIsOnline] = useState<boolean>(true); // Default to true for optimism
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );

  // checkNetworkConnectivity: Checks if the device is online by making a HEAD request to Google.
  const checkNetworkConnectivity = useCallback(async () => {
    // console.log('📡 ThemeProvider: Checking network connectivity...');
    try {
      await axios.head("https://www.google.com", { timeout: 2000 }); // Reduced timeout for faster response
      setIsOnline(true);
      // console.log('ThemeProvider: Manual network check, isOnline: true');
    } catch (err: unknown) {
      setIsOnline(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      // console.log('ThemeProvider: Manual network check, isOnline: false', errorMessage);
    }
  }, []);

  // applyTheme: Loads the user's theme preference from mmkv and applies it.
  const applyTheme = async () => {
    try {
      const storedTheme = await storage.getString("appTheme");
      setSelectedTheme(storedTheme || "system");

      if (storedTheme === "light") {
        setTheme(themes.light);
      } else if (storedTheme === "dark") {
        setTheme(themes.dark);
      } else {
        const systemTheme = Appearance.getColorScheme();
        setTheme(systemTheme === "dark" ? themes.dark : themes.light);
      }
    } catch (err) {
      console.error("🔴 Failed to apply theme:", err);
    }
  };

  // useEffect: Schedules network checks and handles app state changes (foreground/background).
  useEffect(() => {
    // Check connectivity immediately on mount
    checkNetworkConnectivity();

    // Check more frequently initially (every 2 seconds for the first 30 seconds)
    const initialInterval = setInterval(checkNetworkConnectivity, 2000);
    const initialTimeout = setTimeout(() => {
      clearInterval(initialInterval);
    }, 30000); // Stop frequent checks after 30 seconds

    // Then check every 30 seconds
    const regularInterval = setInterval(checkNetworkConnectivity, 30000);

    const appStateSubscription = AppState.addEventListener(
      "change",
      (nextAppState) => {
        if (
          appState.match(/inactive|background/) &&
          nextAppState === "active"
        ) {
          // console.log('📱 ThemeProvider: App foregrounded, checking connectivity');
          checkNetworkConnectivity();
        }
        setAppState(nextAppState);
      }
    );

    return () => {
      clearInterval(initialInterval);
      clearInterval(regularInterval);
      clearTimeout(initialTimeout);
      appStateSubscription.remove();
    };
  }, [appState, checkNetworkConnectivity]);

  // useEffect: Listens for system theme changes if "system" mode is selected.
  useEffect(() => {
    if (selectedTheme === "system") {
      const listener = Appearance.addChangeListener(({ colorScheme }) => {
        setTheme(colorScheme === "dark" ? themes.dark : themes.light);
      });
      return () => listener.remove();
    }
  }, [selectedTheme]);

  // useEffect: Loads the initial theme on component mount.
  useEffect(() => {
    applyTheme();
  }, []);

  // toggleTheme: Changes the theme and saves the preference to mmkv.
  const toggleTheme = async (newTheme?: "light" | "dark" | "system") => {
    try {
      if (newTheme) {
        setSelectedTheme(newTheme);
        await storage.set("appTheme", newTheme);

        if (newTheme === "light") {
          setTheme(themes.light);
        } else if (newTheme === "dark") {
          setTheme(themes.dark);
        } else {
          const systemTheme = Appearance.getColorScheme();
          setTheme(systemTheme === "dark" ? themes.dark : themes.light);
        }
      } else {
        const toggledTheme = theme === themes.light ? "dark" : "light";
        setSelectedTheme(toggledTheme);
        await storage.set("appTheme", toggledTheme);
        setTheme(toggledTheme === "dark" ? themes.dark : themes.light);
      }
    } catch (err) {
      console.error("🔴 Failed to toggle theme:", err);
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, isOnline, setIsOnline }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export default { ThemeContext, ThemeProvider };
