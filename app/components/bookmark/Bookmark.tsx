// Bookmark.tsx
//
// This file defines the Bookmarks screen/component, which displays and manages the user's bookmarked articles.
// It loads bookmark data from mmkv, shows a list of bookmarks, and allows navigation to articles.
// The screen adapts to theme, text size, and device type (tablet/phone), and provides an empty state UI.
//
// Key responsibilities:
// - Load and display all bookmarked articles
// - Allow navigation to bookmarked articles
// - Show an empty state when there are no bookmarks
// - Adapt to theme, text size, and device type
//
// Usage: Render <Bookmarks /> as the bookmarks screen in the app.
//
// -----------------------------------------------------------------------------

import React, { useEffect, useState, useCallback, useContext } from "react";
import { View, Text, FlatList, TouchableOpacity, Platform } from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Bookmark, X } from "lucide-react-native";
import { storage } from "@/app/lib/storage";
import { getArticleTextSize } from "../functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { useBookmarks } from "../../providers/BookmarkContext";
import { DataContext } from "@/app/providers/DataProvider";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { BookmarkModel } from "@/app/types/bookmark";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import SmallNewsCard from "../cards/SmallNewsCard";
import { useWindowDimensions } from "react-native";
import TabletNewsCard from "../cards/TabletNewsCard";

export default function Bookmarks() {
  const { bookmarkedArticles } = useBookmarks();
  const [bookmarkData, setBookmarkData] = useState<(BookmarkModel | any)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const { setTagPosts, setMainData } = useContext(DataContext);
  const [showBottomBorder, setShowBottomBorder] = useState(false);
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const loadBookmarkData = useCallback(async () => {
    try {
      setError(null);

      // Early return if no bookmarked articles
      if (!bookmarkedArticles || bookmarkedArticles.length === 0) {
        setBookmarkData([]);
        setTagPosts([]);
        setIsLoading(false);
        return;
      }

      const bookmarkDetails = await Promise.all(
        bookmarkedArticles.map(async (id) => {
          try {
            const articleData = storage.getString(`article_${id}`);
            if (articleData) {
              const parsedData = JSON.parse(articleData);
              return {
                id: parsedData.id || id,
                posts: parsedData.posts || {},
              };
            }
            return null;
          } catch (parseError) {
            console.warn(
              `Failed to parse article data for id ${id}:`,
              parseError
            );
            return null;
          }
        })
      );

      const validBookmarks = bookmarkDetails
        .filter((bookmark): bookmark is BookmarkModel => bookmark !== null)
        .sort(
          (a, b) =>
            new Date(b.posts?.dateGmt || 0).getTime() -
            new Date(a.posts?.dateGmt || 0).getTime()
        );

      setBookmarkData(validBookmarks);
      setTagPosts(validBookmarks.map((b) => b.posts));
      setError(null);
    } catch (err) {
      setError("Failed to load bookmarks");
      console.error("Error loading bookmarks:", err);
      setBookmarkData([]);
      setTagPosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [bookmarkedArticles, setTagPosts]);

  useEffect(() => {
    // Add a small delay to prevent blocking the UI thread
    const timeoutId = setTimeout(() => {
      loadBookmarkData();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  const handleBackPress = useCallback(() => {
    router.back();
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: BookmarkModel | any; index: number }) => {
      if (!item) return null;

      const isWrappedInPosts = !!item.posts;
      const post = isWrappedInPosts ? item.posts : item;

      const handlePress = () => {
        try {
          setMainData(bookmarkData.map((b) => (b.posts ? b.posts : b)));
          router.push({
            pathname: "/components/articles/Article",
            params: {
              index: index.toString(),
              category: "main",
            },
          });
        } catch (error) {
          console.error("Error navigating to article:", error);
        }
      };

      const CardComponent = isTablet ? TabletNewsCard : SmallNewsCard;

      return (
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          style={{ backgroundColor: theme.backgroundColor }}
        >
          <CardComponent
            id={item.id || post.id}
            imageUri={
              post.featuredImage?.node?.sourceUrl || post.thumbnail || ""
            }
            heading={post.title || ""}
            info={post.excerpt || ""}
            time={formatTimeAgoMalaysia(post.dateGmt || post.date)}
            category={post.featuredCategory || "Malaysia"}
            slug={post.slug || ""}
            index={index}
            posts={post}
            uri={post.permalink || post.uri || ""}
            main={true}
            onPress={handlePress} // Pass the onPress handler from HomeLandingSection
          />
        </TouchableOpacity>
      );
    },
    [bookmarkData, setMainData]
  );

  const EmptyComponent = useCallback(
    () => (
      <View
        className="flex-1 items-center justify-center px-16 pt-0"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        {/* Heading */}
        <Text
          className="text-center"
          style={{
            fontFamily:
              Platform.OS === "android" ? undefined : "SF-Pro-Text-Bold",
            fontWeight: Platform.OS === "android" ? "700" : undefined,
            color: theme.textColor,
            fontSize: getArticleTextSize(28.0, textSize),
            marginBottom: 0,
          }}
        >
          No Bookmarks
        </Text>

        {/* Sub Text - fixed width for clean wrapping */}
        <View style={{ width: 220, alignItems: "center" }}>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <Text
              style={{
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
                fontWeight: Platform.OS === "android" ? "400" : undefined,
                fontSize: 16,
                lineHeight: 22,
                color: "#6c6c6c",
              }}
            >
              Tap on
            </Text>
            <Bookmark
              size={22}
              color="#c62828"
              style={{ marginHorizontal: 2 }}
            />
            <Text
              style={{
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
                fontWeight: Platform.OS === "android" ? "400" : undefined,
                fontSize: 16,
                lineHeight: 22,
                color: "#6c6c6c",
              }}
            >
              when you see an
            </Text>
            <Text
              style={{
                fontFamily:
                  Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
                fontWeight: Platform.OS === "android" ? "400" : undefined,
                fontSize: 16,
                lineHeight: 22,
                color: "#6c6c6c",
              }}
            >
              article you want to bookmark
            </Text>
          </View>
        </View>
      </View>
    ),
    [theme.backgroundColor, theme.textColor, textSize]
  );

  const handleScroll = useCallback((e: any) => {
    const offsetY = e.nativeEvent.contentOffset.y;
    setShowBottomBorder(offsetY > 10);
  }, []);

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1"
        style={{ backgroundColor: theme.backgroundColor }}
      >
        <View
          className="flex-1 items-center justify-center"
          style={{ backgroundColor: theme.backgroundColor }}
        >
          <LoadingIndicator />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: theme.backgroundColor }}
    >
      {/* Header with dynamic bottom border */}
      <View
        className="flex-row items-center justify-between px-4 py-2"
        style={{
          backgroundColor: theme.backgroundColor,

          // Bottom border line (more visible than shadow)
          borderBottomWidth: showBottomBorder ? 1 : 0,
          borderBottomColor:
            theme.textColor === "#000000" ? "#e0e0e0" : "#333333",

          // Shadow (iOS) - keeping this for additional depth
          shadowColor: "#000",
          shadowOffset: { width: 0, height: showBottomBorder ? 2 : 0 },
          shadowOpacity: showBottomBorder ? 0.1 : 0,
          shadowRadius: showBottomBorder ? 2 : 0,

          // Shadow (Android)
          marginHorizontal: isTablet ? 10 : 0,
        }}
      >
        <TouchableOpacity
          onPress={handleBackPress}
          className="p-2 pt-1 rounded-full active:bg-gray-100"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={24} color="#c62828" />
        </TouchableOpacity>
        <Text
          style={{
            fontFamily:
              Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
            fontWeight: Platform.OS === "android" ? "900" : undefined,
            color: theme.textColor,
            fontSize: getArticleTextSize(24, textSize),
          }}
        >
          BOOKMARKS
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {error && (
        <View className="p-4 bg-red-50">
          <Text className="text-red-800">{error}</Text>
        </View>
      )}

      <View
        style={{
          flex: 1,
          backgroundColor:
            theme.backgroundColor === "#000000"
              ? "#111111"
              : theme.backgroundColor,
        }}
      >
        <FlatList
          data={bookmarkData}
          renderItem={renderItem}
          keyExtractor={(item, index) =>
            item?.id || (item?.posts ? item.posts.id : `bookmark-${index}`)
          }
          ListEmptyComponent={EmptyComponent}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            bookmarkData.length === 0 ? { flex: 1 } : { paddingBottom: 20 }
          }
          onScroll={handleScroll}
          scrollEventThrottle={16}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          className="flex-1"
        />
      </View>
    </SafeAreaView>
  );
}
