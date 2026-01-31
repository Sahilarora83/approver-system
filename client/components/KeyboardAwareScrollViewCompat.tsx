import React from "react";
import { Platform, ScrollView, ScrollViewProps } from "react-native";

type Props = ScrollViewProps & {
  children?: React.ReactNode;
  bottomOffset?: number;
};

export function KeyboardAwareScrollViewCompat({
  children,
  keyboardShouldPersistTaps = "handled",
  ...props
}: Props) {
  if (Platform.OS === "web") {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }

  try {
    const { KeyboardAwareScrollView } = require("react-native-keyboard-controller");
    return (
      <KeyboardAwareScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </KeyboardAwareScrollView>
    );
  } catch {
    return (
      <ScrollView
        keyboardShouldPersistTaps={keyboardShouldPersistTaps}
        {...props}
      >
        {children}
      </ScrollView>
    );
  }
}
