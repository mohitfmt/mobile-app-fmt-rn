import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Platform,
  TouchableOpacity,
} from "react-native";
import { router } from "expo-router";
import { getArticleTextSize } from "../functions/Functions";
import BannerAD from "../ads/Banner";
import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import VideoCard from "../cards/VideoCard";
import SmallVideoCard from "../cards/SmallVideoCard";
import { PlayIcon } from "@/app/assets/AllSVGs";
import { formatTimeAgoMalaysia } from "@/app/lib/utils";
import { useLandingData } from "@/app/providers/LandingProvider";

const VideoPage = () => {
  const { theme } = useContext(ThemeContext);
  const { textSize } = useContext(GlobalSettingsContext);
  const { landingData, isLoading } = useLandingData();

  const videos = landingData["videos"] || [];

  const renderItems = () => {
    const renderedSections: React.ReactNode[] = [];
    let currentCategory = "Videos";
    let categoryItems: any[] = [];
    let featuredRendered = false;
    let deferredExtras: any[] = [];

    const pushCategorySection = () => {
      if (categoryItems.length > 0) {
        renderedSections.push(
          renderCategory(
            currentCategory,
            [...categoryItems],
            renderedSections.length
          )
        );
        categoryItems = [];
      }

      deferredExtras.forEach((item, i) => {
        if (item.type === "MORE_ITEM") {
          renderedSections.push(
            <TouchableOpacity
              key={`more-${currentCategory}-${i}`}
              style={styles.readMoreButton}
              onPress={() =>
                router.push({
                  pathname: "/components/videos/CategoryVideoPage",
                  params: { CategoryName: currentCategory },
                })
              }
            >
              <View style={styles.loadMoreContainer}>
                <Text style={styles.readMoreText}>Load More</Text>
                <View style={styles.playIcon}>
                  <PlayIcon />
                </View>
              </View>
            </TouchableOpacity>
          );
        } else if (item.type === "AD_ITEM") {
          renderedSections.push(
            <BannerAD unit="home" key={`ad-${currentCategory}-${i}`} />
          );
        }
      });

      deferredExtras = [];
    };

    for (let i = 0; i < videos.length; i++) {
      const item = videos[i];

      if (item.type === "CARD_TITLE") {
        pushCategorySection();
        currentCategory = item.title || "Videos";
        featuredRendered = false;
      } else if (item.type === "MORE_ITEM" || item.type === "AD_ITEM") {
        deferredExtras.push(item);
      } else {
        const isFeatured = !featuredRendered && item.type === "video-featured";
        categoryItems.push({ ...item, isFeatured });
        if (isFeatured) featuredRendered = true;
      }
    }

    pushCategorySection();
    return renderedSections;
  };

  const renderCategory = (title: string, items: any[], keyIndex: number) => {
    const limit = 7;
    let count = 0;

    return (
      <View
        style={{
          marginBottom: 18,
        }}
        key={`cat-${keyIndex}`}
      >
        {title !== "Videos" && (
          <Text
            style={[
              styles.categoryTitle,
              {
                color: theme.textColor,
                paddingHorizontal: 18,
                fontSize: getArticleTextSize(28, textSize),
              },
            ]}
          >
            {title}
          </Text>
        )}

        {items.slice(0, limit).map((item, idx) => {
          if (item.isFeatured) {
            return (
              <VideoCard
                key={`featured-${idx}`}
                thumbnail={item.thumbnail}
                title={item.title}
                content={item.content}
                date={formatTimeAgoMalaysia(item.date)}
                permalink={item.permalink}
                type="video-featured"
              />
            );
          }

          return (
            <SmallVideoCard
              key={`standard-${idx}`}
              thumbnail={item.thumbnail}
              title={item.title}
              content={item.content}
              date={formatTimeAgoMalaysia(item.date)}
              permalink={item.permalink}
            />
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundColor },
        ]}
      >
        <ActivityIndicator size="large" color="#DC2626" />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: theme.backgroundColor,
          marginTop: Platform.OS === "ios" ? 55 : 20,
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: 4,
          paddingBottom: 40,
        }}
      >
        {renderItems()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryTitle: {
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    marginBottom: 12,
    marginTop: 12,
  },
  readMoreButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 5,
    alignItems: "flex-end",
    marginRight: 18,
  },
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  readMoreText: {
    color: "#c62828",
    fontSize: 14,
    fontWeight: "bold",
  },
  playIcon: {
    paddingLeft: 8,
    justifyContent: "center",
  },
});

export default VideoPage;
