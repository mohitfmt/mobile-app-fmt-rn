/**
 * SettingsPage.tsx
 *
 * A fully-featured settings page for configuring app preferences.
 *
 * - **Manages general settings** (Theme, Text Size, Cache, Search History, Standfirst).
 * - **Handles push notifications** via Firebase Cloud Messaging (FCM).
 * - **Provides an About section** with app version & external links.
 * - **Uses AsyncStorage for persistent storage** of user preferences.
 *
 * Features:
 * - **Theme & Text Size customization** using ThemeContext & GlobalSettingsContext.
 * - **Push Notification subscription/unsubscription** via Firebase with alerts.
 * - **Clear search history & cache functionality**.
 * - **Supports Dark/Light mode dynamically**.
 *
 */

import React, { useState, useEffect, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
  Share,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChevronRight, X } from "lucide-react-native";
import { router } from "expo-router";
import { ChevronDown } from "@/app/assets/AllSVGs";
import StickyNotification from "./StickyNotification";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { getArticleTextSize } from "../functions/Functions";
import { AboutItem, NotificationSetting } from "@/app/types/settings";
import messaging from "@react-native-firebase/messaging";
import { Clipboard } from "react-native";
import * as Application from "expo-application";
import uuid from "react-native-uuid";
import SelectionModal from "./SelectionModal";
import { triggerInAppReview } from "@/app/lib/reviewApp";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Theme display/storage mappings
const themeDisplayMap = new Map<"system" | "light" | "dark", string>([
  ["system", "System default"],
  ["light", "Light"],
  ["dark", "Dark"],
]);

const themeStorageMap = new Map<string, "system" | "light" | "dark">([
  ["System default", "system"],
  ["Light", "light"],
  ["Dark", "dark"],
]);

export const getFcmToken = async () => {
  try {
    if (Platform.OS === "ios") {
      await messaging().registerDeviceForRemoteMessages();

      const apnsToken = await messaging().getAPNSToken();
      // console.log('APNs Token:', apnsToken);

      if (!apnsToken) {
        // console.log('Retrying to get APNs token...');
        return new Promise((resolve) =>
          setTimeout(() => resolve(getFcmToken()), 3000)
        );
      }
    }

    const fcmToken = await messaging().getToken();
    // console.log('FCM Token:', fcmToken);
    return fcmToken;
  } catch (error) {
    console.error("Error getting FCM token:", error);
    return null;
  }
};

const initializeFCM = async () => {
  try {
    // Request permission first
    const authStatus = await messaging().requestPermission({
      alert: true,
      announcement: false,
      badge: true,
      carPlay: false,
      criticalAlert: false,
      provisional: true,
      sound: true,
    });

    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      Alert.alert(
        "Notifications Disabled",
        "Please enable notifications in Settings to receive updates.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      throw new Error("Push notification permission denied");
    }

    // Get FCM token using getFcmToken
    const fcmToken = await getFcmToken();
    if (!fcmToken) {
      throw new Error("Failed to retrieve FCM token");
    }

    return fcmToken;
  } catch (error: any) {
    console.error("FCM initialization failed:", error);
    if (error.message.includes("No APNS token specified")) {
      Alert.alert(
        "Notification Setup Failed",
        "Unable to set up notifications due to APNs configuration. Please check your settings.",
        [{ text: "OK" }]
      );
    }
    throw error;
  }
};

const themeOptions = ["System default", "Light", "Dark"];
const textSizeOptions = ["System default", "Small", "Medium", "Large"];

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { textSize, setTextSize, standfirstEnabled, setStandfirstEnabled } =
    useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();

  // Notification settings state - matching Flutter's notification topics
  const [notificationSettings, setNotificationSettings] = useState<
    NotificationSetting[]
  >([
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
  ]);

  // General app settings
  const [generalSettings, setGeneralSettings] = useState({
    appTheme: "System default",
  });

  // Theme & Text Size Modals
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showTextSizeModal, setShowTextSizeModal] = useState(false);
  const [hasScrolled, setHasScrolled] = useState(false);

  const [deviceInfo, setDeviceInfo] = useState({
    uuid: "Not available",
    version: "v2.1.4",
  });

  /**
   * Handles Theme Change & Updates AsyncStorage
   */
  const handleThemeChange = async (newThemeLabel: string) => {
    const themeValue = themeStorageMap.get(newThemeLabel) || "system";
    try {
      await AsyncStorage.setItem("apptheme", themeValue);
      setGeneralSettings((prev) => ({ ...prev, appTheme: newThemeLabel }));
      toggleTheme(themeValue);
      setShowThemeModal(false);
    } catch (error) {
      console.error("Error saving theme:", error);
    }
  };

  /**
   * Handles Text Size Change & Updates Global Context
   */
  const handleTextSizeChange = async (newSize: string) => {
    try {
      await AsyncStorage.setItem("textsize", newSize);
      setTextSize(newSize);
      setShowTextSizeModal(false);
    } catch (error) {
      console.error("Error saving text size:", error);
    }
  };

  /**
   * Function to handle notification subscription similar to Flutter's notificationSubscription
   */
  const notificationSubscription = async (
    topic: string,
    subscribe: boolean
  ) => {
    try {
      if (subscribe) {
        await messaging().subscribeToTopic(topic);
        // console.log(`Subscribed to topic: ${topic}`);
      } else {
        await messaging().unsubscribeFromTopic(topic);
        // console.log(`Unsubscribed from topic: ${topic}`);
      }
    } catch (error) {
      console.error(
        `Error ${
          subscribe ? "subscribing to" : "unsubscribing from"
        } topic ${topic}:`,
        error
      );
      throw error;
    }
  };

  /**
   * Initialize notification settings for first-time users
   */
  /**
   * Initialize notification settings for first-time users
   * Only enables "Headlines" notification by default, rest remain disabled
   */
  const initializeFirstTimeNotifications = async (
    setNotificationSettings: React.Dispatch<
      React.SetStateAction<NotificationSetting[]>
    >
  ) => {
    try {
      const isFirstTime = await AsyncStorage.getItem(
        "notificationsInitialized"
      );
      if (isFirstTime !== null) return;

      // Mark as initialized early to avoid race conditions
      await AsyncStorage.setItem("notificationsInitialized", "true");

      // Only enable Headlines notification (id: '1'), keep others disabled
      const defaultSettings = notificationSettings.map((setting) => ({
        ...setting,
        enabled: setting.id === "1", // Only enable Headlines notification
      }));

      // Update state immediately
      setNotificationSettings(defaultSettings);

      // Get only the enabled settings (Headlines only)
      const enabledSettings = defaultSettings.filter(
        (setting) => setting.enabled
      );

      // Perform subscriptions only for enabled notifications (Headlines only)
      Promise.all(
        enabledSettings.map((setting) =>
          notificationSubscription(setting.topic, true)
        )
      ).catch((error) => {
        console.error("Error subscribing to topics in background:", error);
      });

      // Save all settings to AsyncStorage (Headlines: true, others: false)
      Promise.all(
        defaultSettings.map((setting) =>
          AsyncStorage.setItem(setting.key, setting.enabled.toString())
        )
      ).catch((error) => {
        console.error(
          "Error saving notification settings in background:",
          error
        );
      });

      // console.log('[Init] Only Headlines notification enabled by default on first install');
    } catch (error) {
      console.error("Error initializing first-time notifications:", error);
    }
  };

  /**
   * Initializes push notifications & loads settings - adapted from Flutter logic
   */
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        // Load existing notification settings from AsyncStorage first
        const updatedSettings = await Promise.all(
          notificationSettings.map(async (setting) => {
            const storedValue = await AsyncStorage.getItem(setting.key);
            return { ...setting, enabled: storedValue === "true" };
          })
        );
        setNotificationSettings(updatedSettings);

        // Initialize FCM if any notifications are enabled
        let fcmInitialized = false;
        const enabledSettings = updatedSettings.filter((s) => s.enabled);
        if (enabledSettings.length > 0 && !fcmInitialized) {
          try {
            await initializeFCM();
            fcmInitialized = true;
          } catch (error) {
            console.error(
              "FCM initialization failed, disabling notifications:",
              error
            );
            await Promise.all(
              enabledSettings.map((setting) =>
                AsyncStorage.setItem(setting.key, "false")
              )
            );
            setNotificationSettings((prev) =>
              prev.map((s) => ({ ...s, enabled: false }))
            );
          }
        }

        // Check if this is first time setup
        await initializeFirstTimeNotifications(setNotificationSettings);

        // Load standfirst setting
        const standfirstSetting = await AsyncStorage.getItem(
          "standfirstenabled"
        );
        if (standfirstSetting !== null) {
          setStandfirstEnabled(standfirstSetting === "true");
        }

        // Load theme setting
        const storedTheme = (await AsyncStorage.getItem("apptheme")) as
          | "system"
          | "light"
          | "dark"
          | null;
        const themeKey = storedTheme || "system";
        const themeLabel = themeDisplayMap.get(themeKey) || "System default";
        setGeneralSettings({ appTheme: themeLabel });
        toggleTheme(themeKey);

        // Load text size setting
        const storedTextSize = await AsyncStorage.getItem("textsize");
        if (storedTextSize) {
          setTextSize(storedTextSize);
        }
      } catch (error) {
        console.error("Error initializing settings:", error);
      }
    };

    const fetchDeviceInfo = async () => {
      const UUID_KEY = "deviceuuid";
      let uuidStr = await AsyncStorage.getItem(UUID_KEY);
      if (!uuidStr) {
        uuidStr = uuid.v4().toString().replace(/-/g, "");
        await AsyncStorage.setItem(UUID_KEY, uuidStr);
      }
      const version = `v${Application.nativeApplicationVersion || "2.1.4"}`;
      setDeviceInfo({ uuid: uuidStr, version });
    };

    initializeSettings();
    fetchDeviceInfo();
  }, []);

  /**
   * Handles Notification Toggle - adapted from Flutter's notification logic
   */
  const handleNotificationToggle = async (settingId: string) => {
    const setting = notificationSettings.find((s) => s.id === settingId);
    if (!setting) return;

    const newEnabled = !setting.enabled;

    // Update UI immediately
    setNotificationSettings((prevSettings) =>
      prevSettings.map((s) =>
        s.id === settingId ? { ...s, enabled: newEnabled } : s
      )
    );

    // Perform async operations in background
    (async () => {
      try {
        if (newEnabled) {
          // Initialize FCM first
          await initializeFCM();
          // Subscribe to topic
          await notificationSubscription(setting.topic, true);
        } else {
          // For unsubscribing, ensure we have a valid FCM token
          const fcmToken = await messaging().getToken();
          if (!fcmToken) {
            throw new Error("No FCM token available");
          }
          // Unsubscribe from topic
          await notificationSubscription(setting.topic, false);
        }

        // Save setting to AsyncStorage
        await AsyncStorage.setItem(setting.key, newEnabled.toString());
      } catch (error) {
        console.error("Error toggling notification:", error);
        // Roll back UI on error
        setNotificationSettings((prevSettings) =>
          prevSettings.map((s) =>
            s.id === settingId ? { ...s, enabled: !newEnabled } : s
          )
        );
        Alert.alert(
          "Error",
          `Failed to ${newEnabled ? "enable" : "disable"} ${
            setting.title
          } notifications`
        );
      }
    })();
  };

  /**
   * Save standfirst setting - matching Flutter logic
   */
  const saveStandfirstSetting = async (value: boolean) => {
    try {
      await AsyncStorage.setItem("standfirstenabled", value.toString());
      setStandfirstEnabled(value);
    } catch (error) {
      console.error("Error saving standfirst setting:", error);
    }
  };

  // Utility functions
  const [notificationMessage, setNotificationMessage] = useState("");

  const clearSearchHistory = async () => {
    try {
      await AsyncStorage.setItem("searchHistory", JSON.stringify([]));
      setNotificationMessage("Search history cleared");
    } catch (error) {
      setNotificationMessage("Failed to clear search history");
    }
  };

  const clearCacheData = async () => {
    try {
      await AsyncStorage.setItem("cachedImages", JSON.stringify([]));
      await AsyncStorage.setItem("visitedArticles", JSON.stringify([]));

      setNotificationMessage("Cache data cleared");
    } catch (error) {
      setNotificationMessage("Failed to clear cache data");
    }
  };

  const launchAction = (url: string) => {
    Linking.openURL(url).catch((err) =>
      Alert.alert("Error", "Unable to open link")
    );
  };

  // Render functions
  const renderSettingItem = (
    title: string,
    value: string | boolean,
    onPress: () => void,
    isSwitch: boolean = false
  ) => (
    <TouchableOpacity
      style={styles.settingItem}
      onPress={!isSwitch ? onPress : undefined}
      activeOpacity={isSwitch ? 1 : 0.7}
    >
      <View style={styles.settingContent}>
        <Text
          style={[
            styles.settingTitle,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(16.0, textSize),
            },
          ]}
        >
          {title}
        </Text>
        {typeof value === "string" && value && (
          <Text
            style={[
              styles.settingValue,
              { fontSize: getArticleTextSize(14.0, textSize) },
            ]}
          >
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </Text>
        )}
      </View>
      {isSwitch ? (
        Platform.OS === "ios" ? (
          <Switch
            value={value as boolean}
            onValueChange={onPress}
            trackColor={{ false: "#9e9e9e", true: "#B9162A" }}
            thumbColor={"#f4f3f4"}
          />
        ) : (
          <Switch
            value={value as boolean}
            onValueChange={onPress}
            trackColor={{ false: "#9e9e9e", true: "#e19393" }}
            thumbColor={value ? "#DC2626" : "#f4f3f4"}
          />
        )
      ) : (
        value && <ChevronDown size={20} color="#9e9e9e" />
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, children: React.ReactNode) => (
    <View style={[styles.section, { backgroundColor: theme.backgroundColor }]}>
      <Text
        style={[
          styles.sectionHeader,
          { color: "#9e9e9e", fontSize: getArticleTextSize(16.0, textSize) },
        ]}
      >
        {title}
      </Text>
      {children}
    </View>
  );

  const aboutItems: AboutItem[] = [
    {
      title: "About FMT",
      action: () => launchAction("https://www.freemalaysiatoday.com/about/"),
      isLink: true,
    },
    {
      title: "Share this app",
      action: () => {
        Share.share(
          {
            message:
              "Download FMT's new mobile app now! \n\niOS / Android: http://onelink.to/5fu2cq",
          },
          {
            dialogTitle: "Share FMT App",
            excludedActivityTypes: [],
          }
        );
      },
    },
    {
      title: "Review this app",
      action: () => triggerInAppReview(),
      isLink: false,
    },
    {
      title: "Privacy policy",
      action: () =>
        launchAction("https://www.freemalaysiatoday.com/privacy-policy"),
      isLink: true,
    },
    {
      title: "Terms of use",
      action: () =>
        launchAction("https://www.freemalaysiatoday.com/privacy-policy"),
      isLink: true,
    },
  ];

  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionHeader,
          { color: "#9e9e9e", fontSize: getArticleTextSize(16.0, textSize) },
        ]}
      >
        About
      </Text>
      {aboutItems.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.settingItem}
          onPress={item.action}
          disabled={!item.isLink && !item.action}
        >
          <Text
            style={[
              styles.settingTitle,
              {
                color: theme.textColor,
                fontSize: getArticleTextSize(16.0, textSize),
              },
            ]}
          >
            {item.title}
          </Text>
          <ChevronRight size={24} color="#9e9e9e" />
        </TouchableOpacity>
      ))}
      <View
        style={[
          styles.settingItem,
          {
            justifyContent: "space-between",
            flexDirection: "row",
            paddingLeft: 2,
          },
        ]}
      >
        <Text
          style={[
            styles.settingTitle,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(16.0, textSize),
            },
          ]}
        >
          Version
        </Text>
        <Text
          style={[
            styles.settingTitle,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(16.0, textSize),
            },
          ]}
        >
          {deviceInfo.version}
        </Text>
      </View>
    </View>
  );

  const copyDeviceId = () => {
    Clipboard.setString(deviceInfo.uuid);
    setNotificationMessage("Copied to clipboard");
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          paddingTop: Platform.OS === "android" ? insets.top : 0,
        },
      ]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.backgroundColor,
            paddingHorizontal: 8,
            paddingVertical: 10,
            ...(Platform.OS === "ios"
              ? {
                  borderBottomWidth: 0,
                  shadowColor: hasScrolled ? "#000" : "transparent",
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: hasScrolled ? 0.1 : 0,
                  shadowRadius: hasScrolled ? 2 : 0,
                  marginTop: 44,
                }
              : {
                  borderBottomWidth: hasScrolled ? 1 : 0,
                  borderBottomColor: "rgba(0, 0, 0, 0.12)",
                  ...(hasScrolled && {
                    shadowColor: "#000",
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                    shadowOffset: { width: 0, height: 2 },
                  }),
                }),
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.iconContainer}
        >
          <X size={24} color="#DC2626" />
        </TouchableOpacity>
        <Text
          style={[
            styles.relatedTitle,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(22.0, textSize),
            },
          ]}
        >
          SETTINGS
        </Text>
        <View style={styles.iconContainer} />
        {Platform.OS === "android" && hasScrolled && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: "rgba(0,0,0,0.1)",
            }}
          />
        )}
      </View>
      <ScrollView
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundColor,
            paddingHorizontal: 18,
            paddingTop: 0,
          },
        ]}
        onScroll={(event) => {
          const offsetY = event.nativeEvent.contentOffset.y;
          setHasScrolled(offsetY > 1);
        }}
        scrollEventThrottle={16}
      >
        {/* General Settings Section */}
        {renderSection(
          "General",
          <>
            {renderSettingItem("Theme", generalSettings.appTheme, () =>
              setShowThemeModal(true)
            )}
            {renderSettingItem("Text size", textSize, () =>
              setShowTextSizeModal(true)
            )}
            {renderSettingItem("Clear search history", "", clearSearchHistory)}
            {renderSettingItem("Clear cache data", "", clearCacheData)}
          </>
        )}

        {/* Article Settings Section */}
        {renderSection(
          "Article",
          renderSettingItem(
            "Standfirst",
            standfirstEnabled,
            () => {
              saveStandfirstSetting(!standfirstEnabled);
            },
            true
          )
        )}

        {/* Notifications Section */}
        {renderSection(
          "Notifications",
          <>
            {notificationSettings.map((setting) => (
              <View key={setting.id}>
                {renderSettingItem(
                  setting.title,
                  setting.enabled,
                  () => handleNotificationToggle(setting.id),
                  true
                )}
              </View>
            ))}
          </>
        )}

        {/* About Section */}
        {renderAboutSection()}

        {notificationMessage ? (
          <StickyNotification
            message={notificationMessage}
            onClose={() => setNotificationMessage("")}
          />
        ) : null}

        <View
          style={[
            styles.divider,
            {
              backgroundColor:
                theme.backgroundColor === "#000000" ? "#222222" : "#e0e0e0",
            },
          ]}
        />

        <View
          style={[
            styles.footer,
            {
              backgroundColor:
                theme.backgroundColor === "#000000" ? "#111111" : "#fafafa",
            },
          ]}
        >
          <Text
            style={[
              styles.copyright,
              {
                color: theme.textColor,
                fontSize: getArticleTextSize(13.0, textSize),
              },
            ]}
          >
            Copyright © {new Date().getFullYear()} FMT Media Sdn Bhd. All Rights
            Reserved.
          </Text>
          <TouchableOpacity onLongPress={copyDeviceId}>
            <Text
              style={[
                styles.deviceId,
                {
                  color: theme.textColor,
                  fontSize: getArticleTextSize(13.0, textSize),
                },
              ]}
            >
              ID: {deviceInfo.uuid}
            </Text>
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
      <SelectionModal
        visible={showThemeModal}
        onClose={() => setShowThemeModal(false)}
        options={themeOptions}
        selectedValue={generalSettings.appTheme}
        onSelect={handleThemeChange}
        title="Select Theme"
      />
      <SelectionModal
        visible={showTextSizeModal}
        onClose={() => setShowTextSizeModal(false)}
        options={textSizeOptions}
        selectedValue={textSize}
        onSelect={handleTextSizeChange}
        title="Select Text Size"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconContainer: {
    width: 40,
    alignItems: "center",
  },
  relatedTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
  },
  section: {},
  sectionHeader: {
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    paddingTop: 18,
    paddingBottom: 5,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  settingValue: {
    color: "#888",
    marginTop: 4,
  },
  notificationItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  aboutItem: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e0e0e0",
  },
  footer: {
    alignItems: "center",
    marginHorizontal: -18,
    marginTop: -5,
    paddingTop: 8,
  },
  copyright: {
    textAlign: "center",
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  deviceId: {
    color: "#888",
    marginTop: 5,
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },
  divider: {
    height: 0.2,
    marginVertical: 5,
    marginHorizontal: -18,
  },
});

export default SettingsPage;
