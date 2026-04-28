import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';

export class CreateMailGroupDto {
  @ApiProperty({ example: 'time@hubmail.to' })
  @IsEmail()
  address!: string;

  @ApiProperty({ example: 'Time HubMail' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 256)
  description?: string;

  @ApiProperty({ required: false, type: [String], description: 'IDs (uuid) das mailboxes membros' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  memberIds?: string[];
}

export class UpdateMailGroupDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(0, 256)
  description?: string;

  @ApiProperty({ required: false, type: [String], description: 'Substituição completa de membros (uuid de mailboxes)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('4', { each: true })
  memberIds?: string[];
}
