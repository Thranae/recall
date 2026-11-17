import { Capacitor } from '@capacitor/core';
import { StatusBar } from '@capacitor/status-bar';

const STORAGE_KEY = 'recall_hide_status_bar';

export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function isFullscreenActive(): boolean {
  if (isNativePlatform()) {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  }
  return typeof document !== 'undefined' && Boolean(document.fullscreenElement);
}

export async function setStatusBarHidden(hidden: boolean): Promise<boolean> {
  if (isNativePlatform()) {
    try {
      if (hidden) {
        await StatusBar.hide();
        localStorage.setItem(STORAGE_KEY, 'true');
      } else {
        await StatusBar.show();
        localStorage.setItem(STORAGE_KEY, 'false');
      }
      window.dispatchEvent(new CustomEvent('recall_status_bar_change', { detail: { hidden } }));
      return hidden;
    } catch (err) {
      console.warn('Native status bar toggle failed:', err);
      return false;
    }
  }

  // Web Browser: HTML5 Fullscreen API
  if (typeof document === 'undefined') return false;

  try {
    if (hidden) {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      return true;
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
      return false;
    }
  } catch (err) {
    console.warn('Web Fullscreen request failed (requires direct user gesture):', err);
    return Boolean(document.fullscreenElement);
  }
}

export async function toggleStatusBar(): Promise<boolean> {
  const current = isFullscreenActive();
  return setStatusBarHidden(!current);
}
