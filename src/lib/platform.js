import { Capacitor } from '@capacitor/core';

export function getAppPlatform() {
  return Capacitor.getPlatform(); // "web", "android", or "ios"
}

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export function isAndroidApp() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
}