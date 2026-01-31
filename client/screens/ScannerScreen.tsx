import React, { useState, useEffect, useCallback, memo } from "react";
import { StyleSheet, View, Pressable, ActivityIndicator, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useMutation } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
} from "react-native-reanimated";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { apiRequest, queryClient } from "@/lib/query-client";
import { Spacing, BorderRadius, Shadows } from "@/constants/theme";

type ScannedResult = {
  registration: {
    id: string;
    name: string;
    email: string;
    status: "pending" | "approved" | "rejected" | "checked_in" | "checked_out";
    event: {
      title: string;
    };
  };
  alreadyCheckedIn: boolean;
};

const ScanLine = memo(function ScanLine({ color }: { color: string }) {
  const scanLinePosition = useSharedValue(0);

  useEffect(() => {
    scanLinePosition.value = withRepeat(
      withSequence(withSpring(1, { duration: 2000 }), withSpring(0, { duration: 2000 })),
      -1,
      true
    );
  }, [scanLinePosition]);

  const scanLineStyle = useAnimatedStyle(() => ({
    top: `${scanLinePosition.value * 100}%`,
  }));

  return <Animated.View style={[styles.scanLine, { backgroundColor: color }, scanLineStyle]} />;
});

export default function ScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [result, setResult] = useState<ScannedResult | null>(null);
  const [error, setError] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (qrCode: string) => {
      const response = await apiRequest("POST", "/api/verify", { qrCode });
      return response.json();
    },
    onSuccess: (data: ScannedResult) => {
      setResult(data);
      if (data.alreadyCheckedIn) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (err: any) => {
      setError(err.message || "Invalid QR code");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: async ({ registrationId, type }: { registrationId: string; type: string }) => {
      const response = await apiRequest("POST", "/api/check-in", { registrationId, type });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetScanner();
    },
    onError: (err: any) => {
      setError(err.message || "Check-in failed");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    },
  });

  const handleBarCodeScanned = useCallback(({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);
    setError("");
    verifyMutation.mutate(data);
  }, [scanned, verifyMutation]);

  const resetScanner = useCallback(() => {
    setScanned(false);
    setResult(null);
    setError("");
  }, []);

  const handleCheckIn = useCallback(() => {
    if (result?.registration) {
      checkInMutation.mutate({
        registrationId: result.registration.id,
        type: "check_in",
      });
    }
  }, [result, checkInMutation]);

  const handleCheckOut = useCallback(() => {
    if (result?.registration) {
      checkInMutation.mutate({
        registrationId: result.registration.id,
        type: "check_out",
      });
    }
  }, [result, checkInMutation]);

  if (!permission) {
    return (
      <ThemedView style={styles.container}>
        <ActivityIndicator size="large" color={theme.primary} />
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.permissionContainer}>
          <View style={[styles.iconCircle, { backgroundColor: `${theme.primary}15` }]}>
            <Feather name="camera" size={48} color={theme.primary} />
          </View>
          <ThemedText type="h2" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText type="body" style={styles.permissionText}>
            To scan QR codes and verify tickets, please allow camera access.
          </ThemedText>
          {Platform.OS !== "web" ? (
            <Button onPress={requestPermission} style={styles.permissionButton}>
              Enable Camera
            </Button>
          ) : (
            <ThemedText type="small" style={styles.webNote}>
              Camera scanning is best experienced on a mobile device via Expo Go.
            </ThemedText>
          )}
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />

      <View style={styles.overlay}>
        <View style={[styles.overlayTop, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
        <View style={styles.overlayMiddle}>
          <View style={[styles.overlaySide, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
          <View style={styles.scanArea}>
            <View style={[styles.corner, styles.cornerTL, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.cornerTR, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.cornerBL, { borderColor: theme.primary }]} />
            <View style={[styles.corner, styles.cornerBR, { borderColor: theme.primary }]} />
            <ScanLine color={theme.primary} />
          </View>
          <View style={[styles.overlaySide, { backgroundColor: "rgba(0,0,0,0.6)" }]} />
        </View>
        <View style={[styles.overlayBottom, { backgroundColor: "rgba(0,0,0,0.6)" }]}>
          <ThemedText type="body" style={styles.instructions}>
            Position the QR code within the frame
          </ThemedText>
        </View>
      </View>

      {verifyMutation.isPending || checkInMutation.isPending ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : null}

      {result ? (
        <View style={[styles.resultSheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.resultHeader}>
            <ThemedText type="h3">Ticket Found</ThemedText>
            <Pressable onPress={resetScanner} style={styles.closeButton}>
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <View style={styles.resultContent}>
            <View style={styles.resultRow}>
              <ThemedText type="small" style={styles.resultLabel}>
                Name
              </ThemedText>
              <ThemedText type="body" style={styles.resultValue}>
                {result.registration.name}
              </ThemedText>
            </View>
            <View style={styles.resultRow}>
              <ThemedText type="small" style={styles.resultLabel}>
                Email
              </ThemedText>
              <ThemedText type="body" style={styles.resultValue}>
                {result.registration.email}
              </ThemedText>
            </View>
            <View style={styles.resultRow}>
              <ThemedText type="small" style={styles.resultLabel}>
                Event
              </ThemedText>
              <ThemedText type="body" style={styles.resultValue}>
                {result.registration.event?.title || "Event"}
              </ThemedText>
            </View>
            <View style={styles.resultRow}>
              <ThemedText type="small" style={styles.resultLabel}>
                Status
              </ThemedText>
              <StatusBadge status={result.registration.status} size="medium" />
            </View>
          </View>

          {result.alreadyCheckedIn ? (
            <View style={[styles.warningBanner, { backgroundColor: `${theme.warning}15` }]}>
              <Feather name="alert-triangle" size={20} color={theme.warning} />
              <ThemedText type="body" style={{ color: theme.warning }}>
                Already checked in
              </ThemedText>
            </View>
          ) : null}

          <View style={styles.actions}>
            {result.registration.status !== "checked_in" ? (
              <Button onPress={handleCheckIn} style={[styles.actionButton, { backgroundColor: theme.success }]}>
                Check In
              </Button>
            ) : (
              <Button onPress={handleCheckOut} style={[styles.actionButton, { backgroundColor: theme.textSecondary }]}>
                Check Out
              </Button>
            )}
            <Pressable
              onPress={resetScanner}
              style={[styles.secondaryButton, { borderColor: theme.border }]}
            >
              <ThemedText type="body">Scan Another</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.errorSheet, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.errorIcon, { backgroundColor: `${theme.error}15` }]}>
            <Feather name="x-circle" size={32} color={theme.error} />
          </View>
          <ThemedText type="h4" style={[styles.errorTitle, { color: theme.error }]}>
            Invalid Ticket
          </ThemedText>
          <ThemedText type="body" style={styles.errorText}>
            {error}
          </ThemedText>
          <Button onPress={resetScanner} style={styles.retryButton}>
            Try Again
          </Button>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing["2xl"],
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing["2xl"],
  },
  permissionTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionText: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing["2xl"],
  },
  permissionButton: {
    minWidth: 200,
  },
  webNote: {
    textAlign: "center",
    opacity: 0.5,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
  },
  overlayMiddle: {
    flexDirection: "row",
    height: 280,
  },
  overlaySide: {
    flex: 1,
  },
  overlayBottom: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing["2xl"],
  },
  scanArea: {
    width: 280,
    height: 280,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderWidth: 4,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: BorderRadius.sm,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: BorderRadius.sm,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: BorderRadius.sm,
  },
  scanLine: {
    position: "absolute",
    left: 10,
    right: 10,
    height: 3,
    borderRadius: 2,
  },
  instructions: {
    color: "#fff",
    textAlign: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  resultSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    paddingBottom: Spacing["4xl"],
    ...Shadows.lg,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing["2xl"],
  },
  closeButton: {
    padding: Spacing.sm,
  },
  resultContent: {
    gap: Spacing.lg,
  },
  resultRow: {
    gap: Spacing.xs,
  },
  resultLabel: {
    opacity: 0.6,
  },
  resultValue: {
    fontWeight: "500",
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing["2xl"],
  },
  actions: {
    marginTop: Spacing["2xl"],
    gap: Spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  secondaryButton: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
  },
  errorSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing["2xl"],
    paddingBottom: Spacing["4xl"],
    alignItems: "center",
    ...Shadows.lg,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  errorTitle: {
    marginBottom: Spacing.sm,
  },
  errorText: {
    opacity: 0.7,
    textAlign: "center",
    marginBottom: Spacing["2xl"],
  },
  retryButton: {
    minWidth: 200,
  },
});
