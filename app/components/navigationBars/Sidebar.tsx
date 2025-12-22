// Sidebar.tsx
//
// This file defines the Sidebar component, which provides a navigation sidebar with expandable categories and subcategories.
// It supports animated open/close, category expansion, and navigation to category/subcategory pages.
// The sidebar adapts to theme, device, and safe area insets, and integrates with Redux and navigation.
//
// Key responsibilities:
// - Display a sidebar with expandable categories and subcategories
// - Animate sidebar open/close and category expansion
// - Integrate with Redux for category selection
// - Navigate to category and subcategory pages
// - Adapt to theme, device, and safe area insets
//
// Usage: Render <Sidebar ...props /> as the navigation sidebar in the app.
//
// -----------------------------------------------------------------------------

import { GlobalSettingsContext } from "@/app/providers/GlobalSettingsProvider";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { CategoryAnimations, SidebarProps } from "@/app/types/sidebar";
import { useRouter } from "expo-router";
import { ChevronDown } from "lucide-react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import { AppDispatch } from "../../store";
import { setSelectedCategory } from "../../store/categorySlice";
import { getArticleTextSize } from "../functions/Functions";
import BottomActions from "./BottomActions";

const { width } = Dimensions.get("window");

const Sidebar = React.memo(
  ({ isVisible, toggleSidebar, handleTabPress, categories }: SidebarProps) => {
    const router = useRouter();
    const dispatch = useDispatch<AppDispatch>();
    const [expandedCategories, setExpandedCategories] = useState<Set<number>>(
      new Set()
    );
    const [currentSelectedCategory, setCurrentSelectedCategory] = useState<
      number | null
    >(null);
    const { theme } = useContext(ThemeContext);
    const { textSize } = useContext(GlobalSettingsContext);
    const { width, height } = useWindowDimensions();
    const isTablet = width >= 600;
    const sidebarAnimation = useRef(new Animated.Value(-width)).current;
    const overlayAnimation = useRef(new Animated.Value(0)).current;
    const [renderSidebar, setRenderSidebar] = useState(false);
    const insets = useSafeAreaInsets();

    const categoryRotations = useRef<CategoryAnimations>({}).current;

    useEffect(() => {
      categories.forEach((category) => {
        if (!categoryRotations[category.id]) {
          categoryRotations[category.id] = new Animated.Value(0);
        }
      });
    }, []);

    useEffect(() => {
      if (isVisible) {
        setRenderSidebar(true);
        Animated.parallel([
          Animated.timing(sidebarAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(sidebarAnimation, {
            toValue: -width,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => setRenderSidebar(false));
      }
    }, [isVisible]);

    const handleCategoryPress = useCallback(
      (id: number) => {
        const categoryKey =
          categories.find((cat) => cat.id === id)?.title || "";
        const isCurrentlyExpanded = expandedCategories.has(id);
        const newExpanded = new Set(expandedCategories);

        if (isCurrentlyExpanded) {
          newExpanded.delete(id);
          Animated.spring(categoryRotations[id], {
            toValue: 0,
            tension: 150,
            friction: 12,
            useNativeDriver: true,
          }).start();
        } else {
          newExpanded.add(id);
          Animated.spring(categoryRotations[id], {
            toValue: 1,
            tension: 150,
            friction: 12,
            useNativeDriver: true,
          }).start();
        }

        setExpandedCategories(newExpanded);
        setCurrentSelectedCategory(id);

        dispatch(setSelectedCategory(id));
        if (handleTabPress) {
          handleTabPress(id - 1, categoryKey);
        }
      },
      [expandedCategories, categoryRotations, dispatch, handleTabPress]
    );

    const handleSubcategoryPress = (subcategoryName: string) => {
      const videoSubcategories = [
        "Fmt News",
        "Fmt Lifestyle",
        "Fmt Exclusive",
        "Fmt News Capsule",
      ];
      const isVideo = videoSubcategories.includes(subcategoryName);

      router.push({
        pathname: isVideo
          ? "/components/videos/CategoryVideoPage"
          : "/components/categoryPage/CategoryPage",
        params: {
          CategoryName: subcategoryName,
        },
      });

      toggleSidebar();
    };

    if (!renderSidebar) return null;

    return (
      <View
        style={[
          styles.container,
          {
            top: 0,
            left: 0,
            right: 0,
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0.5)",
          },
        ]}
      >
        <Animated.View style={[styles.overlay, { opacity: overlayAnimation }]}>
          <TouchableOpacity
            style={styles.overlayTouch}
            onPress={toggleSidebar}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sidebar,
            {
              transform: [{ translateX: sidebarAnimation }],
              backgroundColor: theme.backgroundColor,
              zIndex: 100,
              elevation: 24,
              width: Platform.OS === "ios" ? 304 : 304,
              paddingTop: insets.top,
            },
          ]}
        >
          <ScrollView style={[styles.scrollView, {}]}>
            {categories.map((category) => {
              const rotateAnimation = categoryRotations[category.id];
              const isExpanded = expandedCategories.has(category.id);

              const spin = rotateAnimation?.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "180deg"],
              });

              return (
                <View
                  key={category.id}
                  style={[
                    isExpanded && styles.expandedCategory,
                    {
                      borderColor:
                        theme.backgroundColor === "#000000"
                          ? "#3f3f3f"
                          : "#E5E7EB",
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleCategoryPress(category.id)}
                    style={[
                      styles.category,
                      isExpanded && styles.expandedCategoryHeader,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        {
                          color:
                            currentSelectedCategory === category.id ||
                            expandedCategories.has(category.id)
                              ? "#C62828"
                              : theme.textColor,
                          fontSize: getArticleTextSize(16, textSize),
                        },
                      ]}
                    >
                      {category.title}
                    </Text>

                    {category.subcategories && (
                      <Animated.View
                        style={
                          spin ? { transform: [{ rotate: spin }] } : undefined
                        }
                      >
                        <ChevronDown
                          size={20}
                          color={
                            currentSelectedCategory === category.id ||
                            expandedCategories.has(category.id)
                              ? "#C62828"
                              : theme.textColor
                          }
                        />
                      </Animated.View>
                    )}
                  </TouchableOpacity>
                  {category.subcategories && isExpanded && (
                    <View style={styles.subcategories}>
                      {category.subcategories.map((sub, index) => (
                        <TouchableOpacity
                          key={index}
                          onPress={() => handleSubcategoryPress(sub)}
                        >
                          <Text
                            style={[
                              styles.subcategoryText,
                              {
                                color: theme.textColor,
                                fontSize: getArticleTextSize(16, textSize),
                              },
                            ]}
                          >
                            {sub}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
          <BottomActions />
        </Animated.View>
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 100,
  },
  overlayTouch: {
    width: "100%",
    height: "100%",
  },
  sidebar: {
    position: "absolute",
    top: 0,
    left: 0,
    height: "100%",
  },
  scrollView: {
    paddingHorizontal: 16,
  },
  category: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 8,
    paddingTop: 12,
  },
  expandedCategory: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E7EB",
  },
  expandedCategoryHeader: {},
  categoryText: {
    textTransform: "uppercase",
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : "900",
    paddingVertical: 8,
  },
  selectedText: {
    color: "#DC2626",
  },
  subcategories: {},
  subcategoryText: {
    color: "#333",
    textTransform: "uppercase",
    // fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: Platform.OS === "android" ? "900" : "900",
    paddingVertical: 18,
  },
});

export default Sidebar;
