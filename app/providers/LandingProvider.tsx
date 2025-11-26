// LandingProvider.tsx
//
// This file provides the main data context for the app's landing and category pages.
// It fetches, caches, and manages news/category/video data from S3 feeds, and exposes
// this data (and loading state) to the rest of the app via React Context. It also
// handles cache updates, prioritization of data loading, and provides hooks for
// refreshing or updating specific categories. This provider is used at the top level
// of the app to ensure all components have access to the latest landing/category data.
//
// Key responsibilities:
// - Fetch landing/category/video data from S3 feeds (with priority groups)
// - Cache data locally for offline/fast access (with 24-hour batch updates)
// - Expose loading state and refresh functions
// - Filter and normalize data for use in UI
// - Provide a hook (useLandingData) for easy access in components
//
// Usage: Wrap your app with <LandingDataProvider> to provide landing data context.
//
// -----------------------------------------------------------------------------

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import axios, { AxiosError } from "axios";
import * as FileSystem from "expo-file-system/legacy";
import { ThemeContext } from "./ThemeProvider";

// Type Definitions
// Feed: Represents a single feed source (S3 JSON endpoint) with a priority.
interface Feed {
  key: string;
  url: string;
  priority?: "high" | "medium" | "low";
}

// LandingDataType: Maps category keys to arrays of articles/items.
interface LandingDataType {
  [category: string]: any[];
}

// CachedData: Structure for storing cached landing data and timestamps.
interface CachedData {
  data: LandingDataType;
  timestamp: number;
  lastCacheUpdate?: number; // Track when cache was last updated
}

// LandingContextType: The shape of the context value provided to consumers.
interface LandingContextType {
  landingData: LandingDataType;
  filteredLandingData: LandingDataType;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  highPriorityLoading: boolean;
  mediumPriorityLoading: boolean;
  lowPriorityLoading: boolean;
  priorityDataLoaded: boolean;
  mainLandingData: any[];
  setMainLandingData: React.Dispatch<React.SetStateAction<any[]>>;

  setFilteredLandingData: React.Dispatch<React.SetStateAction<LandingDataType>>;
  setLandingData: React.Dispatch<React.SetStateAction<LandingDataType>>;

  queueCacheUpdate: (categoryKey: string, data: any[]) => void;

  refreshLandingPages: () => Promise<void>;
  refreshCategoryData: (categoryKey: string) => Promise<void>;
}

// Context
// LandingDataContext provides all landing/category data and related state/functions.
const LandingDataContext = createContext<LandingContextType>({
  landingData: {},
  filteredLandingData: {},
  isLoading: true,
  setIsLoading: () => {},
  highPriorityLoading: true,
  mediumPriorityLoading: true,
  lowPriorityLoading: true,
  priorityDataLoaded: false,
  mainLandingData: [],
  setMainLandingData: () => {},
  setFilteredLandingData: () => {},
  setLandingData: () => {},
  queueCacheUpdate: () => {},
  refreshLandingPages: async () => {},
  refreshCategoryData: async () => {},
});

// Constants
// S3: S3 bucket domain (from env)
const S3 = process.env.EXPO_PUBLIC_S3;
// CACHE_PATH: Where landing data is cached locally
const CACHE_PATH = `${FileSystem.documentDirectory}landingDataCache.json`;
// CACHE_EXPIRY_MS: How long cache is considered fresh (1 hour)
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
// CACHE_UPDATE_INTERVAL_MS: How often to batch-write cache (24 hours)
const CACHE_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours for cache updates

// Updated Feeds with S3 URLs
// landingFeeds: List of all landing/category feeds, grouped by priority.
export const landingFeeds: Feed[] = [
  // HIGH PRIORITY - Main landing pages

  {
    key: "home-landing",
    url: `https://${S3}/json/app/landing/home-landing.json`,
    priority: "high",
  },
  {
    key: "news-landing",
    url: `https://${S3}/json/app/landing/news-landing.json`,
    priority: "high",
  },
  {
    key: "berita-landing",
    url: `https://${S3}/json/app/landing/berita-landing.json`,
    priority: "high",
  },
  {
    key: "opinion-landing",
    url: `https://${S3}/json/app/landing/opinion-landing.json`,
    priority: "high",
  },
  {
    key: "business-landing",
    url: `https://${S3}/json/app/landing/business-landing.json`,
    priority: "high",
  },
  {
    key: "world-landing",
    url: `https://${S3}/json/app/landing/world-landing.json`,
    priority: "high",
  },
  {
    key: "sports-landing",
    url: `https://${S3}/json/app/landing/sports-landing.json`,
    priority: "high",
  },
  {
    key: "property-landing",
    url: `https://${S3}/json/app/landing/property-landing.json`,
    priority: "high",
  },
  {
    key: "lifestyle-landing",
    url: `https://${S3}/json/app/landing/lifestyle-landing.json`,
    priority: "high",
  },
  {
    key: "videos-landing",
    url: `https://${S3}/json/app/landing/videos-landing.json`,
    priority: "high",
  },
  // MEDIUM PRIORITY - Category lists
  {
    key: "malaysia",
    url: `https://${S3}/json/app/list/malaysia.json`,
    priority: "medium",
  },
  {
    key: "borneo+",
    url: `https://${S3}/json/app/list/borneo.json`,
    priority: "medium",
  },
  {
    key: "all-berita",
    url: `https://${S3}/json/app/list/all-berita.json`,
    priority: "medium",
  },
  {
    key: "tempatan",
    url: `https://${S3}/json/app/list/tempatan.json`,
    priority: "medium",
  },
  // LOW PRIORITY - Detailed category lists
  {
    key: "dunia",
    url: `https://${S3}/json/app/list/dunia.json`,
    priority: "low",
  },
  {
    key: "pandangan",
    url: `https://${S3}/json/app/list/pandangan.json`,
    priority: "low",
  },
  {
    key: "all-opinion",
    url: `https://${S3}/json/app/list/all-opinion.json`,
    priority: "low",
  },
  {
    key: "column",
    url: `https://${S3}/json/app/list/column.json`,
    priority: "low",
  },
  {
    key: "all-world",
    url: `https://${S3}/json/app/list/world.json`,
    priority: "low",
  },
  {
    key: "editorial",
    url: `https://${S3}/json/app/list/editorial.json`,
    priority: "low",
  },
  {
    key: "letter",
    url: `https://${S3}/json/app/list/letters.json`,
    priority: "low",
  },
  {
    key: "south-east-asia",
    url: `https://${S3}/json/app/list/south-east-asia.json`,
    priority: "low",
  },
  {
    key: "all-business",
    url: `https://${S3}/json/app/list/all-business.json`,
    priority: "low",
  },
  {
    key: "local-business",
    url: `https://${S3}/json/app/list/local-business.json`,
    priority: "low",
  },
  {
    key: "world-business",
    url: `https://${S3}/json/app/list/world-business.json`,
    priority: "low",
  },
  {
    key: "property",
    url: `https://${S3}/json/app/list/property.json`,
    priority: "low",
  },
  {
    key: "all-sports",
    url: `https://${S3}/json/app/list/all-sports.json`,
    priority: "low",
  },
  {
    key: "football",
    url: `https://${S3}/json/app/list/football.json`,
    priority: "low",
  },
  {
    key: "badminton",
    url: `https://${S3}/json/app/list/badminton.json`,
    priority: "low",
  },
  {
    key: "motorsports",
    url: `https://${S3}/json/app/list/motorsports.json`,
    priority: "low",
  },
  {
    key: "tennis",
    url: `https://${S3}/json/app/list/tennis.json`,
    priority: "low",
  },
  {
    key: "all-lifestyle",
    url: `https://${S3}/json/app/list/all-lifestyle.json`,
    priority: "low",
  },
  {
    key: "travel",
    url: `https://${S3}/json/app/list/travel.json`,
    priority: "low",
  },
  {
    key: "food",
    url: `https://${S3}/json/app/list/food.json`,
    priority: "low",
  },
  {
    key: "automative",
    url: `https://${S3}/json/app/list/automotive.json`,
    priority: "low",
  },
  {
    key: "health",
    url: `https://${S3}/json/app/list/health.json`,
    priority: "low",
  },
  {
    key: "entertainment",
    url: `https://${S3}/json/app/list/entertainment.json`,
    priority: "low",
  },
  {
    key: "money",
    url: `https://${S3}/json/app/list/money.json`,
    priority: "low",
  },
  {
    key: "pets",
    url: `https://${S3}/json/app/list/pets.json`,
    priority: "low",
  },
  {
    key: "letter",
    url: `https://${S3}/json/app/list/letters.json`,
    priority: "low",
  },
  {
    key: "simple-stories",
    url: `https://${S3}/json/app/list/simple-stories.json`,
    priority: "low",
  },
];

// youtubeFeeds: List of all YouTube/video feeds, grouped by priority.
export const youtubeFeeds: Feed[] = [
  {
    key: "fmt-news-capsule",
    url: `https://${S3}/json/app/list/video-news-capsule.json`,
    priority: "medium",
  },
  {
    key: "fmt-news",
    url: `https://${S3}/json/app/list/video-news.json`,
    priority: "high",
  },
  {
    key: "fmt-lifestyle",
    url: `https://${S3}/json/app/list/video-lifestyle.json`,
    priority: "low",
  },
  {
    key: "fmt-exclusive",
    url: `https://${S3}/json/app/list/video-exclusive.json`,
    priority: "medium",
  },
];

// categoryMapping: Maps UI/category names to feed keys for normalization.
const categoryMapping: Record<string, string> = {
  VIDEOS: "fmt-news",
  MALAYSIA: "malaysia",
  OPINION: "opinion-landing",
  WORLD: "world-landing",
  "TOP WORLD": "world-landing",
  BUSINESS: "business-landing",
  "TOP BUSINESS": "business-landing",
  "TOP SPORTS": "sports-landing",
  SPORTS: "sports-landing",
  LIFESTYLE: "lifestyle-landing",
  "BERITA UTAMA": "berita-landing",
  "TOP NEWS": "news-landing",
  "TOP BM": "all-berita",
  HOME: "home-landing",
  NEWS: "news-landing",
  COLUMN: "column",
  EDITORIAL: "editorial",
  LETTERS: "letter",
  "LOCAL BUSINESS": "local-business",
  "WORLD BUSINESS": "world-business",
  FOOTBALL: "football",
  BADMINTON: "badminton",
  MOTORSPORTS: "motorsports",
  TENNIS: "tennis",
  PROPERTY: "property",
  TRAVEL: "travel",
  AUTOMOTIVE: "automotive",
  FOOD: "food",
  HEALTH: "health",
  ENTERTAINMENT: "entertainment",
  MONEY: "money",
  PETS: "pets",
  "SIMPLE STORIES": "simple-stories",
  "BORNEO+": "borneo+",
  "SOUTH EAST ASIA": "south-east-asia",
  TEMPATAN: "tempatan",
  DUNIA: "dunia",
  PANDANGAN: "pandangan",
  VIDEO: "videos-landing",
  "FMT NEWS": "fmt-news",
  "FMT LIFESTYLE": "fmt-lifestyle",
  "FMT EXCLUSIVE": "fmt-exclusive",
  "FMT NEWS CAPSULE": "fmt-news-capsule",
  "SUPER HIGHLIGHT": "super-highlight",
  HIGHLIGHT: "home-landing",
};

// Utility Functions
// filterValidArticles: Filters out invalid, duplicate, or ad items from articles array.
const filterValidArticles = (articles: any[]): any[] => {
  if (!Array.isArray(articles)) {
    // console.warn('Filtered out: Input is not an array', articles);
    return [];
  }

  const seenTitles = new Set();
  return articles.filter((item) => {
    if (!item) {
      // console.warn('Filtered out: null item');
      return false;
    }
    if (!item.id || !item.title || !item.thumbnail) {
      return false;
    }
    if (item.type === "AD_ITEM" || item.type === "MORE_ITEM") {
      return false;
    }
    if (item.type === "CARD_TITLE") {
      if (seenTitles.has(item.title)) {
        return false;
      }
      seenTitles.add(item.title);
    }
    return true;
  });
};

// processYouTubeData: Normalizes YouTube/video feed data for the app.
const processYouTubeData = (items: any[]): any[] => {
  if (!items || !Array.isArray(items)) {
    // console.warn('No valid YouTube items to process');
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

// getPriorityGroups: Returns feeds grouped by high/medium/low priority.
const getPriorityGroups = () => {
  const highPriority = [...landingFeeds, ...youtubeFeeds].filter(
    (f) => f.priority === "high"
  );
  const mediumPriority = [...landingFeeds, ...youtubeFeeds].filter(
    (f) => f.priority === "medium"
  );
  const lowPriority = [...landingFeeds, ...youtubeFeeds].filter(
    (f) => f.priority === "low"
  );

  return { highPriority, mediumPriority, lowPriority };
};

// LandingDataProvider: Main provider component. Handles all data fetching, caching, and state.
export const LandingDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [landingData, setLandingData] = useState<LandingDataType>({});
  const [filteredLandingData, setFilteredLandingData] =
    useState<LandingDataType>({});
  const [isLoading, setIsLoading] = useState(false);
  const [highPriorityLoading, setHighPriorityLoading] = useState(true);
  const [mediumPriorityLoading, setMediumPriorityLoading] = useState(true);
  const [lowPriorityLoading, setLowPriorityLoading] = useState(true);
  const [priorityDataLoaded, setPriorityDataLoaded] = useState(false);
  const [mainLandingData, setMainLandingData] = useState<any[]>([]);
  const { isOnline } = useContext(ThemeContext);
  const isFetchingRef = useRef(false);
  const lastFetchTimeRef = useRef(0);
  const isOnlineRef = useRef(isOnline);
  const cacheLoadedRef = useRef(false);

  // 24-hour cache system
  const pendingCacheUpdates = useRef<{ [key: string]: any[] }>({});
  const lastCacheUpdateRef = useRef<number>(0);
  const cacheUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const checkOnlineStatus = (): boolean => {
    if (!isOnlineRef.current) {
      // console.warn('Connection lost during fetch - stopping operations');
      return false;
    }
    return true;
  };

  const updateMainLandingData = useCallback((filteredData: LandingDataType) => {
    const seenIds = new Set();
    const uniqueItems = [
      ...(filteredData["super-highlight"] || []),
      ...(filteredData["home-landing"] || []),
      ...(filteredData["news-landing"] || []),
      ...(filteredData["fmt-news"] || []),
      ...(filteredData["business-landing"] || []),
    ].filter((item) => {
      if (seenIds.has(item.id)) return false;
      seenIds.add(item.id);
      return true;
    });
    setMainLandingData(uniqueItems);
  }, []);

  const loadCachedData = useCallback(async () => {
    if (cacheLoadedRef.current) {
      return;
    }

    try {
      const parsed: LandingDataType = {};
      let hasValidCache = false;
      let lastCacheUpdate = 0;

      // Load from single cache file
      try {
        const fileInfo = await FileSystem.getInfoAsync(CACHE_PATH);
        if (fileInfo.exists) {
          const cachedDataString = await FileSystem.readAsStringAsync(
            CACHE_PATH
          );
          if (cachedDataString && cachedDataString.trim()) {
            const cachedData: CachedData = JSON.parse(cachedDataString);
            const isExpired =
              Date.now() - cachedData.timestamp > CACHE_EXPIRY_MS;

            if (cachedData.data && typeof cachedData.data === "object") {
              Object.assign(parsed, cachedData.data);
              hasValidCache = true;
              lastCacheUpdate = cachedData.lastCacheUpdate || 0;
            }
          }
        }
      } catch (err) {
        console.error("Error loading cache:", err);
      }

      // Set the last cache update time
      lastCacheUpdateRef.current = lastCacheUpdate;

      // Apply cached data
      if (hasValidCache && Object.keys(parsed).length > 0) {
        setLandingData(parsed);

        const filtered: LandingDataType = {};
        Object.keys(parsed).forEach((key) => {
          const validArticles = filterValidArticles(parsed[key]);
          if (validArticles.length > 0) {
            filtered[key] = validArticles;
          }
        });

        setFilteredLandingData(filtered);
        updateMainLandingData(filtered);

        // Check if we have priority data
        const { highPriority } = getPriorityGroups();
        const hasPriorityData = highPriority.some(
          (feed) => filtered[feed.key]?.length > 0
        );

        if (hasPriorityData) {
          setPriorityDataLoaded(true);
        }
      }

      cacheLoadedRef.current = true;
    } catch (err) {
      console.error("Failed to load cached data:", err);
      cacheLoadedRef.current = true;
    } finally {
      setIsLoading(false);
    }
  }, [updateMainLandingData]);

  // Check if 24 hours have passed since last cache update
  const shouldUpdateCache = useCallback((): boolean => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastCacheUpdateRef.current;
    return timeSinceLastUpdate >= CACHE_UPDATE_INTERVAL_MS;
  }, []);

  const lastLandingRefreshRef = useRef<number>(0); // ⬅️ Add near top

  const refreshLandingPages = useCallback(async () => {
    if (!isOnline) return;

    const now = Date.now();
    const elapsed = now - lastLandingRefreshRef.current;

    // Only allow refresh if more than 1 minute has passed
    if (elapsed < 10 * 1000) {
      // console.log("⏱ Skipping landing refresh - called too soon");
      return;
    }

    // console.log("🔁 Refreshing landing pages");
    lastLandingRefreshRef.current = now;

    const landingPages = landingFeeds.filter((feed) =>
      feed.key.endsWith("-landing")
    );

    // const results = await Promise.allSettled(
    //   landingPages.map((feed) => fetchCategoryWithRetry(feed))
    // );

    // processResults(results);
  }, []);

  // Batch cache update function - only runs once every 24 hours
  const batchUpdateCache = useCallback(async () => {
    try {
      // Check if 24 hours have passed
      if (!shouldUpdateCache()) {
        // console.log('⏰ Cache update skipped - less than 24 hours since last update');
        return;
      }

      const updates = { ...pendingCacheUpdates.current };
      pendingCacheUpdates.current = {};

      if (Object.keys(updates).length === 0) {
        return;
      }

      // Load existing cache
      let cacheData: CachedData = {
        data: {},
        timestamp: Date.now(),
        lastCacheUpdate: Date.now(),
      };

      try {
        const existingCache = await FileSystem.getInfoAsync(CACHE_PATH);
        if (existingCache.exists) {
          const cachedDataString = await FileSystem.readAsStringAsync(
            CACHE_PATH
          );
          if (cachedDataString && cachedDataString.trim()) {
            const existingData = JSON.parse(cachedDataString);
            if (existingData && existingData.data) {
              cacheData.data = { ...existingData.data };
            }
          }
        }
      } catch (err) {
        // console.warn('Could not load existing cache, creating new:', err);
      }

      // Apply all pending updates
      let hasUpdates = false;
      Object.entries(updates).forEach(([key, data]) => {
        if (data && data.length > 0) {
          cacheData.data[key] = data;
          hasUpdates = true;
        }
      });

      // Write to cache if there are updates
      if (hasUpdates) {
        cacheData.timestamp = Date.now();
        cacheData.lastCacheUpdate = Date.now();
        lastCacheUpdateRef.current = cacheData.lastCacheUpdate;

        const cacheString = JSON.stringify(cacheData, null, 2);
        await FileSystem.writeAsStringAsync(CACHE_PATH, cacheString);
        // console.log(`💾 Batch cached ${Object.keys(updates).length} categories (24-hour update)`);
      }
    } catch (err) {
      console.error("Batch cache update error:", err);
    }
  }, [shouldUpdateCache]);

  // Queue cache update - only triggers actual cache write once per 24 hours
  const queueCacheUpdate = useCallback(
    (categoryKey: string, data: any[]) => {
      if (!data || data.length === 0) {
        return;
      }

      // Always add to pending updates (in memory)
      pendingCacheUpdates.current[categoryKey] = data;

      // Only schedule cache write if 24 hours have passed
      if (shouldUpdateCache()) {
        // Clear existing timeout and set new one
        if (cacheUpdateTimeoutRef.current) {
          clearTimeout(cacheUpdateTimeoutRef.current);
        }

        // Batch write after 2 seconds of no new updates (reduced from 500ms)
        cacheUpdateTimeoutRef.current = setTimeout(() => {
          batchUpdateCache();
        }, 2000);
      }
    },
    [shouldUpdateCache, batchUpdateCache]
  );

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

          // Queue for potential cache update (only writes once per 24 hours)
          queueCacheUpdate(feed.key, processedData);

          return { key: feed.key, data: processedData };
        } else {
          // console.warn(`Invalid response format for ${feed.key}`);
        }
      } catch (err) {
        const isLastAttempt = attempt === maxRetries;
        const errorMsg = (err as AxiosError).message;

        if (isLastAttempt) {
          // console.warn(`Failed to fetch ${feed.key} after ${maxRetries + 1} attempts: ${errorMsg}`);
        } else {
          // console.warn(`Attempt ${attempt + 1} failed for ${feed.key}, retrying...`);
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }
    return null;
  };

  const normalizeCategoryKey = (category: string): string => {
    return categoryMapping[category.toUpperCase()] || category.toLowerCase();
  };

  const refreshCategoryData = useCallback(
    async (categoryKey: string): Promise<void> => {
      if (!isOnline) return;

      const normalizedKey = normalizeCategoryKey(categoryKey);

      const category = [...landingFeeds, ...youtubeFeeds].find(
        (item) => item.key === normalizedKey
      );

      if (!category) {
        // console.warn(`No matching feed found for category "${normalizedKey}"`);
        return;
      }

      const result = await fetchCategoryWithRetry(category);
      if (result) {
        const { data } = result; // ⬅️ no longer using result.key
        const filteredData = filterValidArticles(data);

        // Always use normalizedKey to update landingData
        setLandingData((prev) => ({ ...prev, [normalizedKey]: data }));

        // Save filtered data under normalizedKey
        if (filteredData.length > 0) {
          setFilteredLandingData((prev) => {
            const updated = { ...prev, [normalizedKey]: filteredData };
            updateMainLandingData(updated);
            return updated;
          });
        }
      }
    },
    []
  );

  const processResults = useCallback(
    (results: PromiseSettledResult<{ key: string; data: any[] } | null>[]) => {
      const updates: LandingDataType = {};
      const filteredUpdates: LandingDataType = {};
      let hasData = false;

      for (const result of results) {
        if (result.status === "fulfilled" && result.value) {
          const { key, data } = result.value;
          updates[key] = data;
          const filteredData = filterValidArticles(data);
          if (filteredData.length > 0) {
            filteredUpdates[key] = filteredData;
            hasData = true;
          }
        }
      }

      // Update landingData (raw data)
      if (Object.keys(updates).length > 0) {
        setLandingData((prev) => ({ ...prev, ...updates }));
      }

      // Update filteredLandingData only with valid data
      if (Object.keys(filteredUpdates).length > 0) {
        setFilteredLandingData((prev) => {
          const updated = { ...prev, ...filteredUpdates };
          updateMainLandingData(updated);
          return updated;
        });
      }

      return hasData;
    },
    [updateMainLandingData]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (cacheUpdateTimeoutRef.current) {
        clearTimeout(cacheUpdateTimeoutRef.current);
        // Only flush pending cache updates if 24 hours have passed
        if (shouldUpdateCache()) {
          batchUpdateCache();
        }
      }
    };
  }, [batchUpdateCache, shouldUpdateCache]);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      await loadCachedData();
      if (isOnline) {
        // await fetchLiveData();
      }
    };
    loadData();
  }, []);

  return (
    <LandingDataContext.Provider
      value={{
        landingData,
        filteredLandingData,
        isLoading,
        setIsLoading,
        highPriorityLoading,
        mediumPriorityLoading,
        lowPriorityLoading,
        priorityDataLoaded,
        mainLandingData,
        setMainLandingData,
        refreshLandingPages,
        refreshCategoryData,
        setFilteredLandingData,
        setLandingData,
        queueCacheUpdate,
      }}
    >
      {children}
    </LandingDataContext.Provider>
  );
};

export const useLandingData = () => useContext(LandingDataContext);

// useLandingData: Hook for consuming landing data context in components.
// This hook is designed to be used by components that need to access landing data.
// It returns the context value, allowing components to read and update the data
// as needed. The context provides all necessary state and functions for data
// management and UI updates.

// Default export: Dummy component for Expo Router compatibility (not used in app logic).
// This export is primarily for Expo Router to recognize the file as a provider.
// The actual provider component is <LandingDataProvider>.
export default function LandingProvider() {
  return null;
}
