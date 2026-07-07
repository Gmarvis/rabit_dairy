import { View } from "react-native";
import { useTheme } from "../theme/ThemeProvider";

// Lottie is a native module — present only in a dev build. Load defensively so
// a stale binary / Expo Go falls back to a simple dot instead of crashing.
const LottieView = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("lottie-react-native").default as typeof import("lottie-react-native").default;
  } catch {
    return null;
  }
})();

// Metro needs static require paths, so load both theme variants up front.
const voiceWaveDark = require("../../assets/lottie/voiceWave.json");
const voiceWaveLight = require("../../assets/lottie/voiceWaveLight.json");

/**
 * Animated voice indicator shown while listening — a LottieFiles waveform that
 * follows the active theme. Falls back to a static gold dot when the native
 * lottie module isn't available (Expo Go / a stale binary).
 */
export function Listening({ size = 120, playing }: { size?: number; playing: boolean }) {
  const c = useTheme();
  if (!LottieView) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: c.goldSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: c.gold }} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <LottieView
        autoPlay
        loop
        speed={playing ? 1 : 0}
        source={c.mode === "light" ? voiceWaveLight : voiceWaveDark}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
