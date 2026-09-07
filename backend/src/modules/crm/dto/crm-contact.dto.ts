import { IsString, IsOptional, IsEmail, IsArray, IsEnum, IsNumber, ValidateNested, IsNotEmpty, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum DuplicateStrategy {
  SKIP = 'SKIP',
  UPDATE = 'UPDATE',
  NEW = 'NEW',
}

export enum ImportRowStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  DUPLICATE = 'DUPLICATE',
  WARNING = 'WARNING',
}

export class CreateCrmContactDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  marketingBudget?: string;

  @IsOptional()
  @IsString()
  marketingGoal?: string;

  @IsOptional()
  @IsObject()
  superFieldValues?: Record<string, any>;
}

export class UpdateCrmContactDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  marketingBudget?: string;

  @IsOptional()
  @IsString()
  marketingGoal?: string;

  @IsOptional()
  @IsObject()
  superFieldValues?: Record<string, any>;
}

export class CsvContactRowDto {
  @IsNumber()
  rowIndex: number;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  tags?: string;

  @IsOptional()
  @IsString()
  marketingBudget?: string;

  @IsOptional()
  @IsString()
  marketingGoal?: string;

  [key: string]: any;
}

export class ValidateCsvDto {
  @IsArray()
  @IsString({ each: true })
  headers: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvContactRowDto)
  rows: CsvContactRowDto[];

  @IsOptional()
  @IsString()
  fileName?: string;
}

export class BulkImportDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvContactRowDto)
  contacts: CsvContactRowDto[];

  @IsEnum(DuplicateStrategy)
  @IsOptional()
  duplicateStrategy: DuplicateStrategy = DuplicateStrategy.SKIP;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsNumber()
  fileSize?: number;

  @IsOptional()
  @IsNumber()
  totalRows?: number;

  @IsOptional()
  @IsArray()
  errorReport?: any[];
}

