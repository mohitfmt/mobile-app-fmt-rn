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
