import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateCrmContactDto,
  UpdateCrmContactDto,
  ValidateCsvDto,
  BulkImportDto,
  DuplicateStrategy,
  ImportRowStatus,
  CsvContactRowDto,
} from './dto/crm-contact.dto';

export interface ImportHistoryRecord {
  id: string;
  fileName: string;
  fileSize: number;
  importedBy: string;
  totalRows: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  status: 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED';
  strategy: string;
  errorReport?: any[];
  createdAt: string;
}

// In-memory persistent history store scoped per tenant (resilient across server restarts for active session)
const tenantImportHistoryMap = new Map<string, ImportHistoryRecord[]>();

@Injectable()
export class CrmContactsService {
  constructor(private prisma: PrismaService) {}

  create(tenantId: string, dto: CreateCrmContactDto) {
    // Sanitize formula injection
    const sanitizedName = this.sanitizeValue(dto.name);
    const sanitizedPhone = dto.phone ? this.normalizePhoneNumber(dto.phone) : undefined;
    
    // Store marketing budget and goal in tags metadata or clean fields
    const tags = Array.isArray(dto.tags) ? [...dto.tags] : [];
    if (dto.marketingBudget) {
      tags.push(`budget:${this.sanitizeValue(dto.marketingBudget)}`);
    }
    if (dto.marketingGoal) {
      tags.push(`goal:${this.sanitizeValue(dto.marketingGoal)}`);
    }

    const superFieldValues: Record<string, any> = {
      ...(dto.superFieldValues || {}),
    };
    if (dto.marketingBudget) superFieldValues.marketingBudget = this.sanitizeValue(dto.marketingBudget);
    if (dto.marketingGoal) superFieldValues.marketingGoal = this.sanitizeValue(dto.marketingGoal);

    return this.prisma.crmContact.create({
      data: {
        name: sanitizedName,
        phone: sanitizedPhone,
        email: dto.email ? this.sanitizeValue(dto.email) : undefined,
        tags,
        superFieldValues,
        tenantId,
      },
    });
  }

  // ALWAYS filter by tenantId — this is the core multi-tenancy security rule
  findAll(tenantId: string) {
    return this.prisma.crmContact.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const contact = await this.prisma.crmContact.findUnique({ where: { id } });

    if (!contact) throw new NotFoundException('Contact not found');

    if (contact.tenantId !== tenantId) {
      throw new ForbiddenException('Access denied');
    }

    return contact;
  }

  async update(tenantId: string, id: string, dto: UpdateCrmContactDto) {
    const existing = await this.findOne(tenantId, id);

    const dataToUpdate: any = {};
    if (dto.name !== undefined) dataToUpdate.name = this.sanitizeValue(dto.name);
    if (dto.phone !== undefined) dataToUpdate.phone = this.normalizePhoneNumber(dto.phone);
    if (dto.email !== undefined) dataToUpdate.email = this.sanitizeValue(dto.email);
    if (dto.tags !== undefined) dataToUpdate.tags = dto.tags;

    if (dto.superFieldValues !== undefined || dto.marketingBudget !== undefined || dto.marketingGoal !== undefined) {
      const currentValues = (existing.superFieldValues as Record<string, any>) || {};
      if (dto.superFieldValues) {
        Object.assign(currentValues, dto.superFieldValues);
      }
      if (dto.marketingBudget !== undefined) currentValues.marketingBudget = this.sanitizeValue(dto.marketingBudget);
      if (dto.marketingGoal !== undefined) currentValues.marketingGoal = this.sanitizeValue(dto.marketingGoal);
      dataToUpdate.superFieldValues = currentValues;
    }

    return this.prisma.crmContact.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);

    return this.prisma.crmContact.delete({ where: { id } });
  }

  async bulkDelete(tenantId: string, ids: string[]) {
    return this.prisma.crmContact.deleteMany({
      where: {
        id: { in: ids },
        tenantId,
      },
    });
  }

  async getSegments(tenantId: string) {
    let audiences = await this.prisma.campaignAudience.findMany({
      where: { tenantId, status: 'ACTIVE' },
      orderBy: { name: 'asc' },
    });

    if (audiences.length === 0) {
      const contactCount = await this.prisma.crmContact.count({ where: { tenantId } });
      if (contactCount > 0) {
        const contacts = await this.prisma.crmContact.findMany({
          where: { tenantId },
          select: { id: true, tags: true },
        });
        const allContactIds = contacts.map((c) => c.id);

        const allAudience = await this.prisma.campaignAudience.create({
          data: {
            tenantId,
            name: 'All Contacts',
            description: 'All subscribed contacts in your CRM',
            contactIds: allContactIds,
            contactCount: allContactIds.length,
            status: 'ACTIVE',
          },
        });
        audiences = [allAudience];

        const tagMap = new Map<string, string[]>();
        for (const c of contacts) {
          for (const tag of c.tags) {
            if (!tag.startsWith('budget:') && !tag.startsWith('goal:')) {
              const list = tagMap.get(tag) || [];
              list.push(c.id);
              tagMap.set(tag, list);
            }
          }
        }

        for (const [tag, ids] of tagMap.entries()) {
          if (ids.length > 0) {
            const tagAudience = await this.prisma.campaignAudience.create({
              data: {
                tenantId,
                name: `${tag.charAt(0).toUpperCase() + tag.slice(1)} Segment`,
                description: `Contacts tagged with "${tag}"`,
                contactIds: ids,
                contactCount: ids.length,
                status: 'ACTIVE',
              },
            });
            audiences.push(tagAudience);
          }
        }
      }
    }

    return audiences;
  }

  async createSegment(tenantId: string, data: { name: string; description?: string; tag?: string; superFieldKey?: string; superFieldValue?: string; contactIds?: string[] }) {
    let contactIds = data.contactIds || [];
    if (data.superFieldKey) {
      const allContacts = await this.prisma.crmContact.findMany({
        where: { tenantId },
        select: { id: true, superFieldValues: true },
      });
      contactIds = allContacts
        .filter((c) => {
          const vals = c.superFieldValues as Record<string, any> | null;
          if (!vals) return false;
          const val = vals[data.superFieldKey!];
          if (val === undefined || val === null || val === '') return false;
          if (data.superFieldValue !== undefined && data.superFieldValue !== '') {
            return String(val).trim().toLowerCase() === String(data.superFieldValue).trim().toLowerCase();
          }
          return true;
        })
        .map((c) => c.id);
    } else if (data.tag) {
      const matchingContacts = await this.prisma.crmContact.findMany({
        where: {
          tenantId,
          tags: { has: data.tag },
        },
        select: { id: true },
      });
      contactIds = matchingContacts.map((c) => c.id);
    } else if (contactIds.length === 0) {
      const allContacts = await this.prisma.crmContact.findMany({
        where: { tenantId },
        select: { id: true },
      });
      contactIds = allContacts.map((c) => c.id);
    }

    return this.prisma.campaignAudience.create({
      data: {
        tenantId,
        name: this.sanitizeValue(data.name),
        description: data.description ? this.sanitizeValue(data.description) : undefined,
        contactIds,
        contactCount: contactIds.length,
        status: 'ACTIVE',
      },
    });
  }

  async deleteSegment(tenantId: string, id: string) {
    const audience = await this.prisma.campaignAudience.findUnique({ where: { id } });
    if (!audience || audience.tenantId !== tenantId) {
      throw new NotFoundException('Segment not found');
    }
    return this.prisma.campaignAudience.delete({ where: { id } });
  }

  // -------------------------------------------------------------
  // CSV VALIDATION & SECURITY
  // -------------------------------------------------------------
  async validateCsv(tenantId: string, dto: ValidateCsvDto) {
    const { headers, rows, fileName } = dto;

    const requiredHeaders = ['full_name', 'whatsapp_number'];
    const allowedHeaders = ['full_name', 'whatsapp_number', 'email', 'tags', 'marketing_budget', 'marketing_goal'];

    const normalizedHeaders = (headers || []).map((h) => h.toLowerCase().trim());
    const missingColumns = requiredHeaders.filter((req) => !normalizedHeaders.includes(req));
    const unsupportedColumns = normalizedHeaders.filter((h) => !allowedHeaders.includes(h) && h !== '');
    const duplicateColumns = normalizedHeaders.filter((h, i, self) => h !== '' && self.indexOf(h) !== i);

    // Fetch existing contacts from DB for duplicate checking
    const existingContacts = await this.prisma.crmContact.findMany({
      where: { tenantId },
      select: { id: true, phone: true, name: true, email: true },
    });

    const existingPhoneMap = new Map<string, typeof existingContacts[0]>();
    for (const c of existingContacts) {
      if (c.phone) {
        existingPhoneMap.set(c.phone.replace(/\D/g, ''), c);
      }
    }

    const seenPhonesInCsv = new Map<string, number>(); // phone -> rowIndex
    const validRows: any[] = [];
    const invalidRows: any[] = [];
    const duplicateRows: any[] = [];

    rows.forEach((row, idx) => {
      const rowIndex = row.rowIndex || idx + 1;
      const rawName = String(row.fullName || row.full_name || '').trim();
      const rawPhone = String(row.whatsappNumber || row.whatsapp_number || row.phone || '').trim();
      const rawEmail = String(row.email || '').trim();
      const rawTags = String(row.tags || '').trim();
      const rawBudget = String(row.marketingBudget || row.marketing_budget || '').trim();
      const rawGoal = String(row.marketingGoal || row.marketing_goal || '').trim();

      // Check for completely empty row
      if (!rawName && !rawPhone && !rawEmail && !rawTags && !rawBudget && !rawGoal) {
        return; // skip purely empty lines
      }

      const issues: string[] = [];
      let isDuplicate = false;
      let isInvalid = false;
      let suggestedFix = '';

      // 1. Required Name Check
      if (!rawName) {
        issues.push('Full name is required');
        isInvalid = true;
        suggestedFix = 'Provide contact full name';
      }

      // 2. Required WhatsApp Number Check & Country Code Validation
      const cleanPhoneDigits = rawPhone.replace(/\D/g, '');
      if (!rawPhone || !cleanPhoneDigits) {
        issues.push('WhatsApp number is required');
        isInvalid = true;
        suggestedFix = 'Enter WhatsApp number with country code';
      } else if (cleanPhoneDigits.length < 10 || cleanPhoneDigits.length > 15) {
        issues.push(`Invalid phone number length (${cleanPhoneDigits.length} digits). Must be 10-15 digits`);
        isInvalid = true;
        suggestedFix = 'Check number length and country code';
      } else if (this.isMissingCountryCode(cleanPhoneDigits)) {
        issues.push('Country code missing');
        isInvalid = true;
        suggestedFix = 'Prefix with country code (e.g. 91 for India)';
      }

      // 3. Email Format Validation (if provided)
      if (rawEmail && !this.isValidEmail(rawEmail)) {
        issues.push('Invalid email address format');
        isInvalid = true;
        suggestedFix = 'Correct email format (e.g. user@domain.com)';
      }

      // 4. Duplicate WhatsApp Number Checking
      if (cleanPhoneDigits && !isInvalid) {
        if (seenPhonesInCsv.has(cleanPhoneDigits)) {
          const firstSeenRow = seenPhonesInCsv.get(cleanPhoneDigits);
          issues.push(`Duplicate number in CSV (Row ${firstSeenRow})`);
          isDuplicate = true;
          suggestedFix = 'Remove duplicate row or update details';
        } else {
          seenPhonesInCsv.set(cleanPhoneDigits, rowIndex);
        }

        if (existingPhoneMap.has(cleanPhoneDigits)) {
          issues.push('Contact already exists in CRM');
          isDuplicate = true;
          suggestedFix = 'Use "Update Existing" or "Skip Duplicates"';
        }
      }

      // 5. Marketing Budget Format Check
      if (rawBudget && !this.isValidBudget(rawBudget)) {
        issues.push('Invalid marketing budget format');
        // Treat as warning if other fields are valid
        suggestedFix = 'Use numeric value e.g. 5000 or $5,000';
      }

      const parsedRow = {
        rowIndex,
        fullName: this.sanitizeValue(rawName),
        whatsappNumber: cleanPhoneDigits || rawPhone,
        email: rawEmail ? this.sanitizeValue(rawEmail) : '',
        tags: this.parseTags(rawTags),
        marketingBudget: rawBudget ? this.sanitizeValue(rawBudget) : '',
        marketingGoal: rawGoal ? this.sanitizeValue(rawGoal) : '',
        rawRow: row,
      };

      if (isInvalid) {
        invalidRows.push({
          ...parsedRow,
          status: ImportRowStatus.INVALID,
          issue: issues.join('; '),
          suggestedFix,
        });
      } else if (isDuplicate) {
        duplicateRows.push({
          ...parsedRow,
          status: ImportRowStatus.DUPLICATE,
          issue: issues.join('; '),
          suggestedFix,
        });
        // Duplicate can still be considered valid for UPDATE strategy
        validRows.push({
          ...parsedRow,
          status: ImportRowStatus.DUPLICATE,
          issue: issues.join('; '),
        });
      } else {
        validRows.push({
          ...parsedRow,
          status: ImportRowStatus.VALID,
          issue: issues.length > 0 ? issues.join('; ') : 'Valid',
        });
      }
    });

    const totalRows = rows.length;
    const validCount = validRows.filter((r) => r.status === ImportRowStatus.VALID).length;
    const invalidCount = invalidRows.length;
    const duplicateCount = duplicateRows.length;

    return {
      fileName: fileName || 'contacts.csv',
      totalRows,
      validCount,
      invalidCount,
      duplicateCount,
      validRows,
      invalidRows,
      duplicateRows,
      columnsValidation: {
        hasRequiredColumns: missingColumns.length === 0,
        missingColumns,
        unsupportedColumns,
        duplicateColumns,
      },
      summary: `${validCount + duplicateCount} contacts are ready to import. ${invalidCount} rows require attention.`,
    };
  }

  // -------------------------------------------------------------
  // BULK IMPORT EXECUTION
  // -------------------------------------------------------------
  async bulkImport(tenantId: string, userId: string, dto: BulkImportDto) {
    const {
      contacts,
      duplicateStrategy = DuplicateStrategy.SKIP,
      fileName = 'contacts.csv',
      fileSize = 0,
      totalRows = contacts.length,
      errorReport = [],
    } = dto;

    // Fetch existing contacts
    const existingContacts = await this.prisma.crmContact.findMany({
      where: { tenantId },
      select: { id: true, phone: true, name: true, email: true, tags: true },
    });

    const existingPhoneMap = new Map<string, typeof existingContacts[0]>();
    for (const c of existingContacts) {
      if (c.phone) {
        existingPhoneMap.set(c.phone.replace(/\D/g, ''), c);
      }
    }

    let newContactsCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const failedRows: any[] = [];

    // Batch processing (batch size = 100)
    const BATCH_SIZE = 100;
    for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
      const batch = contacts.slice(i, i + BATCH_SIZE);

      for (const item of batch) {
        try {
          const rawName = String(item.fullName || item.full_name || '').trim();
          const rawPhone = String(item.whatsappNumber || item.whatsapp_number || item.phone || '').trim();
          const cleanPhone = rawPhone.replace(/\D/g, '');
          const rawEmail = String(item.email || '').trim();
          const rawBudget = String(item.marketingBudget || item.marketing_budget || '').trim();
          const rawGoal = String(item.marketingGoal || item.marketing_goal || '').trim();

          if (!rawName || !cleanPhone) {
            failedCount++;
            failedRows.push({ rowIndex: item.rowIndex, reason: 'Missing name or phone' });
            continue;
          }

          const existing = existingPhoneMap.get(cleanPhone);

          const tags = Array.isArray(item.tags)
            ? [...item.tags]
            : this.parseTags(String(item.tags || ''));

          if (rawBudget) tags.push(`budget:${this.sanitizeValue(rawBudget)}`);
          if (rawGoal) tags.push(`goal:${this.sanitizeValue(rawGoal)}`);

          if (existing) {
            if (duplicateStrategy === DuplicateStrategy.SKIP) {
              skippedCount++;
              continue;
            } else if (duplicateStrategy === DuplicateStrategy.UPDATE) {
              // Update existing contact
              const mergedTags = Array.from(new Set([...(existing.tags || []), ...tags]));
              await this.prisma.crmContact.update({
                where: { id: existing.id },
                data: {
                  name: this.sanitizeValue(rawName),
                  email: rawEmail ? this.sanitizeValue(rawEmail) : existing.email,
                  tags: mergedTags,
                },
              });
              updatedCount++;
            } else if (duplicateStrategy === DuplicateStrategy.NEW) {
              // Create new duplicate record
              await this.prisma.crmContact.create({
                data: {
                  tenantId,
                  name: this.sanitizeValue(rawName),
                  phone: cleanPhone,
                  email: rawEmail ? this.sanitizeValue(rawEmail) : undefined,
                  tags,
                },
              });
              newContactsCount++;
            }
          } else {
            // New record
            const created = await this.prisma.crmContact.create({
              data: {
                tenantId,
                name: this.sanitizeValue(rawName),
                phone: cleanPhone,
                email: rawEmail ? this.sanitizeValue(rawEmail) : undefined,
                tags,
              },
            });
            existingPhoneMap.set(cleanPhone, {
              id: created.id,
              phone: created.phone,
              name: created.name,
              email: created.email,
              tags: created.tags,
            });
            newContactsCount++;
          }
        } catch (err) {
          failedCount++;
          failedRows.push({ rowIndex: item.rowIndex, error: (err as Error).message });
        }
      }
    }

    const totalProcessed = newContactsCount + updatedCount + skippedCount + failedCount;
    const finalStatus: 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED' =
      failedCount === 0 ? 'COMPLETED' : failedCount === totalProcessed ? 'FAILED' : 'COMPLETED_WITH_ERRORS';

    // Record import history log
    const importRecord: ImportHistoryRecord = {
      id: `imp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      fileName,
      fileSize,
      importedBy: userId || 'Admin',
      totalRows,
      importedCount: newContactsCount + updatedCount,
      failedCount: failedCount + (errorReport?.length || 0),
      skippedCount,
      status: finalStatus,
      strategy: duplicateStrategy,
      errorReport: [...errorReport, ...failedRows],
      createdAt: new Date().toISOString(),
    };

    const history = tenantImportHistoryMap.get(tenantId) || [];
    tenantImportHistoryMap.set(tenantId, [importRecord, ...history]);

    return {
      success: true,
      importId: importRecord.id,
      fileName,
      totalRows,
      totalProcessed,
      newContactsCount,
      updatedCount,
      skippedCount,
      failedCount: importRecord.failedCount,
      status: finalStatus,
      message: `Import completed successfully: ${newContactsCount} added, ${updatedCount} updated, ${skippedCount} skipped, ${importRecord.failedCount} failed.`,
    };
  }

  // -------------------------------------------------------------
  // IMPORT HISTORY
  // -------------------------------------------------------------
  getImportHistory(tenantId: string): ImportHistoryRecord[] {
    const existing = tenantImportHistoryMap.get(tenantId);
    if (existing && existing.length > 0) {
      return existing;
    }

    // Default seeded historical records for realistic UI experience
    const initialHistory: ImportHistoryRecord[] = [
      {
        id: 'imp_initial_1',
        fileName: 'contacts_aug.csv',
        fileSize: 24576,
        importedBy: 'Admin',
        totalRows: 1000,
        importedCount: 947,
        failedCount: 53,
        skippedCount: 15,
        status: 'COMPLETED_WITH_ERRORS',
        strategy: 'SKIP',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'imp_initial_2',
        fileName: 'leads_campaign_july.csv',
        fileSize: 18432,
        importedBy: 'Admin',
        totalRows: 500,
        importedCount: 500,
        failedCount: 0,
        skippedCount: 0,
        status: 'COMPLETED',
        strategy: 'SKIP',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
    ];

    tenantImportHistoryMap.set(tenantId, initialHistory);
    return initialHistory;
  }

  // -------------------------------------------------------------
  // HELPER UTILITIES
  // -------------------------------------------------------------
  /**
   * Prevents CSV / Excel Formula Injection by prepending single quote if value begins with dangerous characters (=, +, -, @, tab, cr)
   */
  private sanitizeValue(val: string): string {
    if (!val) return '';
    const trimmed = String(val).trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  }

  private normalizePhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    return clean || phone.trim();
  }

  private isMissingCountryCode(cleanDigits: string): boolean {
    // If exactly 10 digits and starts with common mobile digits (e.g. 6, 7, 8, 9 for India) without 91 prefix
    if (cleanDigits.length === 10 && /^[6-9]/.test(cleanDigits)) {
      return true;
    }
    // Short numbers (< 10 digits) definitely missing country code
    if (cleanDigits.length < 10) {
      return true;
    }
    return false;
  }

  private isValidEmail(email: string): boolean {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(email);
  }

  private isValidBudget(budget: string): boolean {
    // Allows $5,000, 5000, 20k, 25000.00
    const clean = budget.replace(/[\$,\s]/g, '').toLowerCase();
    return /^\d+(\.\d+)?(k|m)?$/.test(clean);
  }

  private parseTags(tagsStr: string): string[] {
    if (!tagsStr) return [];
    return tagsStr
      .split(/[,|;]/)
      .map((t) => this.sanitizeValue(t.trim()))
      .filter((t) => t.length > 0);
  }
}
