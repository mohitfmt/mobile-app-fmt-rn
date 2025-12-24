// utils.ts
//
// This file contains utility functions for date formatting, HTML parsing, and text manipulation.
// These functions help in processing content dynamically for the application.
//
// Key responsibilities:
// - Convert and format dates for Malaysian time and display
// - Parse and strip HTML content
// - Truncate and manipulate text for UI
// - Insert ads and index markers into post lists
// - Capitalize strings for display
//
// Usage: Import and use these utilities for content processing, formatting, and display logic.
//
// -----------------------------------------------------------------------------

import { Parser } from "htmlparser2";
import moment from "moment-timezone";
import {
  CATEGORY_FETCH_PLAN,
  HOME_FETCH_LIMIT,
  PROPERTY_AD_INTERVAL,
  PROPERTY_DISPLAY_LIMIT,
  PROPERTY_FETCH_LIMIT,
  REGULAR_COUNT,
  TOTAL_PER_SECTION,
} from "../constants/Constants";
import { BuildSectionOptions } from "../types/mainPage";
import {
  rawGetCategoryPosts,
  rawGetCategoryPostsExceptHome,
} from "./gql-queries/get-category-posts";

/**
 * Converts a given GMT date to Malaysian Time (GMT+8).
 */
export const convertToMalaysianTime = (gmtDate: Date) => {
  const date = new Date(gmtDate);
  const malaysianTime = new Date(date.getTime() + 8 * 60 * 60 * 1000); // Add 8 hours
  return malaysianTime;
};

/**
 * Converts an HTML string into plain text by removing all HTML tags.
 */
export const htmlToPlainText = (html: string) => {
  if (!html) return ""; // Ensure input is valid

  let plainText = "";
  const parser = new Parser({
    ontext(text) {
      plainText += text; // Extracts only text content
    },
  });

  try {
    parser.write(html);
    parser.end();
  } catch (error) {
    console.error(" Error parsing HTML:", error);
  }

  return plainText.trim();
};

/**
 * Truncates an HTML string by stripping tags and limiting text length.
 */
export const truncateHtml = (html: string, maxLength: number) => {
  const plainText = html.replace(/<[^>]*>?/gm, ""); // Strip HTML tags
  return plainText.length > maxLength
    ? `${plainText.substring(0, maxLength)}...`
    : plainText;
};

/**
 * Formats a date as "x time ago" relative to the current time in Malaysia.
 */

// utils.ts

export const formatMalaysianDateTime = (inputDate: string | Date): string => {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);

  const formatter = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });

  const parts = formatter.formatToParts(date);
  const partMap = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${partMap.month} ${partMap.day}, ${partMap.year} ${partMap.hour}:${partMap.minute} ${partMap.dayPeriod}`;
};

export const formatTimeAgo = (date: string) => {
  const utcTime = moment.utc(date); // Convert provided date to UTC
  const malaysianTime = utcTime.tz("Asia/Kuala_Lumpur"); // Convert to Malaysia timezone
  return malaysianTime.fromNow(); // Return "x time ago" format
};

export const formatMalaysianDateTimeS = (inputDate: string | Date): string => {
  // console.log(inputDate);
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate);

  const datePart = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  }).format(date);

  return `${datePart} ${timePart}`;
};

// Formats date string in "Asia/Kuala_Lumpur" timezone

export const formatTimeAgoMalaysia = (date: string) => {
  return moment.tz(date, "YYYY-MM-DD HH:mm:ss", "Asia/Kuala_Lumpur").fromNow();
};

export const stripHtml = (html: string | null | undefined): string => {
  if (!html) return "";

  const entities: Record<string, string> = {
    "&apos;": "'",
    "&ndash;": "-",
    "&mdash;": "-",
    "&hellip;": "...",
    "&ldquo;": '"',
    "&rdquo;": '"',
    "&lsquo;": "'",
    "&rsquo;": "'",
  };

  return html
    .replace(/<[^>]*>/g, "") // Remove HTML tags
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8211;/g, "-")
    .replace(/&#8212;/g, "-")
    .replace(/&#8230;/g, "...")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match)
    .trim();
};

export function convertAndAdd8Hours(isoString: string): { date: string } {
  const date = new Date(isoString);
  date.setHours(date.getHours() + 8);

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formatted = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(
    date.getSeconds()
  )}`;

  return { date: formatted };
}

export const insertAdsAndIndex = (posts: any[]) => {
  const enriched = [];

  for (let i = 0; i < posts.length; i++) {
    enriched.push(posts[i]);

    if ((i + 1) % 5 === 0) {
      enriched.push({ type: "INDEX_ITEM", id: `index-${i}` }); // example
      enriched.push({ type: "AD_ITEM", id: `ad-${i}` }); // example
    }
  }

  return enriched;
};

export const capitalizeFirstLetter = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const buildContentSection = ({
  list = [],
  key,
  title,
  variant = "default",
  isVideo = false,
  totalPerSection = TOTAL_PER_SECTION,
  highlightCount = REGULAR_COUNT,
}: BuildSectionOptions) => {
  if (!Array.isArray(list) || list.length === 0) return [];

  // =========================
  // Highlight section logic
  // =========================
  if (variant === "highlight") {
    const visibleItems = list
      .slice(0, highlightCount)
      .map((n) => ({ ...n, type: "default" }));

    const hasMore = list.length > highlightCount;

    return [
      ...visibleItems,
      ...(hasMore
        ? [
            {
              type: "MORE_ITEM",
              id: `more-${key}`,
              title,
              isVideo,
            },
          ]
        : []),
      { type: "AD_ITEM", id: `ad-${key}` },
    ];
  }

  // =========================
  // Default / video section
  // =========================
  const typed = list.map((n, i) => {
    if (isVideo) {
      return { ...n, type: i === 0 ? "video-featured" : "video" };
    }
    return { ...n, type: i === 0 ? "featured" : "default" };
  });

  const visibleItems = typed.slice(0, totalPerSection);
  const hasMore = typed.length > totalPerSection;

  return [
    { type: "CARD_TITLE", title },
    ...visibleItems,
    ...(hasMore
      ? [
          {
            type: "MORE_ITEM",
            id: `more-${key}`,
            title,
            isVideo,
          },
        ]
      : []),
    { type: "AD_ITEM", id: `ad-${key}` },
  ];
};

export async function aggressiveRetry<T>(
  category: string,
  fetchFn: () => Promise<T>,
  maxRetries = 4
): Promise<T> {
  const startTime = Date.now();

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await fetchFn();

      if (!result || (Array.isArray(result) && result.length === 0)) {
        throw new Error("Empty data received");
      }

      // ✅ ONLY log if it took multiple attempts (something was wrong)
      if (attempt > 0) {
        const duration = Date.now() - startTime;
        console.warn(
          `[HomePage ISR] ⚠️ ${category} succeeded after ${
            attempt + 1
          } attempts (${duration}ms)`
        );
      }

      return result;
    } catch (error: any) {
      // ✅ ONLY log if we're going to retry or fail
      if (attempt < maxRetries - 1) {
        const delay = 500 * (attempt + 1);
        console.error(
          `[HomePage ISR] ${category} attempt ${
            attempt + 1
          }/${maxRetries} failed, retry in ${delay}ms`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        // ✅ CRITICAL: Final failure after all retries
        const duration = Date.now() - startTime;
        console.error(
          `[HomePage ISR] 💥 ${category} FAILED after ${maxRetries} attempts (${duration}ms):`,
          error.message
        );
        throw error;
      }
    }
  }

  throw new Error(`${category} failed after ${maxRetries} attempts`);
}

const transformVideoData = (videoData: any) => {
  if (!videoData) return { transformVideo: null, transformedVideos: [] };

  const transformVideo = (
    video: any,
    index: number,
    type: string = "default"
  ) => {
    if (!video) return null;

    return {
      id: video.videoId,
      title: video.title,
      excerpt: video.description,
      content: video.description,
      date: video.publishedAt,
      thumbnail:
        video.thumbnails?.maxres ||
        video.thumbnails?.high ||
        video.thumbnails?.medium ||
        video.thumbnails?.default ||
        "",
      permalink: `https://www.youtube.com/watch?v=${video.videoId}`,
      uri: `https://www.youtube.com/watch?v=${video.videoId}`,
      videoId: video.videoId,
      type: type,
      duration: video.duration,
      durationSeconds: video.durationSeconds,
      statistics: video.statistics,
      channelTitle: video.channelTitle,
      tags: video.tags || [],
      tier: video.tier || "standard",
    };
  };

  return { transformVideo, transformedVideos: [] };
};

export const fetchVideosDataForHome = async (): Promise<any[]> => {
  const FMT_URL = process.env.EXPO_PUBLIC_FMT_URL;

  try {
    const response = await aggressiveRetry(
      "videos-home",
      async () => {
        const res = await fetch(`${FMT_URL}/videos/gallery`);
        if (!res.ok) throw new Error(`Videos API returned ${res.status}`);
        const data = await res.json();
        return data;
      },
      5
    );

    if (!response || !response.hero) {
      return [];
    }

    const { transformVideo } = transformVideoData(response);

    if (!transformVideo) {
      return [];
    }

    // Only return hero videos for home page
    const heroVideos = response.hero
      .map((video: any, index: number) =>
        transformVideo(video, index, index === 0 ? "video-featured" : "video")
      )
      .filter(Boolean);

    return heroVideos;
  } catch (error) {
    console.error("[Videos Home] Failed to fetch videos:", error);
    return [];
  }
};

export const fetchVideosData = async (): Promise<any[]> => {
  const FMT_URL = process.env.EXPO_PUBLIC_FMT_URL;

  try {
    const response = await aggressiveRetry(
      "videos",
      async () => {
        const res = await fetch(`${FMT_URL}/videos/gallery`);
        if (!res.ok) throw new Error(`Videos API returned ${res.status}`);
        const data = await res.json();
        return data;
      },
      5
    );

    if (!response) {
      return [];
    }

    const { transformVideo } = transformVideoData(response);
    const transformedVideos: any[] = [];

    if (!transformVideo) {
      return [];
    }

    if (response.hero && Array.isArray(response.hero)) {
      const heroVideos = response.hero
        .map((video: any, index: number) =>
          transformVideo(video, index, index === 0 ? "video-featured" : "video")
        )
        .filter(Boolean);

      transformedVideos.push(...heroVideos);

      if (heroVideos.length > 0) {
        transformedVideos.push({ type: "AD_ITEM", id: "ad-hero-videos" });
      }
    }

    if (response.shorts && Array.isArray(response.shorts)) {
      if (response.shorts.length > 0) {
        transformedVideos.push({
          type: "CARD_TITLE",
          title: "Shorts",
          id: "shorts-title",
        });

        const shortsVideos = response.shorts
          .slice(0, TOTAL_PER_SECTION)
          .map((video: any, index: number) =>
            transformVideo(
              video,
              index,
              index === 0 ? "video-featured" : "video"
            )
          )
          .filter(Boolean);

        transformedVideos.push(...shortsVideos);

        if (response.shorts.length > TOTAL_PER_SECTION) {
          transformedVideos.push({
            type: "MORE_ITEM",
            id: "more-shorts",
            title: "Shorts",
            isVideo: true,
          });
        }

        transformedVideos.push({ type: "AD_ITEM", id: "ad-shorts" });
      }
    }

    if (response.playlists && typeof response.playlists === "object") {
      Object.entries(response.playlists).forEach(
        ([playlistKey, playlist]: [string, any]) => {
          if (
            playlist &&
            playlist.videos &&
            Array.isArray(playlist.videos) &&
            playlist.videos.length > 0
          ) {
            transformedVideos.push({
              type: "CARD_TITLE",
              title:
                playlist.name ||
                playlistKey
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
              id: `${playlistKey}-title`,
            });

            const playlistVideos = playlist.videos
              .slice(0, TOTAL_PER_SECTION)
              .map((video: any, index: number) =>
                transformVideo(
                  video,
                  index,
                  index === 0 ? "video-featured" : "video"
                )
              )
              .filter(Boolean);

            transformedVideos.push(...playlistVideos);

            transformedVideos.push({
              type: "MORE_ITEM",
              id: `more-${playlistKey}`,
              title:
                playlist.name ||
                playlistKey
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
              isVideo: true,
            });

            transformedVideos.push({
              type: "AD_ITEM",
              id: `ad-${playlistKey}`,
            });
          }
        }
      );
    }

    return transformedVideos;
  } catch (error) {
    console.error("[Videos] Failed to fetch videos:", error);
    return [];
  }
};

export const getCategoryData = async () => {
  try {
    // =====================================
    // STEP 1: Fetch Hero (super-highlight)
    // =====================================
    const heroResponse = await aggressiveRetry(
      "hero",
      () => rawGetCategoryPosts("super-highlight", 0, 1),
      10
    );

    const heroPosts = heroResponse.posts ?? [];

    const excludeSlugs = Array.isArray(heroPosts)
      ? heroPosts.map((post) => post?.slug).filter(Boolean)
      : [];

    const PAGE_SIZE = 10;

    const getFilteredCategoryNews = async (
      categoryName: string,
      limit: number,
      additionalExcludes: string[] = []
    ) => {
      try {
        let collected: any[] = [];
        let offset = 0;
        let total = Infinity;

        while (collected.length < limit && offset < total) {
          const { posts, total: apiTotal } = await rawGetCategoryPosts(
            categoryName,
            offset,
            PAGE_SIZE
          );

          total = apiTotal;

          const filtered = posts.filter(
            (post: { slug: string }) =>
              !excludeSlugs.includes(post.slug) &&
              !additionalExcludes.includes(post.slug)
          );

          collected.push(...filtered);
          offset += PAGE_SIZE;
        }

        return collected.slice(0, limit);
      } catch (error) {
        console.error(`Error fetching ${categoryName}:`, error);
        return [];
      }
    };

    // ========================================
    // STEP 2: Fetch Highlights (sequential!)
    // ========================================
    const highlightPosts = await aggressiveRetry(
      "highlights",
      () =>
        getFilteredCategoryNews("highlight", HOME_FETCH_LIMIT, excludeSlugs),
      15
    ).catch((error) => {
      console.error("[HomePage ISR] Error fetching highlight", error.message);
      return [];
    });

    if (Array.isArray(highlightPosts)) {
      excludeSlugs.push(
        ...highlightPosts.map((post) => post?.slug).filter(Boolean)
      );
    }

    // ============================================
    // STEP 3: Fetch All Other Sections (parallel)
    // ============================================
    const results = await Promise.all(
      CATEGORY_FETCH_PLAN.map(({ key, slug, retry }) =>
        aggressiveRetry(
          slug,
          () => getFilteredCategoryNews(slug, HOME_FETCH_LIMIT),
          retry
        ).then((data) => [key, data])
      )
    );

    const sections = Object.fromEntries(results);

    // ========================================
    // STEP 4: Fetch Berita posts (sequential)
    // ========================================
    const superBmPosts = await aggressiveRetry(
      "super-bm",
      () => getFilteredCategoryNews("super-bm", HOME_FETCH_LIMIT),
      8
    ).catch((error) => {
      console.error("[HomePage ISR] super-bm failed:", error.message);
      return [];
    });

    const topBmPosts = await aggressiveRetry(
      "top-bm",
      () =>
        getFilteredCategoryNews(
          "top-bm",
          HOME_FETCH_LIMIT,
          superBmPosts?.map((post: { slug: string }) => post?.slug)
        ),
      8
    ).catch((error) => {
      console.error("[HomePage ISR] top-bm failed:", error.message);
      return [];
    });

    const beritaPosts = [...superBmPosts, ...topBmPosts]?.slice(
      0,
      HOME_FETCH_LIMIT
    );

    // ✅ Only log if Berita construction fails
    if (!beritaPosts || beritaPosts.length === 0) {
      console.error(
        `[HomePage ISR] ⚠️ Berita empty (SuperBM: ${superBmPosts?.length}, TopBM: ${topBmPosts?.length})`
      );
    }

    // ========================================
    // STEP 5: Fetch Videos (with retry)
    // ========================================
    const videoPosts = await fetchVideosDataForHome();

    return {
      props: {
        ...sections,
        heroPosts: heroPosts ?? [],
        highlightPosts: highlightPosts ?? [],
        beritaPosts: beritaPosts ?? [],
        videoPosts: videoPosts ?? [],
        _lastUpdate: Date.now(),
      },
      revalidate: 1500,
    };
  } catch (error) {
    console.error("[HomePage ISR] FATAL ERROR:", error);

    // Even on fatal error, return empty props instead of 404
    return {
      props: {
        heroPosts: [],
        highlightPosts: [],
        topNewsPosts: [],
        businessPosts: [],
        opinionPosts: [],
        worldPosts: [],
        leisurePosts: [],
        sportsPosts: [],
        beritaPosts: [],
        videoPosts: [],
        columnists: [],
        trendingTags: [],
      },
      revalidate: 10,
    };
  }
};

export const fetchPropertyTabData = async () => {
  try {
    const propertyResponse = await rawGetCategoryPostsExceptHome({
      first: PROPERTY_FETCH_LIMIT,
      where: {
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: ["property"],
            },
          ],
        },
      },
    });

    const propertyPosts = propertyResponse?.posts || [];

    if (propertyPosts.length === 0) {
      return [];
    }

    const sections: any[] = [];

    // Take only first 25 for display
    const displayPosts = propertyPosts.slice(0, PROPERTY_DISPLAY_LIMIT);

    // Add posts with ads inserted every 5 items
    displayPosts.forEach((post: any, index: number) => {
      // First post is featured, rest are default
      const typedPost = {
        ...post,
        type: index === 0 ? "featured" : "default",
      };

      sections.push(typedPost);

      // Add ad after every 5 items (but not after the last item)
      if (
        (index + 1) % PROPERTY_AD_INTERVAL === 0 &&
        index < displayPosts.length - 1
      ) {
        sections.push({
          type: "AD_ITEM",
          id: `ad-property-${index}`,
        });
      }
    });

    // Add load more if there are more than 25 articles
    if (propertyPosts.length > PROPERTY_DISPLAY_LIMIT) {
      sections.push({
        type: "MORE_ITEM",
        id: "more-property",
        title: "Property",
      });
    }

    return sections;
  } catch (error) {
    console.error("fetchPropertyTabData error:", error);
    return [];
  }
};

export const fetchTabCategoryData = async (categoryConfig: any) => {
  try {
    const sections: any[] = [];

    // 1️⃣ First fetch primary category articles (without title)
    const primaryResponse = await rawGetCategoryPostsExceptHome({
      first: HOME_FETCH_LIMIT,
      where: {
        taxQuery: {
          relation: "AND",
          taxArray: [
            {
              field: "SLUG",
              operator: "AND",
              taxonomy: "CATEGORY",
              terms: [categoryConfig.slug],
            },
          ],
        },
      },
    });

    const primaryPosts = primaryResponse?.posts || [];

    // Build primary section without title but with proper structure (featured + 4 regular + load more if needed)
    if (primaryPosts.length > 0) {
      const typedPrimaryPosts = primaryPosts.map(
        (post: any, index: number) => ({
          ...post,
          type: index === 0 ? "featured" : "default",
        })
      );

      // Apply the same logic as buildContentSection but without title
      const visibleItems = typedPrimaryPosts.slice(0, TOTAL_PER_SECTION);
      const hasMore = typedPrimaryPosts.length > TOTAL_PER_SECTION;

      sections.push(...visibleItems);

      if (hasMore) {
        // Format the category name for display (e.g., "top-news" -> "Top News")
        const formattedTitle = categoryConfig.slug
          .split("-")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");

        sections.push({
          type: "MORE_ITEM",
          id: `more-primary-${categoryConfig.slug}`,
          title: formattedTitle,
        });
      }

      sections.push({
        type: "AD_ITEM",
        id: `ad-primary-${categoryConfig.slug}`,
      });
    }

    // Get primary post slugs to exclude from subcategories
    const primarySlugs = primaryPosts
      .map((post: any) => post.slug)
      .filter(Boolean);

    // 2️⃣ Then fetch each subcategory with title (excluding primary posts)
    for (const subCategory of categoryConfig.subCategories) {
      const subResponse = await rawGetCategoryPostsExceptHome({
        first: HOME_FETCH_LIMIT,
        where: {
          taxQuery: {
            relation: "AND",
            taxArray: [
              {
                field: "SLUG",
                operator: "AND",
                taxonomy: "CATEGORY",
                terms: [subCategory.slug],
              },
            ],
          },
          // Exclude primary posts from subcategory results using excludeQuery
          excludeQuery:
            primarySlugs.length > 0
              ? [
                  {
                    first: primaryPosts.length,
                    status: "PUBLISH",
                    taxQuery: {
                      relation: "AND",
                      taxArray: [
                        {
                          field: "SLUG",
                          operator: "AND",
                          taxonomy: "CATEGORY",
                          terms: [categoryConfig.slug],
                        },
                      ],
                    },
                  },
                ]
              : undefined,
        },
      });

      const subPosts = subResponse?.posts || [];

      if (subPosts.length > 0) {
        const builtSection = buildContentSection({
          title: subCategory.title,
          list: subPosts,
          key: subCategory.slug,
        });

        sections.push(...builtSection);
      }
    }

    return sections;
  } catch (error) {
    console.error("fetchTabCategoryData error:", error);
    return [];
  }
};

// Default export to satisfy Expo Router
export default function Utils() {
  return null;
}
