/**
 * NetworkArticle.tsx
 *
 * This component fetches and displays an article dynamically.
 * It supports bookmarking, sharing, and smooth navigation.
 *
 * Features:
 * - Fetches article data using GraphQL queries.
 * - Allows bookmarking and sharing of articles.
 * - Displays article content with theme-based styling.
 * - Handles loading states and errors gracefully.
 *
 * @author FMT Developers
 */

import React, { useState, useEffect, useCallback, useContext } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  Image,
  useWindowDimensions,
  Platform,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Bookmark, ChevronLeft, Share2 } from "lucide-react-native";
import { useBookmarks } from "../../providers/BookmarkContext";
import { Share } from "react-native";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { formatTimeAgo } from "@/app/lib/utils";
import { getPostData } from "@/app/lib/gql-queries/get-post-data";
import { fetchRelatedPosts } from "../functions/Functions";
import StickyHeader from "./StickyHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated from "react-native-reanimated";
import { Refresh } from "@/app/assets/AllSVGs";
import articleStyles from "@/app/css/articleCss";
import ArticleContent from "./MainArticle";

const NetworkArticle: React.FC = () => {
  const params = useLocalSearchParams();
  const { theme } = useContext(ThemeContext);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();
  const { width } = useWindowDimensions();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // console.log(params.date, params.slug);
  const [relatedPosts, setRelatedPosts] = useState<any[]>([]);

  // Fetch article based on slug
  const loadArticle = useCallback(async () => {
    try {
      setLoading(true);
      if (!params.slug) throw new Error("No slug provided");

      const fetchedArticle = await getPostData(params.slug as string);

      if (fetchedArticle?.post) {
        // ⬇️ Use your function here
        const postWithRelated = await fetchRelatedPosts([fetchedArticle.post]);

        const finalPost = {
          ...postWithRelated[0],
          relatedPosts: postWithRelated[0]?.relatedPosts || [],
        };

        setArticle(finalPost);
      } else {
        console.error("Invalid article data:", fetchedArticle);
      }
    } catch (error) {
      console.error("Failed to load article:", error);
    } finally {
      setLoading(false);
    }
  }, [params.slug]);

  useEffect(() => {
    loadArticle();
  }, [loadArticle]);

  // Share article link
  const handleShare = useCallback(
    async (article: any) => {
      try {
        const fullUri = article.uri.includes("freemalaysiatoday.com")
          ? article.uri
          : `https://www.freemalaysiatoday.com${article.uri}`;

        await Share.share({
          message: `${article.title}\n\nRead more at: ${fullUri}`,
        });
      } catch (error) {
        console.error("Error sharing article:", error);
      }
    },
    [article]
  );

  // Handle bookmark toggling
  const handleBookmarkPress = useCallback(
    async (article: any) => {
      try {
        const key = article.uri || article.permalink;
        if (isBookmarked(key)) {
          await removeBookmark(key);
        } else {
          await addBookmark(key, {
            id: key,
            posts: article,
          });
        }
      } catch (error) {
        console.error("Error handling bookmark:", error);
      }
    },
    [article, isBookmarked, addBookmark, removeBookmark]
  );

  // Show loading indicator while fetching article
  if (loading) {
    return (
      <View
        style={[
          articleStyles.container,
          { backgroundColor: theme.backgroundColor },
        ]}
      >
        <View style={articleStyles.contentWrapper}>
          <LoadingIndicator />
        </View>
      </View>
    );
  }

  // Show error message if article fails to load
  if (!article) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        {/* Error Body */}
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textColor }]}>
            Failed to load the article.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: "#DC2626" }]}
            onPress={loadArticle}
          >
            <Text style={styles.refreshButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={[
        articleStyles.container,
        { backgroundColor: theme.backgroundColor, paddingTop: insets.top },
      ]}
    >
      {/* Header */}
      <StickyHeader article={article} />

      {/* Article Content */}
      <ArticleContent
        item={article}
        width={width}
        theme={theme}
        currentIndex={0}
        articles={[article]} // Single article wrapped in array
        handleNavigation={() => {}} // Navigation not needed for single article
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: Platform.OS === "ios" ? 12 : 8,
  },
  backButton: {
    padding: 8,
  },
  iconContainer: {
    padding: 8,
  },
  relatedTitle: {
    fontFamily: "SF-Pro-Display-Black",
    textAlign: "center",
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
    fontFamily: "SF-Pro-Display-Regular",
  },
  refreshButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
    fontFamily: "SF-Pro-Display-Regular",
  },
});

export default NetworkArticle;
