import {
  SuperField,
  SuperFieldDataType,
  SuperFieldFormPayload,
  SuperFieldValidationError,
} from '@/types/super-field';

export interface DataTypeConfig {
  type: SuperFieldDataType;
  label: string;
  category: 'Text & Strings' | 'Choice & Enums' | 'Numbers & Finance' | 'Contact & Web' | 'Date & Time';
  description: string;
  badgeStyle: string;
  example: string;
  supportsOptions: boolean;
  supportsMinMax: boolean;
  supportsCurrency?: boolean;
}

export const DATA_TYPE_METADATA: Record<SuperFieldDataType, DataTypeConfig> = {
  TEXT: {
    type: 'TEXT',
    label: 'Single-line Text',
    category: 'Text & Strings',
    description: 'Short strings like names, company titles, or unique tags',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    example: 'John Doe / Senior Developer',
    supportsOptions: false,
    supportsMinMax: false,
  },
  TEXTAREA: {
    type: 'TEXTAREA',
    label: 'Multi-line Text',
    category: 'Text & Strings',
    description: 'Longer descriptions, agent notes, and rich commentary',
    badgeStyle: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300',
    example: 'Special packaging instructions required for fragile delivery...',
    supportsOptions: false,
    supportsMinMax: false,
  },
  DROPDOWN: {
    type: 'DROPDOWN',
    label: 'Dropdown / Single Select',
    category: 'Choice & Enums',
    description: 'Strict single choice from a predefined list of options',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300',
    example: 'Delhi, Mumbai, Dubai, Singapore',
    supportsOptions: true,
    supportsMinMax: false,
  },
  MULTI_SELECT: {
    type: 'MULTI_SELECT',
    label: 'Multi-Select',
    category: 'Choice & Enums',
    description: 'Allows picking one or more choices from predefined options',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950 dark:text-indigo-300',
    example: 'SaaS, E-Commerce, FinTech',
    supportsOptions: true,
    supportsMinMax: false,
  },
  NUMERIC: {
    type: 'NUMERIC',
    label: 'Numeric / Integer',
    category: 'Numbers & Finance',
    description: 'Whole numbers without decimal places (e.g. counts, PINs)',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    example: '42, 9840, 100',
    supportsOptions: false,
    supportsMinMax: true,
  },
  DECIMAL: {
    type: 'DECIMAL',
    label: 'Decimal Number',
    category: 'Numbers & Finance',
    description: 'Precise floating numbers with decimal precision',
    badgeStyle: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300',
    example: '98.6, 3.1415',
    supportsOptions: false,
    supportsMinMax: true,
  },
  AMOUNT: {
    type: 'AMOUNT',
    label: 'Amount / Currency',
    category: 'Numbers & Finance',
    description: 'Monetary values with currency symbols and formatted display',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    example: '₹4,999.00 / $250.00',
    supportsOptions: false,
    supportsMinMax: true,
    supportsCurrency: true,
  },
  EMAIL: {
    type: 'EMAIL',
    label: 'Email Address',
    category: 'Contact & Web',
    description: 'Strict RFC-compliant email address format with validation',
    badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300',
    example: 'user@company.com',
    supportsOptions: false,
    supportsMinMax: false,
  },
  PHONE: {
    type: 'PHONE',
    label: 'Phone Number',
    category: 'Contact & Web',
    description: 'International E.164 phone numbers with country dialing code',
    badgeStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950 dark:text-cyan-300',
    example: '+91 98765 43210',
    supportsOptions: false,
    supportsMinMax: false,
  },
  URL: {
    type: 'URL',
    label: 'Website URL',
    category: 'Contact & Web',
    description: 'Clickable HTTP / HTTPS web links with domain validation',
    badgeStyle: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950 dark:text-teal-300',
    example: 'https://appnix.com',
    supportsOptions: false,
    supportsMinMax: false,
  },
  ADDRESS: {
    type: 'ADDRESS',
    label: 'Physical Address',
    category: 'Contact & Web',
    description: 'Complete physical street address, building, and postal code',
    badgeStyle: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300',
    example: 'DLF Cyber City, Tower 8B, Gurugram, India',
    supportsOptions: false,
    supportsMinMax: false,
  },
  DATE: {
    type: 'DATE',
    label: 'Date (ISO)',
    category: 'Date & Time',
    description: 'Calendar date selection (Day, Month, Year)',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    example: '24 Aug 2026',
    supportsOptions: false,
    supportsMinMax: false,
  },
  DATETIME: {
    type: 'DATETIME',
    label: 'Date & Time (ISO)',
    category: 'Date & Time',
    description: 'Precise timestamp with 12h/24h time picker',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    example: '24 Aug 2026, 03:45 PM',
    supportsOptions: false,
    supportsMinMax: false,
  },
  BOOLEAN: {
    type: 'BOOLEAN',
    label: 'Checkbox / Boolean',
    category: 'Choice & Enums',
    description: 'Yes/No binary checkbox or status verification flag',
    badgeStyle: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300',
    example: 'Yes / No (True / False)',
    supportsOptions: false,
    supportsMinMax: false,
  },
  PERIODIC_TIME: {
    type: 'PERIODIC_TIME',
    label: 'Periodic Time / Duration',
    category: 'Date & Time',
    description: 'Relative durations and SLA intervals (e.g. 30 mins, 14 days)',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300',
    example: '14 Days / 2 Hours',
    supportsOptions: false,
    supportsMinMax: false,
  },
};

export const INITIAL_SUPER_FIELDS: SuperField[] = [];

const STORAGE_KEY = 'appnix_super_fields_v2';

export function generateFieldKey(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

export function getStoredSuperFields(): SuperField[] {
  return [];
}

export function saveStoredSuperFields(_fields: SuperField[]): void {
  // Deprecated in favor of real backend API
}

export function validateSuperField(
  payload: SuperFieldFormPayload,
  existingFields: SuperField[] = []
): SuperFieldValidationError[] {
  const errors: SuperFieldValidationError[] = [];

  // 1. Label validation
  if (!payload.label || !payload.label.trim()) {
    errors.push({ field: 'label', message: 'Field Display Label is required.' });
  } else if (payload.label.trim().length < 2) {
    errors.push({ field: 'label', message: 'Label must be at least 2 characters.' });
  } else if (payload.label.trim().length > 80) {
    errors.push({ field: 'label', message: 'Label cannot exceed 80 characters.' });
  }

  // 2. Key / Slug validation
  const keyRegex = /^[a-z0-9_]{2,48}$/;
  if (!payload.key || !payload.key.trim()) {
    errors.push({ field: 'key', message: 'System Field Key (slug) is required.' });
  } else if (!keyRegex.test(payload.key.trim())) {
    errors.push({
      field: 'key',
      message: 'Key must only contain lowercase letters, numbers, and underscores (2-48 chars).',
    });
  } else {
    // Check for duplicate keys
    const isDuplicate = existingFields.some(
      (f) => f.key === payload.key.trim() && f.id !== payload.id
    );
    if (isDuplicate) {
      errors.push({
        field: 'key',
        message: `Field key "${payload.key.trim()}" is already registered. Please enter a unique key.`,
      });
    }
  }

  // 3. Dropdown / Multi-Select options validation
  if (payload.dataType === 'DROPDOWN' || payload.dataType === 'MULTI_SELECT') {
    if (!payload.options || payload.options.length < 2) {
      errors.push({
        field: 'options',
        message: 'At least 2 predefined options are required for choice-based fields.',
      });
    } else {
      const values = payload.options.map((o) => o.value.trim().toLowerCase());
      const hasEmpty = payload.options.some((o) => !o.value || !o.value.trim());
      if (hasEmpty) {
        errors.push({ field: 'options', message: 'Option values cannot be blank.' });
      }
      const uniqueValues = new Set(values);
      if (uniqueValues.size !== values.length) {
        errors.push({ field: 'options', message: 'Option values must be unique.' });
      }
    }
  }

  // 4. Numerical / Amount validation
  if (payload.dataType === 'NUMERIC' || payload.dataType === 'DECIMAL' || payload.dataType === 'AMOUNT') {
    if (
      payload.validation.minValue !== undefined &&
      payload.validation.maxValue !== undefined &&
      payload.validation.minValue > payload.validation.maxValue
    ) {
      errors.push({
        field: 'validation',
        message: 'Minimum value bound cannot exceed Maximum value bound.',
      });
    }
  }

  return errors;
}
