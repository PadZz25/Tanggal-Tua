import { describe, expect, it } from 'vitest';
import { escapeIcsText, foldIcsLine, generateReminderIcs } from './ics';

describe('ics reminder generator', () => {
  it('matches the expected RFC 5545 snapshot with CRLF, floating DTSTART, DAILY RRULE, and VALARM', () => {
    const ics = generateReminderIcs({
      time: '20:30',
      startDate: '2026-11-22',
      appUrl: 'https://tanggal-tua.example/',
    });

    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');

    expect(ics.replace(/\r\n/g, '\n')).toMatchInlineSnapshot(`
      "BEGIN:VCALENDAR
      VERSION:2.0
      PRODID:-//Tanggal Tua//Pengingat Harian//ID
      CALSCALE:GREGORIAN
      METHOD:PUBLISH
      BEGIN:VEVENT
      UID:tanggal-tua-daily-reminder@tanggal-tua.local
      DTSTAMP:20261122T000000Z
      DTSTART:20261122T203000
      DURATION:PT15M
      RRULE:FREQ=DAILY
      SUMMARY:Catat jajan hari ini
      DESCRIPTION:Buka Tanggal Tua untuk mencatat jajan hari ini: https://tanggal
       -tua.example/
      URL:https://tanggal-tua.example/
      BEGIN:VALARM
      ACTION:DISPLAY
      TRIGGER:PT0S
      DESCRIPTION:Catat jajan hari ini
      END:VALARM
      END:VEVENT
      END:VCALENDAR
      "
    `);
  });

  it('escapes RFC 5545 special characters cleanly', () => {
    expect(escapeIcsText('a;b,c\\d\ne')).toBe('a\\;b\\,c\\\\d\\ne');
  });

  it('folds lines longer than 75 UTF-8 octets cleanly', () => {
    const folded = foldIcsLine('DESCRIPTION:' + 'a'.repeat(90));
    const segments = folded.split('\r\n');
    expect(segments.length).toBeGreaterThan(1);
    expect(segments[1]?.startsWith(' ')).toBe(true);
    for (const seg of segments) {
      expect(new TextEncoder().encode(seg).length).toBeLessThanOrEqual(75);
    }
  });
});
