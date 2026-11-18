import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

export const AnimatedSection = ({
  children,
  delay = 0,
  style,
}: AnimatedSectionProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 260,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        delay,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]);
    animation.start();
    return () => animation.stop();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};
