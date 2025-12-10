/**
 * ArticleSearch.tsx
 *
 * This component provides an advanced article search experience.
 *
 * - **Real-time search:** Fetches and displays articles dynamically.
 * - **Search history tracking:** Saves and recalls past search queries.
 * - **Lazy loading & pagination:** Efficiently loads articles in batches.
 * - **Smooth UI transitions:** Implements a polished user experience.
 * - **Visited articles tracking:** Tracks and marks visited articles.
 * - **Ad insertion:** Inserts ads after every 5 posts like TagPosts.
 *
 * Features:
 * - **Uses Expo Router for navigation.**
 * - **Supports Dark/Light mode using ThemeContext.**
 * - **Provides a loading indicator for UX improvement.**
 * - **Tracks visited articles with visual indicators.**
 * - **Implements viewable items tracking for performance.**
 *
 * @author FMT Developers
 */

import { getRelatedPostsWithTag } from "@/app/lib/gql-queries/get-related-post-with-tag";
import { fetchSearchPosts } from "@/app/lib/gql-queries/get-search-posts";
import { storage } from "@/app/lib/storage";
import { formatTimeAgo, stripHtml } from "@/app/lib/utils";
import { DataContext } from "@/app/providers/DataProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { ArticleType } from "@/app/types/article";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ArrowLeft, ChevronLeft, History, X } from "lucide-react-native";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  InteractionManager,
  Platform,
  StyleSheet,
  Text,
  TextInput,
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
        info={stripHtml(item.excerpt) || ""}
        time={formatTimeAgo(item.dateGmt)}
        category="search"
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
        info={stripHtml(item.excerpt) || ""}
        time={formatTimeAgo(item.dateGmt)}
        category="search"
        slug={item.slug}
        posts={item}
        index={index}
        uri={item.permalink || item.uri}
        main={true}
        isVisible={isVisible}
        visited={visited}
      />
    </TouchableOpacity>
  );
};

/**
 * **SearchList Component**
 *
 * Displays **search results** fetched from the API.
 *
 * - Supports **lazy loading** for large datasets.
 * - Implements **error handling** for failed searches.
 * - Uses `fetchSearchPosts()` to retrieve data from GraphQL.
 * - Tracks visited articles and marks them appropriately.
 * - Inserts ads after every 5 posts like TagPosts.
 *
 * @param query - The search query entered by the user.
 */
const SearchList = ({ query }: { query: string }) => {
  const router = useRouter();
  const [articles, setArticles] = useState<ArticleType[]>([]);
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [visibleItemIndices, setVisibleItemIndices] = useState<Set<number>>(
    new Set()
  );
  const { theme } = useContext(ThemeContext);
  const { searchArticle, setSearchArticle, setMainData } =
    useContext(DataContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const { isVisited, markAsVisited } = useVisitedArticles();

  /**
   * Processes posts to insert ads after every 5 posts.
   * Same logic as TagPosts component.
   */
  const processPosts = useCallback((posts: ArticleType[], refresh = false) => {
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
   * Fetches and processes posts for search results.
   * - Ensures only **valid** articles are added to the list.
   * - Optimized to update state once with all articles.
   */
  const fetchAndProcessBatch = async (offset: number, size: number) => {
    try {
      const result = await fetchSearchPosts(query, null, size, offset);

      if (result?.edges?.length > 0) {
        const nodes = result.edges.map((edge: any) => edge.node);
        const enrichedArticles: ArticleType[] = [];

        for (const node of nodes) {
          try {
            let relatedPosts = [];

            if (node?.slug && node?.databaseId) {
              const relatedData = await getRelatedPostsWithTag(
                node.tags,
                node.databaseId
              );
              relatedPosts = relatedData?.post?.edges || [];
            }

            const enriched = {
              ...node,
              relatedPosts,
            };

            enrichedArticles.push(enriched);
          } catch (err) {
            console.error(`Error enriching article ${node.slug}:`, err);
          }
        }

        setArticles((prev: ArticleType[]) => [...prev, ...enrichedArticles]);
        setSearchArticle((prev: ArticleType[]) => [
          ...prev,
          ...enrichedArticles,
        ]);
        return enrichedArticles.length;
      }

      return 0;
    } catch (error) {
      console.error(`Error fetching batch at offset ${offset}:`, error);
      return 0;
    }
  };

  /**
   * Loads search results **in two batches** for better UX.
   */
  const loadPosts = async () => {
    try {
      setLoading(true);

      const firstBatchCount = await fetchAndProcessBatch(0, 12);

      InteractionManager.runAfterInteractions(async () => {
        const results = await Promise.all([
          fetchAndProcessBatch(12, 12),
          fetchAndProcessBatch(24, 12),
          fetchAndProcessBatch(36, 14),
        ]);

        const totalFetched = results.reduce((sum, count) => sum + count, 0);
        if (firstBatchCount + totalFetched === 0) {
          setAllLoaded(true);
        }
      });
    } catch (error) {
      console.error("Error in loadPosts:", error);
      setAllLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  // Update processed data when articles change
  useEffect(() => {
    if (articles.length > 0) {
      const processed = processPosts(articles);
      setProcessedData(processed);
    } else {
      setProcessedData([]);
    }
  }, [articles, processPosts]);

  /**
   * Handle article press - marks as visited and navigates to article
   * Updated to work with processed data structure
   */
  const handleArticlePress = useCallback(
    (item: ArticleType, index: number) => {
      if (item.id) {
        markAsVisited(item.id);
        // console.log(`Marked article as visited: ${item.id}`);
      } else {
        console.warn(`No ID found for article: ${item.title}`);
      }

      // Filter out ads from articles for navigation
      const filteredArticles = processedData.filter(
        (item) => item.type !== "AD_ITEM"
      );
      setMainData(filteredArticles);

      setTimeout(() => {
        router.push({
          pathname: "/components/mainCategory/SwipableArticle",
          params: {
            articleIndex: index.toString(),
            categoryName: "search",
          },
        });
      }, 100);
    },
    [processedData, markAsVisited, setMainData, router]
  );

  /**
   * Handle viewable items changed - same as TagPosts
   */
  const handleViewableItemsChanged = useCallback(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ index: number | null; item: any }>;
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

  /**
   * Render item - handles both articles and ads
   */
  const renderItem = useCallback(
    ({ item, index }: { item: any; index: number }) => {
      if (item.type === "AD_ITEM") {
        return <BannerAD unit="home" key={`ad-${index}`} />;
      }

      const isItemVisible = visibleItemIndices.has(index);

      return (
        <NewsCardItem
          item={item}
          onPress={() => handleArticlePress(item, item.displayIndex)}
          index={item.displayIndex}
          isVisible={isItemVisible}
        />
      );
    },
    [handleArticlePress, visibleItemIndices]
  );

  useEffect(() => {
    if (query) {
      setArticles([]);
      setProcessedData([]);
      setSearchArticle([]);
      setLoading(true);
      setLoadingMore(false);
      setAllLoaded(false);
      loadPosts();
    } else {
      setSearchArticle([]);
      setProcessedData([]);
    }
  }, [query]);

  if (loading && processedData.length === 0) {
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

  if (!loading && processedData.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.backgroundColor },
        ]}
      >
        <Text
          style={[
            styles.noResultsText,
            {
              fontSize: getArticleTextSize(20, textSize),
              color: theme.textColor,
            },
          ]}
        >
          No Results
        </Text>
        <Text
          style={[
            styles.queryText,
            {
              fontSize: getArticleTextSize(16, textSize),
              color: theme.textColor,
            },
          ]}
        >
          for "{query}"
        </Text>
      </View>
    );
  }

  return (
    <FlashList
      data={processedData}
      estimatedItemSize={120}
      keyExtractor={(item, index) => item.id || `item-${index}`}
      renderItem={renderItem}
      onViewableItemsChanged={handleViewableItemsChanged}
      viewabilityConfig={{
        itemVisiblePercentThreshold: 50,
      }}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      onEndReachedThreshold={0.5}
      contentContainerStyle={{
        backgroundColor: theme.backgroundColor,
        paddingBottom: 20,
      }}
    />
  );
};

/**
 * **Main ArticleSearch Component**
 *
 * - Handles **search input** and history tracking.
 * - Displays search results dynamically.
 * - Supports **light/dark mode**.
 * - Integrates visited articles functionality.
 */
const ArticleSearch = () => {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  const { theme } = useContext(ThemeContext);
  const isDarkMode = theme.backgroundColor === "#000000";
  const { textSize } = useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();
  /**
   * Loads **search history** from mmkv on mount.
   */
  useEffect(() => {
    const loadHistory = async () => {
      const history = await storage.getString("searchHistory");
      setSearchHistory(history ? JSON.parse(history) : []);
    };
    loadHistory();
  }, []);

  // Save a new search term to mmkv
  const saveSearchQuery = async () => {
    if (query.trim() && !searchHistory.includes(query.trim())) {
      const updatedHistory = [query.trim(), ...searchHistory];
      setSearchHistory(updatedHistory);
      await storage.set("searchHistory", JSON.stringify(updatedHistory));
    }
  };

  // Handle search submission
  const handleSearchSubmit = () => {
    if (query.trim()) {
      saveSearchQuery();
      setShowResults(true);
    }
  };

  // Handle selecting a history item
  const handleHistorySelect = (item: string) => {
    setQuery(item);
    setShowResults(true);
    saveSearchQuery();
  };

  // Clear the search input
  const handleClear = () => {
    setQuery("");
    setShowResults(false);
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.backgroundColor, paddingTop: insets.top },
      ]}
    >
      {/* Search Bar */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundColor,
            ...(isDarkMode
              ? {}
              : {
                  backgroundColor: "#fff",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.12,
                  shadowRadius: 4,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(0, 0, 0, 0.12)",
                  borderTopColor: "transparent",
                }),
            zIndex: 10,
          },
        ]}
      >
        <View style={{ zIndex: 10 }}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            {Platform.OS === "ios" ? (
              <ChevronLeft size={34} color="#DC2626" />
            ) : (
              <ArrowLeft size={24} color="#DC2626" />
            )}
          </TouchableOpacity>
        </View>

        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search"
          onSubmitEditing={handleSearchSubmit}
          style={[
            styles.searchInput,
            {
              backgroundColor: theme.backgroundColor,
              color: theme.textColor,
              fontSize: getArticleTextSize(20, textSize),
            },
          ]}
          placeholderTextColor={
            theme.backgroundColor === "#000000" ? "#9b9b9b" : "#747474"
          }
        />

        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <X size={24} color="#c62828" />
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {showResults ? (
        <SearchList query={query} />
      ) : (
        <View
          style={[
            styles.historyContainer,
            {
              backgroundColor:
                theme.backgroundColor === "#000000"
                  ? "#111111"
                  : theme.backgroundColor,
            },
          ]}
        >
          <FlashList
            data={searchHistory}
            keyExtractor={(item, index) => index.toString()}
            estimatedItemSize={120}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleHistorySelect(item)}
                style={[
                  styles.historyItem,
                  {
                    backgroundColor: theme.backgroundColor,
                    paddingHorizontal: 16,
                  },
                ]}
              >
                <History size={20} color={isDarkMode ? "#9b9b9b" : "#747474"} />
                <Text
                  style={[
                    styles.historyText,
                    {
                      color: isDarkMode ? "#bbb" : "#333",
                      fontSize: getArticleTextSize(16, textSize),
                    },
                  ]}
                >
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text
                style={[
                  styles.emptyText,
                  { color: isDarkMode ? "#888" : "#999" },
                ]}
              >
                No search history yet.
              </Text>
            }
            onEndReachedThreshold={0.5}
            contentContainerStyle={{
              backgroundColor: theme.backgroundColor,
              paddingBottom: 20,
            }}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  backButton: {
    padding: 8,
  },
  searchInput: {
    flex: 1,
    marginHorizontal: 8,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  clearButton: {
    padding: 8,
  },
  historyContainer: {
    flex: 1,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  historyText: {
    marginLeft: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noResultsText: {
    fontWeight: "bold",
  },
  queryText: {
    marginTop: 8,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ArticleSearch;
