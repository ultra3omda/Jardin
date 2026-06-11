import { View } from 'react-native';

interface ZelligePatternProps {
  /** Stroke color of the lattice (use a light color over dark heroes). */
  color?: string;
  /** Overall opacity of the motif. */
  opacity?: number;
  /** Tile size in px. */
  size?: number;
  /** Grid dimensions — keep generous to cover wide heroes. */
  rows?: number;
  cols?: number;
}

/**
 * Médina — a subtle zellige-inspired geometric lattice (a grid of rotated
 * squares with a centre dot), rendered with plain Views so it needs no SVG
 * dependency. Drop it as an absolutely-positioned overlay inside a coloured
 * hero block for warm cultural texture.
 */
export function ZelligePattern({
  color = '#ffffff',
  opacity = 0.07,
  size = 30,
  rows = 7,
  cols = 10,
}: ZelligePatternProps) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -size / 2,
        left: -size / 2,
        right: -size / 2,
        bottom: -size / 2,
        opacity,
      }}
    >
      {Array.from({ length: rows }).map((_, r) => (
        <View key={r} style={{ flexDirection: 'row' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <View
              key={c}
              style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
            >
              <View
                style={{
                  width: size * 0.52,
                  height: size * 0.52,
                  borderWidth: 1.5,
                  borderColor: color,
                  transform: [{ rotate: '45deg' }],
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  width: 3,
                  height: 3,
                  borderRadius: 1.5,
                  backgroundColor: color,
                }}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}
