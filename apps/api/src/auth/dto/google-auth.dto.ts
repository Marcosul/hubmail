import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class GoogleAuthDto {
  @ApiProperty({
    description: 'ID token (JWT) do Google Sign-In (credential)',
    minLength: 20,
  })
  @IsString()
  @MinLength(20)
  idToken!: string;
}
