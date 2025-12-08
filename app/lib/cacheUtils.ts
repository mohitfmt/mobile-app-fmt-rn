// cacheUtils.ts
//
// This file provides utility functions for caching and retrieving data using MMKV storage.
// It is used throughout the app to persist data locally for offline access and performance.
//
// Key responsibilities:
// - Check if data is cached and non-empty
// - Cache data arrays under a specific key
// - Retrieve cached data arrays by key
//
// Usage: Import and use hasCachedData, cacheData, and getCachedData to manage local cache.
//
// -----------------------------------------------------------------------------

import { storage } from "./storage";

export const hasCachedData = (data: any[] | undefined): boolean => {
  // hasCachedData: Checks if the provided data array is non-empty and valid.
  return Array.isArray(data) && data.length > 0;
};

export const cacheData = async (key: string, data: any[]) => {
  // cacheData: Stores the data array in MMKV storage under a cache key.
  // MMKV is synchronous, so no async/await needed.
  try {
    await storage.set(`cache_${key}`, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to cache data for ${key}:`, error);
  }
};

export const getCachedData = async (key: string): any[] | undefined => {
  // getCachedData: Retrieves and parses the cached data array from MMKV storage.
  // MMKV is synchronous, so no async/await needed.
  try {
    const cached = await storage.getString(`cache_${key}`);
    return cached ? JSON.parse(cached) : undefined;
  } catch (error) {
    console.error(`Failed to retrieve cached data for ${key}:`, error);
    return undefined;
  }
};

export default { hasCachedData, cacheData, getCachedData };
