// StickyHeader.tsx
//
// This file defines the StickyHeader component, which is used as a sticky header for article screens.
// It provides navigation (back), bookmarking, and sharing functionality, and displays the app logo.
// The header adapts to theme and device type (tablet/phone) and integrates with the app's providers.
//
// Key responsibilities:
// - Provide a back button for navigation
// - Allow users to bookmark/unbookmark the article
// - Allow users to share the article via the system share dialog
// - Display the app logo in the header
// - Adapt to theme and device width (tablet/phone)
//
// Usage: Render <StickyHeader article={article} /> at the top of an article screen.
//
// -----------------------------------------------------------------------------

import React, { useCallback, useContext } from "react";
import {
  View,
  TouchableOpacity,
  Image,
  Platform,
  Share,
  Alert,
  Dimensions,
  useWindowDimensions,
} from "react-native";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useBookmarks } from "@/app/providers/BookmarkContext";
import { BookmarkIcon, ShareIcon } from "@/app/assets/AllSVGs";
import articleStyles from "@/app/css/articleCss";
import { stripHtml } from "@/app/lib/utils";

// StickyHeaderProps: Props for the StickyHeader component (expects an article object).
interface StickyHeaderProps {
  article: any;
}

// StickyHeader: Main component for the sticky article header.
// - Uses theme, bookmarks, and navigation context
// - Handles bookmark and share actions
// - Renders back button, logo, and action icons
const StickyHeader: React.FC<StickyHeaderProps> = ({ article }) => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { width } = useWindowDimensions(); // ✅ This updates when orientation changes
  const isTablet = width >= 600;

  // handleBookmarkPress: Toggles bookmark state for the article.
  const handleBookmarkPress = async () => {
    try {
      if (article?.id) {
        if (isBookmarked(article.id)) {
          await removeBookmark(article.id);
        } else {
          await addBookmark(article.id, {
            id: article.id,
            posts: article,
          });
        }
      }
    } catch (error) {
      console.error("StickyHeader Bookmark Error:", error);
    }
  };

  // handleShare: Shares the article using the system share dialog.
  const handleShare = useCallback(async (article: any) => {
    try {
      const cleanContent = stripHtml(article.excerpt || "");
      const uri = article.uri || article.permalink;
      const fullUri = uri?.includes("freemalaysiatoday.com")
        ? uri
        : `https://www.freemalaysiatoday.com${uri}`;

      const mainHeading = stripHtml(article.title || "");

      setTimeout(async () => {
        await Share.share({
          message: `${mainHeading}\n\n${cleanContent}\n\nRead more: ${fullUri}`,
          title: mainHeading,
        });
      }, 100);
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Sharing not available right now. Try again later.");
    }
  }, []);

  // Render: Header layout with back button, logo, bookmark, and share icons.
  return (
    <View
      style={[
        articleStyles.headerContainer,
        {
          backgroundColor: theme.backgroundColor,
          marginLeft: isTablet ? -10 : 0,
        },
      ]}
    >
      <View
        className="flex-row items-center justify-between pt-4"
        style={{ paddingVertical: 18, paddingHorizontal: 18 }}
      >
        <View style={{ zIndex: 10 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
          >
            {Platform.OS === "ios" ? (
              <ChevronLeft size={34} color="#DC2626" />
            ) : (
              <ArrowLeft size={24} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>

        <View style={articleStyles.logoContainer}>
          <Image
            source={require("../../assets/images/logofmt.png")}
            style={articleStyles.logo}
          />
        </View>

        <View className="flex-row">
          <TouchableOpacity
            className="ml-4 mr-3"
            onPress={handleBookmarkPress}
            activeOpacity={0.7}
          >
            <BookmarkIcon
              size={24}
              color="#c42b23"
              fill={
                article && isBookmarked(article.id) ? "#DC2626" : "transparent"
              }
            />
          </TouchableOpacity>
          <TouchableOpacity
            className="ml-4"
            onPress={() => article && handleShare(article)}
          >
            <ShareIcon size={24} color="#c42b23" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default StickyHeader;
