import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

function isHapticsSupported(): boolean {
  return Platform.OS !== 'web';
}

async function runHaptics(task: () => Promise<void>): Promise<void> {
  if (!isHapticsSupported()) return;

  try {
    await task();
  } catch {
    // Ignore unsupported-device haptics failures.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function triggerQuestCompleteHaptic(): Promise<void> {
  await runHaptics(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
}

export async function triggerRewardUnlockHaptic(): Promise<void> {
  await runHaptics(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(90);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
}

export async function triggerAchievementUnlockHaptic(): Promise<void> {
  await runHaptics(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await delay(120);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  });
}

export async function triggerLevelUpHaptic(): Promise<void> {
  await runHaptics(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await delay(110);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await delay(130);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  });
}
