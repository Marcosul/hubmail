import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length } from 'class-validator';

export class CreateMailboxApiDto {
  @ApiProperty({ example: 'admin@hubmail.to' })
  @IsEmail()
  address!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  displayName?: string;

  @ApiProperty({ description: 'App-password gerado no Stalwart Account Manager' })
  @IsString()
  @Length(6, 256)
  password!: string;

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
