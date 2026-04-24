import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';

export class PatchMessageDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  starred?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  unread?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  moveToMailbox?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  labels?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  delete?: boolean;

  @ApiProperty({ required: true, description: 'Mailbox HubMail id que executa a operação' })
  @IsUUID()
  mailboxId!: string;
}
