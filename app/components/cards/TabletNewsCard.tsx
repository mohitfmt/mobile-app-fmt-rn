import React, {
  useContext,
  useState,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  Image,
  StyleSheet,
  useWindowDimensions,
  Share,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  htmlToPlainText,
  stripHtml,
  formatTimeAgoMalaysia,
} from "@/app/lib/utils";
import { useBookmarks } from "@/app/providers/BookmarkContext";
import { BookmarkIcon, ShareIcon } from "@/app/assets/AllSVGs";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { downloadImage, getArticleTextSize } from "../functions/Functions";

const TabletNewsCard = ({
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
  main = true,
  visited = false,
  dynamicLink,
  onPress,
}: {
  id: string;
  imageUri: string;
  heading: string;
  info: string;
  time: string;
  slug: string;
  posts: any;
  index: number;
  category: string;
  uri: string;
  main?: boolean;
  visited?: boolean;
  dynamicLink?: string;
  onPress?: () => void;
}) => {
  const { width } = useWindowDimensions();
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const router = useRouter();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();

  const [cachedImageUri, setCachedImageUri] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [showActualImage, setShowActualImage] = useState(false);
  const [currentImageUri, setCurrentImageUri] = useState(imageUri);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Reset when imageUri changes
  useLayoutEffect(() => {
    if (showActualImage && cachedImageUri && !imageError) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }
  }, [showActualImage, cachedImageUri, imageError]);

  // Cache image
  useEffect(() => {
    const cacheImage = async () => {
      if (!imageUri) return;

      try {
        const localUri = await downloadImage(imageUri);

        if (localUri) {
          setCachedImageUri(localUri);
          setShowActualImage(true);
        } else {
          console.warn(
            "Fallback to original URI or placeholder due to download failure."
          );
          setImageError(true);
        }
      } catch (err) {
        console.error("Image cache error:", err);
        setImageError(true);
      }
    };

    cacheImage();
  }, [imageUri]);

  // Fade in
  useLayoutEffect(() => {
    if (!cachedImageUri || imageError) return;

    const timer = setTimeout(() => {
      setShowActualImage(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 300);

    return () => clearTimeout(timer);
  }, [cachedImageUri, imageError]);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: "/components/mainCategory/SwipableArticle",
        params: {
          articleIndex: index.toString(),
          categoryName: category,
        },
      });
    }
  };

  const handleBookmarkToggle = () => {
    if (isBookmarked(id)) {
      removeBookmark(id);
    } else {
      addBookmark(id, { posts });
    }
  };

  const handleShare = () => {
    const plainTitle = htmlToPlainText(heading);
    const link =
      dynamicLink && dynamicLink.includes("landing") ? uri : dynamicLink || uri;
    const cleanExcerpt = stripHtml(info);

    Share.share({
      message: `${plainTitle}\n\n${cleanExcerpt}\n\nRead more: ${link}`,
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
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
        {/* Image with placeholder and fade-in */}
        <View style={styles.imageWrapper}>
          {!showActualImage && (
            <Image
              source={require("../../assets/images/placeholder.png")}
              style={styles.image}
              resizeMode="cover"
            />
          )}
          {showActualImage && cachedImageUri && (
            <Animated.Image
              source={{ uri: cachedImageUri }}
              style={[
                styles.image,
                styles.animatedImage,
                { opacity: fadeAnim },
              ]}
              resizeMode="cover"
            />
          )}
        </View>

        {/* Title and excerpt */}
        <View style={styles.textWrapper}>
          <Text
            numberOfLines={3}
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: 20,
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
              },
            ]}
          >
            {htmlToPlainText(heading)}
          </Text>

          <Text
            numberOfLines={3}
            style={[
              styles.excerpt,
              {
                fontSize: 15,
                color: "#6b6b6b",
                fontFamily:
                  Platform.OS === "android"
                    ? undefined
                    : "SF-Pro-Display-Medium",
              },
            ]}
          >
            {htmlToPlainText(info)}
          </Text>
        </View>
      </View>

      {/* Footer */}
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
            {`${time} by `}
          </Text>
          <Text
            style={{
              fontSize: getArticleTextSize(14, textSize),
              fontFamily:
                Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
              color: "#c62828",
            }}
          >
            {`${posts?.author?.node?.name || posts.author || "Unknown Author"}`}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={handleBookmarkToggle}>
            <BookmarkIcon
              size={25}
              color="#c62828"
              fill={isBookmarked(id) ? "#c62828" : "transparent"}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleShare} style={{ marginLeft: 12 }}>
            <ShareIcon size={25} color="#c62828" />
          </TouchableOpacity>
        </View>
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
  },
  row: {
    flexDirection: "row",
  },
  imageWrapper: {
    width: 400,
    height: 250,
    borderRadius: 6,
    overflow: "hidden",
    marginRight: 14,
    backgroundColor: "#eee",
    position: "relative",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 6,
  },
  animatedImage: {
    position: "absolute",
    top: 0,
    left: 0,
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
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeAuthorWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default TabletNewsCard;
