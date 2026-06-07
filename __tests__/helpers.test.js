/**
 * Unit tests for the coin-economy helpers.
 * These are pure functions (no native modules), so they run fast and reliably.
 *
 * @format
 */

import {
  calcCampaignCost,
  getSlotCost,
  formatCoins,
  formatRelativeTime,
  extractChannelId,
} from '../src/utils/helpers';

describe('calcCampaignCost', () => {
  it('returns 0 for invalid slot counts', () => {
    expect(calcCampaignCost(0, 'subscribe')).toBe(0);
    expect(calcCampaignCost(-5, 'subscribe')).toBe(0);
  });

  it('multiplies slots by the per-type slot cost', () => {
    expect(calcCampaignCost(10, 'subscribe')).toBe(150); // 10 * 15
    expect(calcCampaignCost(10, 'like')).toBe(90); // 10 * 9
    expect(calcCampaignCost(10, 'subscribe_like')).toBe(200); // 10 * 20
  });

  it('falls back to the subscribe price for unknown types', () => {
    expect(calcCampaignCost(2, 'totally_unknown')).toBe(30); // 2 * 15
  });

  it('adds a per-minute surcharge for watch campaigns', () => {
    expect(calcCampaignCost(5, 'watch', 1)).toBe(35); // 5 * 7
    expect(calcCampaignCost(5, 'watch', 3)).toBe(45); // 5 * (7 + 2)
  });
});

describe('getSlotCost', () => {
  it('returns the flat cost for non-watch types', () => {
    expect(getSlotCost('subscribe')).toBe(15);
    expect(getSlotCost('like')).toBe(9);
  });

  it('scales watch cost with extra minutes', () => {
    expect(getSlotCost('watch', 1)).toBe(7);
    expect(getSlotCost('watch', 4)).toBe(10); // 7 + 3
  });
});

describe('formatCoins', () => {
  it('shows raw numbers below 1000', () => {
    expect(formatCoins(0)).toBe('0');
    expect(formatCoins(999)).toBe('999');
  });

  it('abbreviates thousands', () => {
    expect(formatCoins(1000)).toBe('1.0K');
    expect(formatCoins(1500)).toBe('1.5K');
  });
});

describe('formatRelativeTime', () => {
  it('formats minutes, hours and days ago', () => {
    const minsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const hoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const daysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(minsAgo)).toBe('30m ago');
    expect(formatRelativeTime(hoursAgo)).toBe('2h ago');
    expect(formatRelativeTime(daysAgo)).toBe('3d ago');
  });
});

describe('extractChannelId', () => {
  it('pulls the handle from an @-style URL', () => {
    expect(extractChannelId('https://youtube.com/@myhandle')).toBe('myhandle');
  });

  it('pulls the channel id from a /channel/ URL', () => {
    expect(extractChannelId('https://www.youtube.com/channel/UC123abc')).toBe('UC123abc');
  });

  it('returns the trimmed input when nothing matches', () => {
    expect(extractChannelId('  plainstring  ')).toBe('plainstring');
  });
});
