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

import { Refresh } from "@/app/assets/AllSVGs";
import { API_LIMIT_LOAD_MORE } from "@/app/constants/Constants";
import { cacheData, getCachedData } from "@/app/lib/cacheUtils";
import { rawGetCategoryPostsExceptHome } from "@/app/lib/gql-queries/get-category-posts";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import { DataContext } from "@/app/providers/DataProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { ArticleType } from "@/app/types/article";
import { FlashList } from "@shopify/flash-list";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BannerAD from "../ads/Banner";
import NewsCard from "../cards/NewsCard";
import SmallNewsCard from "../cards/SmallNewsCard";
import TabletNewsCard from "../cards/TabletNewsCard";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { getArticleTextSize } from "../functions/Functions";

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

// Category mapping for GraphQL queries
// Utility function to check if cached data exists
const hasCachedData = (data: any[] | undefined): boolean => {
  return Array.isArray(data) && data.length > 0;
};

const getCategorySlugMapping = (categoryName: string): string => {
  const categoryMap: { [key: string]: string } = {
    // Main categories
    "Top News": "top-news",
    "Berita Utama": "top-bm",
    Business: "business",
    Opinion: "opinion",
    World: "world",
    Sports: "sports",
    Lifestyle: "leisure",

    // Subcategories
    Malaysia: "nation",
    "Borneo+": "sabahsarawak",
    "Southeast Asia": "south-east-asia",
    Tempatan: "tempatan",
    Pandangan: "pandangan",
    Dunia: "dunia",
    "Behind the Bylines": "editorial",
    Column: "column",
    Letters: "letters",
    "World Business": "world-business",
    "Local Business": "local-business",
    Football: "football",
    Badminton: "badminton",
    Motorsports: "motorsports",
    Tennis: "tennis",
    "Everyday Heroes": "simple-stories",
    Food: "food",
    Entertainment: "entertainment",
    "Health & Family": "health",
    Money: "money",
    Travel: "travel",
    Tech: "tech",
    Pets: "pets",
  };

  return (
    categoryMap[categoryName] || categoryName.toLowerCase().replace(/\s+/g, "-")
  );
};
const CategoryPosts = () => {
  const params = useLocalSearchParams();
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();
  const { setMainData } = useContext(DataContext);
  const { markAsVisited, isVisited } = useVisitedArticles();
  const flashListRef = useRef<any>(null);
  const [showBottomBorder, setShowBottomBorder] = useState(false);
  const [visibleItemIndices, setVisibleItemIndices] = useState<Set<number>>(
    new Set()
  ); // Track visible items
  const rotation = useState(new Animated.Value(0))[0];
  const { width } = useWindowDimensions();
  const isNavigatingRef = useRef<boolean>(false);

  const isTablet = width >= 600;
  const categoryName = params.CategoryName as string;
  const displayTitle = params.displayTitle as string;

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
    ]).start(() => {
      setBackgroundLoading(false);
    });
  }, []);

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  // Fetch news data from GraphQL
  const fetchNewsData = async (categorySlug: string): Promise<any[]> => {
    try {
      const response = await rawGetCategoryPostsExceptHome({
        first: API_LIMIT_LOAD_MORE,
        where: {
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [categorySlug],
              },
            ],
          },
        },
      });

      return response?.posts || [];
    } catch (error) {
      console.error(`Error fetching news data for ${categorySlug}:`, error);
      throw error;
    }
  };

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

  // Main data fetching function
  const fetchCategoryData = useCallback(
    async (isRefresh = false) => {
      if (!categoryName) return;

      const categorySlug = getCategorySlugMapping(categoryName);
      const cacheKey = `category-${categorySlug}`;

      try {
        // Always try to load cached data first
        const cachedData = await getCachedData(cacheKey);
        const hasCached = cachedData && hasCachedData(cachedData);

        // If we have cached data and it's not a manual refresh, use it immediately
        if (hasCached && !isRefresh) {
          setArticles(cachedData);
          const processed = processArticles(cachedData, false);
          setProcessedData(processed);

          const swipableArticles = processed.filter(
            (item) => item.type !== "AD_ITEM"
          );
          setMainData(swipableArticles);
          setLoading(false);

          // Start background fetch without showing loader
          setTimeout(() => {
            setBackgroundLoading(true);
            fetchNewsData(categorySlug)
              .then((fetchedData) => {
                if (fetchedData.length > 0) {
                  setArticles(fetchedData);
                  const processed = processArticles(fetchedData, false);
                  setProcessedData(processed);
                  const swipableArticles = processed.filter(
                    (item) => item.type !== "AD_ITEM"
                  );
                  setMainData(swipableArticles);

                  // Update cache with fresh data
                  cacheData(cacheKey, fetchedData);
                }
              })
              .catch((bgError) => {
                console.error("Background fetch error:", bgError);
              })
              .finally(() => {
                setBackgroundLoading(false);
              });
          }, 100);
          return;
        }

        // No cached data or refresh requested - show loader and fetch
        setLoading(true);

        // Fetch news data
        const fetchedData = await fetchNewsData(categorySlug);
        if (fetchedData.length > 0) {
          setArticles(fetchedData);
          const processed = processArticles(fetchedData, isRefresh);
          setProcessedData(processed);

          const swipableArticles = processed.filter(
            (item) => item.type !== "AD_ITEM"
          );
          setMainData(swipableArticles);

          // Cache the data
          await cacheData(cacheKey, fetchedData);
        }

        if (isRefresh && flashListRef.current) {
          flashListRef.current.scrollToIndex({ index: 0, animated: true });
        }
      } catch (error) {
        console.error("Error fetching category data:", error);

        // Try to load cached data as fallback
        const cachedData = getCachedData(cacheKey);
        if (cachedData && hasCachedData(cachedData)) {
          setArticles(cachedData);
          const processed = processArticles(cachedData, isRefresh);
          setProcessedData(processed);
          setMainData(processed.filter((item) => item.type !== "AD_ITEM"));
        }
      } finally {
        setLoading(false);
      }
    },
    [categoryName, processArticles, setMainData]
  );

  // Load data on component mount and category change
  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  const handleRefresh = useCallback(async () => {
    startRotationSequence();
    await fetchCategoryData(true);
  }, [fetchCategoryData, startRotationSequence]);

  const handlePress = useCallback(
    (item: any, index: number) => {
      if (isNavigatingRef.current) return; // 🔒 block multiple taps

      if (item.id) {
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
        isNavigatingRef.current = true;
        setTimeout(() => {
          // Navigate to article swiper
          router.push({
            pathname: "/components/mainCategory/SwipableArticle",
            params: {
              articleIndex: articleIndex.toString(),
              categoryName: categoryName,
            },
          });
        }, 100);
        setTimeout(() => {
          isNavigatingRef.current = false;
        }, 500);
      } else {
        console.error("Could not find article index:", item.id || item.uri);
      }
    },
    [
      router,
      categoryName,
      setMainData,
      processedData,
      markAsVisited,
      isNavigatingRef,
    ]
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
    ({ viewableItems }: { viewableItems: any[] }) => {
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

        const nonAdIndex = getNonAdIndex(index);
        const isItemVisible = visibleItemIndices.has(index);

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
    [handlePress, getNonAdIndex, visibleItemIndices]
  );

  if (loading && !backgroundLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      >
        <LoadingIndicator />
      </View>
    );
  }

  if (processedData.length === 0 && !loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: theme.backgroundColor,
          paddingTop: insets.top,
        }}
      >
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
            {displayTitle || categoryName}
          </Text>
          <TouchableOpacity
            onPress={handleRefresh}
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
            onPress={handleRefresh}
          >
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>
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
          {displayTitle ||
            (categoryName.toUpperCase() === "HOME"
              ? "HEADLINES"
              : categoryName)}
        </Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.iconContainer}>
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
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : "900",
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
