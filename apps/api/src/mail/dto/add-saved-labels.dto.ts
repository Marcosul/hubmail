import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class AddSavedLabelsDto {
  @ApiProperty({
    example: 'important, follow-up',
    description: 'Comma-separated label names to save for filtering',
  })
  @IsString()
  @MaxLength(2000)
  raw!: string;
}
