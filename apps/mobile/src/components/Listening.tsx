import LottieView from "lottie-react-native";
import { View } from "react-native";

/**
 * The pulsing voice indicator shown while recording/listening. Swap
 * assets/lottie/listening.json for any LottieFiles animation you prefer —
 * this component just plays whatever JSON is there.
 */
export function Listening({ size = 120, playing }: { size?: number; playing: boolean }) {
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
