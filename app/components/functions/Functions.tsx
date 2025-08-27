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

const Func: React.FC = () => {
  return null;
};

export default Func;
