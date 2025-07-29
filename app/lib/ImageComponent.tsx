// ImageComponent.tsx
//
// This file defines the CachedImageComponent, which loads and caches images for performance.
// It shows a placeholder while loading, uses a fade transition, and supports offline caching.
//
// Key responsibilities:
// - Load images from remote URLs or cache
// - Show a placeholder while loading
// - Fade in the image when loaded
// - Handle errors and fallbacks
//
// Usage: Use <CachedImageComponent src width height /> to display images with caching and transitions.
//
// -----------------------------------------------------------------------------

// app/lib/ImageComponent.tsx - Final optimized version without dependencies
import React, { useEffect, useState, useRef, useContext } from "react";
import {
  Image,
  Animated,
  StyleSheet,
  View,
  ActivityIndicator,
} from "react-native";
import { downloadImage } from "@/app/components/functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";

interface CachedImageProps {
  src: string;
  width: number;
  height: number;
}

// Smart URL optimization
const getOptimizedUrl = (url: string, width: number): string => {
  if (!url || !url.startsWith("http")) return url;

  // Skip if already has parameters
  if (url.includes("?")) return url;

  // Smart sizing - less aggressive to ensure images load
  let targetWidth: number;
  if (width <= 150) targetWidth = 300; // Small thumbnails
  else if (width <= 300) targetWidth = 600; // Medium images
  else if (width <= 600) targetWidth = 900; // Large images
  else targetWidth = 1200; // XL images

  // Add optimization parameters
  return `${url}?w=${targetWidth}&q=85`;
};

const CachedImageComponent: React.FC<CachedImageProps> = ({
  src,
  width,
  height,
}) => {
  const { isOnline } = useContext(ThemeContext);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isMounted = useRef(true);
  const placeholderOpacity = useRef(new Animated.Value(1)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!src) return;

    const loadImage = async () => {
      try {
        setIsLoading(true);
        setHasError(false);

        if (isOnline) {
          // Online: Use optimized URL
          const optimizedUrl = getOptimizedUrl(src, width);
          if (isMounted.current) {
            setImageUri(optimizedUrl);
          }

          // Try to cache in background (don't wait for it)
          downloadImage(src).catch(() => {
            // Ignore cache errors when online
          });
        } else {
          // Offline: Use cached version
          const cachedUri = await downloadImage(src);
          if (cachedUri && isMounted.current) {
            setImageUri(cachedUri);
          } else if (isMounted.current) {
            // No cache available
            setHasError(true);
          }
        }
      } catch (error) {
        console.error("Error loading image:", error);
        if (isMounted.current) {
          setHasError(true);
        }
      }
    };

    loadImage();
  }, [src, width, isOnline, retryCount]);

  const handleImageLoad = () => {
    if (!isMounted.current) return;

    setIsLoading(false);
    setHasError(false);

    Animated.parallel([
      Animated.timing(placeholderOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(imageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleImageError = (error: any) => {
    console.warn("Image failed to load:", src);
    if (!isMounted.current) return;

    setIsLoading(false);

    // Retry logic with fallback to original URL
    if (retryCount === 0 && imageUri?.includes("?")) {
      // First retry: try original URL without parameters
      setRetryCount(1);
      setImageUri(src);
    } else if (retryCount === 1 && !imageUri?.includes("?")) {
      // Second retry: try with smaller size
      setRetryCount(2);
      setImageUri(getOptimizedUrl(src, Math.floor(width / 2)));
    } else {
      // Give up and show error
      setHasError(true);
    }
  };

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Placeholder */}
      <Animated.View
        style={[
          styles.imageContainer,
          { opacity: placeholderOpacity, position: "absolute" },
        ]}
      >
        <Image
          source={require("../assets/images/placeholder.png")}
          style={{ width, height }}
          resizeMode="cover"
          resizeMethod="resize"
        />
      </Animated.View>

      {/* Loading indicator */}
      {isLoading && !hasError && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999" />
        </View>
      )}

      {/* Actual image */}
      {imageUri && !hasError && (
        <Animated.View
          style={[styles.imageContainer, { opacity: imageOpacity }]}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width, height }}
            resizeMode="cover"
            resizeMethod="resize"
            onLoad={handleImageLoad}
            onError={handleImageError}
            // Performance settings
            fadeDuration={0}
            progressiveRenderingEnabled={true}
          />
        </Animated.View>
      )}

      {/* Error state - show placeholder */}
      {hasError && (
        <View style={styles.imageContainer}>
          <Image
            source={require("../assets/images/placeholder.png")}
            style={{ width, height }}
            resizeMode="cover"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default React.memo(CachedImageComponent);
