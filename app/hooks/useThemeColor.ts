// useThemeColor.ts
//
// This file defines the useThemeColor hook, which provides the correct color value
// based on the current system theme (light or dark). It allows components to easily
// support light/dark mode and custom color overrides.
//
// Key responsibilities:
// - Detect the current system color scheme (light or dark)
// - Return the appropriate color from the Colors constant or from props
//
// Usage: Use useThemeColor({ light, dark }, colorName) to get the correct color for UI elements.
//
// -----------------------------------------------------------------------------

/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from "react-native";

import { Colors } from "@/app/constants/Colors";

// useThemeColor: Returns the color for the current theme, using props override if provided.
export default function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
