// LandingProvider.tsx
//
// This file provides the main data context for the app's landing and category pages.
// It fetches, caches, and manages news/category/video data using GraphQL and video APIs,
// and exposes this data (and loading state) to the rest of the app via React Context. It also
// handles cache updates, prioritization of data loading, and provides hooks for
// refreshing or updating specific categories. This provider is used at the top level
// of the app to ensure all components have access to the latest landing/category data.
//
// Key responsibilities:
// - Fetch landing/category/video data using GraphQL and video APIs
// - Cache data locally for offline/fast access (with 24-hour batch updates)
// - Expose loading state and refresh functions
// - Filter and normalize data for use in UI
// - Provide a hook (useLandingData) for easy access in components
//
// Usage: Wrap your app with <LandingDataProvider> to provide landing data context.
//
// -----------------------------------------------------------------------------

import * as FileSystem from "expo-file-system/legacy";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { categoriesNavigation } from "../constants/Constants";
import { cacheData, getCachedData } from "../lib/cacheUtils";
import {
  buildContentSection,
  fetchPropertyTabData,
  fetchTabCategoryData,
  fetchVideosData,
  getCategoryData,
} from "../lib/utils";
import { ThemeContext } from "./ThemeProvider";

// Type Definitions
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
// CACHE_PATH: Where landing data is cached locally
const CACHE_PATH = `${FileSystem.documentDirectory}landingDataCache.json`;
// CACHE_EXPIRY_MS: How long cache is considered fresh (1 hour)
const CACHE_EXPIRY_MS = 1000 * 60 * 60; // 1 hour
// CACHE_UPDATE_INTERVAL_MS: How often to batch-write cache (24 hours)
const CACHE_UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours for cache updates

// Utility Functions
// filterValidArticles: Filters out invalid, duplicate, or ad items from articles array.
const filterValidArticles = (articles: any[]): any[] => {
  if (!Array.isArray(articles)) {
    return [];
  }

  const seenTitles = new Set();
  return articles.filter((item) => {
    if (!item) {
      return false;
    }
    if (!item.id || !item.title) {
      return false;
    }
    const hasThumb = !!(
      item?.thumbnail || item?.featuredImage?.node?.sourceUrl
    );
    if (!hasThumb) {
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

// getPriorityGroups: Returns category keys grouped by priority for caching.
const getPriorityGroups = () => {
  const highPriority = [
    "home-landing",
    "news-landing",
    "berita-landing",
    "opinion-landing",
    "business-landing",
    "world-landing",
    "sports-landing",
    "property-landing",
    "lifestyle-landing",
    "videos-landing",
  ];

  const mediumPriority = ["malaysia", "borneo+", "all-berita", "tempatan"];

  const lowPriority = [
    "dunia",
    "pandangan",
    "all-opinion",
    "column",
    "all-world",
    "editorial",
    "letter",
    "south-east-asia",
    "all-business",
    "local-business",
    "world-business",
    "property",
    "all-sports",
    "football",
    "badminton",
    "motorsports",
    "tennis",
    "all-lifestyle",
    "travel",
    "food",
    "health",
    "entertainment",
    "money",
    "pets",
    "simple-stories",
  ];

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
  const [priorityDataLoaded, setPriorityDataLoaded] = useState(false);
  const [mainLandingData, setMainLandingData] = useState<any[]>([]);
  const { isOnline } = useContext(ThemeContext);
  const cacheLoadedRef = useRef(false);

  // 24-hour cache system
  const pendingCacheUpdates = useRef<{ [key: string]: any[] }>({});
  const lastCacheUpdateRef = useRef<number>(0);
  const cacheUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isOnlineRef = useRef(isOnline);

  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

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

      // Overlay with MMKV cache (per-key latest data overrides file cache)
      try {
        const { highPriority, mediumPriority, lowPriority } =
          getPriorityGroups();
        const allKeys = [...highPriority, ...mediumPriority, ...lowPriority];

        const overlayResults = await Promise.all(
          allKeys.map(async (key) => {
            try {
              const data = await getCachedData(key);
              return { key, data };
            } catch {
              return { key, data: undefined as any[] | undefined };
            }
          })
        );
        for (const { key, data } of overlayResults) {
          if (Array.isArray(data) && data.length > 0) {
            parsed[key] = data;
            hasValidCache = true;
          }
        }
      } catch (overlayErr) {
        // Non-fatal: if MMKV overlay fails we still proceed with file cache
      }

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
          (key) => filtered[key]?.length > 0
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

  const lastLandingRefreshRef = useRef<number>(0);

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

    // Get all landing page keys
    const landingPageKeys = [
      "home-landing",
      "news-landing",
      "berita-landing",
      "opinion-landing",
      "business-landing",
      "world-landing",
      "sports-landing",
      "property-landing",
      "lifestyle-landing",
      "videos-landing",
    ];

    // Refresh each landing page
    const results = await Promise.allSettled(
      landingPageKeys.map((key) => refreshCategoryData(key))
    );

    // Log any failures
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        console.error(
          `Failed to refresh ${landingPageKeys[index]}:`,
          result.reason
        );
      }
    });
  }, [isOnline]);

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

  const refreshCategoryData = useCallback(
    async (categoryKey: string): Promise<void> => {
      if (!isOnline) return;

      try {
        let fetchedData: any[] = [];

        // Handle different category types based on the key
        if (categoryKey === "home-landing") {
          // Fetch home landing data using getCategoryData
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

          fetchedData = [
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
        } else if (categoryKey === "videos-landing") {
          // Fetch videos data
          fetchedData = await fetchVideosData();
        } else if (categoryKey === "property-landing") {
          // Fetch property data
          fetchedData = await fetchPropertyTabData();
        } else if (categoryKey.endsWith("-landing")) {
          // Handle other landing pages (berita, opinion, business, world, sports, lifestyle)
          const categoryPath = categoryKey.replace("-landing", "");
          const config = categoriesNavigation.find(
            (c) => c.path.toLowerCase() === categoryPath
          );

          if (config) {
            fetchedData = await fetchTabCategoryData(config);
          }
        }

        // Update landing data
        if (fetchedData.length > 0) {
          setLandingData((prev) => ({ ...prev, [categoryKey]: fetchedData }));

          // Filter and update filtered data
          const filteredData = filterValidArticles(fetchedData);
          if (filteredData.length > 0) {
            setFilteredLandingData((prev) => {
              const updated = { ...prev, [categoryKey]: filteredData };
              updateMainLandingData(updated);
              return updated;
            });
          }

          // Cache the data
          queueCacheUpdate(categoryKey, fetchedData);
          await cacheData(categoryKey, fetchedData);
        }
      } catch (error) {
        console.error(
          `Error refreshing category data for ${categoryKey}:`,
          error
        );
      }
    },
    [isOnline, queueCacheUpdate, updateMainLandingData]
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
  }, [loadCachedData, isOnline]);

  return (
    <LandingDataContext.Provider
      value={{
        landingData,
        filteredLandingData,
        isLoading,
        setIsLoading,
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
