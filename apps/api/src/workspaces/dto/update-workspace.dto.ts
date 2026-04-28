import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class UpdateWorkspaceDto {
  @ApiProperty({ example: 'HubMail Team', description: 'Novo nome do workspace' })
  @IsString()
  @Length(2, 64)
  name!: string;
}
