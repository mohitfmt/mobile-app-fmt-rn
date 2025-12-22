/**
 * TagHeader Component
 *
 * Header component for tag posts screen with navigation and refresh controls
 */

import { Refresh } from "@/app/assets/AllSVGs";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { TagHeaderProps } from "@/app/types/tag";
import { router } from "expo-router";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import React, { useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

/**
 * Tag Header with back button, title and refresh control
 *
 * @param {Object} props Component props
 * @param {string} props.tagName Tag name to display
 * @param {function} props.onRefresh Function to call when refresh is pressed
 * @param {number} props.textSize Text size from global settings
 * @returns {React.Component} Header component
 */
const TagHeader = ({ tagName, onRefresh, textSize }: TagHeaderProps) => {
  const [rotation] = useState(new Animated.Value(0));
  const { theme } = React.useContext(ThemeContext);

  /**
   * Handles refresh animation and triggers refresh action
   */
  const startRotationSequence = () => {
    onRefresh();
    Animated.sequence([
      Animated.timing(rotation, {
        toValue: 3,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: -0.5,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 0,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  return (
    <View style={styles.header}>
      {/* Back Arrow */}
      <View style={{ zIndex: 10 }}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          {Platform.OS === "ios" ? (
            <ChevronLeft size={32} color="#DC2626" />
          ) : (
            <ArrowLeft size={24} color="#DC2626" />
          )}
        </TouchableOpacity>
      </View>

      {/* Centered Title */}
      <Text
        style={[
          styles.relatedTitle,
          {
            color: theme.textColor,
            fontSize: getArticleTextSize(22.0, textSize),
          },
        ]}
        numberOfLines={1}
      >
        TAG: {tagName}
      </Text>

      {/* Refresh Icon */}
      <TouchableOpacity
        onPress={startRotationSequence}
        style={styles.iconContainer}
      >
        <Animated.View style={{ transform: [{ rotate: rotationInterpolate }] }}>
          <Refresh size={24} color="#c62828" fill="#c62828" />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  relatedTitle: {
    flex: 1,
    textAlign: "center",
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : "900",
    textTransform: "uppercase",
    paddingHorizontal: 22,
  },
});

export default TagHeader;
