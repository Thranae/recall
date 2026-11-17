import type { Screenshot, ExtractedMessage, LiveInspectorNode } from '../types';
import { extractSmartActions } from './smartActions';

/**
 * Extracts positioned visual inspector nodes (Apple Visual Look Up style)
 * with projected spatial coordinates over the screenshot.
 */
export function extractLiveInspectorNodes(
  screenshot?: Screenshot | null,
  messages: ExtractedMessage[] = []
): LiveInspectorNode[] {
  if (!screenshot) return [];

  const nodes: LiveInspectorNode[] = [];
  const ocr = (screenshot.ocr_text || '').trim();
  const lines = ocr.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const totalLines = Math.max(1, lines.length);

  // Helper to estimate vertical percentage based on line position in OCR
  const estimateLineY = (textSnippet: string, fallbackY = 50): number => {
    const idx = lines.findIndex((l) => l.toLowerCase().includes(textSnippet.toLowerCase()));
    if (idx === -1) return fallbackY;
    const ratio = (idx + 1) / (totalLines + 1);
    return Math.min(88, Math.max(12, Math.round(ratio * 100)));
  };

  // 1. Smart Actions (Phone, OTP, Email, Calendar, UPI, URL)
  const actions = extractSmartActions(screenshot);
  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const estimatedY = estimateLineY(a.value, 20 + i * 15);
    const estimatedX = 25 + ((i * 35) % 55);

    let kind: LiveInspectorNode['kind'] = 'entity';
    let actionText = 'Copy';

    if (a.kind === 'otp') {
      kind = 'otp';
      actionText = 'Copy Code';
    } else if (a.kind === 'phone') {
      kind = 'phone';
      actionText = 'Call Number';
    } else if (a.kind === 'email') {
      kind = 'email';
      actionText = 'Send Email';
    } else if (a.kind === 'calendar') {
      kind = 'calendar';
      actionText = 'Add Event';
    } else if (a.kind === 'url') {
      kind = 'url';
      actionText = 'Open Link';
    } else if (a.kind === 'upi') {
      kind = 'upi';
      actionText = 'Pay / Copy';
    }

    nodes.push({
      id: `inspect_action_${a.id}`,
      x: estimatedX,
      y: estimatedY,
      kind,
      label: a.label,
      detail: a.sublabel,
      actionText,
      value: a.value,
      href: a.href,
    });
  }

  // 2. Wi-Fi Password / Credential Detection
  const wifiMatch = ocr.match(/(?:wi-?fi|passcode|password|network|pwd)\s*(?:is|:|-)?\s*([A-Za-z0-9@#$_-]{6,20})\b/i);
  if (wifiMatch && !nodes.some((n) => n.value === wifiMatch[1])) {
    nodes.push({
      id: `inspect_wifi_${wifiMatch[1]}`,
      x: 50,
      y: estimateLineY(wifiMatch[1], 42),
      kind: 'entity',
      label: 'Wi-Fi Password',
      detail: `Password: ${wifiMatch[1]}`,
      actionText: 'Copy Password',
      value: wifiMatch[1],
    });
  }

  // 3. Discount / Promo Code
  const promoMatch = ocr.match(/(?:code|promo|coupon|use|flat|voucher|save)\s*(?:is|:|-)?\s*([A-Z0-9]{4,15})\b/i);
  if (promoMatch && !nodes.some((n) => n.value === promoMatch[1])) {
    nodes.push({
      id: `inspect_promo_${promoMatch[1]}`,
      x: 65,
      y: estimateLineY(promoMatch[1], 70),
      kind: 'discount',
      label: 'Discount Promo Code',
      detail: `Code: ${promoMatch[1]}`,
      actionText: 'Copy Promo',
      value: promoMatch[1],
    });
  }

  // 4. Extracted Message Highlights (if chat category)
  if (messages.length > 0 && screenshot.category === 'chat') {
    const importantMsg = messages.find((m) => m.message_text.length >= 8 && m.message_text.length <= 40);
    if (importantMsg && !nodes.some((n) => n.value === importantMsg.message_text)) {
      const isRight = importantMsg.sender_side === 'right';
      nodes.push({
        id: `inspect_msg_${importantMsg.id}`,
        x: isRight ? 72 : 28,
        y: Math.min(85, Math.max(15, (importantMsg.sequence_number * 18) % 85)),
        kind: 'entity',
        label: importantMsg.sender_label || (isRight ? 'Your Message' : 'Incoming Message'),
        detail: `"${importantMsg.message_text}"`,
        actionText: 'Copy Message',
        value: importantMsg.message_text,
      });
    }
  }

  return nodes.slice(0, 6);
}
