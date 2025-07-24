export interface TagProps {
  label: string;
}

export interface RelatedArticleProps {
  onPress: () => void;
  id: string;
  image: string | null;
  title: string;
  subtitle: string;
  time: string;
  uri: string;
  author?: string;
}

// Define the Type for an Article
export type ArticleType = {
  id: string;
  type?:
    | "CARD_TITLE"
    | "MORE_ITEM"
    | "AD_ITEM"
    | "featured"
    | "video-featured"
    | "video"
    | string;
  slug: string;
  uri: string;
  title: string;
  dateGmt: string;
  excerpt: string;
  content: string;
  posts: any;
  databaseId: string;
  permalink: string;
  author: {
    node: {
      name: string;
      slug: string;
      uri: string;
    };
  };
  categories: {
    edges: { node: { name: string; slug: string; uri: string } }[];
  };
  tags: {
    edges: { node: { name: string; slug: string; uri: string } }[];
  };
  featuredImage?: {
    node?: {
      sourceUrl: string;
    };
  };
  relatedPosts?: {
    node: {
      id: string;
      slug: string;
      title: string;
      excerpt?: string;
      dateGmt?: string;
      featuredImage?: {
        node: {
          sourceUrl: string;
        };
      };
    };
  }[];
};

// Default export to satisfy Expo Router
export default function Article() {
  return null;
}
