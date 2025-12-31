// BookmarkContext.tsx
//
// This file provides a context for managing bookmarked articles in the app.
// It allows users to add, remove, and check bookmarks, and persists bookmarks in mmkv.
//
// Key responsibilities:
// - Store and manage a list of bookmarked article IDs
// - Persist bookmarks and article data in mmkv
// - Provide functions to add, remove, and check bookmarks
//
// Usage: Wrap your app (or a subtree) with <BookmarkProvider> to provide bookmark context.
// Use the useBookmarks hook to access bookmark state and functions in components.
//
// -----------------------------------------------------------------------------

import { storage } from "@/app/lib/storage";
import { BookmarkContextType } from "@/app/types/bookmark";
import React, { createContext, useContext, useEffect, useState } from "react";

export const BookmarkContext = createContext<BookmarkContextType | undefined>(
  undefined
);

export function BookmarkProvider({ children }: { children: React.ReactNode }) {
  const [bookmarkedArticles, setBookmarkedArticles] = useState<string[]>([]);

  // Load saved bookmark IDs on mount
  useEffect(() => {
    loadBookmarks();
  }, []);

  /**
   * Loads bookmark IDs from mmkv
   */
  const loadBookmarks = async () => {
    try {
      const stored = await storage.getString("bookmarkedIds");
      if (stored) {
        setBookmarkedArticles(JSON.parse(stored));
      }
    } catch (error) {
      console.error(" Error loading bookmarks:", error);
    }
  };

  /**
   * Adds a new bookmark (uses `id` or `uri` as identifier)
   */
  const addBookmark = async (id: string, articleData: any) => {
    try {
      const safeId = id || articleData?.uri || articleData?.id;
      if (!safeId) return;

      if (!bookmarkedArticles.includes(safeId)) {
        const updated = [...bookmarkedArticles, safeId];
        setBookmarkedArticles(updated);
        await storage.set("bookmarkedIds", JSON.stringify(updated));

        await storage.set(
          `article_${safeId}`,
          JSON.stringify({
            ...articleData,
            id: safeId,
            dateAdded: new Date().toISOString(),
          })
        );
      }
    } catch (error) {
      console.error(" Error adding bookmark:", error);
    }
  };

  /**
   * Removes a bookmark
   */
  const removeBookmark = async (id: string) => {
    try {
      const updated = bookmarkedArticles.filter(
        (bookmarkId) => bookmarkId !== id
      );
      setBookmarkedArticles(updated);
      await storage.set("bookmarkedIds", JSON.stringify(updated));
      await storage.remove(`article_${id}`);
    } catch (error) {
      console.error(" Error removing bookmark:", error);
    }
  };

  /**
   * Checks if a bookmark exists
   */
  const isBookmarked = (id: string) => {
    return bookmarkedArticles.includes(id);
  };

  return (
    <BookmarkContext.Provider
      value={{
        bookmarkedArticles,
        addBookmark,
        removeBookmark,
        isBookmarked,
      }}
    >
      {children}
    </BookmarkContext.Provider>
  );
}

export const useBookmarks = () => {
  const context = useContext(BookmarkContext);
  if (context === undefined) {
    throw new Error("useBookmarks must be used within a BookmarkProvider");
  }
  return context;
};

export default { BookmarkContext, BookmarkProvider, useBookmarks };
