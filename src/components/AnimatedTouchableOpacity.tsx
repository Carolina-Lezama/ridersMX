import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  TouchableOpacity as NativeTouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

const AnimatedNativeTouchable = Animated.createAnimatedComponent(NativeTouchableOpacity);

interface AnimatedTouchableOpacityProps extends TouchableOpacityProps {
  pressScale?: number;
}

export const AnimatedTouchableOpacity = ({
  onPressIn,
  onPressOut,
  pressScale = 0.96,
  style,
  ...props
}: AnimatedTouchableOpacityProps) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => () => scale.stopAnimation(), [scale]);

  const animateTo = (value: number) => {
    scale.stopAnimation();
    Animated.spring(scale, {
      toValue: value,
      useNativeDriver: Platform.OS !== 'web',
      speed: 28,
      bounciness: 4,
    }).start();
  };

  return (
    <AnimatedNativeTouchable
      {...props}
      style={[style, { transform: [{ scale }] }]}
      onPressIn={(event) => {
        onPressIn?.(event);
        animateTo(pressScale);
      }}
      onPressOut={(event) => {
        onPressOut?.(event);
        animateTo(1);
      }}
    />
  );
};
