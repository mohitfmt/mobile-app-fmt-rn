// TagBox.tsx
//
// This file defines the Tag component (sometimes called TagBox), which displays a clickable tag UI element.
// When pressed, it navigates to the tag page for the given label. The tag adapts to theme and text size.
//
// Key responsibilities:
// - Display a tag label with proper styling
// - Navigate to the tag page when pressed
// - Adapt to theme and text size
//
// Usage: Render <Tag label="..." /> to show a tag that links to its tag page.
//
// -----------------------------------------------------------------------------

import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useRouter } from "expo-router";
import React, { useContext } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

// TagProps: Props for the Tag component (expects a label string).
interface TagProps {
  label: string;
}

// Tag: Main component for displaying a clickable tag.
// - Uses theme and global settings context
// - Navigates to tag page on press
const Tag: React.FC<TagProps> = ({ label }) => {
  const router = useRouter();
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);

  const handlePress = () => {
    router.push({
      pathname: "/components/tags/Tags",
      params: { tagName: label },
    });
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
      <View
        style={[
          styles.tagContainer,
          {
            backgroundColor:
              theme.backgroundColor === "#ffffff" ? "#d3d3d3" : "#2e2e2e",
          },
        ]}
      >
        <Text
          style={[
            styles.tagText,
            {
              color: theme.textColor,
              fontSize: getArticleTextSize(16.0, textSize),
            },
          ]}
        >
          {label.charAt(0).toUpperCase() + label.slice(1)}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

// styles: StyleSheet for tag container and text.
const styles = StyleSheet.create({
  tagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 5,
  },
  tagText: {
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
    fontWeight: Platform.OS === "android" ? "400" : "400",
  },
});

export default Tag;
