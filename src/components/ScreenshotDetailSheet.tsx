import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  Calendar,
  Tag,
  Copy,
  Check,
  Loader2,
  MessageSquare,
  Trophy,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  HardDrive,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Download,
  Layers,
  Zap,
  Undo2,
  Pencil,
  Bot,
  FileText,
  Info,
  Scan,
  ScanText,
  KeyRound,
  CreditCard,
  Crown,
} from 'lucide-react';
import { lockBodyScroll } from '../utils/scrollLock';
import { api } from '../services/api';
import { classifyScreenshotPrecisely, getPreciseCategoryMeta } from '../utils/classifier';
import { extractSmartActions, triggerCalendarDownload, type SmartActionItem } from '../utils/smartActions';
import { downloadImageFile } from '../utils/fileDownload';
import { useBackButton } from '../utils/backHandler';
import { ScreenshotChatModal } from './ScreenshotChatModal';
import { ThreadStitcherModal } from './ThreadStitcherModal';
import {
  loadUntaintedImage,
  detectSensitiveRegions,
  extractOcrWordHints,
  composeRedactedImage,
  getStatusBarRegions,
  extractSensitiveHintsFromText,
  generateRedactedImage,
  type RedactRegion,
} from '../utils/privacyRedact';
import type {
  Screenshot,
  ExtractedMessage,
  GameResult,
  SearchResultItem,
  SimilarMemoryItem,
  SmartCoachResponse,
  AiRedactWordHint,
  LiveInspectorNode,
  ScreenshotChatMessage,
  ThreadGroup,
} from '../types';
import { extractLiveInspectorNodes } from '../utils/visualInspector';

type ScreenshotDetailData = {
  screenshot: Screenshot;
  messages: ExtractedMessage[];
  game_result: GameResult | null;
};

interface ScreenshotDetailSheetProps {
  screenshotId: string | null;
  initialScreenshot?: Screenshot;
  searchResult?: SearchResultItem;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
  onSelectTag?: (tag: string) => void;
  onSelectRelated?: (id: string) => void;
  isPro?: boolean;
  onOpenSubscription?: () => void;
}

const getInspectorNodeIcon = (kind: LiveInspectorNode['kind']) => {
  switch (kind) {
    case 'otp':
      return KeyRound;
    case 'money':
      return CreditCard;
    case 'game':
      return Trophy;
    case 'discount':
      return Tag;
    case 'calendar':
      return Calendar;
    case 'phone':
      return Phone;
    case 'email':
      return Mail;
    case 'url':
      return ExternalLink;
    case 'formula':
    case 'code':
      return FileText;
    default:
      return Eye;
  }
};

export const ScreenshotDetailSheet: React.FC<ScreenshotDetailSheetProps> = ({
  screenshotId,
  initialScreenshot,
  searchResult,
  onClose,
  onDeleted,
  onUpdated,
  onSelectTag,
  onSelectRelated,
  isPro = false,
  onOpenSubscription,
}) => {
  const [data, setData] = useState<ScreenshotDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ocr' | 'info'>('content');
  const [isFullScreenChatOpen, setIsFullScreenChatOpen] = useState(false);
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | undefined>(undefined);
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [copiedAllFlow, setCopiedAllFlow] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [isVisualLensActive, setIsVisualLensActive] = useState(true);
  const [selectedInspectorNode, setSelectedInspectorNode] = useState<LiveInspectorNode | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [activeInspectorNode, setActiveInspectorNode] = useState<LiveInspectorNode | null>(null);
  const [inspectorCopied, setInspectorCopied] = useState(false);

  // Conversational AI Chat State
  const [chatMessages, setChatMessages] = useState<ScreenshotChatMessage[]>([]);

  const [copiedActionId, setCopiedActionId] = useState<string | null>(null);
  const [similarItems, setSimilarItems] = useState<SimilarMemoryItem[]>([]);
  const [coachData, setCoachData] = useState<SmartCoachResponse | null>(null);
  const [loadingCoach, setLoadingCoach] = useState(false);
  const [copiedReplyIdx, setCopiedReplyIdx] = useState<number | null>(null);
  const [isRedactedMode, setIsRedactedMode] = useState(false);
  const [isRedacting, setIsRedacting] = useState(false);
  const [aiRedactPrompt, setAiRedactPrompt] = useState('');
  const [activeAiInstruction, setActiveAiInstruction] = useState('');
  const [isAiRedacting, setIsAiRedacting] = useState(false);
  const [aiRedactSummary, setAiRedactSummary] = useState<string | null>(null);
  const [redactBars, setRedactBars] = useState(false);
  const [autoRedactBoxes, setAutoRedactBoxes] = useState<RedactRegion[]>([]);
  const [manualRedactBoxes, setManualRedactBoxes] = useState<RedactRegion[]>([]);
  const [redactError, setRedactError] = useState<string | null>(null);
  const [dragRect, setDragRect] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const [autoInkMasks, setAutoInkMasks] = useState<
    Array<{ id: string; left: number; top: number; width: number; height: number; delayMs: number; mode: 'standard' | 'ai' }>
  >([]);
  const [manualInkMasks, setManualInkMasks] = useState<
    Array<{ id: string; left: number; top: number; width: number; height: number }>
  >([]);
  const [redactedResult, setRedactedResult] = useState<{ dataUrl: string; blob: Blob; redactedCount: number } | null>(null);
  const loadedRedactImgRef = useRef<HTMLImageElement | null>(null);
  const ocrWordHintsRef = useRef<AiRedactWordHint[] | null>(null);

  // Screenshot Renaming State
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSafeSharing, setIsSafeSharing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Thread Membership State
  const [matchedThread, setMatchedThread] = useState<ThreadGroup | null>(null);
  const [threadPartNumber, setThreadPartNumber] = useState<number>(1);
  const [isThreadReelOpen, setIsThreadReelOpen] = useState(false);

  // Back Button Navigation Registration
  useBackButton(
    'detail-fullscreen-chat',
    100,
    () => {
      setIsFullScreenChatOpen(false);
      setInitialChatPrompt(undefined);
      return true;
    },
    isFullScreenChatOpen
  );

  useBackButton(
    'detail-thread-reel',
    100,
    () => {
      setIsThreadReelOpen(false);
      return true;
    },
    isThreadReelOpen
  );

  useBackButton(
    'detail-delete-confirm',
    95,
    () => {
      setShowDeleteConfirm(false);
      return true;
    },
    showDeleteConfirm
  );

  useBackButton(
    'detail-expanded-img',
    90,
    () => {
      setIsImageExpanded(false);
      return true;
    },
    isImageExpanded
  );

  useBackButton(
    'detail-redacted-mode',
    90,
    () => {
      setIsRedactedMode(false);
      return true;
    },
    isRedactedMode
  );

  useBackButton(
    'detail-edit-name',
    85,
    () => {
      setIsEditingName(false);
      return true;
    },
    isEditingName
  );

  useEffect(() => {
    if (!screenshotId) {
      setMatchedThread(null);
      return;
    }
    api
      .getThreads()
      .then((res) => {
        const list = res?.threads || [];
        for (const t of list) {
          const ids =
            t.screenshotIds && t.screenshotIds.length > 0
              ? t.screenshotIds
              : t.screenshots?.map((s) => s.id) || [];
          const idx = ids.indexOf(screenshotId);
          if (idx !== -1) {
            setMatchedThread(t);
            setThreadPartNumber(idx + 1);
            return;
          }
        }
        setMatchedThread(null);
      })
      .catch(() => setMatchedThread(null));
  }, [screenshotId]);

  useEffect(() => {
    if (data?.screenshot?.original_filename) {
      setNewName(data.screenshot.original_filename);
    }
  }, [data?.screenshot?.original_filename]);

  const inspectorNodes = useMemo(() => {
    return extractLiveInspectorNodes(data?.screenshot, data?.messages || []);
  }, [data?.screenshot, data?.messages]);

  const handleInspectorAction = (node: LiveInspectorNode) => {
    setActiveInspectorNode(node);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(10);
      } catch {}
    }
    if (node.href) {
      window.open(node.href, '_blank');
      return;
    }
    if (node.kind === 'calendar' && data?.screenshot) {
      triggerCalendarDownload(node.label, node.value, 'See Screenshot');
      return;
    }
    navigator.clipboard.writeText(node.value);
    setInspectorCopied(true);
    setTimeout(() => setInspectorCopied(false), 2000);
  };

  const handleCopyAllSummary = () => {
    if (!data?.screenshot) return;
    const lines = [
      `📋 RECALL Key Extract: ${data.screenshot.original_filename}`,
      `• Category: ${data.screenshot.category}`,
    ];
    if (inspectorNodes.length > 0) {
      inspectorNodes.forEach((node) => {
        lines.push(`• ${node.label}: ${node.value}`);
      });
    }
    if (data.screenshot.visual_description) {
      lines.push(`• Overview: ${data.screenshot.visual_description}`);
    }
    const fullText = lines.join('\n');
    navigator.clipboard.writeText(fullText);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  const handleExportStructuredData = () => {
    if (!data?.screenshot || inspectorNodes.length === 0) return;
    const exportPayload = {
      filename: data.screenshot.original_filename,
      extracted_at: new Date().toISOString(),
      category: data.screenshot.category,
      ocr_text: data.screenshot.ocr_text,
      entities: inspectorNodes.map((n) => ({
        kind: n.kind,
        label: n.label,
        value: n.value,
        href: n.href,
      })),
      smart_actions: smartActions.map((a) => ({
        kind: a.kind,
        label: a.label,
        value: a.value,
      })),
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(data.screenshot.original_filename || 'screenshot').replace(/\.[^/.]+$/, '')}_data.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const redactBoxRef = useRef<HTMLDivElement | null>(null);
  const animTimersRef = useRef<number[]>([]);
  const dragSessionRef = useRef<{
    normX: number;
    normY: number;
    startClientX: number;
    startClientY: number;
    bounds: { left: number; top: number; width: number; height: number; containerLeft: number; containerTop: number };
  } | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load screenshot details
  const fetchDetails = (id: string, isInitial = false) => {
    if (isInitial) setLoading(true);
    api
      .getScreenshotDetails(id)
      .then((res: ScreenshotDetailData) => {
        setData(res);
        if (isInitial) {
          if (res.screenshot.visual_description || (res.messages && res.messages.length > 0) || res.game_result) {
            setActiveTab('content');
          } else if (res.screenshot.ocr_text) {
            setActiveTab('ocr');
          } else {
            setActiveTab('info');
          }
        }
      })
      .catch((err: unknown) => {
        console.error('Failed to load screenshot details:', err);
      })
      .finally(() => {
        if (isInitial) setLoading(false);
      });
  };

  useEffect(() => {
    setChatMessages([]);
    setIsFullScreenChatOpen(false);
    setInitialChatPrompt(undefined);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setSimilarItems([]);
    setCoachData(null);
    setCopiedActionId(null);
    setCopiedReplyIdx(null);
    setIsRedactedMode(false);
    setAiRedactPrompt('');
    setActiveAiInstruction('');
    setIsAiRedacting(false);
    setAiRedactSummary(null);
    setRedactedResult(null);
    setRedactBars(false);
    setAutoRedactBoxes([]);
    setManualRedactBoxes([]);
    setRedactError(null);
    setDragRect(null);
    setAutoInkMasks([]);
    setManualInkMasks([]);
    animTimersRef.current.forEach((id) => window.clearTimeout(id));
    animTimersRef.current = [];
    loadedRedactImgRef.current = null;
    ocrWordHintsRef.current = null;
    dragSessionRef.current = null;
    if (!screenshotId) {
      setData(null);
      return;
    }

    fetchDetails(screenshotId, true);
    api.getSimilarScreenshots(screenshotId)
      .then((res) => setSimilarItems(res.similar || []))
      .catch(() => {});
  }, [screenshotId]);

  const smartActions = useMemo(
    () => extractSmartActions(data?.screenshot),
    [data?.screenshot]
  );

  const handleSmartAction = (action: SmartActionItem) => {
    if (action.kind === 'calendar' && action.icsPayload) {
      triggerCalendarDownload(action.icsPayload.title, action.icsPayload.dateStr, action.icsPayload.location);
      return;
    }
    if (action.href) {
      window.open(action.href, '_blank', 'noopener,noreferrer');
      return;
    }
    navigator.clipboard.writeText(action.value);
    setCopiedActionId(action.id);
    setTimeout(() => setCopiedActionId(null), 1800);
  };

  const handleLoadCoach = async () => {
    if (!screenshotId || loadingCoach) return;
    setLoadingCoach(true);
    try {
      const res = await api.getCoachInsights(screenshotId);
      setCoachData(res);
    } catch (err) {
      console.error('Coach error:', err);
    } finally {
      setLoadingCoach(false);
    }
  };

  const rebuildRedactedPreview = async (
    img: HTMLImageElement,
    nextAutoBoxes: RedactRegion[],
    nextManualBoxes: RedactRegion[],
    includeBars: boolean
  ) => {
    const combinedBoxes = [
      ...getStatusBarRegions(includeBars, includeBars),
      ...nextAutoBoxes,
      ...nextManualBoxes,
    ];
    const composed = await composeRedactedImage(img, combinedBoxes);
    setRedactedResult(composed);
  };

  const toOverlayRect = (
    box: RedactRegion,
    bounds: { left: number; top: number; width: number; height: number; containerLeft: number; containerTop: number }
  ) => {
    const rawW = box.w * bounds.width;
    const rawH = box.h * bounds.height;
    const isSurgical = box.source === 'ai' || box.source === 'manual';
    const padX = isSurgical ? Math.max(1, Math.round(rawW * 0.015)) : Math.max(4, Math.max(rawW * 0.05, Math.min(rawW, rawH) * 0.15) + 2);
    const padY = isSurgical ? Math.max(1, Math.round(rawH * 0.02)) : Math.max(3, Math.max(rawH * 0.08, Math.min(rawW, rawH) * 0.12) + 2);
    const imgOffsetX = bounds.left - bounds.containerLeft;
    const imgOffsetY = bounds.top - bounds.containerTop;
    const left = Math.max(imgOffsetX, imgOffsetX + box.x * bounds.width - padX);
    const top = Math.max(imgOffsetY, imgOffsetY + box.y * bounds.height - padY);
    const maxW = imgOffsetX + bounds.width - left;
    const maxH = imgOffsetY + bounds.height - top;
    return {
      left,
      top,
      width: Math.max(4, Math.min(maxW, rawW + padX * 2)),
      height: Math.max(4, Math.min(maxH, rawH + padY * 2)),
    };
  };

  const triggerInkWipeOverlay = (regions: RedactRegion[], mode: 'standard' | 'ai' = 'standard') => {
    animTimersRef.current.forEach((id) => window.clearTimeout(id));
    animTimersRef.current = [];

    const bounds = getRenderedImageBounds();
    if (!bounds || regions.length === 0) {
      setIsRedactedMode(true);
      return;
    }

    const wipeBatch = regions.slice(0, 18).map((box, idx) => ({
      id: `${mode}-${Date.now()}-${idx}`,
      ...toOverlayRect(box, bounds),
      delayMs: Math.min(idx * (mode === 'ai' ? 55 : 32), 200),
      mode,
    }));
    setAutoInkMasks(wipeBatch);

    const commitDelayMs = mode === 'ai' ? 430 : 240;
    const clearDelayMs = mode === 'ai' ? 880 : 680;

    const commitTimerId = window.setTimeout(() => {
      setIsRedactedMode(true);
    }, commitDelayMs);
    const clearTimerId = window.setTimeout(() => {
      setAutoInkMasks([]);
    }, clearDelayMs);
    animTimersRef.current.push(commitTimerId, clearTimerId);
  };

  const runPrivacyRedaction = async (includeBars: boolean) => {
    if (!screenshotId) return;
    setIsRedacting(true);
    setRedactError(null);
    try {
      const img =
        loadedRedactImgRef.current || (await loadUntaintedImage(api.getImageUrl(screenshotId), previewImgRef.current));
      loadedRedactImgRef.current = img;

      const hintSource = [
        data?.screenshot.ocr_text,
        ...(data?.messages || []).map((m) => `${m.sender_label || ''} ${m.message_text || ''}`),
      ]
        .filter(Boolean)
        .join('\n');
      const extraHintTokens = extractSensitiveHintsFromText(hintSource);

      const { boxes: detected, wordHints } = await detectSensitiveRegions(img, {
        extraHintTokens,
      });
      if (wordHints.length > 0) {
        ocrWordHintsRef.current = wordHints;
      }

      setAutoRedactBoxes(detected);
      setAiRedactSummary(null);
      await rebuildRedactedPreview(img, detected, manualRedactBoxes, includeBars);
      triggerInkWipeOverlay([...getStatusBarRegions(includeBars, includeBars), ...detected], 'standard');
    } catch (err: unknown) {
      console.error('Redaction error:', err);
      const message =
        err instanceof Error ? err.message : 'Unable to mask this image right now.';
      setRedactError(message);
    } finally {
      setIsRedacting(false);
    }
  };

  const handleRunAiRedact = async (customInstruction?: string) => {
    if (!screenshotId || isAiRedacting || isRedacting) return;
    const instruction = (customInstruction ?? aiRedactPrompt).trim();
    if (!instruction) return;

    setActiveAiInstruction(instruction);
    setIsAiRedacting(true);
    setRedactError(null);
    setAiRedactSummary(null);
    try {
      const img =
        loadedRedactImgRef.current || (await loadUntaintedImage(api.getImageUrl(screenshotId), previewImgRef.current));
      loadedRedactImgRef.current = img;

      // Never block AI redaction on client Tesseract WASM; warm hints quietly for follow-up runs
      if (!ocrWordHintsRef.current) {
        void extractOcrWordHints(img, 4500)
          .then((hints) => {
            if (!ocrWordHintsRef.current && hints.length > 0) {
              ocrWordHintsRef.current = hints;
            }
          })
          .catch(() => {});
      }

      const res = await api.aiRedactScreenshot(
        screenshotId,
        instruction,
        ocrWordHintsRef.current || []
      );

      const aiRegions: RedactRegion[] = res.targets.map((t) => ({
        x: t.x,
        y: t.y,
        w: t.w,
        h: t.h,
        source: 'ai',
        label: t.label,
      }));

      // Accumulate new AI regions with existing regions so previous redactions stay intact
      const mergedAiBoxes = [...autoRedactBoxes];
      for (const newBox of aiRegions) {
        const isDuplicate = mergedAiBoxes.some(
          (existing) =>
            Math.abs(existing.x - newBox.x) < 0.02 &&
            Math.abs(existing.y - newBox.y) < 0.02 &&
            Math.abs(existing.w - newBox.w) < 0.03 &&
            Math.abs(existing.h - newBox.h) < 0.03
        );
        if (!isDuplicate) {
          mergedAiBoxes.push(newBox);
        }
      }

      setAutoRedactBoxes(mergedAiBoxes);
      setAiRedactSummary(
        mergedAiBoxes.length > aiRegions.length
          ? `${res.summary} (${mergedAiBoxes.length} total masked)`
          : res.summary
      );
      setAiRedactPrompt('');
      await rebuildRedactedPreview(img, mergedAiBoxes, manualRedactBoxes, redactBars);
      triggerInkWipeOverlay(aiRegions, 'ai');
    } catch (err: unknown) {
      console.error('AI targeted redact error:', err);
      setRedactError(
        err instanceof Error ? err.message : 'Could not run AI targeted redaction.'
      );
    } finally {
      setIsAiRedacting(false);
      setActiveAiInstruction('');
    }
  };

  const handleClearAllMasks = async () => {
    animTimersRef.current.forEach((id) => window.clearTimeout(id));
    animTimersRef.current = [];
    setAutoInkMasks([]);
    if (!loadedRedactImgRef.current) return;
    setRedactBars(false);
    setAutoRedactBoxes([]);
    setManualRedactBoxes([]);
    setAiRedactSummary(null);
    try {
      await rebuildRedactedPreview(loadedRedactImgRef.current, [], [], false);
    } catch (err) {
      console.error('Clear masks error:', err);
    }
  };

  const handleToggleRedact = async () => {
    if (isRedacting || isAiRedacting) return;
    if (isRedactedMode) {
      animTimersRef.current.forEach((id) => window.clearTimeout(id));
      animTimersRef.current = [];
      setAutoInkMasks([]);
      setIsRedactedMode(false);
      setDragRect(null);
      return;
    }
    if (redactedResult) {
      setRedactError(null);
      triggerInkWipeOverlay(
        [
          ...getStatusBarRegions(redactBars, redactBars),
          ...autoRedactBoxes,
          ...manualRedactBoxes,
        ],
        aiRedactSummary && autoRedactBoxes.some((b) => b.source === 'ai') ? 'ai' : 'standard'
      );
      return;
    }
    await runPrivacyRedaction(redactBars);
  };

  const handleToggleStatusBars = async () => {
    const next = !redactBars;
    setRedactBars(next);
    if (loadedRedactImgRef.current) {
      try {
        await rebuildRedactedPreview(
          loadedRedactImgRef.current,
          autoRedactBoxes,
          manualRedactBoxes,
          next
        );
      } catch (err) {
        console.error('Status bar mask error:', err);
      }
    } else {
      await runPrivacyRedaction(next);
    }
  };

  const handleUndoLastRedact = async () => {
    if (!loadedRedactImgRef.current) return;
    if (manualRedactBoxes.length > 0) {
      const nextManual = manualRedactBoxes.slice(0, -1);
      setManualRedactBoxes(nextManual);
      try {
        await rebuildRedactedPreview(
          loadedRedactImgRef.current,
          autoRedactBoxes,
          nextManual,
          redactBars
        );
      } catch (err) {
        console.error('Undo manual redact error:', err);
      }
      return;
    }

    if (autoRedactBoxes.length > 0) {
      const nextAuto = autoRedactBoxes.slice(0, -1);
      setAutoRedactBoxes(nextAuto);
      try {
        await rebuildRedactedPreview(
          loadedRedactImgRef.current,
          nextAuto,
          manualRedactBoxes,
          redactBars
        );
      } catch (err) {
        console.error('Undo auto redact error:', err);
      }
    }
  };

  const getRenderedImageBounds = () => {
    const imgEl = previewImgRef.current;
    const boxEl = redactBoxRef.current;
    if (!imgEl || !boxEl || !imgEl.naturalWidth || !imgEl.naturalHeight) return null;
    const imgRect = imgEl.getBoundingClientRect();
    const boxRect = boxEl.getBoundingClientRect();
    if (!imgRect.width || !imgRect.height) return null;

    const natAspect = imgEl.naturalWidth / imgEl.naturalHeight;
    const elAspect = imgRect.width / imgRect.height;
    let drawW = imgRect.width;
    let drawH = imgRect.height;
    let left = imgRect.left;
    let top = imgRect.top;
    if (natAspect > elAspect) {
      drawH = imgRect.width / natAspect;
      top = imgRect.top + (imgRect.height - drawH) / 2;
    } else {
      drawW = imgRect.height * natAspect;
      left = imgRect.left + (imgRect.width - drawW) / 2;
    }
    return {
      left,
      top,
      width: drawW,
      height: drawH,
      containerLeft: boxRect.left,
      containerTop: boxRect.top,
    };
  };

  const handleImagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isRedactedMode || !loadedRedactImgRef.current || isRedacting) return;
    if ((e.target as HTMLElement)?.closest('button')) return;

    const bounds = getRenderedImageBounds();
    if (!bounds) return;

    const relX = (e.clientX - bounds.left) / bounds.width;
    const relY = (e.clientY - bounds.top) / bounds.height;
    if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return;

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}

    dragSessionRef.current = {
      normX: Math.max(0, Math.min(1, relX)),
      normY: Math.max(0, Math.min(1, relY)),
      startClientX: e.clientX,
      startClientY: e.clientY,
      bounds,
    };
  };

  const handleImagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const { bounds, startClientX, startClientY } = session;
    const clampedX = Math.max(bounds.left, Math.min(bounds.left + bounds.width, e.clientX));
    const clampedY = Math.max(bounds.top, Math.min(bounds.top + bounds.height, e.clientY));
    const startX = Math.max(bounds.left, Math.min(bounds.left + bounds.width, startClientX));
    const startY = Math.max(bounds.top, Math.min(bounds.top + bounds.height, startClientY));

    const left = Math.min(startX, clampedX) - bounds.containerLeft;
    const top = Math.min(startY, clampedY) - bounds.containerTop;
    const width = Math.abs(clampedX - startX);
    const height = Math.abs(clampedY - startY);

    if (width > 4 || height > 4) {
      setDragRect({ left, top, width, height });
    }
  };

  const handleImagePointerUp = async (e: React.PointerEvent<HTMLDivElement>) => {
    const session = dragSessionRef.current;
    dragSessionRef.current = null;
    setDragRect(null);
    if (!session || !loadedRedactImgRef.current) return;

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    const { bounds, normX: startNormX, normY: startNormY } = session;
    const endNormX = Math.max(0, Math.min(1, (e.clientX - bounds.left) / bounds.width));
    const endNormY = Math.max(0, Math.min(1, (e.clientY - bounds.top) / bounds.height));
    const dx = Math.abs(endNormX - startNormX);
    const dy = Math.abs(endNormY - startNormY);

    let newBox: RedactRegion;
    if (dx > 0.025 || dy > 0.025) {
      const x = Math.min(startNormX, endNormX);
      const y = Math.min(startNormY, endNormY);
      newBox = {
        x,
        y,
        w: Math.max(0.05, dx),
        h: Math.max(0.035, dy),
        source: 'manual',
      };
    } else {
      const defaultW = 0.24;
      const defaultH = 0.07;
      newBox = {
        x: Math.max(0, Math.min(1 - defaultW, endNormX - defaultW / 2)),
        y: Math.max(0, Math.min(1 - defaultH, endNormY - defaultH / 2)),
        w: defaultW,
        h: defaultH,
        source: 'manual',
      };
    }

    const nextManual = [...manualRedactBoxes, newBox];
    setManualRedactBoxes(nextManual);

    const settlingRect = toOverlayRect(newBox, bounds);
    const maskId = `manual-${Date.now()}-${nextManual.length}`;
    setManualInkMasks((prev) => [...prev, { id: maskId, ...settlingRect }]);
    const cleanupTimer = window.setTimeout(() => {
      setManualInkMasks((prev) => prev.filter((item) => item.id !== maskId));
    }, 430);
    animTimersRef.current.push(cleanupTimer);

    try {
      await rebuildRedactedPreview(
        loadedRedactImgRef.current,
        autoRedactBoxes,
        nextManual,
        redactBars
      );
    } catch (err) {
      console.error('Manual redact compose error:', err);
    }
  };

  const handleShareRedacted = async () => {
    if (!redactedResult) return;
    const baseName = (data?.screenshot?.original_filename || screenshotId || 'image').replace(
      /\.[a-z0-9]+$/i,
      ''
    );
    const filename = `redacted-${baseName}.png`;
    const file = new File([redactedResult.blob], filename, { type: 'image/png' });
    if (typeof navigator.share === 'function') {
      try {
        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Shared from RECALL',
          });
          return;
        }
      } catch {
        // User cancelled, dismissed, or aborted the share sheet - NEVER trigger accidental download
        return;
      }
    }
    // Fallback download only when navigator.share is completely unsupported (e.g., desktop web without Web Share API)
    const link = document.createElement('a');
    link.href = redactedResult.dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleInstantSafeShare = async () => {
    if (isSafeSharing) return;
    setIsSafeSharing(true);
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch {}
    }
    try {
      let targetResult = redactedResult;
      if (!targetResult && screenshotId) {
        const hintSource = [
          data?.screenshot.ocr_text,
          ...(data?.messages || []).map((m) => `${m.sender_label || ''} ${m.message_text || ''}`),
        ]
          .filter(Boolean)
          .join('\n');
        const extraHintTokens = extractSensitiveHintsFromText(hintSource);

        const result = await generateRedactedImage(api.getImageUrl(screenshotId), {
          autoSensitiveText: true,
          blurTopBar: true,
          blurBottomBar: true,
          extraHintTokens,
        });

        setRedactedResult(result);
        targetResult = result;
      }

      if (targetResult) {
        const baseName = (data?.screenshot?.original_filename || screenshotId || 'screenshot').replace(
          /\.[a-z0-9]+$/i,
          ''
        );
        const filename = `safe-share-${baseName}.png`;
        const file = new File([targetResult.blob], filename, { type: 'image/png' });

        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
          try {
            if (!navigator.canShare || navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Safe Share from RECALL',
                text: 'Sanitized screenshot with AI privacy shield',
              });
              return;
            }
          } catch (err: any) {
            if (err?.name === 'AbortError') return;
          }
        }

        // Fallback: download the sanitized image
        await downloadImageFile(targetResult.dataUrl, filename);
      }
    } catch (err) {
      console.error('Instant safe share error:', err);
    } finally {
      setIsSafeSharing(false);
    }
  };

  const handleDownload = async (overrideName?: string) => {
    if (!screenshotId && !redactedResult) return;
    const baseName = (overrideName || newName.trim() || data?.screenshot?.original_filename || `screenshot-${screenshotId}`).replace(
      /\.[a-z0-9]+$/i,
      ''
    );

    // 1. If screenshot is in redacted mode or redactedResult exists -> ALWAYS download the redacted image!
    if (redactedResult?.dataUrl) {
      const filename = baseName.toLowerCase().startsWith('redacted-') ? `${baseName}.png` : `redacted-${baseName}.png`;
      await downloadImageFile(redactedResult.dataUrl, filename);
      return;
    }

    // 2. Unredacted screenshot with the active renamed filename
    const filename = `${baseName}.png`;
    const url = api.getImageUrl(screenshotId!, filename);
    await downloadImageFile(url, filename);
  };

  const handleDownloadRedacted = async () => {
    await handleDownload();
  };

  const handleDownloadScreenshot = async () => {
    await handleDownload();
  };

  const CHAT_PROMPT_SUGGESTIONS = [
    'Summarize what is happening here',
    'Extract all text, numbers & codes',
    'Explain context & key takeaways',
    'Find any prices, totals, or dates',
    'Who is talking or visible here?',
    'What are the next action items?',
  ];

  // Auto-poll if screenshot is still in processing state
  useEffect(() => {
    if (!screenshotId || !data) return;

    if (data.screenshot.processing_status === 'queued' || data.screenshot.processing_status === 'processing') {
      pollIntervalRef.current = setInterval(() => {
        api.getScreenshotDetails(screenshotId).then((res) => {
          if (res.screenshot.processing_status !== 'queued' && res.screenshot.processing_status !== 'processing') {
            setData(res);
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            onUpdated();
          }
        }).catch(() => {});
      }, 1500);
    } else {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    }

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [screenshotId, data?.screenshot.processing_status]);

  // Prevent background page from scrolling when detail sheet is open
  useEffect(() => {
    if (!screenshotId) return;
    return lockBodyScroll();
  }, [screenshotId]);

  if (!screenshotId) return null;

  const imageUrl = api.getImageUrl(screenshotId);

  const handleCopyOcr = () => {
    if (!data?.screenshot.ocr_text) return;
    const cleanOcr = data.screenshot.ocr_text.replace(/\\n/g, '\n');
    navigator.clipboard.writeText(cleanOcr);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
  };

  const handleCopySingleMessage = async (msgId: string, text: string) => {
    try {
      const formatted = text.replace(/\\n/g, '\n');
      await navigator.clipboard.writeText(formatted);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 1800);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  const handleCopyConversationFlow = async () => {
    if (!data?.messages || data.messages.length === 0) return;
    try {
      // Verbatim copy matching screenshot syntax and paragraph spacing exactly
      const flowText = data.messages
        .map((m) => m.message_text.replace(/\\n/g, '\n').trim())
        .filter(Boolean)
        .join('\n\n');
      await navigator.clipboard.writeText(flowText);
      setCopiedAllFlow(true);
      setTimeout(() => setCopiedAllFlow(false), 2000);
    } catch (err) {
      console.error('Failed to copy flow:', err);
    }
  };

  const handleReanalyze = async () => {
    if (!screenshotId || isReanalyzing) return;
    setIsReanalyzing(true);
    try {
      const res = await api.reanalyze(screenshotId);
      setData({
        screenshot: res.screenshot,
        messages: res.messages || [],
        game_result: res.game_result || null,
      });
      setActiveTab('content');
      onUpdated();
    } catch (err) {
      console.error('Re-analysis failed:', err);
      alert('Failed to re-analyze screenshot with AI');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await api.deleteScreenshot(screenshotId);
      setShowDeleteConfirm(false);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete screenshot');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveName = async (shouldDownload = false) => {
    if (!data || !screenshotId || !newName.trim() || isSavingName) return;
    const trimmed = newName.trim();
    setIsSavingName(true);
    try {
      if (trimmed !== data.screenshot.original_filename) {
        await api.renameScreenshot(screenshotId, trimmed);
        setData({
          ...data,
          screenshot: { ...data.screenshot, original_filename: trimmed },
        });
        onUpdated();
      }
      setIsEditingName(false);
      if (shouldDownload) {
        await handleDownload(trimmed);
      }
    } catch (err) {
      console.error('Failed to rename screenshot:', err);
    } finally {
      setIsSavingName(false);
    }
  };

  const handleCategoryChange = async (newCat: string) => {
    if (!data) return;
    try {
      await api.updateMetadata(screenshotId, { category: newCat });
      setData({
        ...data,
        screenshot: { ...data.screenshot, category: newCat as Screenshot['category'] },
      });
      onUpdated();
    } catch (err) {
      console.error('Failed to update category:', err);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes || bytes <= 0) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const ocrWordsCount = (data?.screenshot.ocr_text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm sm:items-center sm:justify-center sm:p-4 overscroll-none">
      {/* Dismiss backdrop */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Sheet Modal with Plump Liquid Glass */}
      <div className="liquid-glass-container relative z-10 flex max-h-[92dvh] w-full flex-col rounded-t-[32px] pb-safe sm:max-h-[88vh] sm:max-w-lg sm:rounded-[32px] shadow-2xl touch-auto overscroll-contain">
        {/* Drag Handle */}
        <div className="flex w-full justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>

        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-white/70 px-4 py-2.5 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-[13px] font-bold text-slate-800 whitespace-nowrap shrink-0">
              Details
            </span>
            {(() => {
              const currentScreenshot = data?.screenshot || initialScreenshot;
              if (!currentScreenshot) return null;
              const isReady = currentScreenshot.processing_status === 'ready';

              if (!isReady) {
                return (
                  <span className="liquid-filter-chip liquid-filter-chip-xs shadow-2xs bg-amber-50 text-amber-700 border border-amber-200/70 font-bold flex items-center gap-1 whitespace-nowrap shrink-0">
                    <Loader2 className="h-3 w-3 animate-spin text-amber-500 stroke-[2.3]" />
                    <span>AI Analyzing…</span>
                  </span>
                );
              }

              const preciseCat = classifyScreenshotPrecisely(currentScreenshot);
              const { badgeText, icon: CatIcon } = getPreciseCategoryMeta(preciseCat);
              return (
                <span className="liquid-filter-chip liquid-filter-chip-xs liquid-filter-chip-active font-bold text-[#3478F6] shadow-2xs whitespace-nowrap shrink-0">
                  <CatIcon className="h-3 w-3 text-[#3478F6] stroke-[2.2]" />
                  <span>{badgeText}</span>
                </span>
              );
            })()}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Full-Screen Chat AI Button */}
            <button
              type="button"
              onClick={() => {
                setInitialChatPrompt(undefined);
                setIsFullScreenChatOpen(true);
              }}
              title="Chat with Recall AI in Full Screen"
              aria-label="Chat with Recall AI in Full Screen"
              className="flex h-8 items-center gap-1.5 rounded-full liquid-btn-primary px-3 text-[11px] font-bold text-white active:scale-95 transition-all cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              <MessageSquare className="h-3.5 w-3.5 stroke-[2.3] shrink-0" />
              <span className="whitespace-nowrap">Chat AI</span>
              {chatMessages.length > 0 && (
                <span className="bg-white/25 px-1.5 py-0.2 rounded-full text-[9px] font-bold font-mono shrink-0">
                  {chatMessages.length}
                </span>
              )}
            </button>

            {/* Re-Analyze with AI Button */}
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing || loading}
              title="Re-analyze image with Vision AI"
              aria-label="Re-analyze image with Vision AI"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-[#3478F6] active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#3478F6] shrink-0 ${isReanalyzing ? 'animate-spin' : ''}`} />
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              title="Delete screenshot"
              aria-label="Delete screenshot"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:text-rose-600 active:scale-90 transition-all cursor-pointer shrink-0"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <Trash2 className="h-3.5 w-3.5 stroke-[2]" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer shrink-0"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Screenshot Title Bar with Inline Renaming */}
        <div className="border-b border-white/60 bg-white/50 px-4 py-3 backdrop-blur-md">
          {isEditingName ? (
            <div className="space-y-2.5">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName(false);
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  placeholder="Screenshot name..."
                  className="w-full h-10 rounded-[18px] liquid-glass-input px-3.5 pr-8 text-xs font-bold text-[#172B4D] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3478F6]/30 transition-all shadow-inner"
                />
                {newName && (
                  <button
                    type="button"
                    onClick={() => setNewName('')}
                    className="absolute right-2.5 p-1 text-slate-400 active:text-slate-600 active:scale-90 transition-transform cursor-pointer"
                    aria-label="Clear input"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="flex h-8.5 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold text-slate-600 liquid-glass-pill active:text-slate-800 active:scale-95 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5 stroke-[2.2]" />
                  <span>Cancel</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSaveName(false)}
                    disabled={isSavingName || !newName.trim()}
                    className="flex h-8.5 items-center justify-center rounded-full px-4 text-xs font-bold text-[#3478F6] liquid-glass-pill active:bg-blue-50/70 active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                  >
                    {isSavingName ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Save</span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveName(true)}
                    disabled={isSavingName || !newName.trim()}
                    className="flex h-8.5 items-center gap-1.5 rounded-full px-4 text-xs font-bold text-white liquid-btn-primary shadow-xs active:scale-95 transition-all cursor-pointer disabled:opacity-40"
                    title="Save renamed screenshot and download immediately"
                  >
                    {isSavingName ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5 stroke-[2.3]" />
                        <span>Save & Download</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div
                onClick={() => {
                  setNewName(data?.screenshot.original_filename || '');
                  setIsEditingName(true);
                }}
                role="button"
                tabIndex={0}
                title="Tap to rename"
                className="group flex items-center gap-1.5 cursor-pointer min-w-0 flex-1 rounded-xl py-1 px-1.5 -ml-1.5 active:bg-white/50 active:scale-[0.99] transition-all"
              >
                <h3 className="text-sm font-bold text-[#172B4D] truncate">
                  {data?.screenshot.original_filename || 'Untitled Screenshot'}
                </h3>
                <Pencil className="h-3 w-3 text-slate-400 shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={handleInstantSafeShare}
                  disabled={isSafeSharing}
                  className="flex h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] font-bold text-emerald-700 bg-emerald-50/80 border border-emerald-200/60 active:scale-95 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Sanitize sensitive PII with AI and share safely in 1 tap"
                >
                  {isSafeSharing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-600" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 stroke-[2.3]" />
                  )}
                  <span>Safe Share</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadScreenshot}
                  className="flex h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] font-bold text-[#172B4D] liquid-glass-pill active:text-[#3478F6] active:scale-95 transition-all cursor-pointer"
                  title="Download screenshot"
                >
                  <Download className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.3]" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNewName(data?.screenshot.original_filename || '');
                    setIsEditingName(true);
                  }}
                  className="flex h-8 items-center gap-1.5 rounded-full px-2.5 sm:px-3 text-[11px] font-bold text-[#3478F6] liquid-glass-pill active:bg-blue-50/70 active:scale-95 transition-all cursor-pointer"
                >
                  <Pencil className="h-3 w-3 stroke-[2.3]" />
                  <span>Rename</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-3.5 space-y-3.5">
          {/* Conversation Thread Reel Banner: Distinct, non-clashing placement */}
          {(data?.screenshot?.processing_status === 'ready' || initialScreenshot?.processing_status === 'ready') && matchedThread && (
            <div className="animate-fadeIn">
              <button
                type="button"
                onClick={() => {
                  if (!isPro) {
                    onOpenSubscription?.();
                    return;
                  }
                  setIsThreadReelOpen(true);
                }}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl liquid-filter-chip liquid-filter-chip-active text-[#3478F6] shadow-2xs active:scale-[0.99] transition-all cursor-pointer"
                title="Tap to open full connected conversation thread reel"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3478F6]/15 text-[#3478F6]">
                    <Layers className="h-4 w-4 stroke-[2.4]" />
                  </span>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="text-[12px] font-bold text-[#172B4D] leading-tight truncate">
                      Conversation Thread
                    </span>
                    <span className="text-[10.5px] font-semibold text-[#3478F6] leading-tight">
                      Part {threadPartNumber} of {matchedThread.screenshots?.length || matchedThread.screenshotIds?.length || 1}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#3478F6]/10 text-[10.5px] font-extrabold text-[#3478F6] shrink-0">
                  {!isPro ? (
                    <>
                      <Crown className="w-3 h-3 text-amber-500" />
                      <span>Reel (Pro)</span>
                    </>
                  ) : (
                    <>
                      <span>View Reel</span>
                      <span className="text-xs">→</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          )}

          {/* Image Preview with Plump Liquid Glass Frame */}
          <div className="space-y-2">
            <div
              ref={redactBoxRef}
              onPointerDown={handleImagePointerDown}
              onPointerMove={handleImagePointerMove}
              onPointerUp={handleImagePointerUp}
              onPointerCancel={() => {
                dragSessionRef.current = null;
                setDragRect(null);
              }}
              className={`relative min-h-[120px] flex items-center justify-center overflow-hidden rounded-[22px] border border-white/90 bg-slate-100/60 shadow-sm ${
                isRedactedMode ? 'cursor-crosshair touch-none select-none' : 'touch-pan-y'
              }`}
            >
              <img
                ref={previewImgRef}
                src={isRedactedMode && redactedResult ? redactedResult.dataUrl : imageUrl}
                alt="Screenshot Preview"
                draggable={false}
                onClick={() => {
                  if (!isRedactedMode && !isRedacting && !isAiRedacting) {
                    setIsImageExpanded(!isImageExpanded);
                  }
                }}
                className={`w-full select-none object-contain transition-[opacity,max-height] duration-300 ease-out ${
                  isImageExpanded
                    ? 'max-h-80 sm:max-h-96'
                    : 'max-h-52 sm:max-h-56'
                } ${isRedacting || isAiRedacting ? 'opacity-95' : 'opacity-100'} ${
                  !isRedactedMode ? (isImageExpanded ? 'cursor-zoom-out' : 'cursor-zoom-in') : ''
                }`}
                title={!isRedactedMode ? (isImageExpanded ? 'Click to collapse view' : 'Click to expand view') : undefined}
              />

              {/* Apple Visual Look Up: Interactive Spatial Pins */}
              {!isRedactedMode && !isRedacting && !isAiRedacting && isVisualLensActive && (
                <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
                  {inspectorNodes.map((node) => {
                    const NodePinIcon = getInspectorNodeIcon(node.kind);
                    const isSelected = selectedInspectorNode?.id === node.id;
                    return (
                      <div
                        key={node.id}
                        style={{ left: `${node.x}%`, top: `${node.y}%` }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (typeof navigator !== 'undefined' && navigator.vibrate) {
                              try {
                                navigator.vibrate(10);
                              } catch {}
                            }
                            setSelectedInspectorNode(isSelected ? null : node);
                          }}
                          className={`h-7 w-7 rounded-full flex items-center justify-center backdrop-blur-md shadow-md active:scale-90 transition-all cursor-pointer border ${
                            isSelected
                              ? 'bg-[#3478F6] text-white border-white scale-110 shadow-blue-500/40 ring-4 ring-white/60'
                              : 'bg-white/88 text-[#3478F6] border-white/90 animate-pulse hover:bg-white'
                          }`}
                          title={`Visual Look Up: ${node.label}`}
                        >
                          <NodePinIcon className="h-3.5 w-3.5 stroke-[2.4]" />
                        </button>
                      </div>
                    );
                  })}

                  {/* Floating Apple-style Look-Up Card on Pin Selection */}
                  <AnimatePresence>
                    {selectedInspectorNode && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.92, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.92, y: 8 }}
                        transition={{ duration: 0.16 }}
                        className="absolute bottom-2 inset-x-2 z-30 pointer-events-auto rounded-[20px] bg-white/95 backdrop-blur-xl border border-white p-3 shadow-lg flex flex-col gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] font-bold text-[#3478F6] uppercase tracking-wider">
                              Visual Look Up · {selectedInspectorNode.label}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedInspectorNode(null)}
                            className="p-1 text-slate-400 active:text-slate-600 rounded-full cursor-pointer"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <p className="text-[12.5px] font-bold text-[#172B4D] truncate px-0.5">
                          {selectedInspectorNode.value}
                        </p>

                        <div className="flex items-center gap-1.5 pt-0.5">
                          <button
                            type="button"
                            onClick={() => handleInspectorAction(selectedInspectorNode)}
                            className="flex-1 flex items-center justify-center gap-1 h-7.5 rounded-full bg-[#3478F6] text-white text-[11px] font-bold active:scale-95 transition-transform shadow-xs cursor-pointer"
                          >
                            {inspectorCopied ? (
                              <>
                                <Check className="h-3 w-3 stroke-[3]" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3 stroke-[2.3]" />
                                <span>Copy Value</span>
                              </>
                            )}
                          </button>

                          {selectedInspectorNode.href && (
                            <a
                              href={selectedInspectorNode.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-1 h-7.5 px-3 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold active:scale-95 transition-transform cursor-pointer"
                            >
                              <ExternalLink className="h-3 w-3" />
                              <span>Open</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              onSelectTag?.(selectedInspectorNode.value);
                            }}
                            className="flex items-center justify-center gap-1 h-7.5 px-3 rounded-full bg-blue-50 border border-blue-200/60 text-[#3478F6] text-[11px] font-bold active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                            title="Cross-reference other screenshots in vault"
                          >
                            <Layers className="h-3 w-3 stroke-[2.3]" />
                            <span>Vault Radar</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              {/* Standard Redact Pass: Tactile Marker-Ink Sweep & Live Censorship HUD */}
              {isRedacting && (
                <div className="pointer-events-none absolute inset-0 z-[15] overflow-hidden bg-[#0B1220]/16 backdrop-blur-[1px]">
                  <div
                    className="absolute inset-x-0 top-0 h-[28%]"
                    style={{
                      background:
                        'linear-gradient(to bottom, rgba(11,18,32,0) 0%, rgba(11,18,32,0.22) 55%, rgba(226,232,240,0.52) 96%, rgba(255,255,255,0.85) 100%)',
                      animation: 'redactCurtainSweep 1.35s cubic-bezier(0.37, 0, 0.63, 1) infinite',
                      willChange: 'transform, opacity',
                    }}
                  />
                  <div className="absolute inset-x-0 top-3 flex justify-center px-6">
                    <div className="inline-flex max-w-[82%] items-center gap-2 rounded-full border border-white/15 bg-[#0B1220]/90 px-3 py-1 text-[10.5px] font-medium text-white shadow-sm backdrop-blur-md">
                      <span className="relative flex h-3.5 w-5 flex-col justify-center gap-[3px]">
                        <span className="h-[2px] w-full rounded-full bg-white/30" />
                        <span className="h-[2px] w-3.5 rounded-full bg-white/30" />
                        <span
                          className="absolute inset-x-0 top-1/2 h-[5px] -translate-y-1/2 rounded-[2px] bg-white"
                          style={{
                            transformOrigin: 'left center',
                            animation: 'redactPillMarkerStroke 1.15s cubic-bezier(0.22, 1, 0.36, 1) infinite',
                          }}
                        />
                      </span>
                      <span>Masking sensitive lines…</span>
                    </div>
                  </div>
                </div>
              )}

              {/* AI Targeted Redact Pass: Visual Reading Sweep + Focus Reticule */}
              {isAiRedacting && (
                <div
                  className="pointer-events-none absolute inset-0 z-[15] overflow-hidden"
                  style={{
                    background:
                      'radial-gradient(circle at 50% 45%, rgba(52,120,246,0.12) 0%, rgba(11,18,32,0.28) 100%)',
                  }}
                >
                  <div
                    className="absolute inset-x-0 top-0 h-[26%]"
                    style={{
                      background:
                        'linear-gradient(to bottom, rgba(52,120,246,0) 0%, rgba(52,120,246,0.18) 65%, rgba(147,197,253,0.78) 97%, rgba(255,255,255,0.95) 100%)',
                      animation: 'aiVisionSweep 1.45s cubic-bezier(0.37, 0, 0.63, 1) infinite',
                      willChange: 'transform, opacity',
                    }}
                  />
                  <div
                    className="absolute inset-3"
                    style={{
                      animation: 'aiBracketPulse 1.3s ease-in-out infinite',
                      willChange: 'transform, opacity',
                    }}
                  >
                    <span className="absolute top-0 left-0 h-3 w-3 rounded-tl-[4px] border-t-2 border-l-2 border-[#60A5FA]/85" />
                    <span className="absolute top-0 right-0 h-3 w-3 rounded-tr-[4px] border-t-2 border-r-2 border-[#60A5FA]/85" />
                    <span className="absolute bottom-0 left-0 h-3 w-3 rounded-bl-[4px] border-b-2 border-l-2 border-[#60A5FA]/85" />
                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-br-[4px] border-b-2 border-r-2 border-[#60A5FA]/85" />
                  </div>
                  <div className="absolute inset-x-0 top-3 flex justify-center px-6">
                    <div className="inline-flex max-w-[82%] items-center gap-2 rounded-full border border-[#60A5FA]/40 bg-[#0B1220]/92 px-3 py-1 text-[10.5px] font-medium text-white shadow-sm backdrop-blur-md">
                      <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center">
                        <span
                          className="absolute inset-0 rounded-full border border-[#60A5FA]"
                          style={{
                            animation: 'aiIrisRing 1.3s cubic-bezier(0.22, 1, 0.36, 1) infinite',
                          }}
                        />
                        <span className="h-1.5 w-1.5 rounded-full bg-[#60A5FA]" />
                      </span>
                      <span className="truncate">
                        {activeAiInstruction || aiRedactPrompt.trim()
                          ? `AI locating “${activeAiInstruction || aiRedactPrompt.trim()}”…`
                          : 'AI locating target…'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Dragging Preview: Frosted Obsidian Precision Lens */}
              {dragRect && (
                <div
                  className="pointer-events-none absolute z-[16] rounded-[6px] border border-white/60 bg-[#0B1220]/45 backdrop-blur-[3px] shadow-xs"
                  style={{
                    left: `${dragRect.left}px`,
                    top: `${dragRect.top}px`,
                    width: `${dragRect.width}px`,
                    height: `${dragRect.height}px`,
                  }}
                >
                  <span className="absolute -top-px -left-px h-2 w-2 border-t-[1.5px] border-l-[1.5px] border-white/90 rounded-tl-[4px]" />
                  <span className="absolute -top-px -right-px h-2 w-2 border-t-[1.5px] border-r-[1.5px] border-white/90 rounded-tr-[4px]" />
                  <span className="absolute -bottom-px -left-px h-2 w-2 border-b-[1.5px] border-l-[1.5px] border-white/90 rounded-bl-[4px]" />
                  <span className="absolute -bottom-px -right-px h-2 w-2 border-b-[1.5px] border-r-[1.5px] border-white/90 rounded-br-[4px]" />
                </div>
              )}

              {/* Completion Animations: Marker Wipe (Standard) vs Target Lock -> Ink Seal (AI) */}
              {autoInkMasks.map((mask) =>
                mask.mode === 'ai' ? (
                  <div
                    key={mask.id}
                    className="pointer-events-none absolute z-[17]"
                    style={{
                      left: `${mask.left}px`,
                      top: `${mask.top}px`,
                      width: `${mask.width}px`,
                      height: `${mask.height}px`,
                    }}
                  >
                    <div
                      className="absolute -inset-[2px] rounded-[6px] border border-[#60A5FA]"
                      style={{
                        boxShadow:
                          '0 0 0 1px rgba(52,120,246,0.55), 0 0 14px rgba(52,120,246,0.45)',
                        animation: `aiTargetLockFrame 540ms cubic-bezier(0.22, 1, 0.36, 1) ${mask.delayMs}ms both`,
                        willChange: 'transform, opacity',
                      }}
                    />
                    <div
                      className="absolute inset-0 rounded-[5px] border-r-2 border-[#93C5FD] bg-[#0B1220]"
                      style={{
                        transformOrigin: 'left center',
                        animation: `aiSurgicalInkWipe 680ms cubic-bezier(0.22, 1, 0.36, 1) ${mask.delayMs}ms both`,
                        willChange: 'transform, opacity',
                      }}
                    />
                  </div>
                ) : (
                  <div
                    key={mask.id}
                    className="pointer-events-none absolute z-[17] rounded-[5px] border-r-2 border-white/85 bg-[#0B1220] ring-1 ring-white/25"
                    style={{
                      left: `${mask.left}px`,
                      top: `${mask.top}px`,
                      width: `${mask.width}px`,
                      height: `${mask.height}px`,
                      transformOrigin: 'left center',
                      animation: `redactCurtainWipe 480ms cubic-bezier(0.22, 1, 0.36, 1) ${mask.delayMs}ms both`,
                      willChange: 'transform, opacity',
                    }}
                  />
                )
              )}

              {/* Manual-Redaction Release: Matte Ink Seal + Subtle Oblique Glint */}
              {manualInkMasks.map((mask) => (
                <div
                  key={mask.id}
                  className="pointer-events-none absolute z-[17] overflow-hidden rounded-[6px] bg-[#0B1220] border border-white/20"
                  style={{
                    left: `${mask.left}px`,
                    top: `${mask.top}px`,
                    width: `${mask.width}px`,
                    height: `${mask.height}px`,
                    animation: 'manualInkSeal 380ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                    willChange: 'transform, opacity',
                  }}
                >
                  <div
                    className="absolute inset-y-0 left-0 w-1/2 pointer-events-none"
                    style={{
                      background:
                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.42) 50%, rgba(255,255,255,0) 100%)',
                      animation: 'manualSpecularPass 320ms cubic-bezier(0.22, 1, 0.36, 1) forwards',
                      willChange: 'transform, opacity',
                    }}
                  />
                </div>
              ))}

              {/* Plump Liquid Glass Inner Stroke Overlay */}
              <div className="liquid-card-inner-stroke" />

              {/* Top Specular Hairline Highlight */}
              <div
                className="pointer-events-none absolute top-0 left-6 right-6 h-px z-20 rounded-full"
                style={{
                  background:
                    'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.95) 25%, rgba(255,255,255,1) 50%, rgba(255,255,255,0.95) 75%, transparent 100%)',
                }}
              />
            </div>

            {/* Dedicated Interactive Control Dock for Screenshot */}
            <div className="flex items-center justify-between gap-2 pt-1">
              {/* Apple Visual Lens Toggle Button */}
              <button
                type="button"
                onClick={() => {
                  setIsVisualLensActive(!isVisualLensActive);
                  setSelectedInspectorNode(null);
                }}
                disabled={isRedacting || isAiRedacting}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8.5 px-2.5 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap select-none ${
                  isVisualLensActive
                    ? 'bg-[#3478F6] text-white shadow-xs'
                    : 'liquid-filter-chip'
                }`}
                title="Toggle interactive Apple Visual Look Up spatial pins"
              >
                <Scan className="h-3.5 w-3.5 stroke-[2.3] shrink-0" />
                <span className="whitespace-nowrap">Visual Lens</span>
                {inspectorNodes.length > 0 && (
                  <span
                    className={`text-[9.5px] font-mono px-1.5 py-0.2 rounded-full ${
                      isVisualLensActive ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {inspectorNodes.length}
                  </span>
                )}
              </button>

              {/* Privacy Redaction Feature Button */}
              <button
                type="button"
                onClick={handleToggleRedact}
                disabled={isRedacting || isAiRedacting}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8.5 px-2.5 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap select-none ${
                  isRedactedMode
                    ? 'bg-[#0B1220] text-white border border-white/25 shadow-md ring-1 ring-[#3478F6]/40'
                    : 'liquid-filter-chip'
                }`}
                title="Mask and redact private info, personal chats or sensitive details"
              >
                {isRedacting || isAiRedacting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-[#3478F6] shrink-0" />
                ) : isRedactedMode ? (
                  <ShieldCheck className="h-3.5 w-3.5 stroke-[2.3] text-emerald-400 shrink-0" />
                ) : (
                  <Shield className="h-3.5 w-3.5 stroke-[2.3] text-[#3478F6] shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {isAiRedacting
                    ? 'Redacting…'
                    : isRedacting
                    ? 'Redacting…'
                    : isRedactedMode
                    ? 'Redacted'
                    : 'Redact'}
                </span>
              </button>

              {/* Subtle Full Image Expand / Collapse Button */}
              <button
                type="button"
                onClick={() => {
                  setIsImageExpanded(!isImageExpanded);
                  setSelectedInspectorNode(null);
                }}
                disabled={isRedacting || isAiRedacting}
                className={`flex-1 flex items-center justify-center gap-1.5 h-8.5 px-2.5 rounded-full text-xs font-bold transition-all shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap select-none ${
                  isImageExpanded
                    ? 'bg-[#EBF3FF] text-[#3478F6] border border-[#3478F6]/30 shadow-2xs'
                    : 'liquid-filter-chip'
                }`}
                title={isImageExpanded ? 'Collapse to standard view' : 'Subtly expand screenshot preview'}
              >
                {isImageExpanded ? (
                  <>
                    <Minimize2 className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.3] shrink-0" />
                    <span className="whitespace-nowrap">Collapse</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.3] shrink-0" />
                    <span className="whitespace-nowrap">Expand</span>
                  </>
                )}
              </button>
            </div>

            {redactError && (
              <div className="flex items-center justify-between gap-2 rounded-[14px] bg-rose-50 border border-rose-200 px-3 py-2 text-[11px] text-rose-700">
                <span className="font-medium truncate">{redactError}</span>
                <button
                  type="button"
                  onClick={() => runPrivacyRedaction(redactBars)}
                  className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[10px] font-bold text-rose-700 border border-rose-200 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}

            {isRedactedMode && redactedResult && (
              <div className="rounded-[18px] bg-slate-900/5 border border-white px-3 py-2.5 text-[11px] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-[#172B4D] truncate">
                    {aiRedactSummary
                      ? aiRedactSummary
                      : redactedResult.redactedCount > 0
                      ? `${redactedResult.redactedCount} region${redactedResult.redactedCount === 1 ? '' : 's'} masked`
                      : 'No auto-matches — use AI prompt or drag on image'}
                  </span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleDownloadRedacted}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50/90 border border-emerald-200/60 shadow-2xs active:scale-95 cursor-pointer transition-all"
                      title="Download redacted screenshot"
                    >
                      <Download className="h-3.5 w-3.5 stroke-[2.3]" />
                      <span>Download</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleShareRedacted}
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold text-white liquid-btn-primary shadow-xs active:scale-95 cursor-pointer transition-all"
                      title="Share redacted screenshot"
                    >
                      <Share2 className="h-3.5 w-3.5 stroke-[2.3]" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>

                {/* AI Prompt Targeted Redaction */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleRunAiRedact();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <input
                    type="text"
                    value={aiRedactPrompt}
                    onChange={(e) => setAiRedactPrompt(e.target.value)}
                    placeholder='AI redact: e.g. "redact only the time" or "blur faces"'
                    className="flex-1 min-w-0 rounded-full bg-white border border-slate-200/80 px-3 py-1.5 text-[11px] text-[#172B4D] placeholder:text-slate-400 focus:outline-none focus:border-[#3478F6]"
                  />
                  <button
                    type="submit"
                    disabled={isAiRedacting || isRedacting || !aiRedactPrompt.trim()}
                    className="shrink-0 rounded-full bg-[#0B1220] text-white px-3 py-1.5 text-[10.5px] font-semibold disabled:opacity-45 active:scale-[0.97] transition-[opacity,transform] duration-150 ease-out cursor-pointer"
                  >
                    {isAiRedacting ? 'Applying…' : 'Apply'}
                  </button>
                </form>

                {/* Quick AI Targets + Mask Controls */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['Time', 'Battery', 'Prices', 'Names', 'Face'] as const).map((preset) => {
                    const presetText = `Redact only ${preset.toLowerCase()}`;
                    const isSelected = aiRedactPrompt.trim().toLowerCase() === presetText.toLowerCase();
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isAiRedacting || isRedacting}
                        onClick={() => setAiRedactPrompt(presetText)}
                        className={`rounded-full border px-2.5 py-0.5 text-[10px] font-medium active:scale-[0.97] cursor-pointer transition-colors disabled:opacity-50 ${
                          isSelected
                            ? 'bg-[#0B1220] text-white border-[#0B1220]'
                            : 'bg-white/90 active:bg-white text-slate-700 border-slate-200/80'
                        }`}
                      >
                        {preset}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    onClick={handleToggleStatusBars}
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border cursor-pointer transition-[background-color,color] duration-150 ${
                      redactBars
                        ? 'bg-[#172B4D] text-white border-[#172B4D]'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {redactBars ? 'Status Bars Masked' : '+ Status Bars'}
                  </button>

                  {aiRedactSummary && (
                    <button
                      type="button"
                      disabled={isRedacting || isAiRedacting}
                      onClick={() => runPrivacyRedaction(false)}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-white text-slate-600 border-slate-200 cursor-pointer active:scale-95"
                    >
                      Auto All
                    </button>
                  )}

                  {(manualRedactBoxes.length > 0 || autoRedactBoxes.length > 0) && (
                    <button
                      type="button"
                      onClick={handleUndoLastRedact}
                      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-white text-slate-600 border-slate-200 cursor-pointer active:scale-95"
                    >
                      <Undo2 className="h-2.5 w-2.5" />
                      <span>Undo</span>
                    </button>
                  )}

                  {redactedResult.redactedCount > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAllMasks}
                      className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold border bg-white text-slate-500 border-slate-200 cursor-pointer active:scale-95 ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* AI Processing Status Indicator Banner */}
          {data?.screenshot.processing_status === 'processing' && (
            <div className="rounded-[18px] border border-blue-200/80 bg-blue-50/70 backdrop-blur-md p-3 flex items-center gap-2.5 text-xs text-blue-900 animate-pulse shadow-2xs">
              <Loader2 className="h-4 w-4 text-[#3478F6] animate-spin shrink-0" />
              <div className="flex-1">
                <span className="font-bold block">AI Multimodal Vision is analyzing this image...</span>
                <span className="text-[11px] text-blue-700">Extracting visual scene, text, and entities in real time.</span>
              </div>
            </div>
          )}

          {/* Search Result Explanation Banner if present */}
          {searchResult?.match_explanation && (
            <div className="rounded-[18px] border border-blue-200/70 bg-blue-50/60 backdrop-blur-md p-3.5 text-xs text-[#172B4D] shadow-2xs">
              <span className="font-bold block mb-0.5 text-[#3478F6]">Match Explanation</span>
              <p className="leading-relaxed font-normal">{searchResult.match_explanation}</p>
            </div>
          )}

          {/* Symmetrical 3-Tab Liquid Filter Chips (Same as Library Page) */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            {[
              { id: 'content', label: 'Content', icon: Eye },
              { id: 'ocr', label: 'Text', icon: FileText },
              { id: 'info', label: 'Info', icon: Info },
            ].map((tab) => {
              const TabIcon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.vibrate) {
                      try {
                        navigator.vibrate(8);
                      } catch {}
                    }
                    setActiveTab(tab.id as 'content' | 'ocr' | 'info');
                  }}
                  className={`liquid-filter-chip w-full flex items-center justify-center gap-1.5 px-3 py-2 cursor-pointer ${
                    isSelected ? 'liquid-filter-chip-active' : ''
                  }`}
                >
                  <TabIcon className={`h-3.5 w-3.5 shrink-0 stroke-[2.2] ${isSelected ? 'text-[#3478F6]' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap text-[12px] font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : (
            <div>

              {/* ========================================================= */}
              {/* TAB 1: VISUAL CONTENT & UNDERSTANDING                     */}
              {/* ========================================================= */}
              {activeTab === 'content' && (
                <div className="space-y-3">
                  {/* AI Visual Analysis Card (Always displayed for high-precision understanding) */}
                  <div className="rounded-[20px] liquid-glass-card p-4 space-y-2.5 shadow-xs border border-white/90">
                    <div className="flex items-center justify-between text-xs text-slate-800 font-bold px-0.5">
                      <div className="flex items-center gap-1.5">
                        <Eye className="h-4 w-4 text-[#3478F6] stroke-[2]" />
                        <span>AI Visual Description</span>
                      </div>
                      <span className="liquid-filter-chip liquid-filter-chip-xs font-bold text-[#3478F6]">
                        Multimodal Vision
                      </span>
                    </div>

                    <div className="rounded-[16px] bg-white/70 border border-white/80 p-3 text-xs text-slate-700 leading-relaxed font-normal shadow-2xs">
                      {data?.screenshot.visual_description ? (
                        <p>{data.screenshot.visual_description}</p>
                      ) : (
                        <p className="text-slate-400 italic">
                          Visual description will appear as soon as AI analysis is completed. Click "Re-Analyze" above to analyze now.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Tap-to-Act Smart Actions (Shown only when actionable entities exist) */}
                  {smartActions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 px-0.5">
                      {smartActions.map((act) => {
                        const isCopied = copiedActionId === act.id;
                        const ActionIcon =
                          act.kind === 'calendar'
                            ? Calendar
                            : act.kind === 'maps'
                              ? MapPin
                              : act.kind === 'phone'
                                ? Phone
                                : act.kind === 'email'
                                  ? Mail
                                  : act.kind === 'shop'
                                    ? ShoppingBag
                                    : act.kind === 'url'
                                      ? ExternalLink
                                      : Copy;
                        return (
                          <button
                            key={act.id}
                            type="button"
                            onClick={() => handleSmartAction(act)}
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/85 active:bg-white border border-blue-100 px-3 py-1.5 text-[11px] font-semibold text-[#172B4D] shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.3]" />
                            ) : (
                              <ActionIcon className="h-3.5 w-3.5 text-[#3478F6] stroke-[2.1]" />
                            )}
                            <span>{isCopied ? 'Copied' : act.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* AI Precision Data Card: High-precision key-value extraction & 1-tap form copier */}
                  {inspectorNodes.length > 0 && (
                    <div className="rounded-[20px] liquid-glass-card p-4 space-y-3 shadow-2xs border border-white/90">
                      <div className="flex items-center justify-between text-xs text-slate-800 font-bold px-0.5">
                        <div className="flex items-center gap-1.5">
                          <ScanText className="h-4 w-4 text-[#3478F6] stroke-[2.2]" />
                          <span>Precision Data Card</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (!isPro) {
                                onOpenSubscription?.();
                                return;
                              }
                              handleExportStructuredData();
                            }}
                            className="liquid-filter-chip liquid-filter-chip-xs !font-bold text-[#3478F6] cursor-pointer active:scale-95 transition-transform flex items-center gap-1"
                            title="Export structured JSON of extracted data (Pro feature)"
                          >
                            {!isPro ? (
                              <Crown className="h-2.5 w-2.5 text-amber-500" />
                            ) : (
                              <Download className="h-2.5 w-2.5 text-[#3478F6]" />
                            )}
                            <span>{isPro ? 'Export JSON' : 'Export (Pro)'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleCopyAllSummary}
                            className="liquid-filter-chip liquid-filter-chip-xs !font-bold text-[#3478F6] cursor-pointer active:scale-95 transition-transform flex items-center gap-1"
                            title="Copy structured summary of all extracted data fields"
                          >
                            {copiedSummary ? (
                              <>
                                <Check className="h-2.5 w-2.5 text-emerald-600 stroke-[3]" />
                                <span className="text-emerald-600">Copied All!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-2.5 w-2.5" />
                                <span>Copy All</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        {inspectorNodes.map((node) => {
                          const NodeIcon = getInspectorNodeIcon(node.kind);
                          return (
                            <div
                              key={node.id}
                              className="flex items-center justify-between gap-2.5 rounded-[16px] bg-white/85 border border-white px-3.5 py-2.5 text-xs shadow-2xs"
                            >
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3478F6]/10 text-[#3478F6] shrink-0">
                                  <NodeIcon className="h-3.5 w-3.5 stroke-[2.2]" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block truncate">
                                    {node.label}
                                  </span>
                                  <p className="text-[12px] font-bold text-[#172B4D] truncate leading-tight mt-0.5">
                                    {node.value}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleInspectorAction(node)}
                                  className="plump-glass-pill shrink-0 px-3 h-7.5 rounded-full text-[11px] font-bold text-[#3478F6] cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1"
                                >
                                  {activeInspectorNode?.id === node.id && inspectorCopied ? (
                                    <>
                                      <Check className="h-3 w-3 stroke-[2.4] text-emerald-600" />
                                      <span className="text-emerald-600">Copied!</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="h-2.5 w-2.5" />
                                      <span>Copy</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onSelectTag?.(node.value)}
                                  className="h-7.5 w-7.5 rounded-full bg-blue-50/80 border border-blue-200/60 flex items-center justify-center text-[#3478F6] active:scale-95 cursor-pointer transition-transform shrink-0"
                                  title={`Cross-reference "${node.value}" in vault`}
                                >
                                  <Layers className="h-3 w-3 stroke-[2.3]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Chat Conversation Thread (if chat) */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[20px] liquid-glass-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold px-0.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#3478F6] stroke-[2]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyConversationFlow}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full liquid-filter-chip liquid-filter-chip-xs !font-bold text-[#3478F6] active:scale-95 transition-all shadow-2xs cursor-pointer"
                          title="Copy entire conversation transcript verbatim"
                        >
                          {copiedAllFlow ? (
                            <Check className="h-3 w-3 text-emerald-600 stroke-[2.2]" />
                          ) : (
                            <Copy className="h-3 w-3 stroke-[2]" />
                          )}
                          <span>{copiedAllFlow ? 'Copied' : 'Copy Flow'}</span>
                        </button>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {data.messages.map((msg: ExtractedMessage) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col group ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1.5 mb-0.5 px-1">
                                <span className="font-mono text-[9px] text-slate-400">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div className={`relative max-w-[88%] flex items-start gap-1.5 ${isRight ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div
                                  className={`px-3.5 py-2 text-xs font-medium leading-relaxed rounded-[16px] whitespace-pre-wrap select-text ${
                                    isRight
                                      ? 'liquid-btn-primary text-white rounded-tr-xs shadow-xs'
                                      : 'bg-white/85 border border-white text-slate-800 rounded-tl-xs shadow-2xs'
                                  }`}
                                >
                                  {msg.message_text.replace(/\\n/g, '\n')}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleCopySingleMessage(msg.id, msg.message_text)}
                                  className="mt-1 p-1 rounded-full opacity-60 active:opacity-100 active:bg-black/5 active:scale-90 transition-all cursor-pointer shrink-0"
                                  title="Copy text verbatim"
                                >
                                  {copiedMsgId === msg.id ? (
                                    <Check className="h-3 w-3 text-emerald-600 stroke-[2.2]" />
                                  ) : (
                                    <Copy className="h-3 w-3 text-slate-400 stroke-[2]" />
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Gaming Stats Dashboard (if game) */}
                  {data?.game_result && (
                    <div className="rounded-[20px] border border-amber-200/80 bg-amber-50/60 backdrop-blur-md p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs font-bold text-amber-900 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <Trophy className="h-4 w-4 text-amber-700 stroke-[2]" />
                          <span>{data.game_result.game_name || 'Match Stats'}</span>
                        </div>
                        {data.game_result.rank && (
                          <span className="rounded-full bg-amber-200/70 border border-amber-300 px-2.5 py-0.5 font-mono text-[11px] font-bold text-amber-900">
                            Rank #{data.game_result.rank}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Kills</p>
                          <p className="mt-0.5 font-mono text-xl font-bold text-amber-700">
                            {data.game_result.kills ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Damage</p>
                          <p className="mt-0.5 font-mono text-lg font-bold text-slate-800">
                            {data.game_result.damage ?? 'N/A'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Map</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-semibold">
                            {data.game_result.map_name || 'Standard'}
                          </p>
                        </div>
                        <div className="rounded-[14px] bg-white/80 p-2.5 border border-amber-200/50 shadow-2xs">
                          <p className="text-[10px] uppercase text-slate-400 font-bold">Mode</p>
                          <p className="mt-0.5 text-xs text-slate-800 truncate font-semibold">
                            {data.game_result.mode || 'Classic'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Dedicated Full-Screen Recall AI Chat Launcher Card */}
                  {data?.screenshot?.id && (
                    <div className="rounded-[22px] liquid-glass-card p-4 space-y-3 shadow-2xs border border-white/90">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#3478F6] to-[#0052cc] text-white shadow-2xs">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[12.5px] font-bold text-slate-800">Chat with Recall AI</span>
                              <span className="rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 px-1.5 py-0.2 text-[8.5px] font-bold">
                                Active
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium">Full-screen visual intelligence</p>
                          </div>
                        </div>

                        {chatMessages.length > 0 && (
                          <span className="rounded-full bg-blue-50 text-[#3478F6] border border-blue-200/60 px-2.5 py-0.5 text-[9.5px] font-bold">
                            {chatMessages.length} turn{chatMessages.length === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {chatMessages.length > 0 ? (
                        <div className="space-y-2.5">
                          <div className="text-[11.5px] text-slate-600 bg-white/75 p-3 rounded-[16px] border border-white/90 shadow-2xs space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                              <span>LATEST RESPONSE</span>
                              <span className="text-[#3478F6]">Recall AI</span>
                            </div>
                            <p className="line-clamp-2 text-slate-800 font-medium">
                              {chatMessages[chatMessages.length - 1].text}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setInitialChatPrompt(undefined);
                              setIsFullScreenChatOpen(true);
                            }}
                            className="w-full h-10.5 rounded-full liquid-btn-primary text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                          >
                            <MessageSquare className="h-3.5 w-3.5 stroke-[2.3]" />
                            <span>Continue Full-Screen Chat</span>
                            <Maximize2 className="h-3 w-3 opacity-75" />
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <p className="text-[11.5px] text-slate-600 leading-relaxed font-normal">
                            Ask anything about this screenshot or any topic in the world (definitions, recipes, code, facts).
                          </p>

                          <div className="flex flex-wrap gap-1.5">
                            {CHAT_PROMPT_SUGGESTIONS.slice(0, 3).map((prompt) => (
                              <button
                                key={prompt}
                                type="button"
                                onClick={() => {
                                  setInitialChatPrompt(prompt);
                                  setIsFullScreenChatOpen(true);
                                }}
                                className="rounded-full bg-white/80 active:bg-white border border-white px-2.5 py-1 text-[10px] font-semibold text-[#3478F6] active:scale-95 transition-all cursor-pointer shadow-2xs flex items-center gap-1"
                              >
                                <span>{prompt}</span>
                                <span>→</span>
                              </button>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setInitialChatPrompt(undefined);
                              setIsFullScreenChatOpen(true);
                            }}
                            className="w-full h-10.5 rounded-full liquid-btn-primary text-xs font-bold text-white flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                          >
                            <MessageSquare className="h-3.5 w-3.5 stroke-[2.3]" />
                            <span>Open Full-Screen Chat</span>
                            <Maximize2 className="h-3 w-3 opacity-75" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Extracted Semantic Entities / Tags */}
                  {data?.screenshot.tags && data.screenshot.tags.length > 0 && (
                    <div className="rounded-[18px] liquid-glass-card p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700">
                          <Tag className="h-3.5 w-3.5 text-[#3478F6]" />
                          <span>Key Entities & Topics</span>
                        </div>
                        {onSelectTag && (
                          <span className="text-[9.5px] font-medium text-slate-400">
                            Tap tag to search
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {data.screenshot.tags.map((tag: string, idx: number) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => onSelectTag?.(tag)}
                            className="rounded-full bg-white/80 active:bg-white active:text-[#3478F6] border border-white px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Smart Coach: Chat Suggested Replies / Receipt & Link Safety */}
                  {data?.screenshot?.id && (
                    <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                          <Zap className="h-3.5 w-3.5 text-[#3478F6]" />
                          <span>
                            {data.screenshot.category === 'chat'
                              ? 'Smart Reply Coach'
                              : data.screenshot.category === 'product' || data.screenshot.category === 'poster_document'
                                ? 'Receipt & Safety Check'
                                : 'Memory Highlights'}
                          </span>
                        </div>
                        {!coachData && (
                          <button
                            type="button"
                            onClick={handleLoadCoach}
                            disabled={loadingCoach}
                            className="inline-flex items-center gap-1 rounded-full liquid-glass-pill px-2.5 py-1 text-[10.5px] font-bold text-[#3478F6] active:scale-95 cursor-pointer disabled:opacity-50"
                          >
                            {loadingCoach && <Loader2 className="h-3 w-3 animate-spin" />}
                            <span>{loadingCoach ? 'Checking...' : data.screenshot.category === 'chat' ? 'Draft Replies' : 'Inspect'}</span>
                          </button>
                        )}
                        {coachData && (
                          <span className="rounded-full bg-white/80 border border-white px-2 py-0.5 text-[9.5px] font-semibold text-slate-500">
                            {coachData.provider}
                          </span>
                        )}
                      </div>

                      {coachData && (
                        <div className="space-y-2 pt-0.5">
                          <p className="text-[11.5px] text-slate-700 leading-relaxed">{coachData.summary}</p>

                          {coachData.safety_status && (
                            <div
                              className={`flex items-start gap-2 rounded-[12px] px-2.5 py-2 text-[11px] border ${
                                coachData.safety_status === 'caution'
                                  ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                                  : 'bg-emerald-50/85 border-emerald-200 text-emerald-900'
                              }`}
                            >
                              {coachData.safety_status === 'caution' ? (
                                <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                              ) : (
                                <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                              )}
                              <div className="space-y-0.5">
                                {coachData.detected_amount && (
                                  <span className="font-bold block">Detected Amount: {coachData.detected_amount}</span>
                                )}
                                <span>{coachData.safety_note}</span>
                              </div>
                            </div>
                          )}

                          {coachData.replies && coachData.replies.length > 0 && (
                            <div className="space-y-1.5">
                              {coachData.replies.map((reply, rIdx) => (
                                <button
                                  key={rIdx}
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(reply.text);
                                    setCopiedReplyIdx(rIdx);
                                    setTimeout(() => setCopiedReplyIdx(null), 1600);
                                  }}
                                  className="w-full text-left flex items-center justify-between gap-2 rounded-[14px] bg-white/85 active:bg-white border border-white px-3 py-2 text-[11.5px] active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
                                >
                                  <div className="min-w-0">
                                    <span className="text-[9.5px] font-bold uppercase tracking-wide text-[#3478F6] block">
                                      {reply.tone}
                                    </span>
                                    <span className="text-slate-800 font-medium">{reply.text}</span>
                                  </div>
                                  {copiedReplyIdx === rIdx ? (
                                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}

                          {coachData.key_points && coachData.key_points.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {coachData.key_points.map((pt, pIdx) => (
                                <span
                                  key={pIdx}
                                  className="rounded-[10px] bg-white/80 border border-white px-2 py-1 text-[10.5px] font-medium text-slate-700"
                                >
                                  {pt}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Visually & Semantically Similar Memories Strip */}
                  {similarItems.length > 0 && (
                    <div className="rounded-[18px] liquid-glass-card p-3 space-y-2 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-0.5">
                        <div className="flex items-center gap-1.5">
                          <Layers className="h-3.5 w-3.5 text-[#3478F6]" />
                          <span>Similar Memories ({similarItems.length})</span>
                        </div>
                        <span className="text-[9.5px] font-medium text-slate-400">Tap to open</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
                        {similarItems.map((sim) => (
                          <button
                            key={sim.screenshot.id}
                            type="button"
                            onClick={() => onSelectRelated?.(sim.screenshot.id)}
                            className="shrink-0 w-20 text-left space-y-1 group cursor-pointer active:scale-95 transition-transform"
                          >
                            <div className="relative h-16 w-20 overflow-hidden rounded-[12px] border border-white bg-slate-100 shadow-2xs">
                              <img
                                src={api.getImageUrl(sim.screenshot.id)}
                                alt={sim.screenshot.original_filename}
                                className="h-full w-full object-cover"
                              />
                              <span className="absolute bottom-1 right-1 rounded-full bg-white/90 px-1.5 py-0.2 text-[8.5px] font-bold text-[#172B4D]">
                                {Math.round(sim.similarity * 100)}%
                              </span>
                              {sim.is_duplicate && (
                                <span
                                  title="Near duplicate"
                                  className="absolute top-1 left-1 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white"
                                />
                              )}
                            </div>
                            <p className="text-[9.5px] font-semibold text-slate-600 truncate px-0.5">
                              {sim.screenshot.original_filename}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 2: EXTRACTED TEXT (OCR)                               */}
              {/* ========================================================= */}
              {activeTab === 'ocr' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Verbatim Transcription</span>
                      <span className="rounded-full bg-slate-200/60 border border-white px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                        {ocrWordsCount} words
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyOcr}
                      disabled={!data?.screenshot.ocr_text}
                      className="inline-flex h-8 items-center gap-1.5 rounded-full liquid-glass-pill px-3 text-xs font-semibold text-slate-700 active:scale-95 transition-all cursor-pointer"
                    >
                      {copiedOcr ? <Check className="h-3.5 w-3.5 text-emerald-600 stroke-[2.2]" /> : <Copy className="h-3.5 w-3.5 stroke-[2]" />}
                      <span>{copiedOcr ? 'Copied' : 'Copy All'}</span>
                    </button>
                  </div>

                  <pre
                    className="rounded-[18px] bg-white/85 border border-white/90 backdrop-blur-md p-3.5 font-mono text-[11.5px] text-slate-800 leading-relaxed max-h-72 overflow-x-auto overflow-y-auto whitespace-pre-wrap select-text shadow-inner"
                    style={{ tabSize: 2 }}
                  >
                    <code>{(data?.screenshot.ocr_text || '').replace(/\\n/g, '\n') || 'No text detected in this image.'}</code>
                  </pre>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: METADATA & RECOGNITION INFO                        */}
              {/* ========================================================= */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector with Liquid Filter Chips */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-2">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Category Classification
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { id: 'chat', label: 'Chat' },
                        { id: 'code_dev', label: 'Code & Dev' },
                        { id: 'game', label: 'Gaming' },
                        { id: 'food_dining', label: 'Food & Dining' },
                        { id: 'animals_pets', label: 'Pets & Animals' },
                        { id: 'wallpaper_art', label: 'Art & Wallpaper' },
                        { id: 'nature_scenery', label: 'Nature' },
                        { id: 'portrait_people', label: 'People & Portrait' },
                        { id: 'receipt_finance', label: 'Finance & Bills' },
                        { id: 'ticket_travel', label: 'Travel & Tickets' },
                        { id: 'product_shopping', label: 'Shopping & Product' },
                        { id: 'poster_document', label: 'Document & Notes' },
                        { id: 'other', label: 'Visual' },
                      ].map((cat) => {
                        const currentCat = data?.screenshot ? classifyScreenshotPrecisely(data.screenshot) : 'other';
                        const isCatSelected = (data?.screenshot.category || currentCat) === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategoryChange(cat.id)}
                            className={`liquid-filter-chip liquid-filter-chip-sm cursor-pointer ${
                              isCatSelected ? 'liquid-filter-chip-active font-bold text-[#3478F6]' : 'text-slate-600 font-semibold'
                            }`}
                          >
                            <span>{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Engine Status Card */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">AI Vision Engine</span>
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Ready</span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="text-[11px] text-slate-500">Recognition Model</span>
                      <span className="font-semibold text-[11px] text-[#3478F6]">Recall Vision Ensemble</span>
                    </div>
                  </div>

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-2 text-slate-500">
                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <Calendar className="h-3.5 w-3.5 text-[#3478F6]" />
                        <span>Upload Date</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {data?.screenshot.uploaded_at
                          ? new Date(data.screenshot.uploaded_at).toLocaleDateString()
                          : data?.screenshot.created_at
                          ? new Date(data.screenshot.created_at).toLocaleDateString()
                          : 'N/A'}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {data?.screenshot.uploaded_at
                          ? new Date(data.screenshot.uploaded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : ''}
                      </p>
                    </div>

                    <div className="rounded-[18px] liquid-glass-card p-3">
                      <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                        <HardDrive className="h-3.5 w-3.5 text-[#3478F6]" />
                        <span>File Size</span>
                      </div>
                      <p className="mt-1 font-semibold text-slate-800 truncate">
                        {formatFileSize(data?.screenshot.file_size)}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {data?.screenshot.original_filename || 'image'}
                      </p>
                    </div>
                  </div>

                  {/* All Semantic Tags */}
                  <div className="rounded-[18px] liquid-glass-card p-3 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase text-slate-400 font-bold">
                      <Tag className="h-3.5 w-3.5 text-[#3478F6]" />
                      <span>Searchable Index Tags ({(data?.screenshot.tags || []).length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {(data?.screenshot.tags || []).length > 0 ? (
                        data?.screenshot.tags?.map((t: string, i: number) => (
                          <span
                            key={i}
                            className="rounded-full bg-white/80 border border-white px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs"
                          >
                            #{t}
                          </span>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No tags indexed</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        {!isEditingName && (
          <div className="border-t border-white/70 px-5 py-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 rounded-full liquid-btn-primary text-xs font-bold text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-[32px] bg-white/95 backdrop-blur-2xl border border-white p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="plump-liquid-rose-btn flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl shadow-sm">
                <Trash2 className="h-5 w-5 stroke-[2.4] text-white" />
              </div>
              <div className="space-y-1 min-w-0">
                <h3 className="text-[14px] font-bold text-[#172B4D] leading-snug">
                  Delete this screenshot?
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  This screenshot and all its transcribed chat messages and extracted stats will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="plump-glass-pill rounded-full px-4 py-2 text-xs font-bold text-slate-700 active:text-slate-900 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="plump-liquid-rose-btn flex items-center gap-1.5 rounded-full px-4.5 py-2 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5 stroke-[2.4]" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full-Screen Recall AI Chat Modal */}
      {data?.screenshot && (
        <ScreenshotChatModal
          isOpen={isFullScreenChatOpen}
          onClose={() => {
            setIsFullScreenChatOpen(false);
            setInitialChatPrompt(undefined);
          }}
          screenshot={data.screenshot}
          chatMessages={chatMessages}
          setChatMessages={setChatMessages}
          initialPrompt={initialChatPrompt}
          isPro={isPro}
          onOpenSubscription={onOpenSubscription}
        />
      )}

      {/* Thread Stitcher Reel Modal inside Screenshot Detail Sheet */}
      {isThreadReelOpen && matchedThread && (
        <ThreadStitcherModal
          isOpen={isThreadReelOpen}
          thread={matchedThread}
          initialIndex={threadPartNumber - 1}
          onClose={() => setIsThreadReelOpen(false)}
          onSelectScreenshot={(id) => {
            setIsThreadReelOpen(false);
            if (onSelectRelated) {
              onSelectRelated(id);
            }
          }}
        />
      )}
    </div>
  );
};
