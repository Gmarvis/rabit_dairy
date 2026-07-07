import { View } from "react-native";
import { colors } from "../theme/tokens";

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

/**
 * Pulsing voice indicator shown while listening. Swap
 * assets/lottie/listening.json for any LottieFiles animation you prefer.
 * Falls back to a static gold dot when the native module isn't available.
 */
export function Listening({ size = 120, playing }: { size?: number; playing: boolean }) {
  if (!LottieView) {
    return (
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: "rgba(233,180,76,0.18)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View style={{ width: size * 0.4, height: size * 0.4, borderRadius: size * 0.2, backgroundColor: colors.gold }} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size }}>
      <LottieView
        autoPlay
        loop
        speed={playing ? 1 : 0}
        source={require("../../assets/lottie/listening.json")}
        style={{ width: size, height: size }}
      />
    </View>
  );
}
