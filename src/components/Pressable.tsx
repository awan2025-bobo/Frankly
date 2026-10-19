// React Native's Pressable plus the tap sound. Import this instead of Pressable from 'react-native'.
// Pass sound={false} for quiet taps, like tap-outside-to-close backdrops.
import { forwardRef } from 'react';
import { Pressable as RNPressable, type PressableProps, type View } from 'react-native';

import { playClick } from '@/lib/sounds';

export const Pressable = forwardRef<View, PressableProps & { sound?: boolean }>(function Pressable({ sound = true, onPress, ...rest }, ref) {
  return (
    <RNPressable
      ref={ref}
      {...rest}
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
