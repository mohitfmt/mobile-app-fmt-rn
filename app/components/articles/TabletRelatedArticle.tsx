// TabletRelatedArticle.tsx
//
// This file defines the TabletRelatedArticle component, which displays a related article card
// optimized for tablet layouts. It shows the article image, title, subtitle, time, and share button.
// The component adapts to theme, text size, and visited state, and supports image caching.
//
// Key responsibilities:
// - Display related article info in a card layout for tablets
// - Show article image, title, subtitle, and time
// - Indicate if the article has been visited
// - Allow sharing the article
// - Support image caching and fade-in animation
//
// Usage: Render <TabletRelatedArticle {...props} /> in related articles sections on tablet screens.
//
// -----------------------------------------------------------------------------

import { ShareIcon } from "@/app/assets/AllSVGs";
import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { RelatedArticleProps } from "@/app/types/article";
import React, { useContext, useEffect, useState } from "react";
import {
  Platform,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

// TabletRelatedArticle: Main component for displaying a related article card on tablets.
// - Uses theme, global settings, and visited articles context
// - Handles image caching and fade-in
// - Handles share action
const TabletRelatedArticle = ({
  id,
  image,
  title,
  subtitle,
  time,
  uri,
  onPress,
  author,
}: RelatedArticleProps) => {
  const { theme, isOnline } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);
  const { isVisited } = useVisitedArticles();
  const [visited, setVisited] = useState(false);

  useEffect(() => {
    if (id) {
      setVisited(isVisited(id));
    }
  }, [id, isVisited]);

  const handleShare = async () => {
    try {
      const cleanContent = stripHtml(subtitle);
      const fullUri = uri.includes("freemalaysiatoday.com")
        ? uri
        : `https://www.freemalaysiatoday.com${uri}`;
      await Share.share({
        message: `${stripHtml(
          title
        )}\n\n${cleanContent}\n\nRead more: ${fullUri}`,
        title: title,
      });
    } catch (error) {
      console.error("Failed to share article");
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
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
        <CloudflareImageComponent
          src={image || ""}
          width={400}
          height={250}
          accessibilityLabel={title}
        />
        <View style={styles.textWrapper}>
          <Text
            numberOfLines={3}
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: 20,
                // fontFamily:
                //   Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
                fontWeight: Platform.OS === "android" ? "700" : "700",
              },
            ]}
          >
            {htmlToPlainText(title)}{" "}
          </Text>

          {standfirstEnabled && subtitle && (
            <Text
              numberOfLines={3}
              style={[
                styles.excerpt,
                {
                  fontSize: 15,
                  color: "#6b6b6b",
                  // fontFamily:
                  //   Platform.OS === "android"
                  //     ? undefined
                  //     : "SF-Pro-Display-Medium",
                  fontWeight: Platform.OS === "android" ? "500" : "500",
                },
              ]}
            >
              {htmlToPlainText(subtitle)}{" "}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.footer}>
        <View style={styles.timeAuthorWrapper}>
          <Text
            style={[
              styles.timeText,
              {
                fontSize: getArticleTextSize(14, textSize),
                color: "#9e9e9e",
              },
            ]}
          >
            {" "}
            {time}{" "}
          </Text>
        </View>
        <TouchableOpacity onPress={handleShare}>
          <ShareIcon size={25} color="#c62828" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 18,
    marginVertical: 12,
    padding: 14,
    borderRadius: 8,
    borderBottomWidth: 1,
    // borderColor: "#eaeaea",
  },
  row: {
    flexDirection: "row",
  },
  image: {
    width: 400,
    height: 250,
    borderRadius: 6,
    backgroundColor: "#eee",
    marginRight: 14,
  },
  textWrapper: {
    flex: 1,
    paddingLeft: 12,
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
  timeText: {
    color: "#999",
    // fontFamily:
    //   Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : "400",
  },
  timeAuthorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default TabletRelatedArticle;
