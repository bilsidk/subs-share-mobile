let _pricing = null;
let _pricingFailed = false;

export async function loadPricing() {
  try {
    const { api } = await import('../services/api');
    _pricing = await api.getPricing();
    _pricingFailed = false;
  } catch (e) {
    _pricingFailed = true;
    console.warn('[Pricing] Failed to load dynamic pricing, using fallback:', e.message);
  }
}

export async function retryPricing() {
  if (!_pricingFailed) return;
  await loadPricing();
}

export const formatCoins = (amount) => {
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toString();
};

const FALLBACK_COSTS = {
  subscribe: 15, like: 9, like_comment: 17, subscribe_like: 20,
};

function _getCosts() {
  return _pricing?.slot_costs ?? FALLBACK_COSTS;
}

// ── Watch task tiered reward (Economy & Watch Redesign 2026-07-11) ─────────────
// Escalating per-minute EARN (web/base): min 1 = 2 · min 2-10 = +1/min · min 11-20 =
// +2/min · min 21+ = +3/min (10min→11, 20min→31, 30min→61). Margin 25%: owner
// slot_cost = ceil(earn × 1.25). MOBILE pays a flat ±1 nudge on top (watch is exempt
// from the %-based nudge — see backend src/lib/platform.js mobileCampaignCost/
// mobileEarnPayout for task_type 'watch', unchanged by this redesign).
// Client-side ESTIMATE for display only — POST /tasks computes + locks the real
// slot_cost server-side at creation (source of truth, see TD-002).
const WATCH_MARGIN_PCT = 0.25;
const WATCH_MOBILE_FLAT = 1;

export const calcWatchBaseEarn = (minutes) => {
  const m = Math.max(1, Math.min(60, parseInt(minutes, 10) || 1));
  let earn = 2; // minute 1
  for (let i = 2; i <= m; i++) earn += i <= 10 ? 1 : i <= 20 ? 2 : 3;
  return earn;
};

export const calcWatchPricing = (minutes) => {
  const baseEarn = calcWatchBaseEarn(minutes);
  const baseCost = Math.ceil(baseEarn * (1 + WATCH_MARGIN_PCT));
  return {
    earn: baseEarn > WATCH_MOBILE_FLAT ? baseEarn - WATCH_MOBILE_FLAT : baseEarn,
    cost: baseCost + WATCH_MOBILE_FLAT,
  };
};

export const calcCampaignCost = (slots, taskType = 'subscribe', watchMinutes = 1) => {
  if (!slots || slots < 1) return 0;
  if (taskType === 'watch') return slots * calcWatchPricing(watchMinutes).cost;
  const costs = _getCosts();
  const costPerSlot = costs[taskType] || 15;
  return slots * costPerSlot;
};

export const getSlotCost = (taskType, watchMinutes = 1) => {
  if (taskType === 'watch') return calcWatchPricing(watchMinutes).cost;
  const costs = _getCosts();
  return costs[taskType] || 15;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const opts = { month: 'short', day: 'numeric', year: 'numeric' };
  // Format in the user's current language; fall back to en-US if the JS engine's
  // Intl support doesn't handle the locale (Hermes Intl coverage varies).
  try {
    const { getCurrentLanguage } = require('./i18n');
    return date.toLocaleDateString(getCurrentLanguage(), opts);
  } catch (_) {
    return date.toLocaleDateString('en-US', opts);
  }
};

export const formatRelativeTime = (dateStr, t) => {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t ? t('time.justNow') : 'just now';
  if (mins < 60) return t ? t('time.minutesAgo', { n: mins }) : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return t ? t('time.hoursAgo', { n: hrs }) : `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return t ? t('time.daysAgo', { n: days }) : `${days}d ago`;
};

export const extractChannelId = (url) => {
  const patterns = [
    /youtube\.com\/@([^/?]+)/,
    /youtube\.com\/c\/([^/?]+)/,
    /youtube\.com\/channel\/(UC[^/?]+)/,
    /youtube\.com\/user\/([^/?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return url.trim();
};


