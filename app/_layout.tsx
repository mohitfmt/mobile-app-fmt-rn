// _layout.tsx
//
// This is the main entry point for the app's layout and navigation structure.
// It initializes all global providers (theme, bookmarks, settings, data, landing, visited articles),
// loads custom fonts, sets up analytics, and configures notification/deep linking handling.
//
// Key responsibilities:
// - Load and apply custom fonts before rendering the app
// - Set up Expo Router navigation and deep linking
// - Initialize and wrap the app with all global providers
// - Integrate analytics and ad tracking
// - Handle push notifications and navigation from notifications
// - Display network error notification when offline
//
// Usage: This file is used by Expo Router as the root layout for the app. All screens/pages are rendered as children.
//
// -----------------------------------------------------------------------------

globalThis.RNFB_SILENCE_MODULAR_DEPRECATION_WARNINGS = true;
import { VisitedArticlesProvider } from "@/app/providers/VisitedArticleProvider";
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
  EventType,
} from "@notifee/react-native";
import analytics from "@react-native-firebase/analytics";
import messaging from "@react-native-firebase/messaging";
import axios from "axios";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Image,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Provider } from "react-redux";
import "./global.css";
import {
  ForceUpdateStatus,
  getForceUpdateStatus,
  openStoreForForceUpdate,
} from "./lib/forceUpdate";
import ConnectionErrorNotification from "./NetworkBanner";
import { BookmarkProvider } from "./providers/BookmarkContext";
import { DataProvider } from "./providers/DataProvider";
import { GlobalSettingsProvider } from "./providers/GlobalSettingsProvider";
import {
  LandingDataProvider,
  useLandingData,
} from "./providers/LandingProvider";
import { ThemeContext, ThemeProvider } from "./providers/ThemeProvider";
import store from "./store";
import { TextWithDefaultProps } from "./types/text";

if (Platform.OS === "android") {
  (Text as any).defaultProps = {
    ...(Text as any).defaultProps,
    allowFontScaling: false,
    includeFontPadding: false,
  };
}

// Constants: Navigation timeout, notification channel ID, topic mappings for push notifications.
const NAVIGATION_TIMEOUT = 2000;
const NOTIFICATION_CHANNEL_ID = "default";

// Topic Mappings
const TOPIC_MAPPINGS: Record<string, string[]> = {
  breakingNews: ["headlines", "news", "super-highlight", "top-news", "world"],
  beritaUtama: ["tempatan", "berita"],
  topOpinion: ["opinion"],
  topLifestyle: ["lifestyle"],
  topBusiness: ["business", "world-business", "local-business"],
  topSports: ["sports"],
};

let routerCalled = false;

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

import {
  getFcmToken,
  initializeNotificationsFlow,
  setupTokenRefreshListener,
} from "@/app/services/notificationService";

export { getFcmToken };

// Create Notification Channel
const createNotificationChannel = async (): Promise<string | null> => {
  try {
    const channelId = await notifee.createChannel({
      id: NOTIFICATION_CHANNEL_ID,
      name: "Default Channel",
      importance: AndroidImportance.HIGH,
    });
    return channelId;
  } catch (error) {
    console.error("Error creating notification channel:", error);
    return null;
  }
};

// Display Foreground Notification
const displayForegroundNotification = async (
  title: string,
  body: string,
  date: string,
  slug: string,
  imageUrl?: string,
) => {
  try {
    const channelId = await createNotificationChannel();
    if (!channelId) return;

    await notifee.displayNotification({
      title,
      body,
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        smallIcon: "ic_launcher",
        actions: [{ title: "OPEN", pressAction: { id: "open" } }],
        timestamp: Date.now(),
        showTimestamp: true,
        pressAction: {
          id: "default",
        },
        style: imageUrl
          ? {
              type: AndroidStyle.BIGPICTURE,
              picture: imageUrl,
            }
          : undefined,
      },
      ios: {
        sound: "default",
        foregroundPresentationOptions: {
          alert: true,
          badge: true,
          sound: true,
        },
      },
      data: { slug, date },
    });
  } catch (error) {
    console.error("Error displaying notification:", error);
  }
};

// Handle Notification Navigation
const handleNotificationNavigation = async (data: {
  slug?: string;
  date?: string;
}) => {
  if (!data.slug || !data.date || routerCalled) return;

  routerCalled = true;
  const url = `fmtnews://components/articles/NetworkArticle?slug=${data.slug}&date=${data.date}`;

  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
    }
  } catch (error) {
    console.error("Navigation error:", error);
  } finally {
    setTimeout(() => {
      routerCalled = false;
    }, 2000);
  }
};

// Request Android Notification Permission
const requestAndroidNotificationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;

  if (Platform.Version >= 33) {
    try {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: "Notification Permission",
          message:
            "This app needs notification permission to send you updates.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        },
      );
      return permission === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error("Error requesting Android notification permission:", error);
      return false;
    }
  }
  return true;
};

// Initialize Notifications
const initializeNotifications = async () => {
  try {
    if (Platform.OS === "android") {
      await createNotificationChannel();
    }

    // Run unified notification initialization flow
    await initializeNotificationsFlow();

    // Register token refresh listener
    setupTokenRefreshListener();

    // Foreground notification handler
    let lastMessageId: string | undefined;

    messaging().onMessage(async (remoteMessage) => {
      if (!remoteMessage) return;

      const currentMessageId = remoteMessage.messageId || `${Date.now()}`;
      if (currentMessageId === lastMessageId) return;
      lastMessageId = currentMessageId;

      const { notification, data } = remoteMessage;

      if (!notification) return;

      if (Platform.OS === "ios") {
        await notifee.displayNotification({
          title: notification.title || "New Notification",
          body: notification.body || "You have a new message",
          ios: {
            sound: "default",
            foregroundPresentationOptions: {
              alert: true,
              badge: true,
              sound: true,
            },
          },
          data,
        });
      } else {
        await displayForegroundNotification(
          notification.title || "New Notification",
          notification.body || "You have a new message",
          (data?.date as string) || "",
          (data?.slug as string) || "",
          (data?.imageUrl as string) || "",
        );
      }

      // Log analytics for notification received
      analytics().logEvent("notification_received", {
        notification_id: remoteMessage.messageId,
        article_id: data?.slug,
      });
    });

    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      // Handle background messages if needed
    });

    // Foreground event handler
    notifee.onForegroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS && detail.pressAction?.id === "default") {
        const data = detail.notification?.data || {};
        await handleNotificationNavigation(data);
        analytics().logEvent("notification_opened", {
          article_id: data.slug,
        });
      }
    });

    // Opened from background
    messaging().onNotificationOpenedApp(async (remoteMessage) => {
      await handleNotificationNavigation(remoteMessage.data || {});
      analytics().logEvent("notification_opened", {
        article_id: remoteMessage.data?.slug,
      });
    });

    // Opened from quit state
    const initialMessage = await messaging().getInitialNotification();
    if (initialMessage) {
      await handleNotificationNavigation(initialMessage.data || {});
      analytics().logEvent("notification_opened", {
        article_id: initialMessage.data?.slug,
      });
    }
  } catch (error) {
    console.error("Notification initialization failed:", error);
  }
};

export default function RootLayout() {
  const [loaded] = useFonts({
    "SF-Pro-Display-Bold": require("./assets/fonts/SF-Pro/SF-Pro-Display-Bold.otf"),
    "SF-Pro-Display-Black": require("./assets/fonts/SF-Pro/SF-Pro-Display-Black.otf"),
    "SF-Pro-Display-Heavy": require("./assets/fonts/SF-Pro/SF-Pro-Display-Heavy.otf"),
    "SF-Pro-Display-Medium": require("./assets/fonts/SF-Pro/SF-Pro-Display-Medium.otf"),
    "SF-Pro-Display-MediumItalic": require("./assets/fonts/SF-Pro/SF-Pro-Display-MediumItalic.otf"),
    "SF-Pro-Display-Regular": require("./assets/fonts/SF-Pro/SF-Pro-Display-Regular.otf"),
    "SF-Pro-Display-RegularItalic": require("./assets/fonts/SF-Pro/SF-Pro-Display-RegularItalic.otf"),
    "SF-Pro-Display-Semibold": require("./assets/fonts/SF-Pro/SF-Pro-Display-Semibold.otf"),
    "SF-Pro-Display-Light": require("./assets/fonts/SF-Pro/SF-Pro-Display-Light.otf"),
    "SF-Pro-Text-Bold": require("./assets/fonts/SF-Pro/SF-Pro-Text-Bold.otf"),
    "SF-Pro-Text-Medium": require("./assets/fonts/SF-Pro/SF-Pro-Text-Medium.otf"),
    "SF-Pro-Text-Regular": require("./assets/fonts/SF-Pro/SF-Pro-Text-Regular.otf"),
    "SF-Pro-Text-Light": require("./assets/fonts/SF-Pro/SF-Pro-Text-Light.otf"),
  });

  useEffect(() => {
    (Text as unknown as TextWithDefaultProps).defaultProps =
      (Text as unknown as TextWithDefaultProps).defaultProps || {};
    (Text as unknown as TextWithDefaultProps).defaultProps!.allowFontScaling =
      false;

    (TextInput as unknown as TextWithDefaultProps).defaultProps =
      (TextInput as unknown as TextWithDefaultProps).defaultProps || {};
    (
      TextInput as unknown as TextWithDefaultProps
    ).defaultProps!.allowFontScaling = false;
  }, []);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  useEffect(() => {
    if (loaded) {
      const init = async () => {
        try {
          await analytics().logEvent("screen_view", {
            screen_name: "Home",
            screen_class: "HomeScreen",
          });
          await initializeNotifications();
        } catch (error) {
          console.error("Initialization error:", error);
        }
      };
      init();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  // Return providers in correct order
  return (
    <ThemeProvider>
      <GlobalSettingsProvider>
        <Provider store={store}>
          <BookmarkProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <DataProvider>
                <LandingDataProvider>
                  <VisitedArticlesProvider>
                    <AppNavigator />
                  </VisitedArticlesProvider>
                </LandingDataProvider>
              </DataProvider>
            </GestureHandlerRootView>
          </BookmarkProvider>
        </Provider>
      </GlobalSettingsProvider>
    </ThemeProvider>
  );
}

function AppNavigator() {
  const { isOnline, setIsOnline, theme } = useContext(ThemeContext);
  const { refreshLandingPages } = useLandingData();
  const [forceUpdateStatus, setForceUpdateStatus] =
    useState<ForceUpdateStatus | null>(null);
  const [isCheckingForceUpdate, setIsCheckingForceUpdate] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function checkForceUpdate() {
      try {
        const status = await getForceUpdateStatus();
        if (!isMounted) return;
        setForceUpdateStatus(status);
      } catch (error) {
        console.error("Force update check failed", error);
      } finally {
        if (!isMounted) return;
        setIsCheckingForceUpdate(false);
      }
    }

    checkForceUpdate();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleForceUpdatePress = useCallback(async () => {
    if (!forceUpdateStatus?.storeUrl) return;
    await openStoreForForceUpdate(forceUpdateStatus.storeUrl);
  }, [forceUpdateStatus?.storeUrl]);

  const handleTryAgain = async () => {
    try {
      await axios.head("https://www.google.com", { timeout: 3000 });
      setIsOnline(true);
      await refreshLandingPages();
    } catch (err: unknown) {
      setIsOnline(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.log("Reconnection failed", errorMessage);
    }
  };

  const shouldShowForceUpdateModal =
    !isCheckingForceUpdate && !!forceUpdateStatus?.shouldForceUpdate;

  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="components/bookmark/Bookmark"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/search/Search"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/articles/Article"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/articles/NetworkArticle"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/tags/Tags"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/categoryPage/CategoryPage"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/settings/Settings"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/videos/CategoryVideoPage"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/videos/VideoPlayer"
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="components/mainCategory/SwipableArticle"
          options={{ headerShown: false }}
        />
      </Stack>
      <ConnectionErrorNotification
        onTryAgain={handleTryAgain}
        visible={!isOnline}
      />
      {forceUpdateStatus && (
        <Modal
          animationType="fade"
          transparent
          visible={shouldShowForceUpdateModal}
          onRequestClose={() => {}}
          statusBarTranslucent
        >
          <View style={styles.forceUpdateBackdrop}>
            <View
              style={[
                styles.forceUpdateCard,
                {
                  backgroundColor:
                    theme.backgroundColor === "#000000" ? "#111111" : "#ffffff",
                },
              ]}
            >
              <Image
                source={require("./assets/images/icon_FMT.png")}
                style={styles.forceUpdateLogo}
              />
              <Text
                style={[styles.forceUpdateTitle, { color: theme.textColor }]}
              >
                {forceUpdateStatus?.title}
              </Text>
              <Text
                style={[styles.forceUpdateMessage, { color: theme.textColor }]}
              >
                {forceUpdateStatus?.message}
              </Text>
              <Text
                style={[
                  styles.forceUpdateVersionText,
                  {
                    color:
                      theme.backgroundColor === "#000000"
                        ? "#9ca3af"
                        : "#6b7280",
                  },
                ]}
              >
                Current: {forceUpdateStatus?.currentVersion}
              </Text>
              <Text
                style={[
                  styles.forceUpdateVersionText,
                  {
                    color:
                      theme.backgroundColor === "#000000"
                        ? "#9ca3af"
                        : "#6b7280",
                  },
                ]}
              >
                Required: {forceUpdateStatus?.minimumVersion}
              </Text>
              <TouchableOpacity
                style={styles.forceUpdateButton}
                onPress={handleForceUpdatePress}
                activeOpacity={0.8}
              >
                <Text style={styles.forceUpdateButtonText}>
                  {forceUpdateStatus?.ctaLabel}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  forceUpdateBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  forceUpdateCard: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 14,
    padding: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  forceUpdateLogo: {
    width: 100,
    height: 40,
    alignSelf: "center",
    marginBottom: 14,
  },
  forceUpdateTitle: {
    fontSize: 18,
    fontFamily: "SF-Pro-Display-Bold",
    textAlign: "center",
    marginBottom: 12,
  },
  forceUpdateMessage: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "SF-Pro-Text-Regular",
    textAlign: "center",
    marginBottom: 16,
  },
  forceUpdateVersionText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
    fontFamily: "SF-Pro-Text-Medium",
    textAlign: "center",
  },
  forceUpdateButton: {
    marginTop: 16,
    borderRadius: 10,
    backgroundColor: "#c62828",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  forceUpdateButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontFamily: "SF-Pro-Display-Semibold",
  },
});
