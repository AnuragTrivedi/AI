import { Conversation } from '../types';

export interface GroupedConversations {
  today: Conversation[];
  yesterday: Conversation[];
  previous7Days: Conversation[];
  older: Conversation[];
}

export function groupConversationsByDate(conversations: Conversation[]): GroupedConversations {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
  const sevenDaysAgoStart = todayStart - 7 * 24 * 60 * 60 * 1000;

  const groups: GroupedConversations = {
    today: [],
    yesterday: [],
    previous7Days: [],
    older: [],
  };

  for (const conv of conversations) {
    const time = conv.updatedAt || conv.createdAt || 0;
    if (time >= todayStart) {
      groups.today.push(conv);
    } else if (time >= yesterdayStart) {
      groups.yesterday.push(conv);
    } else if (time >= sevenDaysAgoStart) {
      groups.previous7Days.push(conv);
    } else {
      groups.older.push(conv);
    }
  }

  return groups;
}

export function formatTimeAgo(timestamp: number): string {
  if (!timestamp) return '';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function generateConversationTitle(prompt: string): string {
  const clean = prompt
    .replace(/^[#>\s*`-]+/, '')
    .replace(/^please\s+/i, '')
    .replace(/^(can you|could you|explain|tell me about|how to|what is|how do i)\s+/i, '')
    .trim();

  const words = clean.split(/\s+/).slice(0, 6).join(' ');
  const capitalized = words.charAt(0).toUpperCase() + words.slice(1);
  return capitalized.slice(0, 36) || 'New Conversation';
}
