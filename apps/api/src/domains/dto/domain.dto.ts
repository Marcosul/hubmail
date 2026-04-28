import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

const DOMAIN_SEGMENT = '[a-z0-9]([a-z0-9-]*[a-z0-9])?';
const DOMAIN_RE = new RegExp(
  `^${DOMAIN_SEGMENT}(\\.${DOMAIN_SEGMENT})+$`,
);

export class CreateDomainDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(DOMAIN_RE, {
    message: 'Domínio inválido',
  })
  name!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(32)
  @IsString({ each: true })
  @Matches(DOMAIN_RE, { each: true, message: 'Alias de domínio inválido' })
  aliases?: string[];
}

export class MigrateDomainDto {
  @IsUUID()
  targetWorkspaceId!: string;
}
