import {
  WhatsAppTemplate,
  TemplateCategory,
  TemplateContentType,
  WhatsAppTemplateStatus,
  ValidationError,
  TemplateVariable,
} from '@/types/whatsapp-template';

export const SUPPORTED_LANGUAGES = [
  { code: 'en_US', label: 'English (US)' },
  { code: 'en_GB', label: 'English (UK)' },
  { code: 'hi', label: 'Hindi (हिंदी)' },
  { code: 'hinglish', label: 'Hinglish (Hindi in Latin script)' },
  { code: 'es', label: 'Spanish (Español)' },
  { code: 'ar', label: 'Arabic (العربية)' },
  { code: 'pt_BR', label: 'Portuguese (Brasil)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
];

export const CATEGORY_DETAILS: Record<
  TemplateCategory,
  { title: string; subtitle: string; example: string; badgeColor: string }
> = {
  AUTHENTICATION: {
    title: 'Authentication',
    subtitle: 'OTP, login verification and account security messages.',
    example: 'Your login OTP is {{1}}. Valid for 10 mins.',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  MARKETING: {
    title: 'Marketing',
    subtitle: 'Promotional offers, campaigns and customer engagement.',
    example: 'Enjoy 30% OFF this weekend with code {{1}}!',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300',
  },
  UTILITY: {
    title: 'Utility',
    subtitle: 'Order updates, reminders, confirmations and transactional messages.',
    example: 'Your order #{{1}} has been confirmed and shipped.',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300',
  },
};

export const STANDARD_DATA_SOURCES = [
  { id: 'contact.name', label: 'Customer Full Name', defaultSample: 'John Doe' },
  { id: 'contact.first_name', label: 'Customer First Name', defaultSample: 'John' },
  { id: 'contact.phone', label: 'Customer Phone Number', defaultSample: '+1 555-0100' },
  { id: 'order.id', label: 'Order ID', defaultSample: 'ORD-10001' },
  { id: 'order.total', label: 'Order Amount', defaultSample: '$99.00' },
  { id: 'order.date', label: 'Order Date', defaultSample: '29 Aug 2026' },
  { id: 'order.delivery_date', label: 'Estimated Delivery Date', defaultSample: 'Tomorrow, 5:00 PM' },
  { id: 'company.name', label: 'Company / Brand Name', defaultSample: 'Appnix' },
  { id: 'auth.otp', label: 'OTP Code', defaultSample: '123456' },
  { id: 'offer.discount', label: 'Discount Percentage', defaultSample: '20%' },
  { id: 'offer.code', label: 'Promo Code', defaultSample: 'SAVE20' },
  { id: 'custom', label: 'Custom Variable (Manual input)', defaultSample: 'Sample Value' },
];

export const INITIAL_TEMPLATES: WhatsAppTemplate[] = [];

const STORAGE_KEY = 'appnix_whatsapp_templates';

const LEGACY_DUMMY_IDS = new Set([
  'tpl-1',
  'tpl-2',
  'tpl-3',
  'tpl-4',
  'tpl-5',
  'tpl-6',
  'tpl-7',
  'tpl-101',
  'tpl-102',
  'tpl-103',
  'tpl-104',
  'tpl-105',
  'tpl-106',
]);

const LEGACY_DUMMY_NAMES = new Set([
  'order_confirmation_v2',
  'festive_season_promo',
  'festive_diwali_special',
  'account_verification_otp',
  'account_login_otp',
  'shipping_dispatch_express',
  'shipping_dispatch_alert',
  'flash_discount_rejected_example',
  'flash_sale_promo_rejected',
  'automation_carousel_suite',
  'draft_survey_feedback',
  'abandoned_cart_recovery',
  'abandoned_cart_reminder_draft',
]);

export function getStoredTemplates(): WhatsAppTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Clean out any legacy mock/dummy templates that were previously seeded
      const filtered = parsed.filter(
        (t) => t && !LEGACY_DUMMY_IDS.has(t.id) && !LEGACY_DUMMY_NAMES.has(t.name)
      );
      if (filtered.length !== parsed.length) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
      return filtered;
    }
    return [];
  } catch (err) {
    console.error('Error loading stored templates:', err);
    return [];
  }
}

export function saveStoredTemplates(templates: WhatsAppTemplate[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch (err) {
    console.error('Error saving templates to localStorage:', err);
  }
}

/**
 * Extracts {{1}}, {{2}}, etc. from text strings.
 */
export function extractVariablesFromText(text: string): number[] {
  if (!text) return [];
  const regex = /\{\{(\d+)\}\}/g;
  const indices: number[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1], 10);
    if (!indices.includes(num)) {
      indices.push(num);
    }
  }
  return indices.sort((a, b) => a - b);
}

/**
 * Interpolates variables in a string with sample values.
 */
export function interpolateVariables(
  text: string,
  variables: TemplateVariable[],
  customOverrides?: Record<string, string>
): string {
  if (!text) return '';
  let result = text;
  variables.forEach((v) => {
    const placeholder = `{{${v.index}}}`;
    const val = customOverrides?.[v.index] || v.sampleValue || `[${v.name || `Var ${v.index}`}]`;
    result = result.replaceAll(placeholder, val);
  });
  return result;
}

/**
 * Formats WhatsApp text markup (*bold*, _italic_, ~strike~, ```code```)
 */
export function parseWhatsAppFormatting(text: string): string {
  if (!text) return '';
  let formatted = text
    // Monospace
    .replace(/```([\s\S]*?)```/g, '<code class="font-mono bg-black/10 dark:bg-white/10 px-1 py-0.5 rounded text-[11px]">$1</code>')
    // Bold
    .replace(/\*([^\*]+)\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/_([^_]+)_/g, '<em class="italic">$1</em>')
    // Strikethrough
    .replace(/~([^~]+)~/g, '<del class="line-through text-muted-foreground/80">$1</del>');

  // Newlines to <br/>
  formatted = formatted.replace(/\n/g, '<br/>');
  return formatted;
}

/**
 * Complete Meta Validation Rules Check
 */
export function validateTemplate(template: Partial<WhatsAppTemplate>): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Name validation
  if (!template.name || !template.name.trim()) {
    errors.push({ field: 'name', message: 'Template name is required' });
  } else {
    const nameTrimmed = template.name.trim();
    if (!/^[a-z0-9_]+$/.test(nameTrimmed)) {
      errors.push({
        field: 'name',
        message: 'Template name can only contain lowercase letters, numbers, and underscores (no spaces or special chars)',
      });
    }
    if (nameTrimmed.length > 512) {
      errors.push({ field: 'name', message: 'Template name cannot exceed 512 characters' });
    }
  }

  // 2. Category
  if (!template.category) {
    errors.push({ field: 'category', message: 'Please select a template category' });
  }

  // 3. Language
  if (!template.language) {
    errors.push({ field: 'language', message: 'Please select a template language' });
  }

  // 4. Content Type & Body
  if (template.contentType !== 'CATALOG') {
    if (!template.body || !template.body.trim()) {
      errors.push({ field: 'body', message: 'Message body text is required' });
    } else {
      if (template.body.length > 1024) {
        errors.push({
          field: 'body',
          message: `Body text exceeds Meta limit of 1024 characters (currently ${template.body.length})`,
        });
      }

      // Check variable sequential numbering
      const bodyVars = extractVariablesFromText(template.body);
      if (bodyVars.length > 0) {
        // Must start with 1
        if (bodyVars[0] !== 1) {
          errors.push({
            field: 'body',
            message: 'Variables must start with {{1}} sequentially without skipping numbers',
          });
        }
        // Must not have gaps
        for (let i = 0; i < bodyVars.length; i++) {
          if (bodyVars[i] !== i + 1) {
            errors.push({
              field: 'body',
              message: `Variable sequence is broken: found {{${bodyVars[i]}}} instead of {{${i + 1}}}`,
            });
            break;
          }
        }
      }
    }
  }

  // 5. Header validation
  if (template.header) {
    if (template.header.type === 'TEXT') {
      if (!template.header.text || !template.header.text.trim()) {
        errors.push({ field: 'header.text', message: 'Header text is required when Text Header is selected' });
      } else if (template.header.text.length > 60) {
        errors.push({
          field: 'header.text',
          message: `Header text exceeds 60 characters (currently ${template.header.text.length})`,
        });
      }
    }
    if (template.contentType === 'MEDIA' && template.header.type === 'NONE') {
      errors.push({
        field: 'header.type',
        message: 'Media message requires selecting an Image, Video, or Document header',
      });
    }
  }

  // 6. Footer validation
  if (template.footer && template.footer.length > 60) {
    errors.push({
      field: 'footer',
      message: `Footer text exceeds 60 characters (currently ${template.footer.length})`,
    });
  }

  // 7. Buttons validation
  if (template.buttons && template.buttons.length > 0) {
    const urlButtons = template.buttons.filter((b) => b.type === 'URL');
    const phoneButtons = template.buttons.filter((b) => b.type === 'PHONE_NUMBER');
    const quickReplies = template.buttons.filter((b) => b.type === 'QUICK_REPLY');

    if (urlButtons.length > 2) {
      errors.push({ field: 'buttons', message: 'Meta allows a maximum of 2 URL CTA buttons' });
    }
    if (phoneButtons.length > 1) {
      errors.push({ field: 'buttons', message: 'Meta allows a maximum of 1 Phone Call button' });
    }
    if (quickReplies.length > 10) {
      errors.push({ field: 'buttons', message: 'Meta allows a maximum of 10 Quick Reply buttons' });
    }

    template.buttons.forEach((btn, idx) => {
      if (!btn.text || !btn.text.trim()) {
        errors.push({ field: `buttons.${idx}.text`, message: `Button #${idx + 1} text is required` });
      } else if (btn.text.length > 25) {
        errors.push({
          field: `buttons.${idx}.text`,
          message: `Button #${idx + 1} text exceeds 25 characters`,
        });
      }

      if (btn.type === 'URL') {
        if (!btn.url || !btn.url.trim()) {
          errors.push({ field: `buttons.${idx}.url`, message: `Button #${idx + 1} URL is required` });
        } else if (!/^https?:\/\//i.test(btn.url.trim())) {
          errors.push({
            field: `buttons.${idx}.url`,
            message: `Button #${idx + 1} URL must start with http:// or https://`,
          });
        }
      }

      if (btn.type === 'PHONE_NUMBER') {
        if (!btn.phoneNumber || !btn.phoneNumber.trim()) {
          errors.push({
            field: `buttons.${idx}.phoneNumber`,
            message: `Button #${idx + 1} Phone Number is required`,
          });
        }
      }
    });
  }

  // 8. Carousel validation
  if (template.contentType === 'CAROUSEL') {
    const cards = template.carouselCards || [];
    if (cards.length < 2) {
      errors.push({
        field: 'carousel',
        message: 'Carousel requires a minimum of 2 cards (up to 10 cards allowed)',
      });
    } else if (cards.length > 10) {
      errors.push({
        field: 'carousel',
        message: 'Carousel exceeds maximum limit of 10 cards',
      });
    }

    cards.forEach((card, idx) => {
      if (!card.body || !card.body.trim()) {
        errors.push({ field: `carousel.${idx}.body`, message: `Carousel Card #${idx + 1} body is required` });
      }
      if (card.buttons && card.buttons.length > 2) {
        errors.push({
          field: `carousel.${idx}.buttons`,
          message: `Carousel Card #${idx + 1} can have at most 2 CTA buttons`,
        });
      }
    });
  }

  // 9. Catalog validation
  if (template.contentType === 'CATALOG') {
    if (!template.catalog?.catalogId) {
      errors.push({ field: 'catalog.catalogId', message: 'Please select a WhatsApp Business Catalog' });
    }
  }

  return errors;
}
