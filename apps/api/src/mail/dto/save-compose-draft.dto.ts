import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID } from 'class-validator';

export class SaveComposeDraftDto {
  @ApiProperty()
  @IsUUID()
  mailboxId!: string;

  @ApiProperty({
    required: false,
    description: 'Id JMAP do rascunho anterior (substituição ao guardar de novo)',
  })
  @IsOptional()
  @IsString()
  replaceEmailId?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  to?: string[];

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cc?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiProperty({ description: 'Corpo em texto plano' })
  @IsString()
  text!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  references?: string[];
}
