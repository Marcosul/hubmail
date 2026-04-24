import {
  IsArray,
  IsBoolean,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @MaxLength(120)
  name!: string;

  @IsString()
  @MaxLength(80)
  model!: string;

  @IsString()
  @MaxLength(4_000)
  systemPrompt!: string;

  @IsOptional()
  @IsArray()
  tools?: string[];

  @IsOptional()
  @IsObject()
  policy?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAgentDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4_000)
  systemPrompt?: string;

  @IsOptional()
  @IsArray()
  tools?: string[];

  @IsOptional()
  @IsObject()
  policy?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class SetBudgetDto {
  @IsInt()
  @Min(0)
  monthlyCents!: number;
}

export class RunAgentDto {
  @IsOptional()
  @IsString()
  triggerEventId?: string;

  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean;
}
