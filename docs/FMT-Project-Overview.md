# FMT News — Project Overview

## Purpose

Deliver a production-grade iOS & Android news app for Free Malaysia Today (FMT) — one of Malaysia's leading digital news publishers — giving readers fast, reliable access to breaking news, bilingual coverage, video, and personalized alerts on mobile.

---

## Intro / About Us

FMT News is the official mobile app for FMT Media Sdn Bhd (freemalaysiatoday.com). It brings FMT's full editorial experience — News, Berita (Malay), Opinion, Business, Sports, Lifestyle, Property, World, and Video — into a native mobile product.

Built for a high-traffic, content-heavy audience, the app supports instant updates, smooth scrolling through long feeds, readable rich-HTML articles, and push alerts for breaking stories. It covers architecture, performance, offline behavior, notifications, ads, and App Store / Play Store delivery end to end.

Current version: v2.2.x (live on iOS & Android).

---

## Challenges

1. **Content at scale** — Thousands of articles across 10+ categories/subcategories, with mixed content types (text, images, embeds, video).

2. **Performance on real devices** — Long news feeds must scroll smoothly on mid-range phones, not just flagships.

3. **Rich article rendering** — WordPress-style HTML (images, lists, embeds, inline ads) doesn't map cleanly to React Native.

4. **Bilingual publishing** — English and Malay (Berita) content in one app with separate navigation and notification topics.

5. **Unreliable connectivity** — Users often hit weak or patchy networks; the app still needs to feel usable.

6. **Push notification complexity** — Topic-based alerts (Breaking News, Berita Utama, Sports, etc.), deep-linking to the right article, and iOS APNs + Android channel handling.

7. **Monetization without hurting UX** — AdMob banners in feeds and articles without breaking layout or performance.

8. **Tablet support** — Dedicated layouts for iPad and large Android tablets.

9. **Legacy migration** — Feature parity with a prior Flutter implementation (notification topics, settings, UX patterns).

10. **Operational control** — Remote force-update config, analytics, and cache management for a live news product.

---

## How We Solved It

**Fast feed loading**
Priority-based S3 JSON feeds (high/medium/low) combined with Shopify FlashList for virtualized lists.

**Article detail & search**
GraphQL API for post data, search, tags, and related articles.

**Offline / poor network**
MMKV + Expo FileSystem caching, cached landing data, network banner with retry.

**HTML articles**
Custom htmlparser2-based renderer with theme-aware typography, YouTube embeds, and inline ad slots.

**Images**
Cloudflare Image component with preset widths, retry/backoff, prefetch queue, and LQIP placeholders.

**Notifications**
Firebase Cloud Messaging + Notifee for foreground display, topic subscriptions, and slug/date deep links.

**UX personalization**
Theme (light/dark/system), adjustable text size, standfirst toggle, visited-article tracking, bookmarks.

**Video**
In-app YouTube iframe player with related videos.

**Ads**
Google Mobile Ads with placement-specific units (home, article, ROS).

**Tablets**
Responsive layouts with dedicated tablet card components.

**App lifecycle**
Remote force-update config from S3, Firebase Analytics, in-app review prompts.

### Architecture Highlights

- Expo Router file-based navigation
- Redux Toolkit + React Context for category, theme, bookmarks, settings, and landing data
- Dual data layer: S3 feeds for list/landing performance, GraphQL for deep content queries

---

## Core Features

- **Category navigation** — Home, News, Berita, Opinion, World, Business, Property, Sports, Lifestyle, Videos (with subcategories)
- **Article reader** — Swipe between articles, share, bookmark, sticky header, related articles & tags
- **Search** — Real-time search, history, pagination, visited-state indicators
- **Bookmarks** — Offline-persisted saved articles via MMKV
- **Push notifications** — Topic-based subscriptions: Breaking News, Berita Utama, Top Opinion, Lifestyle, Business, Sports
- **Video hub** — FMT News, Lifestyle, Exclusive, News Capsule with in-app playback
- **Settings** — Theme, text size, notification toggles, cache/search history clear
- **Ads** — Contextual AdMob banners in feeds and article body
- **Offline awareness** — Connection error banner + cached content fallback
- **Force update** — Blocks outdated app versions with store redirect
- **Deep linking** — fmtnews:// scheme + notification to article navigation

---

## Tech Stack

### Mobile / Frontend

- React Native 0.81
- Expo 54
- TypeScript
- Expo Router
- React 19
- NativeWind / Tailwind CSS
- Redux Toolkit
- React Context
- Reanimated
- Gesture Handler
- Safe Area Context

### Data & Storage

- GraphQL
- AWS S3 JSON feeds
- react-native-mmkv
- Expo FileSystem (landing cache)

### Content & UI

- htmlparser2 + html-entities (custom HTML renderer)
- Shopify FlashList
- react-native-youtube-iframe
- Cloudflare Image CDN
- lucide-react-native

### Services / SDKs

- Firebase App, Analytics, Cloud Messaging
- Notifee
- Google Mobile Ads (AdMob)
- Expo Notifications, Expo Device, Expo Linking

### Tooling & Native

- Expo Dev Client
- Expo Build Properties
- Custom Expo config plugins
- Hermes JS engine
- React Native New Architecture (iOS)
- Jest
- Expo Lint

### Platforms

- iOS (iPhone + iPad)
- Android (edge-to-edge, POST_NOTIFICATIONS)
