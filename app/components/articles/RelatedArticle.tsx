/**
 * RelatedArticle.tsx
 *
 * This component renders a related article card with an image, title, excerpt, timestamp, and share functionality.
 * It includes offline image caching, fade-in animations, and network connectivity detection.
 */

import React, { useContext, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Share,
  Platform,
  Alert,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { RelatedArticleProps } from "@/app/types/article";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { ShareIcon } from "../../assets/AllSVGs.js";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";

const RelatedArticle = ({
  id,
  onPress,
  image,
  title,
  subtitle,
  time,
  uri,
}: RelatedArticleProps) => {
  const { theme } = useContext(ThemeContext);
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
      Alert.alert("Error", "Failed to share article");
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: theme.backgroundColor,
          borderColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
      activeOpacity={0.85}
    >
      <View style={styles.row}>
        <View style={styles.imageContainer}>
          <CloudflareImageComponent
            src={image || ""}
            width={100}
            height={100}
            accessibilityLabel={title}
          />
        </View>

        <View
          style={[
            styles.contentContainer,
            { marginLeft: Platform.OS === "ios" ? -10 : 10 },
          ]}
        >
          <Text
            numberOfLines={3}
            style={[
              styles.heading,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Text-Bold",
                fontWeight: Platform.OS === "android" ? "700" : undefined,
                fontSize: getArticleTextSize(16, textSize),
              },
            ]}
          >
            {htmlToPlainText(title)}
          </Text>
          {standfirstEnabled && subtitle && (
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
              {htmlToPlainText(subtitle)}
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
          {" "}
          {time}{" "}
        </Text>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <ShareIcon size={25} color="#c62828" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 6,
    overflow: "hidden",
    paddingTop: 18,
    paddingRight: 18,
    paddingLeft: 18,
    paddingBottom: 0,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: "row",
  },
  imageContainer: {
    flex: 1,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 6,
  },
  contentContainer: {
    flex: 2,
  },
  heading: {
    marginBottom: 12,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
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
  iconButton: {
    padding: 8,
  },
});

export default RelatedArticle;
