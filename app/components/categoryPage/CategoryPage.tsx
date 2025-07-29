// CategoryPage.tsx
//
// This file defines the CategoryPosts screen/component, which displays a list of articles for a given category.
// It loads articles from context/cache, supports pull-to-refresh, and allows navigation to article details.
// The screen adapts to theme, text size, and device type (tablet/phone), and provides empty/error/loading states.
//
// Key responsibilities:
// - Load and display articles for a selected category
// - Allow navigation to article details (swipable view)
// - Support pull-to-refresh and background loading
// - Show ads at intervals in the list
// - Adapt to theme, text size, and device type
//
// Usage: Render <CategoryPosts /> as the category news list screen in the app.
//
// -----------------------------------------------------------------------------

import React, {
  useState,
  useEffect,
  useContext,
  useCallback,
  useRef,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  SafeAreaView,
  Easing,
  Platform,
  InteractionManager,
  useWindowDimensions,
} from "react-native";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { getArticleTextSize } from "../functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import SmallNewsCard from "../cards/SmallNewsCard";
import NewsCard from "../cards/NewsCard"; // Import NewsCard for NewsCardItem
import SmallVideoCard from "../cards/SmallVideoCard";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { formatTimeAgo, formatTimeAgoMalaysia } from "@/app/lib/utils";
import { useLandingData } from "@/app/providers/LandingProvider";
import { DataContext } from "@/app/providers/DataProvider";
import { Refresh } from "@/app/assets/AllSVGs";
import BannerAD from "../ads/Banner";
import { FlashList } from "@shopify/flash-list";
import type { FlashList as FlashListType } from "@shopify/flash-list";
import { ArticleType } from "@/app/types/article";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import TabletNewsCard from "../cards/TabletNewsCard";
import { cacheData, getCachedData, hasCachedData } from "@/app/lib/cacheUtils";

// Define NewsCardItem
const NewsCardItem = ({
  item,
  onPress,
  index,
  isVisible,
}: {
  item: any;
  onPress: () => void;
  index: number;
  isVisible: boolean;
}) => {
  const { isVisited } = useVisitedArticles();
  const visited = item.id ? isVisited(item.id) : false;

  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  // Always use NewsCard on tablets, otherwise use type-specific card
  const CardComponent = isTablet
    ? TabletNewsCard
    : item.type === "featured"
    ? NewsCard
    : SmallNewsCard;

  // For tablets, we need to wrap the card and pass onPress
  if (isTablet) {
    return (
      <TabletNewsCard
        id={item.id}
        imageUri={item.thumbnail || item?.featuredImage?.node?.sourceUrl || ""}
        heading={item.title}
        info={item.excerpt}
        time={formatTimeAgoMalaysia(item.date)}
        category={item.featuredCategory || "Malaysia"}
        slug={item.slug}
        posts={item}
        index={index}
        uri={item.permalink}
        main={true}
        visited={visited}
        onPress={onPress} // Pass the onPress handler from HomeLandingSection
      />
    );
  }

  // For mobile devices, keep the TouchableOpacity wrapper
  return (
    <TouchableOpacity onPress={onPress}>
      <CardComponent
        id={item.id}
        imageUri={item.thumbnail || item?.featuredImage?.node?.sourceUrl || ""}
        heading={item.title}
        info={item.excerpt}
        time={formatTimeAgoMalaysia(item.date)}
        category={item.featuredCategory || "Malaysia"}
        slug={item.slug}
        posts={item}
        index={index}
        uri={item.permalink}
        main={true}
        isVisible={isVisible}
        visited={visited}
      />
    </TouchableOpacity>
  );
};

const AdSlotBanner = React.memo(() => <BannerAD unit="ros" />);
// ⚠️ This is NOT a hook. It's a plain JS object, safe to define outside.
const categoryRefreshCooldownMap: Record<string, number> = {};

const CategoryPosts = () => {
  const params = useLocalSearchParams();
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();
  const {
    filteredLandingData,
    isLoading: globalLoading,
    refreshCategoryData,
  } = useLandingData();
  const { setMainData } = useContext(DataContext);
  const { markAsVisited, isVisited } = useVisitedArticles();
  const flashListRef = useRef<FlashListType<ArticleType>>(null);
  const [showBottomBorder, setShowBottomBorder] = useState(false);
  const [visibleItemIndices, setVisibleItemIndices] = useState<Set<number>>(
    new Set()
  ); // Track visible items
  const rotation = useState(new Animated.Value(0))[0];
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;

  const startRotationSequence = useCallback(() => {
    setBackgroundLoading(true);
    Animated.sequence([
      Animated.timing(rotation, {
        toValue: 3,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: -0.5,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(rotation, {
        toValue: 0,
        duration: 1800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  const processArticles = useCallback(
    (articles: ArticleType[], refresh = false) => {
      if (!articles || articles.length === 0) return [];

      const processedData = [];
      let adCounter = 0;

      for (let i = 0; i < articles.length; i++) {
        processedData.push(articles[i]);
        if ((i + 1) % 5 === 0 && i < articles.length - 1) {
          adCounter++;
          processedData.push({
            type: "AD_ITEM",
            id: `ad-${adCounter}-${refresh ? "refresh" : "initial"}`,
            adIndex: adCounter,
          });
        }
      }

      return processedData;
    },
    []
  );

  const getCategoryKey = useCallback((displayName: string): string => {
    const categoryMap: { [key: string]: string } = {
      Lifestyle: "all-lifestyle",
      "Berita Utama": "all-berita",
      Berita: "all-berita",
      Letters: "letter",
      "All Opinions": "all-opinion",
      Opinion: "all-opinion",
      "South East Asia": "south-east-asia",
      "All Business": "all-business",
      Business: "all-business",
      "Local Business": "local-business",
      "World Business": "world-business",
      "All Sports": "all-sports",
      Sports: "all-sports",
      "All Property": "property",
      "Simple Stories": "simple-stories",
      "Health & Family": "health",
      "All Lifestyle": "all-lifestyle",
      "FMT NEWS": "fmt-news",
      "FMT LIFESTYLE": "fmt-lifestyle",
      "FMT EXCLUSIVE": "fmt-exclusive",
      "FMT NEWS CAPSULE": "fmt-news-capsule",
      "Top News": "malaysia",
      Headlines: "malaysia",
      NEWS: "malaysia",
      Videos: "videos",
      World: "all-world",
      News: "malaysia",
    };

    return categoryMap[displayName] || displayName.toLowerCase();
  }, []);

  const initializeCategoryPosts = useCallback(
    async (isRefresh = false) => {
      if (!params.CategoryName) return;

      const originalName = params.CategoryName as string;
      const mappedKey = getCategoryKey(originalName);

      let contextArticles = filteredLandingData[mappedKey] || [];

      // ✅ If no context data, try loading from AsyncStorage
      if (contextArticles.length === 0) {
        const cachedData = await getCachedData(mappedKey);
        if (cachedData && hasCachedData(cachedData)) {
          // console.log(`📦 Loaded cached data for ${mappedKey}`);
          contextArticles = cachedData;
        }
      }

      // ✅ Process and display
      const processed = processArticles(contextArticles, isRefresh);

      if (contextArticles.length > 0) {
        setArticles(contextArticles);
        setProcessedData(processed);

        const swipableArticles = processed.filter(
          (item) => item.type !== "AD_ITEM"
        );
        setMainData(swipableArticles);

        // ✅ Save to cache (non-blocking)
        cacheData(mappedKey, contextArticles);

        setLoading(false);
      }

      if (isRefresh && flashListRef.current) {
        flashListRef.current.scrollToIndex({ index: 0, animated: true });
      }
    },
    [
      params.CategoryName,
      filteredLandingData,
      processArticles,
      getCategoryKey,
      setMainData,
    ]
  );

  useEffect(() => {
    initializeCategoryPosts();
  }, [params.CategoryName, filteredLandingData, initializeCategoryPosts]);

  useEffect(() => {
    if (!params.CategoryName) return;

    const originalName = params.CategoryName as string;
    const normalizedKey = getCategoryKey(originalName);
    const now = Date.now();
    const lastRefresh = categoryRefreshCooldownMap[normalizedKey] || 0;

    if (now - lastRefresh >= 30 * 1000) {
      // console.log(`🔁 Refreshing category "${normalizedKey}"`);
      refreshCategoryData(normalizedKey);
      categoryRefreshCooldownMap[normalizedKey] = now;
    } else {
      const secondsLeft = Math.ceil((30 * 1000 - (now - lastRefresh)) / 1000);
      // console.log(`⏳ Skipped refresh for "${normalizedKey}" - wait ${secondsLeft}s`);
    }
  }, [params.CategoryName]);

  const handlePress = useCallback(
    (item: any, index: number) => {
      if (item.id) {
        // console.log('Calling markAsVisited for article ID:', item.id);
        markAsVisited(item.id);
      } else {
        console.warn(`No ID found for article: ${item.title}`);
      }

      setMainData(processedData.filter((item) => item.type !== "AD_ITEM"));

      let articleIndex = index;

      if (
        processedData[articleIndex]?.id !== item.id &&
        processedData[articleIndex]?.uri !== item.uri
      ) {
        articleIndex = processedData.findIndex(
          (article: any) => article.id === item.id || article.uri === item.uri
        );
      }

      if (articleIndex !== -1) {
        setTimeout(() => {
          router.push({
            pathname: "/components/mainCategory/SwipableArticle",
            params: {
              articleIndex: articleIndex.toString(),
              categoryName: params.CategoryName,
            },
          });
        }, 100);
      } else {
        console.error("Could not find article index:", item.id || item.uri);
      }
    },
    [router, params.CategoryName, setMainData, processedData, markAsVisited]
  );

  const getNonAdIndex = useCallback(
    (currentIndex: number) => {
      return (
        processedData
          .slice(0, currentIndex + 1)
          .filter((item) => item.type !== "AD_ITEM").length - 1
      );
    },
    [processedData]
  );

  const handleViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null; item: ArticleType }>;
    }) => {
      const newVisibleIndices = new Set<number>();
      viewableItems.forEach(({ index }) => {
        if (index !== null) {
          newVisibleIndices.add(index);
        }
      });
      setVisibleItemIndices(newVisibleIndices);
    },
    []
  );

  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      try {
        if (!item) return null;

        if (item.type === "AD_ITEM") {
          return <AdSlotBanner />;
        }

        const isVideo =
          item.type === "video" ||
          item.type === "video-featured" ||
          item.videoId ||
          item.subcategory === "Video" ||
          item.subcategory === "Videos" ||
          (item.subcategory?.includes("Fmt") &&
            params.CategoryName === "Videos") ||
          params.CategoryName === "Videos";

        const nonAdIndex = getNonAdIndex(index);
        const isItemVisible = visibleItemIndices.has(index);

        if (isVideo) {
          return (
            <TouchableOpacity onPress={() => handlePress(item, nonAdIndex)}>
              <SmallVideoCard
                title={item.title}
                permalink={item.permalink || ""}
                content={item.content || item.excerpt || ""}
                date={formatTimeAgo(item.date || item.dateGmt)}
                thumbnail={item.thumbnail}
              />
            </TouchableOpacity>
          );
        }

        return (
          <NewsCardItem
            item={item}
            onPress={() => handlePress(item, nonAdIndex)}
            index={nonAdIndex}
            isVisible={isItemVisible}
          />
        );
      } catch (error) {
        console.error("Error rendering item:", error);
        return null;
      }
    },
    [
      theme.textColor,
      textSize,
      params.CategoryName,
      handlePress,
      getNonAdIndex,
      visibleItemIndices,
      isVisited,
    ]
  );

  if ((loading || globalLoading) && !backgroundLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      >
        <LoadingIndicator />
      </View>
    );
  }

  if (processedData.length === 0 && !loading && !globalLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.backgroundColor }}>
        <View
          style={[styles.header, { backgroundColor: theme.backgroundColor }]}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            {Platform.OS === "ios" ? (
              <ChevronLeft size={34} color="#DC2626" />
            ) : (
              <ArrowLeft size={24} color="#DC2626" />
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.relatedTitle,
              {
                color: theme.textColor,
                fontSize: getArticleTextSize(24.0, textSize),
              },
            ]}
          >
            {params.CategoryName}
          </Text>
          <TouchableOpacity
            onPress={startRotationSequence}
            style={styles.iconContainer}
          >
            <Animated.View
              style={{ transform: [{ rotate: rotationInterpolate }] }}
            >
              <Refresh size={24} color="#c62828" fill="#c62828" />
            </Animated.View>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textColor }]}>
            No articles found for this category.
          </Text>
          <TouchableOpacity
            style={[styles.refreshButton, { backgroundColor: "#DC2626" }]}
            onPress={startRotationSequence}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.backgroundColor,
        paddingTop: insets.top,
      }}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundColor,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: showBottomBorder ? 4 : 0 },
            shadowOpacity: showBottomBorder ? 0.15 : 0,
            shadowRadius: showBottomBorder ? 3 : 0,
            borderBottomWidth: 1,
            borderBottomColor: "rgba(0, 0, 0, 0.12)",
            paddingHorizontal: isTablet ? 10 : 0,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          {Platform.OS === "ios" ? (
            <ChevronLeft size={34} color="#DC2626" />
          ) : (
            <ArrowLeft size={24} color="#DC2626" />
          )}
        </TouchableOpacity>
        <Text
          style={[
            styles.relatedTitle,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(22.0, textSize),
            },
          ]}
        >
          {(params.CategoryName as string).toUpperCase() === "HOME"
            ? "HEADLINES"
            : params.CategoryName}
        </Text>
        <TouchableOpacity
          onPress={startRotationSequence}
          style={styles.iconContainer}
        >
          <Animated.View
            style={{ transform: [{ rotate: rotationInterpolate }] }}
          >
            <Refresh size={24} color="#c62828" fill="#c62828" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <FlashList
        ref={flashListRef}
        data={processedData}
        estimatedItemSize={140}
        keyExtractor={(item, index) =>
          item.type === "AD_ITEM"
            ? item.id
            : `${item?.id || item?.uri || index}`
        }
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => {
          const offsetY = e.nativeEvent.contentOffset.y;
          setShowBottomBorder(offsetY > 5);
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{
          backgroundColor: theme.backgroundColor,
          paddingBottom: Platform.OS === "ios" ? 40 : 40,
        }}
        ListFooterComponent={
          backgroundLoading ? (
            <LoadingIndicator />
          ) : (
            <View style={{ height: 10 }} />
          )
        }
        onViewableItemsChanged={handleViewableItemsChanged} // Add visibility tracking
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          waitForInteraction: false,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    zIndex: 10,
  },
  backButton: {
    padding: 8,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
    padding: 8,
  },
  relatedTitle: {
    flex: 1,
    textAlign: "center",
    textTransform: "uppercase",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
    textAlign: "center",
  },
  refreshButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  refreshButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CategoryPosts;
