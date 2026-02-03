import React from "react";
import { StyleSheet, TextInput, View, TextInputProps } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, Typography } from "@/constants/theme";

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
}

import { Icon } from "@/components/Icon";
import { Pressable } from "react-native";

export function Input({ label, error, style, onFocus, onBlur, secureTextEntry, ...props }: InputProps) {
  const { theme } = useTheme();
  const [isFocused, setIsFocused] = React.useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);

  // If secureTextEntry is passed, we rely on our local visible state
  const isSecure = secureTextEntry && !isPasswordVisible;

  return (
    <View style={styles.container}>
      {label ? (
        <ThemedText type="small" style={styles.label}>
          {label}
        </ThemedText>
      ) : null}

      <View style={styles.inputContainer}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: error
                ? theme.error
                : isFocused
                  ? theme.primary
                  : theme.border,
              borderWidth: isFocused ? 1.5 : 1,
              color: theme.text,
              shadowColor: isFocused ? theme.primary : 'transparent',
              shadowOpacity: isFocused ? 0.1 : 0,
              shadowRadius: 4,
              elevation: isFocused ? 2 : 0,
              paddingRight: secureTextEntry ? 48 : Spacing.lg, // Make room for icon
            },
            style,
          ]}
          placeholderTextColor={theme.textSecondary}
          onFocus={(e) => {
            setIsFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            onBlur?.(e);
          }}
          secureTextEntry={isSecure}
          {...props}
        />

        {secureTextEntry && (
          <Pressable
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
            hitSlop={8}
          >
            <Icon
              name={isPasswordVisible ? "eye-off" : "eye"}
              size={20}
              color={theme.textSecondary}
            />
          </Pressable>
        )}
      </View>

      {error ? (
        <ThemedText type="small" style={[styles.error, { color: theme.error }]}>
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  input: {
    height: Spacing.inputHeight,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.body.fontSize,
  },
  inputContainer: {
    position: 'relative',
    width: '100%',
  },
  eyeIcon: {
    position: 'absolute',
    right: Spacing.sm,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    zIndex: 1,
  },
  error: {
    marginTop: Spacing.xs,
  },
});
