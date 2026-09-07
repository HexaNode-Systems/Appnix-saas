import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBotDto, UpdateBotDto } from './dto/bot.dto';

function formatBot(bot: any) {
  let edgesArray: any[] = [];
  let channels: string[] = ['whatsapp'];
  let tags: string[] = [];
  let folderId: string | null = null;
  let settings: any = null;
  let trigger: any = null;

  if (Array.isArray(bot.edges)) {
    edgesArray = bot.edges;
  } else if (bot.edges && typeof bot.edges === 'object') {
    edgesArray = bot.edges.connections || bot.edges.edges || [];
    channels = Array.isArray(bot.edges.channels) && bot.edges.channels.length > 0 ? bot.edges.channels : channels;
    tags = Array.isArray(bot.edges.tags) ? bot.edges.tags : tags;
    folderId = bot.edges.folderId || null;
    settings = bot.edges.settings || null;
    trigger = bot.edges.trigger || null;
  }

  const nodesArray = Array.isArray(bot.nodes) ? bot.nodes : (bot.nodes?.nodes || []);

  return {
    ...bot,
    channels,
    channel: channels[0] || 'whatsapp',
    tags,
    folderId,
    settings,
    trigger: trigger || { type: bot.triggerType || 'incoming_message', config: {} },
    triggerType: bot.triggerType || 'INBOUND_MESSAGE',
    workflow: {
      nodes: nodesArray,
      connections: edgesArray,
    },
    conversations: bot.interactionsCount || 0,
  };
}

@Injectable()
export class BotsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, query?: { folderId?: string; channel?: string; search?: string }) {
    const bots = await this.prisma.bot.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    let formatted = bots.map(formatBot);

    if (query?.folderId && query.folderId !== 'all') {
      formatted = formatted.filter((b) => b.folderId === query.folderId);
    }
    if (query?.channel && query.channel !== 'all') {
      formatted = formatted.filter((b) => b.channels.includes(query.channel!));
    }
    if (query?.search && query.search.trim()) {
      const s = query.search.trim().toLowerCase();
      formatted = formatted.filter(
        (b) =>
          b.name.toLowerCase().includes(s) ||
          (b.description && b.description.toLowerCase().includes(s)) ||
          (b.triggerType && b.triggerType.toLowerCase().includes(s)) ||
          b.tags.some((t: string) => t.toLowerCase().includes(s)),
      );
    }

    return {
      success: true,
      data: formatted,
    };
  }

  async findOne(tenantId: string, id: string) {
    const bot = await this.prisma.bot.findFirst({
      where: { id, tenantId },
    });
    if (!bot) throw new NotFoundException('Bot not found');
    return { success: true, data: formatBot(bot) };
  }

  async create(tenantId: string, dto: CreateBotDto) {
    const nodes = dto.workflow?.nodes || dto.nodes || [];
    const connections = dto.workflow?.connections || dto.edges || [];
    const channels = dto.channels || dto.settings?.channels?.selected || ['whatsapp'];
    const tags = dto.tags || dto.settings?.general?.tags || [];
    const folderId = dto.folderId || dto.settings?.general?.folderId || null;
    const trigger = dto.trigger || { type: dto.triggerType || 'incoming_message', config: {} };
    const settings = dto.settings || null;

    const edgesPayload = {
      connections,
      channels,
      tags,
      folderId,
      trigger,
      settings,
    };

    const bot = await this.prisma.bot.create({
      data: {
        tenantId,
        name: dto.name,
        description: dto.description || '',
        triggerType: dto.triggerType || dto.trigger?.type || 'INBOUND_MESSAGE',
        nodes,
        edges: edgesPayload,
        status: dto.status || 'ACTIVE',
        currentVersion: 1,
        interactionsCount: 0,
      },
    });

    return { success: true, data: formatBot(bot), message: 'Bot created successfully' };
  }

  async update(tenantId: string, id: string, dto: UpdateBotDto) {
    const existing = await this.prisma.bot.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Bot not found');

    let existingEdgesData: any = {};
    if (existing.edges && typeof existing.edges === 'object' && !Array.isArray(existing.edges)) {
      existingEdgesData = { ...existing.edges };
    } else if (Array.isArray(existing.edges)) {
      existingEdgesData = { connections: existing.edges };
    }

    const updatedNodes =
      dto.workflow?.nodes !== undefined
        ? dto.workflow.nodes
        : dto.nodes !== undefined
        ? dto.nodes
        : existing.nodes;

    const updatedConnections =
      dto.workflow?.connections !== undefined
        ? dto.workflow.connections
        : dto.edges !== undefined
        ? dto.edges
        : existingEdgesData.connections || [];

    const updatedChannels =
      dto.channels !== undefined
        ? dto.channels
        : dto.settings?.channels?.selected || existingEdgesData.channels || ['whatsapp'];

    const updatedTags =
      dto.tags !== undefined
        ? dto.tags
        : dto.settings?.general?.tags || existingEdgesData.tags || [];

    const updatedFolderId =
      dto.folderId !== undefined
        ? dto.folderId
        : dto.settings?.general?.folderId !== undefined
        ? dto.settings.general.folderId
        : existingEdgesData.folderId;

    const updatedTrigger =
      dto.trigger !== undefined
        ? dto.trigger
        : existingEdgesData.trigger || { type: dto.triggerType || existing.triggerType, config: {} };

    const updatedSettings =
      dto.settings !== undefined ? dto.settings : existingEdgesData.settings;

    const newEdges = {
      ...existingEdgesData,
      connections: updatedConnections,
      channels: updatedChannels,
      tags: updatedTags,
      folderId: updatedFolderId,
      trigger: updatedTrigger,
      settings: updatedSettings,
    };

    const updateData: any = {
      edges: newEdges,
      nodes: updatedNodes,
    };

    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.triggerType !== undefined) updateData.triggerType = dto.triggerType;
    if (dto.currentVersion !== undefined) updateData.currentVersion = dto.currentVersion;

    const updated = await this.prisma.bot.update({
      where: { id },
      data: updateData,
    });

    return { success: true, data: formatBot(updated), message: 'Bot updated successfully' };
  }

  async testBot(tenantId: string, id: string, testInput: any) {
    const bot = await this.findOne(tenantId, id);

    return {
      success: true,
      data: {
        botId: id,
        botName: bot.data.name,
        input: testInput,
        output: `Simulated Response from ${bot.data.name}: Hello! How can I assist you with your request today?`,
        status: 'PASSED',
        executionTimeMs: 142,
      },
    };
  }

  async publishBot(tenantId: string, id: string, version?: number) {
    const existing = await this.prisma.bot.findFirst({ where: { id, tenantId } });
    if (!existing) throw new NotFoundException('Bot not found');

    const nextVersion = version || (existing.currentVersion ? existing.currentVersion + 1 : 1);

    const bot = await this.prisma.bot.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        currentVersion: nextVersion,
      },
    });

    return {
      success: true,
      data: formatBot(bot),
      message: `Bot published successfully to live version ${nextVersion}`,
    };
  }

  async duplicateBot(tenantId: string, id: string) {
    const original = await this.prisma.bot.findFirst({
      where: { id, tenantId },
    });
    if (!original) throw new NotFoundException('Bot not found');

    let originalEdges = original.edges;
    if (originalEdges && typeof originalEdges === 'object' && !Array.isArray(originalEdges)) {
      originalEdges = { ...originalEdges };
    }

    const duplicated = await this.prisma.bot.create({
      data: {
        tenantId,
        name: `${original.name} (Copy)`,
        description: original.description,
        triggerType: original.triggerType,
        nodes: (original.nodes as any) || [],
        edges: (originalEdges as any) || [],
        status: 'DRAFT',
        currentVersion: 1,
        interactionsCount: 0,
      },
    });

    return { success: true, data: formatBot(duplicated), message: 'Bot duplicated successfully' };
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.bot.delete({ where: { id } });
    return { success: true, message: 'Bot deleted successfully' };
  }

  async getFolders(tenantId: string) {
    const [folders, allBots] = await Promise.all([
      this.prisma.folder.findMany({
        where: { tenantId },
        orderBy: { name: 'asc' },
      }),
      this.prisma.bot.findMany({
        where: { tenantId },
        select: { id: true, edges: true },
      }),
    ]);

    const folderCounts: Record<string, number> = {};
    for (const b of allBots) {
      if (b.edges && typeof b.edges === 'object' && !Array.isArray(b.edges)) {
        const fId = (b.edges as any).folderId;
        if (fId) {
          folderCounts[fId] = (folderCounts[fId] || 0) + 1;
        }
      }
    }

    const formattedFolders = folders.map((f) => ({
      id: f.id,
      name: f.name,
      botCount: folderCounts[f.id] || 0,
      createdAt: f.createdAt,
    }));

    return {
      success: true,
      data: formattedFolders,
      totalBots: allBots.length,
    };
  }

  async createFolder(tenantId: string, name: string) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Folder name is required');
    }
    const trimmed = name.trim();
    const existing = await this.prisma.folder.findFirst({
      where: { tenantId, name: trimmed },
    });
    if (existing) {
      return { success: true, data: existing, message: 'Folder already exists' };
    }
    const folder = await this.prisma.folder.create({
      data: {
        tenantId,
        name: trimmed,
      },
    });
    return { success: true, data: folder, message: 'Folder created successfully' };
  }

  async deleteFolder(tenantId: string, id: string) {
    const folder = await this.prisma.folder.findFirst({ where: { id, tenantId } });
    if (!folder) throw new NotFoundException('Folder not found');
    await this.prisma.folder.delete({ where: { id } });
    return { success: true, message: 'Folder deleted successfully' };
  }
}
