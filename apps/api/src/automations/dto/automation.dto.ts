import { IsArray, IsBoolean, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
import { AutomationTrigger } from '@prisma/client';

export class CreateAutomationDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(AutomationTrigger)
  trigger!: AutomationTrigger;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsArray()
  actions!: Array<Record<string, unknown>>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAutomationDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEnum(AutomationTrigger)
  trigger?: AutomationTrigger;

  @IsOptional()
  @IsObject()
  conditions?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  actions?: Array<Record<string, unknown>>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
