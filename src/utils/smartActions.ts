import type { Screenshot } from '../types';

export type SmartActionKind =
  | 'otp'
  | 'upi'
  | 'phone'
  | 'email'
  | 'url'
  | 'maps'
  | 'calendar'
  | 'shop';

export interface SmartActionItem {
  id: string;
  kind: SmartActionKind;
  label: string;
  sublabel: string;
  value: string;
  href?: string;
  icsPayload?: {
    title: string;
    dateStr: string;
    location: string;
  };
}

function buildIcsContent(title: string, dateHint: string, location: string): string {
  const parsedDate = Date.parse(dateHint);
  const start = Number.isNaN(parsedDate) ? new Date(Date.now() + 86400000) : new Date(parsedDate);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RECALL//Smart Event//EN',
    'BEGIN:VEVENT',
    `UID:${Date.now()}@recall.app`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${title.replace(/[\r\n]/g, ' ').slice(0, 80)}`,
    location ? `LOCATION:${location.replace(/[\r\n]/g, ' ').slice(0, 120)}` : '',
    'DESCRIPTION:Saved from RECALL visual memory vault.',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .join('\r\n');
}

export function triggerCalendarDownload(title: string, dateStr: string, location: string): void {
  const ics = buildIcsContent(title, dateStr, location);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32) || 'recall-event'}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function extractSmartActions(screenshot?: Screenshot | null): SmartActionItem[] {
  if (!screenshot) return [];

  const ocr = (screenshot.ocr_text || '').trim();
  const desc = (screenshot.visual_description || '').trim();
  const tags = Array.isArray(screenshot.tags) ? screenshot.tags : [];
  const combined = `${ocr}\n${desc}\n${tags.join(' ')}`;

  const actions: SmartActionItem[] = [];
  const seenKeys = new Set<string>();

  const pushUnique = (item: SmartActionItem) => {
    const key = `${item.kind}:${item.value.toLowerCase()}`;
    if (seenKeys.has(key) || actions.length >= 6) return;
    seenKeys.add(key);
    actions.push(item);
  };

  // 1. OTP / Verification Code
  const otpMatch = ocr.match(/(?:otp|code|pin|verification(?:\s*code)?|passcode)\s*(?:is|:|#|-)?\s*\b(\d{4,8})\b/i);
  if (otpMatch?.[1]) {
    pushUnique({
      id: `otp-${otpMatch[1]}`,
      kind: 'otp',
      label: `Copy Code ${otpMatch[1]}`,
      sublabel: 'Verification code',
      value: otpMatch[1],
    });
  }

  // 2. Email
  const emailMatch = ocr.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch?.[0]) {
    pushUnique({
      id: `email-${emailMatch[0]}`,
      kind: 'email',
      label: 'Email',
      sublabel: emailMatch[0],
      value: emailMatch[0],
      href: `mailto:${emailMatch[0]}`,
    });
  }

  // 3. UPI ID (e.g. handle@okaxis / handle@ybl without dot)
  const upiMatch = ocr.match(/\b[a-zA-Z0-9._-]{3,}@(?:okicici|okhdfcbank|okaxis|oksbi|ybl|paytm|apl|upi|ibl)\b/i);
  if (upiMatch?.[0]) {
    pushUnique({
      id: `upi-${upiMatch[0]}`,
      kind: 'upi',
      label: 'Copy UPI ID',
      sublabel: upiMatch[0],
      value: upiMatch[0],
    });
  }

  // 4. Phone Number
  const phoneMatch = ocr.match(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4}|\b[6-9]\d{9}\b)/);
  if (phoneMatch?.[0]) {
    const digits = phoneMatch[0].replace(/[^\d+]/g, '');
    if (digits.length >= 10) {
      pushUnique({
        id: `phone-${digits}`,
        kind: 'phone',
        label: 'Call Number',
        sublabel: phoneMatch[0].trim(),
        value: digits,
        href: `tel:${digits}`,
      });
    }
  }

  // 5. Web Link
  const urlMatch = ocr.match(/https?:\/\/[^\s"'<>)]+/i);
  if (urlMatch?.[0]) {
    let host = urlMatch[0];
    try {
      host = new URL(urlMatch[0]).hostname.replace(/^www\./, '');
    } catch {}
    pushUnique({
      id: `url-${host}`,
      kind: 'url',
      label: 'Open Link',
      sublabel: host,
      value: urlMatch[0],
      href: urlMatch[0],
    });
  }

  // 6. Venue / Location / Address -> Open in Maps
  const locationLine = ocr
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) =>
      /\b(address|venue|location|street|road|nagar|avenue|mall|auditorium|campus|hall|sector|coimbatore|bengaluru|bangalore|mumbai|chennai|delhi)\b/i.test(l)
    );
  if (locationLine) {
    const cleanedLoc = locationLine.replace(/^(?:address|venue|location)\s*[:\-]?\s*/i, '').trim();
    if (cleanedLoc.length >= 5) {
      pushUnique({
        id: 'maps-loc',
        kind: 'maps',
        label: 'Open in Maps',
        sublabel: cleanedLoc.slice(0, 32),
        value: cleanedLoc,
        href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cleanedLoc)}`,
      });
    }
  }

  // 7. Date / Event -> Calendar Invite
  const dateMatch = ocr.match(
    /\b(?:\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*(?:\s+\d{2,4})?|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+\d{4})?|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i
  );
  if (dateMatch?.[0] && (screenshot.category === 'poster_document' || /event|fest|meeting|flight|ticket|book|party|concert/i.test(combined))) {
    const firstTitleLine =
      ocr
        .split(/\r?\n/)
        .map((l) => l.trim())
        .find((l) => l.length >= 4 && l.length <= 60) || screenshot.original_filename;
    pushUnique({
      id: `cal-${dateMatch[0]}`,
      kind: 'calendar',
      label: 'Add to Calendar',
      sublabel: dateMatch[0],
      value: dateMatch[0],
      icsPayload: {
        title: firstTitleLine,
        dateStr: dateMatch[0],
        location: locationLine || '',
      },
    });
  }

  // 8. Shop Similar / Apparel & Products
  const apparelTag = tags.find((t) =>
    /\b(shirt|t-shirt|tee|hoodie|jacket|dress|jeans|sneakers|shoes|watch|sunglasses|bag|backpack)\b/i.test(t)
  );
  if (apparelTag || screenshot.category === 'product') {
    const shopQuery =
      apparelTag ||
      desc.match(/\b(?:black|white|blue|red|green|pink)?\s*(?:shirt|t-shirt|hoodie|jacket|dress|jeans|sneakers|shoes|watch|bag)\b/i)?.[0] ||
      screenshot.original_filename.replace(/\.[a-z0-9]+$/i, '');
    if (shopQuery) {
      pushUnique({
        id: `shop-${shopQuery}`,
        kind: 'shop',
        label: 'Shop Similar',
        sublabel: shopQuery.trim(),
        value: shopQuery.trim(),
        href: `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(shopQuery.trim())}`,
      });
    }
  }

  return actions;
}

