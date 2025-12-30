/**
 * VideoPlayer.tsx
 *
 * In-app video player screen using YouTube iframe player.
 * Replaces external YouTube redirections with embedded player.
 * UI similar to MainArticle with related videos section.
 *
 * @author FMT Developers
 */

import HTMLContentParser from "@/app/lib/htmlParser";
import {
  formatDuration,
  formatPostedTime,
  formatViewCount,
  htmlToPlainText,
} from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, ChevronLeft, Clock, Eye } from "lucide-react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";
import BannerAD from "../ads/Banner";
import StickyHeader from "../articles/StickyHeader";
import Tag from "../articles/TagBox";
import DividerContainer from "../functions/DividerContainer";
import { getArticleTextSize } from "../functions/Functions";
import RelatedVideo from "./RelatedVideo";
import TabletRelatedVideo from "./TabletRelatedVideo";

/* ----------------------------- small safe helpers ---------------------------- */

const parseJSONSafe = <T,>(value: any, fallback: T): T => {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value as T;
};

/* -------------------------- related videos unchanged ------------------------- */

const fetchRelatedVideos = async (currentVideoId: string): Promise<any[]> => {
  try {
    const FMT_URL = process.env.EXPO_PUBLIC_FMT_URL;
    const response = await fetch(`${FMT_URL}/videos/gallery`);

    if (!response.ok) return [];

    const data = await response.json();
    const allVideos: any[] = [];

    if (Array.isArray(data.hero)) allVideos.push(...data.hero);
    if (Array.isArray(data.shorts)) allVideos.push(...data.shorts);

    Object.keys(data).forEach((key) => {
      if (key !== "hero" && key !== "shorts" && Array.isArray(data[key])) {
        allVideos.push(...data[key]);
      }
    });

    return allVideos
      .filter((v) => v.videoId !== currentVideoId)
      .slice(0, 5)
      .map((video, index) => ({
        id: video.videoId || `related-${index}`,
        videoId: video.videoId,

        title: video.title,
        description: video.description || video.content,

        thumbnail:
          video.thumbnails?.high ||
          video.thumbnails?.medium ||
          video.thumbnail ||
          `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,

        // RAW values ONLY
        viewCount: video.statistics?.viewCount ?? "0",
        publishedAt: video.publishedAt ?? "",
        durationSeconds:
          video.contentDetails?.durationSeconds ?? video.durationSeconds ?? 0,

        tags: video.tags || [],
        channelTitle: video.channelTitle || "FMT",
        statistics: video.statistics || {},
      }));
  } catch {
    return [];
  }
};

const VideoPlayer = () => {
  const params = useLocalSearchParams();
  const { theme, isOnline } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const insets = useSafeAreaInsets();
  const { markAsVisited } = useVisitedArticles();
  const { width } = useWindowDimensions();
  const isTablet = width >= 600;
  const {
    videoId,
    title,
    content,
    date,
    permalink,
    viewCount,
    durationSeconds,
    channelTitle,
    duration,
    publishedAt,
  }: any = params;

  const [playing, setPlaying] = useState(false);
  const [relatedVideos, setRelatedVideos] = useState<any[]>([]);
  const isNavigatingRef = useRef(false);

  const tags = parseJSONSafe<string[]>(params.tags, []);
  const statistics = parseJSONSafe<any>(params.statistics, null);

  const onStateChange = useCallback((state: string) => {
    if (state === "ended") setPlaying(false);
  }, []);

  const handleRelatedVideoPress = useCallback(
    (relatedVideo: any) => {
      if (isNavigatingRef.current) return;

      isNavigatingRef.current = true;
      markAsVisited(relatedVideo.id);

      router.push({
        pathname: "/components/videos/VideoPlayer",
        params: {
          videoId: relatedVideo.videoId,
          title: relatedVideo.title,
          content: relatedVideo.description || "",
          date: relatedVideo.publishedAt || "",
          permalink: `https://www.youtube.com/watch?v=${relatedVideo.videoId}`,
          viewCount: relatedVideo.statistics?.viewCount || "0",
          durationSeconds:
            relatedVideo.contentDetails?.durationSeconds ||
            relatedVideo.durationSeconds ||
            "0",
          duration: relatedVideo.duration || "0:00",
          tags: JSON.stringify(relatedVideo.tags || []),
          channelTitle: relatedVideo.channelTitle || "FMT",
          statistics: JSON.stringify(relatedVideo.statistics || {}),
          publishedAt: relatedVideo.publishedAt || "",
        },
      });

      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
    },
    [markAsVisited]
  );

  useEffect(() => {
    if (!videoId) return;

    // Mark current video as visited when component loads
    markAsVisited(videoId);

    fetchRelatedVideos(videoId).then(setRelatedVideos);
  }, [videoId, markAsVisited]);

  if (!videoId) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.backgroundColor,
            paddingTop: insets.top,
          },
        ]}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            activeOpacity={0.7}
            style={styles.backButton}
          >
            {Platform.OS === "ios" ? (
              <ChevronLeft size={34} color="#DC2626" />
            ) : (
              <ArrowLeft size={24} color="#DC2626" />
            )}
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              {
                color: theme.textColor,
                fontSize: getArticleTextSize(18, textSize),
              },
            ]}
          >
            Video Player
          </Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.textColor }]}>
            Unable to load video.
          </Text>
          <TouchableOpacity
            style={styles.backToListButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backToListText}>Try again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          paddingTop: insets.top,
        },
      ]}
    >
      {/* Header */}
      <StickyHeader
        article={{
          id: videoId,
          title,
          excerpt: content,
          uri: permalink,
          permalink,
        }}
        showBookmark={false}
      />

      <ScrollView
        style={[styles.scrollContent, { marginTop: -insets.top }]}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView
          style={{
            paddingBottom: insets.bottom,
          }}
        >
          {/* Video Category Badge */}
          <View style={[styles.categoryBadge, { paddingLeft: 18 }]}>
            <Text
              style={[
                styles.categoryText,
                {
                  fontSize: getArticleTextSize(
                    isTablet ? 18.0 : 16.0,
                    textSize
                  ),
                },
              ]}
            >
              VIDEO
            </Text>
          </View>

          {/* Video Title */}
          <Text
            style={[
              {
                color: theme.textColor,
                paddingBottom: 5,
                paddingTop: 5,
                fontSize: getArticleTextSize(isTablet ? 36.0 : 30.0, textSize),
                fontWeight: Platform.OS === "android" ? "700" : "700",
                paddingHorizontal: 18,
              },
            ]}
          >
            {htmlToPlainText(title)}
          </Text>

          <View style={{ paddingHorizontal: 18 }}>
            <DividerContainer />
          </View>

          {/* Video Author/Channel */}
          {channelTitle && (
            <Text
              style={[
                styles.author,
                {
                  paddingHorizontal: 18,
                  fontSize: getArticleTextSize(
                    isTablet ? 18.0 : 16.0,
                    textSize
                  ),
                },
              ]}
              className="text-red-700"
            >
              {channelTitle}
            </Text>
          )}

          {/* Video Date and Stats */}
          <View style={[styles.statsContainer, { paddingHorizontal: 18 }]}>
            {publishedAt && (
              <Text
                style={[
                  styles.date,
                  {
                    color: theme.textColor,
                    fontSize: getArticleTextSize(
                      isTablet ? 18.0 : 16.0,
                      textSize
                    ),
                  },
                ]}
              >
                {formatPostedTime(publishedAt)}
              </Text>
            )}

            {/* Video Stats Row */}
            <View style={styles.videoStatsRow}>
              {(viewCount || statistics?.viewCount) && (
                <View style={styles.statItem}>
                  <Eye size={isTablet ? 20 : 16} color="#9e9e9e" />
                  <Text
                    style={[
                      styles.statText,
                      {
                        fontSize: getArticleTextSize(
                          isTablet ? 16.0 : 14.0,
                          textSize
                        ),
                      },
                    ]}
                  >
                    {formatViewCount(viewCount || statistics?.viewCount)} views
                  </Text>
                </View>
              )}

              {(durationSeconds || duration) && (
                <View style={styles.statItem}>
                  <Clock size={isTablet ? 20 : 16} color="#9e9e9e" />
                  <Text
                    style={[
                      styles.statText,
                      {
                        fontSize: getArticleTextSize(
                          isTablet ? 16.0 : 14.0,
                          textSize
                        ),
                      },
                    ]}
                  >
                    {formatDuration(durationSeconds)}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ paddingHorizontal: 18 }}>
            <DividerContainer />
          </View>

          {/* YouTube Player */}
          <View
            style={[
              styles.playerContainer,
              isTablet && styles.tabletPlayerContainer,
            ]}
          >
            <YoutubePlayer
              height={
                isTablet
                  ? Math.min(440, (width - 30) * 0.5625)
                  : Math.min(250, Math.max(180, (width - 36) * 0.5625))
              }
              play={playing}
              videoId={videoId}
              onChangeState={onStateChange}
              webViewStyle={{
                backgroundColor: theme.backgroundColor,
                overflow: "hidden",
              }}
              initialPlayerParams={{
                cc_lang_pref: "en",
                showClosedCaptions: true,
                modestbranding: true,
                rel: false,
              }}
            />
          </View>

          {/* Video Content/Description with HTML Parser */}
          {content && (
            <View
              style={{
                backgroundColor: theme.backgroundColor,
                flex: 1,
                paddingHorizontal: 18,
                paddingRight: Platform.select({
                  ios: 18,
                  android: isTablet ? 42 : 20,
                }),
              }}
            >
              <HTMLContentParser
                htmlContent={content}
                isNetwork={isOnline ?? false}
              />
            </View>
          )}

          <BannerAD unit="article3" />

          {/* Tags Section */}
          {tags && Array.isArray(tags) && tags.length > 0 && (
            <View style={styles.tagsSection}>
              <Text
                style={[
                  styles.tagsSectionTitle,
                  {
                    fontSize: getArticleTextSize(
                      isTablet ? 16.0 : 14.0,
                      textSize
                    ),
                    paddingHorizontal: 18,
                  },
                ]}
              >
                Tags
              </Text>
              <View style={[styles.tagsWrapper, { paddingHorizontal: 18 }]}>
                {tags.map((tag: string, index: number) => (
                  <Tag key={index} label={tag} />
                ))}
              </View>
            </View>
          )}

          <DividerContainer />

          {/* Related Videos Section */}
          {relatedVideos.length > 0 && (
            <>
              <Text
                style={[
                  styles.relatedTitle,
                  {
                    color: theme.textColor,
                    paddingHorizontal: 18,
                    fontSize: getArticleTextSize(
                      isTablet ? 28.0 : 24.0,
                      textSize
                    ),
                    paddingTop: 5,
                  },
                ]}
              >
                UP NEXT
              </Text>

              {relatedVideos.map((relatedVideo, idx) => {
                const VideoComponent = isTablet
                  ? TabletRelatedVideo
                  : RelatedVideo;

                return (
                  <VideoComponent
                    key={`${relatedVideo.id}_${idx}`}
                    id={relatedVideo.id}
                    thumbnail={relatedVideo.thumbnail}
                    title={relatedVideo.title}
                    description={relatedVideo.description}
                    durationSeconds={relatedVideo.durationSeconds}
                    viewCount={relatedVideo.viewCount}
                    publishedAt={relatedVideo.publishedAt}
                    videoId={relatedVideo.videoId}
                    onPress={() => handleRelatedVideoPress(relatedVideo)}
                  />
                );
              })}
            </>
          )}
        </SafeAreaView>
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontWeight: Platform.OS === "android" ? "700" : "700",
  },
  shareButton: {
    padding: 8,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  categoryBadge: {
    paddingTop: 10,
    // paddingLeft handled inline for responsive design
  },
  categoryText: {
    color: "white",
    backgroundColor: "#dc2626",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    fontWeight: Platform.OS === "android" ? "600" : "600",
    alignSelf: "flex-start",
    textTransform: "uppercase",
  },
  excerpt: {
    fontWeight: Platform.OS === "android" ? "400" : "400",
    lineHeight: 24,
  },
  author: {
    color: "#dc2626",
    fontWeight: Platform.OS === "android" ? "600" : "600",
  },
  date: {
    color: "#9e9e9e",
    fontWeight: Platform.OS === "android" ? "400" : "400",
  },
  statsContainer: {
    // paddingHorizontal handled inline for responsive design
  },
  videoStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statText: {
    color: "#9e9e9e",
    fontWeight: Platform.OS === "android" ? "400" : "400",
  },
  tagsSection: {
    paddingVertical: 16,
  },
  tagsSectionTitle: {
    color: "#9e9e9e",
    fontWeight: Platform.OS === "android" ? "600" : "600",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  playerContainer: {
    backgroundColor: "#000",
    marginHorizontal: 18,
    marginVertical: 10,
    borderRadius: 8,
    alignSelf: "stretch",
    minHeight: 180,
    overflow: "hidden",
  },
  tabletPlayerContainer: {
    marginVertical: 20,
    borderRadius: 12,
  },
  relatedTitle: {
    fontWeight: Platform.OS === "android" ? "900" : "900",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 20,
  },
  backToListButton: {
    backgroundColor: "#DC2626",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backToListText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default VideoPlayer;
