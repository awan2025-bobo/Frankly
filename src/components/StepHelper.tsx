// The Frankly helper popup: "Need help with this step?" hovering just above the tapped step.
// Slides up out of the way of the keyboard, keeps a short chat per step, and offers quick questions.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { askStep, type HelpTurn } from '@/lib/api';
import { C, F, R, shadow } from '@/lib/theme';
import { Logo } from './Logo';

const CHIPS = ['How do I know it’s done?', 'What can I substitute?', 'Can I prep this ahead?'];

export function StepHelper({
  recipeId,
  stepIndex,
  stepText,
  anchor,
  history,
  onHistory,
  onClose,
}: {
  recipeId: string;
  stepIndex: number;
  stepText: string;
  anchor: { y: number; h: number }; // the step row, in window coordinates
  history: HelpTurn[];
  onHistory: (next: HelpTurn[]) => void;
  onClose: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const [question, setQuestion] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [cardH, setCardH] = useState(300);
  const [kb, setKb] = useState(0);
  const appear = useRef(new Animated.Value(0)).current;
  const top = useRef(new Animated.Value(Math.max(60, anchor.y - 320))).current;
  const scroll = useRef<ScrollView>(null);

  const W = Math.min(width - 28, 420);

  // Keyboard height, so the card can move up out of its way.
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKb(e.endCoordinates.height));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKb(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Float in the middle of the screen; while the keyboard is open, sit just above it.
  useEffect(() => {
    let y = kb > 0 ? height - kb - cardH - 12 : (height - cardH) / 2;
    y = Math.max(y, 48);
    Animated.spring(top, { toValue: y, useNativeDriver: false, speed: 16, bounciness: 5 }).start();
  }, [anchor.y, anchor.h, cardH, kb, height, top]);

  useEffect(() => {
    Animated.timing(appear, { toValue: 1, duration: 220, easing: Easing.out(Easing.back(1.4)), useNativeDriver: false }).start();
  }, [appear]);

  const close = () => {
    Keyboard.dismiss();
    Animated.timing(appear, { toValue: 0, duration: 150, useNativeDriver: false }).start(onClose);
  };

  async function send(text: string) {
    const q = text.trim();
    if (!q || pending) return;
    setQuestion('');
    setPending(q);
    try {
      const res = await askStep(recipeId, stepIndex, q.slice(0, 300), history);
      onHistory([...history, { q, a: res.answer, on_topic: res.on_topic }]);
    } catch (e) {
      onHistory([...history, { q, a: e instanceof Error ? e.message : 'Something went wrong. Try again.', on_topic: false }]);
    } finally {
      setPending(null);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    }
  }

  return (
    <Modal transparent visible animationType="none" onRequestClose={close}>
      <Pressable style={st.backdrop} onPress={close} />
      <Animated.View
        onLayout={(e) => setCardH(e.nativeEvent.layout.height)}
        style={[
          st.card,
          {
            width: W,
            left: (width - W) / 2,
            top,
            opacity: appear,
            transform: [{ scale: appear.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
          },
        ]}>
        <View style={st.head}>
          <Logo size={26} cutout={C.card} />
          <Text style={st.title}>Need help with step {stepIndex + 1}?</Text>
          <Pressable onPress={close} hitSlop={12}>
            <Ionicons name="close" size={22} color={C.muted} />
          </Pressable>
        </View>
        <Text style={st.step} numberOfLines={2}>
          {stepText}
        </Text>

        {(history.length > 0 || pending) && (
          <ScrollView
            ref={scroll}
            style={{ maxHeight: 230 }}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            // Open at (and stay on) the latest message, not the top of a long chat.
            onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
            {history.map((h, i) => (
              <View key={i} style={{ gap: 6 }}>
                <View style={st.qBubble}>
                  <Text style={st.qText}>{h.q}</Text>
                </View>
                <View style={[st.aBubble, !h.on_topic && { backgroundColor: C.badSoft }]}>
                  <Text style={st.aText}>{h.a}</Text>
                </View>
              </View>
            ))}
            {pending && (
              <View style={{ gap: 6 }}>
                <View style={st.qBubble}>
                  <Text style={st.qText}>{pending}</Text>
                </View>
                <Thinking />
              </View>
            )}
          </ScrollView>
        )}

        {history.length === 0 && !pending && (
          <View style={st.chips}>
            {CHIPS.map((c) => (
              <Pressable key={c} onPress={() => send(c)} style={({ pressed }) => [st.chip, pressed && { transform: [{ scale: 0.96 }] }]}>
                <Text style={st.chipText}>{c}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View style={st.inputRow}>
          <TextInput
            value={question}
            onChangeText={setQuestion}
            placeholder="Ask any question..."
            placeholderTextColor={C.faint}
            maxLength={300}
            returnKeyType="send"
            onSubmitEditing={() => send(question)}
            style={st.input}
          />
          <Pressable
            onPress={() => send(question)}
            disabled={!question.trim() || !!pending}
            style={[st.send, (!question.trim() || pending) && { opacity: 0.4 }]}
            accessibilityLabel="Send">
            <Ionicons name="arrow-up" size={18} color={C.onPrimary} />
          </Pressable>
        </View>
      </Animated.View>
    </Modal>
  );
}

/** Three bouncing dots while the helper thinks. */
function Thinking() {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={[st.aBubble, { flexDirection: 'row', gap: 5, alignSelf: 'flex-start', paddingVertical: 12 }]}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            st.dot,
            {
              transform: [
                {
                  translateY: t.interpolate({
                    inputRange: [0, (i + 0.5) / 4, (i + 1) / 4, 1],
                    outputRange: [0, -4, 0, 0],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(46,51,37,0.25)' },
  card: { position: 'absolute', backgroundColor: C.card, borderRadius: R.lg, padding: 16, gap: 10, borderWidth: 1, borderColor: C.line, ...shadow, shadowOpacity: 0.2 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontFamily: F.bold, fontSize: 16, color: C.ink },
  step: { fontFamily: F.body, fontSize: 13, lineHeight: 18, color: C.muted },
  qBubble: { alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: C.primary, borderRadius: 16, borderBottomRightRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  qText: { fontFamily: F.medium, fontSize: 14, color: C.onPrimary },
  aBubble: { alignSelf: 'flex-start', maxWidth: '92%', backgroundColor: C.cardAlt, borderRadius: 16, borderBottomLeftRadius: 4, paddingHorizontal: 12, paddingVertical: 9 },
  aText: { fontFamily: F.body, fontSize: 14, lineHeight: 20, color: C.ink },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: C.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: C.primarySoft, borderRadius: R.pill, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontFamily: F.medium, fontSize: 13, color: C.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.bg, borderRadius: R.pill, paddingLeft: 14, paddingRight: 5, paddingVertical: 4 },
  input: { flex: 1, fontFamily: F.body, fontSize: 15, color: C.ink, paddingVertical: 8 },
  send: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
