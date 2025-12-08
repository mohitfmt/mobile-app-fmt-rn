export interface NewsCardProps {
  imageUri: string;
  heading: string;
  info: string;
  time: string;
  category?: string;
}

// Default export to satisfy Expo Router
export default function Screen() {
  return null;
}
