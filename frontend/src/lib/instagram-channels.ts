import {
  InstagramDiscoveredAccount,
  InstagramUserProfile,
  InstagramChannelConfig,
  InstagramWebhookHandshakeStep,
} from '@/types/instagram-channel';

export const INSTAGRAM_COLOR_SWATCH_PRESETS = [
  { id: 'rose', hex: '#E1306C', name: 'Instagram Rose' },
  { id: 'purple', hex: '#833AB4', name: 'Meta Purple' },
  { id: 'amber', hex: '#F77737', name: 'Warm Amber' },
  { id: 'blue', hex: '#405DE6', name: 'Royal Blue' },
  { id: 'emerald', hex: '#059669', name: 'Emerald' },
  { id: 'indigo', hex: '#4F46E5', name: 'Deep Indigo' },
];

const IG_AUTH_KEY = 'appnix_ig_auth_user';
const IG_ACCOUNTS_KEY = 'appnix_ig_accounts_list';

export function getStoredInstagramUser(): InstagramUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(IG_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse Instagram user profile', e);
    return null;
  }
}

export function saveStoredInstagramUser(user: InstagramUserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(IG_AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(IG_AUTH_KEY);
    }
  } catch (e) {
    console.error('Failed to save Instagram user profile', e);
  }
}

export function getStoredInstagramAccounts(): InstagramDiscoveredAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(IG_ACCOUNTS_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse Instagram accounts', e);
    return [];
  }
}

export function saveStoredInstagramAccounts(accounts: InstagramDiscoveredAccount[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(IG_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save Instagram accounts', e);
  }
}

export function markInstagramAccountAsConnected(instagramBusinessId: string): void {
  const accounts = getStoredInstagramAccounts();
  const updated = accounts.map((a) =>
    a.instagramBusinessId === instagramBusinessId
      ? { ...a, isAlreadyConnected: true, isConnectedToCurrentWorkspace: true }
      : a,
  );
  saveStoredInstagramAccounts(updated);
}
