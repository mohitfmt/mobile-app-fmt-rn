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


import React, { useEffect, useState, useRef, useContext } from "react";
import { Image, Animated, StyleSheet, View } from "react-native";
import { downloadImage } from "@/app/components/functions/Functions";
import { ThemeContext } from "@/app/providers/ThemeProvider";

// CachedImageProps: Props for the cached image component (src, width, height).
interface CachedImageProps {
  src: string;
  width: number;
  height: number;
}

// CachedImageComponent: Main component for loading and displaying cached images.
// - Loads image from cache or remote
// - Shows placeholder and fades in image
// - Handles errors and fallbacks
const CachedImageComponent: React.FC<CachedImageProps> = ({
  src,
  width,
  height,
}) => {
  const { isOnline } = useContext(ThemeContext);
  const [imageUri, setImageUri] = useState<string | null>(null);
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

    const resolveImageUri = async () => {
      try {
        if (isOnline) {
          // Use live image directly
          if (isMounted.current) setImageUri(src);

          // Pre-cache for offline use silently
          await downloadImage(src);
        } else {
          // ❄️ Use cached version if available
          const cachedUri = await downloadImage(src);
          if (cachedUri && isMounted.current) {
            setImageUri(cachedUri);
          } else if (isMounted.current) {
            // fallback to placeholder
            setImageUri(null);
          }
        }
      } catch (error) {
        console.error("Error resolving image:", error);
        if (isMounted.current) setImageUri(null);
      }
    };

    resolveImageUri();
  }, [src, isOnline]);

  const handleImageLoad = () => {
    Animated.timing(placeholderOpacity, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(imageOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
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

      {/* Actual image */}
      {imageUri && (
        <Animated.View
          style={[styles.imageContainer, { opacity: imageOpacity }]}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width, height }}
            resizeMode="cover"
            resizeMethod="resize"
            onLoad={handleImageLoad}
            onError={() => {
              console.warn("Image failed to load:", imageUri);
              setImageUri(null);
            }}
          />
        </Animated.View>
      )}
    </View>
  );
};

// styles: StyleSheet for image container and layout.
const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  imageContainer: {
    width: "100%",
    height: "100%",
  },
});

export default React.memo(CachedImageComponent);
