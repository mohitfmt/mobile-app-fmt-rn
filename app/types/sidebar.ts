import { Animated } from "react-native";

export interface CategoryAnimations {
  [key: number]: Animated.Value;
}

export interface SidebarProps {
  isVisible: boolean;
  toggleSidebar: () => void;
  categories: { id: number; title: string; subcategories?: string[] }[];
  handleTabPress: (index: number, key: string) => void;
}

// Default export to satisfy Expo Router
export default function Sidebar() {
  return null;
}
