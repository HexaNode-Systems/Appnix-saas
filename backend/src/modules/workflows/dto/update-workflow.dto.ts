import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { TriggerTypeDto } from './create-workflow.dto';

export class UpdateWorkflowDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  folderId?: string | null;

  @IsOptional()
  @IsString()
  folderName?: string;

  @IsOptional()
  @IsEnum(TriggerTypeDto)
  triggerType?: TriggerTypeDto;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  nodes?: any;

  @IsOptional()
  edges?: any;

  @IsOptional()
  @IsBoolean()
  status?: boolean;
}
