import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateDomainDto {
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @Matches(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/, {
    message: 'Domínio inválido',
  })
  name!: string;
}
