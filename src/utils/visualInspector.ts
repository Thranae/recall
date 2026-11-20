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

  // 3. Financial Total & Monetary Amount
  const moneyMatch =
    ocr.match(/(?:total|amount|paid|bill|due|balance|subtotal)\s*[:\-]?\s*([$₹€£]\s*[\d,]+(?:\.\d{2})?)/i) ||
    ocr.match(/([$₹€£]\s*[\d,]+(?:\.\d{2})?)\s*(?:total|paid|due|debited|credited)/i) ||
    ocr.match(/[$₹€£]\s*[\d,]+(?:\.\d{2})?/);

  if (moneyMatch && !nodes.some((n) => n.value === moneyMatch[1] || n.value === moneyMatch[0])) {
    const val = (moneyMatch[1] || moneyMatch[0]).replace(/\s+/, '');
    nodes.push({
      id: `inspect_money_${val}`,
      x: 55,
      y: estimateLineY(val, 65),
      kind: 'money',
      label: 'Financial Total',
      detail: `Amount: ${val}`,
      actionText: 'Copy Amount',
      value: val,
    });
  }

  // 4. Game Result & Kill Counts
  if (screenshot.game_result) {
    const { kills, rank, game_name } = screenshot.game_result;
    if (kills !== null && kills !== undefined) {
      nodes.push({
        id: `inspect_game_kills`,
        x: 48,
        y: 35,
        kind: 'game',
        label: `${game_name || 'Game'} Match Stats`,
        detail: `${kills} Eliminations / Kills`,
        actionText: 'Copy Stats',
        value: `${kills} Kills`,
      });
    }
    if (rank) {
      nodes.push({
        id: `inspect_game_rank`,
        x: 50,
        y: 22,
        kind: 'game',
        label: 'Match Placement',
        detail: rank,
        actionText: 'Copy Rank',
        value: rank,
      });
    }
  }

  // 5. Discount / Promo Code
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

  // 6. Academic / Study Notes & Document Formulas
  const formulaMatch =
    ocr.match(/(?:m\s*=\s*c\^d\s*mod\s*n\s*=\s*[\d^ ]+\s*mod\s*\d+\s*=\s*\d+)/i) ||
    ocr.match(/(?:for\s*rsa\s*with\s*p=\d+,\s*q=\d+.*)/i) ||
    ocr.match(/(?:compute\s*n,\s*phi\(n\)\s*and\s*d)/i);

  if (formulaMatch && !nodes.some((n) => n.value === formulaMatch[0])) {
    const cleanFormula = formulaMatch[0].trim();
    nodes.push({
      id: `inspect_formula_1`,
      x: 50,
      y: estimateLineY(cleanFormula, 45),
      kind: 'formula',
      label: 'Formula / Key Computation',
      detail: cleanFormula,
      actionText: 'Copy Formula',
      value: cleanFormula,
    });
  }

  const assignmentMatch = ocr.match(/(?:(?:machine\s*learning|artificial\s*intelligence|computer\s*science)\s*assignment\s*\d*|assignment\s*\d+)/i);
  if (assignmentMatch && !nodes.some((n) => n.value === assignmentMatch[0])) {
    nodes.push({
      id: `inspect_assignment_topic`,
      x: 45,
      y: estimateLineY(assignmentMatch[0], 15),
      kind: 'formula',
      label: 'Assignment Title',
      detail: assignmentMatch[0],
      actionText: 'Copy Title',
      value: assignmentMatch[0],
    });
  }

  // 7. Event & Travel Dates
  const eventDateMatch = ocr.match(
    /\b(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,\s*\d{2,4})?)\b/i
  );
  if (eventDateMatch && !nodes.some((n) => n.value === eventDateMatch[0])) {
    nodes.push({
      id: `inspect_event_date`,
      x: 35,
      y: estimateLineY(eventDateMatch[0], 55),
      kind: 'calendar',
      label: 'Detected Event Date',
      detail: eventDateMatch[0],
      actionText: 'Copy Date',
      value: eventDateMatch[0],
    });
  }

  // 8. Extracted Message Highlights (if chat category)
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
