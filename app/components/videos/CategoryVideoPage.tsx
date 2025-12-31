// CategoryVideoPage.tsx
//
// This file defines the CategoryVideos screen/component, which displays a list of videos for a given video category.
// It loads videos from context/cache, supports pull-to-refresh, and allows navigation to video details.
// The screen adapts to theme, text size, and device type (tablet/phone), and provides empty/error/loading states.
//
// Key responsibilities:
// - Load and display videos for a selected video category
// - Allow navigation to video details (video player)
// - Support pull-to-refresh and background loading
// - Show ads at intervals in the list
// - Adapt to theme, text size, and device type
//
// Usage: Render <CategoryVideos /> as the video category list screen in the app.
//
// -----------------------------------------------------------------------------

import { Refresh } from "@/app/assets/AllSVGs";
import { API_LIMIT_LOAD_MORE } from "@/app/constants/Constants";
import { cacheData, getCachedData } from "@/app/lib/cacheUtils";
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
import SmallVideoCard from "../cards/SmallVideoCard";
import TabletVideoCard from "../cards/TabletVideoCard";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { getArticleTextSize } from "../functions/Functions";

// VideoCardItem component (assuming it's not imported from elsewhere)
const VideoCardItem = React.memo(
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
    const visited = item.videoId
      ? isVisited(item.videoId)
      : item.id
      ? isVisited(item.id)
      : false;

    const { width } = useWindowDimensions();
    const isTablet = width >= 600;

    return (
      <TouchableOpacity onPress={onPress}>
        {item.type === "video-featured" ? (
          // Use TabletVideoCard for tablets, VideoCard for mobile
          isTablet ? (
            <TabletVideoCard item={item} visited={visited} onPress={onPress} />
          ) : (
            <SmallVideoCard item={item} visited={visited} onPress={onPress} />
          )
        ) : // Use TabletVideoCard for small videos on tablet too, or create TabletSmallVideoCard
        isTablet ? (
          <TabletVideoCard item={item} visited={visited} onPress={onPress} />
        ) : (
          <SmallVideoCard item={item} visited={visited} onPress={onPress} />
        )}
      </TouchableOpacity>
    );
  }
);

const AdSlotBanner = React.memo(() => <BannerAD unit="ros" />);

// Video data transformation function for playlist API
const transformVideoData = (videoData: any): any[] => {
  if (!videoData || !videoData.videos) return [];

  return videoData.videos.map((video: any, index: number) => ({
    id: video.videoId,
    title: video.title,
    excerpt: video.description,
    content: video.description,
    date: video.publishedAt,
    thumbnail:
      video.thumbnails?.maxres ||
      video.thumbnails?.high ||
      video.thumbnails?.medium ||
      video.thumbnails?.default ||
      "",
    permalink: `https://www.youtube.com/watch?v=${video.videoId}`,
    uri: `https://www.youtube.com/watch?v=${video.videoId}`,
    videoId: video.videoId,
    type: index === 0 ? "video-featured" : "video",
    duration: video.duration,
    durationSeconds: video.durationSeconds,
    statistics: video.statistics,
    channelTitle: video.channelTitle,
    tags: video.tags,
    tier: video.tier || "standard",
  }));
};

// Video data transformation function for shorts API
const transformShortsData = (videoData: any): any[] => {
  // Shorts API returns {videos: [], totalCount: number, ...}
  if (!videoData || !videoData.videos || !Array.isArray(videoData.videos)) {
    console.warn("Invalid shorts data structure:", videoData);
    return [];
  }

  return videoData.videos.map((video: any, index: number) => ({
    id: video.videoId,
    title: video.title,
    excerpt: video.description,
    content: video.description,
    date: video.publishedAt,
    thumbnail:
      video.thumbnails?.maxres ||
      video.thumbnails?.high ||
      video.thumbnails?.medium ||
      video.thumbnails?.default ||
      "",
    permalink: `https://www.youtube.com/watch?v=${video.videoId}`,
    uri: `https://www.youtube.com/watch?v=${video.videoId}`,
    videoId: video.videoId,
    type: index === 0 ? "video-featured" : "video",
    duration: video.duration,
    durationSeconds: video.durationSeconds,
    statistics: video.statistics,
    channelTitle: video.channelTitle,
    tags: video.tags,
    tier: video.tier || "standard",
  }));
};

// Video category mapping and URL generation
const getVideoApiUrl = (categoryName: string): string => {
  const FMT_URL = process.env.EXPO_PUBLIC_FMT_URL;

  // Handle special cases
  if (categoryName.toLowerCase() === "shorts") {
    return `${FMT_URL}/videos/shorts`;
  }

  // Handle Christmas special case
  if (
    categoryName.toLowerCase().includes("christmas") ||
    categoryName.toLowerCase().includes("fmt's christmas")
  ) {
    return `${FMT_URL}/videos/playlist/fmts-christmas-2025`;
  }

  // Handle other video categories with playlist endpoint
  const videoMap: { [key: string]: string } = {
    "FMT News": "fmt-news",
    "FMT Lifestyle": "fmt-lifestyle",
    "FMT Exclusive": "fmt-exclusive",
    "FMT News Capsule": "fmt-news-capsule",
    Videos: "fmt-news", // Default to fmt-news for general videos
  };

  const playlistSlug =
    videoMap[categoryName] || categoryName.toLowerCase().replace(/\s+/g, "-");
  return `${FMT_URL}/videos/playlist/${playlistSlug}`;
};

// Check if category uses shorts API
const isShortsCategory = (categoryName: string): boolean => {
  return categoryName.toLowerCase() === "shorts";
};

// Utility function to check if cached data exists
const hasCachedData = (data: any[] | undefined): boolean => {
  return Array.isArray(data) && data.length > 0;
};

const CategoryVideos = () => {
  const params = useLocalSearchParams();
  const [videos, setVideos] = useState<ArticleType[]>([]);
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

  // Fetch video data from API
  const fetchVideoData = async (categoryName: string): Promise<any[]> => {
    try {
      const apiUrl = getVideoApiUrl(categoryName);

      const separator = apiUrl.includes("?") ? "&" : "?";
      const fullUrl = `${apiUrl}${separator}limit=${API_LIMIT_LOAD_MORE}`;

      const response = await fetch(fullUrl);

      if (!response.ok) {
        throw new Error(`Video API returned ${response.status}`);
      }

      const data = await response.json();

      if (isShortsCategory(categoryName)) {
        return transformShortsData(data);
      } else {
        return transformVideoData(data);
      }
    } catch (error) {
      console.error(`Error fetching video data for ${categoryName}:`, error);
      throw error;
    }
  };

  const processVideos = useCallback(
    (videos: ArticleType[], refresh = false) => {
      if (!videos || videos.length === 0) return [];

      const processedData = [];
      let adCounter = 0;

      for (let i = 0; i < videos.length; i++) {
        processedData.push(videos[i]);
        if ((i + 1) % 5 === 0 && i < videos.length - 1) {
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

      const cacheKey = `video-${categoryName
        .toLowerCase()
        .replace(/\s+/g, "-")}`;

      try {
        // Always try to load cached data first
        const cachedData = await getCachedData(cacheKey);
        const hasCached = cachedData && hasCachedData(cachedData);

        // If we have cached data and it's not a manual refresh, use it immediately
        if (hasCached && !isRefresh) {
          setVideos(cachedData);
          const processed = processVideos(cachedData, false);
          setProcessedData(processed);

          const swipableVideos = processed.filter(
            (item) => item.type !== "AD_ITEM"
          );
          setMainData(swipableVideos);
          setLoading(false);

          // Start background fetch without showing loader
          setTimeout(() => {
            setBackgroundLoading(true);
            fetchVideoData(categoryName)
              .then((fetchedData) => {
                if (fetchedData.length > 0) {
                  setVideos(fetchedData);
                  const processed = processVideos(fetchedData, false);
                  setProcessedData(processed);

                  const swipableVideos = processed.filter(
                    (item) => item.type !== "AD_ITEM"
                  );
                  setMainData(swipableVideos);

                  // Update cache with fresh data
                  cacheData(cacheKey, fetchedData);
                }
              })
              .catch((bgError) => {
                console.error("Background video fetch error:", bgError);
              })
              .finally(() => {
                setBackgroundLoading(false);
              });
          }, 100);
          return;
        }

        // No cached data or refresh requested - show loader and fetch
        setLoading(true);

        // Fetch video data using the category name directly
        const fetchedData = await fetchVideoData(categoryName);

        if (fetchedData.length > 0) {
          setVideos(fetchedData);
          const processed = processVideos(fetchedData, isRefresh);
          setProcessedData(processed);

          const swipableVideos = processed.filter(
            (item) => item.type !== "AD_ITEM"
          );
          setMainData(swipableVideos);

          // Cache the data with a normalized key
          await cacheData(cacheKey, fetchedData);
        } else {
          console.warn(`No videos found for category: ${categoryName}`);
        }

        if (isRefresh && flashListRef.current) {
          flashListRef.current.scrollToIndex({ index: 0, animated: true });
        }
      } catch (error) {
        console.error("Error fetching video data:", error);

        // Try to load cached data as fallback
        const cachedData = getCachedData(cacheKey);
        if (cachedData && hasCachedData(cachedData)) {
          setVideos(cachedData);
          const processed = processVideos(cachedData, isRefresh);
          setProcessedData(processed);
          setMainData(processed.filter((item) => item.type !== "AD_ITEM"));
        }
      } finally {
        setLoading(false);
      }
    },
    [categoryName, processVideos, setMainData]
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
        // For videos, use videoId for consistency with VideoPlayer
        const idToMark = item.videoId || item.id;
        markAsVisited(idToMark);
      } else {
        console.warn(`No ID found for video: ${item.title}`);
      }

      isNavigatingRef.current = true;
      setTimeout(() => {
        // Navigate to in-app video player
        router.push({
          pathname: "/components/videos/VideoPlayer",
          params: {
            videoId: item.videoId,
            title: item.title,
            content: item.content || item.excerpt || "",
            date: formatTimeAgoMalaysia(item.date),
            permalink: item.permalink || item.uri,
            viewCount: item.statistics?.viewCount || item.viewCount || "0",
            durationSeconds: (
              item.contentDetails?.durationSeconds ||
              item.durationSeconds ||
              "0"
            ).toString(),
            duration: item.duration || "0:00",
            channelTitle: item.channelTitle || "FMT",
            tags:
              typeof item.tags === "string"
                ? item.tags
                : JSON.stringify(item.tags || []),
            statistics: JSON.stringify(item.statistics || {}),
            publishedAt: item.publishedAt || item.date || "",
          },
        });
      }, 100);
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
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
          <VideoCardItem
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
            {categoryName}
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
            No videos found for this category.
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
          {categoryName.toUpperCase() === "HOME" ? "HEADLINES" : categoryName}
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
        onViewableItemsChanged={handleViewableItemsChanged}
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
    fontWeight: "900",
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

export default CategoryVideos;
