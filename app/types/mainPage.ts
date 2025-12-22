export type CategoryIndex = 0 | 1 | 2 | 3 | 4 | 5 | 7 | 8 | 6;

export type BuildSectionOptions = {
  list?: any[];
  key: string;
  title?: string;
  variant?: "highlight" | "default";
  isVideo?: boolean;
  totalPerSection?: number;
  highlightCount?: number;
};

export interface TaxQuery {
  taxArray: Array<{
    terms: string[];
    operator: string;
    taxonomy: string;
    field: string;
  }>;
  relation: string;
}
export interface PostsVariables {
  first: number;
  where?: {
    taxQuery?: TaxQuery;
    status?: string;
    [key: string]: any;
  };
}

export interface SelectedCategory {
  selectedCategory: CategoryIndex;
  activeIndex: number;
}

// Default export to satisfy Expo Router
export default function MainPage() {
  return null;
}
