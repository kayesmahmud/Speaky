import { IsInt, IsString, IsOptional, MinLength } from 'class-validator';

export class CreateCorrectionDto {
  @IsInt()
  message_id: number;

  @IsString()
  @MinLength(1)
  corrected_text: string;

  @IsString()
  @IsOptional()
  explanation?: string;
}
