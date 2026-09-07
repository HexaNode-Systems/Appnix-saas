export interface Contact {
  id: string;
  createdOn: string;
  tags: { label: string; variant: "vip" | "star" | "check" | "none" }[];
  fullName: string;
  whatsappNumber: string;
  email?: string;
  marketingBudget: string;
  marketingGoal: string;
  superFieldValues?: Record<string, any>;
}

export type DuplicateStrategy = "SKIP" | "UPDATE" | "NEW";

export type ImportRowStatus = "VALID" | "INVALID" | "DUPLICATE" | "WARNING";

export interface ParsedCsvRow {
  rowIndex: number;
  fullName: string;
  whatsappNumber: string;
  email: string;
  tags: string;
  marketingBudget: string;
  marketingGoal: string;
  status: ImportRowStatus;
  issue?: string;
  suggestedFix?: string;
  originalData?: Record<string, string>;
}

export interface ValidationSummary {
  fileName: string;
  fileSize: number;
  totalRows: number;
  validCount: number;
  invalidCount: number;
  duplicateCount: number;
  validRows: ParsedCsvRow[];
  invalidRows: ParsedCsvRow[];
  duplicateRows: ParsedCsvRow[];
  columnsValidation: {
    hasRequiredColumns: boolean;
    missingColumns: string[];
    unsupportedColumns: string[];
    duplicateColumns: string[];
  };
  summaryText: string;
}

export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  fileSize: number;
  importedBy: string;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  status: "PROCESSING" | "COMPLETED" | "COMPLETED_WITH_ERRORS" | "FAILED";
  strategy: DuplicateStrategy;
  errorReport?: ParsedCsvRow[];
  createdAt: string;
}
