// src/__tests__/utils.test.js
import { describe, it, expect } from 'vitest';

function toLocalMidnight(dateish) {
  if (dateish instanceof Date) return new Date(dateish.getFullYear(), dateish.getMonth(), dateish.getDate());
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateish) || '');
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(dateish);
}
function toTitleCase(s='') {
  return String(s).trim().replace(/\s+/g,' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

describe('helpers', () => {
  it('toLocalMidnight makes local midnight from YYYY-MM-DD', () => {
    const d = toLocalMidnight('2025-08-08');
    expect(d.getHours()).toBe(0);
  });
  it('toTitleCase normalizes casing', () => {
    expect(toTitleCase('  BUTTER  ')).toBe('Butter');
    expect(toTitleCase('sweet   potato')).toBe('Sweet Potato');
  });
});
