/**
 * SmallNewsCard.tsx
 *
 * This component renders a small news card displaying:
 * - A title, image, excerpt, and timestamp.
 * - Bookmark and share functionalities.
 * - Offline image caching for better performance.
 * - A fade-in animation for smoother UI transitions.
 * - Network detection to determine online/offline image loading.
 * - Shows live image if cached image is incomplete when online, otherwise shows placeholder.
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
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { getArticleTextSize } from "../functions/Functions";
import { useBookmarks } from "../../providers/BookmarkContext";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { SmallNewsCardProps } from "@/app/types/cards";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { BookmarkIcon, ShareIcon } from "@/app/assets/AllSVGs";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";

/**
 * SmallNewsCard component
 *
 * Renders a news card with a thumbnail, title, excerpt, timestamp, and share/bookmark actions.
 */
export default function SmallNewsCard({
  id,
  imageUri,
  heading,
  info,
  time,
  category,
  posts,
  index,
  uri,
  main = false,
  tagName,
  visited = false,
}: SmallNewsCardProps) {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();

  const { markAsVisited } = useVisitedArticles();

  // Navigate to full article and mark as visited
  const handlePress = () => {
    if (id) {
      markAsVisited(id);
    }
    router.push({
      pathname: "/components/articles/Article",
      params: {
        index: index,
        category: category,
        tagName: tagName,
      },
    });
  };

  // Handles sharing the article
  const handleShare = async () => {
    try {
      // Add small delay on iOS for native module initialization
      if (Platform.OS === "ios") {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      const cleanContent = stripHtml(info);
      const fullUri = uri.includes("freemalaysiatoday.com")
        ? uri
        : `https://www.freemalaysiatoday.com${uri}`;
      const mainHeading = stripHtml(heading);

      const result = await Share.share({
        message: `${mainHeading}\n\n${cleanContent}\n\nRead more: ${fullUri}`,
        title: mainHeading,
      });

      // Handle iOS-specific result
      if (Platform.OS === "ios" && result.action === Share.dismissedAction) {
        // console.log('Share dismissed');
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share article");
    }
  };

  // Handles adding/removing bookmarks
  const handleBookmarkPress = async () => {
    try {
      if (isBookmarked(id)) {
        await removeBookmark(id);
      } else {
        await addBookmark(id, { id, posts });
      }
    } catch (error) {
      console.error("Error handling bookmark:", error);
    }
  };

  const CardContent = (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundColor,
          borderBottomColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.imageContainer}>
          <CloudflareImageComponent
            src={imageUri}
            width={100}
            height={75}
            priority={index < 3}
            accessibilityLabel={heading}
          />
        </View>

        <View style={[styles.contentContainer, { marginLeft: 10 }]}>
          <Text
            numberOfLines={3}
            style={[
              styles.heading,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
                fontWeight: Platform.OS === "android" ? "700" : undefined,
                fontSize: getArticleTextSize(16, textSize),
              },
            ]}
          >
            {htmlToPlainText(heading)}
          </Text>
          {standfirstEnabled && info && (
            <Text
              numberOfLines={3}
              style={[
                styles.info,
                {
                  color: "#9e9e9e",
                  fontSize: getArticleTextSize(14, textSize),
                },
              ]}
            >
              {htmlToPlainText(info)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text
          style={[
            styles.timeText,
            { fontSize: getArticleTextSize(14, textSize) },
          ]}
        >
          {time}
        </Text>
        <View style={styles.iconRow}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleBookmarkPress}
            activeOpacity={0.7}
          >
            <BookmarkIcon
              size={25}
              color="#c62828"
              fill={isBookmarked(id) ? "#c62828" : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleShare}
            activeOpacity={0.7}
          >
            <ShareIcon size={25} color="#c62828" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return main ? (
    CardContent
  ) : (
    <TouchableOpacity onPress={handlePress} activeOpacity={0}>
      {CardContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    overflow: "hidden",
    marginTop: 18,
    marginRight: 18,
    marginLeft: 18,
    marginBottom: 0,
    borderBottomWidth: 1,
  },

  row: {
    flexDirection: "row",
    display: "flex",
  },
  imageContainer: {
    display: "flex",
    marginRight: 10,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  contentContainer: {
    display: "flex",
    marginTop: 0,
    flex: 2,
    marginLeft: 0,
  },
  heading: {
    marginBottom: 12,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    paddingBottom: 6,
  },
  timeText: {
    color: "#9e9e9e",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : undefined,
  },
  info: {
    color: "#9e9e9e",
    lineHeight: 18,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : undefined,
  },
  iconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  placeholderContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#e2e2e2",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
});
