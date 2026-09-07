export type SuperFieldDataType =
  | 'TEXT'
  | 'TEXTAREA'
  | 'DROPDOWN'
  | 'MULTI_SELECT'
  | 'NUMERIC'
  | 'DECIMAL'
  | 'AMOUNT'
  | 'EMAIL'
  | 'PHONE'
  | 'URL'
  | 'ADDRESS'
  | 'DATE'
  | 'DATETIME'
  | 'BOOLEAN'
  | 'PERIODIC_TIME';

export interface SuperFieldOption {
  id: string;
  label: string;
  value: string;
  color?: string;
  isDefault?: boolean;
}

export interface SuperFieldValidationRule {
  isRequired: boolean;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  regexPattern?: string;
  customErrorMessage?: string;
}

export interface SuperFieldPlacement {
  contactProfile: boolean; // Display on Contact Profile Page
  chatInboxLabel: boolean; // Display as Label in Chat Inbox List Card
  chatInboxSidebar: boolean; // Display in Chat Inbox Sidebar under CRM Attributes
}

export interface SuperField {
  id: string;
  key: string; // System slug, e.g. "city", "customer_tier"
  label: string; // Human-friendly display label, e.g. "City", "Customer Tier"
  description?: string;
  dataType: SuperFieldDataType;
  options?: SuperFieldOption[];
  defaultValue?: string | string[] | number | boolean;
  helperText?: string;
  placeholder?: string;
  currencySymbol?: string; // e.g. "₹", "$", "€", "£"
  validation: SuperFieldValidationRule;
  placement: SuperFieldPlacement;
  status: 'ACTIVE' | 'ARCHIVED';
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SuperFieldFormPayload {
  id?: string;
  key: string;
  label: string;
  description?: string;
  dataType: SuperFieldDataType;
  options?: SuperFieldOption[];
  defaultValue?: string | string[] | number | boolean;
  helperText?: string;
  placeholder?: string;
  currencySymbol?: string;
  validation: SuperFieldValidationRule;
  placement: SuperFieldPlacement;
}

export interface SuperFieldFilterOptions {
  searchQuery: string;
  dataType: 'ALL' | SuperFieldDataType;
  placementFilter: 'ALL' | 'PROFILE' | 'INBOX_LABEL' | 'INBOX_SIDEBAR';
  requiredFilter: 'ALL' | 'REQUIRED' | 'OPTIONAL';
  statusFilter: 'ALL' | 'ACTIVE' | 'ARCHIVED';
}

export interface SuperFieldValidationError {
  field: string;
  message: string;
}

export interface SuperFieldMetrics {
  total: number;
  active: number;
  required: number;
  inboxLabels: number;
}
