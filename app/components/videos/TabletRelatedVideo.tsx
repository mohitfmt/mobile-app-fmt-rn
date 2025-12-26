/**
 * TabletRelatedVideo.tsx
 *
 * Tablet version of RelatedVideo component for displaying related videos.
 * Similar to TabletRelatedArticle but for video content.
 *
 * @author FMT Developers
 */

import CloudflareImageComponent from "@/app/lib/CloudflareImageComponent";
import {
  formatDuration,
  formatTimeAgoMalaysia,
  formatViewCount,
  htmlToPlainText,
} from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { Play } from "lucide-react-native";
import React, { useContext } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getArticleTextSize } from "../functions/Functions";

interface TabletRelatedVideoProps {
  id: string;
  thumbnail: string;
  title: string;
  description?: string;
  durationSeconds?: string;
  viewCount?: string;
  publishedAt?: string;
  videoId: string;
  onPress: () => void;
}

const TabletRelatedVideo: React.FC<TabletRelatedVideoProps> = ({
  id,
  thumbnail,
  title,
  description,
  durationSeconds,
  viewCount,
  publishedAt,
  videoId,
  onPress,
}) => {
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const { isVisited } = useVisitedArticles();
  const visited = isVisited(id);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          borderBottomColor:
            theme.backgroundColor === "#000000" ? "#111111" : "#F9FAFB",
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          <CloudflareImageComponent
            src={thumbnail}
            width={200}
            height={150}
            accessibilityLabel={title}
          />
          {/* Play Button Overlay */}
          <View style={styles.playOverlay}>
            <View style={styles.playButton}>
              <Play size={24} color="#ffffff" fill="#ffffff" />
            </View>
          </View>
          {/* Duration Badge */}
          {durationSeconds && (
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>
                {formatDuration(durationSeconds)}
              </Text>
            </View>
          )}
        </View>

        {/* Video Info */}
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.title,
              {
                color: visited ? "#9e9e9e" : theme.textColor,
                fontSize: getArticleTextSize(18, textSize),
              },
            ]}
            numberOfLines={2}
          >
            {htmlToPlainText(title)}
          </Text>

          {description && (
            <Text
              style={[
                styles.description,
                {
                  fontSize: getArticleTextSize(16, textSize),
                },
              ]}
              numberOfLines={3}
            >
              {htmlToPlainText(description)}
            </Text>
          )}

          {/* Video Stats */}
          <View style={styles.statsContainer}>
            {viewCount && (
              <Text
                style={[
                  styles.stats,
                  { fontSize: getArticleTextSize(14, textSize) },
                ]}
              >
                {formatViewCount(viewCount)} views
              </Text>
            )}
            {publishedAt && (
              <>
                {viewCount && <Text style={styles.statsSeparator}>•</Text>}
                <Text
                  style={[
                    styles.stats,
                    { fontSize: getArticleTextSize(14, textSize) },
                  ]}
                >
                  {formatTimeAgoMalaysia(publishedAt)}
                </Text>
              </>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    marginHorizontal: 40,
    paddingVertical: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  thumbnailContainer: {
    position: "relative",
    width: 200,
    height: 150,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: 16,
  },
  playOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  textContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  title: {
    fontWeight: Platform.OS === "android" ? "700" : "700",
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    color: "#9e9e9e",
    lineHeight: 22,
    marginBottom: 10,
  },
  statsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stats: {
    color: "#9e9e9e",
  },
  statsSeparator: {
    color: "#9e9e9e",
    marginHorizontal: 8,
    fontSize: 14,
  },
});

export default TabletRelatedVideo;
