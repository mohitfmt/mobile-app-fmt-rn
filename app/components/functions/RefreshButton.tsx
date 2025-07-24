/**
 * RefreshButton.tsx
 *
 * This component renders an animated refresh button.
 * - When pressed, it triggers a **360-degree rotation animation**.
 * - Supports a callback function (`onPress`) after the animation completes.
 * - Allows customization of **size and color**.
 *
 * Features:
 * - **Uses React Native's Animated API** for smooth rotation.
 * - **Customizable icon size & color**.
 * - **Triggers a callback function** after animation completes.
 * - **Enhances UX with visual feedback**.
 *
 * @author FMT Developers
 */

import React, { useRef } from "react";
import { TouchableOpacity, Animated } from "react-native";
import { RotateCw } from "lucide-react-native";

/**
 * RefreshButton Component
 *
 * - Triggers a rotation animation when clicked.
 * - Calls an optional callback function (`onPress`) after the animation.
 *
 * @param onPress - Function to execute after animation completes.
 * @param color - Icon color (default: `#c62828`).
 * @param size - Icon size (default: `24`).
 */
const RefreshButton = ({ onPress, color = "#c62828", size = 24 }: any) => {
  const rotateAnim = useRef(new Animated.Value(0)).current;

  /**
   * Starts the rotation animation when button is pressed.
   * - Resets animation value.
   * - Rotates the icon **three full turns (1080 degrees)**.
   * - Calls the `onPress` function after animation completes.
   */
  const startAnimation = () => {
    rotateAnim.setValue(0);
    Animated.timing(rotateAnim, {
      toValue: 3, // Rotates 3 full circles
      duration: 2000,
      useNativeDriver: true,
    }).start(() => onPress && onPress()); // Calls the callback function after animation
  };

  // Interpolates animation values to degrees for smooth rotation
  const spin = rotateAnim.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  return (
    <TouchableOpacity
      onPress={startAnimation}
      style={{
        padding: 8,
        width: 40,
        height: 40,
        justifyContent: "center",
        alignItems: "center",
      }}
      activeOpacity={0.7}
    >
      <Animated.View style={{ transform: [{ rotate: spin }] }}>
        <RotateCw size={size} color={color} />
      </Animated.View>
    </TouchableOpacity>
  );
};

export default RefreshButton;
