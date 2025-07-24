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

import React, { useContext, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Share,
  Animated,
} from "react-native";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { downloadImage, getArticleTextSize } from "../functions/Functions";
import { ShareIcon } from "@/app/assets/AllSVGs";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { RelatedArticleProps } from "@/app/types/article";

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
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (id) {
      setVisited(isVisited(id));
    }
  }, [id, isVisited]);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      if (!image) return;
      if (isOnline) {
        setCachedImageUri(image);
        const localUri = await downloadImage(image);
        if (localUri && isMounted) setCachedImageUri(localUri);
      } else {
        const localUri = await downloadImage(image);
        if (localUri && isMounted) setCachedImageUri(localUri);
      }
    };
    fetchImage();
    return () => {
      isMounted = false;
    };
  }, [image, isOnline]);

  useEffect(() => {
    if (imageLoaded) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }
  }, [imageLoaded]);

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
        <Animated.Image
          source={
            cachedImageUri
              ? { uri: cachedImageUri }
              : require("../../assets/images/placeholder.png")
          }
          style={[styles.image, { opacity: fadeAnim }]}
          resizeMode="cover"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
        />
        <View style={styles.textWrapper}>
          <Text
            numberOfLines={3}
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: 20,
                fontFamily: "SF-Pro-Display-Bold",
              },
            ]}
          >
            {" "}
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
                  fontFamily: "SF-Pro-Display-Medium",
                },
              ]}
            >
              {" "}
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
    fontFamily: "SF-Pro-Display-Regular",
  },
  timeAuthorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default TabletRelatedArticle;
