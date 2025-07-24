/**
 * StickyNotification.tsx
 *
 * A floating notification component that **fades in, displays a message, and fades out automatically**.
 *
 * - **Fades in when triggered**, remains visible for a set duration, then **fades out smoothly**.
 * - **Displays dynamic messages** passed via props.
 * - **Supports theme-based UI** for customization.
 *
 * Features:
 * - **Uses React Native's Animated API** for smooth fade effects.
 * - **Closes automatically after a configurable duration**.
 * - **Lightweight & efficient**, no manual closing required.
 *
 */

import { StickyNotificationProps } from "@/app/types/settings";
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * **StickyNotification Component**
 *
 * - A floating, **auto-dismissing** notification with fade-in and fade-out effects.
 * - Uses **React Native's Animated API** for smooth transitions.
 *
 * @param message - The notification text to be displayed.
 * @param onClose - Function to call when the notification closes.
 * @param duration - How long (in ms) the notification remains visible before fading out.
 */
const StickyNotification: React.FC<StickyNotificationProps> = ({
  message,
  onClose,
  duration = 2000,
}) => {
  const windowHeight = Dimensions.get("window").height;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Start fade out after delay
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        onClose();
      });
    }, duration - 300); // Subtract animation duration from total duration

    return () => {
      clearTimeout(timer);
      fadeAnim.setValue(0);
    };
  }, [fadeAnim, duration, onClose]);

  return (
    <View style={[styles.container, { height: windowHeight }]}>
      <Animated.View
        style={[
          styles.notificationContainer,
          {
            opacity: fadeAnim,
            marginBottom:insets.bottom+50,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.notificationText}>{message}</Text>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: "box-none",
    zIndex: 1000,
  },
  notificationContainer: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 130 : 60, // iOS gets 80, Android gets 60
    left: 0,
    right: 0,
    backgroundColor: "#B91C1C",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 8,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  notificationText: {
    color: "white",
    fontSize: 16,
    flex: 1,
    fontFamily: "SF-Pro-Display-Regular",
  },
  closeButton: {
    marginLeft: 16,
  },
});

export default StickyNotification;
