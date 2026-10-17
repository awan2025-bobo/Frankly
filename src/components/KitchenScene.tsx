// Flat clipart kitchen used as a card background ("What Frankly remembers" on Profile).
// Low-contrast olive tones with a fade on the left so cream text on top stays readable.
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Line, Path, Rect, Stop } from 'react-native-svg';

export function KitchenScene() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 340 220" preserveAspectRatio="xMidYMid slice">
      <Defs>
        <LinearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#3C4529" stopOpacity={0.92} />
          <Stop offset="0.55" stopColor="#3C4529" stopOpacity={0.62} />
          <Stop offset="1" stopColor="#3C4529" stopOpacity={0.25} />
        </LinearGradient>
      </Defs>

      {/* wall + tiles */}
      <Rect width={340} height={220} fill="#4B5538" />
      {[40, 70, 100, 130].map((y) => (
        <Line key={y} x1={0} y1={y} x2={340} y2={y} stroke="#55603F" strokeWidth={1.2} />
      ))}

      <G opacity={0.5}>
        {/* window */}
        <Rect x={236} y={14} width={78} height={58} rx={6} fill="#6E7A4D" />
        <Rect x={242} y={20} width={66} height={46} rx={3} fill="#8E9A68" />
        <Line x1={275} y1={20} x2={275} y2={66} stroke="#6E7A4D" strokeWidth={3} />
        <Line x1={242} y1={43} x2={308} y2={43} stroke="#6E7A4D" strokeWidth={3} />
        <Circle cx={292} cy={31} r={6} fill="#E9B98A" opacity={0.7} />

        {/* shelf with jars and a plant */}
        <Rect x={196} y={96} width={136} height={5} rx={2} fill="#343C24" />
        <Rect x={204} y={74} width={16} height={22} rx={3} fill="#D8CBA8" opacity={0.75} />
        <Rect x={204} y={70} width={16} height={5} rx={2} fill="#D98C55" />
        <Rect x={226} y={66} width={18} height={30} rx={4} fill="#D8CBA8" opacity={0.6} />
        <Rect x={226} y={62} width={18} height={5} rx={2} fill="#B4693D" />
        <Rect x={251} y={70} width={9} height={26} rx={3} fill="#8E9A68" />
        <Path d="M296 96h22l-3-16h-16z" fill="#C98557" />
        <Path d="M307 80c-8-6-10-14-6-20 6 3 8 11 6 20zM307 80c6-8 14-10 19-6-4 6-11 8-19 6z" fill="#8FA160" />

        {/* hanging utensils */}
        <Line x1={150} y1={22} x2={214} y2={22} stroke="#343C24" strokeWidth={3} strokeLinecap="round" />
        <Line x1={162} y1={22} x2={162} y2={58} stroke="#A9A27F" strokeWidth={3} strokeLinecap="round" />
        <Ellipse cx={162} cy={64} rx={8} ry={6} fill="#A9A27F" />
        <Line x1={182} y1={22} x2={182} y2={52} stroke="#A9A27F" strokeWidth={3} strokeLinecap="round" />
        <Rect x={175} y={52} width={14} height={16} rx={3} fill="#A9A27F" />
        <Line x1={202} y1={22} x2={202} y2={48} stroke="#A9A27F" strokeWidth={3} strokeLinecap="round" />
        <Path d="M197 48h10l-1 14h-8z" fill="#A9A27F" />

        {/* counter */}
        <Rect x={0} y={160} width={340} height={9} fill="#8A8463" />
        <Rect x={0} y={169} width={340} height={51} fill="#343C24" />
        <Rect x={40} y={182} width={70} height={30} rx={4} fill="#3F4830" />
        <Rect x={130} y={182} width={70} height={30} rx={4} fill="#3F4830" />

        {/* cutting board with a tomato */}
        <Rect x={118} y={147} width={74} height={13} rx={6} fill="#D98C55" />
        <Path d="M146 147a12 12 0 0 1 24 0z" fill="#DE6644" />
        <Path d="M176 147a8 8 0 0 1 16 0z" fill="#EE8E68" />

        {/* pot with steam */}
        <Rect x={238} y={118} width={64} height={42} rx={8} fill="#C9C1A8" />
        <Rect x={232} y={114} width={76} height={8} rx={4} fill="#DDD6BF" />
        <Rect x={228} y={128} width={10} height={6} rx={3} fill="#C9C1A8" />
        <Rect x={302} y={128} width={10} height={6} rx={3} fill="#C9C1A8" />
        <Path d="M254 106c-6-8 6-12 0-22M270 104c-6-8 6-12 0-22M286 106c-6-8 6-12 0-22" stroke="#EEE8DC" strokeWidth={3} strokeLinecap="round" fill="none" opacity={0.45} />
      </G>

      {/* readability fade */}
      <Rect width={340} height={220} fill="url(#fade)" />
    </Svg>
  );
}
