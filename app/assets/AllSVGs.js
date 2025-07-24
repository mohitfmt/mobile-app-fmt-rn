/**
 * Icons.tsx
 *
 * This file contains reusable SVG icons for the application.
 * These icons are optimized for React Native and can be customized via props.
 *
 * Features:
 * - Scalable and customizable icons.
 * - Uses `react-native-svg` for better performance.
 * - Supports color customization via props.
 *
 * @author FMT Developers
 */

import * as React from "react"
import Svg, { Circle, Path, Polygon } from "react-native-svg"

// Play Icon
export const PlayIcon = (props) => (
  <Svg
  xmlns="http://www.w3.org/2000/svg"
  width={16}
  height={16}
  fill="#d32f2f"
  stroke="#d32f2f"
  strokeWidth={2}
  viewBox="0 0 24 24"
  {...props}
>
  <Path d="m9 18 6-6-6-6" />
</Svg>
)

// Settings Icon
export const Settings = (props) => (
    <Svg
        xmlns="http://www.w3.org/2000/svg"
        width={16}
        height={16}
        viewBox="0 0 1920 1920"
        {...props}
    >
        <Path
            fillRule="evenodd"
            d="M1703.534 960c0-41.788-3.84-84.48-11.633-127.172l210.184-182.174-199.454-340.856-265.186 88.433c-66.974-55.567-143.323-99.389-223.85-128.415L1158.932 0h-397.78L706.49 269.704c-81.43 29.138-156.423 72.282-223.962 128.414l-265.073-88.32L18 650.654l210.184 182.174C220.39 875.52 216.55 918.212 216.55 960s3.84 84.48 11.633 127.172L18 1269.346l199.454 340.856 265.186-88.433c66.974 55.567 143.322 99.389 223.85 128.415L761.152 1920h397.779l54.663-269.704c81.318-29.138 156.424-72.282 223.963-128.414l265.073 88.433 199.454-340.856-210.184-182.174c7.793-42.805 11.633-85.497 11.633-127.285m-743.492 395.294c-217.976 0-395.294-177.318-395.294-395.294 0-217.976 177.318-395.294 395.294-395.294 217.977 0 395.294 177.318 395.294 395.294 0 217.976-177.317 395.294-395.294 395.294"
        />
    </Svg>
)

// Search Icon
export const Search = (props) => {

    return (
        <Svg
            xmlns="http://www.w3.org/2000/svg"
            width={24}
            height={24}
            fill="none"
            viewBox="0 0 24 24"
            {...props}
        >
            <Path
                stroke="#c62828"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13.39 13.39 19 19m-9.5-4a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11Z"
            />
        </Svg>
    );
};

// Chevron Down Icon
export const ChevronDown = (props) => {

    return (
        <Svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} {...props}>
        <Path
          d="M1.148 2.477H5.641c.398-.004.793-.004 1.187-.004H8.707c.211 0 .398 0 .559.148.097.11.136.242.132.383-.02.215-.187.367-.335.512a4.255 4.255 0 0 0-.18.195 7.052 7.052 0 0 1-.168.172 1.61 1.61 0 0 0-.11.12c-.066.075-.132.142-.203.212a1.61 1.61 0 0 0-.109.12c-.066.075-.133.142-.203.212a1.61 1.61 0 0 0-.11.121c-.066.074-.132.14-.203.21A1.61 1.61 0 0 0 7.668 5c-.066.074-.133.14-.203.21a1.61 1.61 0 0 0-.11.122c-.066.074-.132.14-.203.211a5.177 5.177 0 0 1-.313.332 5.177 5.177 0 0 1-.313.332 1.61 1.61 0 0 0-.108.121c-.066.074-.133.14-.203.211a1.61 1.61 0 0 0-.11.121c-.066.074-.132.14-.203.211-.05.05-.097.106-.144.16a3.566 3.566 0 0 1-.172.172c-.031.035-.063.07-.09.106-.129.148-.305.199-.492.218a.795.795 0 0 1-.555-.27 1.113 1.113 0 0 1-.09-.1 3.832 3.832 0 0 0-.125-.13 1.755 1.755 0 0 1-.14-.152 2.084 2.084 0 0 0-.157-.164c-.07-.066-.128-.137-.19-.207-.04-.043-.083-.086-.122-.125-.07-.066-.129-.137-.191-.207-.04-.043-.082-.086-.122-.125-.07-.067-.128-.137-.19-.207A3.715 3.715 0 0 0 3 5.715c-.07-.067-.129-.137-.191-.207-.04-.043-.082-.086-.122-.125-.07-.067-.128-.137-.19-.207-.04-.043-.083-.086-.122-.125-.07-.067-.129-.137-.191-.207-.04-.043-.082-.086-.122-.125-.07-.067-.128-.137-.19-.207a3.715 3.715 0 0 0-.122-.125c-.07-.067-.129-.137-.191-.207-.04-.043-.082-.086-.121-.125-.07-.067-.13-.137-.192-.207a6.892 6.892 0 0 0-.168-.172c-.05-.051-.098-.106-.144-.16-.04-.043-.079-.079-.118-.118C.688 3.27.613 3.16.598 2.973a.562.562 0 0 1 .148-.364.565.565 0 0 1 .402-.132Zm0 0"
          style={{
            stroke: "none",
            fillRule: "nonzero",
            fill: "#9e9e9e",
            fillOpacity: 1,
          }}
        />
      </Svg>
        );
};

export const ShareIcon = ({ size, color, ...props }) => (
    <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    {...props}
  >
    {/* Main share path */}
    <Path
      d="M680-80q-50 0-85-35t-35-85q0-6 3-28L282-392q-16 15-37 23.5t-45 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q24 0 45 8.5t37 23.5l281-164q-2-7-2.5-13.5T560-760q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-24 0-45-8.5T598-672L317-508q2 7 2.5 13.5t.5 14.5q0 8-.5 14.5T317-452l281 164q16-15 37-23.5t45-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z"
      fill={color}
    />

    {/* Dots manually placed over original positions */}
    <Circle cx="680" cy="-160" r="32" fill={color} />
    <Circle cx="200" cy="-480" r="32" fill={color} />
    <Circle cx="680" cy="-720" r="32" fill={color} />
  </Svg>
  )


  export const BookmarkIcon = ({ size, color, fill, ...props }) => (
    <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 -960 960 960"
    {...props}
  >
    {/* Background fill */}
    <Path
      d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z"
      fill={fill}
    />

    {/* Outline stroke */}
    <Path
      d="M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Z"
      fill={color}
      strokeWidth={40}
    />
  </Svg>
  );

  export const Refresh = ({ size, color, ...props }) => (
    <Svg
    xmlns="http://www.w3.org/2000/svg"
    fill="#000000"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    {...props}
  >
    <Path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </Svg>
  )

// Default export - export all icons as an object
export default {
  PlayIcon,
  Settings,
  Search,
  ChevronDown,
  ShareIcon,
  BookmarkIcon,
  Refresh
};