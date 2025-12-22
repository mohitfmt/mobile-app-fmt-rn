/**
 * TagPosts.tsx
 *
 * A component that **fetches and displays articles tagged with a specific keyword**.
 *
 * - **Uses GraphQL API** to retrieve related posts.
 * - **Supports lazy loading** for improved performance.
 * - **Implements a refreshable UI** with animations.
 * - **Integrates ThemeContext** for dark/light mode support.
 *
 * Features:
 * - **Expo Router Navigation** for smooth page transitions.
 * - **Animated refresh icon** for improved UX.
 * - **Dynamic text resizing** via GlobalSettingsContext.
 *
 * @author FMT Developers
 */

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
  Easing,
  useWindowDimensions,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { getArticleTextSize } from "../functions/Functions";
import { Animated } from "react-native";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import SmallNewsCard from "../cards/SmallNewsCard";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { LoadingIndicator } from "../functions/ActivityIndicator";
import { DataContext } from "@/app/providers/DataProvider";
import { Post } from "@/app/types/tag";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import { getRelatedPostsWithTag } from "@/app/lib/gql-queries/get-related-post-with-tag";
import { getRelatedTagPosts } from "@/app/lib/gql-queries/get-related-tag-posts";
import TagHeader from "./TagHeader";
import { FlashList } from "@shopify/flash-list";
import BannerAD from "../ads/Banner";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { TouchableOpacity } from "react-native";
import TabletNewsCard from "../cards/TabletNewsCard";
import NewsCard from "../cards/NewsCard";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/**
 * **Main TagPosts Component**
 *
 * - Fetches and displays **articles related to a specific tag**.
 * - Supports **lazy loading** for pagination.
 * - Implements **smooth animations** and **refresh control**.
 * - Caches articles by tag to prevent stale data on back navigation.
 * - Inserts ads after every 5 posts.
 */
const TagPosts = () => {
  const params = useLocalSearchParams();
  const [tagCache, setTagCache] = useState<Record<string, Post[]>>({});
  const [loading, setLoading] = useState(true);
  const [allLoaded, setAllLoaded] = useState(false);
  const rotation = useState(new Animated.Value(0))[0];
  const { theme } = useContext(ThemeContext);
  const { setTagPosts } = useContext(DataContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { markAsVisited, isVisited } = useVisitedArticles();
  const [visibleItemIndices, setVisibleItemIndices] = useState<Set<number>>(
    new Set()
  );
  const currentTag = params.tagName as string;
  const [processedData, setProcessedData] = useState<any[]>([]);
  const insets = useSafeAreaInsets();
  const isNavigatingRef = useRef<boolean>(false);
  /**
   * Processes posts to insert ads after every 5 posts.
   */
  const processPosts = useCallback((posts: Post[], refresh = false) => {
    if (!posts || posts.length === 0) return [];

    const processedData: any[] = [];
    let postIndex = 0;
    let adIndex = 1;

    for (let i = 0; i < posts.length; i++) {
      processedData.push({
        ...posts[i],
        displayIndex: postIndex,
      });
      postIndex++;

      if ((i + 1) % 5 === 0 && i < posts.length - 1) {
        processedData.push({
          type: "AD_ITEM",
          id: `ad-${adIndex}-${refresh ? "refresh" : "initial"}`,
          adIndex: adIndex,
        });
        adIndex++;
      }
    }

    return processedData;
  }, []);

  /**
   * Fetches all posts for a specific tag at once.
   */
  const fetchAllPosts = async (tag: string) => {
    try {
      // Fetch all posts at once (increase the limit as needed)
      const { posts } = await getRelatedTagPosts(tag, null, 50); // Adjust limit as needed

      if (!posts.length) {
        return [];
      }

      const enrichedPosts = await Promise.all(
        posts.map(async (post: any) => {
          try {
            if (!post.slug || !post.databaseId)
              return { ...post, relatedPosts: [] };

            const relatedData = await getRelatedPostsWithTag(
              post.tags,
              post.databaseId
            );
            const relatedPosts =
              relatedData?.post?.edges?.map((edge: any) => edge.node) || [];

            return {
              ...post,
              relatedPosts: relatedPosts,
            };
          } catch (error) {
            console.error(`Error fetching related for ${post.slug}`, error);
            return { ...post, relatedPosts: [] };
          }
        })
      );

      // Update cache
      setTagCache((prev) => ({
        ...prev,
        [tag]: enrichedPosts,
      }));

      // Update DataContext
      setTagPosts(tag, enrichedPosts);

      return enrichedPosts;
    } catch (error) {
      console.error(`Error fetching posts for tag ${tag}:`, error);
      return [];
    }
  };

  /**
   * Loads all articles for the current tag.
   */
  const loadPosts = async () => {
    if (!currentTag) return;

    try {
      setLoading(true);
      const posts = await fetchAllPosts(currentTag);

      if (posts.length === 0) {
        // setProcessedData([]);
        const retry = await fetchAllPosts(currentTag);
        if (retry.length === 0) {
          setProcessedData([]);
        }
      }
    } catch (error) {
      console.error("Error loading posts:", error);
      setProcessedData([]);
    } finally {
      setLoading(false);
    }
  };

  // Update processed data when cache changes for current tag
  useEffect(() => {
    if (currentTag && tagCache[currentTag]) {
      const processed = processPosts(tagCache[currentTag]);
      setProcessedData(processed);
    } else if (currentTag) {
      setProcessedData([]);
    }
  }, [tagCache, currentTag, processPosts]);

  useEffect(() => {
    if (currentTag) {
      if (!tagCache[currentTag] || tagCache[currentTag].length === 0) {
        setProcessedData([]);
        loadPosts();
      } else {
        setLoading(false);
      }
    }
  }, [currentTag]);

  /**
   * Handles refresh animation and reloads posts for the current tag.
   */
  const startRotationSequence = () => {
    if (!currentTag || isRefreshing) return;
    setIsRefreshing(true);
    setLoading(true);
    setTagCache((prev) => ({
      ...prev,
      [currentTag]: [],
    }));
    setAllLoaded(false);

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
      rotation.setValue(0);
    });

    loadPosts().finally(() => setIsRefreshing(false));
  };

  const handlePress = useCallback(
    (item: any, index: number) => {
      if (isNavigatingRef.current) return; // 🔒 block multiple taps

      if (item.id) {
        // console.log('Calling markAsVisited for article ID:', item.id);
        markAsVisited(item.id);
      } else {
        console.warn(`No ID found for article: ${item.title}`);
      }

      const processedData = processPosts(tagCache[currentTag] || []);
      isNavigatingRef.current = true;
      setTagPosts(
        currentTag,
        processedData.filter((item) => item.type !== "AD_ITEM")
      );

      setTimeout(() => {
        router.push({
          pathname: "/components/articles/Article",
          params: {
            index: index,
            category: "tag",
            tagName: currentTag,
          },
        });
      }, 100);
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [
      currentTag,
      markAsVisited,
      setTagPosts,
      tagCache,
      processPosts,
      router,
      isNavigatingRef,
    ]
  );

  const handleViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null; item: Post }>;
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
      if (item.type === "AD_ITEM") {
        return <BannerAD unit="home" key={`ad-${index}`} />;
      }

      const isItemVisible = visibleItemIndices.has(index);
      //   console.log(`Rendering item ${index}: ID = ${item.id}, Title = ${item.title}, Visited = ${item.id ? isVisited(item.id) : false}`);

      return (
        <NewsCardItem
          item={{ ...item, tagName: currentTag, permalink: item.uri }}
          onPress={() => handlePress(item, item.displayIndex)}
          index={item.displayIndex}
          isVisible={isItemVisible}
        />
      );
    },
    [currentTag, handlePress, visibleItemIndices, isVisited]
  );

  const rotationInterpolate = rotation.interpolate({
    inputRange: [0, 3],
    outputRange: ["0deg", "1080deg"],
  });

  if ((loading && !tagCache[currentTag]?.length) || isRefreshing) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      >
        <View style={styles.contentWrapper}>
          <LoadingIndicator />
        </View>
      </View>
    );
  }

  // Show no results if not loading and no processed data
  if (!loading && processedData.length === 0) {
    return (
      <View style={{ backgroundColor: theme.backgroundColor, flex: 1 }}>
        <TagHeader
          tagName={currentTag}
          onRefresh={startRotationSequence}
          textSize={textSize}
        />
        <View
          style={[styles.container, { backgroundColor: theme.backgroundColor }]}
        >
          <Text
            style={[
              styles.noResultsText,
              {
                color: theme.textColor,
                fontSize: getArticleTextSize(20, textSize),
              },
            ]}
          >
            No Results
          </Text>
          <Text style={[styles.queryText, { color: theme.textColor }]}>
            for "{currentTag}"
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={{
        backgroundColor: theme.backgroundColor,
        flex: 1,
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <TagHeader
        tagName={currentTag}
        onRefresh={startRotationSequence}
        textSize={textSize}
      />
      <FlashList
        data={processPosts(tagCache[currentTag] || [])}
        estimatedItemSize={120}
        keyExtractor={(item, index) => item.id || `item-${index}`}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        renderItem={renderItem}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{
          backgroundColor: theme.backgroundColor,
          paddingBottom: 20,
        }}
      />
    </View>
  );
};

// styles
const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { padding: 8 },
  queryText: { textAlign: "center", marginTop: 8 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  relatedTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
    textTransform: "uppercase",
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
});

export default TagPosts;
