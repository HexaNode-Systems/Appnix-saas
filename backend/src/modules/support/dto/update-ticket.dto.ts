import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_FOR_CUSTOMER = 'WAITING_FOR_CUSTOMER',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  Open = 'Open',
  'In Progress' = 'In Progress',
  'Waiting for Customer' = 'Waiting for Customer',
  Resolved = 'Resolved',
  Closed = 'Closed',
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ example: 'In Progress' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ example: 'High' })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiPropertyOptional({ example: 'Sarah Jenkins' })
  @IsString()
  @IsOptional()
  assignedTo?: string;
}
