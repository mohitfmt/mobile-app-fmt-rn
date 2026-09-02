// useSubscribeTopic.ts
//
// Compatibility wrapper delegating to the centralized notification service.
// -----------------------------------------------------------------------------

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  getFcmToken,
  initializeNotificationsFlow,
  NotificationSetting,
  notificationSubscription,
  subscribeToTopic,
  unsubscribeFromTopic,
} from "@/app/services/notificationService";

export {
  DEFAULT_NOTIFICATION_SETTINGS,
  getFcmToken,
  NotificationSetting,
  notificationSubscription,
  subscribeToTopic,
  unsubscribeFromTopic,
};

/**
 * Delegated initialization function for backward compatibility
 */
export const initializeFirstTimeNotifications = async () => {
  return await initializeNotificationsFlow();
};

// Default export: Dummy function for Expo Router compatibility.
export default function UseSubscribeTopic() {
  return null;
}
