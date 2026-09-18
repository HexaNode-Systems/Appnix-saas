import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TicketPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Urgent = 'Urgent',
}

export class CreateTicketDto {
  @ApiProperty({ example: 'Need assistance with WhatsApp Webhook 504 error' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({ example: 'Technical Support' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional({ example: 'Medium', enum: TicketPriority })
  @IsString()
  @IsOptional()
  priority?: string;

  @ApiProperty({ example: 'During high volume broadcast we experienced timeout errors.' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ type: [String], example: ['error_logs.txt'] })
  @IsArray()
  @IsOptional()
  attachments?: string[];
}
