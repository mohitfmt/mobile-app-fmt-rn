export interface BookmarkModel {
  id: string;
  title: string;
  featuredImage: {
    node?: {
      sourceUrl?: string;
    };
  };
  excerpt: string;
  date: string;
  slug: string;
  posts: any;
}

// Defines the shape of the BookmarkContext
export interface BookmarkContextType {
  bookmarkedArticles: string[];
  addBookmark: (id: string, data: any) => Promise<void>;
  removeBookmark: (id: string) => Promise<void>;
  isBookmarked: (id: string) => boolean;
}

// Default export to satisfy Expo Router
export default function Bookmark() {
  return null;
}
