import { Platform } from 'react-native';

// expo-haptics crashes on web, so we wrap it with platform checks
// on web these are just no-ops

let Haptics: any = null;

if (Platform.OS !== 'web') {
  Haptics = require('expo-haptics');
}

export function selectionAsync() {
  Haptics?.selectionAsync();
}

export function impactLight() {
  Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

export function notificationSuccess() {
  Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success);
}
