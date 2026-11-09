import React, { useState, useRef, useEffect } from 'react';

interface OtpInputProps {
  length?: number;
  value?: string;
  onChange: (otp: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value = '',
  onChange,
  disabled = false,
}) => {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (value === '') {
      setOtp(new Array(length).fill(''));
    } else {
      const chars = value.split('').slice(0, length);
      const padded = [...chars, ...new Array(Math.max(0, length - chars.length)).fill('')];
      setOtp(padded);
    }
  }, [value, length]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val && e.target.value !== '') return;

    const newOtp = [...otp];
    newOtp[index] = val ? val.slice(-1) : '';
    setOtp(newOtp);

    const combined = newOtp.join('');
    onChange(combined);

    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0 && inputRefs.current[index - 1]) {
        inputRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        onChange(newOtp.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text/plain').replace(/\D/g, '').slice(0, length);
    if (!pasteData) return;

    const newOtp = [...otp];
    pasteData.split('').forEach((char, i) => {
      newOtp[i] = char;
    });
    setOtp(newOtp);
    onChange(newOtp.join(''));

    const nextIndex = Math.min(pasteData.length, length - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-between items-center gap-2 sm:gap-3 my-5 w-full">
      {otp.map((digit, index) => (
        <input
          key={index}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          disabled={disabled}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={digit}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`flex-1 max-w-[50px] min-w-[38px] aspect-[4/5] sm:aspect-square text-center text-2xl font-bold rounded-2xl transition-all duration-200 outline-none select-none
            ${
              digit
                ? 'bg-white text-[#172B4D] border-2 border-[#208AEF] shadow-[0_4px_16px_rgba(32,138,239,0.18)] scale-[1.03]'
                : 'bg-white/70 text-[#172B4D] border border-black/10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.04)] hover:bg-white/90'
            }
            focus:border-[#208AEF] focus:bg-white focus:ring-4 focus:ring-[#208AEF]/20 focus:scale-[1.05]
            disabled:opacity-50 disabled:cursor-not-allowed`}
        />
      ))}
    </div>
  );
};

export default OtpInput;

