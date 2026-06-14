import { useEffect, useRef } from 'react';
import { Animated, type DimensionValue, type ViewStyle } from 'react-native';
import { colors } from '../tokens/colors';

interface SkeletonProps {
  /** Width — number (dp) or percentage string. Defaults to full width. */
  width?: DimensionValue;
  /** Height in dp. */
  height?: number;
  /** Corner radius in dp. */
  radius?: number;
  style?: ViewStyle;
}

/**
 * Base loading placeholder — a softly pulsing bar. Mirrors the web `Skeleton`
 * primitive so list/card loading states look the same across platforms.
 * Hidden from screen readers; wrap a group in a `View` with
 * `accessibilityRole="progressbar"` if you need an announcement.
 */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.line,
        opacity,
        ...style,
      }}
    />
  );
}
