import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class UpdateMailboxDto {
  @ApiProperty({ required: false, description: 'Nome de exibição (display name) — usado pelo cliente' })
  @IsOptional()
  @IsString()
  @Length(0, 128)
  displayName?: string;

  @ApiProperty({ required: false, description: 'Full Name — descrição da conta no Stalwart' })
  @IsOptional()
  @IsString()
  @Length(0, 256)
  fullName?: string;

  @ApiProperty({ required: false, type: [String], description: 'Aliases (substituição completa)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  aliases?: string[];

  @ApiProperty({ required: false, example: 'pt-BR' })
  @IsOptional()
  @IsString()
  @Length(0, 16)
  locale?: string;

  @ApiProperty({ required: false, example: 'America/Sao_Paulo' })
  @IsOptional()
  @IsString()
  @Length(0, 64)
  timeZone?: string;

  @ApiProperty({ required: false, description: 'Quota em bytes; null/0 desabilita' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quotaBytes?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  encryptionAtRest?: boolean;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  roles?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(50)
  permissions?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
