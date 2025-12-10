// index.tsx
//
// This file defines the main home screen of the app, including the tab navigator and sidebar.
// It manages category selection, theme, network status, and safe area insets.
//
// Key responsibilities:
// - Render the main tab navigator for news categories
// - Manage sidebar visibility and category selection
// - Handle theme and network status (show error notification if offline)
// - Show splash/loading screen while data is loading
// - Integrate safe area insets for proper layout on all devices
//
// Usage: This is the default entry point for the app's main screen. It is rendered by the root layout.
//
// -----------------------------------------------------------------------------

import { initializeFirstTimeNotifications } from "@/app/hooks/useSubscribeTopic";
import { categories, categoriesList } from "@/app/lib/categories";
import { setSelectedCategory } from "@/app/store/categorySlice";
import axios from "axios";
import { StatusBar } from "expo-status-bar";
import { Menu } from "lucide-react-native";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Image,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useDispatch } from "react-redux";
import CustomTabNavigator from "./components/navigationBars/CustomTabNavigator";
import Sidebar from "./components/navigationBars/Sidebar";
import ConnectionErrorNotification from "./NetworkBanner";
import { useLandingData } from "./providers/LandingProvider";
import { ThemeContext } from "./providers/ThemeProvider";

// HEADER_HEIGHT: Constant for header bar height.
const HEADER_HEIGHT = 48;

// Home: Main component for the home screen and tab navigation.
// - Manages sidebar, theme, network status, and loading state
// - Handles tab/category selection and navigation
// - Shows splash screen while loading
// - Renders CustomTabNavigator and Sidebar
const Home = () => {
  const dispatch = useDispatch();
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const { theme, isOnline, setIsOnline } = useContext(ThemeContext);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [activeIndex, setActiveIndex] = useState(0);
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 600;
  const { isLoading, refreshLandingPages } = useLandingData();
  const customTabRef = useRef<any>(null);
  const clampedScrollY = Animated.diffClamp(scrollY, 0, HEADER_HEIGHT);
  const insets = useSafeAreaInsets();

  const handleTryAgain = async () => {
    try {
      await axios.head("https://www.google.com", { timeout: 3000 });
      setIsOnline(true);
      await refreshLandingPages();
    } catch (err: unknown) {
      setIsOnline(false);
    }
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
    }
  );

  const handleTabPress = useCallback(
    (categoryId: string) => {
      dispatch(setSelectedCategory(parseInt(categoryId)));
    },
    [dispatch]
  );

  const baseCategories = categories;

  const routes = useMemo(
    () =>
      baseCategories.map((category) => ({
        key: category.id.toString(),
        title: category.title.toUpperCase(),
      })),
    [isTablet]
  );

  useEffect(() => {
    initializeFirstTimeNotifications();
  }, []);

  if (isLoading) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundColor }]}
      >
        <StatusBar
          style={theme.backgroundColor === "#000000" ? "light" : "dark"}
          backgroundColor={theme.backgroundColor}
          translucent={false}
        />
        <View
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <Image
            source={require("./assets/images/launch_image.png")}
            style={{ width: width, height: height * 0.3 }}
            resizeMode="contain"
            resizeMethod="resize"
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          flex: 1,
          backgroundColor: theme.backgroundColor,
          paddingTop: insets.top,
        },
      ]}
    >
      <StatusBar
        style={theme.backgroundColor === "#000000" ? "light" : "dark"}
        backgroundColor={theme.backgroundColor}
        translucent={false}
      />
      <View style={styles.contentContainer}>
        <Animated.View style={[styles.mainContainer]}>
          <CustomTabNavigator
            ref={customTabRef}
            routes={routes}
            scrollY={scrollY}
            clampedScrollY={clampedScrollY}
            onScroll={handleScroll}
            screenOptions={{
              tabBarStyle: [styles.tabBar],
              tabBarIndicatorStyle: { backgroundColor: "#c62828" },
              tabBarActiveTintColor: theme.textColor,
              tabBarInactiveTintColor:
                theme.textColor === "#000000" ? "#4a4a4a" : "#b1b1b1",
              tabBarLabelStyle: styles.categoryText,
            }}
            onTabPress={handleTabPress}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            isVisible={isSidebarVisible}
            toggleSidebar={() => setIsSidebarVisible(false)}
          />
        </Animated.View>
      </View>
      <TouchableOpacity
        onPress={() => setIsSidebarVisible((prev) => !prev)}
        style={[
          styles.floatingButton,
          { marginBottom: insets.bottom, zIndex: 0 },
        ]}
      >
        <Menu size={22} color="white" />
      </TouchableOpacity>
      {isSidebarVisible && (
        <Sidebar
          isVisible={isSidebarVisible}
          toggleSidebar={() => setIsSidebarVisible(false)}
          categories={categoriesList}
          handleTabPress={(index: number) => {
            const key = routes[index]?.key;
            customTabRef.current?.handleTabPress(index, key);
          }}
        />
      )}
      {!isOnline && (
        <ConnectionErrorNotification
          onTryAgain={handleTryAgain}
          visible={true}
        />
      )}
    </View>
  );
};

// styles: StyleSheet for layout and UI elements.
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { flex: 1, position: "relative" },
  headerBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_HEIGHT,
  },
  mainContainer: { flex: 1, zIndex: 0 },
  tabBar: { elevation: 4 },
  categoryText: {
    fontSize: 16,
    lineHeight: 20,
    textAlign: "center",
  },
  floatingButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    backgroundColor: "#c62828",
    borderRadius: 50,
    width: 55,
    height: 55,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});

export default Home;
