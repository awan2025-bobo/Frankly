// App sound effects (files in assets/sounds). On/off switch lives in Profile and is remembered on the device.
//   playClick()      -> every tap (via components/Pressable). Starts where the click actually begins (the file has
//                       ~0.14s of silence first), so it feels instant.
//   useSizzle(on)    -> loops sizzle.mp3 while `on`, fading in and out, so it lasts exactly as long as the animation
//                       however long that is (the file is ~28s; it repeats seamlessly if the wait is longer).
// To add a sound: drop the file in assets/sounds, create a player like the two below.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { useEffect, useSyncExternalStore } from 'react';

const CLICK_START = 0.13; // seconds of silence to skip at the start of click.mp3
const CLICK_VOLUME = 0.6;
const SIZZLE_VOLUME = 0.5;
const FADE_IN_MS = 400;
const FADE_OUT_MS = 500;
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
  if (!on) stopSizzleNow();
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

// --- players (created on first use) ---------------------------------------------------------------------------------
let modeSet = false;
function setup() {
  if (modeSet) return;
  modeSet = true;
  // Respect the phone's silent switch and let the user's music keep playing.
  setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
}

let click: AudioPlayer | null = null;
let sizzle: AudioPlayer | null = null;

export function playClick() {
  if (!enabled) return;
  try {
    setup();
    if (!click) {
      click = createAudioPlayer(require('../../assets/sounds/click.mp3'));
      click.volume = CLICK_VOLUME;
    }
    click.seekTo(CLICK_START).catch(() => {});
    click.play();
  } catch {
    // Sound is a nice-to-have; never let it break a tap.
  }
}

// --- sizzle loop ----------------------------------------------------------------------------------------------------
let fadeTimer: ReturnType<typeof setInterval> | undefined;
let sizzleUsers = 0;

function fadeTo(p: AudioPlayer, target: number, ms: number, then?: () => void) {
  clearInterval(fadeTimer);
  const from = p.volume;
  const steps = Math.max(1, Math.round(ms / 40));
  let i = 0;
  fadeTimer = setInterval(() => {
    i++;
    p.volume = from + ((target - from) * i) / steps;
    if (i >= steps) {
      clearInterval(fadeTimer);
      then?.();
    }
  }, 40);
}

function startSizzle() {
  if (!enabled) return;
  try {
    setup();
    if (!sizzle) {
      sizzle = createAudioPlayer(require('../../assets/sounds/sizzle.mp3'));
      sizzle.loop = true;
    }
    const p = sizzle;
    if (!p.playing) {
      p.volume = 0;
      p.seekTo(0).catch(() => {});
      p.play();
    }
    fadeTo(p, SIZZLE_VOLUME, FADE_IN_MS);
  } catch {}
}

function stopSizzle() {
  const p = sizzle;
  if (!p) return;
  fadeTo(p, 0, FADE_OUT_MS, () => p.pause());
}

function stopSizzleNow() {
  clearInterval(fadeTimer);
  sizzle?.pause();
}

/** Sizzles while `on` is true (fades in on start, out when it turns false or the screen goes away). */
export function useSizzle(on: boolean) {
  const soundsOn = useSoundsOn();
  useEffect(() => {
    if (!on || !soundsOn) return;
    sizzleUsers++;
    startSizzle();
    return () => {
      sizzleUsers--;
      if (sizzleUsers === 0) stopSizzle();
    };
  }, [on, soundsOn]);
}
