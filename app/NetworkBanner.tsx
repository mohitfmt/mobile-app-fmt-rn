// NetworkBanner.tsx
//
// This file defines the ConnectionErrorNotification component, which displays a banner
// at the bottom of the screen when the app is offline or unable to connect to the network.
// It provides a 'Try again' button and auto-dismisses after a set duration. The banner
// is animated in/out and respects safe area insets. Used throughout the app to notify
// users of connectivity issues and allow retrying network requests.
//
// Key responsibilities:
// - Show a visible, animated notification when offline
// - Allow users to retry network requests via a button or tap
// - Auto-dismiss after a configurable duration
// - Integrate with global settings for text size
// - Respect safe area insets for proper display on all devices
//
// Usage: Import and render <ConnectionErrorNotification /> when network errors occur.
// Pass an onTryAgain handler to trigger a retry.
//
// -----------------------------------------------------------------------------

import React, { useEffect, useState, useRef, useContext } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { GlobalSettingsContext } from "./providers/GlobalSettingsProvider";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Define props interface with proper typing
interface ConnectionErrorNotificationProps {
  onTryAgain: () => void;
  getArticleTextSize?: (size: number, scale: string) => number;
  articleTextSize?: string;
  visible?: boolean;
  duration?: number;
}

const ConnectionErrorNotification: React.FC<
  ConnectionErrorNotificationProps
> = ({
  onTryAgain,
  getArticleTextSize,
  articleTextSize = "medium",
  visible = true,
  duration = 60000, // 30 seconds, matching Flushbar's 30 seconds
}) => {
  const [isVisible, setIsVisible] = useState(visible);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const timer = useRef<NodeJS.Timeout | null>(null);
  const { textSize } = useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();

  const dismiss = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 500,
      useNativeDriver: true,
    }).start(() => {
      setIsVisible(false);
    });

    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    if (visible) {
      setIsVisible(true);
      // Animate in - 500ms matches Flutter's animationDuration
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Set timer for auto-dismissal
      if (duration > 0) {
        timer.current = setTimeout(() => {
          dismiss();
        }, duration);
      }
    } else {
      dismiss();
    }

    return () => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
    };
  }, [visible]);

  // Handle tapping anywhere on the notification (matching onTap from Flushbar)
  const handleTap = () => {
    onTryAgain();
  };

  if (!isVisible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [50, 0], // Slides up from below
              }),
            },
          ],
          opacity: animatedValue,
          marginBottom: insets.bottom,
        },
      ]}
    >
      <TouchableWithoutFeedback onPress={handleTap}>
        <View style={styles.innerContainer}>
          <Text
            style={[
              styles.errorText,
              {
                fontSize: getArticleTextSize
                  ? getArticleTextSize(14, textSize)
                  : 14,
              },
            ]}
          >
            Unable to connect
          </Text>
          <TouchableOpacity
            onPress={() => {
              onTryAgain();
            }}
            style={styles.button}
          >
            <Text
              style={[
                styles.buttonText,
                {
                  fontSize: getArticleTextSize
                    ? getArticleTextSize(14, textSize)
                    : 14,
                },
              ]}
            >
              Try again
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 8, // Bottom margin matching the Flutter all: 8 margin
    left: 8,
    right: 8,
    borderRadius: 8, // Matching the Flutter borderRadius: 8
    backgroundColor: "#2A2A2A",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  innerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  errorText: {
    color: "white",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : undefined,
  },
  button: {
    // No background needed as it's just text
  },
  buttonText: {
    color: "white",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Medium",
    fontWeight: Platform.OS === "android" ? "500" : undefined,
  },
});

export default ConnectionErrorNotification;
