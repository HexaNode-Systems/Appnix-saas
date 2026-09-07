import { IsString, IsNotEmpty, IsOptional, IsArray, IsObject, IsBoolean, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ConnectChannelDto {
  @ApiProperty({ example: 'WHATSAPP' })
  @IsString()
  @IsNotEmpty()
  channel: string;

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  config?: any;
}

export class MetaEmbeddedSignupDto {
  @ApiProperty({ description: 'OAuth Authorization code received from Meta Embedded Signup SDK callback', example: 'AQDxxxx...' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'WhatsApp Business Account ID', example: '102938475619283' })
  @IsOptional()
  @IsString()
  wabaId?: string;

  @ApiPropertyOptional({ description: 'Phone Number ID', example: '1092837465928' })
  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @ApiPropertyOptional({ description: 'Meta Business Manager ID', example: '209384756192' })
  @IsOptional()
  @IsString()
  businessId?: string;
}

export class CreateRcsTemplateDto {
  @ApiProperty({ example: 'Summer Offer RCS' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'PROMOTIONAL' })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional({ example: 'RICH_CARD' })
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  textBody?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  standaloneActions?: any[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  card?: any;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  cards?: any[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  variables?: any[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variableMappings?: any;
}

export class UpdateRcsTemplateDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageType?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  textBody?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  standaloneActions?: any[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  card?: any;

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  cards?: any[];

  @ApiPropertyOptional()
  @IsArray()
  @IsOptional()
  variables?: any[];

  @ApiPropertyOptional()
  @IsObject()
  @IsOptional()
  variableMappings?: any;
}

export class ConnectFacebookPageDto {
  @ApiProperty({ description: 'Facebook Page ID', example: '1092837465928' })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiPropertyOptional({ description: 'Facebook Page Name', example: 'Appnix Technologies' })
  @IsOptional()
  @IsString()
  pageName?: string;

  @ApiProperty({ description: 'Page Access Token from Meta Graph API' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Page category', example: 'Software Company' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Page avatar image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ description: 'Custom display name for channel' })
  @IsOptional()
  @IsString()
  channelName?: string;

  @ApiPropertyOptional({ description: 'Color swatch hex code' })
  @IsOptional()
  @IsString()
  colorCode?: string;

  @ApiPropertyOptional({ description: 'Enable automated welcome/greeting bot' })
  @IsOptional()
  @IsBoolean()
  botEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Automated greeting message text' })
  @IsOptional()
  @IsString()
  welcomeMessage?: string;
}

export class FacebookOAuthExchangeDto {
  @ApiProperty({ description: 'Authorization code received from Meta OAuth callback' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Redirect URI used in authorization request' })
  @IsOptional()
  @IsString()
  redirectUri?: string;
}

export class VerifyFacebookTokenDto {
  @ApiProperty({ description: 'Meta Facebook Page Access Token or User Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Optional Facebook Page ID to verify' })
  @IsOptional()
  @IsString()
  pageId?: string;
}
