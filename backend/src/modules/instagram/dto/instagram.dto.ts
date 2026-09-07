import { IsString, IsNotEmpty, IsOptional, IsArray, IsBoolean, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ExchangeOAuthCodeDto {
  @ApiProperty({ description: 'Meta OAuth authorization code returned in callback' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'OAuth redirect URI matching the request' })
  @IsString()
  @IsNotEmpty()
  redirectUri: string;
}

export class VerifyInstagramTokenDto {
  @ApiProperty({ description: 'Meta / Facebook Page or Instagram Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Optional Instagram Business Account ID' })
  @IsString()
  @IsOptional()
  instagramBusinessId?: string;

  @ApiPropertyOptional({ description: 'Optional Facebook Page ID linked to Instagram' })
  @IsString()
  @IsOptional()
  pageId?: string;
}

export class ConnectInstagramAccountDto {
  @ApiProperty({ description: 'Instagram Business Account ID' })
  @IsString()
  @IsNotEmpty()
  instagramBusinessId: string;

  @ApiProperty({ description: 'Linked Facebook Page ID' })
  @IsString()
  @IsNotEmpty()
  pageId: string;

  @ApiProperty({ description: 'Instagram Username (@handle)' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiPropertyOptional({ description: 'Instagram Account Display Name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Profile Picture URL' })
  @IsString()
  @IsOptional()
  profilePictureUrl?: string;

  @ApiProperty({ description: 'Long-lived Page/IG Access Token' })
  @IsString()
  @IsNotEmpty()
  accessToken: string;

  @ApiPropertyOptional({ description: 'Token expiration ISO string or timestamp' })
  @IsOptional()
  tokenExpiresAt?: string;

  @ApiPropertyOptional({ description: 'Custom Channel Display Name in workspace' })
  @IsString()
  @IsOptional()
  channelName?: string;

  @ApiPropertyOptional({ description: 'Workspace Color Tag hex code' })
  @IsString()
  @IsOptional()
  colorCode?: string;

  @ApiPropertyOptional({ description: 'Enable automated Comment-to-DM bot handoff' })
  @IsBoolean()
  @IsOptional()
  autoReplyEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Automated greeting / welcome message' })
  @IsString()
  @IsOptional()
  welcomeMessage?: string;
}

export class CreateAutomationRuleDto {
  @ApiProperty({ description: 'Name of the automation rule', example: 'Lead Magnet Demo Link' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Scope of posts', enum: ['ALL_POSTS', 'SPECIFIC_POST'], default: 'ALL_POSTS' })
  @IsOptional()
  @IsIn(['ALL_POSTS', 'SPECIFIC_POST'])
  postScope?: 'ALL_POSTS' | 'SPECIFIC_POST';

  @ApiPropertyOptional({ description: 'Specific media ID if scope is SPECIFIC_POST' })
  @IsString()
  @IsOptional()
  specificMediaId?: string;

  @ApiProperty({ description: 'Keywords to trigger Comment-to-DM', example: ['demo', 'price', 'link'] })
  @IsArray()
  @IsString({ each: true })
  triggerKeywords: string[];

  @ApiPropertyOptional({ description: 'Public comment reply template', example: 'Hey @{{username}}! Check your DMs 🚀' })
  @IsString()
  @IsOptional()
  publicReplyTemplate?: string;

  @ApiProperty({ description: 'Private DM message text', example: 'Hey {{username}}! Here is your link: https://appnix.com/demo' })
  @IsString()
  @IsNotEmpty()
  privateDmTemplate: string;

  @ApiPropertyOptional({ description: 'Whether rule is enabled', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAutomationRuleDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: ['ALL_POSTS', 'SPECIFIC_POST'] })
  @IsOptional()
  @IsIn(['ALL_POSTS', 'SPECIFIC_POST'])
  postScope?: 'ALL_POSTS' | 'SPECIFIC_POST';

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  specificMediaId?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  triggerKeywords?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  publicReplyTemplate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  privateDmTemplate?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class ToggleRuleDto {
  @ApiProperty({ description: 'Active state' })
  @IsBoolean()
  isActive: boolean;
}

export class TestCommentTriggerDto {
  @ApiProperty({ description: 'Simulated comment text to test match' })
  @IsString()
  @IsNotEmpty()
  commentText: string;

  @ApiPropertyOptional({ description: 'Simulated username' })
  @IsString()
  @IsOptional()
  username?: string;
}
