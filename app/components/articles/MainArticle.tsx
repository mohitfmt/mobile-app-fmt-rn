/**
 * ArticleContent.tsx
 *
 * This component renders the main content of an article.
 * It includes the title, category, author details, article body, and related articles.
 *
 * Features:
 * - Displays article content dynamically.
 * - Supports theme-based styling.
 * - Fetches related articles if they are not preloaded.
 * - Supports inline ads and tag navigation.
 * - Provides navigation to previous and next articles.
 */

import articleStyles from "@/app/css/articleCss";
import { getRelatedPostsWithTag } from "@/app/lib/gql-queries/get-related-post-with-tag";
import HTMLContentParser from "@/app/lib/htmlParser";
import {
  capitalizeFirstLetter,
  formatMalaysianDateTimeS,
  formatTimeAgo,
  formatTimeAgoMalaysia,
  htmlToPlainText,
} from "@/app/lib/utils";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { useVisitedArticles } from "@/app/providers/VisitedArticleProvider";
import { ArticleType } from "@/app/types/article";
import { router } from "expo-router";
import React, { useContext, useEffect, useState } from "react";
import {
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import BannerAD from "../ads/Banner";
import DividerContainer from "../functions/DividerContainer";
import {
  getArticleTextSize,
  getPreferredCategory,
} from "../functions/Functions";
import RelatedArticle from "./RelatedArticle";
import TabletRelatedArticle from "./TabletRelatedArticle";
import Tag from "./TagBox";

// Main article content component
const ArticleContent = React.memo(
  ({
    item,
    width,
    currentIndex,
    articles,
    handleNavigation,
    isSingleArticle = false,
    isNetwork,
  }: any) => {
    if (item?.type === "AD_ITEM" || item?.id?.startsWith?.("ad-")) {
      // console.warn('Skipping ad placeholder in ArticleContent:', item);
      return null;
    }
    const [relatedPosts, setRelatedPosts] = useState<ArticleType[]>([]);
    const { theme } = useContext(ThemeContext);
    const { textSize, standfirstEnabled } = useContext(GlobalSettingsContext); // Access the global context
    const { markAsVisited } = useVisitedArticles();
    const { width: Tabwidth } = useWindowDimensions(); // ✅ This updates when orientation changes
    const isTablet = Tabwidth >= 600;
    const insets = useSafeAreaInsets();

    // Fetch related posts not available in article data
    useEffect(() => {
      const fetchAndSetRelatedPosts = async () => {
        try {
          if (
            item.relatedPosts &&
            Array.isArray(item.relatedPosts) &&
            item.relatedPosts.length > 0
          ) {
            // Use existing related posts if available
            setRelatedPosts(item.relatedPosts);
          } else if (item.tags && item.databaseId) {
            // Fetch related posts only if they are missing

            const relatedData = await getRelatedPostsWithTag(
              item.tags,
              item.databaseId
            );

            if (
              !relatedData ||
              !("edges" in relatedData) ||
              !Array.isArray(relatedData.edges) ||
              relatedData.edges.length === 0
            ) {
              // console.warn(` No valid related posts found for ${item.slug}`, relatedData);
              setRelatedPosts([]); // Set empty array if no related posts are found
              return;
            }

            setRelatedPosts(relatedData.edges);
          }
        } catch (error) {
          console.error(
            ` Error fetching related posts for ${item.slug}:`,
            error
          );
        }
      };

      fetchAndSetRelatedPosts();
    }, [item.slug, item.databaseId]);

    return (
      <ScrollView
        style={[articleStyles.scrollContent, { marginTop: -insets.top }]}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
      >
        <SafeAreaView
          style={{
            paddingBottom: insets.bottom,
          }}
        >
          <View
            style={[
              articleStyles.categoryBadge,
              {
                paddingLeft: 18,
              },
            ]}
          >
            <Text
              style={[
                articleStyles.categoryText,
                {
                  fontSize: getArticleTextSize(16.0, textSize),
                  backgroundColor: "#dc2626",
                },
              ]}
            >
              {capitalizeFirstLetter(
                item["featuredCategory"] ||
                  item["featured-category"] ||
                  getPreferredCategory(item.categories)?.node?.name ||
                  "News"
              )}
            </Text>
          </View>

          <Text
            style={{
              color: theme.textColor,
              paddingBottom: 5,
              paddingTop: 5,
              fontSize: getArticleTextSize(30.0, textSize),
              fontFamily:
                Platform.OS === "android" ? undefined : "SF-Pro-Display-Bold",
              fontWeight: Platform.OS === "android" ? "700" : undefined,
              paddingHorizontal: 18,
            }}
          >
            {htmlToPlainText(item.title || "title")}
          </Text>

          {standfirstEnabled && item.excerpt && (
            <View
              style={{
                paddingHorizontal: 18,
                paddingRight: Platform.OS === "android" ? 20 : 18, // ✅ More space on Android
              }}
            >
              <Text
                style={[
                  articleStyles.excerpt,
                  {
                    color: theme.textColor,
                    paddingVertical: 10,
                    fontSize: getArticleTextSize(19.0, textSize),
                    lineHeight: getArticleTextSize(19.0, textSize) * 1.4,
                  },
                ]}
              >
                {htmlToPlainText(item.excerpt)}
              </Text>
            </View>
          )}

          <View style={{ paddingHorizontal: 18 }}>
            <DividerContainer />
          </View>

          <Text
            style={[
              articleStyles.author,
              {
                paddingHorizontal: 18,
                fontSize: getArticleTextSize(16.0, textSize),
              },
            ]}
            className="text-red-700"
          >
            {typeof item.author === "string"
              ? item.author
              : item?.author?.node?.name || "Unknown Author"}
          </Text>

          <Text
            style={[
              articleStyles.date,
              {
                paddingHorizontal: 18,
                color: theme.textColor,
                fontSize: getArticleTextSize(16.0, textSize),
              },
            ]}
          >
            {formatMalaysianDateTimeS(item.date)}
          </Text>

          <View style={{ paddingHorizontal: 18 }}>
            <DividerContainer />
          </View>

          <View
            style={{
              backgroundColor: theme.backgroundColor,
              flex: 1,
              paddingHorizontal: 18,
              paddingRight: Platform.select({
                ios: 18,
                android: 20,
              }),
            }}
          >
            <HTMLContentParser
              htmlContent={item.content}
              isNetwork={isNetwork}
            />
          </View>

          <BannerAD unit={isNetwork ?? false ? "ros" : "article3"} />

          <View
            style={[
              articleStyles.tagsSection,
              {
                paddingHorizontal: 18,
              },
            ]}
          >
            <Text
              style={[
                articleStyles.tagsSectionTitle,
                { fontSize: getArticleTextSize(14.0, textSize) },
              ]}
            >
              Tags
            </Text>
            <View style={articleStyles.tagsWrapper}>
              {(item?.tags?.edges || item?.tags || []).map(
                (tag: any, index: number) => {
                  const tagNode = tag.node || tag; // fallback if node isn't present
                  return (
                    <Tag
                      key={tagNode?.slug || index}
                      label={tagNode?.name || tagNode?.title || "Unknown"}
                    />
                  );
                }
              )}
            </View>
          </View>

          <DividerContainer />

          {/* Navigation Buttons */}
          {!isSingleArticle && (
            <View
              className="flex-row justify-between items-center mb-2"
              style={{ paddingHorizontal: 18 }}
            >
              {currentIndex > 0 ? (
                <TouchableOpacity
                  className="flex-1 mr-1 rounded-lg"
                  onPress={() => handleNavigation("prev")}
                >
                  <Text
                    className=" text-sm mb-2 text-left"
                    style={{
                      fontFamily:
                        Platform.OS === "android"
                          ? undefined
                          : "SF-Pro-Display-Light",
                      fontWeight: Platform.OS === "android" ? "300" : undefined,
                      color: "#808080", // equivalent to Colors.grey
                      fontSize: getArticleTextSize(14.0, textSize),
                      paddingTop: 8,
                    }}
                  >
                    Previous article
                  </Text>
                  <View className="flex-1">
                    <Text
                      className="text-base"
                      style={{
                        color: theme.textColor,
                        fontFamily:
                          Platform.OS === "android"
                            ? undefined
                            : "SF-Pro-Display-Bold",
                        fontSize: getArticleTextSize(16.0, textSize),
                        fontWeight:
                          Platform.OS === "android" ? "700" : undefined,
                      }}
                      numberOfLines={4}
                    >
                      {htmlToPlainText(articles[currentIndex - 1].title)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    flex: 1,
                    height: 20,
                    backgroundColor: theme.backgroundColor, // Placeholder background color
                    borderRadius: 5, // Rounded corners for the frame
                    marginRight: 2,
                  }}
                />
              )}

              {currentIndex < articles.length - 1 ? (
                <TouchableOpacity
                  className="flex-1 ml-1 rounded-lg"
                  onPress={() => handleNavigation("next")}
                >
                  <Text
                    className="text-sm mb-2 text-right"
                    style={{
                      fontFamily:
                        Platform.OS === "android"
                          ? undefined
                          : "SF-Pro-Display-Light",
                      color: "#808080", // equivalent to Colors.grey
                      fontSize: getArticleTextSize(14.0, textSize),
                      paddingTop: 8,
                      fontWeight: Platform.OS === "android" ? "300" : undefined,
                    }}
                  >
                    Next article
                  </Text>
                  <View className="flex-1">
                    <Text
                      className="text-base text-right"
                      style={{
                        color: theme.textColor,
                        fontFamily:
                          Platform.OS === "android"
                            ? undefined
                            : "SF-Pro-Display-Bold",
                        fontSize: getArticleTextSize(16.0, textSize),
                        fontWeight:
                          Platform.OS === "android" ? "700" : undefined,
                      }}
                      numberOfLines={4}
                    >
                      {htmlToPlainText(articles[currentIndex + 1].title)}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={{
                    flex: 1,
                    height: 20,
                    backgroundColor: theme.backgroundColor, // Placeholder background color
                    borderRadius: 5, // Rounded corners for the frame
                    marginLeft: 2,
                  }}
                />
              )}
            </View>
          )}

          <DividerContainer />

          {/* Show related articles heading only if there are related articles */}
          {(Array.isArray(relatedPosts) && relatedPosts.length > 0) ||
          (Array.isArray(item?.["related-articles"]) &&
            item["related-articles"].length > 0) ? (
            <Text
              style={[
                articleStyles.relatedTitle,
                {
                  color: theme.textColor,
                  paddingHorizontal: 18,
                  fontSize: getArticleTextSize(24.0, textSize),
                  paddingTop: 5,
                },
              ]}
            >
              RELATED ARTICLES
            </Text>
          ) : null}

          {/* GraphQL-style related posts (with node) */}
          {Array.isArray(relatedPosts) &&
            relatedPosts.map((related: any) => {
              const ArticleComponent = isTablet
                ? TabletRelatedArticle
                : RelatedArticle;

              return (
                <ArticleComponent
                  id={related?.id || related?.node?.id}
                  key={related?.node?.id || related.id}
                  image={
                    related?.node?.featuredImage?.node?.sourceUrl ||
                    related.featuredImage?.node?.sourceUrl
                  }
                  title={related?.node?.title || related.title}
                  subtitle={related?.node?.excerpt || related.excerpt}
                  time={formatTimeAgo(
                    related?.node?.dateGmt || related.dateGmt || related.date
                  )}
                  uri={related?.node?.uri || related.permalink || related.uri}
                  onPress={() => {
                    markAsVisited(related?.id || related?.node?.id);
                    router.push({
                      pathname: `/components/articles/NetworkArticle`,
                      params: {
                        slug: related?.node?.slug || related.slug,
                        date: related?.node?.dateGmt || related.date,
                      },
                    });
                  }}
                />
              );
            })}

          {/* REST-style or JSON-style related posts (flat object) */}
          {Array.isArray(item?.["related-articles"]) &&
            item["related-articles"].map((related: any) => {
              const ArticleComponent = isTablet
                ? TabletRelatedArticle
                : RelatedArticle;

              return (
                <ArticleComponent
                  id={related?.id}
                  key={related?.id}
                  image={related?.thumbnail}
                  title={related?.title}
                  subtitle={related?.excerpt}
                  time={formatTimeAgoMalaysia(related?.date)}
                  uri={related?.node?.uri || related.permalink || related.uri}
                  onPress={() => {
                    markAsVisited(related?.id || related?.node?.id);
                    router.push({
                      pathname: `/components/articles/NetworkArticle`,
                      params: {
                        slug: related?.permalink,
                        date: related?.date,
                      },
                    });
                  }}
                />
              );
            })}
        </SafeAreaView>
      </ScrollView>
    );
  }
);

export default ArticleContent;
