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
import { TOTAL_PER_SECTION } from "../constants/Constants";

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

// Default export to satisfy Expo Router
export default function Utils() {
  return null;
}

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
      id: video?.videoId || video?.id,
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
      permalink: `https://www.youtube.com/watch?v=${
        video?.videoId || video?.id
      }`,
      uri: `https://www.youtube.com/watch?v=${video?.videoId || video?.id}`,
      videoId: video?.videoId || video?.id,
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
            displayTitle: "Shorts",
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
              displayTitle:
                playlist.name ||
                playlistKey
                  .replace(/-/g, " ")
                  .replace(/\b\w/g, (l) => l.toUpperCase()),
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

export const formatViewCount = (count?: number | string) => {
  if (!count || count === "0" || count === 0) return "";

  const num = typeof count === "string" ? parseInt(count, 10) : count;
  if (Number.isNaN(num) || num <= 0) return "";

  const format = (value: number, suffix: string) =>
    `${value.toFixed(1).replace(/\.0$/, "")}${suffix}`;

  if (num >= 1_000_000) return format(num / 1_000_000, "M");
  if (num >= 1_000) return format(num / 1_000, "K");

  return num.toString();
};

export const formatDuration = (seconds?: number | string) => {
  if (!seconds) return "";

  const total = typeof seconds === "string" ? parseInt(seconds, 10) : seconds;

  if (Number.isNaN(total) || total <= 0) return "";

  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}h`;
  }

  return `${minutes}:${secs.toString().padStart(2, "0")}m`;
};

export const formatPostedTime = (date?: string): string => {
  if (!date) return "Recently";
  return formatTimeAgoMalaysia(date);
};
