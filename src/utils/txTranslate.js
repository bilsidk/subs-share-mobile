import { I18nManager } from 'react-native';

function wrapRTL(val) {
  if (!I18nManager.isRTL || val == null) return val;
  return `\u200E${val}\u200E`;
}

export function translateTx(description, t) {
  if (!description) return description;

  // Not a structured key — return as-is (legacy English strings)
  if (!description.startsWith('tx:')) return description;

  // Parse key and params
  const parts = description.split('|');
  const key = parts[0].replace('tx:', '');
  const params = {};
  for (let i = 1; i < parts.length; i++) {
    const [k, v] = parts[i].split(':');
    params[k] = v;
  }

  // Task type label mapping
  const taskTypeLabel = (type) => {
    const map = {
      subscribe: t('taskTypes.subscribe'),
      like: t('taskTypes.like'),
      like_comment: t('taskTypes.like_comment'),
      subscribe_like: t('taskTypes.subscribe_like'),
      watch: t('taskTypes.watch'),
    };
    return map[type] || type;
  };

  switch (key) {
    case 'welcome_bonus':
      return t('tx.welcomeBonus');

    case 'campaign_created':
      if (params.free === 'true') {
        return t('tx.campaignCreatedFree', { type: taskTypeLabel(params.type), slots: wrapRTL(params.slots) });
      }
      return t('tx.campaignCreated', { type: taskTypeLabel(params.type), slots: wrapRTL(params.slots), cost: wrapRTL(params.cost) });

    case 'task_completed':
      return t('tx.taskCompleted', { type: taskTypeLabel(params.type) });

    case 'task_completed_comment':
      return t('tx.taskCompletedComment', { type: taskTypeLabel(params.type), bonus: wrapRTL(params.bonus) });

    case 'campaign_cancelled':
      return t('tx.campaignCancelled', { slots: wrapRTL(params.slots), refund: wrapRTL(params.refund) });

    case 'campaign_cancelled_free':
      return t('tx.campaignCancelledFree');

    case 'coins_reclaimed':
      return t('tx.coinsReclaimed', { type: taskTypeLabel(params.type) });

    case 'purchase':
      return params.usd
        ? t('tx.purchase', { coins: wrapRTL(params.coins), usd: wrapRTL(params.usd) })
        : t('tx.purchaseCoins', { coins: wrapRTL(params.coins) });

    case 'campaign_refund':
      return t('tx.campaignRefund', { refund: wrapRTL(params.refund) });

    case 'referral_referee':
    case 'referral_referrer':
      return t('tx.referralBonus');

    case 'referral_reversed':
      return t('tx.referralReversed');

    default:
      return description; // Unknown key — show raw
  }
}
