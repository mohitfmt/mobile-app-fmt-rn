/**
 * SmallVideoCard.tsx
 *
 * Displays a video thumbnail with play overlay, title, description, and share functionality.
 * Conditionally shows the description based on standfirstEnabled setting.
 *
 * @author FMT Developers
 */

import React, { useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Share,
  StyleSheet,
  Alert,
  Linking,
  Platform,
} from "react-native";
import { Play } from "lucide-react-native";
import { ShareIcon } from "@/app/assets/AllSVGs"; // Use ShareIcon instead of Share2
import { getArticleTextSize } from "../functions/Functions";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { SmallVideoCardProps } from "@/app/types/cards";
import { stripHtml } from "@/app/lib/utils";
import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";

export default function SmallVideoCard({
  thumbnail,
  title,
  content,
  date,
  permalink,
}: SmallVideoCardProps) {
  const { theme } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext); // Added standfirstEnabled

  // Navigate to Video
  const navigateToVideo = () => {
    Linking.openURL(permalink).catch(() =>
      Alert.alert("Error", "Failed to open video")
    );
  };

  // Handle Video Sharing
  const handleShare = async () => {
    try {
      const mainHeading = stripHtml(title);

      await Share.share({
        message: `${mainHeading}\n\n${permalink}`,
      });
    } catch (error) {
      console.error("Error sharing the video:", error);
    }
  };

  return (
    <TouchableOpacity
      onPress={navigateToVideo}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundColor,
          borderColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
      className="border-b"
    >
      <View style={styles.row}>
        {/* Video Thumbnail */}
        <View style={styles.imageContainer}>
          <CloudflareImageComponent
            src={thumbnail}
            width={100}
            height={100}
            accessibilityLabel={title}
          />
          {/* Play Button Overlay */}
          <View style={styles.playIconContainer}>
            <View style={styles.circle}>
              <Play size={24} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        </View>

        {/* Video Content */}
        <View style={styles.contentContainer}>
          <Text
            numberOfLines={3}
            style={[
              styles.title,
              {
                color: theme.textColor,
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Text-Bold",
                fontWeight: Platform.OS === "android" ? "700" : undefined,
                fontSize: getArticleTextSize(16, textSize),
              },
            ]}
          >
            {title}
          </Text>

          {standfirstEnabled && content && (
            <Text
              numberOfLines={3}
              style={[
                styles.description,
                { fontSize: getArticleTextSize(14, textSize) },
              ]}
            >
              {content}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footerRow}>
        <Text
          style={[
            styles.timeText,
            { fontSize: getArticleTextSize(14, textSize) },
          ]}
        >
          {date}
        </Text>
        <View style={styles.iconRow}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.iconButton}
            activeOpacity={0.7}
          >
            <ShareIcon size={20} color="#c62828" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    overflow: "hidden",
    margin: 18,
    marginBottom: 0,
  },
  row: {
    flexDirection: "row",
  },
  imageContainer: {
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    width: 100,
    height: 100,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  playIconContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  contentContainer: {
    flex: 2,
    marginLeft: 18,
  },
  title: {
    lineHeight: 20,
    marginBottom: 20,
  },
  description: {
    color: "#9e9e9e",
    lineHeight: 18,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : undefined,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    paddingBottom: 5,
  },
  timeText: {
    fontSize: 12,
    color: "#9e9e9e",
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  circle: {
    width: 35,
    height: 35,
    borderRadius: 25,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
});
