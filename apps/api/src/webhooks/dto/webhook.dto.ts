import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { WebhookEventType } from '@prisma/client';

const MAX_SCOPE = 10; // segue limite do AgentMail

export class CreateWebhookDto {
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_SCOPE)
  @IsUUID('4', { each: true })
  workspaceIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_SCOPE)
  @IsUUID('4', { each: true })
  inboxIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientId?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  throttleMs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  @MinLength(16)
  @MaxLength(256)
  @Matches(/^[A-Za-z0-9_\-+/=]+$/)
  secret?: string;
}

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false, protocols: ['http', 'https'] })
  @MaxLength(2048)
  url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(WebhookEventType, { each: true })
  events?: WebhookEventType[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_SCOPE)
  @IsUUID('4', { each: true })
  workspaceIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(MAX_SCOPE)
  @IsUUID('4', { each: true })
  inboxIds?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientId?: string;

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60_000)
  throttleMs?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ListEventsQueryDto {
  @IsOptional()
  @IsEnum(WebhookEventType)
  eventType?: WebhookEventType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;
}
