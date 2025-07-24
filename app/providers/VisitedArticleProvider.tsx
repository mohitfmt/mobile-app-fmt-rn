// VisitedArticleProvider.tsx
//
// This file provides a context for tracking which articles a user has visited/read.
// It stores visited article IDs in AsyncStorage for persistence across sessions.
//
// Key responsibilities:
// - Track visited articles by their IDs
// - Persist visited articles in AsyncStorage
// - Provide functions to mark articles as visited and check if visited
//
// Usage: Wrap your app (or a subtree) with <VisitedArticlesProvider> to provide visited-article context.
// Use the useVisitedArticles hook to access visited state and functions in components.
//
// -----------------------------------------------------------------------------

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

// VisitedArticlesContextType: The shape of the context value provided to consumers.
interface VisitedArticlesContextType {
  visitedArticles: string[];
  markAsVisited: (articleId: string) => Promise<void>;
  isVisited: (articleId: string) => boolean;
}

// VisitedArticlesContext: Provides visited articles and related functions to consumers.
const VisitedArticlesContext = createContext<
  VisitedArticlesContextType | undefined
>(undefined);

// VisitedArticlesProvider: Main provider component. Loads visited articles from AsyncStorage on mount.
// Provides markAsVisited and isVisited functions to children.
export const VisitedArticlesProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [visitedArticles, setVisitedArticles] = useState<string[]>([]);

  // Load visited articles on mount
  useEffect(() => {
    const loadVisitedArticles = async () => {
      try {
        const visitedArticlesStr = await AsyncStorage.getItem(
          "visitedArticles"
        );
        if (visitedArticlesStr) {
          const visitedArray: string[] = JSON.parse(visitedArticlesStr);
          setVisitedArticles(visitedArray);
        }
      } catch (error) {
        console.error("Error loading visited articles:", error);
      }
    };
    loadVisitedArticles();
  }, []);

  // Mark article as visited
  // markAsVisited: Adds an article ID to the visited list and persists it.
  const markAsVisited = useCallback(async (articleId: string) => {
    if (!articleId) return;

    setVisitedArticles((prevVisited) => {
      if (!prevVisited.includes(articleId)) {
        const newVisited = [...prevVisited, articleId];

        // Save to AsyncStorage asynchronously
        AsyncStorage.setItem(
          "visitedArticles",
          JSON.stringify(newVisited)
        ).catch((error) => {
          console.error("Error saving visited article:", error);
        });

        return newVisited;
      }
      return prevVisited;
    });
  }, []);

  // Check if article is visited
  // isVisited: Checks if an article ID is in the visited list.
  const isVisited = useCallback(
    (articleId: string) => {
      return visitedArticles.includes(articleId);
    },
    [visitedArticles]
  );

  const value = {
    visitedArticles,
    markAsVisited,
    isVisited,
  };

  return (
    <VisitedArticlesContext.Provider value={value}>
      {children}
    </VisitedArticlesContext.Provider>
  );
};

// useVisitedArticles: Hook for consuming visited articles context in components.
export const useVisitedArticles = () => {
  const context = useContext(VisitedArticlesContext);
  if (context === undefined) {
    throw new Error(
      "useVisitedArticles must be used within a VisitedArticlesProvider"
    );
  }
  return context;
};

export default { VisitedArticlesProvider, useVisitedArticles };
