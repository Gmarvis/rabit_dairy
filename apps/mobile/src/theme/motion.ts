/**
 * Motion tokens — one cohesive vocabulary for every animation in the app.
 *
 * The built-in RN easings are too gentle; a single strong ease-out curve
 * (matching the design-engineering house style) gives entrances/exits their
 * "punch". Springs are for anything gestural or that should feel alive.
 * Durations stay under ~300ms for UI so the interface always feels responsive.
 */
import { Easing } from "react-native";

/** Shared easing curves. `out` is the workhorse for enter/exit. */
export const easing = {
  /** Strong ease-out — the default for elements entering or exiting. */
  out: Easing.bezier(0.23, 1, 0.32, 1),
  /** Strong ease-in-out — for things moving/morphing on screen. */
  inOut: Easing.bezier(0.77, 0, 0.175, 1),
  /** iOS drawer curve. */
  drawer: Easing.bezier(0.32, 0.72, 0, 1),
} as const;

/** Durations (ms). UI stays under 300; celebrations/ambient may be longer. */
export const duration = {
  press: 120,
  chip: 160,
  control: 220,
  enter: 300,
  celebrate: 1200,
} as const;

/** Snappy press spring — instant feedback, no bounce. */
export const springPress = { useNativeDriver: true as const, speed: 40, bounciness: 0 };

/** Settling spring for a moving highlight/pill — natural, no overshoot. */
export const springSlide = { useNativeDriver: true as const, damping: 22, stiffness: 240, mass: 1 };
