import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReplyTicketDto {
  @ApiProperty({ example: 'We have updated our webhook concurrency pool. Testing now.' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ type: [String], example: ['updated_config.json'] })
  @IsArray()
  @IsOptional()
  attachments?: string[];

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isInternalNote?: boolean;
}

