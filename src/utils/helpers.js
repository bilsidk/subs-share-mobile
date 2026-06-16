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
  subscribe: 15, like: 9, like_comment: 13, subscribe_like: 20, watch: 7,
};
const FALLBACK_WATCH_EXTRA = 1;

function _getCosts() {
  return _pricing?.slot_costs ?? FALLBACK_COSTS;
}

function _getWatchExtra() {
  return _pricing?.watch_extra_min_cost ?? FALLBACK_WATCH_EXTRA;
}

export const calcCampaignCost = (slots, taskType = 'subscribe', watchMinutes = 1) => {
  if (!slots || slots < 1) return 0;
  const costs = _getCosts();
  let costPerSlot = costs[taskType] || 15;
  if (taskType === 'watch') {
    const extraMins = Math.max(0, watchMinutes - 1);
    costPerSlot = costs.watch + (extraMins * _getWatchExtra());
  }
  return slots * costPerSlot;
};

export const getSlotCost = (taskType, watchMinutes = 1) => {
  const costs = _getCosts();
  if (taskType === 'watch') {
    const extraMins = Math.max(0, watchMinutes - 1);
    return costs.watch + (extraMins * _getWatchExtra());
  }
  return costs[taskType] || 15;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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


