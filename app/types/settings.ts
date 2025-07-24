export interface SelectionModalProps {
  visible: boolean;
  onClose: () => void;
  options: string[];
  selectedValue: string;
  onSelect: (value: string) => void;
  title: string;
}

export interface NotificationSetting {
  id: string;
  title: string;
  enabled: boolean;
  key: string;
  topic: string;
}

export interface AboutItem {
  title: string;
  value?: string;
  action: () => void;
  isLink?: boolean;
}

export interface StickyNotificationProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

// Default export to satisfy Expo Router
export default function Settings() {
  return null;
}
