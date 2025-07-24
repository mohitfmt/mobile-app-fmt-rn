export type CategoryIndex = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 6;

export interface SelectedCategory {
  selectedCategory: CategoryIndex;
  activeIndex: number;
}

// Default export to satisfy Expo Router
export default function MainPage() {
  return null;
}
