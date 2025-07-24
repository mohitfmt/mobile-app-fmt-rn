// reviewApp.ts
//
// This file provides a utility function to trigger the in-app review flow for the app.
// It opens the appropriate App Store or Play Store review page based on the platform.
//
// Key responsibilities:
// - Open the app's review page in the App Store (iOS) or Play Store (Android)
// - Handle errors if the store URL cannot be opened
//
// Usage: Call triggerInAppReview() to prompt the user to leave a review for the app.
//
// -----------------------------------------------------------------------------

import { Platform, Linking } from "react-native";

const IOS_APP_STORE_LINK =
  "https://apps.apple.com/app/id1455486968?action=write-review";
const ANDROID_PLAY_STORE_LINK =
  "https://play.google.com/store/apps/details?id=com.freemalaysiatoday.app.fmtnews.android";

// triggerInAppReview: Opens the review page for the app in the appropriate store.
export const triggerInAppReview = () => {
  const url =
    Platform.OS === "ios" ? IOS_APP_STORE_LINK : ANDROID_PLAY_STORE_LINK;

  Linking.openURL(url).catch((err) => {
    console.error("❌ Failed to open store URL:", err);
  });
};

// Default export: Dummy function for Expo Router compatibility.
export default function ReviewApp() {
  return null;
}
