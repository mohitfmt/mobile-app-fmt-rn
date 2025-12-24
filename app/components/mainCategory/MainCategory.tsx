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
import { categoriesNavigation } from "@/app/constants/Constants";
import { cacheData, getCachedData } from "@/app/lib/cacheUtils";
import {
  buildContentSection,
  fetchPropertyTabData,
  fetchTabCategoryData,
  fetchVideosData,
  formatTimeAgo,
  formatTimeAgoMalaysia,
  getCategoryData,
} from "@/app/lib/utils";
import { DataContext } from "@/app/providers/DataProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { useLandingData } from "@/app/providers/LandingProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { ArticleType } from "@/app/types/article";
import { FlashList } from "@shopify/flash-list";
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
    const isMetaType = [
      "AD_ITEM",
      "MORE_ITEM",
      "CARD_TITLE",
      "LOADING_ITEM",
    ].includes(item.type);
    if (isMetaType) return false;

    if (!item.id || !item.title) return false;

    const hasThumb = !!(
      item?.thumbnail || item?.featuredImage?.node?.sourceUrl
    );
    if (!hasThumb) return false;

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

const ReadMoreButton = React.memo(
  ({ title, item }: { title: string; item: any }) => {
    const router = useRouter();
    const { textSize } = useContext(GlobalSettingsContext);

    const handlePress = useCallback(() => {
      router.push({
        pathname: item.isVideo
          ? "/components/videos/CategoryVideoPage"
          : "/components/categoryPage/CategoryPage",
        params: { CategoryName: title },
      });
    }, [router, item.isVideo, title]);

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
  }
);

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
              permalink={item?.permalink || item?.uri}
              content={item.content}
              date={formatTimeAgo(item?.date)}
              thumbnail={
                item?.thumbnail || item?.featuredImage?.node?.sourceUrl
              }
              type="video-featured"
              onPress={onPress}
            />
          ) : (
            <VideoCard
              title={item.title}
              permalink={item?.permalink || item?.uri}
              content={item.content}
              date={formatTimeAgo(item?.date)}
              thumbnail={
                item?.thumbnail || item?.featuredImage?.node?.sourceUrl
              }
              type="video-featured"
              visited={visited}
            />
          )
        ) : shouldUseTabletLayout ? (
          <TabletVideoCard
            title={item.title}
            permalink={item?.permalink || item?.uri}
            content={item.content}
            date={formatTimeAgo(item?.date)}
            thumbnail={item?.thumbnail || item?.featuredImage?.node?.sourceUrl}
            type="video-small"
            onPress={onPress}
          />
        ) : (
          <SmallVideoCard
            title={item.title}
            permalink={item?.permalink || item?.uri}
            content={item.content}
            date={formatTimeAgo(item?.date)}
            thumbnail={item?.thumbnail || item?.featuredImage?.node?.sourceUrl}
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
            id={item?.id || item?.databaseId}
            imageUri={item?.thumbnail || item?.featuredImage?.node?.sourceUrl}
            heading={item.title}
            info={item?.excerpt}
            time={formatTimeAgoMalaysia(item.date)}
            category={
              item?.featuredCategory ||
              item?.categories?.edges?.[0]?.node?.name ||
              "Malaysia"
            }
            slug={(item as any)?.slug}
            posts={item}
            index={index}
            uri={(item as any)?.permalink || (item as any)?.uri}
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
          id={item?.id || item?.databaseId}
          imageUri={item?.thumbnail || item?.featuredImage?.node?.sourceUrl}
          heading={item.title}
          info={item?.excerpt}
          time={formatTimeAgoMalaysia(item.date)}
          category={
            item?.featuredCategory ||
            item?.categories?.edges?.[0]?.node?.name ||
            "Malaysia"
          }
          slug={item?.slug}
          posts={item}
          index={index}
          uri={item?.permalink || item?.uri}
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
  const isNavigatingRef = useRef<boolean>(false);

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

  const fetchIfNeeded = async () => {
    try {
      if (!sectionVisible || isCategoryLoading) return;
      // Check cooldown
      const now = Date.now();
      const lastFetch = refreshCooldownMap[categoryKey] || 0;
      if (now - lastFetch < 60000) {
        //skip fetch for at least 1 minute on tab change to avoid too many api calls
        return;
      }

      // Always try to load cached data first
      const cachedData = await getCachedData(categoryKey);

      // If we have cached data, use it immediately
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

        // If offline, stop here - don't attempt any API calls
        if (!isOnline) {
          return;
        }
      } else if (!isOnline) {
        // No cached data and offline - show offline fallback
        console.warn(`Offline and no cached data for ${categoryKey}`);
        setDataReady(true);
        return;
      }

      // Only proceed with API calls if online
      if (!isOnline) {
        return;
      }

      refreshCooldownMap[categoryKey] = now;
      setIsCategoryLoading(true);

      if (categoryKey === "home-landing") {
        loadData();
      } else {
        loadTabCategoryData();
      }
    } catch (err) {
      console.error(`Failed to fetch data for ${categoryKey}:`, err);
    } finally {
      setIsCategoryLoading(false);
    }
  };

  const loadData = async () => {
    try {
      if (!checkOnlineStatus()) return null;
      const response = await getCategoryData();
      const props = (response as any)?.props || {};

      const addType = (node: any, idx: number, section: string) => {
        if (section === "videos") {
          return { ...node, type: idx === 0 ? "video-featured" : "video" };
        }
        return { ...node, type: idx === 0 ? "featured" : "default" };
      };

      const hero = Array.isArray(props.heroPosts)
        ? props.heroPosts.map((n: any, i: number) =>
            addType(n, i, "super-highlight")
          )
        : [];

      const built = [
        ...hero,

        ...buildContentSection({
          variant: "highlight",
          list: props.highlightPosts,
          key: "highlight",
        }),

        ...buildContentSection({
          title: "Top News",
          list: props.topNewsPosts,
          key: "top-news",
        }),

        ...buildContentSection({
          title: "Berita Utama",
          list: props.beritaPosts,
          key: "berita",
        }),

        ...buildContentSection({
          title: "Videos",
          list: props.videoPosts,
          key: "videos",
          isVideo: true,
        }),

        ...buildContentSection({
          title: "Opinion",
          list: props.opinionPosts,
          key: "opinion",
        }),

        ...buildContentSection({
          title: "World",
          list: props.worldPosts,
          key: "world",
        }),

        ...buildContentSection({
          title: "Lifestyle",
          list: props.leisurePosts,
          key: "lifestyle",
        }),

        ...buildContentSection({
          title: "Business",
          list: props.businessPosts,
          key: "business",
        }),

        ...buildContentSection({
          title: "Sports",
          list: props.sportsPosts,
          key: "sports",
        }),
      ];

      if (categoryKey === "home-landing") {
        setLandingData((prev) => ({ ...prev, [categoryKey]: built }));
        const filtered = filterValidArticles(built);
        if (filtered.length > 0) {
          setFilteredLandingData((prev) => ({
            ...prev,
            [categoryKey]: filtered,
          }));
        }
        queueCacheUpdate(categoryKey, built);
        await cacheData(categoryKey, built);
        setDataReady(true);
      }
    } catch (err) {
      console.error("Failed to build landing from graphql props:", err);
    }
  };

  const loadVideosData = async () => {
    try {
      if (!checkOnlineStatus()) return null;
      const videosData = await fetchVideosData();

      setLandingData((prev) => ({
        ...prev,
        [categoryKey]: videosData,
      }));

      const filtered = filterValidArticles(videosData);
      if (filtered.length > 0) {
        setFilteredLandingData((prev) => ({
          ...prev,
          [categoryKey]: filtered,
        }));
      }

      queueCacheUpdate(categoryKey, videosData);
      await cacheData(categoryKey, videosData);
      setDataReady(true);
    } catch (err) {
      console.error("Failed to load videos data:", err);
    }
  };

  const loadPropertyData = async () => {
    try {
      if (!checkOnlineStatus()) return null;
      const propertyData = await fetchPropertyTabData();

      setLandingData((prev) => ({
        ...prev,
        [categoryKey]: propertyData,
      }));

      const filtered = filterValidArticles(propertyData);
      if (filtered.length > 0) {
        setFilteredLandingData((prev) => ({
          ...prev,
          [categoryKey]: filtered,
        }));
      }

      queueCacheUpdate(categoryKey, propertyData);
      await cacheData(categoryKey, propertyData);
      setDataReady(true);
    } catch (err) {
      console.error("Failed to load property data:", err);
    }
  };

  const loadTabCategoryData = async () => {
    try {
      if (!checkOnlineStatus()) return null;

      const tabPath = categoryName.toLowerCase();
      if (tabPath === "home") return;

      // Handle videos tab separately
      if (tabPath === "videos") {
        await loadVideosData();
        return;
      }

      // Handle property tab separately
      if (tabPath === "property") {
        await loadPropertyData();
        return;
      }

      const config = categoriesNavigation.find(
        (c) => c.path.toLowerCase() === tabPath
      );
      if (!config) return;

      const sections = await fetchTabCategoryData(config);

      setLandingData((prev) => ({
        ...prev,
        [categoryKey]: sections,
      }));

      const filtered = filterValidArticles(sections);
      if (filtered.length > 0) {
        setFilteredLandingData((prev) => ({
          ...prev,
          [categoryKey]: filtered,
        }));
      }

      queueCacheUpdate(categoryKey, sections);
      await cacheData(categoryKey, sections);
      setDataReady(true);
    } catch (err) {
      console.error("Failed to load tab category data:", err);
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
      if (isNavigatingRef.current) return; // 🔒 block multiple taps

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

      isNavigatingRef.current = true;

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

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
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
        return <ReadMoreButton title={item.title || "Malaysia"} item={item} />;
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
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : "900",
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
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
    fontWeight: Platform.OS === "android" ? "700" : "700",
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
