// Frankly's logo: one-color cabbage made of layered leaves. The two outer leaves cup the base,
// and the center leaf rises into a flame tip that flicks to one side. Small smiley on the center leaf.
// Single color; the seams between leaves and the face are cut out in the background color.
import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/lib/theme';

export function Logo({ size = 36, color = C.primary, cutout = C.bg }: { size?: number; color?: string; cutout?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Frankly">
      {/* outer leaves, cupping the base */}
      <Path d="M24 45C13 45 5.5 38.5 6 29c.3-5.5 3.2-9.6 7.4-12.2-1.4 6.4-.4 13.4 4.6 19.4L24 45z" fill={color} />
      <Path d="M24 45c11 0 18.5-6.5 18-16-.3-5.5-3.2-9.6-7.4-12.2 1.4 6.4.4 13.4-4.6 19.4L24 45z" fill={color} />
      {/* center leaf rising into a flame tip */}
      <Path
        d="M24 42.5c-6.6-2.4-10.2-8.2-9.8-15 .4-6.8 4.6-10.6 7.4-15.4 1.2-2.1 1.8-4.6 1.6-7.6 3.4 2.4 5.6 5.8 6 9.6 2.6 3 4.6 6.8 4.6 12.8 0 7-3.4 13.2-9.8 15.6z"
        fill={color}
        stroke={cutout}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      {/* leaf veins on the outer leaves */}
      <Path d="M10.2 30.5c1.6 4.6 4.8 8 9.4 10.2" fill="none" stroke={cutout} strokeWidth={1.4} strokeLinecap="round" />
      <Path d="M37.8 30.5c-1.6 4.6-4.8 8-9.4 10.2" fill="none" stroke={cutout} strokeWidth={1.4} strokeLinecap="round" />
      {/* small round smiley */}
      <Circle cx={21.4} cy={28.6} r={1.45} fill={cutout} />
      <Circle cx={26.6} cy={28.6} r={1.45} fill={cutout} />
      <Path d="M21.6 32.2c1.4 1.6 3.4 1.6 4.8 0" fill="none" stroke={cutout} strokeWidth={1.5} strokeLinecap="round" />
    </Svg>
  );
}
