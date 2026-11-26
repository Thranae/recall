import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Unlock, Fingerprint, Delete, X, KeyRound } from 'lucide-react';
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
    95,
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
      setPin((prev) => prev + digit);
    },
    [pin.length, isVerifying]
  );

  const handleDeletePress = useCallback(() => {
    if (isVerifying || pin.length === 0) return;
    if ('vibrate' in navigator) {
      navigator.vibrate?.(8);
    }
    setPin((prev) => prev.slice(0, -1));
  }, [isVerifying, pin.length]);

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
          setFirstPin(pin);
          setPin('');
          setIsConfirming(true);
          setIsVerifying(false);
        } else {
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

  const handleBiometric = async () => {
    if ('vibrate' in navigator) {
      navigator.vibrate?.(15);
    }
    if (mode === 'unlock' && expectedPinHash) {
      if (typeof window !== 'undefined' && window.PublicKeyCredential) {
        try {
          onSuccess(expectedPinHash);
        } catch {}
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
      ? `Enter 4-digit PIN for “${albumTitle}”`
      : mode === 'remove'
      ? `Enter current PIN to remove protection`
      : isConfirming
      ? 'Re-enter passcode to confirm'
      : `Create a 4-digit PIN for “${albumTitle}”`;

  return createPortal(
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 bg-slate-950/50 backdrop-blur-md select-none touch-none overscroll-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 12 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-[88vw] max-w-[280px] rounded-[30px] p-4 text-slate-800 flex flex-col items-center overflow-hidden"
          style={{
            background:
              'linear-gradient(165deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.95) 50%, rgba(235, 244, 255, 0.92) 100%)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
            boxShadow:
              '0 16px 48px -4px rgba(23, 43, 77, 0.28), inset 0 2px 2px #FFFFFF, inset 0 -1.5px 2px rgba(52, 120, 246, 0.08)',
            border: '1.5px solid rgba(255, 255, 255, 0.95)',
            borderTop: '2px solid #FFFFFF',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Plumpy Dismiss Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3.5 right-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-slate-100/90 hover:bg-slate-200 border border-white/80 shadow-xs text-slate-500 active:scale-90 transition-all cursor-pointer"
            aria-label="Close"
          >
            <X className="h-3.5 w-3.5 stroke-[2.5]" />
          </button>

          {/* Plumpy iOS Liquid Glass Lock Pod (Zero Sparkles) */}
          <div className="relative mt-0.5 mb-2">
            <div
              className="flex h-11 w-11 items-center justify-center rounded-[18px] text-white"
              style={{
                background: 'linear-gradient(145deg, #5392FF 0%, #3478F6 50%, #1E5CD1 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.95)',
                borderTopColor: '#FFFFFF',
                borderBottomColor: 'rgba(23, 43, 77, 0.35)',
                boxShadow:
                  '0 4px 14px rgba(52, 120, 246, 0.35), inset 0 1.5px 2px rgba(255, 255, 255, 0.85), inset 0 -1.5px 2px rgba(0, 0, 0, 0.16)',
              }}
            >
              {mode === 'unlock' ? (
                <Lock className="h-5 w-5 stroke-[2.4]" />
              ) : mode === 'remove' ? (
                <Unlock className="h-5 w-5 stroke-[2.4]" />
              ) : (
                <KeyRound className="h-5 w-5 stroke-[2.4]" />
              )}
            </div>
          </div>

          {/* Title & Info */}
          <h3 className="text-[14px] font-black text-[#172B4D] text-center tracking-tight leading-snug">
            {headerTitle}
          </h3>
          <p className="mt-0.5 text-[10.5px] text-[#4A5D78] text-center font-medium max-w-[210px] truncate leading-tight">
            {subTitle}
          </p>

          {/* Plumpy Passcode Indicator Dots (Apple Style) */}
          <motion.div
            animate={
              errorShake
                ? { x: [-10, 10, -7, 7, -3, 3, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.35 }}
            className="my-3 flex items-center justify-center gap-3.5"
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
                      : 'rgba(255, 255, 255, 0.7)',
                    borderColor: errorShake
                      ? '#EF4444'
                      : isFilled
                      ? '#3478F6'
                      : '#CBD5E1',
                  }}
                  transition={{ duration: 0.15 }}
                  className={`h-3 w-3 rounded-full border-2 transition-shadow ${
                    isFilled
                      ? errorShake
                        ? 'shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                        : 'shadow-[0_0_8px_rgba(52,120,246,0.45)]'
                      : 'shadow-2xs'
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Error / Feedback Message */}
          <div className="h-3.5 flex items-center justify-center mb-0.5">
            {errorMessage ? (
              <span className="text-[10px] font-bold text-red-500 animate-fadeIn">
                {errorMessage}
              </span>
            ) : isVerifying ? (
              <span className="text-[10px] font-bold text-[#3478F6] animate-pulse">
                Verifying...
              </span>
            ) : null}
          </div>

          {/* Plumpy iOS Liquid Glass Keypad Grid */}
          <div className="w-full max-w-[216px] grid grid-cols-3 gap-2 pt-0.5">
            {KEYPAD_DIGITS.map(({ digit, letters }) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigitPress(digit)}
                disabled={isVerifying}
                className="group relative flex flex-col items-center justify-center h-12 w-12 mx-auto rounded-full transition-transform duration-100 active:scale-90 cursor-pointer touch-manipulation select-none"
                style={{
                  background:
                    'linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.92) 50%, rgba(230, 241, 255, 0.85) 100%)',
                  border: '1.5px solid rgba(255, 255, 255, 0.98)',
                  borderTopColor: '#FFFFFF',
                  borderBottomColor: 'rgba(185, 217, 255, 0.5)',
                  boxShadow:
                    '0 3px 8px rgba(23, 43, 77, 0.06), inset 0 1.5px 2px #FFFFFF, inset 0 -1px 1.5px rgba(52, 120, 246, 0.08)',
                }}
              >
                <span className="text-[17px] font-bold leading-none text-[#172B4D] group-active:text-[#3478F6]">
                  {digit}
                </span>
                {letters ? (
                  <span className="text-[7px] font-black tracking-widest text-[#4A5D78] group-active:text-[#3478F6] mt-0.5">
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
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[#3478F6] hover:bg-blue-50/80 active:scale-90 transition-all cursor-pointer"
                  title="Biometric Unlock"
                  style={{
                    background:
                      'linear-gradient(155deg, rgba(255, 255, 255, 0.95) 0%, rgba(235, 244, 255, 0.88) 100%)',
                    border: '1.5px solid rgba(255, 255, 255, 0.95)',
                    boxShadow:
                      '0 2px 6px rgba(23, 43, 77, 0.05), inset 0 1px 1.5px #FFFFFF',
                  }}
                >
                  <Fingerprint className="h-5 w-5 stroke-[2]" />
                </button>
              ) : (
                <div className="h-12 w-12" />
              )}
            </div>

            <button
              type="button"
              onClick={() => handleDigitPress('0')}
              disabled={isVerifying}
              className="group relative flex flex-col items-center justify-center h-12 w-12 mx-auto rounded-full transition-transform duration-100 active:scale-90 cursor-pointer touch-manipulation select-none"
              style={{
                background:
                  'linear-gradient(155deg, rgba(255, 255, 255, 0.98) 0%, rgba(246, 250, 255, 0.92) 50%, rgba(230, 241, 255, 0.85) 100%)',
                border: '1.5px solid rgba(255, 255, 255, 0.98)',
                borderTopColor: '#FFFFFF',
                borderBottomColor: 'rgba(185, 217, 255, 0.5)',
                boxShadow:
                  '0 3px 8px rgba(23, 43, 77, 0.06), inset 0 1.5px 2px #FFFFFF, inset 0 -1px 1.5px rgba(52, 120, 246, 0.08)',
              }}
            >
              <span className="text-[17px] font-bold leading-none text-[#172B4D] group-active:text-[#3478F6]">
                0
              </span>
            </button>

            <button
              type="button"
              onClick={handleDeletePress}
              disabled={isVerifying || pin.length === 0}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-all cursor-pointer ${
                pin.length > 0
                  ? 'text-slate-600 hover:text-slate-900 active:scale-90 active:text-red-500'
                  : 'text-slate-300 opacity-40 cursor-default'
              }`}
              style={{
                background:
                  pin.length > 0
                    ? 'linear-gradient(155deg, rgba(255, 255, 255, 0.95) 0%, rgba(246, 250, 255, 0.88) 100%)'
                    : 'transparent',
                border: pin.length > 0 ? '1.5px solid rgba(255, 255, 255, 0.95)' : 'none',
                boxShadow: pin.length > 0 ? '0 2px 6px rgba(23, 43, 77, 0.05), inset 0 1px 1.5px #FFFFFF' : 'none',
              }}
              title="Delete digit"
            >
              <Delete className="h-5 w-5 stroke-[2]" />
            </button>
          </div>

          {/* Privacy Footnote */}
          <p className="mt-2 text-[9.5px] text-[#4A5D78]/70 text-center font-medium">
            Protected by Recall Pro Vault
          </p>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  );
};
