import { ApiProperty } from '@nestjs/swagger';
import { MembershipRole } from '@prisma/client';
import { IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateWorkspaceInviteDto {
  @ApiProperty({ example: 'colega@empresa.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: MembershipRole, example: MembershipRole.MEMBER })
  @IsEnum(MembershipRole)
  role!: MembershipRole;

  @ApiProperty({ required: false, maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
