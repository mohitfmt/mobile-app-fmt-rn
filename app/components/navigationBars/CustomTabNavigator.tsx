// CustomTabNavigator.tsx
//
// This file defines the CustomTabNavigator component, a custom animated tab navigator for the app.
// It provides swipeable, scrollable tabs with an animated indicator, gesture support, and dynamic layout.
// The navigator adapts to device width, theme, and orientation, and integrates with the app's navigation and content.
//
// Key responsibilities:
// - Render a scrollable, animated tab bar with indicator
// - Support swipe gestures and animated transitions between tabs
// - Adapt to device width, theme, and orientation
// - Integrate with navigation and content rendering for each tab
//
// Usage: Render <CustomTabNavigator ...props /> as the main tab navigation component in the app.
//
// -----------------------------------------------------------------------------

import React, {
  useContext,
  useRef,
  useState,
  useCallback,
  memo,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  LayoutChangeEvent,
  Platform,
  useWindowDimensions,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  interpolateColor,
  withTiming,
  runOnJS,
  useAnimatedGestureHandler,
  withDecay,
} from "react-native-reanimated";
import {
  PanGestureHandler,
  PanGestureHandlerGestureEvent,
} from "react-native-gesture-handler";
import { ScrollView } from "react-native-gesture-handler";
import { ThemeContext } from "@/app/providers/ThemeProvider";
import { CustomTabNavigatorProps } from "@/app/types/tabs";
import MemoizedTabScreen from "../mainCategory/MemoizedTabScreen";
import HeaderBar from "./Headerbar";
import type { FlatList as FlatListType } from "react-native";

// HEADER_HEIGHT: Constant for tab bar/header height.
const HEADER_HEIGHT = 48;

// GestureContext: Type for gesture handler context.
type GestureContext = {
  startX: number;
};

// Main CustomTabNavigator component
const CustomTabNavigator = forwardRef(
  (
    {
      routes,
      screenOptions,
      onTabPress,
      activeIndex,
      setActiveIndex,
    }: CustomTabNavigatorProps,
    ref
  ) => {
    // Get theme from context
    const { theme } = useContext(ThemeContext);
    // Shared value for horizontal scroll position of tab content
    const scrollX = useSharedValue(0);
    // Refs for FlatList (tab content) and ScrollView (tab bar)
    const scrollViewRef = useRef<FlatListType>(null);
    const tabScrollRef = useRef<ScrollView>(null);
    // Get device width for layout calculations
    const { width } = Dimensions.get("window");
    const isTablet = width >= 600;
    // Shared values for header animation
    const headerTranslateY = useSharedValue(0);
    const scrollOffsetY = useSharedValue(0);
    const prevOffsetY = useSharedValue(0);
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    // Animated style for header translation (show/hide on scroll)
    const headerAnimatedStyle = useAnimatedStyle(() => {
      return {
        transform: [{ translateY: headerTranslateY.value }],
      };
    });

    // Animated style for logo (fade/slide with header)
    const logoAnimatedStyle = useAnimatedStyle(() => {
      const translateY = headerTranslateY.value - 0; // Extra upward shift
      const opacity = interpolate(
        headerTranslateY.value,
        [-48, 0],
        [0, 1],
        "clamp"
      ); // Fade out as it moves up
      return {
        transform: [{ translateY }],
        opacity,
      };
    });

    // Shared values for header visibility and content layout
    const isHeaderVisible = useSharedValue(true);
    const contentHeight = useSharedValue(0);
    const layoutHeight = useSharedValue(0);

    // Animated scroll handler for tab content (shows/hides header on scroll)
    const onContentScroll = useAnimatedScrollHandler({
      onScroll: (event) => {
        const y = event.contentOffset.y;
        const diff = y - prevOffsetY.value;
        scrollOffsetY.value = y;
        contentHeight.value = event.contentSize.height;
        layoutHeight.value = event.layoutMeasurement.height;
        const isAtTop = y <= 0;
        const isAtBottom = y + layoutHeight.value >= contentHeight.value - 1;
        // Only hide/show header if not at very top or bottom
        if (!isAtTop && !isAtBottom) {
          if (diff > 2 && isHeaderVisible.value) {
            // Scrolling down: hide header
            isHeaderVisible.value = false;
            headerTranslateY.value = withTiming(-HEADER_HEIGHT - 8);
          } else if (diff < -2 && !isHeaderVisible.value) {
            // Scrolling up: show header
            isHeaderVisible.value = true;
            headerTranslateY.value = withTiming(0);
          }
        }
        prevOffsetY.value = y;
      },
    });

    // State for tab and text measurements (for indicator and scroll)
    const [tabLayouts, setTabLayouts] = useState(
      Array(routes.length).fill({ x: 0, width: 0 })
    );
    const [textWidths, setTextWidths] = useState(Array(routes.length).fill(0));
    const [allTabsMeasured, setAllTabsMeasured] = useState(false);
    const [layoutKey, setLayoutKey] = useState(0);

    // Colors for indicator and tab text
    const INDICATOR_COLOR = "#1976d2";
    const ACTIVE_TEXT_COLOR = theme.textColor || "#000000";
    const INACTIVE_TEXT_COLOR = "#666666";

    // Scroll the tab bar to center the active tab
    const scrollToTab = useCallback(
      (index: number) => {
        if (tabScrollRef.current && tabLayouts[index]) {
          const { x, width } = tabLayouts[index];
          const offset = x - (SCREEN_WIDTH - width) / 2;
          tabScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        }
      },
      [tabLayouts]
    );

    // Animated scroll handler for horizontal tab content swiping
    const handleScroll = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollX.value = event.contentOffset.x;
      },
      onMomentumEnd: (event) => {
        // Update active index and scroll tab bar when swipe ends
        const newIndex = Math.round(event.contentOffset.x / SCREEN_WIDTH);
        runOnJS(setActiveIndex)(newIndex);
        runOnJS(scrollToTab)(newIndex);
      },
    });

    // Update layout key on orientation change or route count change
    useEffect(() => {
      setLayoutKey((k) => k + 1);
    }, [SCREEN_WIDTH, routes.length]);

    // Check if all tabs and text have been measured
    useEffect(() => {
      const allMeasured =
        tabLayouts.every((layout) => layout.width > 0) &&
        textWidths.every((width) => width > 0);
      if (allMeasured && !allTabsMeasured) {
        setAllTabsMeasured(true);
      }
    }, [tabLayouts, textWidths]);

    // Scroll FlatList and tab bar to active tab on orientation change or tab change
    useEffect(() => {
      scrollViewRef.current?.scrollToOffset({
        offset: activeIndex * SCREEN_WIDTH,
        animated: false, // No animation for instant alignment
      });
      scrollToTab(activeIndex);
    }, [SCREEN_WIDTH, activeIndex, scrollToTab]);

    // Animated style for the tab indicator (position and width)
    const indicatorAnimatedStyle = useAnimatedStyle(() => {
      if (!allTabsMeasured) return { opacity: 0 };
      const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
      const translateX = interpolate(
        scrollX.value,
        inputRange,
        tabLayouts.map((layout) => layout.x + layout.width / 2)
      );
      const width = interpolate(
        scrollX.value,
        inputRange,
        textWidths.map((w) => w)
      );
      return {
        opacity: 1,
        transform: [{ translateX: translateX - width / 2 }],
        width,
      };
    });

    // Animated style for tab bar translation (centering active tab)
    const tabBarTranslateStyle = useAnimatedStyle(() => {
      if (!allTabsMeasured || tabLayouts.length === 0) {
        return {
          transform: [{ translateX: 0 }],
        };
      }
      const totalWidth =
        tabLayouts[tabLayouts.length - 1].x +
        tabLayouts[tabLayouts.length - 1].width;
      const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
      const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
      const outputRange = tabLayouts.map(({ x, width }) => {
        const tabCenter = x + width / 2;
        const screenCenter = SCREEN_WIDTH / 2;
        return -(tabCenter - screenCenter);
      });
      const translateX = interpolate(scrollX.value, inputRange, outputRange, {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      });
      return {
        transform: [
          { translateX: Math.max(-maxTranslate, Math.min(0, translateX)) },
        ],
      };
    });

    // Animated style for tab bar shadow/border based on header visibility
    const tabBarShadowStyle = useAnimatedStyle(() => {
      const isHidden = headerTranslateY.value < 0;
      return {
        ...(Platform.OS === "ios" && {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: isHidden ? 4 : 0 },
          shadowOpacity: isHidden ? 0.12 : 0,
          shadowRadius: isHidden ? 4 : 0,
        }),
        ...(Platform.OS === "android" && {
          borderBottomWidth: isHidden ? 1 : 0,
          borderBottomColor: isHidden ? "rgba(0, 0, 0, 0.12)" : "transparent",
        }),
      };
    }, [headerTranslateY]);

    // Handler for measuring tab layout (x, width)
    const handleTabLayout = useCallback(
      (index: number) => (event: LayoutChangeEvent) => {
        const { x, width } = event.nativeEvent.layout;
        setTabLayouts((prev) => {
          const updated = [...prev];
          updated[index] = { x, width };
          return updated;
        });
      },
      []
    );

    // Handler for measuring tab text width
    const handleTextLayout = useCallback(
      (index: number) => (event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setTextWidths((prev) => {
          const updated = [...prev];
          updated[index] = width;
          return updated;
        });
      },
      []
    );

    // Animated styles for tab text color transitions
    const animatedTextStyles = routes.map((_, index) =>
      useAnimatedStyle(() => {
        const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
        const activeFactor = interpolate(
          scrollX.value,
          inputRange,
          routes.map((_, i) => (i === index ? 1 : 0)),
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
        );
        const color = interpolateColor(
          activeFactor,
          [0, 1],
          [INACTIVE_TEXT_COLOR, ACTIVE_TEXT_COLOR]
        );
        return { color };
      })
    );

    // Handler for tab press: scrolls to tab and triggers navigation
    const handleTabPress = useCallback(
      (index: number, key: string) => {
        if (index < 0 || index >= routes.length) return;
        scrollViewRef.current?.scrollToOffset({
          offset: index * SCREEN_WIDTH,
          animated: true,
        });
        scrollToTab(index);
        onTabPress?.(key);
      },
      [routes.length, scrollToTab, onTabPress]
    );

    // Shared value and gesture handler for tab bar panning (horizontal drag)
    const tabsTranslateX = useSharedValue(0);
    const panGestureHandler = useAnimatedGestureHandler<
      PanGestureHandlerGestureEvent,
      GestureContext
    >({
      onStart: (_, ctx) => {
        ctx.startX = tabsTranslateX.value;
      },
      onActive: (event, ctx) => {
        const totalWidth =
          tabLayouts[tabLayouts.length - 1]?.x +
          tabLayouts[tabLayouts.length - 1]?.width;
        const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
        let newVal = ctx.startX + event.translationX;
        newVal = Math.max(Math.min(newVal, 0), -maxTranslate);
        tabsTranslateX.value = newVal;
      },
      onEnd: (event) => {
        const totalWidth =
          tabLayouts[tabLayouts.length - 1]?.x +
          tabLayouts[tabLayouts.length - 1]?.width;
        const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
        tabsTranslateX.value = withDecay({
          velocity: event.velocityX,
          clamp: [-maxTranslate, 0],
        });
      },
    });

    // Animated style for tab bar translation during gesture
    const gestureTranslateStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: tabsTranslateX.value }],
    }));

    // Expose handleTabPress to parent components via ref
    useImperativeHandle(ref, () => ({
      handleTabPress,
    }));

    // Render header, tab bar, indicator, and tab content (FlatList of MemoizedTabScreen)
    return (
      <>
        {/* Animated header bar with logo */}
        <Animated.View
          style={[
            styles.headerBar,
            headerAnimatedStyle,
            { paddingHorizontal: isTablet ? 15 : 0 },
            Platform.OS === "android" ? logoAnimatedStyle : null,
          ]}
        >
          <HeaderBar
            logoTranslateY={headerTranslateY}
            activeindex={activeIndex}
          />
        </Animated.View>

        {/* Animated tab bar with indicator and gesture support */}
        <Animated.View style={[styles.container, headerAnimatedStyle]}>
          <Animated.View
            style={[
              styles.tabBarContainer,
              {
                backgroundColor: theme.backgroundColor,
                marginTop: 48,
                paddingLeft: isTablet ? 20 : 0,
              },
              tabBarShadowStyle,
            ]}
          >
            <PanGestureHandler onGestureEvent={panGestureHandler}>
              <Animated.View
                key={layoutKey}
                style={[
                  gestureTranslateStyle,
                  tabBarTranslateStyle,
                  {
                    flexDirection: "row",
                    minWidth: SCREEN_WIDTH,
                    justifyContent: "flex-start",
                    alignItems: "center",
                  },
                ]}
              >
                {/* Render each tab as a TouchableOpacity */}
                {routes.map((route, index) => (
                  <TouchableOpacity
                    key={route.key}
                    onPress={() => handleTabPress(index, route.key)}
                    onLayout={handleTabLayout(index)}
                    style={styles.tab}
                    activeOpacity={0.7}
                  >
                    <Animated.Text
                      onLayout={handleTextLayout(index)}
                      style={[
                        styles.tabText,
                        screenOptions?.tabBarLabelStyle,
                        animatedTextStyles[index],
                      ]}
                    >
                      {route.title}
                    </Animated.Text>
                  </TouchableOpacity>
                ))}
                {/* Animated indicator under active tab */}
                <Animated.View
                  style={[
                    styles.indicator,
                    { backgroundColor: "#c62828" },
                    screenOptions?.tabBarIndicatorStyle,
                    indicatorAnimatedStyle,
                    !allTabsMeasured && { opacity: 0 },
                  ]}
                />
              </Animated.View>
            </PanGestureHandler>
          </Animated.View>

          {/* FlatList for tab content, horizontally swipeable */}
          <Animated.FlatList
            key={layoutKey}
            ref={scrollViewRef}
            data={routes}
            horizontal
            pagingEnabled
            keyExtractor={(item) => item.key}
            renderItem={({ item, index }) => {
              const isVisible =
                index === activeIndex ||
                index === activeIndex - 1 ||
                index === activeIndex + 1;
              return (
                <View
                  key={item.key}
                  style={[{ width: SCREEN_WIDTH }, headerAnimatedStyle]}
                >
                  <MemoizedTabScreen
                    categoryName={item.title}
                    isVisible={isVisible}
                    onScroll={onContentScroll}
                  />
                </View>
              );
            }}
            scrollEventThrottle={16}
            removeClippedSubviews={true}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
          />
        </Animated.View>
      </>
    );
  }
);

// StyleSheet for layout, tab bar, tab text, and indicator
const styles = StyleSheet.create({
  container: {
    flex: 1,
    minHeight: Dimensions.get("window").height + HEADER_HEIGHT + 40,
  },
  tabBarContainer: {
    height: HEADER_HEIGHT + 15,
    zIndex: 10,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
  },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
    zIndex: 10,
  },
  tabScroll: { flexGrow: 0 },
  tabScrollContent: {
    paddingHorizontal: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  tab: {
    paddingHorizontal: 16,
    height: HEADER_HEIGHT,
    justifyContent: "center",
    alignItems: "center",
  },
  tabText: {
    fontSize: 14,
    fontFamily: Platform.OS === "android" ? undefined : "SF-Pro-Display-Black",
    fontWeight: "800",
  },
  indicator: {
    position: "absolute",
    height: 5,
    bottom: -5,
    borderRadius: 1.5,
  },
});

export default memo(CustomTabNavigator);
