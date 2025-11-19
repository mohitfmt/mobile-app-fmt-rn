const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withNotificationColorFix(config) {
  return withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application[0];

    // Remove any existing duplicate definitions
    application["meta-data"] =
      application["meta-data"]?.filter(
        (item) =>
          item.$["android:name"] !==
          "com.google.firebase.messaging.default_notification_color"
      ) || [];

    // Add your override meta-data
    application["meta-data"].push({
      $: {
        "android:name":
          "com.google.firebase.messaging.default_notification_color",
        "android:resource": "@color/notification_icon_color",
        "tools:replace": "android:resource",
      },
    });

    return config;
  });
};
