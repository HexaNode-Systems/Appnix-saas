import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, Matches, IsIn } from 'class-validator';

export class CreateDomainDto {
  @ApiProperty({
    description: 'Fully qualified custom domain name (e.g. app.myagency.com or portal.client.com)',
    example: 'portal.myagency.com',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/,
    { message: 'Invalid domain format. Must be a valid FQDN (e.g., portal.myagency.com)' },
  )
  domain!: string;

  @ApiPropertyOptional({
    description: 'Expected DNS record type for verification (CNAME or TXT)',
    enum: ['CNAME', 'TXT'],
    default: 'CNAME',
  })
  @IsOptional()
  @IsIn(['CNAME', 'TXT'])
  recordType?: 'CNAME' | 'TXT';
}

export class UpdatePartnerBrandSettingsDto {
  @IsOptional()
  @IsString()
  brandName?: string;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string | null;

  @IsOptional()
  @IsString()
  faviconUrl?: string | null;

  // Deliberately accepts a raw string: service sanitation supports pasted URLs.
  @IsOptional()
  @IsString()
  domain?: string;
}
