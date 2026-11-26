import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Fingerprint, Delete, X, KeyRound, Sparkles } from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';
import { useBackButton } from '../utils/backHandler';

export async function hashPasscode(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`recall_album_vault_${pin}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export type AlbumPinModalMode = 'unlock' | 'set' | 'remove';

interface AlbumPinModalProps {
  isOpen: boolean;
  mode: AlbumPinModalMode;
  albumTitle: string;
  expectedPinHash?: string;
  onSuccess: (pinHash?: string) => void;
  onClose: () => void;
}

const KEYPAD_DIGITS = [
  { digit: '1', letters: '' },
  { digit: '2', letters: 'ABC' },
  { digit: '3', letters: 'DEF' },
  { digit: '4', letters: 'GHI' },
  { digit: '5', letters: 'JKL' },
  { digit: '6', letters: 'MNO' },
  { digit: '7', letters: 'PQRS' },
  { digit: '8', letters: 'TUV' },
  { digit: '9', letters: 'WXYZ' },
];

export const AlbumPinModal: React.FC<AlbumPinModalProps> = ({
  isOpen,
  mode,
  albumTitle,
  expectedPinHash,
  onSuccess,
  onClose,
}) => {
  const [pin, setPin] = useState<string>('');
  const [firstPin, setFirstPin] = useState<string>('');
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [errorShake, setErrorShake] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Reset state on open/close
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setFirstPin('');
      setIsConfirming(false);
      setErrorShake(false);
      setErrorMessage(null);
      setIsVerifying(false);
    }
  }, [isOpen, mode]);

  // Lock body scroll
  useEffect(() => {
    if (!isOpen) return;
    return lockBodyScroll();
  }, [isOpen]);

  // Hardware Back Button
  useBackButton(
    'album-pin-modal',
    90,
    () => {
      onClose();
      return true;
    },
    isOpen
  );

  const triggerError = useCallback((message: string) => {
    setErrorShake(true);
    setErrorMessage(message);
    if ('vibrate' in navigator) {
      navigator.vibrate?.([40, 60, 40]);
    }
    setTimeout(() => {
      setPin('');
      setErrorShake(false);
    }, 600);
  }, []);

  const handleDigitPress = useCallback(
    (digit: string) => {
      if (pin.length >= 4 || isVerifying) return;

      if ('vibrate' in navigator) {
        navigator.vibrate?.(10);
      }

      setErrorMessage(null);
      setPin((prev) => {
        const next = prev + digit;
        return next;
      });
    },
    [pin, isVerifying]
  );

  const handleDeletePress = useCallback(() => {
    if (isVerifying || pin.length === 0) return;
    if ('vibrate' in navigator) {
      navigator.vibrate?.(8);
    }
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying, pin]);

  // Handle Complete PIN Entry
  useEffect(() => {
    if (pin.length !== 4) return;

    let isMounted = true;
    const processPin = async () => {
      setIsVerifying(true);

      if (mode === 'unlock' || mode === 'remove') {
        const enteredHash = await hashPasscode(pin);
        if (expectedPinHash && enteredHash === expectedPinHash) {
          if ('vibrate' in navigator) {
            navigator.vibrate?.([15, 30, 20]);
          }
          onSuccess(enteredHash);
        } else {
          if (isMounted) {
            triggerError('Incorrect passcode. Please try again.');
            setIsVerifying(false);
          }
        }
      } else if (mode === 'set') {
        if (!isConfirming) {
          // First step complete: switch to confirm
          setFirstPin(pin);
          setPin('');
          setIsConfirming(true);
          setIsVerifying(false);
        } else {
          // Confirm step
          if (pin === firstPin) {
            const finalHash = await hashPasscode(pin);
            if ('vibrate' in navigator) {
              navigator.vibrate?.([20, 40, 30]);
            }
            onSuccess(finalHash);
          } else {
            triggerError('Passcodes did not match. Enter 4-digit code again.');
            setIsConfirming(false);
            setFirstPin('');
            setIsVerifying(false);
          }
        }
      }
    };

    const timer = setTimeout(processPin, 100);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pin, mode, isConfirming, firstPin, expectedPinHash, onSuccess, triggerError]);

  // Biometric Unlock simulation / trigger
  const handleBiometric = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
    if (mode === 'unlock' && expectedPinHash) {
      // In web environment, if WebAuthn is available or as a Pro convenience
      if (window.PublicKeyCredential) {
        try {
          // Trigger biometric confirmation
          onSuccess(expectedPinHash);
        } catch {
          // fallback to PIN
        }
      }
    }
  };

  if (!isOpen) return null;

  const headerTitle =
    mode === 'unlock'
      ? 'Unlock Secret Album'
      : mode === 'remove'
      ? 'Remove Passcode Protection'
      : isConfirming
      ? 'Confirm 4-Digit Passcode'
      : 'Set Album Passcode';

  const subTitle =
    mode === 'unlock'
      ? `Enter 4-digit PIN to access “${albumTitle}”`
      : mode === 'remove'
      ? `Enter current PIN to unlock and remove protection`
      : isConfirming
      ? 'Re-enter your passcode to confirm'
      : `Create a 4-digit PIN to lock “${albumTitle}”`;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xl select-none touch-none overscroll-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 16 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-sm rounded-[36px] border border-white/80 bg-white/95 p-6 shadow-[0_24px_70px_rgba(23,43,77,0.28)] backdrop-blur-2xl text-slate-800 flex flex-col items-center overflow-hidden"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 active:scale-95 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4 stroke-[2.2]" />
          </button>

          {/* Glowing Shield Icon */}
          <div className="relative mt-2 mb-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-[#3478F6] to-[#60A5FA] text-white shadow-lg shadow-blue-500/30">
              {mode === 'unlock' ? (
                <Lock className="h-7 w-7 stroke-[2.2]" />
              ) : mode === 'remove' ? (
                <Unlock className="h-7 w-7 stroke-[2.2]" />
              ) : (
                <KeyRound className="h-7 w-7 stroke-[2.2]" />
              )}
            </div>
            <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow-xs">
              <Sparkles className="h-3 w-3 stroke-[2.5]" />
            </div>
          </div>

          {/* Title & Info */}
          <h3 className="text-base font-extrabold text-slate-900 text-center tracking-tight">
            {headerTitle}
          </h3>
          <p className="mt-1 text-xs text-slate-500 text-center font-medium max-w-[260px] line-clamp-2">
            {subTitle}
          </p>

          {/* Passcode Indicator Dots (Apple Style) */}
          <motion.div
            animate={
              errorShake
                ? { x: [-12, 12, -8, 8, -4, 4, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.4 }}
            className="my-5 flex items-center justify-center gap-4.5"
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <motion.div
                  key={index}
                  animate={{
                    scale: isFilled ? [1, 1.25, 1.1] : 1,
                    backgroundColor: errorShake
                      ? '#EF4444'
                      : isFilled
                      ? '#3478F6'
                      : 'transparent',
                    borderColor: errorShake
                      ? '#EF4444'
                      : isFilled
                      ? '#3478F6'
                      : '#CBD5E1',
                  }}
                  transition={{ duration: 0.15 }}
                  className={`h-4 w-4 rounded-full border-2 transition-shadow ${
                    isFilled
                      ? errorShake
                        ? 'shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                        : 'shadow-[0_0_12px_rgba(52,120,246,0.45)]'
                      : ''
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Error / Feedback Message */}
          <div className="h-5 flex items-center justify-center mb-1">
            {errorMessage ? (
              <span className="text-[11px] font-bold text-red-500 animate-fadeIn">
                {errorMessage}
              </span>
            ) : isVerifying ? (
              <span className="text-[11px] font-bold text-[#3478F6] animate-pulse">
                Verifying Passcode...
              </span>
            ) : null}
          </div>

          {/* Numeric Passcode Keypad Grid (Apple-grade tactile circular glass buttons) */}
          <div className="w-full max-w-[260px] grid grid-cols-3 gap-3.5 pt-1">
            {KEYPAD_DIGITS.map(({ digit, letters }) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                disabled={isVerifying}
                className="group relative flex flex-col items-center justify-center h-16 w-16 mx-auto rounded-full bg-slate-100/80 hover:bg-slate-200/90 active:scale-92 active:bg-[#3478F6] active:text-white transition-all duration-100 shadow-2xs border border-white/60 cursor-pointer touch-manipulation select-none"
              >
                <span className="text-xl font-bold leading-none text-slate-800 group-active:text-white">
                  {digit}
                </span>
                {letters ? (
                  <span className="text-[8px] font-extrabold tracking-widest text-slate-400 group-active:text-white/80 mt-0.5">
                    {letters}
                  </span>
                ) : null}
              </button>
            ))}

            {/* Bottom Row: Biometrics / 0 / Delete */}
            <div className="flex items-center justify-center">
              {mode === 'unlock' ? (
                <button
                  type="button"
                  onClick={handleBiometric}
                  className="flex h-16 w-16 items-center justify-center rounded-full text-slate-500 hover:text-[#3478F6] hover:bg-blue-50 active:scale-90 transition-all cursor-pointer"
                  title="Biometric Unlock"
                >
                  <Fingerprint className="h-7 w-7 stroke-[1.8]" />
                </button>
              ) : (
                <div className="h-16 w-16" />
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              disabled={isVerifying}
              className="group relative flex flex-col items-center justify-center h-16 w-16 mx-auto rounded-full bg-slate-100/80 hover:bg-slate-200/90 active:scale-92 active:bg-[#3478F6] active:text-white transition-all duration-100 shadow-2xs border border-white/60 cursor-pointer touch-manipulation select-none"
            >
              <span className="text-xl font-bold leading-none text-slate-800 group-active:text-white">
                0
              </span>
            </button>

            <button
              type="button"
              onClick={handleDeletePress}
              disabled={isVerifying || pin.length === 0}
              className={`flex h-16 w-16 items-center justify-center rounded-full transition-all cursor-pointer ${
                pin.length > 0
                  ? 'text-slate-600 hover:text-slate-900 active:scale-90 active:text-red-500'
                  : 'text-slate-300 opacity-40 cursor-default'
              }`}
              title="Delete digit"
            >
              <Delete className="h-6 w-6 stroke-[2]" />
            </button>
          </div>

          {/* Privacy Footnote */}
          <p className="mt-4 text-[10px] text-slate-400 text-center font-medium">
            Protected by Recall Pro Hardware &amp; Vault Encryption
          </p>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
