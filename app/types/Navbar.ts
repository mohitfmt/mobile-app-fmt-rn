export interface SidebarProps {
  isVisible: boolean;
  toggleSidebar: () => void;
  categories: { id: number; title: string; subcategories?: string[] }[];
}

export interface BookmarkModel {
  id: number;
  title: string;
  dateAdded: string;
  url?: string;
}

// Default export to satisfy Expo Router
export default function Navbar() {
  return null;
}

