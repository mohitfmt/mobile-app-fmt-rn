// GlobalSettingsProvider.tsx
//
// This file provides a context for managing global user settings (like text size and standfirst display).
// It persists user preferences in mmkv and exposes them to the app via React Context.
//
// Key responsibilities:
// - Store and manage user settings (text size, standfirst enabled)
// - Persist settings in mmkv
// - Provide functions to update and retrieve settings
//
// Usage: Wrap your app (or a subtree) with <GlobalSettingsProvider> to provide global settings context.
// Use the context to access and update user preferences in components.
//
// -----------------------------------------------------------------------------

import { storage } from "@/app/lib/storage";
import React, { createContext, ReactNode, useEffect, useState } from "react";

interface GlobalSettingsContextType {
  textSize: string;
  setTextSize: (size: string) => void;
  standfirstEnabled: boolean;
  setStandfirstEnabled: (enabled: boolean) => void;
}

export const GlobalSettingsContext = createContext<GlobalSettingsContextType>({
  textSize: "System default",
  setTextSize: () => {},
  standfirstEnabled: true,
  setStandfirstEnabled: () => {},
});

export const GlobalSettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [textSize, setTextSizeState] = useState<string>("System default");
  const [standfirstEnabled, setStandfirstEnabledState] =
    useState<boolean>(true);

  // Load saved settings from mmkv on app start
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSize = await storage.getString("textSize");
        const savedStandfirst = await storage.getString("standfirstEnabled");
        if (savedSize) {
          setTextSizeState(savedSize);
        }
        if (savedStandfirst) {
          setStandfirstEnabledState(savedStandfirst === "true");
        }
      } catch (error) {
        console.error("Failed to load settings from storage:", error);
      }
    };

    loadSettings();
  }, []);

  // Updates the text size preference and saves it to mmkv
  const setTextSize = async (size: string) => {
    try {
      await storage.set("textSize", size);
      setTextSizeState(size);
    } catch (error) {
      console.error("Failed to save text size to storage:", error);
    }
  };

  // Updates the standfirst preference and saves it to mmkv
  const setStandfirstEnabled = async (enabled: boolean) => {
    try {
      await storage.set("standfirstEnabled", enabled.toString());
      setStandfirstEnabledState(enabled);
    } catch (error) {
      console.error("Failed to save standfirst setting to storage:", error);
    }
  };

  return (
    <GlobalSettingsContext.Provider
      value={{ textSize, setTextSize, standfirstEnabled, setStandfirstEnabled }}
    >
      {children}
    </GlobalSettingsContext.Provider>
  );
};

export default { GlobalSettingsContext, GlobalSettingsProvider };
