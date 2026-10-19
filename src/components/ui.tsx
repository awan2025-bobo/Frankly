// Frankly's small design system. Screens compose these instead of styling from scratch.
import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable } from './Pressable';
import { C, F, R, shadow } from '@/lib/theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({
  children,
  scroll = true,
  style,
  footer,
}: {
  children: ReactNode;
  scroll?: boolean;
  style?: StyleProp<ViewStyle>;
  footer?: ReactNode; // pinned to the bottom of the screen while the page scrolls (e.g. "Let's go")
}) {
  return (
    <SafeAreaView style={s.screen} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={[s.scroll, style, footer ? { paddingBottom: 140 } : null]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[s.scroll, { flex: 1 }, style]}>{children}</View>
      )}
      {footer ? (
        <View pointerEvents="box-none" style={s.footer}>
          <View style={s.footerInner}>{footer}</View>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

type TextProps = { children: ReactNode; style?: StyleProp<TextStyle>; numberOfLines?: number };

export const H1 = ({ children, style }: TextProps) => <Text style={[s.h1, style]}>{children}</Text>;
export const H2 = ({ children, style }: TextProps) => <Text style={[s.h2, style]}>{children}</Text>;
export const H3 = ({ children, style }: TextProps) => <Text style={[s.h3, style]}>{children}</Text>;
export const Body = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[s.body, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Muted = ({ children, style, numberOfLines }: TextProps) => (
  <Text style={[s.muted, style]} numberOfLines={numberOfLines}>
    {children}
  </Text>
);
export const Label = ({ children, style }: TextProps) => <Text style={[s.label, style]}>{children}</Text>;

export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = kind === 'primary' ? C.onPrimary : kind === 'danger' ? C.bad : C.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        kind === 'primary' && s.btnPrimary,
        kind === 'secondary' && s.btnSecondary,
        kind === 'danger' && s.btnSecondary,
        kind === 'ghost' && s.btnGhost,
        (disabled || loading) && { opacity: 0.45 },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          {/* Long labels ("Show me the Sunflower Seed Butter & Jelly Sandwich") shrink a little and wrap. */}
          <Text style={[s.btnText, title.length > 26 && s.btnTextLong, { color: fg }]} numberOfLines={3}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && s.chipOn]}>
      {selected && <Ionicons name="checkmark" size={14} color={C.onPrimary} />}
      <Text style={[s.chipText, selected && { color: C.onPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function ChipGrid({
  options,
  selected,
  onChange,
  single,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  single?: boolean;
}) {
  return (
    <View style={s.chipGrid}>
      {options.map((o) => (
        <Chip
          key={o}
          label={o}
          selected={selected.includes(o)}
          onPress={() =>
            onChange(single ? [o] : selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o])
          }
        />
      ))}
    </View>
  );
}

export function Pill({ text, tone = 'neutral', icon }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad'; icon?: IconName }) {
  const bg = { neutral: C.cardAlt, good: C.goodSoft, warn: C.warnSoft, bad: C.badSoft }[tone];
  const fg = { neutral: C.muted, good: C.good, warn: C.warn, bad: C.bad }[tone];
  return (
    <View style={[s.pill, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[s.pillText, { color: fg }]}>{text}</Text>
    </View>
  );
}

export function Field({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  prefix,
  autoFocus,
  onSubmitEditing,
  style,
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'number-pad' | 'decimal-pad';
  prefix?: string;
  autoFocus?: boolean;
  onSubmitEditing?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[s.field, style]}>
      {prefix && <Text style={s.fieldPrefix}>{prefix}</Text>}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        keyboardType={keyboardType}
        autoFocus={autoFocus}
        onSubmitEditing={onSubmitEditing}
        returnKeyType="done"
        style={s.fieldInput}
      />
    </View>
  );
}

// Web only: dragging the slider would otherwise highlight the page's text as you drag.
const noSelectWeb = Platform.OS === 'web' ? ({ userSelect: 'none' } as ViewStyle) : null;

export function SliderRow({
  label,
  value,
  onChange,
  left,
  right,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  left: string;
  right: string;
}) {
  return (
    <View style={[{ gap: 4 }, noSelectWeb]}>
      <View style={s.rowBetween}>
        <Label>{label}</Label>
        <Text style={s.sliderValue}>{value}/10</Text>
      </View>
      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={value}
        onValueChange={(v) => onChange(Math.round(v))}
        minimumTrackTintColor={C.primary}
        maximumTrackTintColor={C.line}
        thumbTintColor={C.primary}
      />
      <View style={s.rowBetween}>
        <Muted style={{ fontSize: 12 }}>{left}</Muted>
        <Muted style={{ fontSize: 12 }}>{right}</Muted>
      </View>
    </View>
  );
}

export function Stepper({ value, onChange, min = 1, max = 12 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={s.stepper}>
      <Pressable style={s.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove" size={22} color={C.ink} />
      </Pressable>
      <Text style={s.stepValue}>{value}</Text>
      <Pressable style={s.stepBtn} onPress={() => onChange(Math.min(max, value + 1))}>
        <Ionicons name="add" size={22} color={C.ink} />
      </Pressable>
    </View>
  );
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={s.segment}>
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segmentItem, value === o.value && s.segmentOn]}>
          <Text style={[s.segmentText, value === o.value && { color: C.onPrimary }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

/** A friendly popup (RN's Alert doesn't work on web). */
export function Popup({
  visible,
  title,
  message,
  icon = 'alert-circle',
  actions,
  onClose,
  children,
}: {
  visible: boolean;
  title: string;
  message?: string;
  icon?: IconName;
  actions: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger' }[];
  onClose: () => void;
  children?: ReactNode;
}) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <Pressable sound={false} style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={s.popup}>
          <View style={s.popupIcon}>
            <Ionicons name={icon} size={26} color={C.primary} />
          </View>
          <H2 style={{ textAlign: 'center' }}>{title}</H2>
          {message ? (
            // Long explanations scroll inside the popup, so the buttons always stay on screen.
            <ScrollView style={{ maxHeight: height * 0.4, alignSelf: 'stretch' }} contentContainerStyle={{ flexGrow: 0 }} bounces={false}>
              <Body style={{ textAlign: 'center', color: C.muted }}>{message}</Body>
            </ScrollView>
          ) : null}
          {children}
          <View style={{ gap: 8, alignSelf: 'stretch', marginTop: 8 }}>
            {actions.map((a) => (
              <Button key={a.label} title={a.label} kind={a.kind ?? 'primary'} onPress={a.onPress} />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function Sheet({ visible, onClose, children, title }: { visible: boolean; onClose: () => void; children: ReactNode; title: string }) {
  const { height } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      {/* The tap-to-close backdrop sits BEHIND the sheet (not around it), so scrolling inside works on phones. */}
      <View style={[s.backdrop, { justifyContent: 'flex-end', padding: 0 }]}>
        <Pressable sound={false} style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={s.sheet}>
          <View style={s.sheetHandle} />
          <View style={[s.rowBetween, { marginBottom: 12 }]}>
            <H2 style={{ flex: 1 }}>{title}</H2>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={C.muted} />
            </Pressable>
          </View>
          <ScrollView style={{ maxHeight: height * 0.68 }} contentContainerStyle={{ paddingBottom: 12 }} showsVerticalScrollIndicator>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function EmptyState({ icon, title, message, children }: { icon: IconName; title: string; message: string; children?: ReactNode }) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={34} color={C.primary} />
      </View>
      <H2 style={{ textAlign: 'center' }}>{title}</H2>
      <Muted style={{ textAlign: 'center', maxWidth: 300 }}>{message}</Muted>
      {children}
    </View>
  );
}

export const money = (n: number | null | undefined) => (n == null ? '—' : `$${n.toFixed(2)}`);

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  scroll: { padding: 20, paddingBottom: 120, gap: 16, maxWidth: 640, width: '100%', alignSelf: 'center' },
  // Beige band (the page color, slightly see-through) so text scrolling underneath doesn't clash with the button.
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 12, paddingTop: 10, backgroundColor: 'rgba(238,232,220,0.94)' },
  footerInner: { maxWidth: 600, width: '100%', alignSelf: 'center' },
  h1: { fontFamily: F.display, fontSize: 32, lineHeight: 38, color: C.ink },
  h2: { fontFamily: F.display, fontSize: 22, lineHeight: 28, color: C.ink },
  h3: { fontFamily: F.bold, fontSize: 16, color: C.ink },
  body: { fontFamily: F.body, fontSize: 15, lineHeight: 22, color: C.ink },
  muted: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.muted },
  label: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  btn: {
    minHeight: 52,
    borderRadius: R.pill,
    paddingHorizontal: 22,
    paddingVertical: 10, // lets the button grow when the label wraps
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  btnPrimary: { backgroundColor: C.primary, ...shadow },
  btnSecondary: { backgroundColor: C.cardAlt, borderWidth: 1.5, borderColor: C.cardAlt },
  btnGhost: { backgroundColor: 'transparent' },
  btnText: { fontFamily: F.bold, fontSize: 16, textAlign: 'center', flexShrink: 1 },
  btnTextLong: { fontSize: 14, lineHeight: 19 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 18, gap: 10, borderWidth: 1, borderColor: C.line, ...shadow },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: R.pill,
    backgroundColor: C.cardAlt,
    borderWidth: 1.5,
    borderColor: C.cardAlt,
  },
  chipOn: { backgroundColor: C.primary, borderColor: C.primary },
  chipText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  // flexShrink + wrapping text: a pill never pushes past the edge of its card or the screen.
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: R.pill, alignSelf: 'flex-start', flexShrink: 1, maxWidth: '100%' },
  pillText: { fontFamily: F.medium, fontSize: 12, flexShrink: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: C.line,
    paddingHorizontal: 14,
  },
  fieldPrefix: { fontFamily: F.bold, fontSize: 18, color: C.muted, marginRight: 4 },
  fieldInput: { flex: 1, fontFamily: F.body, fontSize: 18, color: C.ink, paddingVertical: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sliderValue: { fontFamily: F.bold, fontSize: 14, color: C.primary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 18, alignSelf: 'flex-start' },
  stepBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: C.primarySoft, borderWidth: 1.5, borderColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontFamily: F.display, fontSize: 34, color: C.ink, minWidth: 40, textAlign: 'center' },
  segment: { flexDirection: 'row', backgroundColor: C.cardAlt, borderRadius: R.pill, padding: 4 },
  segmentItem: { flex: 1, paddingVertical: 10, borderRadius: R.pill, alignItems: 'center' },
  segmentOn: { backgroundColor: C.primary },
  segmentText: { fontFamily: F.medium, fontSize: 14, color: C.ink },
  backdrop: { flex: 1, backgroundColor: 'rgba(24,36,26,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  popup: { backgroundColor: C.bg, borderRadius: R.lg, padding: 24, gap: 10, alignItems: 'center', width: '100%', maxWidth: 400 },
  popupIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' },
  sheet: { backgroundColor: C.bg, borderTopLeftRadius: R.lg, borderTopRightRadius: R.lg, padding: 20, paddingBottom: 36, width: '100%', maxWidth: 640, alignSelf: 'center' },
  sheetHandle: { width: 40, height: 5, borderRadius: 3, backgroundColor: C.line, alignSelf: 'center', marginBottom: 12 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
