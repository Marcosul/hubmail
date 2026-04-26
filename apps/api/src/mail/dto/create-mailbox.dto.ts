import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateMailboxApiDto {
  @ApiProperty({ example: 'admin@hubmail.to' })
  @IsEmail()
  address!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  displayName?: string;

  @ApiProperty({ required: false, description: 'Opcional: se omitido, a API gera uma credencial interna automaticamente' })
  @IsOptional()
  @IsString()
  @Length(6, 256)
  password?: string;

  @ApiProperty({ required: false, description: 'Override se diferente do email' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  username?: string;
}

export class RotateCredentialDto {
  @ApiProperty()
  @IsString()
  @Length(6, 256)
  password!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  username?: string;
}
