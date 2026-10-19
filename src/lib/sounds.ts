// App sound effects (files in assets/sounds). On/off switch lives in Profile and is remembered on the device.
//   preloadSounds() -> called once at app start, so the very first tap already has its sound loaded.
//   playClick()     -> every tap (via components/Pressable).
// Taps use a small pool of click players that take turns, so fast taps overlap instead of cutting each other off.
// Each player is parked at CLICK_START (the file has ~0.14s of silence before the click) while idle, so a tap only
// has to press play, which keeps it instant.
// To add a sound: drop the file in assets/sounds and create its player like the click ones below.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useSyncExternalStore } from 'react';

const CLICK_START = 0.13; // seconds of silence to skip at the start of click.mp3
const CLICK_MS = 250; // the click itself is over by then; the player is rewound for its next turn
const CLICK_VOLUME = 0.6;
const CLICK_POOL = 4;
const KEY = 'frankly.sounds';

// --- on/off setting -------------------------------------------------------------------------------------------------
let enabled = true;
const listeners = new Set<() => void>();
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'off') setSoundsOn(false);
  })
  .catch(() => {});

export function setSoundsOn(on: boolean) {
  enabled = on;
  AsyncStorage.setItem(KEY, on ? 'on' : 'off').catch(() => {});
  listeners.forEach((l) => l());
}

export function useSoundsOn() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => enabled,
  );
}

// --- click pool -----------------------------------------------------------------------------------------------------
type Slot = { player: AudioPlayer; reset?: ReturnType<typeof setTimeout> };
let clicks: Slot[] = [];
let next = 0;

function clickSlots() {
  if (!clicks.length) {
    // Respect the phone's silent switch and let the user's music keep playing.
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    clicks = Array.from({ length: CLICK_POOL }, () => {
      const player = createAudioPlayer(require('../../assets/sounds/click.mp3'));
      player.volume = CLICK_VOLUME;
      player.seekTo(CLICK_START).catch(() => {});
      return { player };
    });
  }
  return clicks;
}

export function preloadSounds() {
  try {
    clickSlots();
  } catch {}
}

export function playClick() {
  if (!enabled) return;
  try {
    const slots = clickSlots();
    const slot = slots[next];
    next = (next + 1) % slots.length;
    clearTimeout(slot.reset);
    slot.player.play();
    slot.reset = setTimeout(() => {
      slot.player.pause();
      slot.player.seekTo(CLICK_START).catch(() => {});
    }, CLICK_MS);
  } catch {
    // Sound is a nice-to-have; never let it break a tap.
  }
}
