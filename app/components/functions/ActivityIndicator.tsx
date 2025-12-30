/**
 * ActivityIndicator.tsx
 *
 * This component renders a custom animated loading indicator.
 * It displays:
 * - A circular loading animation with eight rotating spokes.
 * - Theme-based colors for dark/light mode.
 * - Smooth cubic easing animation for a better user experience.
 * - A "LOADING" text below the animation.
 *
 * Features:
 * - Uses React Native's Animated API for smooth transitions.
 * - Supports customizable size and color.
 * - Dynamically adjusts font size based on user settings.
 *
 * @author FMT Developers
 */

import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import React, { useContext, useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { getArticleTextSize } from "./Functions";

/**
 * ActivityIndicator component
 *
 * Renders an animated circular loading spinner with eight rotating spokes.
 */
const ActivityIndicator = ({ size = 20, color = "#999999" }) => {
  const animations = useRef(
    Array(8)
      .fill(0)
      .map(() => new Animated.Value(1))
  ).current;

  // Starts animation when component mounts
  useEffect(() => {
    const sequences = animations.map((anim, index) => {
      return Animated.sequence([
        Animated.delay(index * (1000 / 8)),
        Animated.loop(
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 0.1,
              duration: 250,
              easing: Easing.cubic,
              useNativeDriver: true,
            }),
            Animated.delay(750),
            Animated.timing(anim, {
              toValue: 1,
              duration: 250,
              easing: Easing.cubic,
              useNativeDriver: true,
            }),
          ])
        ),
      ]);
    });

    Animated.parallel(sequences).start();
    return () => sequences.forEach((sequence) => sequence.stop());
  }, []);

  const spokeLength = size * 0.35;
  const spokeWidth = size * 0.1;
  const radius = (size - spokeLength) / 2;
  const { theme } = useContext(ThemeContext);

  return (
    <>
      <View
        style={[
          styles.container,
          { width: size, height: size, backgroundColor: theme.backgroundColor },
        ]}
      >
        {animations.map((anim, index) => {
          const rotation = (index * 360) / 8;
          return (
            <Animated.View
              key={index}
              style={[
                styles.spoke,
                {
                  opacity: anim,
                  backgroundColor: color,
                  width: spokeWidth,
                  height: spokeLength,
                  borderRadius: spokeWidth / 2,
                  transform: [
                    { translateY: -spokeLength / 2 },
                    { rotate: `${rotation}deg` },
                    { translateY: radius },
                  ],
                },
              ]}
            />
          );
        })}
      </View>
    </>
  );
};

/**
 * LoadingIndicator component
 *
 * Displays the custom loading animation along with "LOADING" text.
 */

export const LoadingIndicator = () => {
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext); // Access the global context

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
    >
      <View style={styles.contentWrapper}>
        <ActivityIndicator size={20} color="#999999" />
        <View style={{ height: 8 }} />
        <Text
          style={[
            styles.loadingText,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(12.0, textSize),
            },
          ]}
        >
          LOADING
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  spoke: {
    position: "absolute",
    left: "50%",
    top: "50%",
    marginLeft: -1,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontWeight: "400",
    letterSpacing: 1,
  },
});

export default ActivityIndicator;
