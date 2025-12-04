import { createMMKV, MMKV } from "react-native-mmkv";

export const storage: MMKV = createMMKV({
  id: "fmt-news-storage",
  encryptionKey: undefined, // Optional: add encryption key for sensitive data
});

// Default export
export default storage;
