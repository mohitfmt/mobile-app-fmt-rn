// useSubscribeTopic.ts
//
// This file provides utilities for initializing and managing notification topic subscriptions
// using Firebase Cloud Messaging (FCM) in a React Native app. It ensures users are subscribed
// to the correct topics on first app launch and handles notification permissions and FCM tokens.
//
// Key responsibilities:
// - Request notification permissions from the user
// - Retrieve and store the FCM token
// - Subscribe to the "breakingNews" topic by default
// - Disable other topics by default
// - Store notification settings in MMKV
//
// Usage: Call initializeFirstTimeNotifications() on app start to set up notification topics.
//
// -----------------------------------------------------------------------------

import { storage } from "@/app/lib/storage";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

// DEFAULT_NOTIFICATION_SETTINGS: List of all notification topics and their settings.
const DEFAULT_NOTIFICATION_SETTINGS = [
  {
    key: "breakingNewsEnabled",
    topic: "breakingNews",
    id: "breakingNews",
    title: "Breaking News",
  },
  {
    key: "beritaUtamaEnabled",
    topic: "beritaUtama",
    id: "beritaUtama",
    title: "Berita Utama",
  },
  {
    key: "topOpinionEnabled",
    topic: "topOpinion",
    id: "topOpinion",
    title: "Top Opinion",
  },
  {
    key: "topLifestyleEnabled",
    topic: "topLifestyle",
    id: "topLifestyle",
    title: "Top Lifestyle",
  },
  {
    key: "topBusinessEnabled",
    topic: "topBusiness",
    id: "topBusiness",
    title: "Top Business",
  },
  {
    key: "topSportsEnabled",
    topic: "topSports",
    id: "topSports",
    title: "Top Sports",
  },
];

// getFcmToken: Retrieves the FCM token, handling iOS/Android differences.
const getFcmToken = async () => {
  try {
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();
      const apnsToken = await messaging().getAPNSToken();
      if (!apnsToken) {
        return new Promise((resolve) =>
          setTimeout(() => resolve(getFcmToken()), 3000)
        );
      }
    }

    const fcmToken = await messaging().getToken();
    return fcmToken;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

// initializeFirstTimeNotifications: Requests permissions, subscribes to topics, and stores settings on first launch.
export const initializeFirstTimeNotifications = async (
  maxRetries = 3,
  retryDelayMs = 2000
) => {
  const isFirstTime = await storage.getString("notificationsInitialized");
  if (isFirstTime) {
    return;
  }

  let retries = 0;
  let permissionGranted = false;

  while (retries <= maxRetries && !permissionGranted) {
    try {
      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
        provisional: true,
      });

      permissionGranted =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!permissionGranted) {
        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
          retries++;
          continue;
        }
        return;
      }

      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        throw new Error("Failed to retrieve FCM token");
      }

      // ✅ Subscribe only to "breakingNews"
      const headlineSetting = DEFAULT_NOTIFICATION_SETTINGS.find(
        (s) => s.topic === "breakingNews"
      );
      if (headlineSetting) {
        await messaging().subscribeToTopic(headlineSetting.topic);
        await storage.set(headlineSetting.key, "true");
      }

      // ❌ Disable all others by default
      for (const setting of DEFAULT_NOTIFICATION_SETTINGS) {
        if (setting.topic !== "breakingNews") {
          await storage.set(setting.key, "false");
        }
      }

      await storage.set("notificationsInitialized", "true");
    } catch (error: any) {
      console.error(
        `Error in initializeFirstTimeNotifications (attempt ${retries + 1}):`,
        error
      );

      if (retries < maxRetries) {
        retries++;
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        return;
      }
    }
  }
};

// Default export: Dummy function for Expo Router compatibility.
export default function UseSubscribeTopic() {
  return null;
}
