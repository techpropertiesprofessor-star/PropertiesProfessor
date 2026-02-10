// src/utils/sound.js

// Singleton Audio instance for notification sound
const audio = new Audio('/sounds/notification.mp3');
audio.preload = 'auto';

// Prevent overlapping sounds
let isPlaying = false;

// Unlock audio on first user interaction (required by some browsers)
let isUnlocked = false;
export function unlockAudio() {
  if (!isUnlocked) {
    audio.play().catch(() => {}); // Try to unlock, ignore errors
    audio.pause();
    audio.currentTime = 0;
    isUnlocked = true;
  }
}

// Play notification sound safely
export function playNotificationSound() {
  if (!isUnlocked) return; // Don't play until unlocked
  if (isPlaying) {
    audio.currentTime = 0;
    return;
  }
  isPlaying = true;
  audio.currentTime = 0;
  audio.play().catch(() => {}).finally(() => {
    isPlaying = false;
  });
}
