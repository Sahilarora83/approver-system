import React, { memo } from "react";
import Svg, { Path, Circle, Rect, Line, Polyline } from "react-native-svg";

export type IconName =
  | "home"
  | "calendar"
  | "users"
  | "user"
  | "scan"
  | "ticket"
  | "camera"
  | "list"
  | "map-pin"
  | "check"
  | "x"
  | "chevron-right"
  | "chevron-left"
  | "alert-triangle"
  | "x-circle"
  | "check-circle"
  | "bell"
  | "help-circle"
  | "info"
  | "log-out"
  | "log-in"
  | "plus"
  | "share"
  | "settings"
  | "search"
  | "edit"
  | "trash"
  | "copy"
  | "link"
  | "external-link"
  | "mail"
  | "clock"
  | "refresh"
  | "qr-code"
  | "share-2"
  | "share-2"
  | "trash-2"
  | "chevron-down"
  | "image"
  | "shield"
  | "moon"
  | "lock"
  | "eye"
  | "eye-off";

import { StyleProp, ViewStyle } from "react-native";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

export const Icon = memo(function Icon({
  name,
  size = 24,
  color = "#000000",
  strokeWidth = 2,
  style,
}: IconProps) {
  const icons: Record<IconName, React.ReactNode> = {
    home: (
      <>
        <Path
          d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="9,22 9,12 15,12 15,22"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    calendar: (
      <>
        <Rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          ry="2"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Line
          x1="16"
          y1="2"
          x2="16"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="2"
          x2="8"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="3"
          y1="10"
          x2="21"
          y2="10"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    users: (
      <>
        <Path
          d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="9" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Path
          d="M23 21v-2a4 4 0 0 0-3-3.87"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M16 3.13a4 4 0 0 1 0 7.75"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    user: (
      <>
        <Path
          d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </>
    ),
    scan: (
      <>
        <Path
          d="M3 7V5a2 2 0 0 1 2-2h2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M17 3h2a2 2 0 0 1 2 2v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M21 17v2a2 2 0 0 1-2 2h-2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M7 21H5a2 2 0 0 1-2-2v-2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="7"
          y1="12"
          x2="17"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    ticket: (
      <>
        <Path
          d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="9"
          y1="12"
          x2="15"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    camera: (
      <>
        <Path
          d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="12" cy="13" r="4" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </>
    ),
    list: (
      <>
        <Line
          x1="8"
          y1="6"
          x2="21"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="12"
          x2="21"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="8"
          y1="18"
          x2="21"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="3"
          y1="6"
          x2="3.01"
          y2="6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="3"
          y1="12"
          x2="3.01"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="3"
          y1="18"
          x2="3.01"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "map-pin": (
      <>
        <Path
          d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="12" cy="10" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </>
    ),
    shield: (
      <Path
        d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    check: (
      <Polyline
        points="20,6 9,17 4,12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    x: (
      <>
        <Line
          x1="18"
          y1="6"
          x2="6"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="6"
          y1="6"
          x2="18"
          y2="18"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "chevron-right": (
      <Polyline
        points="9,18 15,12 9,6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    "chevron-left": (
      <Polyline
        points="15,18 9,12 15,6"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    "alert-triangle": (
      <>
        <Path
          d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="12"
          y1="9"
          x2="12"
          y2="13"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="12"
          y1="17"
          x2="12.01"
          y2="17"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "x-circle": (
      <>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Line
          x1="15"
          y1="9"
          x2="9"
          y2="15"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="9"
          y1="9"
          x2="15"
          y2="15"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "check-circle": (
      <>
        <Path
          d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="22,4 12,14.01 9,11.01"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    bell: (
      <>
        <Path
          d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M13.73 21a2 2 0 0 1-3.46 0"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    "help-circle": (
      <>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Path
          d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="12"
          y1="17"
          x2="12.01"
          y2="17"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    info: (
      <>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Line
          x1="12"
          y1="16"
          x2="12"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="12"
          y1="8"
          x2="12.01"
          y2="8"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "log-out": (
      <>
        <Path
          d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="16,17 21,12 16,7"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="21"
          y1="12"
          x2="9"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "log-in": (
      <>
        <Path
          d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="10,17 15,12 10,7"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="15"
          y1="12"
          x2="3"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    plus: (
      <>
        <Line
          x1="12"
          y1="5"
          x2="12"
          y2="19"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="5"
          y1="12"
          x2="19"
          y2="12"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    share: (
      <>
        <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Line
          x1="8.59"
          y1="13.51"
          x2="15.42"
          y2="17.49"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="15.41"
          y1="6.51"
          x2="8.59"
          y2="10.49"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    settings: (
      <>
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Path
          d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    search: (
      <>
        <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Line
          x1="21"
          y1="21"
          x2="16.65"
          y2="16.65"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    edit: (
      <>
        <Path
          d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    trash: (
      <>
        <Polyline
          points="3,6 5,6 21,6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    copy: (
      <>
        <Rect
          x="9"
          y="9"
          width="13"
          height="13"
          rx="2"
          ry="2"
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Path
          d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    link: (
      <>
        <Path
          d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    "external-link": (
      <>
        <Path
          d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="15,3 21,3 21,9"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="10"
          y1="14"
          x2="21"
          y2="3"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    mail: (
      <>
        <Path
          d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="22,6 12,13 2,6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    clock: (
      <>
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Polyline
          points="12,6 12,12 16,14"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    moon: (
      <Path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    lock: (
      <>
        <Rect
          x="3"
          y="11"
          width="18"
          height="11"
          rx="2"
          ry="2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M7 11V7a5 5 0 0 1 10 0v4"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    refresh: (
      <>
        <Polyline
          points="23,4 23,10 17,10"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Polyline
          points="1,20 1,14 7,14"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    ),
    "qr-code": (
      <>
        <Rect x="3" y="3" width="7" height="7" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="14" y="3" width="7" height="7" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="3" y="14" width="7" height="7" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="14" y="14" width="3" height="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="18" y="14" width="3" height="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="14" y="18" width="3" height="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Rect x="18" y="18" width="3" height="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </>
    ),
    "share-2": (
      <>
        <Circle cx="18" cy="5" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="6" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="18" cy="19" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Line
          x1="8.59"
          y1="13.51"
          x2="15.42"
          y2="17.49"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <Line
          x1="15.41"
          y1="6.51"
          x2="8.59"
          y2="10.49"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      </>
    ),
    "trash-2": (
      <>
        <Polyline
          points="3,6 5,6 21,6"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line x1="10" y1="11" x2="10" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        <Line x1="14" y1="11" x2="14" y2="17" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
      </>
    ),
    "chevron-down": (
      <Polyline
        points="6 9 12 15 18 9"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    ),
    image: (
      <>
        <Rect x="3" y="3" width="18" height="18" rx="2" ry="2" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Circle cx="8.5" cy="8.5" r="1.5" stroke={color} strokeWidth={strokeWidth} fill="none" />
        <Polyline points="21 15 16 10 5 21" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </>
    ),
    eye: (
      <>
        <Path
          d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Circle cx="12" cy="12" r="3" stroke={color} strokeWidth={strokeWidth} fill="none" />
      </>
    ),
    "eye-off": (
      <>
        <Path
          d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        <Line
          x1="1"
          y1="1"
          x2="23"
          y2="23"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    ),
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={style}>
      {icons[name]}
    </Svg>
  );
});

export const TabIcon = memo(function TabIcon({
  name,
  color,
  size,
}: {
  name: IconName;
  color: string;
  size: number;
}) {
  return <Icon name={name} size={size} color={color} />;
});
