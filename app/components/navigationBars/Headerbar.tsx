// Headerbar.tsx
//
// This file defines the HeaderBar component, which is used as the main app header.
// It displays the app logo, search button, bookmarks button (with count), and a refresh button.
// The header adapts to theme, device, and supports animated transitions and navigation.
//
// Key responsibilities:
// - Display app logo, search, bookmarks, and refresh actions
// - Show animated transitions for logo and refresh icon
// - Show bookmark count badge
// - Integrate with navigation and context providers
//
// Usage: Render <HeaderBar ...props /> as the main app header in navigation layouts.
//
// -----------------------------------------------------------------------------

import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Text,
  Animated as RNAnimated,
  Easing,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { BookmarkIcon, Refresh, Search } from "@/app/assets/AllSVGs";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { DataContext } from "@/app/providers/DataProvider";
import { useBookmarks } from "@/app/providers/BookmarkContext";
import { useLandingData } from "@/app/providers/LandingProvider";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface HeaderBarProps {
  logoTranslateY: SharedValue<number>;
  activeindex: number;
}

const categoryKeys = [
  "home-landing",
  "news-landing",
  "berita-landing",
  "opinion-landing",
  "world-landing",
  "business-landing",
  "property-landing",
  "sports-landing",
  "lifestyle-landing",
  "videos-landing",
];

export default function HeaderBar({
  logoTranslateY,
  activeindex,
}: HeaderBarProps) {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { refreshData } = useContext(DataContext);
  const { bookmarkedArticles } = useBookmarks();
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const rotation = useRef(new RNAnimated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { refreshCategoryData } = useLandingData();

  useEffect(() => {
    setBookmarkCount(bookmarkedArticles?.length || 0);
  }, [bookmarkedArticles]);

  const goToBookmarks = () => router.push("/components/bookmark/Bookmark");
  const goToSearch = () => router.push("/components/search/Search");

  const startRotationSequence = async () => {
    try {
      rotation.stopAnimation(() => {
        rotation.setValue(0);

        RNAnimated.sequence([
          RNAnimated.timing(rotation, {
            toValue: 4,
            duration: 800,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          RNAnimated.timing(rotation, {
            toValue: 0,
            duration: 5000,
            easing: Easing.elastic(1),
            useNativeDriver: true,
          }),
        ]).start();
      });

      const keyToRefresh = categoryKeys[activeindex];
      if (keyToRefresh) {
        refreshCategoryData(keyToRefresh);
      } else {
        console.warn("Invalid activeindex:", activeindex);
      }
    } catch (error) {
      console.error("Error in startRotationSequence:", error);
    }
  };

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  // Inside HeaderBar component:
  const logoAnimatedStyle = useAnimatedStyle(() => {
    const translateY = logoTranslateY.value - 0; // ← Extra upward shift
    const opacity = interpolate(
      logoTranslateY.value,
      [-48, 0],
      [0, 1],
      "clamp"
    ); // ← fade out as it moves up
    return {
      transform: [{ translateY }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        { backgroundColor: theme.backgroundColor, marginTop: 4 },
        Platform.OS === "ios" ? logoAnimatedStyle : null,
      ]}
    >
      <View
        className={`flex-row items-center justify-between px-4 py-2 ${
          theme.backgroundColor === "#000000"
            ? "border-gray-700"
            : "border-gray-200"
        } h-14`}
        style={{ backgroundColor: theme.backgroundColor }}
      >
        {/* Search Button */}
        <TouchableOpacity
          onPress={goToSearch}
          className="p-2 w-10 h-10 justify-center items-center"
        >
          <Search size={28} color="#c62828" />
        </TouchableOpacity>

        <Animated.View
          style={[
            {
              left: 15,
              right: 0,
              top: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
            },
            logoAnimatedStyle,
          ]}
        >
          <Image
            source={require("../../assets/images/logofmt.png")}
            style={{ width: 100, height: 35, resizeMode: "contain" }}
          />
        </Animated.View>

        {/* Bookmarks + Refresh */}
        <View className="flex-row">
          <TouchableOpacity
            onPress={goToBookmarks}
            className="p-2 w-10 h-10 justify-center items-center relative"
            style={Platform.OS === "ios" ? { marginRight: 15 } : undefined}
          >
            <BookmarkIcon size={25} color="#c62828" fill="transparent" />
            {bookmarkCount >= 0 && (
              <View
                className="absolute top-1.5 right-1.5 bg-red-500 rounded-full justify-center items-center"
                style={{ width: 12, height: 12 }}
              >
                <Text
                  className="text-white font-bold"
                  style={{
                    fontSize: 8,
                    lineHeight: 10,
                    textAlign: "center",
                    textAlignVertical: "center",
                    includeFontPadding: false,
                    left: 0.5,
                  }}
                >
                  {bookmarkCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Refresh */}
          <TouchableOpacity
            onPress={startRotationSequence}
            className="p-2 w-10 h-10 justify-center items-center"
          >
            <RNAnimated.View
              style={{ transform: [{ rotate: rotationInterpolate }] }}
            >
              <Refresh size={28} color="#c62828" fill="#c62828" />
            </RNAnimated.View>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
