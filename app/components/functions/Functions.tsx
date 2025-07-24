/**
 * Functions.ts
 *
 * A collection of helper functions used across the application.
 *
 * - Fetches & processes article data.
 * - Manages category selections.
 * - Handles image downloading & caching.
 * - Retrieves related posts efficiently.
 *
 * @author FMT Developers
 */

import { getPostWithSlugAndDate } from "@/app/lib/gql-queries/get-post-with-slug-and-date";
import { getRelatedPostsWithTag } from "@/app/lib/gql-queries/get-related-post-with-tag";
import { ArticleType } from "@/app/types/article";

/**
 * Adjusts the article font size based on user preference.
 *
 * @param fontSize - Default font size.
 * @param textSize - User-selected text size (Small, Large, or default).
 * @returns Adjusted font size.
 */
export const getArticleTextSize = (fontSize: number, textSize: string) => {
  if (textSize === "Small") {
    return fontSize * 0.9;
  } else if (textSize === "Large") {
    return fontSize * 1.3;
  } else {
    return fontSize;
  }
};

/**
 * Determines the preferred category for an article.
 *
 * - Filters out categories like "Top News", "Highlight", "Super", and "Lifestyle".
 * - If no valid categories exist, defaults to "VIDEOS".
 *
 * @param categories - Category edges containing node name, id, and optional slug.
 * @returns Preferred category.
 */
export const getPreferredCategory = (
  categories:
    | { edges?: { node: { name: string; id: string; slug?: string } }[] }
    | undefined
) => {
  if (!categories?.edges || categories.edges.length === 0) {
    return { node: { name: "VIDEOS", id: "video-default" } };
  }

  const filteredCategories = categories.edges.filter((category) => {
    const categoryName = category?.node?.name?.toLowerCase();
    return (
      categoryName &&
      !(
        categoryName.startsWith("top") ||
        categoryName.includes("highlight") ||
        categoryName.includes("super") ||
        categoryName.includes("lifestyle")
      )
    );
  });

  if (filteredCategories.length === 0) {
    return { node: { name: "VIDEOS", id: "video-default" } };
  }

  const nonSportCategory = filteredCategories.find(
    (category) =>
      category?.node?.name?.toLowerCase() !== "sports" &&
      category?.node?.slug?.toLowerCase() !== "sports"
  );

  if (nonSportCategory) {
    return nonSportCategory;
  }

  return filteredCategories.reduce(
    (shortest, current) => {
      if (
        !shortest ||
        current?.node?.name?.length < shortest?.node?.name?.length
      ) {
        return current;
      }
      return shortest;
    },
    { node: { name: "", id: "", slug: "" } }
  );
};


/**
 * Fetches and processes articles while handling errors.
 *
 * - Fetches full post details based on slug & date.
 * - Logs warnings for missing or invalid posts.
 *
 * @param edges - Edges array containing post nodes.
 * @returns Array of processed articles.
 */
export const fetchAndProcessPosts = async (edges: any) => {
  try {
    const fullPosts = await Promise.all(
      edges.map(async (edge: any) => {
        const slug = edge?.node?.slug;
        const date = edge?.node?.dateGmt;
        // console.log(edges);
        if (!slug) {
          // console.warn("Invalid edge structure, missing slug:", edge);
          return null;
        }

        // Fetch main post data
        const postData = await getPostWithSlugAndDate(slug, date);

        if (!postData?.post) {
          // console.warn(`Post with slug "${slug}" could not be fetched or is invalid:`, postData);
          return null;
        }

        return {
          ...postData.post,
        };
      })
    );

    // Filter out null or invalid posts
    const validPosts = fullPosts.filter((post) => post !== null);

    if (validPosts.length === 0) {
      // console.warn("No valid posts found during fetch.");
      return [];
    }

    // Process valid posts with categories
    return validPosts;
  } catch (error) {
    console.error("Error fetching or processing posts:", error);
    throw error;
  }
};

/**
 * Extracts and processes an article's primary category.
 *
 * - If the article has multiple categories, it selects the most relevant one.
 * - Defaults to "Uncategorized" if no valid categories exist.
 *
 * @param post - Article object containing categories.
 * @returns Processed post with a featured category.
 */
export const processPostCategory = (post: {
  categories?: {
    edges: Array<{ node: { name: string; id: string; slug?: string } }>;
  };
}) => {
  // Safely access categories
  const categories = post?.categories?.edges || [];

  // Check if categories is array-like and has elements
  const preferredCategory =
    Array.isArray(categories) && categories.length > 0
      ? getPreferredCategory({ edges: categories })
      : { node: { name: "Uncategorized", id: "uncategorized" } };

  return {
    ...post,
    featuredCategory: preferredCategory.node.name,
  };
};

import * as FileSystem from "expo-file-system";
const CACHE_FOLDER = FileSystem.documentDirectory + "images/";

/**
 * Downloads and caches an image locally.
 *
 * - Checks if the image exists in cache.
 * - If not, downloads and stores it in the cache folder.
 *
 * @param imageUrl - URL of the image.
 * @returns Local file URI if successful, otherwise null.
 */
export async function downloadImage(imageUrl: string): Promise<string | null> {
  try {
    if (!imageUrl) return null;

    const fileName = imageUrl.split("/").pop();
    if (!fileName) return null;

    const fileUri = `${CACHE_FOLDER}${fileName}`;
    const fileInfo = await FileSystem.getInfoAsync(fileUri);

    if (fileInfo.exists && fileInfo.size > 1024) {
      return fileUri;
    }

    await FileSystem.makeDirectoryAsync(CACHE_FOLDER, { intermediates: true });

    const downloadResult = await FileSystem.downloadAsync(imageUrl, fileUri);
    if (downloadResult.status === 200) {
      const downloadedInfo = await FileSystem.getInfoAsync(fileUri);
      if (downloadedInfo.exists && downloadedInfo.size > 1024) {
        return fileUri;
      }
    }

    return null;
  } catch (error) {
    console.error("Error downloading image:", error);
    return null;
  }
}

/**
 * Fetches related posts for a given article.
 *
 * - Uses `getRelatedPostsWithTag` to retrieve similar articles based on tags.
 * - Logs warnings for articles missing slug or database ID.
 *
 * @param posts - Array of article objects.
 * @returns Array of articles with related posts attached.
 */
export const fetchRelatedPosts = async (
  posts: ArticleType[]
): Promise<ArticleType[]> => {
  return await Promise.all(
    posts.map(async (post) => {
      try {
        if (!post.slug || !post.databaseId) {
          // console.warn(`Skipping related posts fetch for post with missing slug or ID:`, post);
          return { ...post, relatedPosts: [] };
        }
        // Fetch related posts safely
        const relatedData = await getRelatedPostsWithTag(
          post.tags,
          post.databaseId
        );

        if (
          !relatedData ||
          !relatedData.post ||
          !Array.isArray(relatedData.post.edges)
        ) {
          // console.warn(`No valid related data found for post: ${post.slug}`, relatedData);
          return { ...post, relatedPosts: [] };
        }

        return {
          ...post,
          relatedPosts: relatedData.post.edges,
        };
      } catch (error) {
        console.error(` Error fetching related posts for ${post.slug}:`, error);
        return { ...post, relatedPosts: [] }; // Return post with empty relatedPosts if an error occurs
      }
    })
  );
};

/**
 * Checks if a cached image is completely downloaded by comparing file sizes
 * @param cachedUri - Local file URI of the cached image
 * @param originalUri - Original remote image URI
 * @returns Promise<boolean> - True if image is completely downloaded, false otherwise
 */
export const isImageCompletelyDownloaded = async (
  cachedUri: string,
  originalUri: string
): Promise<boolean> => {
  try {
    // Check if cached file exists
    const fileInfo = await FileSystem.getInfoAsync(cachedUri);
    
    if (!fileInfo.exists) {
      return false;
    }

    // Get the expected file size from the remote server
    try {
      const response = await fetch(originalUri, { method: 'HEAD' });
      const expectedSize = response.headers.get('content-length');
      
      if (!expectedSize) {
        // If we can't get the expected size, we'll assume the cached file is complete
        // This is a fallback - you might want to implement additional checks
        return fileInfo.size > 0;
      }

      const expectedSizeNumber = parseInt(expectedSize, 10);
      const actualSize = fileInfo.size;

      // Check if the actual size matches the expected size (within a small tolerance)
      // We allow for a small difference to account for potential metadata differences
      const tolerance = 1024; // 1KB tolerance
      const isComplete = Math.abs(actualSize - expectedSizeNumber) <= tolerance;

      // console.log(`Image size check: Expected: ${expectedSizeNumber}, Actual: ${actualSize}, Complete: ${isComplete}`);
      
      return isComplete;
    } catch (networkError) {
      // console.log('Network error checking image size, assuming cached file is complete:', networkError);
      // If we can't check the remote size, assume the cached file is complete if it exists and has content
      return fileInfo.size > 0;
    }
  } catch (error) {
    console.error('Error checking image download status:', error);
    return false;
  }
};

const Func: React.FC = () => {
  return null;
};

export default Func;
