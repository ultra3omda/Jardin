import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { colors, radius } from '@klasso/ui-mobile';

interface CardSkeletonProps {
  /** Overall card height in logical pixels (default: 80) */
  height?: number;
}

/**
 * Animated skeleton card for use as a loading placeholder in lists.
 * Uses Animated.loop + Animated.timing for a smooth opacity pulse.
 *
 * @example
 * {isLoading && (
 *   <View style={{ gap: 8 }}>
 *     <CardSkeleton />
 *     <CardSkeleton />
 *     <CardSkeleton />
 *   </View>
 * )}
 */
export function CardSkeleton({ height = 80 }: CardSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{
        opacity,
        height,
        backgroundColor: colors.white,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.paper[100],
        padding: 14,
        justifyContent: 'space-between',
      }}
      accessibilityLabel="Chargement"
      accessibilityRole="progressbar"
    >
      {/* Top bar — wide (title) */}
      <View
        style={{ height: 13, width: '60%', backgroundColor: colors.paper[100], borderRadius: 4 }}
      />
      {/* Middle bar — medium (subtitle) */}
      <View
        style={{ height: 11, width: '40%', backgroundColor: colors.paper[100], borderRadius: 4 }}
      />
      {/* Bottom bar — wide (content preview) */}
      <View
        style={{ height: 11, width: '80%', backgroundColor: colors.paper[100], borderRadius: 4 }}
      />
    </Animated.View>
  );
}
