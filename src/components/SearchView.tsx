import React from 'react';
import {
  Search,
  X,
  MessageSquare,
  Trophy,
  ShoppingBag,
  FileText,
  SlidersHorizontal,
  Layers,
  SearchX,
  Loader2,
  Compass,
  Target,
  Brain,
  ArrowUpRight,
  Mic,
  MicOff,
  Volume2,
} from 'lucide-react';
import { api } from '../services/api';
import type { SearchResponse, SearchResultItem, VaultAnswer } from '../types';
import { ScreenshotCard } from './ScreenshotCard';

interface SearchViewProps {
  query: string;
  onChangeQuery: (q: string) => void;
  onSubmitSearch: (e?: React.FormEvent) => void;
  onClearSearch: () => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  isSearching: boolean;
  searchResults: SearchResponse | null;
  onSelectScreenshot: (id: string, searchResult?: SearchResultItem) => void;
}

const CATEGORIES = [
  { id: 'all', label: 'All', icon: SlidersHorizontal },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'other', label: 'Other', icon: Layers },
];

const SUGGESTED_QUERIES = [
  {
    title: 'Chat Sequence',
    description: 'Find replies in conversation flow',
    query: 'I said "I love you" and she replied "I love you too"',
    icon: MessageSquare,
  },
  {
    title: 'Match Stats',
    description: 'Find matches with high kill count',
    query: 'BGMI match with kills > 15',
    icon: Trophy,
  },
  {
    title: 'Visual Subject',
    description: 'People, clothing, colors & scenes',
    query: 'boy in black shirt',
    icon: ShoppingBag,
  },
  {
    title: 'Document & OCR',
    description: 'Event dates, addresses, text',
    query: 'Coimbatore fest address',
    icon: FileText,
  },
];

export const SearchView: React.FC<SearchViewProps> = ({
  query,
  onChangeQuery,
  onSubmitSearch,
  onClearSearch,
  selectedCategory,
  onSelectCategory,
  isSearching,
  searchResults,
  onSelectScreenshot,
}) => {
  const [isAskingAi, setIsAskingAi] = React.useState(false);
  const [vaultAnswer, setVaultAnswer] = React.useState<VaultAnswer | null>(null);
  const [askResponse, setAskResponse] = React.useState<SearchResponse | null>(null);
  const [askError, setAskError] = React.useState<string | null>(null);
  const [isListening, setIsListening] = React.useState(false);
  const [isSpeaking, setIsSpeaking] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  const speechSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  React.useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
        window.speechSynthesis?.cancel?.();
      } catch {}
    };
  }, []);

  React.useEffect(() => {
    if (!query.trim()) {
      setVaultAnswer(null);
      setAskResponse(null);
      setAskError(null);
    }
  }, [query]);

  React.useEffect(() => {
    setVaultAnswer(null);
    setAskResponse(null);
    setAskError(null);
  }, [searchResults]);

  const activeResults = searchResults || askResponse;

  const runAskWithText = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed) return;
    setIsAskingAi(true);
    setAskError(null);
    try {
      const res = await api.askVault(trimmed, selectedCategory);
      setVaultAnswer(res.ai_answer);
      setAskResponse(res);
    } catch (err: any) {
      setAskError(err.message || 'Could not synthesize an AI answer right now.');
    } finally {
      setIsAskingAi(false);
    }
  };

  const handleAskAi = async () => {
    if (isAskingAi) return;
    await runAskWithText(query);
  };

  const handleToggleVoice = () => {
    if (!speechSupported) {
      setAskError('Voice recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }

    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRec();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      const spoken = event?.results?.[0]?.[0]?.transcript?.trim();
      setIsListening(false);
      if (spoken) {
        onChangeQuery(spoken);
        runAskWithText(spoken);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setAskError(null);
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      setIsListening(false);
    }
  };

  const handleToggleSpeak = (text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-2 pb-36 space-y-4">
      {/* 1. Plump Liquid Glass Search Bar */}
      <form onSubmit={onSubmitSearch} className="relative">
        <div className="flex h-13 items-center rounded-[20px] liquid-glass-input px-3.5 transition-all duration-150">
          <div className="shrink-0 relative z-10 flex items-center justify-center">
            {isSearching || isAskingAi ? (
              <Loader2 className="h-4.5 w-4.5 animate-spin text-[#3478F6]" />
            ) : (
              <Search className="h-4.5 w-4.5 stroke-[2.3] text-[#3478F6]" />
            )}
          </div>

          <input
            type="text"
            value={query}
            onChange={(e) => onChangeQuery(e.target.value)}
            placeholder={isListening ? 'Listening... say a photo, color, or chat' : 'Search photos, people, colors, chats...'}
            className="w-full bg-transparent px-3 text-[13px] font-semibold text-[#172B4D] placeholder:text-[#4A5D78]/70 focus:outline-none relative z-10"
          />

          {speechSupported && !query.trim() && (
            <button
              type="button"
              onClick={handleToggleVoice}
              title={isListening ? 'Stop voice listening' : 'Voice recall'}
              aria-label={isListening ? 'Stop voice listening' : 'Voice recall'}
              className={`flex h-8 w-8 shrink-0 mr-1.5 items-center justify-center rounded-full relative z-10 transition-all active:scale-90 cursor-pointer ${
                isListening
                  ? 'bg-rose-500 text-white animate-pulse shadow-xs'
                  : 'liquid-glass-pill text-[#3478F6]'
              }`}
            >
              {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5 stroke-[2.2]" />}
            </button>
          )}

          {query && (
            <button
              type="button"
              onClick={() => {
                setVaultAnswer(null);
                setAskResponse(null);
                setAskError(null);
                onClearSearch();
              }}
              aria-label="Clear search"
              className="p-1 text-[#4A5D78] hover:text-[#172B4D] active:scale-90 transition-transform cursor-pointer mr-1 relative z-10"
            >
              <X className="h-4 w-4 stroke-[2.2]" />
            </button>
          )}

          {query.trim() && (
            <button
              type="button"
              onClick={handleAskAi}
              disabled={isAskingAi || isSearching}
              title="Ask Recall AI across your gallery"
              className="h-9 shrink-0 mr-1.5 rounded-full px-3 text-[11.5px] font-bold relative z-10 liquid-glass-pill text-[#172B4D] active:scale-95 transition-all cursor-pointer flex items-center gap-1"
            >
              <Brain className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.2]" />
              <span>Ask AI</span>
            </button>
          )}

          <button
            type="submit"
            disabled={isSearching}
            className={`h-9 shrink-0 rounded-full px-4 text-xs font-bold relative z-10 transition-all cursor-pointer shadow-xs flex items-center justify-center ${
              query.trim()
                ? 'liquid-btn-primary text-white active:scale-95'
                : 'liquid-glass-pill text-[#3478F6] active:scale-95'
            }`}
          >
            Search
          </button>
        </div>
      </form>

      {/* 2. Symmetrical Liquid Glass Filter Chips (3 Chips, Generous Width, Full Text Visibility) */}
      <div className="grid grid-cols-3 gap-2.5 w-full">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onSelectCategory(cat.id)}
              className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
                isSelected ? 'liquid-filter-chip-active' : ''
              }`}
            >
              <Icon className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${isSelected ? 'text-[#3478F6]' : 'text-slate-500'}`} />
              <span className="whitespace-nowrap text-[12px] font-semibold">{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. Search Discovery Mode (When no active results) */}
      {!activeResults && !query.trim() && (
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-bold text-[#172B4D] flex items-center gap-1.5 tracking-tight">
              <Compass className="h-4 w-4 text-[#3478F6] stroke-[2.2]" />
              <span>Suggested Explorations</span>
            </span>
            <span className="text-[11px] font-mono text-slate-400">Tap to search</span>
          </div>

          {/* 2x2 Clean Plump Liquid Glass Card Grid */}
          <div className="grid grid-cols-2 gap-3.5">
            {SUGGESTED_QUERIES.map((item, idx) => {
              const Icon = item.icon;
              const iconColors = [
                'bg-blue-50 text-[#3478F6] border border-blue-100',
                'bg-sky-50 text-sky-700 border border-sky-100',
                'bg-indigo-50 text-indigo-700 border border-indigo-100',
                'bg-cyan-50 text-cyan-700 border border-cyan-100',
              ][idx % 4];

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChangeQuery(item.query)}
                  className="liquid-glass-card flex flex-col justify-between rounded-[22px] p-4 text-left active:scale-[0.97] transition-all duration-200 cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-[14px] shadow-2xs ${iconColors}`}>
                        <Icon className="h-4 w-4 stroke-[2.2]" />
                      </div>
                    </div>
                    <p className="text-[13px] font-bold text-[#172B4D] leading-tight">
                      {item.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 text-[10.5px] font-mono text-[#3478F6] truncate font-semibold">
                    "{item.query}"
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {askError && (
        <div className="rounded-[18px] bg-rose-50/90 border border-rose-200 px-3.5 py-2.5 text-xs text-rose-700 font-medium">
          {askError}
        </div>
      )}

      {/* 4. Active Search Results */}
      {activeResults && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-800 font-mono">
                {activeResults.total_results} {activeResults.total_results === 1 ? 'result' : 'results'}
              </span>

              {activeResults.parsed_intent.is_conversation_sequence && (
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px]">
                  Chat Sequence
                </span>
              )}
              {activeResults.parsed_intent.is_game_stat_query && (
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] text-amber-700">
                  Game Filter
                </span>
              )}
              {activeResults.parsed_intent.is_visual_query && (
                <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] text-indigo-700">
                  Visual Subject
                </span>
              )}
            </div>

            {!vaultAnswer && activeResults.results.length > 0 && (
              <button
                type="button"
                onClick={handleAskAi}
                disabled={isAskingAi}
                className="flex items-center gap-1 rounded-full liquid-glass-pill px-2.5 py-1 text-[10.5px] font-bold text-[#3478F6] active:scale-95 transition-all cursor-pointer"
              >
                <Brain className="h-3 w-3 stroke-[2.2]" />
                <span>{isAskingAi ? 'Thinking...' : 'Synthesize'}</span>
              </button>
            )}
          </div>

          {/* Ask Recall AI Synthesized Answer Card */}
          {vaultAnswer && (
            <div className="rounded-[22px] p-4 bg-gradient-to-br from-[#3478F6]/12 via-white/88 to-indigo-500/8 border border-white shadow-sm backdrop-blur-md space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#3478F6]/15 text-[#3478F6]">
                    <Brain className="h-3.5 w-3.5 stroke-[2.2]" />
                  </div>
                  <span className="text-[11px] font-bold text-[#172B4D] uppercase tracking-wider">
                    Recall AI Answer
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {typeof window !== 'undefined' && 'speechSynthesis' in window && (
                    <button
                      type="button"
                      onClick={() => handleToggleSpeak(vaultAnswer.answer)}
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold border transition-all cursor-pointer ${
                        isSpeaking
                          ? 'bg-[#3478F6] text-white border-[#3478F6]'
                          : 'bg-white/80 text-slate-600 border-white hover:text-[#3478F6]'
                      }`}
                    >
                      <Volume2 className="h-3 w-3" />
                      <span>{isSpeaking ? 'Stop' : 'Speak'}</span>
                    </button>
                  )}
                  <span className="rounded-full bg-white/80 border border-white px-2 py-0.5 text-[9.5px] font-semibold text-slate-500">
                    {vaultAnswer.provider}
                  </span>
                </div>
              </div>

              <p className="text-[13px] font-medium text-[#172B4D] leading-relaxed">
                {vaultAnswer.answer}
              </p>

              {vaultAnswer.cited_ids.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {vaultAnswer.cited_ids.map((cid) => {
                    const citedItem = activeResults.results.find((r) => r.screenshot.id === cid);
                    if (!citedItem) return null;
                    return (
                      <button
                        key={cid}
                        type="button"
                        onClick={() => onSelectScreenshot(citedItem.screenshot.id, citedItem)}
                        className="inline-flex items-center gap-1 rounded-full bg-white/85 hover:bg-white border border-blue-100 px-2.5 py-1 text-[10.5px] font-semibold text-[#3478F6] shadow-2xs active:scale-95 transition-all cursor-pointer max-w-[190px]"
                      >
                        <span className="truncate">{citedItem.screenshot.original_filename}</span>
                        <ArrowUpRight className="h-3 w-3 shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Top Direct Answer Callout if high-precision value detected */}
          {activeResults.results.length > 0 && activeResults.results[0].precise_value && activeResults.results[0].match_score >= 0.88 && (
            <div
              onClick={() => onSelectScreenshot(activeResults.results[0].screenshot.id, activeResults.results[0])}
              className="rounded-[22px] p-4 bg-gradient-to-br from-blue-500/10 via-white/80 to-blue-500/5 border border-white/90 shadow-sm backdrop-blur-md cursor-pointer active:scale-[0.98] transition-all"
            >
              <div className="flex items-center justify-between gap-1 mb-1.5">
                <div className="flex items-center gap-1.5">
                  <Target className="h-4 w-4 text-[#3478F6] stroke-[2.2]" />
                  <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                    Direct Answer
                  </span>
                </div>
                {activeResults.results[0].precise_value.badge && (
                  <span className="liquid-category-badge px-2 py-0.5 text-[9.5px] font-bold text-[#3478F6]">
                    {activeResults.results[0].precise_value.badge}
                  </span>
                )}
              </div>
              <h3 className="text-sm font-bold text-[#172B4D] leading-snug">
                {activeResults.results[0].precise_value.headline}
              </h3>
              <p className="mt-1 text-xs text-slate-600 font-normal">
                {activeResults.results[0].precise_value.detail}
              </p>
            </div>
          )}

          {activeResults.results.length === 0 ? (
            <div className="liquid-glass-card flex flex-col items-center justify-center rounded-[24px] p-8 text-center my-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] liquid-icon-pod mb-3 text-slate-400">
                <SearchX className="h-7 w-7 stroke-[2]" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No matching screenshots</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-xs font-normal">
                Try searching by people, colors like 'black shirt', words in a chat, or game stats like 'kills &gt; 10'.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {activeResults.results.map((item) => (
                <ScreenshotCard
                  key={item.screenshot.id}
                  screenshot={item.screenshot}
                  searchResult={item}
                  onClick={() => onSelectScreenshot(item.screenshot.id, item)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
