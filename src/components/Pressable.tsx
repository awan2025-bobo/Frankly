// React Native's Pressable plus the tap sound. Import this instead of Pressable from 'react-native'.
// Pass sound={false} for quiet taps, like tap-outside-to-close backdrops.
// On web, tapping fast counts as a double/triple click, which would select the button's text; buttons opt out.
import { forwardRef } from 'react';
import { Platform, Pressable as RNPressable, type PressableProps, type View, type ViewStyle } from 'react-native';

import { playClick } from '@/lib/sounds';

const noSelectWeb = Platform.OS === 'web' ? ({ userSelect: 'none' } as ViewStyle) : null;

export const Pressable = forwardRef<View, PressableProps & { sound?: boolean }>(function Pressable({ sound = true, onPress, style, ...rest }, ref) {
  return (
    <RNPressable
      ref={ref}
      {...rest}
      style={typeof style === 'function' ? (state) => [noSelectWeb, style(state)] : [noSelectWeb, style]}
      onPress={
        onPress &&
        ((e) => {
          if (sound) playClick();
          onPress(e);
        })
      }
    />
  );
});
