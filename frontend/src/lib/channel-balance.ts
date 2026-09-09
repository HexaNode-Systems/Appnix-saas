import {
  ChannelAccountDetails,
  ChannelTransaction,
  ConversationCategory,
} from '@/types/channel-balance';

export const DEFAULT_WHATSAPP_ACCOUNT: ChannelAccountDetails = {
  id: '1',
  name: 'WhatsApp Business',
  phoneNumber: 'Official WhatsApp Number',
  channelType: 'WhatsApp Cloud API (Official)',
  wabaId: 'waba_official',
  status: 'connected',
  qualityScore: 'Good',
  currentBalance: 0.0,
  currency: 'INR',
  lastSyncedAt: new Date().toISOString(),
  minThreshold: 100.0,
  autoRechargeEnabled: true,
};

export const INITIAL_CHANNEL_TRANSACTIONS: ChannelTransaction[] = [
  {
    id: 'TXN_WA_984102',
    timestamp: '2026-08-30T14:45:12Z',
    description: 'Outbound Marketing Broadcast (Festival Season VIP Discount)',
    campaignName: 'Festival Season VIP Discount 25%',
    templateName: 'festive_season_promo',
    recipientPhone: '+91 98765 43210',
    recipientName: 'Jitendra Kumar',
    channel: 'whatsapp',
    category: 'MARKETING',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.7800,
    baseRate: 0.7200,
    platformFee: 0.0400,
    taxAmount: 0.0200,
    amount: 0.7800,
    closingBalance: 39.1918,
    deliveryStatus: 'READ',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OTQA',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: '🎉 Mega Festive Sale is Live for Jitendra Kumar! Get FLAT 35% OFF on all workflow bots...',
    sentAt: '2026-08-30T14:45:10Z',
    deliveredAt: '2026-08-30T14:45:12Z',
    readAt: '2026-08-30T14:46:01Z',
  },
  {
    id: 'TXN_WA_984101',
    timestamp: '2026-08-30T13:20:05Z',
    description: 'Order Confirmation & Logistics Tracking Alert #ORD-98214',
    campaignName: 'E-Commerce Order Notification',
    templateName: 'order_confirmation_v2',
    recipientPhone: '+91 98112 34567',
    recipientName: 'Priya Sharma',
    channel: 'whatsapp',
    category: 'UTILITY',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.3082,
    baseRate: 0.2800,
    platformFee: 0.0200,
    taxAmount: 0.0082,
    amount: 0.3082,
    closingBalance: 39.9718,
    deliveryStatus: 'DELIVERED',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFB',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Hello Priya Sharma, your order #ORD-98214 amounting to ₹4,999 has been packed...',
    sentAt: '2026-08-30T13:20:04Z',
    deliveredAt: '2026-08-30T13:20:05Z',
  },
  {
    id: 'TXN_WA_984100',
    timestamp: '2026-08-30T12:10:44Z',
    description: 'Instant Login Security OTP Passcode Verification',
    campaignName: 'App Authentication OTP Gateway',
    templateName: 'instant_login_security_otp',
    recipientPhone: '+91 99201 88291',
    recipientName: 'Rahul Verma',
    channel: 'whatsapp',
    category: 'AUTHENTICATION',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.1200,
    baseRate: 0.1100,
    platformFee: 0.0050,
    taxAmount: 0.0050,
    amount: 0.1200,
    closingBalance: 40.2800,
    deliveryStatus: 'DELIVERED',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFC',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: '🔐 Appnix Security Alert: Your one-time login verification passcode is 849201. Valid for 10 mins.',
    sentAt: '2026-08-30T12:10:43Z',
    deliveredAt: '2026-08-30T12:10:44Z',
  },
  {
    id: 'TXN_WA_984099',
    timestamp: '2026-08-30T10:15:30Z',
    description: 'Direct Inbound Customer Support Session (24h Service Window)',
    campaignName: 'Direct Inbound Chat',
    recipientPhone: '+91 97182 99012',
    recipientName: 'Amit Patel',
    channel: 'whatsapp',
    category: 'SERVICE',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.0000,
    baseRate: 0.0000,
    platformFee: 0.0000,
    taxAmount: 0.0000,
    amount: 0.0000,
    closingBalance: 40.4000,
    deliveryStatus: 'DELIVERED',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFD',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Hi, I need help with my cloud automation webhook setup. Agent Jitendra responded.',
    sentAt: '2026-08-30T10:15:28Z',
    deliveredAt: '2026-08-30T10:15:30Z',
  },
  {
    id: 'TXN_WA_984098',
    timestamp: '2026-08-29T17:40:18Z',
    description: 'Flash Weekend Deal Campaign Broadcast (Failed Carrier Delivery)',
    campaignName: 'Flash Weekend Flash Sale',
    templateName: 'festive_season_promo',
    recipientPhone: '+91 98400 11223',
    recipientName: 'S. Sundar',
    channel: 'whatsapp',
    category: 'MARKETING',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.7800,
    baseRate: 0.7200,
    platformFee: 0.0400,
    taxAmount: 0.0200,
    amount: 0.7800,
    closingBalance: 40.4000,
    deliveryStatus: 'FAILED',
    isAutoRefunded: true,
    refundTxnId: 'TXN_REF_984097',
    failedReason: 'Recipient handset unreachable or phone switched off for >24h. Auto-refund credited.',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFE',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: '⚡ Flash Weekend Deal: 50% discount on all CRM broadcast plans...',
    sentAt: '2026-08-29T17:40:18Z',
  },
  {
    id: 'TXN_REF_984097',
    timestamp: '2026-08-29T17:41:00Z',
    description: 'Auto-Refund Adjustment: Failed Message Delivery (Ref: TXN_WA_984098)',
    campaignName: 'Flash Weekend Flash Sale',
    recipientPhone: '+91 98400 11223',
    recipientName: 'S. Sundar',
    channel: 'whatsapp',
    category: 'REFUND',
    type: 'REFUND',
    unitCount: 1,
    unitRate: 0.7800,
    amount: 0.7800,
    closingBalance: 41.1800,
    deliveryStatus: 'COMPLETED',
    metaBillingId: 'refund_meta_wa_984098',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Automated 100% credit reversal for failed carrier delivery within 24-hour guarantee window.',
  },
  {
    id: 'TXN_WA_984096',
    timestamp: '2026-08-28T16:30:00Z',
    description: 'Prepaid Wallet Top-up - Cashfree Corporate UPI Gateway',
    recipientPhone: '+91 98765 00000',
    channel: 'wallet',
    category: 'TOPUP',
    type: 'CREDIT',
    unitCount: 1,
    unitRate: 5000.0000,
    amount: 5000.0000,
    closingBalance: 40.4000,
    deliveryStatus: 'COMPLETED',
    metaBillingId: 'pay_CF_9918290124',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Prepaid wallet credit added via UPI ID appnix@hdfcbank. GST Invoice: INV-2026-08-091.',
  },
  {
    id: 'TXN_WA_984095',
    timestamp: '2026-08-28T14:10:11Z',
    description: 'Abandoned Cart Recovery Sequence (1-Click Checkout Offer)',
    campaignName: 'Abandoned Cart Sequence',
    templateName: 'festive_season_promo',
    recipientPhone: '+91 98101 22334',
    recipientName: 'Ananya Roy',
    channel: 'whatsapp',
    category: 'MARKETING',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.7800,
    baseRate: 0.7200,
    platformFee: 0.0400,
    taxAmount: 0.0200,
    amount: 0.7800,
    closingBalance: 40.4000,
    deliveryStatus: 'READ',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFF',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Hi Ananya, you left items in your cart! Complete your purchase now for 10% instant off...',
    sentAt: '2026-08-28T14:10:09Z',
    deliveredAt: '2026-08-28T14:10:11Z',
    readAt: '2026-08-28T14:12:30Z',
  },
  {
    id: 'TXN_WA_984094',
    timestamp: '2026-08-27T09:12:40Z',
    description: 'Flight Boarding Pass Update & Gate Navigation Alert #AI-804',
    campaignName: 'Flight Boarding Update',
    templateName: 'order_confirmation_v2',
    recipientPhone: '+91 99887 76655',
    recipientName: 'Vikram Malhotra',
    channel: 'whatsapp',
    category: 'UTILITY',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.3082,
    baseRate: 0.2800,
    platformFee: 0.0200,
    taxAmount: 0.0082,
    amount: 0.3082,
    closingBalance: 41.1800,
    deliveryStatus: 'DELIVERED',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFG',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Flight AI-804 departs at 14:30 from T3 Gate 14B. Digital boarding pass attached.',
    sentAt: '2026-08-27T09:12:39Z',
    deliveredAt: '2026-08-27T09:12:40Z',
  },
  {
    id: 'TXN_WA_984093',
    timestamp: '2026-08-26T11:35:19Z',
    description: 'Password Reset One-Time Passcode Authorization',
    campaignName: 'OTP Login Verification',
    templateName: 'instant_login_security_otp',
    recipientPhone: '+91 91234 56780',
    recipientName: 'Neha Gupta',
    channel: 'whatsapp',
    category: 'AUTHENTICATION',
    type: 'DEBIT',
    unitCount: 1,
    unitRate: 0.1200,
    baseRate: 0.1100,
    platformFee: 0.0050,
    taxAmount: 0.0050,
    amount: 0.1200,
    closingBalance: 41.4882,
    deliveryStatus: 'DELIVERED',
    metaBillingId: 'wamid.HBgLMjE2OTM3Mzg2OQUCABEYEkZEMTA5OENBQzg5REQ0OUFH',
    wabaId: 'waba_984102910842',
    messagePayloadSnippet: 'Your password reset security token is 492018. Valid for 5 minutes only.',
    sentAt: '2026-08-26T11:35:18Z',
    deliveredAt: '2026-08-26T11:35:19Z',
  },
];

const STORAGE_KEY_PREFIX = 'appnix_channel_balance_';
const TXN_KEY_PREFIX = 'appnix_channel_transactions_';

export function getChannelAccountData(channelId = '1'): ChannelAccountDetails {
  if (typeof window === 'undefined') return DEFAULT_WHATSAPP_ACCOUNT;
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${channelId}`);
    if (!raw) {
      localStorage.setItem(
        `${STORAGE_KEY_PREFIX}${channelId}`,
        JSON.stringify(DEFAULT_WHATSAPP_ACCOUNT)
      );
      return DEFAULT_WHATSAPP_ACCOUNT;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error loading channel account data:', e);
    return DEFAULT_WHATSAPP_ACCOUNT;
  }
}

export function saveChannelAccountData(
  channelId = '1',
  account: ChannelAccountDetails
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${channelId}`, JSON.stringify(account));
    window.dispatchEvent(new Event('channel-balance-updated'));
  } catch (e) {
    console.error('Error saving channel account data:', e);
  }
}

export function getChannelTransactions(channelId = '1'): ChannelTransaction[] {
  if (typeof window === 'undefined') return INITIAL_CHANNEL_TRANSACTIONS;
  try {
    const raw = localStorage.getItem(`${TXN_KEY_PREFIX}${channelId}`);
    if (!raw) {
      localStorage.setItem(
        `${TXN_KEY_PREFIX}${channelId}`,
        JSON.stringify(INITIAL_CHANNEL_TRANSACTIONS)
      );
      return INITIAL_CHANNEL_TRANSACTIONS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return INITIAL_CHANNEL_TRANSACTIONS;
  } catch (e) {
    console.error('Error loading transactions:', e);
    return INITIAL_CHANNEL_TRANSACTIONS;
  }
}

export function saveChannelTransactions(
  channelId = '1',
  txns: ChannelTransaction[]
): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${TXN_KEY_PREFIX}${channelId}`, JSON.stringify(txns));
    window.dispatchEvent(new Event('channel-transactions-updated'));
  } catch (e) {
    console.error('Error saving transactions:', e);
  }
}

export function formatCurrency4(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })}`;
}

export function formatCurrency2(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export const CATEGORY_BADGE_STYLES: Record<
  ConversationCategory,
  { label: string; style: string }
> = {
  MARKETING: {
    label: 'Marketing',
    style:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300',
  },
  UTILITY: {
    label: 'Utility',
    style:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
  },
  AUTHENTICATION: {
    label: 'Authentication (OTP)',
    style:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  SERVICE: {
    label: 'Service (24h Window)',
    style:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300',
  },
  TOPUP: {
    label: 'Wallet Top-up',
    style:
      'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-200',
  },
  REFUND: {
    label: 'Auto-Refund Credit',
    style:
      'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/60 dark:text-cyan-300',
  },
};
