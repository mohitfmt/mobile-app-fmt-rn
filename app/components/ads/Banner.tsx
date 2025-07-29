/**
 * BannerAD.tsx
 *
 * This component displays a Google AdMob banner ad.
 * It includes a loading indicator, dynamic theme-based styling, and handles ad failures gracefully.
 *
 * Features:
 * - Supports multiple ad unit types.
 * - Displays a loading placeholder until the ad loads.
 * - Applies dynamic styling based on the current theme.
 *
 * @author FMT Developers
 */

import React, { useContext, useState, useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { getArticleTextSize } from "../functions/Functions";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { AdUnitKey, BannerADProps } from "@/app/types/ads";

const BannerAD: React.FC<BannerADProps> = ({ unit }) => {
  const [isAdLoaded, setIsAdLoaded] = useState(false); // Track ad loading status
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);

  const dividerColor = useMemo(() => {
    // Choose a contrasting color for the divider based on your theme.
    // For example, if the background is white, use a medium gray; otherwise, a light gray.
    return theme.backgroundColor === "#ffffff" ? "#f9f9f9" : "#111111";
  }, [theme.backgroundColor]);

  // Retrieve the correct ad unit ID based on the ad placement
  const getAdUnitId = (): string => {
    const adUnits: Record<AdUnitKey, string> = {
      home: "/26812591/FMT_App_Home_MedRect_300x250",
      article1: "/26812591/FMT_App_Article_MedRect_300x250",
      article2: "/26812591/FMT_App_Article2_MedRect_300x250",
      article3: "/26812591/FMT_App_Article3_MedRect_300x250",
      ros: "/26812591/FMT_App_ROS_MedRect_300x250",
    };

    return adUnits[unit];
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.backgroundColor }]}
    >
      {/* Top divider */}
      <View style={styles.dividerContainer}>
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      </View>

      <View style={styles.separator} />
      <Text
        style={[
          styles.adText,
          {
            fontSize: getArticleTextSize(14, textSize),
            color: theme.backgroundColor === "#ffffff" ? "#9f9f9f" : "#999",
            paddingBottom: 5,
          },
        ]}
      >
        - Advertisement -
      </Text>
      <View style={styles.adContainer}>
        <BannerAd
          unitId={getAdUnitId()}
          size={BannerAdSize.MEDIUM_RECTANGLE}
          requestOptions={{
            requestNonPersonalizedAdsOnly: true,
          }}
          onAdLoaded={() => setIsAdLoaded(true)}
          onAdFailedToLoad={() => setIsAdLoaded(false)}
        />
      </View>

      <View style={styles.separator} />

      {/* Bottom divider */}
      <View style={[styles.dividerContainer, { paddingTop: 5 }]}>
        <View style={[styles.divider, { backgroundColor: dividerColor }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
  },
  adText: {
    marginBottom: 5,
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  separator: {
    height: 10,
    width: "100%",
  },
  adContainer: {
    width: 300, // Fixed width for the ad
    height: 250, // Fixed height for the ad
    justifyContent: "center",
    alignItems: "center",
    position: "relative", // Ensures placeholder and BannerAd overlap correctly
    backgroundColor: "#b3b3b3",
  },
  placeholder: {
    position: "absolute",
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1, // Ensure placeholder is above the ad
  },
  placeholderText: {
    marginTop: 8,
  },
  dividerContainer: {
    width: "100%",
  },
  divider: {
    height: 10,
    width: "100%",
  },
});

export default BannerAD;
