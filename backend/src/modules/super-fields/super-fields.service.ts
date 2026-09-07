import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSuperFieldDto, UpdateSuperFieldDto } from './dto/super-field.dto';

@Injectable()
export class SuperFieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { search?: string; dataType?: string; status?: string }) {
    const where: any = { tenantId };

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status;
    }

    if (query?.dataType && query.dataType !== 'ALL') {
      where.dataType = query.dataType;
    }

    if (query?.search) {
      where.OR = [
        { label: { contains: query.search, mode: 'insensitive' } },
        { key: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [fields, contacts] = await Promise.all([
      this.prisma.superField.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.crmContact.findMany({
        where: { tenantId },
        select: { superFieldValues: true },
      }),
    ]);

    const enrichedFields = fields.map((f) => {
      let count = 0;
      for (const contact of contacts) {
        const vals = contact.superFieldValues as Record<string, any> | null;
        if (vals && vals[f.key] !== undefined && vals[f.key] !== null && vals[f.key] !== '') {
          count++;
        }
      }
      return {
        ...f,
        usageCount: count,
      };
    });

    return {
      success: true,
      data: enrichedFields,
    };
  }

  async getMetrics(tenantId: string) {
    const fields = await this.prisma.superField.findMany({
      where: { tenantId },
    });

    const total = fields.length;
    const active = fields.filter((f) => f.status === 'ACTIVE').length;
    const required = fields.filter((f) => {
      const v = f.validation as any;
      return v?.isRequired === true;
    }).length;
    const inboxLabels = fields.filter((f) => {
      const p = f.placement as any;
      return p?.chatInboxLabel === true;
    }).length;

    return {
      success: true,
      data: { total, active, required, inboxLabels },
    };
  }

  async findOne(tenantId: string, id: string) {
    const field = await this.prisma.superField.findFirst({
      where: { id, tenantId },
    });
    if (!field) throw new NotFoundException('SuperField not found');
    return { success: true, data: field };
  }

  async create(tenantId: string, dto: CreateSuperFieldDto) {
    const cleanKey = (dto.key || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    if (!cleanKey) {
      throw new BadRequestException('Field key must contain alphanumeric characters');
    }

    const existing = await this.prisma.superField.findFirst({
      where: { tenantId, key: cleanKey },
    });
    if (existing) {
      throw new ConflictException(`SuperField with key "${cleanKey}" already exists`);
    }

    const field = await this.prisma.superField.create({
      data: {
        tenantId,
        key: cleanKey,
        label: dto.label,
        description: dto.description || '',
        dataType: (dto.dataType || 'TEXT').toUpperCase(),
        options: dto.options || [],
        defaultValue: dto.defaultValue,
        helperText: dto.helperText,
        placeholder: dto.placeholder,
        currencySymbol: dto.currencySymbol || '₹',
        validation: dto.validation || { isRequired: false },
        placement: dto.placement || {
          contactProfile: true,
          chatInboxLabel: true,
          chatInboxSidebar: true,
        },
        status: 'ACTIVE',
      },
    });

    return { success: true, data: field };
  }

  async update(tenantId: string, id: string, dto: UpdateSuperFieldDto) {
    await this.findOne(tenantId, id);

    const field = await this.prisma.superField.update({
      where: { id },
      data: {
        ...(dto.label && { label: dto.label }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.dataType && { dataType: dto.dataType }),
        ...(dto.options !== undefined && { options: dto.options }),
        ...(dto.defaultValue !== undefined && { defaultValue: dto.defaultValue }),
        ...(dto.helperText !== undefined && { helperText: dto.helperText }),
        ...(dto.placeholder !== undefined && { placeholder: dto.placeholder }),
        ...(dto.currencySymbol !== undefined && { currencySymbol: dto.currencySymbol }),
        ...(dto.validation !== undefined && { validation: dto.validation }),
        ...(dto.placement !== undefined && { placement: dto.placement }),
        ...(dto.status && { status: dto.status }),
      },
    });

    return { success: true, data: field };
  }

  async duplicate(tenantId: string, id: string) {
    const source = await this.prisma.superField.findFirst({
      where: { id, tenantId },
    });
    if (!source) throw new NotFoundException('SuperField not found');

    const newKey = `${source.key}_copy_${Math.floor(10 + Math.random() * 90)}`;
    const duplicated = await this.prisma.superField.create({
      data: {
        tenantId,
        key: newKey,
        label: `${source.label} (Copy)`,
        description: source.description,
        dataType: source.dataType,
        options: (source.options as any) || [],
        defaultValue: source.defaultValue as any,
        helperText: source.helperText,
        placeholder: source.placeholder,
        currencySymbol: source.currencySymbol,
        validation: source.validation as any,
        placement: source.placement as any,
        status: 'ACTIVE',
      },
    });

    return { success: true, data: duplicated };
  }

  async archive(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    const field = await this.prisma.superField.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return { success: true, data: field };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.superField.delete({ where: { id } });
    return { success: true, message: 'SuperField deleted successfully' };
  }
}
