// app/lib/CloudflareImageComponent.tsx
/**
 * Production-hardened Cloudflare Image Component for React Native
 *
 * Features:
 * - Safe Cloudflare URL building with proper encoding
 * - Intelligent retry with exponential backoff
 * - Request token tracking to prevent ghosting
 * - Deduplicated prefetch queue with concurrency control
 * - Raw source fallback as last resort
 * - Memory pressure handling
 * - Accessibility support
 */
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  Image,
  Animated,
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
  PixelRatio,
  Dimensions,
  InteractionManager,
  AppState,
  NativeAppEventEmitter,
} from "react-native";

// Types
interface CloudflareImageProps {
  src: string;
  width: number;
  height: number;
  priority?: boolean;
  placeholder?: any; // Local require() image
  onLoad?: () => void;
  onError?: (error: any) => void;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
  prefetchNext?: string[]; // URLs to prefetch
  quality?: number;
  accessibilityLabel?: string;
  lqipDataUri?: string; // Low quality image placeholder data URI
  version?: string; // Cache busting version
}

// Constants
const DEVICE_PIXEL_RATIO = PixelRatio.get();

// Prefetch queue management
const inFlightPrefetches = new Set<string>();
const prefetchQueue: string[] = [];
let prefetchTimer: NodeJS.Timeout | null = null;

// Utility functions
const isHttpUrl = (url?: string): boolean => {
  return !!url && /^https?:\/\//i.test(url);
};

const choosePresetWidth = (width: number): number => {
  if (width <= 150) return 150;
  if (width <= 300) return 300;
  if (width <= 600) return 600;
  if (width <= 900) return 900;
  if (width <= 1200) return 1200;
  return 1600;
};

const isGif = (url: URL): boolean => {
  return /\.gif(\?|$)/i.test(url.pathname);
};

const isInFmtZone = (hostname: string): boolean => {
  return (
    /(?:^|\.)freemalaysiatoday\.com$/i.test(hostname) ||
    /(?:^|\.)media\.freemalaysiatoday\.com$/i.test(hostname)
  );
};

// Safe Cloudflare URL builder with proper encoding
export const buildCloudflareUrl = (
  originalUrl: string,
  layoutWidth: number,
  options?: {
    quality?: number;
    fit?: "scale-down" | "contain" | "cover";
    sharpen?: number;
    dpr?: number;
    anim?: boolean;
    version?: string;
  }
): string => {
  if (!isHttpUrl(originalUrl)) return originalUrl;

  let src: URL;
  try {
    src = new URL(originalUrl);
  } catch {
    return originalUrl;
  }

  // Don't transform external hosts
  if (!isInFmtZone(src.hostname)) return originalUrl;

  // Check if already transformed
  if (src.pathname.includes("/cdn-cgi/image/")) return originalUrl;

  const dpr = Math.min(options?.dpr ?? DEVICE_PIXEL_RATIO, 3);
  const presetWidth = choosePresetWidth(layoutWidth);

  // Quality based on size with min/max bounds
  const defaultQuality =
    layoutWidth <= 150
      ? 70
      : layoutWidth <= 300
      ? 75
      : layoutWidth <= 600
      ? 80
      : layoutWidth <= 900
      ? 85
      : 90;
  const quality = Math.max(
    40,
    Math.min(options?.quality ?? defaultQuality, 95)
  );

  // Preserve GIF animation
  const animated = options?.anim ?? isGif(src);

  const params = [
    `width=${presetWidth}`,
    `quality=${quality}`,
    `fit=${options?.fit ?? "scale-down"}`,
    `dpr=${dpr}`,
    `metadata=none`,
    `sharpen=${options?.sharpen ?? 1}`,
    animated ? `format=auto,anim=true` : `format=auto`,
    `onerror=redirect`,
  ].join(",");

  // Add version for cache busting if provided
  if (options?.version) {
    src.searchParams.set("v", options.version);
  }

  const cdnBase = `${src.protocol}//${src.host}/cdn-cgi/image`;
  // Properly encode the full URL
  const encodedTail = encodeURI(src.toString());

  return `${cdnBase}/${params}/${encodedTail}`;
};

// Exponential backoff with jitter
const calculateBackoff = (attempt: number): number => {
  const base = Math.min(1200, 200 * Math.pow(2, attempt));
  const jitter = Math.random() * 120;
  return base + jitter;
};

// Flush prefetch queue with concurrency control
const flushPrefetchQueue = async (concurrency: number = 2) => {
  while (inFlightPrefetches.size < concurrency && prefetchQueue.length > 0) {
    const url = prefetchQueue.shift()!;
    if (inFlightPrefetches.has(url)) continue;

    inFlightPrefetches.add(url);
    try {
      await Image.prefetch(url);
    } catch (error) {
      console.log("Prefetch failed:", url);
    } finally {
      inFlightPrefetches.delete(url);
    }
  }
};

// Queue prefetch with deduplication
export const queuePrefetch = (
  urls: string[],
  width: number,
  priority: boolean = false
) => {
  urls.forEach((url) => {
    if (!isHttpUrl(url)) return;

    const transformedUrl = buildCloudflareUrl(url, width, {
      dpr: priority ? 3 : 2,
    });

    if (
      !inFlightPrefetches.has(transformedUrl) &&
      !prefetchQueue.includes(transformedUrl)
    ) {
      if (priority) {
        prefetchQueue.unshift(transformedUrl); // Priority items go to front
      } else {
        prefetchQueue.push(transformedUrl);
      }
    }
  });

  // Clear existing timer and set new one
  if (prefetchTimer) clearTimeout(prefetchTimer);

  // Start prefetch after a short delay (immediate for priority)
  const delay = priority ? 0 : 350;
  prefetchTimer = setTimeout(() => {
    flushPrefetchQueue(priority ? 3 : 2);
  }, delay);
};

// Clear prefetch queue on memory pressure
const clearPrefetchQueue = () => {
  prefetchQueue.length = 0;
  inFlightPrefetches.clear();
  if (prefetchTimer) {
    clearTimeout(prefetchTimer);
    prefetchTimer = null;
  }
};

// Main component
const CloudflareImageComponent: React.FC<CloudflareImageProps> = ({
  src,
  width,
  height,
  priority = false,
  placeholder = require("../assets/images/placeholder.png"),
  onLoad,
  onError,
  resizeMode = "cover",
  prefetchNext = [],
  quality,
  accessibilityLabel,
  lqipDataUri,
  version,
}) => {
  // State
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);
  const requestId = useRef(0);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const interactionHandle = useRef<any>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
      fadeAnim.stopAnimation();
      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      if (interactionHandle.current) interactionHandle.current.cancel();
    };
  }, []);

  // Reset state when src changes
  useEffect(() => {
    requestId.current += 1;
    setIsLoading(true);
    setHasError(false);
    setRetryCount(0);
    fadeAnim.setValue(0);

    // Clear any pending retry
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, [src, width, height]);

  // Handle memory pressure
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState !== "active") {
        clearPrefetchQueue();
      }
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );
    return () => {
      subscription.remove();
    };
  }, []);

  // Calculate DPR and fit based on props
  const dpr = Math.min(DEVICE_PIXEL_RATIO, priority ? 3 : 2);
  const fit =
    resizeMode === "contain"
      ? "contain"
      : resizeMode === "cover"
      ? "cover"
      : "scale-down";

  // Build image URL with retry logic
  const imageUrl = useMemo(() => {
    if (!src) return null;

    // On retry 3+, use raw source as fallback
    if (retryCount >= 3) return src;

    // Progressive quality degradation on retry
    const retryQuality =
      retryCount > 0
        ? Math.max(50, (quality ?? 80) - 10 * retryCount)
        : quality;

    return buildCloudflareUrl(src, width, {
      dpr,
      quality: retryQuality,
      fit,
      version,
    });
  }, [src, width, dpr, quality, fit, retryCount, version]);

  // Prefetch next images after current loads
  useEffect(() => {
    if (!isLoading && prefetchNext.length > 0) {
      // Use InteractionManager to defer prefetch
      interactionHandle.current = InteractionManager.runAfterInteractions(
        () => {
          if (isMounted.current) {
            queuePrefetch(
              prefetchNext.slice(0, priority ? 3 : 2),
              width,
              priority
            );
          }
        }
      );

      return () => {
        if (interactionHandle.current) {
          interactionHandle.current.cancel();
        }
      };
    }
  }, [isLoading, prefetchNext, width, priority]);

  // Handle successful load with request ID check
  const handleImageLoad = useCallback(() => {
    const currentRequestId = requestId.current;

    if (!isMounted.current || currentRequestId !== requestId.current) return;

    setIsLoading(false);
    setHasError(false);

    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    onLoad?.();
  }, [onLoad, fadeAnim]);

  // Handle error with retry logic and request ID check
  const handleImageError = useCallback(
    (error: any) => {
      const currentRequestId = requestId.current;

      if (!isMounted.current || currentRequestId !== requestId.current) return;

      console.warn("Image failed to load:", src, "Retry:", retryCount);
      setIsLoading(false);

      if (retryCount < 2) {
        // Exponential backoff retry
        const backoffTime = calculateBackoff(retryCount);

        retryTimeoutRef.current = setTimeout(() => {
          if (!isMounted.current || currentRequestId !== requestId.current)
            return;
          setRetryCount((r) => r + 1);
          setIsLoading(true);
        }, backoffTime);
      } else if (retryCount === 2) {
        // Final attempt with raw source
        Image.prefetch(src)
          .then(() => {
            if (!isMounted.current || currentRequestId !== requestId.current)
              return;
            setRetryCount(3); // Mark as raw mode
            setIsLoading(true);
          })
          .catch(() => {
            if (!isMounted.current || currentRequestId !== requestId.current)
              return;
            setHasError(true);
            onError?.(error);
          });
      } else {
        setHasError(true);
        onError?.(error);
      }
    },
    [src, retryCount, onError]
  );

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Placeholder or LQIP */}
      {(isLoading || hasError) && (
        <View style={[styles.placeholderContainer, StyleSheet.absoluteFill]}>
          {lqipDataUri ? (
            <Image
              source={{ uri: lqipDataUri, cache: "force-cache" }}
              style={{ width, height }}
              blurRadius={1}
              resizeMode={resizeMode}
              accessibilityLabel={accessibilityLabel}
            />
          ) : (
            <Image
              source={placeholder}
              style={{ width, height }}
              resizeMode={resizeMode}
              accessibilityLabel={accessibilityLabel}
            />
          )}
        </View>
      )}

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <View style={[styles.loadingContainer, StyleSheet.absoluteFill]}>
          <ActivityIndicator
            size="small"
            color="#999"
            hidesWhenStopped={true}
          />
        </View>
      )}

      {/* Main image */}
      {imageUrl && !hasError && (
        <Animated.View
          style={[
            styles.imageContainer,
            { opacity: fadeAnim },
            StyleSheet.absoluteFill,
          ]}
        >
          <Image
            source={{ uri: imageUrl }}
            style={{ width, height }}
            resizeMode={resizeMode}
            onLoad={handleImageLoad}
            onError={handleImageError}
            progressiveRenderingEnabled={true}
            fadeDuration={0}
            resizeMethod="resize"
            accessibilityLabel={accessibilityLabel}
          />
        </Animated.View>
      )}
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  placeholderContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
});

// Export memoized component
export default React.memo(CloudflareImageComponent);

// Export utilities
export { clearPrefetchQueue };
