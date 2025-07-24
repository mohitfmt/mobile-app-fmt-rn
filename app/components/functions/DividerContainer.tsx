/**
 * DividerContainer.tsx
 *
 * A simple horizontal divider component.
 *
 * - Uses `ThemeContext` to dynamically adjust colors based on light/dark mode.
 * - Provides a **thin separator** to enhance UI readability.
 * - Uses `paddingVertical` for spacing control.
 *
 * Features:
 * - Light theme: Soft gray (`#eef`) divider.
 * - Dark theme: Dark gray (`#111111`) divider.
 * - Responsive width adjustment for fluid UI layouts.
 *
 * @author FMT Developers
 */

import { ThemeContext } from "@/app/providers/ThemeProvider";
import React, { useContext } from "react";
import { View, StyleSheet } from "react-native";

/**
 * DividerContainer
 *
 * A UI component that provides a horizontal separator between sections.
 *
 * It dynamically adjusts its **background color** based on the current theme:
 * - **Light Mode**: Soft gray (`#eef`).
 * - **Dark Mode**: Dark gray (`#111111`).
 */
const DividerContainer = () => {
  // Get the current theme (light/dark mode)
  const { theme } = useContext(ThemeContext);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundColor, paddingVertical: 10 },
      ]}
    >
      <View
        style={[
          styles.divider,
          {
            backgroundColor:
              theme.backgroundColor === "#ffffff" ? "#eef" : "#111111",
          },
        ]}
      />
    </View>
  );
};

// Component Styles
const styles = StyleSheet.create({
  container: {
    width: "100%", // Makes divider span the full width of the container
  },
  divider: {
    height: 1, // Thin horizontal line
    width: "100%", // Full-width divider
  },
});

export default DividerContainer;
