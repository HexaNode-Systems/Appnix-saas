import {
  FacebookPage,
  FacebookUserProfile,
  FacebookChannelConfig,
  WebhookHandshakeStep,
} from '@/types/facebook-channel';

export const COLOR_SWATCH_PRESETS = [
  { id: 'blue', hex: '#2563EB', name: 'Meta Blue' },
  { id: 'emerald', hex: '#059669', name: 'Emerald' },
  { id: 'purple', hex: '#7C3AED', name: 'Royal Purple' },
  { id: 'amber', hex: '#D97706', name: 'Amber Gold' },
  { id: 'rose', hex: '#E11D48', name: 'Rose Red' },
  { id: 'cyan', hex: '#0891B2', name: 'Cyan Teal' },
  { id: 'indigo', hex: '#4F46E5', name: 'Indigo Deep' },
];

const FB_AUTH_KEY = 'appnix_fb_auth_user';
const FB_PAGES_KEY = 'appnix_fb_pages_list';

export function getStoredFacebookUser(): FacebookUserProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FB_AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse Facebook user profile', e);
    return null;
  }
}

export function saveStoredFacebookUser(user: FacebookUserProfile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (user) {
      localStorage.setItem(FB_AUTH_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(FB_AUTH_KEY);
    }
  } catch (e) {
    console.error('Failed to save Facebook user profile', e);
  }
}

export function getStoredFacebookPages(): FacebookPage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(FB_PAGES_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse Facebook pages', e);
    return [];
  }
}

export function saveStoredFacebookPages(pages: FacebookPage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(FB_PAGES_KEY, JSON.stringify(pages));
  } catch (e) {
    console.error('Failed to save Facebook pages', e);
  }
}

export function markPageAsConnected(pageId: string): void {
  const pages = getStoredFacebookPages();
  const updated = pages.map((p) =>
    p.id === pageId ? { ...p, isConnectedToCurrentWorkspace: true } : p
  );
  saveStoredFacebookPages(updated);
}

