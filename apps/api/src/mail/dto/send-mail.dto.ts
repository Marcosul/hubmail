import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBase64,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  ValidateNested,
} from 'class-validator';

class AttachmentDto {
  @ApiProperty()
  @IsString()
  @Length(1, 255)
  filename!: string;

  @ApiProperty()
  @IsString()
  @Length(1, 128)
  contentType!: string;

  @ApiProperty({ description: 'Conteúdo codificado em base64' })
  @IsBase64()
  base64!: string;
}

export class SendMailDto {
  @ApiProperty({ description: 'Mailbox id em HubMail (não o stalwart id)' })
  @IsUUID()
  mailboxId!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  to!: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  cc?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true })
  bcc?: string[];

  @ApiProperty()
  @IsString()
  @Length(1, 998)
  subject!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  html?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  inReplyTo?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  references?: string[];

  @ApiProperty({ type: [AttachmentDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsISO8601()
  scheduledAt?: string;
}
