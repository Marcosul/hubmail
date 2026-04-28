import { ApiProperty } from '@nestjs/swagger';
import { InviteScope, MembershipRole, ResourceRole } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateWorkspaceInviteDto {
  @ApiProperty({ example: 'colega@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: InviteScope, example: InviteScope.WORKSPACE })
  @IsEnum(InviteScope)
  scope!: InviteScope;

  @ApiProperty({
    enum: MembershipRole,
    required: false,
    description: 'Apenas quando scope=WORKSPACE',
    example: MembershipRole.MEMBER,
  })
  @IsOptional()
  @IsEnum(MembershipRole)
  role?: MembershipRole;

  @ApiProperty({
    enum: ResourceRole,
    required: false,
    description: 'Apenas quando scope ≠ WORKSPACE',
    example: ResourceRole.USER,
  })
  @IsOptional()
  @IsEnum(ResourceRole)
  resourceRole?: ResourceRole;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  domainId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  mailboxId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  mailGroupId?: string;

  @ApiProperty({ required: false, format: 'uuid' })
  @IsOptional()
  @IsUUID()
  webhookId?: string;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
