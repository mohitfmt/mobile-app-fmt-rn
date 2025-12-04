// DataProvider.tsx
//
// This file provides a global data context using React Context API.
// It fetches and manages news, videos, and category-based data for the app.
//
// Key responsibilities:
// - Fetch and cache news articles, videos, and category data
// - Support offline mode with MMKV caching
// - Update data periodically and allow manual refresh
// - Retrieve related posts for articles
//
// Usage: Wrap your app with <DataProvider> to provide data context to all components.
//
// -----------------------------------------------------------------------------

import React, { createContext, useEffect, useState, useCallback } from "react";
import { ArticleType } from "@/app/types/article";
import { Post } from "@/app/types/tag";

// DataContext: Provides all data and related state/functions to consumers.
export const DataContext = createContext<any>(null);

export const DataProvider = ({ children }: { children: React.ReactNode }) => {
  // DataProvider: Main provider component. Manages all data state and exposes it via context.
  const [dataCache, setDataCache] = useState<any>({});
  const [categoryDataCache, setCategoryDataCache] = useState<
    Record<string, any[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchArticle, setSearchArticle] = useState<ArticleType[]>([]);
  const [mainData, setMainData] = useState<any>([]);
  const [tagPosts, setTagPostsState] = useState<Record<string, Post[]>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [combinedPostsCache, setCombinedPostsCache] = useState<
    Record<string, any[]>
  >({});

  const setTagPosts = (tag: string, posts: Post[]) => {
    setTagPostsState((prev) => ({
      ...prev,
      [tag]: posts,
    }));
  };

  return (
    <DataContext.Provider
      value={{
        dataCache,
        setDataCache,
        categoryDataCache,
        combinedPostsCache,
        loading,
        searchArticle,
        setSearchArticle,
        tagPosts,
        setTagPosts,
        isRefreshing,
        mainData,
        setMainData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export default { DataProvider, DataContext };
