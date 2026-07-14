import { MIN_COMMENT_WORDS } from './constants';

export function getWarnings(t) {
  return {
    beforeSubscribe: {
      title: t('warnings.beforeSubscribe.title'),
      message: t('warnings.beforeSubscribe.message'),
      confirmText: t('warnings.beforeSubscribe.confirm'),
    },
    beforeLike: {
      title: t('warnings.beforeLike.title'),
      message: t('warnings.beforeLike.message'),
      confirmText: t('warnings.beforeLike.confirm'),
    },
    beforeLikeComment: {
      title: t('warnings.beforeLikeComment.title'),
      message: t('warnings.beforeLikeComment.message', { min: MIN_COMMENT_WORDS }),
      confirmText: t('warnings.beforeLikeComment.confirm'),
    },
    beforeSubscribeLike: {
      title: t('warnings.beforeSubscribeLike.title'),
      message: t('warnings.beforeSubscribeLike.message'),
      confirmText: t('warnings.beforeSubscribeLike.confirm'),
    },
    beforeWatch: {
      title: t('warnings.beforeWatch.title'),
      message: t('warnings.beforeWatch.message'),
      confirmText: t('warnings.beforeWatch.confirm'),
    },
    earnScreenBanner: t('earn.banner'),
    taskFooterReminder: (type) => t(`warnings.taskReminder.${type}`) || t('warnings.taskReminder.subscribe'),
    campaignFairUse: t('warnings.campaignFairUse'),
  };
}

export function getTaskDescriptions(t) {
  return {
    subscribe:      { emoji: '🔔', label: t('taskTypes.subscribe'),      description: t('taskTypes.subscribe'),      verifiedBy: t('taskTypes.verifiedByApi') },
    like:           { emoji: '👍', label: t('taskTypes.like'),           description: t('taskTypes.like'),           verifiedBy: t('taskTypes.verifiedByApi') },
    like_comment:   { emoji: '👍💬', label: t('taskTypes.like_comment'), description: t('taskTypes.like_comment'),   verifiedBy: t('taskTypes.likeVerified') },
    subscribe_like: { emoji: '🔔👍', label: t('taskTypes.subscribe_like'), description: t('taskTypes.subscribe_like'), verifiedBy: t('taskTypes.bothVerified') },
    watch:          { emoji: '▶️', label: t('taskTypes.watch'),          description: t('taskTypes.watch'),          verifiedBy: t('taskTypes.timerBased') },
  };
}

// Legacy static exports — English fallback for unmigrated components
export const WARNINGS = {
  beforeSubscribe: { title: '⚠️ Before You Subscribe', message: 'Subscribe to the channel on YouTube, then return here.\n\n• Your subscription is verified by YouTube\n• Unsubscribing after claiming coins will result in coins being reclaimed\n• Repeated violations will result in a permanent ban\n\nKeep your subscription — it helps real creators grow.', confirmText: 'I Understand — Open YouTube' },
  beforeLike: { title: '⚠️ Before You Like', message: 'Like the video on YouTube, then return here.\n\n• Your like is verified by YouTube\n• Removing your like after claiming coins will result in coins being reclaimed\n• Repeated violations will result in a permanent ban', confirmText: 'I Understand — Open YouTube' },
  beforeLikeComment: { title: '⚠️ Like + Comment Task', message: 'To complete this task:\n\n1. 👍 Like the video (verified by YouTube)\n2. 💬 Leave a genuine comment of at least 5 words (required — write your own words)\n\n• Both are required and verified. Removing your like/comment after claiming will result in coins being reclaimed', confirmText: 'I Understand — Open YouTube' },
  beforeSubscribeLike: { title: '⚠️ Subscribe + Like Task', message: 'You need to do both actions on YouTube:\n\n1. 🔔 Subscribe to the channel\n2. 👍 Like the video\n\n• Both are verified by YouTube\n• Undoing either after claiming will result in coins being reclaimed', confirmText: 'I Understand — Open YouTube' },
  beforeWatch: { title: '⚠️ Watch Task', message: 'Open the video and watch it for the required time.\n\n• Keep the YouTube app open while the timer runs\n• Return here when done to claim your coins', confirmText: 'I Understand — Open YouTube' },
  earnScreenBanner: '🔒 Subscribe & like actions are verified by YouTube. Undoing them after claiming will result in reclaim and possible ban.',
  taskFooterReminder: (type) => ({ subscribe: 'Keep your subscription to keep your coins.', like: 'Keep your like to keep your coins.', like_comment: 'Keep your like to keep your coins. Comment earns a bonus.', subscribe_like: 'Keep both your subscription and like to keep your coins.', watch: 'Watch the full required time before claiming.' }[type] || 'Complete this task fairly to keep your coins.'),
  campaignFairUse: '📋 Subscribers are verified by YouTube. Users who unsubscribe are automatically detected and removed from your count.',
};

export const TASK_DESCRIPTIONS = {
  subscribe: { emoji: '🔔', label: 'Subscribe', description: 'Subscribe to the channel', verifiedBy: 'Verified by YouTube API' },
  like: { emoji: '👍', label: 'Like Video', description: 'Like the target video', verifiedBy: 'Verified by YouTube API' },
  like_comment: { emoji: '👍💬', label: 'Like + Comment', description: 'Like the video AND leave a genuine comment (both required)', verifiedBy: 'Like & comment verified by YouTube API' },
  subscribe_like: { emoji: '🔔👍', label: 'Subscribe + Like', description: 'Subscribe to channel AND like the video', verifiedBy: 'Both verified by YouTube API' },
  watch: { emoji: '▶️', label: 'Watch Video', description: 'Watch the video for the required duration', verifiedBy: 'Timer-based · May be spot-checked' },
};
