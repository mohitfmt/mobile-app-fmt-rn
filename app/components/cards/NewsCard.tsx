/**
 * NewsCard.tsx
 *
 * This component displays a news card(large top news card) with a title, image, excerpt, timestamp, and action buttons (bookmark & share).
 * It includes offline image caching, fade-in animations, and network connectivity detection.
 *
 * Features:
 * - Displays news details dynamically.
 * - Uses cached images for offline viewing.
 * - Implements a fade-in animation for a smoother UI experience.
 * - Allows users to bookmark and share articles.
 * - Detects internet connectivity to determine whether to load online or cached images.
 * - Conditionally displays excerpt based on standfirstEnabled setting.
 *
 * @author FMT Developers
 */

import React, {
  useContext,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Share,
  Alert,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useBookmarks } from "../../providers/BookmarkContext";
import { downloadImage, getArticleTextSize } from "../functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { NewsCardProps } from "@/app/types/cards";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { BookmarkIcon, ShareIcon } from "@/app/assets/AllSVGs";

/**
 * NewsCard component
 *
 * Displays a news article with an image, title, excerpt, and bookmark/share buttons.
 */
function NewsCard({
  id,
  imageUri,
  heading,
  info,
  time,
  slug,
  posts,
  index,
  category,
  uri,
  main = false,
  visited = false,
}: NewsCardProps) {
  const { width } = useWindowDimensions();
  const router = useRouter();
  const { theme, isOnline } = useContext(ThemeContext);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);

  const imageWidth = width * 0.9 + (Platform.OS === "ios" ? 6 : 0);
  const imageHeight = imageWidth * (10 / 16);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showActualImage, setShowActualImage] = useState(false);
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Fetch online first and save image locally
  useEffect(() => {
    let isMounted = true;

    const cacheImage = async () => {
      if (!imageUri) return;

      try {
        if (isOnline) {
          // Try to pre-cache, but don't display until verified
          const localUri = await downloadImage(imageUri);

          if (isMounted && localUri) {
            setCachedImageUri(localUri);
            setShowActualImage(true); // Now it's safe to show
          } else if (isMounted) {
            // Fallback to live image only if download failed
            setCachedImageUri(imageUri);
            setShowActualImage(true);
          }
        } else {
          // Offline - try cached version
          const localUri = await downloadImage(imageUri);
          if (isMounted && localUri) {
            setCachedImageUri(localUri);
            setShowActualImage(true);
          } else if (isMounted) {
            setImageError(true);
          }
        }
      } catch (error) {
        console.error("Error caching image:", error);
        if (isMounted) {
          setImageError(true);
        }
      }
    };

    cacheImage();

    return () => {
      isMounted = false;
    };
  }, [imageUri, isOnline]);

  // Animation for Image Loading
  useLayoutEffect(() => {
    if (showActualImage) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }
  }, [showActualImage]);

  // Handles adding/removing bookmarks
  const handleBookmarkPress = async () => {
    try {
      if (isBookmarked(id)) {
        await removeBookmark(id);
      } else {
        await addBookmark(id, { posts });
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update bookmark");
    }
  };

  // Handles sharing the article
  const handleShare = async () => {
    try {
      const cleanContent = stripHtml(info);
      const fullUri = uri.includes("freemalaysiatoday.com")
        ? uri
        : `https://www.freemalaysiatoday.com${uri}`;

      const mainHeading = stripHtml(heading);

      await Share.share({
        message: `${mainHeading}\n\n${cleanContent}\n\nRead more: ${fullUri}`,
        title: mainHeading,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share article");
    }
  };

  // Navigates to the full article
  const navigateToArticle = () => {
    router.push({
      pathname: "/components/articles/Article",
      params: {
        index: index,
        category: category,
      },
    });
  };

  const CardContent = (
    <View style={styles.contentContainer}>
      <View style={styles.imageContainer}>
        {!showActualImage || imageError ? (
          <Image
            source={require("../../assets/images/placeholder.png")}
            style={styles.image}
            resizeMode="cover"
            resizeMethod="resize"
          />
        ) : (
          <Animated.Image
            source={{ uri: cachedImageUri || imageUri }}
            style={[styles.image, { opacity: fadeAnim }]}
            resizeMode="cover"
            resizeMethod="resize"
          />
        )}
      </View>

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
          {htmlToPlainText(heading)}
        </Text>

        {standfirstEnabled && info && (
          <Text
            numberOfLines={3}
            style={[
              styles.excerpt,
              { color: "#9e9e9e", fontSize: getArticleTextSize(14, textSize) },
            ]}
          >
            {htmlToPlainText(info)}
          </Text>
        )}

        <View style={styles.footer}>
          <Text
            style={[
              styles.timeText,
              { fontSize: getArticleTextSize(14, textSize), color: "#9e9e9e" },
            ]}
          >
            {time}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={handleBookmarkPress}
              style={styles.iconButton}
            >
              <BookmarkIcon
                size={25}
                color="#c42b23"
                fill={isBookmarked(id) ? "#c42b23" : "transparent"}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleShare} style={styles.iconButton}>
              <ShareIcon size={25} color="#c42b23" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return main ? (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
    >
      {CardContent}
    </View>
  ) : (
    <TouchableOpacity
      onPress={navigateToArticle}
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
      activeOpacity={0}
    >
      {CardContent}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    margin: 18,
    marginBottom: 0,
  },
  contentContainer: {
    paddingBottom: 0,
  },
  imageContainer: {
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
    height: 200,
  },
  image: {
    width: "100%",
    height: 200,
  },
  placeholderContainer: {
    width: "100%",
    height: 200,
    backgroundColor: "#e2e2e2",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
  },
  placeholderText: {
    color: "#9e9e9e",
  },
  textContainer: {},
  title: {
    fontFamily: "SF-Pro-Display-Bold",
    paddingTop: 6,
  },
  excerpt: {
    lineHeight: 18,
    fontFamily: "SF-Pro-Display-Medium",
    paddingTop: 10,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 5,
    marginTop: 10,
  },
  timeText: {
    fontFamily: "SF-Pro-Display-Medium",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    padding: 8,
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
    marginTop: 10,
  },
});

export default NewsCard;
