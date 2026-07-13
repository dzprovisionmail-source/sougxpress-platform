
import { Animated } from 'react-native';

export const animations = {
  fade: (value: Animated.Value) => Animated.timing(value, {
    toValue: 1,
    duration: 300,
    useNativeDriver: true,
  }),
  slideIn: (value: Animated.Value, direction: 'left' | 'right' | 'up' | 'down') => {
    let fromValue;
    if (direction === 'left') fromValue = -100;
    else if (direction === 'right') fromValue = 100;
    else if (direction === 'up') fromValue = -100;
    else fromValue = 100;

    return Animated.spring(value, {
      toValue: 0,
      useNativeDriver: true,
      speed: 10,
      bounciness: 10,
    });
  },
  scale: (value: Animated.Value) => Animated.spring(value, {
    toValue: 1,
    friction: 3,
    useNativeDriver: true,
  }),
  press: (value: Animated.Value) => Animated.spring(value, {
    toValue: 0.95,
    useNativeDriver: true,
  }),
  // Add more animation types as needed
};
