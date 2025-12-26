/**
 * VideoCard.tsx
 *
 * Displays a video with a thumbnail, title, excerpt, timestamp, and share action.
 * Conditionally shows the excerpt based on standfirstEnabled setting.
 *
 * @author FMT Developers
 */

import { ShareIcon } from "@/app/assets/AllSVGs"; // Use ShareIcon instead of Share2
import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";
import { formatPostedTime, htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { VideoCardProps } from "@/app/types/cards";
import { router } from "expo-router";
import { Play } from "lucide-react-native";
import React, { memo, useContext } from "react";
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

function VideoCard({ item, visited, onPress }: VideoCardProps) {
  const { width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);

  // Handles Sharing the Video Link
  const handleShare = async () => {
    try {
      const mainHeading = stripHtml(item.title);

      await Share.share({
        message: `${mainHeading}\n\n${item.permalink || item.uri}`,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share video");
    }
  };

  // Navigate to in-app video player
  const navigateToVideo = () => {
    if (onPress) {
      onPress();
      return;
    }

    router.push({
      pathname: "/components/videos/VideoPlayer",
      params: {
        videoId: item.videoId,
        title: item.title,
        content: item.content || item.excerpt || "",
        date: item.date,
        permalink: item.permalink || item.uri,
        viewCount: item.statistics?.viewCount || item.viewCount || "0",
        durationSeconds: item.durationSeconds?.toString() || "0",
        duration: item.duration || "0:00",
        channelTitle: item.channelTitle || "FMT",
        tags:
          typeof item.tags === "string"
            ? item.tags
            : JSON.stringify(item.tags || []),
        statistics: JSON.stringify(item.statistics || {}),
        publishedAt: item.publishedAt || item.date || "",
      },
    });
  };

  return (
    <TouchableOpacity
      onPress={navigateToVideo}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
      className="border-b"
    >
      <View style={styles.contentContainer}>
        {/* Video Thumbnail */}
        <View style={styles.imageContainer}>
          <CloudflareImageComponent
            src={item.thumbnail}
            width={width - 32}
            height={(width - 32) * 0.5625}
            accessibilityLabel={item.title || "Video thumbnail"}
          />
          {/* Play Button Overlay */}
          <View style={styles.playButtonContainer}>
            <View style={styles.circle}>
              <Play size={30} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        </View>

        {/* Video Content */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: getArticleTextSize(18, textSize),
              },
            ]}
            numberOfLines={3}
          >
            {htmlToPlainText(item.title)}
          </Text>

          {standfirstEnabled && (item.content || item.excerpt) && (
            <Text
              numberOfLines={2}
              style={[
                styles.excerpt,
                { fontSize: getArticleTextSize(14, textSize) },
              ]}
            >
              {htmlToPlainText(item.content || item.excerpt || "")}
            </Text>
          )}

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              style={[
                styles.timeText,
                { fontSize: getArticleTextSize(14, textSize) },
              ]}
            >
              {formatPostedTime(item.date)}
            </Text>

            <View style={styles.actionButtons}>
              <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
                <ShareIcon size={20} color="#c62828" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 6,
    margin: 18,
    marginBottom: 0,
  },
  contentContainer: {
    padding: 0,
    paddingBottom: 0,
  },
  imageContainer: {
    borderRadius: 6,
    overflow: "hidden",
    height: 200,
    // backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: 200,
  },
  playButtonContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  textContainer: {
    marginTop: 10,
  },
  title: {
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Bold",
    fontWeight: Platform.OS === "android" ? "700" : "700",
  },
  excerpt: {
    lineHeight: 18,
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : "500",
    paddingTop: 10,
    color: "#9e9e9e",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
    marginTop: 10,
  },
  timeText: {
    color: "#9e9e9e",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
    marginLeft: 7,
  },
  circle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default memo(VideoCard);
