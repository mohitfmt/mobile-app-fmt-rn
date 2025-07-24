/**
 * NewsArticle.tsx
 *
 * This screen displays a news article with navigation, sharing, and bookmarking features.
 *
 * Features:
 * - Supports swiping between articles.
 * - Allows bookmarking articles for later reading.
 * - Enables sharing via native share functionality.
 * - Implements a sticky header with navigation controls.
 *
 * @author FMT Developers
 */

import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useContext,
} from "react";
import { View, FlatList, useWindowDimensions } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useBookmarks } from "../../providers/BookmarkContext";
import { Share } from "react-native";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { DataContext } from "@/app/providers/DataProvider";
import StickyHeader from "./StickyHeader";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import articleStyles from "@/app/css/articleCss";
import ArticleContent from "./MainArticle";

const NewsArticle: React.FC = () => {
  const params = useLocalSearchParams();
  const { theme } = React.useContext(ThemeContext);
  const { isBookmarked, addBookmark, removeBookmark } = useBookmarks();

  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState<number>(
    params.index ? parseInt(params.index as string) : 0
  );
  const flatListRef = useRef<FlatList<any>>(null);
  const { width } = useWindowDimensions();
  const { searchArticle, tagPosts, mainData } = useContext(DataContext);
  const insets = useSafeAreaInsets();

  // Load articles based on category
  useEffect(() => {
    if (params.category === "tag") {
      const tagName = params.tagName as string;
      setArticles(tagPosts[tagName] || []);
    } else if (params.category === "search") {
      setArticles(searchArticle || []);
    } else if (params.category === "main") {
      setArticles(mainData || []);
    } else {
      setArticles([]);
    }
    setLoading(false);
  }, [params.category, params.tagName, tagPosts, searchArticle, mainData]);

  // Handles page change when swiping
  const handlePageChange = (index: number) => {
    setCurrentIndex(index);
  };

  // Handles article sharing
  const handleShare = useCallback(async (article: any) => {
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
  }, []);

  // Handles bookmarking
  const handleBookmarkPress = useCallback(
    async (article: any) => {
      try {
        if (isBookmarked(article.id)) {
          await removeBookmark(article.id);
        } else {
          await addBookmark(article.id, {
            id: article.id,
            posts: article,
          });
        }
      } catch (error) {
        console.error("Error handling bookmark:", error);
      }
    },
    [isBookmarked, addBookmark, removeBookmark]
  );

  // Handle Prev/Next Buttons
  const handleNavigation = (direction: "prev" | "next") => {
    const newIndex = direction === "prev" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < articles.length) {
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex });
    }
  };

  // Renders individual articles
  const renderArticle = React.useCallback(
    ({
      item,
      width,
      theme,
      currentIndex,
      articles,
      handleNavigation,
      handleBookmarkPress,
      handleShare,
      router,
    }: any) => {
      return (
        <View style={[articleStyles.articleContainer, { width }]}>
          <ArticleContent
            item={item}
            width={width}
            currentIndex={currentIndex}
            articles={articles}
            handleNavigation={handleNavigation}
            router={router}
          />
        </View>
      );
    },
    []
  );

  // Show loading indicator while fetching data
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

  // Show loading if articles haven't loaded yet
  if (!articles || articles.length === 0) {
    return (
      <View
        style={[
          articleStyles.container,
          { backgroundColor: theme.backgroundColor },
        ]}
      >
        <StickyHeader article={null} />
        <View style={articleStyles.contentWrapper}>
          <LoadingIndicator />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        articleStyles.container,
        { backgroundColor: theme.backgroundColor, paddingTop: insets.top },
      ]}
    >
      <StickyHeader article={articles[currentIndex]} />
      <FlatList
        ref={flatListRef}
        data={articles}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        renderItem={({ item }) =>
          renderArticle({
            item,
            width,
            theme,
            currentIndex,
            articles,
            handleNavigation,
            handleBookmarkPress,
            handleShare,
            router,
          })
        }
        initialScrollIndex={currentIndex}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / width
          );
          handlePageChange(newIndex);
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        windowSize={5}
        initialNumToRender={2}
        maxToRenderPerBatch={5}
        updateCellsBatchingPeriod={40}
        removeClippedSubviews={true}
      />
    </View>
  );
};

export default NewsArticle;
