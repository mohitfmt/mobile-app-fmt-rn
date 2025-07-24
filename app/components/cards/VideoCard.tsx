/**
 * VideoCard.tsx
 *
 * Displays a video with a thumbnail, title, excerpt, timestamp, and share action.
 * Conditionally shows the excerpt based on standfirstEnabled setting.
 *
 * @author FMT Developers
 */

import React, {
  useContext,
  memo,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import {
  View,
  Text,
  Animated,
  TouchableOpacity,
  Share,
  Alert,
  StyleSheet,
  useWindowDimensions,
  Linking,
  Image,
} from "react-native";
import { Play } from "lucide-react-native";
import { ShareIcon } from "@/app/assets/AllSVGs"; // Use ShareIcon instead of Share2
import { downloadImage, getArticleTextSize } from "../functions/Functions";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { VideoCardProps } from "@/app/types/cards";
import { htmlToPlainText, stripHtml } from "@/app/lib/utils";

function VideoCard({
  title,
  permalink,
  content,
  date,
  thumbnail,
  type,
}: VideoCardProps) {
  const { width } = useWindowDimensions();
  const { theme, isOnline } = useContext(ThemeContext);
  const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext); // Added standfirstEnabled
  const [showActualImage, setShowActualImage] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [cachedImageUri, setCachedImageUri] = useState<{
    [key: string]: string | null;
  }>({});
  const [imageError, setImageError] = useState(false);

  // Cache Image for Each Video Separately by `title`
  useEffect(() => {
    let isMounted = true;

    const cacheImage = async () => {
      if (!thumbnail || !title) return;
      try {
        const localUri = await downloadImage(thumbnail);
        if (isMounted) {
          setCachedImageUri((prev) => ({
            ...prev,
            [title]: localUri || thumbnail,
          }));
        }
      } catch (error) {
        console.error("Image cache error:", error);
        if (isMounted) setImageError(true);
      }
    };

    cacheImage();

    return () => {
      isMounted = false;
    };
  }, [thumbnail, title]);

  // Fade-in Animation for Image
  useLayoutEffect(() => {
    const timer = setTimeout(() => {
      setShowActualImage(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }).start();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  // Select Image Based on Connection - FIX: Access the specific cached URI for this video
  const selectedImageUri = isOnline
    ? thumbnail
    : cachedImageUri[title] ||
      require("../../assets/images/placeholder-dark.png");

  // Handles Sharing the Video Link
  const handleShare = async () => {
    try {
      const mainHeading = stripHtml(title);

      await Share.share({
        message: `${mainHeading}\n\n${permalink}`,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share video");
    }
  };

  // Opens Video Link in an External Browser
  const navigateToVideo = () => {
    Linking.openURL(permalink).catch((err) =>
      Alert.alert("Error", "Failed to open video")
    );
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
          {!showActualImage || imageError || !cachedImageUri[title] ? (
            <Image
              source={require("../../assets/images/placeholder-dark.png")}
              style={[styles.image]}
              resizeMode="cover"
              resizeMethod="resize"
            />
          ) : (
            <Animated.Image
              source={{ uri: selectedImageUri }}
              style={[styles.image, { opacity: fadeAnim }]}
              resizeMode="cover"
              resizeMethod="resize"
              onError={() => setImageError(true)}
            />
          )}
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
                color: theme.textColor,
                fontSize: getArticleTextSize(18, textSize),
              },
            ]}
            numberOfLines={3}
          >
            {htmlToPlainText(title)}
          </Text>

          {standfirstEnabled && content && (
            <Text
              numberOfLines={2}
              style={[
                styles.excerpt,
                { fontSize: getArticleTextSize(14, textSize) },
              ]}
            >
              {htmlToPlainText(content)}
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
              {date}
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
    fontWeight: "bold",
    fontFamily: "SF-Pro-Text-Bold",
  },
  excerpt: {
    lineHeight: 18,
    fontFamily: "SF-Pro-Display-Medium",
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
