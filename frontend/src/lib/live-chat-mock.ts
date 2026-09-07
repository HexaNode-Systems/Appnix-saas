import {
  ChatAgent,
  ConversationSessionState,
  LiveChatConversation,
  LiveChatMessage,
} from '@/types/live-chat';

export const MOCK_AGENTS: ChatAgent[] = [
  {
    id: 'agent-1',
    name: 'Jitendra Kumar',
    email: 'jitendra@appnix.io',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=64&h=64&fit=crop&crop=faces',
    role: 'Lead Solutions Architect',
    department: 'sales',
    isOnline: true,
  },
  {
    id: 'agent-2',
    name: 'Aarav Sharma',
    email: 'aarav@appnix.io',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=faces',
    role: 'Customer Support Lead',
    department: 'support',
    isOnline: true,
  },
  {
    id: 'agent-3',
    name: 'Pooja Iyer',
    email: 'pooja@appnix.io',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop&crop=faces',
    role: 'Billing & Subscriptions Manager',
    department: 'billing',
    isOnline: false,
  },
  {
    id: 'agent-4',
    name: 'Rohan Mehta',
    email: 'rohan@appnix.io',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=64&h=64&fit=crop&crop=faces',
    role: 'Enterprise Onboarding Specialist',
    department: 'onboarding',
    isOnline: true,
  },
];

export const MOCK_APPROVED_TEMPLATES = [
  {
    id: 'tpl-reengage-1',
    name: 'reengage_support_ticket',
    displayName: 'Support Ticket Follow-Up',
    category: 'UTILITY',
    channel: 'whatsapp' as const,
    language: 'en_US',
    bodyText: 'Hello {{1}}, we noticed your inquiry regarding {{2}} is still open. Are you still experiencing issues or may we close this ticket?',
    header: 'Ticket Update (#{{3}})',
    buttons: ['Yes, resolve ticket', 'Need more help'],
  },
  {
    id: 'tpl-reengage-2',
    name: 'enterprise_quote_reminder',
    displayName: 'Enterprise Quotation Review',
    category: 'MARKETING',
    channel: 'whatsapp' as const,
    language: 'en_US',
    bodyText: 'Hi {{1}}! Your customized enterprise quota for {{2}} channels has been prepared. Would you like to schedule a quick 10-minute walkthrough with our architect?',
    header: 'Appnix Enterprise Proposal',
    buttons: ['Schedule Demo', 'View PDF Quote'],
  },
  {
    id: 'tpl-reengage-3',
    name: 'rcs_product_showcase',
    displayName: 'RCS Product Catalog Showcase',
    category: 'MARKETING',
    channel: 'rcs' as const,
    language: 'en',
    bodyText: 'Explore our latest verified RCS business messaging features with dynamic carousel cards and 1-tap OTP verification.',
    header: 'RCS Business Suite',
    buttons: ['Explore Catalog', 'Contact Specialist'],
  },
];

export function computeSessionState(lastCustomerIso: string): ConversationSessionState {
  const now = Date.now();
  const lastTime = new Date(lastCustomerIso).getTime();
  const expiresTime = lastTime + 24 * 60 * 60 * 1000;
  const remainingMs = expiresTime - now;

  if (remainingMs <= 0) {
    return {
      isActive: false,
      lastCustomerMessageAt: lastCustomerIso,
      expiresAt: new Date(expiresTime).toISOString(),
      remainingHours: 0,
      remainingMinutes: 0,
      formattedRemaining: '24h Window Expired',
    };
  }

  const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
  const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));

  return {
    isActive: true,
    lastCustomerMessageAt: lastCustomerIso,
    expiresAt: new Date(expiresTime).toISOString(),
    remainingHours,
    remainingMinutes,
    formattedRemaining: `${remainingHours}h ${remainingMinutes}m remaining`,
  };
}
export const INITIAL_CONVERSATIONS: LiveChatConversation[] = [];

const STORAGE_KEY = 'appnix_crm_live_chat_v2';

export function getStoredConversations(): LiveChatConversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Purge legacy mock conversations if stored previously in client browser
      const cleaned = parsed.filter(
        (c: any) =>
          c.id !== 'conv-1' &&
          c.id !== 'conv-2' &&
          c.id !== 'conv-3' &&
          c.id !== 'conv-4' &&
          c.id !== 'conv-5' &&
          c.name !== 'Ankit Bansal' &&
          c.name !== 'Nourin Sodawala' &&
          c.name !== 'Sneha Patel' &&
          c.name !== 'Vikram Malhotra' &&
          c.name !== 'Sarah Jenkins' &&
          c.name !== 'Vikram Patel' &&
          c.name !== 'Elena Rostova' &&
          c.name !== 'David Chen'
      );
      if (cleaned.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      }
      return cleaned;
    }
    return [];
  } catch (e) {
    console.error('Failed to parse conversations from localStorage:', e);
    return [];
  }
}

export function saveStoredConversations(conversations: LiveChatConversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    window.dispatchEvent(new Event('live-chat-updated'));
  } catch (e) {
    console.error('Failed to save conversations to localStorage:', e);
  }
}
