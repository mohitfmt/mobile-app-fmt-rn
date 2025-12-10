// MainCategory.tsx
//
// This file defines the MainCategory screen/component, which displays the main landing/news section for a category.
// It loads articles and videos, shows cards and ads, and adapts to device type and theme. It supports pull-to-refresh,
// caching, and navigation to article/video details. Used as the main content for each tab/category.
//
// Key responsibilities:
// - Load and display articles and videos for a main category
// - Show news cards, video cards, and ads in a list
// - Support pull-to-refresh, caching, and offline fallback
// - Adapt to device type (tablet/phone) and theme
// - Allow navigation to article/video details
//
// Usage: Render <MainCategory categoryName={...} /> as the main landing/news section for a tab/category.
//
// -----------------------------------------------------------------------------

import { PlayIcon } from "@/app/assets/AllSVGs";
import { cacheData, getCachedData } from "@/app/lib/cacheUtils";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import { DataContext } from "@/app/providers/DataProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import {
  landingFeeds,
  useLandingData,
  youtubeFeeds,
} from "@/app/providers/LandingProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { ArticleType } from "@/app/types/article";
import { FlashList } from "@shopify/flash-list";
import axios, { AxiosError } from "axios";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Animated from "react-native-reanimated";
import BannerAD from "../ads/Banner";
import NewsCard from "../cards/NewsCard";
import SmallNewsCard from "../cards/SmallNewsCard";
import SmallVideoCard from "../cards/SmallVideoCard";
import TabletNewsCard from "../cards/TabletNewsCard";
import TabletVideoCard from "../cards/TabletVideoCard";
import VideoCard from "../cards/VideoCard";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { getArticleTextSize } from "../functions/Functions";

// Type Definitions (from LandingDataProvider)
interface Feed {
  key: string;
  url: string;
  priority?: "high" | "medium" | "low";
}

const AnimatedFlashList = Animated.createAnimatedComponent(
  FlashList as unknown as new (...args: any[]) => FlashList<ArticleType>
);

const useDeviceType = () => {
  const { width, height } = useWindowDimensions();
  return useMemo(() => {
    const minDimension = Math.min(width, height);
    const maxDimension = Math.max(width, height);
    const isTablet =
      minDimension >= 600 ||
      maxDimension >= 1024 ||
      (minDimension >= 500 && maxDimension >= 800);
    const isLandscape = width > height;
    const isPortrait = height > width;
    const shouldUseTabletLayout =
      isTablet || (isLandscape && minDimension >= 500 && maxDimension >= 900);
    return {
      isTablet,
      isPhone: !isTablet,
      isLandscape,
      isPortrait,
      shouldUseTabletLayout,
      width,
      height,
      minDimension,
      maxDimension,
    };
  }, [width, height]);
};

// Utility Functions (copied from LandingDataProvider)
const filterValidArticles = (articles: any[]): any[] => {
  if (!Array.isArray(articles)) {
    return [];
  }
  const seenTitles = new Set();
  return articles.filter((item) => {
    if (!item) return false;
    if (!item.id || !item.title || !item.thumbnail) return false;
    if (item.type === "AD_ITEM" || item.type === "MORE_ITEM") return false;
    if (item.type === "CARD_TITLE") {
      if (seenTitles.has(item.title)) return false;
      seenTitles.add(item.title);
    }
    return true;
  });
};

const processYouTubeData = (items: any[]): any[] => {
  if (!items || !Array.isArray(items)) {
    return [];
  }
  return items
    .filter((item) => item?.title && item?.permalink && item?.thumbnail)
    .map((item, index) => {
      const videoIdMatch = item.permalink?.match(/v=([^&]+)/);
      const videoId = videoIdMatch ? videoIdMatch[1] : `yt-${index}`;
      return {
        id: item.id || videoId,
        title: item.title,
        excerpt: item.content || "",
        date: item.date || new Date().toISOString(),
        thumbnail: item.thumbnail,
        permalink: item.permalink,
        videoId: videoId,
        type: index === 0 ? "video-featured" : item.type || "video",
        content: item.content || "",
      };
    });
};

// Utility function to check if cached data exists
const hasCachedData = (data: any[] | undefined): boolean => {
  return Array.isArray(data) && data.length > 0;
};

// Loading Component
const LoadingComponent = React.memo(() => {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.backgroundColor },
      ]}
    >
      <LoadingIndicator />
    </View>
  );
});

// Offline Fallback Component
const OfflineFallback = React.memo(() => {
  const { theme } = useContext(ThemeContext);
  return (
    <View
      style={[
        styles.loadingContainer,
        { backgroundColor: theme.backgroundColor },
      ]}
    >
      <LoadingIndicator />
    </View>
  );
});

const CardTitleSection = React.memo(
  ({
    title,
    color,
    textSize,
  }: {
    title: string;
    color: string;
    textSize: string;
  }) => (
    <View style={styles.titleContainer}>
      <Text
        style={[
          styles.categoryTitle,
          { color, fontSize: getArticleTextSize(30, textSize) },
        ]}
      >
        {title.toUpperCase()}
      </Text>
    </View>
  )
);

const ReadMoreButton = React.memo(({ title }: { title: string }) => {
  const router = useRouter();
  const { textSize } = useContext(GlobalSettingsContext);
  const normalizedTitle = title.toLowerCase();
  const isVideo = [
    "fmt news",
    "fmt lifestyle",
    "fmt exclusive",
    "fmt news capsule",
    "videos",
  ].includes(normalizedTitle);

  const handlePress = useCallback(() => {
    router.push({
      pathname: isVideo
        ? "/components/videos/CategoryVideoPage"
        : "/components/categoryPage/CategoryPage",
      params: { CategoryName: title },
    });
  }, [router, isVideo, title]);

  return (
    <TouchableOpacity style={[styles.readMoreButton]} onPress={handlePress}>
      <View style={styles.loadMoreContainer}>
        <Text
          style={[
            styles.readMoreText,
            { fontSize: getArticleTextSize(14.0, textSize) },
          ]}
        >
          Load More
        </Text>
        <View style={styles.playIcon}>
          <PlayIcon />
        </View>
      </View>
    </TouchableOpacity>
  );
});

const VideoCardItem = React.memo(
  ({
    item,
    isVisible,
    onPress,
  }: {
    item: any;
    isVisible: boolean;
    onPress: () => void;
  }) => {
    const { isVisited } = useVisitedArticles();
    const visited = item.id ? isVisited(item.id) : false;
    const { shouldUseTabletLayout } = useDeviceType();

    const videoContent = (
      <>
        {item.type === "video-featured" ? (
          shouldUseTabletLayout ? (
            <TabletVideoCard
              title={item.title}
              permalink={item.permalink}
              content={item.content}
              date={formatTimeAgoMalaysia(item.date)}
              thumbnail={item.thumbnail}
              type="video-featured"
              onPress={onPress}
            />
          ) : (
            <VideoCard
              title={item.title}
              permalink={item.permalink}
              content={item.content}
              date={formatTimeAgoMalaysia(item.date)}
              thumbnail={item.thumbnail}
              type="video-featured"
              visited={visited}
            />
          )
        ) : shouldUseTabletLayout ? (
          <TabletVideoCard
            title={item.title}
            permalink={item.permalink}
            content={item.content}
            date={formatTimeAgoMalaysia(item.date)}
            thumbnail={item.thumbnail}
            type="video-small"
            onPress={onPress}
          />
        ) : (
          <SmallVideoCard
            title={item.title}
            permalink={item.permalink}
            content={item.content}
            date={formatTimeAgoMalaysia(item.date)}
            thumbnail={item.thumbnail}
            visited={visited}
          />
        )}
      </>
    );

    if (shouldUseTabletLayout) {
      return <View style={styles.tabletItemContainer}>{videoContent}</View>;
    }

    return (
      <TouchableOpacity onPress={onPress}>{videoContent}</TouchableOpacity>
    );
  }
);

const NewsCardItem = React.memo(
  ({
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
    const { shouldUseTabletLayout } = useDeviceType();

    if (shouldUseTabletLayout) {
      return (
        <View style={styles.tabletItemContainer}>
          <TabletNewsCard
            id={item.id}
            imageUri={item.thumbnail}
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
            onPress={onPress}
          />
        </View>
      );
    }

    const CardComponent = item.type === "featured" ? NewsCard : SmallNewsCard;

    return (
      <TouchableOpacity onPress={onPress}>
        <CardComponent
          id={item.id}
          imageUri={item.thumbnail}
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
  }
);

const AdSlotBanner = React.memo(() => <BannerAD unit="home" />);
const refreshCooldownMap: Record<string, number> = {};

const HomeLandingSection = ({
  categoryName,
  isVisible: sectionVisible,
  onScroll,
}: {
  categoryName: string;
  isVisible: boolean;
  onScroll?: (e: any) => void;
}) => {
  const router = useRouter();
  const { theme, isOnline } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const {
    landingData,
    setLandingData,
    setFilteredLandingData,
    isLoading,
    queueCacheUpdate,
  } = useLandingData();
  const flashListRef = useRef<FlashList<ArticleType>>(null);
  const [expanded, setExpanded] = useState(false);
  const { setMainData } = useContext(DataContext);
  const [visibleItemIndices, setVisibleItemIndices] = useState<Set<number>>(
    new Set()
  );
  const [dataReady, setDataReady] = useState(false);
  const { markAsVisited } = useVisitedArticles();
  const { shouldUseTabletLayout } = useDeviceType();
  const [isCategoryLoading, setIsCategoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const lastAutoRefreshRef = useRef<number>(Date.now());
  const categoryKey = useMemo(() => {
    switch (categoryName.toLowerCase()) {
      case "home":
        return "home-landing";
      case "videos":
        return "videos-landing";
      case "berita":
        return "berita-landing";
      case "opinion":
        return "opinion-landing";
      case "business":
        return "business-landing";
      case "world":
        return "world-landing";
      case "sports":
        return "sports-landing";
      case "news":
        return "news-landing";
      case "property":
        return "property-landing";
      case "lifestyle":
        return "lifestyle-landing";
      case "nation":
        return "nation-landing";
      case "ohsem":
        return "ohsem-landing";
      default:
        return categoryName.toLowerCase();
    }
  }, [categoryName]);

  const fullArticles = landingData[categoryKey] || [];
  const validArticles = useMemo(
    () =>
      fullArticles.filter((item: any) => {
        const isMeta = [
          "AD_ITEM",
          "MORE_ITEM",
          "CARD_TITLE",
          "LOADING_ITEM",
        ].includes(item.type);
        const isVideo = item.type?.toLowerCase?.().includes("video");
        const isYouTube = item.permalink?.includes?.("youtube.com");
        return !isMeta && !isVideo && !isYouTube;
      }),
    [fullArticles]
  );

  const visibleData = useMemo(() => {
    if (sectionVisible && !expanded) {
      setExpanded(true);
      return fullArticles;
    } else if (!expanded) {
      const firstAdIndex = fullArticles.findIndex(
        (item) => item.type === "AD_ITEM"
      );
      const sliceIndex = firstAdIndex !== -1 ? firstAdIndex + 1 : 5;
      return fullArticles.slice(0, sliceIndex);
    }
    return fullArticles;
  }, [sectionVisible, expanded, fullArticles]);

  const checkOnlineStatus = useCallback(() => {
    if (!isOnline) {
      console.warn("Connection lost - using cached data if available");
      return hasCachedData(fullArticles); // Return true if cached data exists
    }
    return true;
  }, [isOnline, fullArticles]);

  const fetchCategoryWithRetry = async (
    feed: Feed,
    maxRetries = 2
  ): Promise<{ key: string; data: any[] } | null> => {
    const isYoutube = youtubeFeeds.some((f) => f.key === feed.key);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (!checkOnlineStatus()) return null;
      try {
        const response = await axios.get(feed.url, {
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
            "Content-Type": "application/json",
          },
          timeout: 10000,
        });
        if (!checkOnlineStatus()) return null;
        if (response.data && Array.isArray(response.data)) {
          const processedData = isYoutube
            ? processYouTubeData(response.data)
            : response.data;
          // Cache the data in mmkv
          await cacheData(feed.key, processedData);
          // Also update the existing cache mechanism
          queueCacheUpdate(feed.key, processedData);
          return { key: feed.key, data: processedData };
        } else {
          console.warn(`Invalid response format for ${feed.key}`);
        }
      } catch (err) {
        const isLastAttempt = attempt === maxRetries;
        const errorMsg = (err as AxiosError).message;
        if (isLastAttempt) {
          console.warn(
            `Failed to fetch ${feed.key} after ${
              maxRetries + 1
            } attempts: ${errorMsg}`
          );
        } else {
          console.warn(
            `Attempt ${attempt + 1} failed for ${feed.key}, retrying...`
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    return null;
  };

  const fetchIfNeeded = async () => {
    try {
      if (!sectionVisible || isCategoryLoading) return;
      // Check cooldown
      const now = Date.now();
      const lastFetch = refreshCooldownMap[categoryKey] || 0;
      if (now - lastFetch < 60000) {
        //skip fetch for at least 1 minute on tab change to avoid too many api calls
        // (`⏳ Skipping fetch for "${categoryKey}" (cooldown active - ${Math.ceil((10000 - (now - lastFetch)) / 1000)}s remaining)`);
        return;
      }

      // If offline, try to load cached data
      if (!isOnline) {
        const cachedData = await getCachedData(categoryKey);
        if (cachedData && hasCachedData(cachedData)) {
          setLandingData((prev) => ({ ...prev, [categoryKey]: cachedData }));
          const filteredData = filterValidArticles(cachedData);
          if (filteredData.length > 0) {
            setFilteredLandingData((prev) => ({
              ...prev,
              [categoryKey]: filteredData,
            }));
          }
          setDataReady(true);
          return;
        }
        console.warn(`Offline and no cached data for ${categoryKey}`);
        setDataReady(true); // Allow rendering to show OfflineFallback
        return;
      }
      refreshCooldownMap[categoryKey] = now;
      setIsCategoryLoading(true);
      const feed = [...landingFeeds, ...youtubeFeeds].find(
        (item) => item.key === categoryKey
      );
      if (!feed) {
        console.warn(`No matching feed found for category "${categoryKey}"`);
        return;
      }

      const result = await fetchCategoryWithRetry(feed);
      if (result) {
        const { key, data } = result;
        const filteredData = filterValidArticles(data);
        setLandingData((prev) => ({ ...prev, [key]: data }));
        if (filteredData.length > 0) {
          setFilteredLandingData((prev) => ({ ...prev, [key]: filteredData }));
        }
      }
    } catch (err) {
      console.error(`Failed to fetch data for ${categoryKey}:`, err);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  useEffect(() => {
    fetchIfNeeded();
  }, [sectionVisible, categoryKey, isOnline, dataReady]);

  useEffect(() => {
    if (!isLoading && (hasCachedData(visibleData) || !isOnline)) {
      const timer = setTimeout(() => setDataReady(true), 100);
      return () => clearTimeout(timer);
    } else if (isLoading) {
      setDataReady(false);
    }
  }, [isLoading, visibleData.length, isOnline]);

  const articleIndexMap = useMemo(() => {
    const map = new Map<number, number>();
    let nonMetaIndex = 0;
    visibleData.forEach((item, visibleIndex) => {
      const isSkippable =
        item.type === "CARD_TITLE" ||
        item.type === "MORE_ITEM" ||
        item.type === "AD_ITEM" ||
        item.type === "LOADING_ITEM" ||
        item.type?.includes("video") ||
        (item.permalink && item.permalink.includes("youtube.com"));
      if (!isSkippable) {
        map.set(visibleIndex, nonMetaIndex);
        nonMetaIndex++;
      }
    });
    return map;
  }, [visibleData]);

  const handlePress = useCallback(
    (visibleIndex: number) => {
      const selectedItem = visibleData[visibleIndex];
      if (!selectedItem) return;

      const isMetaType = [
        "AD_ITEM",
        "MORE_ITEM",
        "CARD_TITLE",
        "LOADING_ITEM",
      ].includes(selectedItem.type);
      const isVideoType = selectedItem.type?.toLowerCase?.().includes("video");
      const isYouTubeLink = selectedItem.permalink?.includes?.("youtube.com");

      if (isMetaType || isVideoType || isYouTubeLink) return;

      if (selectedItem.id) {
        markAsVisited(selectedItem.id);
      }

      const targetSlug = selectedItem.slug || selectedItem.permalink;
      const articleIndex = validArticles.findIndex(
        (item) => item.slug === targetSlug || item.permalink === targetSlug
      );

      setMainData(validArticles);

      if (articleIndex !== -1) {
        router.push({
          pathname: "/components/mainCategory/SwipableArticle",
          params: {
            articleIndex: articleIndex.toString(),
            categoryName: categoryKey,
          },
        });
      }
    },
    [
      router,
      categoryKey,
      validArticles,
      visibleData,
      setMainData,
      markAsVisited,
    ]
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
    ({ item, index }: { item: ArticleType; index: number }) => {
      if (!item) return null;

      const type = item.type || "default";
      const isItemVisible = visibleItemIndices.has(index);

      if (type === "CARD_TITLE") {
        return (
          <CardTitleSection
            title={item.title || ""}
            color={theme.textColor}
            textSize={textSize}
          />
        );
      }

      if (type === "MORE_ITEM") {
        return <ReadMoreButton title={item.title || "Malaysia"} />;
      }

      if (type === "AD_ITEM") {
        return <AdSlotBanner />;
      }

      const isVideo =
        type.includes("video") ||
        (item.permalink && item.permalink.includes("youtube.com")) ||
        categoryName.toLowerCase().includes("video") ||
        categoryName === "Videos";

      if (isVideo) {
        return (
          <VideoCardItem
            item={item}
            isVisible={isItemVisible}
            onPress={() => handlePress(index)}
          />
        );
      }

      const nonMetaIndex = articleIndexMap.get(index) ?? 0;

      return (
        <NewsCardItem
          item={item}
          onPress={() => handlePress(index)}
          index={nonMetaIndex}
          isVisible={isItemVisible}
        />
      );
    },
    [
      theme.textColor,
      textSize,
      categoryName,
      handlePress,
      articleIndexMap,
      visibleItemIndices,
    ]
  );

  const keyExtractor = useCallback(
    (item: ArticleType, index: number) =>
      `${item?.slug || item?.id || item?.title}-${index}`,
    []
  );

  const getItemType = useCallback((item: ArticleType) => item.type, []);

  const overrideItemLayout = useCallback(
    (layout: { size?: number; span?: number }, item: ArticleType) => {
      if (shouldUseTabletLayout) {
        layout.span = 1;
      }
      switch (item.type) {
        case "CARD_TITLE":
          layout.size = Platform.OS === "android" ? 70 : 60;
          break;
        case "MORE_ITEM":
          layout.size = Platform.OS === "android" ? 60 : 50;
          break;
        case "AD_ITEM":
          layout.size = 360;
          break;
        case "featured":
        case "video-featured":
          layout.size = shouldUseTabletLayout ? 450 : 400;
          break;
        default:
          layout.size = shouldUseTabletLayout ? 180 : 140;
      }
    },
    [shouldUseTabletLayout]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchIfNeeded(); // you already defined this in your useEffect
    setRefreshing(false);
  };

  const hasScrolledTopOnceRef = useRef(false);

  useEffect(() => {
    if (
      sectionVisible &&
      flashListRef.current &&
      !hasScrolledTopOnceRef.current &&
      dataReady
    ) {
      flashListRef.current.scrollToOffset({ offset: 0, animated: false });
      hasScrolledTopOnceRef.current = true;
    }
  }, [sectionVisible, dataReady]);

  // Early returns after all hooks
  if (!isOnline && !hasCachedData(fullArticles)) {
    return <OfflineFallback />;
  }

  if (!dataReady || (isLoading && visibleData.length === 0)) {
    return <LoadingComponent />;
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: Platform.OS === "ios" ? 80 : 30,
          backgroundColor: theme.backgroundColor,
        },
      ]}
    >
      <AnimatedFlashList
        ref={flashListRef}
        data={visibleData}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={shouldUseTabletLayout ? 180 : 140}
        getItemType={getItemType}
        overrideItemLayout={overrideItemLayout}
        scrollEventThrottle={16}
        drawDistance={500}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#999"
            colors={["#DC2626"]}
          />
        }
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          waitForInteraction: false,
        }}
        onViewableItemsChanged={handleViewableItemsChanged}
        onScroll={onScroll}
        showsVerticalScrollIndicator={false}
        numColumns={1}
        contentContainerStyle={
          shouldUseTabletLayout ? { paddingHorizontal: 0 } : undefined
        }
        disableAutoLayout={shouldUseTabletLayout}
        ListFooterComponent={() => <View style={{ height: 150 }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 108 },
  titleContainer: { paddingLeft: 18, paddingVertical: 8 },
  categoryTitle: {
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
    fontSize: 22,
  },
  readMoreButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    alignItems: "flex-end",
    marginRight: 16,
  },
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  readMoreText: {
    color: "#c62828",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
    fontWeight: Platform.OS === "android" ? "700" : undefined,
  },
  playIcon: { paddingLeft: 4, justifyContent: "center" },
  listLoader: { position: "absolute", top: 10, right: 10, zIndex: 10 },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  tabletItemContainer: {
    width: "100%",
    alignSelf: "stretch",
  },
});

export default React.memo(HomeLandingSection);
