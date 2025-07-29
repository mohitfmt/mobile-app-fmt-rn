/**
 * articleStyles.js
 *
 * This file contains the styles used throughout the article-related screens in the application.
 * The styles are created using `StyleSheet.create` to improve performance and maintainability.
 *
 * Features:
 * - Defines consistent styling for article components, including headers, text, images, and layout.
 * - Supports dynamic text size adjustments via imported `getArticleTextSize` function.
 * - Utilizes a color scheme from `cssColors` for theme consistency.
 * - Organizes styles into logical sections for readability.
 *
 * @author FMT Developers
 */

import { Platform } from "react-native";
import { StyleSheet } from "react-native";

const articleStyles = StyleSheet.create({
  // Header Section Styles
  headerContainer: {
    zIndex: 100, // Ensures the header remains on top of other elements

    paddingBottom: 5,
  },
  // Main Container Styles
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  articleContainer: {
    flex: 1, // Ensures the article content fills the available space
  },
  // Header Styling
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
  },
  // Title Styles
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },
  // Page Indicator (floating at bottom-right)
  pageIndicator: {
    position: "absolute",
    bottom: 16,
    right: 16,
    backgroundColor: "#00000099",
    padding: 8,
    borderRadius: 16,
  },
  pageIndicatorText: {
    color: "white",
    fontWeight: "600",
  },
  // Loading State Styles
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Error Message Styling
  errorText: {
    color: "#666",
  },
  // Logo Placement in Header
  logoContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 2,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 100,
    height: 35,
    resizeMode: "contain", // Ensures the logo scales properly
  },
  // Header Action Button Styles
  headerActions: {
    flexDirection: "row",
  },
  actionButton: {
    marginLeft: 16,
  },
  scrollContent: {
    flex: 1,
  },
  categoryBadge: {
    paddingVertical: 5,
  },
  categoryText: {
    color: "white",
    alignSelf: "flex-start",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 2,
    alignItems: "center",
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 12,
  },
  excerpt: {
    fontFamily:
      Platform.OS === "android" ? undefined : "SF-Pro-Display-RegularItalic",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    fontStyle: "italic",
  },
  author: {
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Bold",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
  },
  date: {
    paddingTop: 5,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Light",
    fontWeight: Platform.OS === "android" ? "300" : undefined,
  },
  featuredImageContainer: {
    paddingTop: 18,
  },
  featuredImage: {
    width: "100%",
    height: 200,
    borderRadius: 8, // Rounded corners for better UI aesthetics
  },
  imageCaption: {
    fontSize: 14,
    marginTop: 8,
    paddingHorizontal: 16,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    fontStyle: "italic",
  },
  articleContent: {
    fontSize: 18,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
    lineHeight: 24, // Improves readability
  },

  // Tags Section
  tagsSection: {
    paddingBottom: 10,
  },
  tagsSectionTitle: {
    color: "#808080",
    paddingTop: 10,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Light",
    fontWeight: Platform.OS === "android" ? "300" : undefined,
  },
  tagsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: 10,
    gap: 8,
  },
  tagContainer: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginBottom: 5,
  },
  tagText: {
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Text-Regular",
    fontWeight: Platform.OS === "android" ? "400" : undefined,
  },

  // Related Articles Section
  relatedTitle: {
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : undefined,
  },
  relatedArticleContainer: {
    marginVertical: 16,
  },
  relatedArticleContent: {
    flexDirection: "row",
    marginBottom: 16,
    gap: 12,
  },
  noImageContainer: {
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  noImageText: {
    color: "#666",
    fontSize: 12,
  },

  // Article Text Container
  articleTextContainer: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },

  // Footer Section
  articleFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  timeText: {
    color: "#9e9e9e",
    fontSize: 12,
  },
  shareButton: {
    padding: 8,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default articleStyles;
