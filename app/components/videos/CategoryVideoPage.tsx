import { Refresh } from "@/app/assets/AllSVGs";
import { cacheData, getCachedData, hasCachedData } from "@/app/lib/cacheUtils";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { useLandingData } from "@/app/providers/LandingProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronLeft } from "lucide-react-native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Alert,
  Animated,
  Easing,
  FlatList,
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
    isVisible,
    onPress,
  }: {
    item: any;
    isVisible: boolean;
    onPress: () => void;
  }) => {
    const { width } = useWindowDimensions();
    const isTablet = width >= 600;

    return (
      <TouchableOpacity onPress={onPress}>
        {item.type === "video-featured" ? (
          // Use TabletVideoCard for tablets, VideoCard for mobile
          isTablet ? (
            <TabletVideoCard
              title={item.title}
              permalink={item.permalink}
              content={item.content}
              date={formatTimeAgoMalaysia(item.date)}
              thumbnail={item.thumbnail}
              type="video-featured"
              onPress={onPress}
              // visited={visited} // Add this if TabletVideoCard supports visited state
            />
          ) : (
            <SmallVideoCard
              title={item.title}
              permalink={item.permalink}
              content={item.content}
              date={formatTimeAgoMalaysia(item.date)}
              thumbnail={item.thumbnail}
              // isVisible={isVisible}
            />
          )
        ) : // Use TabletVideoCard for small videos on tablet too, or create TabletSmallVideoCard
        isTablet ? (
          <TabletVideoCard
            title={item.title}
            permalink={item.permalink}
            content={item.content}
            date={formatTimeAgoMalaysia(item.date)}
            thumbnail={item.thumbnail}
            type="video-small"
            onPress={onPress}
            // visited={visited}
          />
        ) : (
          <SmallVideoCard
            title={item.title}
            permalink={item.permalink}
            content={item.content}
            date={formatTimeAgoMalaysia(item.date)}
            thumbnail={item.thumbnail}
            // isVisible={isVisible}
          />
        )}
      </TouchableOpacity>
    );
  }
);

// ⚠️ This is NOT a hook. It's a plain JS object, safe to define outside.
const categoryRefreshCooldownMap: Record<string, number> = {};

const CategoryVideos = () => {
  const params = useLocalSearchParams();
  const { CategoryName = "videos" } = params;

  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const { landingData, refreshCategoryData } = useLandingData();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const rotation = useState(new Animated.Value(0))[0];

  // Mapping for video categories to landingData keys
  const categoryMapping: Record<string, string> = {
    VIDEOS: "fmt-news",
    "FMT NEWS": "fmt-news",
    "FMT LIFESTYLE": "fmt-lifestyle",
    "FMT EXCLUSIVE": "fmt-exclusive",
    "FMT NEWS CAPSULE": "fmt-news-capsule",
  };

  // Function to normalize category key
  const getNormalizedCategoryKey = (categoryName: string) => {
    const upperCaseName = categoryName.toUpperCase();
    return (
      categoryMapping[upperCaseName] ||
      categoryName.toLowerCase().replace(/\s+/g, "-")
    );
  };

  // Process videos to insert ads after every 5 videos
  const processVideos = useCallback((videos: any[], refresh = false) => {
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
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);

      const normalizedKey = getNormalizedCategoryKey(CategoryName.toString());

      let rawVideos = landingData[normalizedKey] || [];

      // Try from cache if context is empty
      if (!hasCachedData(rawVideos)) {
        const cached = await getCachedData(normalizedKey);
        if (hasCachedData(cached)) {
          // console.log(`📦 Loaded cached data for ${normalizedKey}`);
          rawVideos = cached!;
        }
      }

      // Filter valid video entries
      const valid = rawVideos.filter((item) => {
        if (item.type === "AD_ITEM") return true;
        return item?.type?.includes("video") && item?.title && item?.thumbnail;
      });

      // Save to cache if context had valid data
      if (hasCachedData(valid)) {
        cacheData(normalizedKey, valid);
      }

      const processedVideos = processVideos(valid);
      setVideos(processedVideos);
    } catch (error) {
      Alert.alert("Error", "Failed to load videos.");
    } finally {
      setLoading(false);
    }
  };

  //  NEW: will re-run when landingData updates
  useEffect(() => {
    fetchVideos();
  }, [CategoryName, landingData]);

  useEffect(() => {
    if (!params.CategoryName) return;

    const key = getNormalizedCategoryKey(params.CategoryName.toString());
    const now = Date.now();
    const lastRefresh = categoryRefreshCooldownMap[key] || 0;

    if (now - lastRefresh >= 10 * 1000) {
      // console.log(`🔁 Refreshing "${key}"`);
      refreshCategoryData(key);
      categoryRefreshCooldownMap[key] = now;
    } else {
      const remaining = Math.ceil((10 * 1000 - (now - lastRefresh)) / 1000);
      // console.log(`⏳ Skipped refresh for "${key}" (wait ${remaining}s)`);
    }
  }, [CategoryName]);

  const startRotationSequence = () => {
    fetchVideos();
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
  };

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  const handleVideoPress = (item: any) => {
    // Navigate to video detail or play video
    if (item.permalink) {
      // Handle navigation to video detail
    }
  };

  const renderItem = ({ item, index }: any) => {
    if (item.type === "AD_ITEM") {
      return <BannerAD unit="home" key={`ad-${index}`} />;
    }

    return (
      <VideoCardItem
        key={`video-${item.id || index}`}
        item={item}
        isVisible={true} // You can implement visibility logic if needed
        onPress={() => handleVideoPress(item)}
      />
    );
  };

  if (loading || videos.length === 0) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      >
        <LoadingIndicator />
      </View>
    );
  }

  return (
    <>
      <View
        style={{
          backgroundColor: theme.backgroundColor,
          paddingTop: insets.top,
        }}
      >
        <View
          style={[
            styles.header,
            {
              backgroundColor: theme.backgroundColor,
              paddingHorizontal: isTablet ? 16 : 10,
            },
          ]}
        >
          {/* Back Button */}
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
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

        {/* FlatList of Videos and ADs */}
        <FlatList
          data={videos}
          keyExtractor={(item, index) => `${item?.id || item?.slug || index}`}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            backgroundColor: theme.backgroundColor,
            paddingBottom: Platform.OS === "ios" ? 40 : 40,
          }}
          ListFooterComponent={<View style={{ height: 10 }} />}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
  },
  iconContainer: { width: 40, alignItems: "center" },
  relatedTitle: {
    flex: 1,
    textAlign: "center",
    textTransform: "uppercase",
    fontWeight: "900",
  },
  loadingText: { marginTop: 8, fontSize: 14 },
  backButton: {
    padding: 8,
  },
});

export default CategoryVideos;
