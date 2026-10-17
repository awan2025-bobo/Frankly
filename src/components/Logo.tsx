// Frankly's logo: one-color cabbage whose leaves sweep up into a flame tip, with a small smiley.
// Drawn in a single color; leaf lines and the face are cut out in the background color.
import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/lib/theme';

export function Logo({ size = 36, color = C.primary, cutout = C.bg }: { size?: number; color?: string; cutout?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Frankly">
      {/* flame-shaped cabbage head: round base, leaves rising to a tip that curls right */}
      <Path
        d="M24 45C13.5 45 7.5 38 8 29.5c.4-6.2 4-10.2 7.6-13.6.3 3 1.6 5.2 3.6 6.4-.6-6.6 2.2-12.6 7.6-17.8.2 4.6 2.2 7.8 5.2 10.6 4.6 4.3 8.2 8.6 8 15.2C39.7 38.6 34 45 24 45z"
        fill={color}
      />
      {/* leaf layers */}
      <Path d="M16.5 42c-3.6-3.4-4.8-8.4-3.6-13.6" fill="none" stroke={cutout} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M31.5 42c3.6-3.4 4.8-8.4 3.6-13.6" fill="none" stroke={cutout} strokeWidth={1.7} strokeLinecap="round" />
      <Path d="M24 21.5c-2.2-3.6-1.8-7.6.8-11.6" fill="none" stroke={cutout} strokeWidth={1.5} strokeLinecap="round" />
      {/* small round smiley */}
      <Circle cx={20.6} cy={31.2} r={1.55} fill={cutout} />
      <Circle cx={27.4} cy={31.2} r={1.55} fill={cutout} />
      <Path d="M21.2 35.2c1.7 1.8 3.9 1.8 5.6 0" fill="none" stroke={cutout} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}
