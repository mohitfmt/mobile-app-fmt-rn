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

import React, {
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  useEffect,
} from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  useWindowDimensions,
  Share,
  StyleSheet,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  downloadImage,
  getArticleTextSize,
  isImageCompletelyDownloaded,
} from "../functions/Functions";
import { useBookmarks } from "../../providers/BookmarkContext";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { SmallNewsCardProps } from "@/app/types/cards";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";
import { BookmarkIcon, ShareIcon } from "@/app/assets/AllSVGs";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";

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
  slug,
  posts,
  index,
  uri,
  main = false,
  tagName,
  visited = false,
}: SmallNewsCardProps) {
  const router = useRouter();
  const { theme, isOnline } = useContext(ThemeContext);
  const { width } = useWindowDimensions();
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();

  const [showActualImage, setShowActualImage] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState<string | null>(null);
  const [useLiveImage, setUseLiveImage] = useState(false);
  const { markAsVisited } = useVisitedArticles();

  // Reset states when imageUri changes (prevents showing cached image from another post)
  useEffect(() => {
    if (currentImageUri !== imageUri) {
      setShowActualImage(false);
      setCachedImageUri(null);
      setImageError(false);
      setUseLiveImage(false);
      fadeAnim.setValue(0);
      setCurrentImageUri(imageUri);
    }
  }, [imageUri, currentImageUri, fadeAnim]);

  // Fetch image online first and cache it
  useEffect(() => {
    let isMounted = true;

    const cacheImage = async () => {
      if (!imageUri || imageUri !== currentImageUri) return;

      try {
        if (isOnline) {
          // Try to get cached image first
          const cachedUri = await downloadImage(imageUri);

          if (isMounted && cachedUri && imageUri === currentImageUri) {
            // Check if cached image is completely downloaded
            const isComplete = await isImageCompletelyDownloaded(
              cachedUri,
              imageUri
            );

            if (isComplete) {
              // Use cached image if it's completely downloaded
              setCachedImageUri(cachedUri);
              setUseLiveImage(false);
            } else {
              // Use live image if cached is incomplete
              setCachedImageUri(imageUri);
              setUseLiveImage(true);
            }
          } else if (isMounted && imageUri === currentImageUri) {
            // Fallback to live image if no cached version
            setCachedImageUri(imageUri);
            setUseLiveImage(true);
          }
        } else {
          // Offline - try cached version only if it's complete
          const cachedUri = await downloadImage(imageUri);

          if (isMounted && cachedUri && imageUri === currentImageUri) {
            const isComplete = await isImageCompletelyDownloaded(
              cachedUri,
              imageUri
            );

            if (isComplete) {
              setCachedImageUri(cachedUri);
              setUseLiveImage(false);
            } else {
              // Show placeholder if cached image is incomplete and offline
              if (imageUri === currentImageUri) {
                setImageError(true);
              }
            }
          } else if (isMounted && imageUri === currentImageUri) {
            setImageError(true);
          }
        }
      } catch (error) {
        console.error("Error caching image:", error);
        if (isMounted && imageUri === currentImageUri) {
          if (isOnline) {
            // Try live image as fallback when online
            setCachedImageUri(imageUri);
            setUseLiveImage(true);
          } else {
            setImageError(true);
          }
        }
      }
    };

    if (currentImageUri) {
      cacheImage();
    }

    return () => {
      isMounted = false;
    };
  }, [imageUri, isOnline, currentImageUri]);

  // Apply fade-in animation for smoother UI
  useLayoutEffect(() => {
    if (!cachedImageUri || imageError) return;

    const timer = setTimeout(() => {
      // Only show image if this is still the current image
      if (imageUri === currentImageUri) {
        setShowActualImage(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }).start();
      }
    }, 300); // Reduced delay for better UX

    return () => clearTimeout(timer);
  }, [cachedImageUri, imageError, imageUri, currentImageUri, fadeAnim]);

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

  const shouldShowImage =
    showActualImage &&
    !imageError &&
    cachedImageUri &&
    imageUri === currentImageUri;

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
          {!shouldShowImage ? (
            <Image
              source={require("../../assets/images/placeholder.png")}
              style={styles.image}
              resizeMode="cover"
              resizeMethod="resize"
            />
          ) : (
            <Animated.Image
              source={{ uri: cachedImageUri }}
              style={[styles.image, { opacity: fadeAnim }]}
              resizeMode="cover"
              resizeMethod="resize"
              onError={() => {
                // Only set error if this is still the current image
                if (imageUri === currentImageUri) {
                  setImageError(true);
                  setShowActualImage(false);
                }
              }}
            />
          )}
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
  },
  info: {
    color: "#9e9e9e",
    lineHeight: 18,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
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
