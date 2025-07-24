// SwipableArticle.tsx
//
// This file defines the SwipeableArticleView component, which displays articles in a horizontally swipeable view.
// It allows users to swipe between articles, adapts to device width and theme, and integrates with the main data context.
//
// Key responsibilities:
// - Display articles in a horizontally swipeable FlatList
// - Allow navigation between articles by swiping
// - Adapt to device width and theme
// - Integrate with main data context for article data
//
// Usage: Render <SwipeableArticleView /> as the article detail view with swipe navigation.
//
// -----------------------------------------------------------------------------

import React, {
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  useWindowDimensions, 
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import StickyHeader from "../articles/StickyHeader";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DataContext } from "@/app/providers/DataProvider";
import ArticleContent from "../articles/MainArticle";

const SwipeableArticleView = () => {
  const flatListRef = useRef<FlatList>(null);
  const { articleIndex, categoryName } = useLocalSearchParams();
  const { mainData } = useContext(DataContext);
  const { theme } = useContext(ThemeContext);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(); // ✅ Use dynamic width that updates on orientation change

  const rawArticles = useMemo(() => {
    return mainData.filter((item: any) => {
      const isMetaType = [
        "AD_ITEM",
        "MORE_ITEM",
        "CARD_TITLE",
        "LOADING_ITEM",
      ].includes(item.type);
      const isVideoType = item.type?.toLowerCase?.().includes("video");
      const isYouTubeLink = item.permalink?.includes?.("youtube.com");

      return !isMetaType && !isVideoType && !isYouTubeLink;
    });
  }, [mainData]);

  const startIndex = Math.max(parseInt(articleIndex as string) || 0, 0);
  const [currentIndex, setCurrentIndex] = useState(startIndex);

  useEffect(() => {
    if (rawArticles.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: startIndex,
          animated: false,
        });
      }, 0);
    }
  }, [rawArticles, startIndex]);

  const handleNavigation = useCallback(
    (direction: "next" | "prev") => {
      const newIndex =
        direction === "next" ? currentIndex + 1 : currentIndex - 1;
      if (newIndex >= 0 && newIndex < rawArticles.length) {
        setCurrentIndex(newIndex);
        flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
      }
    },
    [currentIndex, rawArticles.length]
  );

  const renderItem = useCallback(
    ({ item, index }: any) => (
      <View style={{ width }}>
        <ArticleContent
          item={item}
          width={width}
          articles={rawArticles}
          currentIndex={index}
          handleNavigation={handleNavigation}
        />
      </View>
    ),
    [rawArticles, handleNavigation, width]
  );

  if (rawArticles.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.backgroundColor,
          paddingTop: insets.top,
        }}
      >
        <StickyHeader article={[]} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            No valid articles found for this category.
          </Text>
        </View>
      </View>
    );
  }

  const currentArticle = rawArticles[currentIndex];

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.backgroundColor,
        paddingTop: insets.top,
      }}
    >
      {currentArticle && <StickyHeader article={currentArticle} />}

      <FlatList
        ref={flatListRef}
        data={rawArticles}
        horizontal
        pagingEnabled
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.id || index}`}
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={startIndex}
        getItemLayout={(_, index) => ({
          length: width, // ✅ Use dynamic width for layout calculations
          offset: width * index, // ✅ Use dynamic width for offset calculations
          index,
        })}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={2}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.x / width
          ); // ✅ Use dynamic width
          setCurrentIndex(newIndex);
        }}
        onScrollToIndexFailed={(info) => {
          console.warn("Scroll to index failed:", info);
          setTimeout(() => {
            if (rawArticles.length > 0) {
              flatListRef.current?.scrollToIndex({
                index: Math.min(info.index, rawArticles.length - 1),
                animated: false,
              });
            }
          }, 100);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
});

export default SwipeableArticleView;
