export interface NewsCardProps {
  id: string;
  imageUri: string;
  heading: string;
  info: string;
  time: string;
  category?: string;
  slug?: string;
  posts: any;
  index?: number;
  uri: string;
  main?: boolean;
  isVisible?: boolean; // Add isVisible
  visited?: boolean;
}

export interface SmallNewsCardProps {
  id: string;
  imageUri: string;
  heading: string;
  info: string;
  time: string;
  category?: string;
  slug: string;
  posts: any;
  index: number;
  uri: string;
  main?: boolean;
  isVisible?: boolean; // Add isVisible
  tagName?: string;
  visited?: boolean;
}

export interface SmallVideoCardProps {
  thumbnail: string;
  title: string;
  content: string;
  date: string;
  permalink: string;
  category?: string;
  visited?: boolean;
}

export interface VideoCardProps {
  title: string;
  permalink: string;
  content: string;
  date: string;
  thumbnail: string;
  type: string;
  visited?: boolean;
}

// Default export to satisfy Expo Router
export default function Cards() {
  return null;
}
