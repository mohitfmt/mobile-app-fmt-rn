// app/services/notificationService.ts
//
// Centralized notification service managing Firebase Cloud Messaging (FCM),
// APNs registration, permission handling, topic subscriptions, token refreshes,
// and state migrations.
// -----------------------------------------------------------------------------

import { storage } from "@/app/lib/storage";
import messaging, {
  FirebaseMessagingTypes,
} from "@react-native-firebase/messaging";
import { PermissionsAndroid, Platform } from "react-native";

export interface NotificationSetting {
  id: string;
  title: string;
  enabled: boolean;
  key: string;
  topic: string;
}

export const NOTIFICATION_SYNC_VERSION_KEY = "notification_sync_version";
export const CURRENT_NOTIFICATION_SYNC_VERSION = "v2";
export const NOTIFICATIONS_INITIALIZED_KEY = "notificationsInitialized";
export const PRIMARY_TOPIC = "breakingNews";
export const PRIMARY_TOPIC_KEY = "breakingNewsEnabled";

// Debug logging flag - set to true if diagnostic logs are needed
const DEBUG_LOGGING = false;

const debugLog = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.log(...args);
  }
};

const debugWarn = (...args: any[]) => {
  if (DEBUG_LOGGING) {
    console.warn(...args);
  }
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSetting[] = [
  {
    id: "1",
    title: "Headlines",
    enabled: false,
    key: "breakingNewsEnabled",
    topic: "breakingNews",
  },
  {
    id: "2",
    title: "Berita utama",
    enabled: false,
    key: "beritaUtamaEnabled",
    topic: "beritaUtama",
  },
  {
    id: "3",
    title: "Top opinion",
    enabled: false,
    key: "topOpinionEnabled",
    topic: "topOpinion",
  },
  {
    id: "4",
    title: "Top lifestyle",
    enabled: false,
    key: "topLifestyleEnabled",
    topic: "topLifestyle",
  },
  {
    id: "5",
    title: "Top business",
    enabled: false,
    key: "topBusinessEnabled",
    topic: "topBusiness",
  },
  {
    id: "6",
    title: "Top sports",
    enabled: false,
    key: "topSportsEnabled",
    topic: "topSports",
  },
];

// Helper: Safely mask token for logs without exposing full secret
export const maskToken = (token: string | null | undefined): string => {
  if (!token || typeof token !== "string") return "N/A";
  if (token.length <= 12) return "***";
  return `${token.slice(0, 6)}...${token.slice(-6)}`;
};

// Helper: Format error for structured logging
const logNotificationError = (operation: string, error: any) => {
  if (DEBUG_LOGGING) {
    console.error(`[Notifications] ERROR: ${operation}`);
    console.error(`[Notifications] Error name: ${error?.name || "Error"}`);
    if (error?.code) {
      console.error(`[Notifications] Error code: ${error.code}`);
    }
    console.error(
      `[Notifications] Error message: ${error?.message || String(error)}`
    );
  }
};

// Helper: Check if permission is granted
export const isPermissionGranted = (
  authStatus: FirebaseMessagingTypes.AuthorizationStatus
): boolean => {
  return (
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL
  );
};

// Helper: Get permission status string
const getAuthStatusString = (
  authStatus: FirebaseMessagingTypes.AuthorizationStatus
): string => {
  switch (authStatus) {
    case messaging.AuthorizationStatus.AUTHORIZED:
      return "AUTHORIZED";
    case messaging.AuthorizationStatus.PROVISIONAL:
      return "PROVISIONAL";
    case messaging.AuthorizationStatus.DENIED:
      return "DENIED";
    case messaging.AuthorizationStatus.NOT_DETERMINED:
      return "NOT_DETERMINED";
    default:
      return "UNKNOWN";
  }
};

/**
 * Request notification permissions across iOS and Android
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    debugLog("[Notifications] Requesting notification permission");

    if (Platform.OS === "android") {
      if (Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: "Notification Permission",
            message:
              "This app needs notification permission to send you updates.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK",
          }
        );
        const isGranted = granted === PermissionsAndroid.RESULTS.GRANTED;
        debugLog(
          `[Notifications] Permission status: ${
            isGranted ? "AUTHORIZED" : "DENIED"
          }`
        );
        debugLog(`[Notifications] Permission granted: ${isGranted}`);
        return isGranted;
      }
      debugLog("[Notifications] Permission status: AUTHORIZED");
      debugLog("[Notifications] Permission granted: true");
      return true;
    }

    if (Platform.OS === "ios") {
      const authStatus = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });

      const statusStr = getAuthStatusString(authStatus);
      const granted = isPermissionGranted(authStatus);

      debugLog(`[Notifications] Permission status: ${statusStr}`);
      debugLog(`[Notifications] Permission granted: ${granted}`);

      return granted;
    }

    return false;
  } catch (error) {
    logNotificationError("requestNotificationPermission", error);
    return false;
  }
};

/**
 * Check current notification permission status without prompting
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
  try {
    if (Platform.OS === "android") {
      if (Platform.Version >= 33) {
        const check = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
        );
        return check;
      }
      return true;
    }

    if (Platform.OS === "ios") {
      const authStatus = await messaging().hasPermission();
      return isPermissionGranted(authStatus);
    }

    return false;
  } catch (error) {
    logNotificationError("checkNotificationPermission", error);
    return false;
  }
};

/**
 * Unified FCM Token retrieval with bounded APNs retry mechanism for iOS
 */
export const getFcmToken = async (
  maxApnsRetries: number = 5,
  retryDelayMs: number = 1500
): Promise<string | null> => {
  try {
    if (Platform.OS === "ios") {
      debugLog("[Notifications] Registering device for remote messages");
      await messaging().registerDeviceForRemoteMessages();
      debugLog("[Notifications] Remote message registration completed");

      const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
      debugLog(
        `[Notifications] isDeviceRegisteredForRemoteMessages: ${isRegistered}`
      );

      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        debugWarn(
          "[Notifications] iOS push permission not granted when requesting FCM token."
        );
        return null;
      }

      debugLog("[Notifications] Waiting for APNs token");
      let apnsToken: string | null = null;
      let attempt = 0;

      while (attempt < maxApnsRetries) {
        attempt++;
        apnsToken = await messaging().getAPNSToken();

        if (apnsToken) {
          debugLog("[Notifications] APNs token available: true");
          debugLog(
            `[Notifications] APNs token length: ${apnsToken.length}`
          );
          break;
        }

        if (attempt < maxApnsRetries) {
          debugLog(
            `[Notifications] APNs token unavailable — retry ${attempt}/${maxApnsRetries}`
          );
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }

      if (!apnsToken) {
        if (DEBUG_LOGGING) {
          console.error(
            `[Notifications] ERROR: APNs token unavailable after ${maxApnsRetries} attempts`
          );
        }
        return null;
      }
    }

    debugLog("[Notifications] Requesting FCM token");
    const fcmToken = await messaging().getToken();

    if (fcmToken) {
      debugLog("[Notifications] FCM token obtained: true");
      debugLog(`[Notifications] FCM token length: ${fcmToken.length}`);
      debugLog(
        `[Notifications] FCM token preview: ${maskToken(fcmToken)}`
      );
      return fcmToken;
    } else {
      debugLog("[Notifications] FCM token obtained: false");
      return null;
    }
  } catch (error) {
    logNotificationError("getFcmToken", error);
    return null;
  }
};

/**
 * Subscribe to an FCM Topic with explicit logging and await guarantee
 */
export const subscribeToTopic = async (topic: string): Promise<boolean> => {
  try {
    debugLog(`[Notifications] Attempting topic subscription: ${topic}`);
    await messaging().subscribeToTopic(topic);
    debugLog(`[Notifications] Topic subscription SUCCESS: ${topic}`);
    return true;
  } catch (error: any) {
    if (DEBUG_LOGGING) {
      console.error(`[Notifications] Topic subscription FAILED: ${topic}`);
      console.error(
        `[Notifications] Topic subscription error: ${
          error?.message || String(error)
        }`
      );
    }
    logNotificationError(`subscribeToTopic(${topic})`, error);
    return false;
  }
};

/**
 * Unsubscribe from an FCM Topic with explicit logging and await guarantee
 */
export const unsubscribeFromTopic = async (topic: string): Promise<boolean> => {
  try {
    debugLog(`[Notifications] Attempting topic unsubscription: ${topic}`);
    await messaging().unsubscribeFromTopic(topic);
    debugLog(`[Notifications] Topic unsubscription SUCCESS: ${topic}`);
    return true;
  } catch (error: any) {
    if (DEBUG_LOGGING) {
      console.error(`[Notifications] Topic unsubscription FAILED: ${topic}`);
      console.error(
        `[Notifications] Topic unsubscription error: ${
          error?.message || String(error)
        }`
      );
    }
    logNotificationError(`unsubscribeFromTopic(${topic})`, error);
    return false;
  }
};

/**
 * Helper for toggling topic subscription
 */
export const notificationSubscription = async (
  topic: string,
  subscribe: boolean
): Promise<boolean> => {
  if (subscribe) {
    return await subscribeToTopic(topic);
  } else {
    return await unsubscribeFromTopic(topic);
  }
};

// Singleton guard to prevent concurrent initialization runs
let initializationPromise: Promise<boolean> | null = null;

/**
 * Main Notification Initialization Flow
 * Handles:
 * 1. Fresh installations (requests permission, retrieves token, subscribes to breakingNews, sets flags)
 * 2. Existing installations repair (ensures breakingNews is subscribed without requiring reinstall)
 * 3. Already-verified installations
 */
export const initializeNotificationsFlow = async (): Promise<boolean> => {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async (): Promise<boolean> => {
    const isInitializedRaw = storage.getString(NOTIFICATIONS_INITIALIZED_KEY);
    const isInitialized = isInitializedRaw === "true";
    const syncVersion = storage.getString(NOTIFICATION_SYNC_VERSION_KEY);

    debugLog(
      "[Notifications] ===== Notification initialization started ====="
    );
    debugLog(`[Notifications] Platform: ${Platform.OS}`);
    debugLog(
      `[Notifications] notificationsInitialized: ${isInitialized}`
    );

    let permissionGranted = false;
    let remoteMessagingRegistered = false;
    let apnsAvailable = false;
    let fcmAvailable = false;
    let breakingNewsStatus: "SUCCESS" | "FAILED" | "NOT_ATTEMPTED" =
      "NOT_ATTEMPTED";

    try {
      // SCENARIO A: Existing user already verified in v2
      if (isInitialized && syncVersion === CURRENT_NOTIFICATION_SYNC_VERSION) {
        debugLog(
          "[Notifications] Existing notification installation detected"
        );
        debugLog(
          "[Notifications] Existing notification setup verified"
        );

        const hasPermission = await checkNotificationPermission();
        if (!hasPermission) {
          debugLog(
            "[Notifications] Notification permission is currently disabled in system settings."
          );
          logFailureResult(
            "DENIED",
            Platform.OS === "ios"
              ? messaging().isDeviceRegisteredForRemoteMessages
              : true,
            false,
            false,
            "NOT_ATTEMPTED",
            true
          );
          return false;
        }

        // Health check on token with standard bounded retry
        const token = await getFcmToken(5, 1500);
        const hasToken = !!token;

        if (hasToken) {
          debugLog("[Notifications] ========================================");
          debugLog("[Notifications] Notification initialization SUCCESS");
          debugLog(`[Notifications] Platform: ${Platform.OS}`);
          debugLog("[Notifications] Permission: granted");
          debugLog(
            `[Notifications] Remote messaging registered: ${
              Platform.OS === "ios"
                ? messaging().isDeviceRegisteredForRemoteMessages
                : true
            }`
          );
          debugLog(
            `[Notifications] APNs token available: ${
              Platform.OS === "ios" ? true : true
            }`
          );
          debugLog("[Notifications] FCM token available: true");
          debugLog(
            "[Notifications] breakingNews subscription: SUCCESS (verified)"
          );
          debugLog("[Notifications] notificationsInitialized: true");
          debugLog("[Notifications] ========================================");
          return true;
        } else {
          logFailureResult(
            "GRANTED",
            Platform.OS === "ios"
              ? messaging().isDeviceRegisteredForRemoteMessages
              : true,
            false,
            false,
            "NOT_ATTEMPTED",
            true
          );
          return false;
        }
      }

      // SCENARIO B: Existing user requiring migration/repair
      if (isInitialized && syncVersion !== CURRENT_NOTIFICATION_SYNC_VERSION) {
        debugLog(
          "[Notifications] Existing notification installation detected"
        );
        debugLog(
          "[Notifications] Verifying notification/topic setup for existing user"
        );
        debugLog(
          "[Notifications] Existing installation requires notification setup repair"
        );
        debugLog(
          "[Notifications] Repairing breakingNews subscription"
        );

        permissionGranted = await requestNotificationPermission();
        if (!permissionGranted) {
          debugWarn(
            "[Notifications] Permission not granted during existing user repair."
          );
          logFailureResult(
            "DENIED",
            remoteMessagingRegistered,
            apnsAvailable,
            fcmAvailable,
            breakingNewsStatus,
            isInitialized
          );
          return false;
        }

        const fcmToken = await getFcmToken();
        if (!fcmToken) {
          logFailureResult(
            "GRANTED",
            remoteMessagingRegistered,
            apnsAvailable,
            false,
            breakingNewsStatus,
            isInitialized
          );
          return false;
        }
        fcmAvailable = true;

        // Check if user previously explicitly disabled breaking news
        const breakingNewsEnabled = storage.getString(PRIMARY_TOPIC_KEY);
        let repairSuccess = true;

        if (breakingNewsEnabled !== "false") {
          breakingNewsStatus = (await subscribeToTopic(PRIMARY_TOPIC))
            ? "SUCCESS"
            : "FAILED";
          if (breakingNewsStatus === "SUCCESS") {
            storage.set(PRIMARY_TOPIC_KEY, "true");
          } else {
            repairSuccess = false;
          }
        } else {
          breakingNewsStatus = "SUCCESS"; // User intentionally disabled it
        }

        // Re-subscribe to any other topics the user has enabled in settings
        for (const setting of DEFAULT_NOTIFICATION_SETTINGS) {
          if (setting.topic !== PRIMARY_TOPIC) {
            const stored = storage.getString(setting.key);
            if (stored === "true") {
              await subscribeToTopic(setting.topic);
            }
          }
        }

        if (repairSuccess) {
          storage.set(
            NOTIFICATION_SYNC_VERSION_KEY,
            CURRENT_NOTIFICATION_SYNC_VERSION
          );
          debugLog("[Notifications] ========================================");
          debugLog("[Notifications] Notification initialization SUCCESS");
          debugLog(`[Notifications] Platform: ${Platform.OS}`);
          debugLog("[Notifications] Permission: granted");
          debugLog(
            `[Notifications] Remote messaging registered: ${
              Platform.OS === "ios"
                ? messaging().isDeviceRegisteredForRemoteMessages
                : true
            }`
          );
          debugLog(
            `[Notifications] APNs token available: ${
              Platform.OS === "ios" ? true : true
            }`
          );
          debugLog("[Notifications] FCM token available: true");
          debugLog(
            `[Notifications] breakingNews subscription: ${breakingNewsStatus}`
          );
          debugLog("[Notifications] notificationsInitialized: true");
          debugLog("[Notifications] ========================================");
          return true;
        } else {
          debugLog("[Notifications] Notification initialization FAILED");
          debugLog(
            "[Notifications] notificationsInitialized repair failed and will retry on next launch"
          );
          logFailureResult(
            "GRANTED",
            true,
            true,
            true,
            breakingNewsStatus,
            isInitialized
          );
          return false;
        }
      }

      // SCENARIO C: Fresh Installation
      permissionGranted = await requestNotificationPermission();
      if (!permissionGranted) {
        debugLog(
          "[Notifications] Notification permission denied or not determined."
        );
        logFailureResult(
          "DENIED",
          remoteMessagingRegistered,
          apnsAvailable,
          fcmAvailable,
          breakingNewsStatus,
          false
        );
        return false;
      }

      const fcmToken = await getFcmToken();
      if (!fcmToken) {
        if (DEBUG_LOGGING) {
          console.error(
            "[Notifications] Failed to retrieve FCM token during fresh initialization."
          );
        }
        logFailureResult(
          "GRANTED",
          Platform.OS === "ios"
            ? messaging().isDeviceRegisteredForRemoteMessages
            : true,
          false,
          false,
          breakingNewsStatus,
          false
        );
        return false;
      }
      fcmAvailable = true;
      apnsAvailable = true;
      remoteMessagingRegistered = true;

      // Subscribe to breakingNews topic
      const subSuccess = await subscribeToTopic(PRIMARY_TOPIC);
      if (!subSuccess) {
        breakingNewsStatus = "FAILED";
        if (DEBUG_LOGGING) {
          console.error(
            `[Notifications] Failed to subscribe to required topic: ${PRIMARY_TOPIC}`
          );
        }
        debugLog("[Notifications] Notification initialization FAILED");
        debugLog(
          "[Notifications] notificationsInitialized will remain false so setup can retry"
        );
        logFailureResult(
          "GRANTED",
          remoteMessagingRegistered,
          apnsAvailable,
          fcmAvailable,
          breakingNewsStatus,
          false
        );
        return false;
      }

      breakingNewsStatus = "SUCCESS";

      // Set default storage flags: breakingNews = true, all others = false
      storage.set(PRIMARY_TOPIC_KEY, "true");
      for (const setting of DEFAULT_NOTIFICATION_SETTINGS) {
        if (setting.topic !== PRIMARY_TOPIC) {
          storage.set(setting.key, "false");
        }
      }

      debugLog(
        "[Notifications] All required notification setup completed successfully"
      );
      debugLog(
        "[Notifications] Setting notificationsInitialized = true"
      );
      storage.set(NOTIFICATIONS_INITIALIZED_KEY, "true");
      storage.set(
        NOTIFICATION_SYNC_VERSION_KEY,
        CURRENT_NOTIFICATION_SYNC_VERSION
      );
      debugLog(
        "[Notifications] notificationsInitialized saved successfully"
      );

      debugLog("[Notifications] ========================================");
      debugLog("[Notifications] Notification initialization SUCCESS");
      debugLog(`[Notifications] Platform: ${Platform.OS}`);
      debugLog("[Notifications] Permission: granted");
      debugLog(
        `[Notifications] Remote messaging registered: ${remoteMessagingRegistered}`
      );
      debugLog(
        `[Notifications] APNs token available: ${
          Platform.OS === "ios" ? apnsAvailable : true
        }`
      );
      debugLog("[Notifications] FCM token available: true");
      debugLog("[Notifications] breakingNews subscription: SUCCESS");
      debugLog("[Notifications] notificationsInitialized: true");
      debugLog("[Notifications] ========================================");

      return true;
    } catch (error) {
      logNotificationError("initializeNotificationsFlow", error);
      debugLog("[Notifications] Notification initialization FAILED");
      debugLog(
        "[Notifications] notificationsInitialized will remain false so setup can retry"
      );
      logFailureResult(
        permissionGranted ? "GRANTED" : "DENIED",
        remoteMessagingRegistered,
        apnsAvailable,
        fcmAvailable,
        breakingNewsStatus,
        storage.getString(NOTIFICATIONS_INITIALIZED_KEY) === "true"
      );
      return false;
    } finally {
      initializationPromise = null;
    }
  })();

  return initializationPromise;
};

// Helper: Log failure banner
const logFailureResult = (
  permissionStatus: string,
  remoteRegistered: boolean,
  apnsAvailable: boolean,
  fcmAvailable: boolean,
  breakingNewsStatus: string,
  isInitialized: boolean
) => {
  debugLog("[Notifications] ========================================");
  debugLog("[Notifications] Notification initialization FAILED");
  debugLog(`[Notifications] Platform: ${Platform.OS}`);
  debugLog(`[Notifications] Permission: ${permissionStatus}`);
  debugLog(
    `[Notifications] Remote messaging registered: ${remoteRegistered}`
  );
  debugLog(
    `[Notifications] APNs token available: ${
      Platform.OS === "ios" ? apnsAvailable : true
    }`
  );
  debugLog(`[Notifications] FCM token available: ${fcmAvailable}`);
  debugLog(
    `[Notifications] breakingNews subscription: ${breakingNewsStatus}`
  );
  debugLog(
    `[Notifications] notificationsInitialized: ${isInitialized}`
  );
  debugLog("[Notifications] ========================================");
};

/**
 * Register FCM Token Refresh Listener
 * Automatically re-subscribes to active topics when the token changes
 */
export const setupTokenRefreshListener = (): (() => void) => {
  const unsubscribe = messaging().onTokenRefresh(async (newToken) => {
    try {
      debugLog(
        "[Notifications] ===== FCM token refresh detected ====="
      );
      debugLog("[Notifications] New FCM token received");
      debugLog(
        `[Notifications] New FCM token length: ${newToken?.length || 0}`
      );
      debugLog(
        `[Notifications] New FCM token preview: ${maskToken(newToken)}`
      );
      debugLog(
        "[Notifications] Re-validating notification/topic setup"
      );

      const hasPermission = await checkNotificationPermission();
      if (!hasPermission) {
        debugLog(
          "[Notifications] Token refresh: notification permission is not granted. Skipping topic subscriptions."
        );
        return;
      }

      // Re-verify breakingNews topic subscription if enabled
      const breakingNewsEnabled = storage.getString(PRIMARY_TOPIC_KEY);
      if (breakingNewsEnabled !== "false") {
        const subSuccess = await subscribeToTopic(PRIMARY_TOPIC);
        debugLog(
          `[Notifications] breakingNews subscription after token refresh: ${
            subSuccess ? "SUCCESS" : "FAILED"
          }`
        );
      }

      // Re-verify other user-enabled topics
      for (const setting of DEFAULT_NOTIFICATION_SETTINGS) {
        if (setting.topic !== PRIMARY_TOPIC) {
          const stored = storage.getString(setting.key);
          if (stored === "true") {
            await subscribeToTopic(setting.topic);
          }
        }
      }
    } catch (error) {
      logNotificationError("onTokenRefresh", error);
    }
  });

  return unsubscribe;
};

/**
 * Safe Diagnostic Helper: getNotificationDebugInfo
 */
export const getNotificationDebugInfo = async (): Promise<{
  platform: string;
  permissionGranted: boolean;
  isDeviceRegisteredForRemoteMessages: boolean;
  apnsTokenExists: boolean;
  fcmTokenExists: boolean;
  fcmTokenPreview: string;
  notificationsInitialized: boolean;
  notificationSyncVersion: string | null;
  storedTopicSettings: Record<string, string | null>;
}> => {
  try {
    const permissionGranted = await checkNotificationPermission();
    const isDeviceRegistered =
      Platform.OS === "ios"
        ? messaging().isDeviceRegisteredForRemoteMessages
        : true;

    let apnsTokenExists = false;
    if (Platform.OS === "ios") {
      const apns = await messaging().getAPNSToken();
      apnsTokenExists = !!apns;
    } else {
      apnsTokenExists = true;
    }

    let fcmTokenPreview = "N/A";
    let fcmTokenExists = false;
    try {
      const token = await messaging().getToken();
      if (token) {
        fcmTokenExists = true;
        fcmTokenPreview = maskToken(token);
      }
    } catch {
      fcmTokenExists = false;
    }

    const storedTopicSettings: Record<string, string | null> = {};
    for (const s of DEFAULT_NOTIFICATION_SETTINGS) {
      storedTopicSettings[s.key] = storage.getString(s.key) ?? null;
    }

    return {
      platform: Platform.OS,
      permissionGranted,
      isDeviceRegisteredForRemoteMessages: isDeviceRegistered,
      apnsTokenExists,
      fcmTokenExists,
      fcmTokenPreview,
      notificationsInitialized:
        storage.getString(NOTIFICATIONS_INITIALIZED_KEY) === "true",
      notificationSyncVersion:
        storage.getString(NOTIFICATION_SYNC_VERSION_KEY) ?? null,
      storedTopicSettings,
    };
  } catch (error) {
    logNotificationError("getNotificationDebugInfo", error);
    return {
      platform: Platform.OS,
      permissionGranted: false,
      isDeviceRegisteredForRemoteMessages: false,
      apnsTokenExists: false,
      fcmTokenExists: false,
      fcmTokenPreview: "ERROR",
      notificationsInitialized: false,
      notificationSyncVersion: null,
      storedTopicSettings: {},
    };
  }
};

// Default export: Dummy component for Expo Router compatibility
export default function NotificationService() {
  return null;
}
