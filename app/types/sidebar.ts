import { Animated } from "react-native";

export interface CategoryItem {
  id: number;
  title: string;
  href: string;
}

export interface Category {
  id: number;
  title: string;
  href: string;
  items?: CategoryItem[];
}

export interface CategoryAnimations {
  [key: number]: Animated.Value;
}

export interface SidebarProps {
  isVisible: boolean;
  toggleSidebar: () => void;
  categories: Category[];
  handleTabPress: (index: number, key: string) => void;
}

// Default export to satisfy Expo Router
export default function Sidebar() {
  return null;
}
