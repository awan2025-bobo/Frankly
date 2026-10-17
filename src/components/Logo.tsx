// Frankly's logo: a tiny cabbage with a small round smiley face.
import Svg, { Circle, Path } from 'react-native-svg';

import { C } from '@/lib/theme';

export function Logo({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" accessibilityLabel="Frankly">
      {/* outer leaves */}
      <Path d="M24 40C12 40 5 32 7 21c1.5 5 6 8.5 10 9.5" fill={C.good} />
      <Path d="M24 40c12 0 19-8 17-19-1.5 5-6 8.5-10 9.5" fill={C.good} />
      {/* head */}
      <Circle cx={24} cy={25} r={14} fill="#BFD79A" stroke={C.primary} strokeWidth={2.2} />
      {/* leaf curl on top */}
      <Path d="M17 15.5c3 3 11 3 14 0" fill="none" stroke={C.primary} strokeWidth={2} strokeLinecap="round" />
      {/* face */}
      <Circle cx={19.5} cy={25} r={1.8} fill={C.ink} />
      <Circle cx={28.5} cy={25} r={1.8} fill={C.ink} />
      <Path d="M20 29.5c2.2 2.6 5.8 2.6 8 0" fill="none" stroke={C.ink} strokeWidth={1.9} strokeLinecap="round" />
      <Circle cx={16.5} cy={28.8} r={1.6} fill={C.bad} opacity={0.45} />
      <Circle cx={31.5} cy={28.8} r={1.6} fill={C.bad} opacity={0.45} />
    </Svg>
  );
}
