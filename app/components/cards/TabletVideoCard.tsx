/**
 * TabletVideoCard.tsx
 *
 * Tablet version of VideoCard with horizontal layout similar to TabletNewsCard.
 * Displays a video with thumbnail, play button overlay, title, excerpt, timestamp, and share action.
 * Conditionally shows the excerpt based on standfirstEnabled setting.
 *
 */

import { ShareIcon } from "@/app/assets/AllSVGs";
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
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

function TabletVideoCard({ item, visited, onPress }: VideoCardProps) {
  const { theme, isOnline } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);

  // Handles Sharing the Video Link
  const handleShare = async () => {
    try {
      const mainHeading = stripHtml(item.title);
      const cleanExcerpt =
        item.content || item.excerpt
          ? stripHtml(item.content || item.excerpt)
          : "";
      const shareMessage = cleanExcerpt
        ? `${mainHeading}\n\n${cleanExcerpt}\n\nWatch: ${
            item.permalink || item.uri
          }`
        : `${mainHeading}\n\nWatch: ${item.permalink || item.uri}`;

      await Share.share({
        message: shareMessage,
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
      activeOpacity={0.9}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderBottomColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
    >
      <View style={styles.row}>
        {/* Left: Video Thumbnail with Play Button */}
        <View style={styles.imageContainer}>
          <CloudflareImageComponent
            src={item.thumbnail}
            width={400}
            height={250}
            accessibilityLabel={item.title || "Video thumbnail"}
          />
          {/* Play Button Overlay */}
          <View style={styles.playButtonContainer}>
            <View style={styles.circle}>
              <Play size={30} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
        </View>

        {/* Right: Video Content */}
        <View style={styles.textWrapper}>
          <Text
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: 20,
                fontWeight: "700",
              },
            ]}
            numberOfLines={3}
          >
            {htmlToPlainText(item.title)}
          </Text>

          {standfirstEnabled && (item.content || item.excerpt) && (
            <Text
              numberOfLines={3}
              style={[
                styles.excerpt,
                {
                  fontSize: 15,
                  color: "#6b6b6b",
                  fontWeight: "500",
                },
              ]}
            >
              {htmlToPlainText(item.content || item.excerpt || "")}
            </Text>
          )}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.timeWrapper}>
          <Text
            style={[
              styles.timeText,
              {
                fontSize: getArticleTextSize(14, textSize),
                color: "#9e9e9e",
                fontWeight: "400",
              },
            ]}
          >
            {formatPostedTime(item.date)}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
            <ShareIcon size={25} color="#c62828" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginVertical: 12,
    padding: 14,
    borderRadius: 8,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
  },
  imageContainer: {
    width: 400,
    height: 250,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 14,
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  actualImage: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
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
  circle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  textWrapper: {
    flex: 1,
  },
  title: {
    lineHeight: 26,
  },
  excerpt: {
    marginTop: 10,
    lineHeight: 20,
  },
  footer: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    color: "#999",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
});

export default memo(TabletVideoCard);
