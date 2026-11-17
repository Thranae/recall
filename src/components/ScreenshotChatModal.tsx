import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Bot,
  Send,
  RotateCcw,
  Volume2,
  VolumeX,
  Copy,
  Check,
  Loader2,
  Image as ImageIcon,
  ChevronUp,
  ChevronDown,
  X,
} from 'lucide-react';
import { api } from '../services/api';
import type { Screenshot, ScreenshotChatMessage } from '../types';

interface ScreenshotChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshot: Screenshot;
  chatMessages: ScreenshotChatMessage[];
  setChatMessages: React.Dispatch<React.SetStateAction<ScreenshotChatMessage[]>>;
  initialPrompt?: string;
}

const CHAT_PROMPT_SUGGESTIONS = [
  'Summarize what is happening here',
  'Extract all text, numbers & codes',
  'Explain context & key takeaways',
  'Find any prices, totals, or dates',
  'Who is talking or visible here?',
];

function renderInlineStyles(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={match.index} className="font-bold text-slate-900">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={match.index}
          className="rounded-md bg-blue-50/80 border border-blue-100/60 px-1.5 py-0.5 font-mono text-[11px] text-[#3478F6] font-semibold"
        >
          {token.slice(1, -1)}
        </code>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

function renderFormattedAiText(text: string) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          const bulletContent = trimmed.substring(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#3478F6] font-bold text-[14px] leading-tight">•</span>
              <div className="flex-1 font-medium text-slate-800">
                {renderInlineStyles(bulletContent)}
              </div>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-[#3478F6] font-bold text-[12px] leading-tight min-w-[16px]">
                {numMatch[1]}.
              </span>
              <div className="flex-1 font-medium text-slate-800">
                {renderInlineStyles(numMatch[2])}
              </div>
            </div>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-[13px] font-bold text-slate-900 pt-1">
              {renderInlineStyles(trimmed.substring(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-[14px] font-bold text-slate-900 pt-1.5">
              {renderInlineStyles(trimmed.substring(3))}
            </h3>
          );
        }

        return (
          <p key={idx} className="text-slate-700 font-normal">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

export const ScreenshotChatModal: React.FC<ScreenshotChatModalProps> = ({
  isOpen,
  onClose,
  screenshot,
  chatMessages,
  setChatMessages,
  initialPrompt,
}) => {
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const imageUrl = api.getImageUrl(screenshot.id);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        scrollToBottom('auto');
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    scrollToBottom('smooth');
  }, [chatMessages, isChatting, scrollToBottom]);

  useEffect(() => {
    if (isOpen && initialPrompt) {
      handleSendMessage(initialPrompt);
    }
  }, [isOpen, initialPrompt]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = (customPrompt ?? chatInput).trim();
    if (!messageText || isChatting) return;

    const userMsgId = 'user_' + Date.now();
    const newUserMsg: ScreenshotChatMessage = {
      id: userMsgId,
      role: 'user',
      text: messageText,
      timestamp: Date.now(),
    };

    const nextMessages = [...chatMessages, newUserMsg];
    setChatMessages(nextMessages);
    setChatInput('');
    setIsChatting(true);
    setChatError(null);

    try {
      const historyPayload = chatMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await api.askScreenshot(screenshot.id, messageText, historyPayload);

      const aiMsgId = 'ai_' + Date.now();
      const newAiMsg: ScreenshotChatMessage = {
        id: aiMsgId,
        role: 'assistant',
        text: res.answer,
        provider: 'Recall AI',
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, newAiMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setChatError(err.message || 'Could not inspect this screenshot right now.');
    } finally {
      setIsChatting(false);
    }
  };

  const handleCopyMessage = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 1800);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSpeakMessage = (id: string, text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (speakingMsgId === id) {
      window.speechSynthesis.cancel();
      setSpeakingMsgId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[#*`_]/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => setSpeakingMsgId(null);
    utterance.onerror = () => setSpeakingMsgId(null);
    setSpeakingMsgId(id);
    window.speechSynthesis.speak(utterance);
  };

  const handleRestartChat = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setChatMessages([]);
    setChatError(null);
    setChatInput('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed inset-0 z-50 flex flex-col bg-[#F3F7FC] text-slate-800"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
          }}
        >
          {/* Top Specular Header Hairline */}
          <div
            className="fixed top-0 inset-x-0 h-px pointer-events-none z-30"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 70%, transparent 100%)',
            }}
          />

          {/* 1. Header Navigation Bar */}
          <header className="relative z-20 flex items-center justify-between px-4 py-2.5 bg-white/80 backdrop-blur-xl border-b border-white/80 shadow-xs shrink-0">
            {/* Left: Back button & Screenshot Context */}
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={onClose}
                aria-label="Back to screenshot details"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="h-4.5 w-4.5 stroke-[2.3]" />
              </button>

              <button
                type="button"
                onClick={() => setShowImagePreview((prev) => !prev)}
                className="flex items-center gap-2 text-left group min-w-0 cursor-pointer"
                title="Tap to toggle screenshot reference"
              >
                <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white shadow-xs bg-slate-200">
                  <img
                    src={imageUrl}
                    alt={screenshot.original_filename}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-[13px] font-bold text-slate-900 leading-tight">
                      Recall AI Vision
                    </h2>
                    <span className="rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-1.5 py-0.2 text-[8.5px] font-bold">
                      Active
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[160px] sm:max-w-[220px]">
                    {screenshot.original_filename}
                  </p>
                </div>
              </button>
            </div>

            {/* Right: Photo Reference Toggle & Restart */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setShowImagePreview((prev) => !prev)}
                className={`flex h-8 items-center gap-1 rounded-full px-2.5 text-[11px] font-bold border transition-all cursor-pointer shadow-2xs active:scale-95 ${
                  showImagePreview
                    ? 'bg-[#3478F6] text-white border-[#3478F6]'
                    : 'bg-white/80 hover:bg-white text-slate-700 border-white/90'
                }`}
                title="Toggle visual reference image"
              >
                <ImageIcon className="h-3.5 w-3.5 stroke-[2.2]" />
                <span className="hidden xs:inline">{showImagePreview ? 'Hide Photo' : 'View Photo'}</span>
                {showImagePreview ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {chatMessages.length > 0 && (
                <button
                  type="button"
                  onClick={handleRestartChat}
                  title="Clear and restart conversation"
                  aria-label="Clear and restart conversation"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/80 hover:bg-white border border-white/90 text-slate-600 active:scale-95 transition-all cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="h-3.5 w-3.5 stroke-[2.2]" />
                </button>
              )}
            </div>
          </header>

          {/* 2. Collapsible Screenshot Photo Reference Drawer */}
          <AnimatePresence>
            {showImagePreview && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden border-b border-white/80 bg-slate-900/90 backdrop-blur-xl shrink-0"
              >
                <div className="p-3 flex items-center justify-center relative">
                  <img
                    src={imageUrl}
                    alt={screenshot.original_filename}
                    className="max-h-[32vh] w-auto max-w-full rounded-2xl object-contain shadow-2xl border border-white/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowImagePreview(false)}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 hover:bg-black/70 text-white cursor-pointer active:scale-90"
                    title="Close preview"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Full-Screen Chat Conversation Stream */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 overscroll-contain"
          >
            {/* Welcome Card & Starter Prompts when conversation is empty */}
            {chatMessages.length === 0 && (
              <div className="max-w-md mx-auto space-y-4 pt-3 pb-2">
                <div className="rounded-[26px] liquid-glass-card p-5 space-y-3 border border-white/90 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#3478F6] to-[#0052cc] text-white shadow-sm">
                      <Bot className="h-5.5 w-5.5" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-slate-900 leading-tight">
                        Chat with Recall AI
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium pt-0.5">
                        Direct visual intelligence about this screenshot
                      </p>
                    </div>
                  </div>

                  <p className="text-[12px] text-slate-600 leading-relaxed font-normal">
                    Ask anything about conversations, dates, prices, people, codes, or hidden details inside this image. Answers are precise, direct, and retain context throughout our conversation.
                  </p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {CHAT_PROMPT_SUGGESTIONS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        disabled={isChatting}
                        onClick={() => handleSendMessage(prompt)}
                        className="w-full text-left rounded-[18px] bg-white/80 hover:bg-white border border-white/90 px-4 py-3 text-[12px] font-semibold text-slate-700 active:scale-[0.99] transition-all cursor-pointer shadow-2xs flex items-center justify-between group"
                      >
                        <span className="truncate pr-2">{prompt}</span>
                        <Send className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#3478F6] transition-colors shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Message Thread */}
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} space-y-1`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] rounded-[22px] rounded-br-[4px] bg-gradient-to-r from-[#3478F6] to-[#2060DC] px-4 py-2.5 text-[13px] font-medium text-white shadow-xs leading-relaxed">
                    {msg.text}
                  </div>
                ) : (
                  <div className="max-w-[95%] sm:max-w-[88%] w-full rounded-[24px] rounded-tl-[4px] liquid-glass-card border border-white/95 p-4 space-y-2.5 shadow-2xs">
                    {/* Assistant Message Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100/80 pb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-5.5 w-5.5 items-center justify-center rounded-full bg-[#3478F6]/10 text-[#3478F6]">
                          <Bot className="h-3.5 w-3.5" />
                        </div>
                        <span className="text-[12px] font-bold text-slate-800">Recall AI</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSpeakMessage(msg.id, msg.text)}
                          title={speakingMsgId === msg.id ? 'Stop speaking' : 'Read aloud'}
                          aria-label={speakingMsgId === msg.id ? 'Stop speaking' : 'Read aloud'}
                          className={`flex h-7 w-7 items-center justify-center rounded-full active:scale-90 transition-all cursor-pointer ${
                            speakingMsgId === msg.id
                              ? 'bg-[#3478F6] text-white shadow-2xs'
                              : 'bg-white/80 hover:bg-white text-slate-500'
                          }`}
                        >
                          {speakingMsgId === msg.id ? (
                            <VolumeX className="h-3.5 w-3.5" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg.id, msg.text)}
                          title="Copy response"
                          aria-label="Copy response"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/80 hover:bg-white text-slate-500 active:scale-90 transition-all cursor-pointer"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.5]" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {renderFormattedAiText(msg.text)}
                  </div>
                )}
              </div>
            ))}

            {/* Thinking Indicator */}
            {isChatting && (
              <div className="flex items-center gap-2 rounded-[20px] liquid-glass-card border border-white/90 px-4 py-2.5 max-w-[70%] shadow-2xs">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#3478F6]/10 text-[#3478F6]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                </div>
                <span className="text-[12px] font-semibold text-slate-600">
                  Thinking...
                </span>
                <div className="flex items-center gap-1 pl-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3478F6] animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3478F6] animate-pulse delay-100" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#3478F6] animate-pulse delay-200" />
                </div>
              </div>
            )}

            {chatError && (
              <div className="rounded-[16px] bg-rose-50 border border-rose-200 p-3 text-[12px] font-medium text-rose-700 flex items-center justify-between gap-2">
                <span>{chatError}</span>
                <button
                  type="button"
                  onClick={() => setChatError(null)}
                  className="p-1 text-rose-500 hover:text-rose-700 active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* 4. Bottom Sticky Liquid Chat Input Bar */}
          <footer
            className="relative z-20 px-4 py-2.5 bg-white/90 backdrop-blur-xl border-t border-white/80 shadow-lg shrink-0"
            style={{
              paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="max-w-md mx-auto flex items-center gap-2"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  ref={inputRef}
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Chat with AI about this screenshot..."
                  disabled={isChatting}
                  className="w-full h-11 rounded-full liquid-glass-input pl-4 pr-11 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/30 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={isChatting || !chatInput.trim()}
                  aria-label="Send message"
                  className="absolute right-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-[#3478F6] text-white disabled:opacity-30 active:scale-90 transition-all cursor-pointer shadow-xs"
                >
                  {isChatting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          </footer>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
