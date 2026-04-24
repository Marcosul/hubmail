import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, Length, Matches } from 'class-validator';

export class CreateWorkspaceDto {
  @ApiProperty({ example: 'HubMail Team', description: 'Display name' })
  @IsString()
  @Length(2, 64)
  name!: string;

  @ApiProperty({
    example: 'hubmail-team',
    description: 'URL-friendly slug (unique inside the organization)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 48)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/i, {
    message: 'slug deve ser kebab-case alfanumérico',
  })
  slug?: string;

  @ApiProperty({
    example: 'Hubmail',
    description: 'Organization name (new org is created automatically when missing)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Length(2, 64)
  organizationName?: string;
}
