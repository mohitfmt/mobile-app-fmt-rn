/**
 * BottomActions.tsx
 *
 * This component renders a bottom action bar with:
 * - A **Settings button** that navigates to the settings screen.
 * - A **Feedback button** (currently logs a message to console).
 * - Dynamic **theme-based styling** for dark/light mode.
 * - Platform-specific margin adjustments for **iOS and Android**.
 *
 * Features:
 * - Uses `expo-router` for smooth navigation.
 * - Customizes button colors based on the active theme.
 * - Adjusts padding for platform consistency.
 *
 * @author FMT Developers
 */

import React, { useContext } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Linking,
  Alert,
} from "react-native";
import { MessageSquareWarning } from "lucide-react-native";
import { Settings } from "@/app/assets/AllSVGs";
import { useRouter } from "expo-router";
import { ThemeContext } from "../../providers/ThemeProvider";
import * as Device from "expo-device";
import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import uuid from "react-native-uuid";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * BottomActions Component
 */
const BottomActions: React.FC = () => {
  const { theme } = useContext(ThemeContext);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const gotoSettings = () => {
    router.push("/components/settings/Settings");
  };

  const sendFeedbackEmail = async () => {
    try {
      const UUID_KEY = "device_uuid";
      let cleanUuid = await AsyncStorage.getItem(UUID_KEY);

      if (!cleanUuid) {
        cleanUuid = uuid.v4().replace(/-/g, ""); // fallback if not yet set
      }

      const version = Application.nativeApplicationVersion || "v1.0.0";
      const model = Device.modelName || "";
      const os = `${Device.osName} ${Device.osVersion}`;

      const subject = `App feedback from ${model}, ${os}`;
      const body = `Device: ${model}, ${os}\nUUID: ${cleanUuid}\nApp Version: ${version}\n\nType your comments below:\n`;

      const mailtoUrl = `mailto:support@freemalaysiatoday.com?subject=${encodeURIComponent(
        subject
      )}&body=${encodeURIComponent(body)}`;

      await Linking.openURL(mailtoUrl);
    } catch (error) {
      Alert.alert("Error", "Unable to open mail client.");
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          borderColor:
            theme.backgroundColor === "#000000" ? "#1c1c1c" : "#E5E7EB",
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.actionsContainer}>
        {/* Settings */}
        <TouchableOpacity
          onPress={gotoSettings}
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundColor,
              borderColor: theme.textColor,
            },
          ]}
        >
          <Settings fill={theme.textColor} color={theme.backgroundColor} />
        </TouchableOpacity>

        {/* Feedback */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: theme.backgroundColor,
              borderColor: theme.textColor,
            },
          ]}
          onPress={sendFeedbackEmail}
        >
          <MessageSquareWarning fill="black" color="white" size={24} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Styles
const styles = StyleSheet.create({
  container: {
    padding: 8,
    borderTopWidth: 1,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 4,
  },
});

export default BottomActions;
