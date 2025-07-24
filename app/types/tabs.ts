import { Animated } from "react-native";

export interface TabRoute {
  key: string;
  title: string;
}

export interface CustomTabNavigatorProps {
  routes: TabRoute[];
  scrollY: Animated.Value;
  screenOptions?: {
    tabBarStyle?: object;
    tabBarIndicatorStyle?: object;
    tabBarActiveTintColor?: string;
    tabBarInactiveTintColor?: string;
    tabBarLabelStyle?: object;
  };
  onTabPress?: (routeKey: string) => void;
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  onScroll?: (event: any) => void;
  isVisible: boolean;
  toggleSidebar: () => void;
  scrollToTabExternally?: (index: number) => void;
  clampedScrollY: Animated.AnimatedInterpolation<string | number>;
}

// Default export to satisfy Expo Router
export default function Tabs() {
  return null;
}
