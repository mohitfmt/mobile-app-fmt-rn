import { ThemeContext } from "@/app/providers/ThemeProvider";
import { CustomTabNavigatorProps } from "@/app/types/tabs";
import React, {
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type { FlatList as FlatListType } from "react-native";
import {
  Dimensions,
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from "react-native-reanimated";
import MemoizedTabScreen from "../mainCategory/MemoizedTabScreen";
import HeaderBar from "./Headerbar";

const HEADER_HEIGHT = 48;
const HEADER_COLLAPSE_DISTANCE = HEADER_HEIGHT + 8;
const SNAP_TIMING_CONFIG = { duration: 200, easing: Easing.out(Easing.cubic) };

type GestureContext = {
  startX: number;
};

const CustomTabNavigator = forwardRef(
  (
    {
      routes,
      screenOptions,
      onTabPress,
      activeIndex,
      setActiveIndex,
    }: CustomTabNavigatorProps,
    ref,
  ) => {
    const { theme } = useContext(ThemeContext);
    const scrollX = useSharedValue(0);
    const scrollViewRef = useRef<FlatListType>(null);
    const tabScrollRef = useRef<ScrollView>(null);
    const { width } = Dimensions.get("window");
    const isTablet = width >= 600;
    const headerTranslateY = useSharedValue(0);
    const scrollOffsetY = useSharedValue(0);
    const prevOffsetY = useSharedValue(0);
    const { width: SCREEN_WIDTH } = useWindowDimensions();

    const headerAnimatedStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: headerTranslateY.value }],
    }));

    const isHeaderVisible = useSharedValue(true);
    const contentHeight = useSharedValue(0);
    const layoutHeight = useSharedValue(0);

    const onContentScroll = useAnimatedScrollHandler({
      onScroll: (event) => {
        const y = event.contentOffset.y;
        const diff = y - prevOffsetY.value;
        scrollOffsetY.value = y;
        contentHeight.value = event.contentSize.height;
        layoutHeight.value = event.layoutMeasurement.height;
        const isAtTop = y <= 0;
        const isAtBottom = y + layoutHeight.value >= contentHeight.value - 1;

        if (isAtTop) {
          headerTranslateY.value = 0;
          isHeaderVisible.value = true;
          prevOffsetY.value = y;
          return;
        }

        if (!isAtBottom) {
          const next = headerTranslateY.value - diff;
          headerTranslateY.value = Math.max(
            -HEADER_COLLAPSE_DISTANCE,
            Math.min(0, next),
          );
          isHeaderVisible.value =
            headerTranslateY.value > -HEADER_COLLAPSE_DISTANCE;
        }

        prevOffsetY.value = y;
      },
      onEndDrag: () => {
        const shouldShow =
          headerTranslateY.value > -HEADER_COLLAPSE_DISTANCE / 2;
        isHeaderVisible.value = shouldShow;
        headerTranslateY.value = withTiming(
          shouldShow ? 0 : -HEADER_COLLAPSE_DISTANCE,
          SNAP_TIMING_CONFIG,
        );
      },
      onMomentumEnd: () => {
        const shouldShow =
          headerTranslateY.value > -HEADER_COLLAPSE_DISTANCE / 2;
        isHeaderVisible.value = shouldShow;
        headerTranslateY.value = withTiming(
          shouldShow ? 0 : -HEADER_COLLAPSE_DISTANCE,
          SNAP_TIMING_CONFIG,
        );
      },
    });

    const [tabLayouts, setTabLayouts] = useState(
      Array(routes.length).fill({ x: 0, width: 0 }),
    );
    const [textWidths, setTextWidths] = useState(Array(routes.length).fill(0));
    const [allTabsMeasured, setAllTabsMeasured] = useState(false);
    const [layoutKey, setLayoutKey] = useState(0);

    const ACTIVE_TEXT_COLOR = theme.textColor || "#000000";
    const INACTIVE_TEXT_COLOR = "#666666";

    const scrollToTab = useCallback(
      (index: number) => {
        if (tabScrollRef.current && tabLayouts[index]) {
          const { x, width: w } = tabLayouts[index];
          const offset = x - (SCREEN_WIDTH - w) / 2;
          tabScrollRef.current.scrollTo({
            x: Math.max(0, offset),
            animated: true,
          });
        }
      },
      [tabLayouts, SCREEN_WIDTH],
    );

    const handleScroll = useAnimatedScrollHandler({
      onScroll: (event) => {
        scrollX.value = event.contentOffset.x;
      },
    });

    const handleMomentumScrollEnd = useCallback(
      (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const newIndex = Math.round(
          event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
        );
        setActiveIndex(newIndex);
        scrollToTab(newIndex);
      },
      [SCREEN_WIDTH, scrollToTab, setActiveIndex],
    );

    useEffect(() => {
      setLayoutKey((k) => k + 1);
    }, [SCREEN_WIDTH, routes.length]);

    useEffect(() => {
      const allMeasured =
        tabLayouts.every((layout) => layout.width > 0) &&
        textWidths.every((w) => w > 0);
      if (allMeasured && !allTabsMeasured) {
        setAllTabsMeasured(true);
      }
    }, [tabLayouts, textWidths]);

    useEffect(() => {
      scrollViewRef.current?.scrollToOffset({
        offset: activeIndex * SCREEN_WIDTH,
        animated: false,
      });
      scrollToTab(activeIndex);
    }, [SCREEN_WIDTH, activeIndex, scrollToTab]);

    const indicatorAnimatedStyle = useAnimatedStyle(() => {
      if (!allTabsMeasured) return { opacity: 0 };
      const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
      const translateX = interpolate(
        scrollX.value,
        inputRange,
        tabLayouts.map((layout) => layout.x + layout.width / 2),
      );
      const w = interpolate(
        scrollX.value,
        inputRange,
        textWidths.map((tw) => tw),
      );
      return {
        opacity: 1,
        transform: [{ translateX: translateX - w / 2 }],
        width: w,
      };
    });

    const tabBarTranslateStyle = useAnimatedStyle(() => {
      if (!allTabsMeasured || tabLayouts.length === 0) {
        return { transform: [{ translateX: 0 }] };
      }
      const totalWidth =
        tabLayouts[tabLayouts.length - 1].x +
        tabLayouts[tabLayouts.length - 1].width;
      const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
      const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
      const outputRange = tabLayouts.map(({ x, width: w }) => {
        const tabCenter = x + w / 2;
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

    const tabBarBorderStyle = useAnimatedStyle(() => {
      const progress = interpolate(
        headerTranslateY.value,
        [-HEADER_COLLAPSE_DISTANCE, -HEADER_COLLAPSE_DISTANCE / 2, 0],
        [1, 0.5, 0],
        "clamp",
      );
      if (Platform.OS === "ios") {
        return {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: progress * 4 },
          shadowOpacity: progress * 0.12,
          shadowRadius: progress * 4,
        };
      }
      return {
        borderBottomWidth: progress > 0.5 ? 1 : 0,
        borderBottomColor:
          progress > 0.5 ? "rgba(0, 0, 0, 0.12)" : "transparent",
      };
    });

    const handleTabLayout = useCallback(
      (index: number) => (event: LayoutChangeEvent) => {
        const { x, width: w } = event.nativeEvent.layout;
        setTabLayouts((prev) => {
          const updated = [...prev];
          updated[index] = { x, width: w };
          return updated;
        });
      },
      [],
    );

    const handleTextLayout = useCallback(
      (index: number) => (event: LayoutChangeEvent) => {
        const { width: w } = event.nativeEvent.layout;
        setTextWidths((prev) => {
          const updated = [...prev];
          updated[index] = w;
          return updated;
        });
      },
      [],
    );

    const animatedTextStyles = routes.map((_, index) =>
      useAnimatedStyle(() => {
        const inputRange = routes.map((_, i) => i * SCREEN_WIDTH);
        const activeFactor = interpolate(
          scrollX.value,
          inputRange,
          routes.map((_, i) => (i === index ? 1 : 0)),
          { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
        );
        const color = interpolateColor(
          activeFactor,
          [0, 1],
          [INACTIVE_TEXT_COLOR, ACTIVE_TEXT_COLOR],
        );
        return { color };
      }),
    );

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
      [routes.length, scrollToTab, onTabPress, SCREEN_WIDTH],
    );

    const context = useSharedValue({ startX: 0 });
    const tabsTranslateX = useSharedValue(0);

    const panGesture = Gesture.Pan()
      .onStart(() => {
        context.value = { startX: tabsTranslateX.value };
      })
      .onUpdate((event) => {
        const totalWidth =
          tabLayouts[tabLayouts.length - 1]?.x +
          tabLayouts[tabLayouts.length - 1]?.width;
        const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
        let newVal = context.value.startX + event.translationX;
        newVal = Math.max(Math.min(newVal, 0), -maxTranslate);
        tabsTranslateX.value = newVal;
      })
      .onEnd((event) => {
        const totalWidth =
          tabLayouts[tabLayouts.length - 1]?.x +
          tabLayouts[tabLayouts.length - 1]?.width;
        const maxTranslate = Math.max(totalWidth - SCREEN_WIDTH, 0);
        tabsTranslateX.value = withDecay({
          velocity: event.velocityX,
          clamp: [-maxTranslate, 0],
        });
      });

    const gestureTranslateStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: tabsTranslateX.value }],
    }));

    useImperativeHandle(ref, () => ({
      handleTabPress,
    }));

    return (
      <>
        <Animated.View
          style={[
            styles.headerBar,
            headerAnimatedStyle,
            { paddingHorizontal: isTablet ? 15 : 0 },
          ]}
        >
          <HeaderBar
            logoTranslateY={headerTranslateY}
            activeindex={activeIndex}
          />
        </Animated.View>

        <Animated.View style={[styles.container, headerAnimatedStyle]}>
          <Animated.View
            style={[
              styles.tabBarContainer,
              {
                backgroundColor: theme.backgroundColor,
                marginTop: 48,
                paddingLeft: isTablet ? 20 : 0,
              },
              tabBarBorderStyle,
            ]}
          >
            <GestureDetector gesture={panGesture}>
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
            </GestureDetector>
          </Animated.View>

          <Animated.FlatList
            key={layoutKey}
            ref={scrollViewRef}
            data={routes}
            horizontal
            pagingEnabled
            keyExtractor={(item) => item.key}
            initialNumToRender={1}
            maxToRenderPerBatch={1}
            windowSize={3}
            updateCellsBatchingPeriod={50}
            getItemLayout={(_, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            renderItem={({ item, index }) => {
              const isVisible =
                index === activeIndex ||
                index === activeIndex - 1 ||
                index === activeIndex + 1;
              return (
                <Animated.View key={item.key} style={{ width: SCREEN_WIDTH }}>
                  <MemoizedTabScreen
                    categoryName={item.title}
                    isVisible={isVisible}
                    onScroll={onContentScroll}
                  />
                </Animated.View>
              );
            }}
            scrollEventThrottle={8}
            removeClippedSubviews={Platform.OS === "android"}
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
          />
        </Animated.View>
      </>
    );
  },
);

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
    fontWeight: "900",
  },
  indicator: {
    position: "absolute",
    height: 5,
    bottom: -5,
    borderRadius: 1.5,
  },
});

export default memo(CustomTabNavigator);
