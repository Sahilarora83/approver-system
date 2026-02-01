import React, { memo } from "react";
import { Feather } from "@expo/vector-icons";

type TabIconProps = {
  name: keyof typeof Feather.glyphMap;
  color: string;
  size: number;
};

export const TabIcon = memo(function TabIcon({ name, color, size }: TabIconProps) {
  return <Feather name={name} size={size} color={color} />;
});
