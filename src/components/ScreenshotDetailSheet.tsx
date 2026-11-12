import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Brain,
  Send,
  MapPin,
  Phone,
  Mail,
  ShoppingBag,
  ExternalLink,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Share2,
  Layers,
  Zap,
  Undo2,
} from 'lucide-react';
import { api } from '../services/api';
import { extractSmartActions, triggerCalendarDownload, type SmartActionItem } from '../utils/smartActions';
import {
  loadUntaintedImage,
  detectSensitiveRegions,
  extractOcrWordHints,
  composeRedactedImage,
  getStatusBarRegions,
  extractSensitiveHintsFromText,
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
} from '../types';

type ScreenshotDetailData = {
  screenshot: Screenshot;
  messages: ExtractedMessage[];
  game_result: GameResult | null;
};

interface ScreenshotDetailSheetProps {
  screenshotId: string | null;
  searchResult?: SearchResultItem;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
  onSelectTag?: (tag: string) => void;
  onSelectRelated?: (id: string) => void;
}

export const ScreenshotDetailSheet: React.FC<ScreenshotDetailSheetProps> = ({
  screenshotId,
  searchResult,
  onClose,
  onDeleted,
  onUpdated,
  onSelectTag,
  onSelectRelated,
}) => {
  const [data, setData] = useState<ScreenshotDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'ocr' | 'info'>('content');
  const [copiedOcr, setCopiedOcr] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);
  const [qaInput, setQaInput] = useState('');
  const [isAskingImage, setIsAskingImage] = useState(false);
  const [qaResult, setQaResult] = useState<{ question: string; answer: string; provider: string } | null>(null);
  const [qaError, setQaError] = useState<string | null>(null);
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
    setQaInput('');
    setQaResult(null);
    setQaError(null);
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
    const padX = Math.max(6, Math.max(rawW * 0.08, Math.min(rawW, rawH) * 0.26) + 3);
    const padY = Math.max(4, Math.max(rawH * 0.12, Math.min(rawW, rawH) * 0.2) + 2);
    const imgOffsetX = bounds.left - bounds.containerLeft;
    const imgOffsetY = bounds.top - bounds.containerTop;
    const left = Math.max(imgOffsetX, imgOffsetX + box.x * bounds.width - padX);
    const top = Math.max(imgOffsetY, imgOffsetY + box.y * bounds.height - padY);
    const maxW = imgOffsetX + bounds.width - left;
    const maxH = imgOffsetY + bounds.height - top;
    return {
      left,
      top,
      width: Math.max(6, Math.min(maxW, rawW + padX * 2)),
      height: Math.max(6, Math.min(maxH, rawH + padY * 2)),
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

  const handleAskImage = async (customQuestion?: string) => {
    if (!data?.screenshot?.id || isAskingImage) return;
    const questionText = (customQuestion ?? qaInput).trim();
    if (!questionText) return;
    if (customQuestion) setQaInput(customQuestion);

    setIsAskingImage(true);
    setQaError(null);
    try {
      const res = await api.askScreenshot(data.screenshot.id, questionText);
      setQaResult({
        question: res.question,
        answer: res.answer,
        provider: res.provider,
      });
    } catch (err: any) {
      setQaError(err.message || 'Could not inspect this image right now.');
    } finally {
      setIsAskingImage(false);
    }
  };

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

    const originalOverflow = document.body.style.overflow;
    const originalOverscroll = document.body.style.overscrollBehavior;
    const originalTouchAction = document.body.style.touchAction;

    document.body.style.overflow = 'hidden';
    document.body.style.overscrollBehavior = 'none';
    document.body.style.touchAction = 'none';

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.overscrollBehavior = originalOverscroll;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [screenshotId]);

  if (!screenshotId) return null;

  const imageUrl = api.getImageUrl(screenshotId);

  const handleCopyOcr = () => {
    if (!data?.screenshot.ocr_text) return;
    navigator.clipboard.writeText(data.screenshot.ocr_text);
    setCopiedOcr(true);
    setTimeout(() => setCopiedOcr(false), 2000);
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
    if (!confirm('Are you sure you want to delete this screenshot?')) return;
    setIsDeleting(true);
    try {
      await api.deleteScreenshot(screenshotId);
      onDeleted();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete screenshot');
    } finally {
      setIsDeleting(false);
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
        <div className="flex items-center justify-between border-b border-white/70 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold text-slate-800">
              Details
            </span>
            {data?.screenshot.category && (
              <span className="liquid-category-badge px-2.5 py-0.5 text-[9.5px] font-bold tracking-wider">
                {data.screenshot.category.toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {isImageExpanded && (
              <button
                type="button"
                onClick={() => setIsImageExpanded(false)}
                title="Collapse image preview"
                aria-label="Collapse image preview"
                className="flex h-8 items-center gap-1 rounded-full bg-[#0B1220] px-2.5 text-[11px] font-semibold text-white active:scale-95 transition-all cursor-pointer shadow-2xs"
              >
                <Minimize2 className="h-3 w-3 stroke-[2.2]" />
                <span>Collapse</span>
              </button>
            )}

            {/* Re-Analyze with AI Button */}
            <button
              type="button"
              onClick={handleReanalyze}
              disabled={isReanalyzing || loading}
              title="Re-analyze image with Gemini Vision AI"
              aria-label="Re-analyze image with Gemini Vision AI"
              className="flex h-8 items-center gap-1.5 rounded-full liquid-glass-pill px-2.5 text-[11px] font-semibold text-[#3478F6] active:scale-95 transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 text-[#3478F6] ${isReanalyzing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isReanalyzing ? 'Analyzing...' : 'Re-Analyze'}</span>
            </button>

            {/* Delete button */}
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              title="Delete screenshot"
              aria-label="Delete screenshot"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:text-rose-600 active:scale-90 transition-all cursor-pointer"
            >
              {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" /> : <Trash2 className="h-3.5 w-3.5 stroke-[2]" />}
            </button>

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close details"
              className="flex h-8 w-8 items-center justify-center rounded-full liquid-glass-pill text-slate-500 active:scale-90 transition-all cursor-pointer"
            >
              <X className="h-4 w-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain touch-pan-y px-5 py-4 space-y-4">
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
                crossOrigin="anonymous"
                draggable={false}
                className={`w-full select-none object-contain transition-[opacity,max-height] duration-200 ease-out ${
                  isImageExpanded ? 'max-h-[48dvh] sm:max-h-[56vh]' : 'max-h-56'
                } ${isRedacting || isAiRedacting ? 'opacity-95' : 'opacity-100'}`}
              />

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

              <div
                className={`pointer-events-none absolute inset-x-2.5 bottom-2.5 z-20 flex items-center justify-between gap-2 transition-[opacity,transform] duration-200 ease-out ${
                  isRedacting || isAiRedacting ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'
                }`}
              >
                <button
                  type="button"
                  onClick={handleToggleRedact}
                  disabled={isRedacting || isAiRedacting}
                  className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[9.5px] font-bold active:scale-[0.97] cursor-pointer shadow-xs transition-[background-color,color,transform] duration-200 ease-out ${
                    isRedacting || isAiRedacting ? 'pointer-events-none' : 'pointer-events-auto'
                  } ${
                    isRedactedMode || isRedacting || isAiRedacting
                      ? 'h-[21px] bg-[#0B1220] text-white border border-white/35'
                      : 'liquid-category-badge text-[#172B4D]'
                  }`}
                >
                  {isRedacting || isAiRedacting ? (
                    <Loader2 className="h-3 w-3 animate-spin text-white/85" />
                  ) : (
                    <Shield
                      className={`h-3 w-3 stroke-[2.2] ${
                        isRedactedMode ? 'text-emerald-300' : 'text-[#3478F6]'
                      }`}
                    />
                  )}
                  <span>
                    {isAiRedacting
                      ? 'AI Redacting…'
                      : isRedacting
                      ? 'Redacting…'
                      : isRedactedMode
                      ? 'Redacted'
                      : 'Redact'}
                  </span>
                </button>

                {!isImageExpanded && (
                  <button
                    type="button"
                    onClick={() => setIsImageExpanded(true)}
                    disabled={isRedacting || isAiRedacting}
                    className={`flex items-center gap-1 rounded-full liquid-category-badge px-2.5 py-0.5 text-[9.5px] font-bold text-[#172B4D] active:scale-95 cursor-pointer shadow-xs ${
                      isRedacting || isAiRedacting ? 'pointer-events-none' : 'pointer-events-auto'
                    }`}
                  >
                    <Maximize2 className="h-3 w-3 text-[#3478F6] stroke-[2.2]" />
                    <span>Expand</span>
                  </button>
                )}
              </div>

              {isImageExpanded && !(isRedacting || isAiRedacting) && (
                <button
                  type="button"
                  onClick={() => setIsImageExpanded(false)}
                  className="pointer-events-auto absolute top-2.5 right-2.5 z-20 flex items-center gap-1 rounded-full bg-[#0B1220]/85 border border-white/25 px-2.5 py-1 text-[9.5px] font-bold text-white backdrop-blur-md active:scale-95 cursor-pointer shadow-xs"
                >
                  <Minimize2 className="h-3 w-3 stroke-[2.2]" />
                  <span>Collapse</span>
                </button>
              )}
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
                  <button
                    type="button"
                    onClick={handleShareRedacted}
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#3478F6] text-white px-2.5 py-1 text-[10.5px] font-bold active:scale-95 cursor-pointer"
                  >
                    <Share2 className="h-3 w-3" />
                    <span>Share</span>
                  </button>
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
                            : 'bg-white/90 hover:bg-white text-slate-700 border-slate-200/80'
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

          {/* Symmetrical Liquid Glass Filter Tabs Grid */}
          <div className="grid grid-cols-3 gap-2.5 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'content' ? 'liquid-filter-chip-active' : ''}`}
            >
              Content
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ocr')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'ocr' ? 'liquid-filter-chip-active' : ''}`}
            >
              Text
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('info')}
              className={`liquid-filter-chip w-full flex items-center justify-center ${activeTab === 'info' ? 'liquid-filter-chip-active' : ''}`}
            >
              Info
            </button>
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
                      <span className="liquid-category-badge px-2 py-0.5 text-[9px] font-bold text-[#3478F6]">
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
                            className="inline-flex items-center gap-1.5 rounded-full bg-white/85 hover:bg-white border border-blue-100 px-3 py-1.5 text-[11px] font-semibold text-[#172B4D] shadow-2xs active:scale-95 transition-all cursor-pointer"
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

                  {/* Chat Conversation Thread (if chat) */}
                  {data?.messages && data.messages.length > 0 && (
                    <div className="rounded-[20px] liquid-glass-card p-4 space-y-3 shadow-xs">
                      <div className="flex items-center justify-between text-xs text-slate-700 font-bold px-0.5">
                        <div className="flex items-center gap-1.5">
                          <MessageSquare className="h-3.5 w-3.5 text-[#3478F6] stroke-[2]" />
                          <span>Conversation Flow ({data.messages.length})</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">Ordered</span>
                      </div>

                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {data.messages.map((msg: ExtractedMessage) => {
                          const isRight = msg.sender_side === 'right';
                          return (
                            <div
                              key={msg.id}
                              className={`flex flex-col ${isRight ? 'items-end' : 'items-start'}`}
                            >
                              <div className="flex items-center gap-1 mb-0.5 px-1">
                                <span className="font-mono text-[9px] text-slate-400">#{msg.sequence_number}</span>
                                <span className="text-[10px] font-semibold text-slate-600">
                                  {msg.sender_label || (isRight ? 'You' : 'Sender')}
                                </span>
                              </div>
                              <div
                                className={`max-w-[85%] px-3.5 py-2 text-xs font-medium leading-relaxed rounded-[16px] ${
                                  isRight
                                    ? 'liquid-btn-primary text-white rounded-tr-xs shadow-xs'
                                    : 'bg-white/80 border border-white text-slate-800 rounded-tl-xs shadow-2xs'
                                }`}
                              >
                                {msg.message_text}
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

                  {/* Memory Lens: Interactive Visual Q&A About This Image */}
                  {data?.screenshot?.id && (
                    <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-2.5 shadow-2xs">
                      <div className="flex items-center justify-between gap-2 px-0.5">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-800">
                          <Brain className="h-3.5 w-3.5 text-[#3478F6]" />
                          <span>Ask About This Image</span>
                        </div>
                        {qaResult?.provider && (
                          <span className="rounded-full bg-white/80 border border-white px-2 py-0.5 text-[9.5px] font-semibold text-slate-500">
                            {qaResult.provider}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {['Describe people & outfit', 'What colors are prominent?', 'Summarize key info'].map((prompt) => (
                          <button
                            key={prompt}
                            type="button"
                            disabled={isAskingImage}
                            onClick={() => handleAskImage(prompt)}
                            className="rounded-full bg-white/75 hover:bg-white border border-white px-2.5 py-1 text-[10px] font-semibold text-[#3478F6] active:scale-95 transition-all cursor-pointer shadow-2xs"
                          >
                            {prompt}
                          </button>
                        ))}
                      </div>

                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleAskImage();
                        }}
                        className="flex items-center gap-1.5 rounded-full bg-white/85 border border-white px-3 py-1.5 shadow-2xs"
                      >
                        <input
                          type="text"
                          value={qaInput}
                          onChange={(e) => setQaInput(e.target.value)}
                          placeholder="Ask anything about what's inside..."
                          className="w-full bg-transparent text-[11.5px] font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isAskingImage || !qaInput.trim()}
                          aria-label="Send question"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3478F6] text-white disabled:opacity-40 active:scale-90 transition-all cursor-pointer"
                        >
                          {isAskingImage ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3" />
                          )}
                        </button>
                      </form>

                      {qaError && (
                        <p className="text-[11px] font-medium text-rose-600 px-1">{qaError}</p>
                      )}

                      {qaResult && (
                        <div className="rounded-[14px] bg-blue-50/75 border border-blue-100/80 p-2.5 space-y-1">
                          <p className="text-[10.5px] font-semibold text-[#3478F6]">
                            Q: {qaResult.question}
                          </p>
                          <p className="text-[12px] font-medium text-slate-800 leading-relaxed">
                            {qaResult.answer}
                          </p>
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
                            className="rounded-full bg-white/80 hover:bg-white hover:text-[#3478F6] border border-white px-2.5 py-0.5 text-[10.5px] font-medium text-slate-700 shadow-2xs active:scale-95 transition-all cursor-pointer"
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
                                  className="w-full text-left flex items-center justify-between gap-2 rounded-[14px] bg-white/85 hover:bg-white border border-white px-3 py-2 text-[11.5px] active:scale-[0.98] transition-all cursor-pointer shadow-2xs"
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

                  <div className="rounded-[18px] bg-white/70 border border-white/80 backdrop-blur-md p-3.5 font-mono text-xs text-slate-800 leading-relaxed max-h-64 overflow-y-auto whitespace-pre-wrap select-text shadow-inner">
                    {data?.screenshot.ocr_text || 'No text detected in this image.'}
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* TAB 3: METADATA & RECOGNITION INFO                        */}
              {/* ========================================================= */}
              {activeTab === 'info' && (
                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div className="rounded-[18px] liquid-glass-card p-3.5 space-y-1.5">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                      Category Classification
                    </label>
                    <select
                      value={data?.screenshot.category || 'other'}
                      onChange={(e) => handleCategoryChange(e.target.value)}
                      className="w-full rounded-[14px] bg-white/90 border border-white p-2.5 text-xs text-slate-800 font-semibold focus:outline-none backdrop-blur-xs shadow-2xs"
                    >
                      <option value="chat">Chat Conversation</option>
                      <option value="game">Gaming Stats (BGMI / PUBG / COD)</option>
                      <option value="product">Product / E-Commerce</option>
                      <option value="poster_document">Poster / Document / Bill</option>
                      <option value="other">Other Screenshot</option>
                    </select>
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
                      <span className="font-semibold text-[11px] text-[#3478F6]">Multi-AI Ensemble (Gemini + Mistral + GPT-4o)</span>
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
        <div className="border-t border-white/70 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 rounded-full liquid-btn-primary text-xs font-bold text-white active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer shadow-sm"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
