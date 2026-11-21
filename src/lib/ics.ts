/**
 * RFC 5545 text property escaping for backslash, commas, semicolons, and newlines.
 */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\r|\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/**
 * Folds an iCalendar content line so no folded segment exceeds 75 UTF-8 octets.
 */
export function foldIcsLine(line: string, maxOctets = 75): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= maxOctets) {
    return line;
  }

  const segments: string[] = [];
  let current = '';
  let currentBytes = 0;

  for (const ch of line) {
    const chBytes = encoder.encode(ch).length;
    const limit = segments.length === 0 ? maxOctets : maxOctets - 1;
    if (currentBytes + chBytes > limit && current.length > 0) {
      segments.push(current);
      current = ch;
      currentBytes = chBytes;
    } else {
      current += ch;
      currentBytes += chBytes;
    }
  }

  if (current.length > 0) {
    segments.push(current);
  }

  return segments.join('\r\n ');
}

function normalizeTimePart(time: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match) return '200000';
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return '200000';
  return `${match[1]}${match[2]}00`;
}

export interface GenerateReminderIcsOptions {
  time: string;
  startDate: string;
  appUrl: string;
  uid?: string;
  dtstamp?: string;
}

/**
 * Generates an offline daily calendar reminder (.ics) with local floating time
 * so the user's device calendar app handles notifications without a server.
 */
export function generateReminderIcs(options: GenerateReminderIcsOptions): string {
  const compactDate = options.startDate.replace(/-/g, '');
  const compactTime = normalizeTimePart(options.time);
  const uid = options.uid ?? 'tanggal-tua-daily-reminder@tanggal-tua.local';
  const dtstamp = options.dtstamp ?? `${compactDate}T000000Z`;
  const description = `Buka Tanggal Tua untuk mencatat jajan hari ini: ${options.appUrl}`;

  const rawLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Tanggal Tua//Pengingat Harian//ID',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${compactDate}T${compactTime}`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    `SUMMARY:${escapeIcsText('Catat jajan hari ini')}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${options.appUrl}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'TRIGGER:PT0S',
    `DESCRIPTION:${escapeIcsText('Catat jajan hari ini')}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${rawLines.map((line) => foldIcsLine(line)).join('\r\n')}\r\n`;
}
