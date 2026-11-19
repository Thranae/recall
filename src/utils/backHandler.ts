import { useEffect } from 'react';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export type BackHandler = () => boolean | void;

interface HandlerRegistration {
  id: string;
  priority: number;
  handler: BackHandler;
}

class BackButtonManager {
  private handlers: HandlerRegistration[] = [];
  private isListenerRegistered = false;
  private lastBackPressTime = 0;
  private exitToastTimeout: any = null;
  private onToastChange?: (msg: string | null) => void;

  public setExitToastCallback(cb: (msg: string | null) => void) {
    this.onToastChange = cb;
  }

  public register(id: string, priority: number, handler: BackHandler): () => void {
    // Remove any existing registration with same id
    this.handlers = this.handlers.filter((h) => h.id !== id);
    this.handlers.push({ id, priority, handler });
    // Sort descending by priority (higher priority executes first)
    this.handlers.sort((a, b) => b.priority - a.priority);

    this.ensureListeners();

    // Return cleanup unregister function
    return () => {
      this.unregister(id);
    };
  }

  public unregister(id: string) {
    this.handlers = this.handlers.filter((h) => h.id !== id);
  }

  public handleBack(): boolean {
    for (const item of this.handlers) {
      try {
        const result = item.handler();
        // If the handler returned explicitly false, it chose not to consume this press
        if (result !== false) {
          return true;
        }
      } catch (err) {
        console.warn(`Error in back handler "${item.id}":`, err);
      }
    }

    // If nothing in the handler stack handled the back event, we are at root
    const now = Date.now();
    if (now - this.lastBackPressTime < 2000) {
      // User tapped back twice within 2 seconds: cleanly exit app
      if (this.onToastChange) {
        this.onToastChange(null);
      }
      try {
        if (Capacitor.isNativePlatform()) {
          CapApp.exitApp();
        }
      } catch {}
      return false;
    } else {
      this.lastBackPressTime = now;
      if (this.onToastChange) {
        this.onToastChange('Press back again to exit');
        clearTimeout(this.exitToastTimeout);
        this.exitToastTimeout = setTimeout(() => {
          if (this.onToastChange) {
            this.onToastChange(null);
          }
        }, 2000);
      }
      return true;
    }
  }

  private ensureListeners() {
    if (this.isListenerRegistered) return;
    this.isListenerRegistered = true;

    // 1. Native Capacitor hardware & gesture back button listener
    try {
      CapApp.addListener('backButton', () => {
        this.handleBack();
      });
    } catch (e) {
      console.warn('Capacitor App.addListener(backButton) unavailable in this runtime', e);
    }

    // 2. Web browser popstate listener for PWA / desktop navigation
    if (typeof window !== 'undefined') {
      try {
        window.history.pushState({ recall_app: true }, '', window.location.href);
      } catch {}

      window.addEventListener('popstate', () => {
        const handled = this.handleBack();
        if (handled) {
          // Re-push state to keep history forward and prevent accidental tab closure on web
          try {
            window.history.pushState({ recall_app: true }, '', window.location.href);
          } catch {}
        }
      });
    }
  }
}

export const backHandler = new BackButtonManager();

/**
 * React hook to register a back button handler with priority.
 * Higher priority runs first.
 */
export function useBackButton(
  id: string,
  priority: number,
  handler: BackHandler,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;
    return backHandler.register(id, priority, handler);
  }, [id, priority, handler, active]);
}

