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

export interface VideoItem {
  id?: string;
  title: string;
  content?: string;
  excerpt?: string;
  date: string;
  thumbnail: string;
  permalink: string;
  uri?: string;
  videoId: string;
  type?: string;
  viewCount?: string;
  durationSeconds?: string | number;
  duration?: string;
  tags?: string[] | string;
  channelTitle?: string;
  statistics?: any;
  publishedAt?: string;
}

export interface SmallVideoCardProps {
  item: VideoItem;
  visited?: boolean;
  onPress?: () => void;
}

export interface VideoCardProps {
  item: VideoItem;
  visited?: boolean;
  onPress?: () => void;
}

// Default export to satisfy Expo Router
export default function Cards() {
  return null;
}
