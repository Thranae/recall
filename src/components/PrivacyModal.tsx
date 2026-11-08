import React from 'react';
import { X, ShieldCheck, Lock, Trash2, EyeOff, Cpu } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl shadow-black/80 max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Privacy & Security Guarantees</h3>
            <p className="text-xs text-slate-400 font-mono">RECALL Privacy Standards • PRD Section 10</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
            <Lock className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">Private by Default & User-Isolated</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Screenshots belong solely to your authenticated account. Database queries, vector search, and image endpoints enforce strict <code className="text-indigo-300">user_id</code> verification on the server. No user can ever access another user's content.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
            <EyeOff className="h-5 w-5 text-purple-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">No Third-Party Model Training</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Your personal screenshot images, conversations, and addresses are never used for model training. Text and OCR features are processed ephemerally solely for indexing your personal search library.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
            <Trash2 className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">Irreversible Cascading Deletion</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                When you delete a screenshot, RECALL permanently deletes the physical file from disk alongside all extracted conversation bubbles, game statistics, full-text tokens, and vector embeddings atomically.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 p-3.5 border border-slate-800/80">
            <Cpu className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-white">Local OCR & Deterministic Heuristics</h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Built-in Tesseract OCR and local semantic vectorizers allow the system to function completely offline without relying on external cloud providers if you choose to operate without API keys.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700"
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
