import Constants from "expo-constants";
import { Linking, Platform } from "react-native";

const IOS_APP_STORE_LINK = "https://apps.apple.com/app/id1455486968";
const ANDROID_PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.freemalaysiatoday.app.fmtnews.android";

interface AppUpdateConfig {
  minimumVersions: {
    ios: string;
    android: string;
  };
  storeUrls: {
    ios: string;
    android: string;
  };
  title: string;
  message: string;
  ctaLabel: string;
}

export interface ForceUpdateStatus {
  shouldForceUpdate: boolean;
  currentVersion: string;
  minimumVersion: string;
  title: string;
  message: string;
  ctaLabel: string;
  storeUrl: string;
}

const FALLBACK_CONFIG: AppUpdateConfig = {
  minimumVersions: {
    ios: "2.2.0",
    android: "2.2.0",
  },
  storeUrls: {
    ios: IOS_APP_STORE_LINK,
    android: ANDROID_PLAY_STORE_LINK,
  },
  title: "Update Required",
  message:
    "A newer version of FMT News is required to continue. Please update the app to keep reading.",
  ctaLabel: "Update now",
};

function getCurrentAppVersion() {
  const nativeVersion =
    Constants.nativeApplicationVersion ||
    Constants.expoConfig?.version ||
    "0.0.0";
  return nativeVersion.trim();
}

function parseVersionParts(version: string) {
  if (!version) return [0];

  return version
    .split(".")
    .map((part) => {
      const numericPart = part.match(/\d+/)?.[0] || "0";
      const value = Number.parseInt(numericPart, 10);
      if (Number.isNaN(value)) return 0;
      return value;
    })
    .slice(0, 4);
}

function compareVersions(currentVersion: string, minimumVersion: string) {
  const currentParts = parseVersionParts(currentVersion);
  const minimumParts = parseVersionParts(minimumVersion);
  const maxLength = Math.max(currentParts.length, minimumParts.length);

  for (let index = 0; index < maxLength; index++) {
    const current = currentParts[index] ?? 0;
    const minimum = minimumParts[index] ?? 0;

    if (current > minimum) return 1;
    if (current < minimum) return -1;
  }

  return 0;
}

function getRemoteConfigUrl() {
  const explicitUrl = process.env.EXPO_PUBLIC_FORCE_UPDATE_CONFIG_URL;
  if (explicitUrl) return explicitUrl;

  const s3Bucket = process.env.EXPO_PUBLIC_S3;
  if (!s3Bucket) return null;

  return `https://${s3Bucket}/json/app/config/app-update.json`;
}

function resolveConfigPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  const maybeRoot = payload as Record<string, unknown>;
  if (maybeRoot.minimumVersions || maybeRoot.storeUrls) return maybeRoot;

  const maybeData = maybeRoot.data;
  if (maybeData && typeof maybeData === "object") {
    return maybeData as Record<string, unknown>;
  }

  return null;
}

function mergeConfig(payload: Record<string, unknown> | null): AppUpdateConfig {
  if (!payload) return FALLBACK_CONFIG;

  const minimumVersions = payload.minimumVersions as
    | Record<string, unknown>
    | undefined;
  const storeUrls = payload.storeUrls as Record<string, unknown> | undefined;

  return {
    minimumVersions: {
      ios:
        typeof minimumVersions?.ios === "string"
          ? minimumVersions.ios
          : FALLBACK_CONFIG.minimumVersions.ios,
      android:
        typeof minimumVersions?.android === "string"
          ? minimumVersions.android
          : FALLBACK_CONFIG.minimumVersions.android,
    },
    storeUrls: {
      ios:
        typeof storeUrls?.ios === "string"
          ? storeUrls.ios
          : FALLBACK_CONFIG.storeUrls.ios,
      android:
        typeof storeUrls?.android === "string"
          ? storeUrls.android
          : FALLBACK_CONFIG.storeUrls.android,
    },
    title:
      typeof payload.title === "string" && payload.title.trim()
        ? payload.title
        : FALLBACK_CONFIG.title,
    message:
      typeof payload.message === "string" && payload.message.trim()
        ? payload.message
        : FALLBACK_CONFIG.message,
    ctaLabel:
      typeof payload.ctaLabel === "string" && payload.ctaLabel.trim()
        ? payload.ctaLabel
        : FALLBACK_CONFIG.ctaLabel,
  };
}

async function fetchRemoteConfig() {
  const configUrl = getRemoteConfigUrl();
  if (!configUrl) return null;

  try {
    const response = await fetch(configUrl);
    if (!response.ok) return null;

    const payload = await response.json();
    return resolveConfigPayload(payload);
  } catch (error) {
    console.warn("Failed to fetch force-update config", error);
    return null;
  }
}

export async function getForceUpdateStatus(): Promise<ForceUpdateStatus> {
  const currentVersion = getCurrentAppVersion();
  const remotePayload = await fetchRemoteConfig();
  const config = mergeConfig(remotePayload);

  const isAndroid = Platform.OS === "android";
  const minimumVersion = isAndroid
    ? config.minimumVersions.android
    : config.minimumVersions.ios;
  const storeUrl = isAndroid ? config.storeUrls.android : config.storeUrls.ios;
  const shouldForceUpdate = compareVersions(currentVersion, minimumVersion) < 0;

  return {
    shouldForceUpdate,
    currentVersion,
    minimumVersion,
    title: config.title,
    message: config.message,
    ctaLabel: config.ctaLabel,
    storeUrl,
  };
}

export async function openStoreForForceUpdate(storeUrl: string) {
  try {
    const canOpen = await Linking.canOpenURL(storeUrl);
    if (!canOpen) return;
    await Linking.openURL(storeUrl);
  } catch (error) {
    console.error("Failed to open update store URL", error);
  }
}
