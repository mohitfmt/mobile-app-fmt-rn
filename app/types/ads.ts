// Define the allowed ad unit keys
export type AdUnitKey = "home" | "article1" | "article2" | "article3" | "ros";

// Props for the BannerAD component
export interface BannerADProps {
  unit: AdUnitKey;
}

// Default export to satisfy Expo Router
export default function Ads() {
  return null;
}
