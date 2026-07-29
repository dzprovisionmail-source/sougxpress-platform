import { Animated, Easing } from 'react-native';

export const MOTION = {
  /** Standard micro-animation durations */
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },

  /** Spring presets for button and card press feedback */
  spring: {
    bouncy: {
      tension: 180,
      friction: 12,
      useNativeDriver: true,
    },
    gentle: {
      tension: 120,
      friction: 14,
      useNativeDriver: true,
    },
    stiff: {
      tension: 220,
      friction: 18,
      useNativeDriver: true,
    },
  },

  /** Scale factor for active touch press */
  pressScale: 0.96,

  /** Easing functions */
  easing: {
    easeInOut: Easing.bezier(0.4, 0.0, 0.2, 1),
    easeOut: Easing.out(Easing.quad),
    easeIn: Easing.in(Easing.quad),
  },
};

export const animatePress = (scaleAnim: Animated.Value, toValue: number = MOTION.pressScale) => {
  Animated.spring(scaleAnim, {
    toValue,
    ...MOTION.spring.stiff,
  }).start();
};

export const animateRelease = (scaleAnim: Animated.Value) => {
  Animated.spring(scaleAnim, {
    toValue: 1,
    ...MOTION.spring.bouncy,
  }).start();
};
