export interface Post {
  id: string;
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  uri: string;
  featuredImage?: {
    node?: {
      sourceUrl: string;
    };
  };
}

export interface TagHeaderProps {
  tagName: string | string[] | undefined;
  onRefresh: () => void;
  textSize: string;
}

export interface TagNode {
  node: {
    slug: string;
  };
}

export interface TagData {
  edges: TagNode[];
}

// Default export to satisfy Expo Router
export default function Tag() {
  return null;
}
