export interface ThreadGroup {
  threadId: string;
  title: string;
  screenshotIds: string[];
  screenshots: any[];
  messageCount: number;
  startedAt: string;
  lastAt: string;
}

export interface DigestDiscountItem {
  id: string;
  screenshotId: string;
  code: string;
  brand: string;
  discountText: string;
  expiryHint?: string;
  urgency: 'urgent' | 'active' | 'expired';
  originalFilename: string;
}

export interface DigestEventItem {
  id: string;
  screenshotId: string;
  title: string;
  dateStr: string;
  location?: string;
  bookingRef?: string;
  isUpcoming: boolean;
  originalFilename: string;
}

export interface DigestBillItem {
  id: string;
  screenshotId: string;
  biller: string;
  amount: string;
  dueDate?: string;
  isPending: boolean;
  originalFilename: string;
}

export interface VaultDigestResponse {
  discounts: DigestDiscountItem[];
  events: DigestEventItem[];
  bills: DigestBillItem[];
  total_insights: number;
}

export interface ClutterCandidate {
  id: string;
  screenshotId: string;
  screenshot: any;
  category: 'otp' | 'past_event' | 'temp_receipt' | 'low_utility';
  title: string;
  reason: string;
  snippet: string;
  ageDays: number;
  confidence: number;
}

/**
 * Groups consecutive or sequential chat screenshots into coherent conversation threads.
 */
export async function detectThreadGroups(
  userScreenshots: any[],
  allMessages: any[] = []
): Promise<ThreadGroup[]> {
  const chatScreenshots = userScreenshots
    .filter((s) => s.category === 'chat' || (allMessages && allMessages.some((m) => m.screenshot_id === s.id)))
    .sort((a, b) => {
      const timeA = new Date(a.captured_at || a.created_at || a.uploaded_at).getTime();
      const timeB = new Date(b.captured_at || b.created_at || b.uploaded_at).getTime();
      return timeA - timeB;
    });

  if (chatScreenshots.length < 2) return [];

  // Group by message screenshot_id
  const msgsBySc = new Map<string, any[]>();
  for (const m of allMessages) {
    if (!msgsBySc.has(m.screenshot_id)) msgsBySc.set(m.screenshot_id, []);
    msgsBySc.get(m.screenshot_id)!.push(m);
  }

  const groups: any[][] = [];
  let currentGroup: any[] = [];

  for (let i = 0; i < chatScreenshots.length; i++) {
    const sc = chatScreenshots[i];
    if (currentGroup.length === 0) {
      currentGroup.push(sc);
      continue;
    }

    const prev = currentGroup[currentGroup.length - 1];
    const prevTime = new Date(prev.captured_at || prev.created_at || prev.uploaded_at).getTime();
    const currTime = new Date(sc.captured_at || sc.created_at || sc.uploaded_at).getTime();
    const diffMinutes = Math.abs(currTime - prevTime) / (1000 * 60);

    // If within 40 minutes and same app or conversation
    const isCloseTime = diffMinutes <= 40;
    const sameMimeOrDimensions = sc.width === prev.width && sc.height === prev.height;
    
    // Check if filename sequential: e.g. Screenshot_20261117-0947... and Screenshot_20261117-0948...
    const prevNameDigits = (prev.original_filename || '').replace(/\D+/g, '').slice(-6);
    const currNameDigits = (sc.original_filename || '').replace(/\D+/g, '').slice(-6);
    const isSequentialName = prevNameDigits && currNameDigits && Math.abs(Number(currNameDigits) - Number(prevNameDigits)) <= 5;

    if (isCloseTime || isSequentialName || (diffMinutes <= 90 && sameMimeOrDimensions)) {
      currentGroup.push(sc);
    } else {
      if (currentGroup.length >= 2) {
        groups.push([...currentGroup]);
      }
      currentGroup = [sc];
    }
  }

  if (currentGroup.length >= 2) {
    groups.push([...currentGroup]);
  }

  return groups.map((grp, idx) => {
    let totalMsgs = 0;
    for (const sc of grp) {
      const msgs = msgsBySc.get(sc.id) || [];
      totalMsgs += msgs.length;
    }

    const first = grp[0];
    const last = grp[grp.length - 1];
    const startedAt = first.captured_at || first.created_at || first.uploaded_at;
    const lastAt = last.captured_at || last.created_at || last.uploaded_at;

    // Detect contact or chat title if available
    const firstMsgs = msgsBySc.get(first.id) || [];
    const contactName = firstMsgs.find((m) => m.sender_label)?.sender_label || 'Conversation Thread';

    return {
      threadId: `th_${first.id}`,
      title: `${contactName} (${grp.length} parts)`,
      screenshotIds: grp.map((s) => s.id),
      screenshots: grp,
      messageCount: totalMsgs,
      startedAt,
      lastAt,
    };
  });
}

/**
 * Extracts proactive, actionable insights from screenshots (Coupons, Bookings, Bills).
 */
export async function extractVaultDigest(userScreenshots: any[]): Promise<VaultDigestResponse> {
  const discounts: DigestDiscountItem[] = [];
  const events: DigestEventItem[] = [];
  const bills: DigestBillItem[] = [];

  const KNOWN_BRANDS = [
    'Zomato', 'Swiggy', 'Amazon', 'Myntra', 'Flipkart', 'Uber', 'Ola', 'Blinkit',
    'Zepto', 'Dominos', 'Nike', 'Zara', 'Ajio', 'MakeMyTrip', 'BookMyShow', 'Nykaa'
  ];

  for (const sc of userScreenshots) {
    const ocr = (sc.ocr_text || '').trim();
    const desc = (sc.visual_description || '').trim();
    const combined = `${ocr}\n${desc}`;
    if (!combined) continue;

    // 1. Coupons & Promo Codes
    const couponMatch = combined.match(/(?:code|promo|coupon|use|flat|voucher|save)\s*(?:is|:|-)?\s*([A-Z0-9]{4,15})\b/i);
    const discountAmountMatch = combined.match(/(\d{1,2}%\s*OFF|FLAT\s*(?:₹|Rs\.?|\$)\s*\d+|\b\d+\s*(?:%|percent)\s*off\b)/i);
    
    if (couponMatch || discountAmountMatch) {
      const rawCode = couponMatch ? couponMatch[1].toUpperCase() : '';
      // Filter out common false positives
      if (rawCode && !['DATE', 'CODE', 'USER', 'TIME', 'TOTAL', 'EMAIL', 'PHONE'].includes(rawCode)) {
        let brand = 'Vault Promo';
        for (const b of KNOWN_BRANDS) {
          if (new RegExp(`\\b${b}\\b`, 'i').test(combined)) {
            brand = b;
            break;
          }
        }

        const expMatch = combined.match(/(?:valid\s*(?:till|until|through)|expires\s*(?:in|on)?)\s*([^.\n,]+)/i);
        const expiryHint = expMatch ? expMatch[0].trim().slice(0, 30) : undefined;
        const isUrgent = Boolean(expiryHint && /today|tomorrow|\b[1-3]\s*days?\b/i.test(expiryHint));

        discounts.push({
          id: `disc_${sc.id}_${rawCode}`,
          screenshotId: sc.id,
          code: rawCode,
          brand,
          discountText: discountAmountMatch ? discountAmountMatch[0].toUpperCase() : 'Special Discount',
          expiryHint,
          urgency: isUrgent ? 'urgent' : 'active',
          originalFilename: sc.original_filename || 'Discount Screenshot',
        });
      }
    }

    // 2. Bookings & Upcoming Events
    const isBooking = /(flight|boarding pass|ticket|movie|concert|webinar|booking id|pnr|seat\s*[a-z0-9]+|appointment)/i.test(combined);
    const dateMatch = combined.match(/\b(?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?:st|nd|rd|th)?,?\s*(?:\d{4})?\b/i);

    if (isBooking && dateMatch) {
      const pnrMatch = combined.match(/(?:pnr|booking\s*id|ref(?:erence)?)\s*(?:is|:|-)?\s*([A-Z0-9]{5,10})\b/i);
      const locMatch = combined.match(/(?:at|venue|location|to)\s*([A-Za-z0-9\s,]{4,25})/i);
      
      let title = 'Event Booking';
      if (/flight|boarding pass/i.test(combined)) title = 'Flight Booking';
      else if (/movie|cinema|imax/i.test(combined)) title = 'Movie Ticket';
      else if (/concert|show|fest/i.test(combined)) title = 'Concert / Show';
      else if (/doctor|clinic|hospital|appointment/i.test(combined)) title = 'Appointment';

      events.push({
        id: `ev_${sc.id}`,
        screenshotId: sc.id,
        title,
        dateStr: dateMatch[0],
        location: locMatch ? locMatch[1].trim() : undefined,
        bookingRef: pnrMatch ? pnrMatch[1].toUpperCase() : undefined,
        isUpcoming: true,
        originalFilename: sc.original_filename || 'Event Ticket',
      });
    }

    // 3. Pending Bills & Due Dates
    const isBill = /(bill|invoice|due date|total amount|payment due|electric|wifi|rent|emi|recharge|broadband|credit card)/i.test(combined);
    const amtMatch = combined.match(/(?:₹|Rs\.?|\$|INR)\s*([\d,]+(?:\.\d{2})?)/i);
    const dueMatch = combined.match(/(?:due\s*date|pay\s*by|before)\s*(?:is|:|-)?\s*([^.\n,]{4,24})/i);

    if (isBill && amtMatch) {
      let biller = 'Pending Payment';
      if (/electric/i.test(combined)) biller = 'Electricity Bill';
      else if (/wifi|broadband|internet/i.test(combined)) biller = 'Internet / Wi-Fi';
      else if (/credit\s*card/i.test(combined)) biller = 'Credit Card Bill';
      else if (/rent/i.test(combined)) biller = 'Rent Due';
      else if (/recharge/i.test(combined)) biller = 'Mobile Recharge';
      else if (/emi/i.test(combined)) biller = 'Loan / EMI';

      bills.push({
        id: `bill_${sc.id}`,
        screenshotId: sc.id,
        biller,
        amount: amtMatch[0].toUpperCase(),
        dueDate: dueMatch ? dueMatch[1].trim() : undefined,
        isPending: true,
        originalFilename: sc.original_filename || 'Bill Screenshot',
      });
    }
  }

  return {
    discounts,
    events,
    bills,
    total_insights: discounts.length + events.length + bills.length,
  };
}

/**
 * Identifies candidate disposable screenshots (Expired OTPs, past events, temporary slips).
 */
export async function detectClutterCandidates(userScreenshots: any[]): Promise<ClutterCandidate[]> {
  const candidates: ClutterCandidate[] = [];
  const now = Date.now();

  for (const sc of userScreenshots) {
    const ocr = (sc.ocr_text || '').trim();
    const desc = (sc.visual_description || '').trim();
    const combined = `${ocr}\n${desc}`;
    if (!combined) continue;

    const createdAt = new Date(sc.created_at || sc.uploaded_at).getTime();
    const ageDays = Math.max(0, Math.floor((now - createdAt) / (1000 * 60 * 60 * 24)));

    // 1. One-Time Password / 2FA (Expired after 24 hours)
    const otpMatch = ocr.match(/(?:otp|code|pin|verification(?:\s*code)?|passcode)\s*(?:is|:|#|-)?\s*\b(\d{4,8})\b/i);
    if (otpMatch && ageDays >= 1) {
      candidates.push({
        id: `clutter_otp_${sc.id}`,
        screenshotId: sc.id,
        screenshot: sc,
        category: 'otp',
        title: `Verification Code: ${otpMatch[1]}`,
        reason: `One-Time Password captured ${ageDays} ${ageDays === 1 ? 'day' : 'days'} ago (expired)`,
        snippet: otpMatch[0],
        ageDays,
        confidence: 0.98,
      });
      continue;
    }

    // 2. Past Tickets / Boarding Passes
    const isEvent = /(flight|boarding pass|ticket|movie|cinema|boarding time|seat\s*[a-z0-9]+)/i.test(combined);
    const dateMatch = combined.match(/\b(?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*|\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i);
    
    if (isEvent && dateMatch && ageDays >= 2) {
      const parsedYear = dateMatch[1] ? Number(dateMatch[1]) : new Date().getFullYear();
      const eventTime = Date.parse(`${dateMatch[0]} ${parsedYear}`);
      if (!Number.isNaN(eventTime) && eventTime < now) {
        candidates.push({
          id: `clutter_past_${sc.id}`,
          screenshotId: sc.id,
          screenshot: sc,
          category: 'past_event',
          title: 'Past Event / Boarding Pass',
          reason: `Event date was ${dateMatch[0]} (already passed)`,
          snippet: dateMatch[0],
          ageDays,
          confidence: 0.92,
        });
        continue;
      }
    }

    // 3. Temporary Parking or Transit Token Slip
    const isParkingSlip = /(parking\s*(?:ticket|slip|receipt)|entry\s*token|visitor\s*pass)/i.test(combined);
    if (isParkingSlip && ageDays >= 2) {
      candidates.push({
        id: `clutter_slip_${sc.id}`,
        screenshotId: sc.id,
        screenshot: sc,
        category: 'temp_receipt',
        title: 'Temporary Parking / Entry Pass',
        reason: `Temporary slip older than ${ageDays} days`,
        snippet: 'Parking / entry receipt',
        ageDays,
        confidence: 0.88,
      });
    }
  }

  return candidates.sort((a, b) => b.ageDays - a.ageDays);
}

